-- Create production status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'production_status') THEN
    CREATE TYPE production_status AS ENUM ('produzindo', 'concluido', 'perda', 'estornado');
  END IF;
END$$;

-- Add status_enum column if not exists, migrate data, then drop old status
ALTER TABLE production_batches 
ADD COLUMN IF NOT EXISTS status_new text DEFAULT 'produzindo';

-- Update existing data to new status values
UPDATE production_batches SET status_new = 
  CASE 
    WHEN status = 'completed' THEN 'concluido'
    WHEN status = 'reversed' THEN 'estornado'
    ELSE 'concluido'
  END
WHERE status_new = 'produzindo' OR status_new IS NULL;

-- Atomic function to create production batch with stock validation
CREATE OR REPLACE FUNCTION create_production_batch(
  p_recipe_id uuid,
  p_quantity integer,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_initial_status text DEFAULT 'produzindo'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe RECORD;
  v_item RECORD;
  v_batch_id uuid;
  v_total_cost numeric := 0;
  v_available numeric;
  v_required numeric;
  v_cost_per_unit numeric;
  v_item_cost numeric;
  v_product_id uuid;
BEGIN
  -- Get recipe info
  SELECT r.*, p.id as prod_id 
  INTO v_recipe
  FROM recipes r
  JOIN products p ON p.id = r.product_id
  WHERE r.id = p_recipe_id AND r.is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receita não encontrada ou inativa');
  END IF;
  
  v_product_id := v_recipe.prod_id;
  
  -- Check stock availability for all items
  FOR v_item IN 
    SELECT ri.*, rm.name, rm.current_quantity, rm.cost_per_unit, rm.unit as mat_unit
    FROM recipe_items ri
    JOIN raw_materials rm ON rm.id = ri.raw_material_id
    WHERE ri.recipe_id = p_recipe_id
  LOOP
    -- Convert quantity to base unit
    v_required := CASE v_item.unit
      WHEN 'l' THEN v_item.quantity * 1000
      WHEN 'kg' THEN v_item.quantity * 1000
      ELSE v_item.quantity
    END * p_quantity;
    
    v_available := v_item.current_quantity;
    
    IF v_available < v_required THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', format('Estoque insuficiente de %s. Necessário: %s, Disponível: %s', 
          v_item.name, v_required, v_available)
      );
    END IF;
  END LOOP;
  
  -- Create the production batch
  INSERT INTO production_batches (
    product_id, recipe_id, quantity_produced, 
    total_cost, unit_cost, notes, produced_by, status
  ) VALUES (
    v_product_id, p_recipe_id, p_quantity,
    0, 0, p_notes, p_user_id, p_initial_status
  ) RETURNING id INTO v_batch_id;
  
  -- Process each item: create batch item, deduct stock, calculate cost
  FOR v_item IN 
    SELECT ri.*, rm.name, rm.current_quantity, rm.cost_per_unit, rm.unit as mat_unit
    FROM recipe_items ri
    JOIN raw_materials rm ON rm.id = ri.raw_material_id
    WHERE ri.recipe_id = p_recipe_id
  LOOP
    -- Calculate required quantity in base unit
    v_required := CASE v_item.unit
      WHEN 'l' THEN v_item.quantity * 1000
      WHEN 'kg' THEN v_item.quantity * 1000
      ELSE v_item.quantity
    END * p_quantity;
    
    v_cost_per_unit := COALESCE(v_item.cost_per_unit, 0);
    v_item_cost := v_required * v_cost_per_unit;
    v_total_cost := v_total_cost + v_item_cost;
    
    -- Insert batch item
    INSERT INTO production_batch_items (
      batch_id, raw_material_id, quantity_consumed, unit, cost_per_unit, total_cost
    ) VALUES (
      v_batch_id, v_item.raw_material_id, v_required,
      CASE v_item.mat_unit WHEN 'l' THEN 'ml' WHEN 'kg' THEN 'g' ELSE v_item.mat_unit END,
      v_cost_per_unit, v_item_cost
    );
    
    -- Deduct from stock using existing function
    PERFORM update_raw_material_stock(
      v_item.raw_material_id,
      v_required,
      'baixa_producao'::movement_type,
      v_batch_id,
      'production_batch',
      format('Produção lote %s - %s unidades', LEFT(v_batch_id::text, 8), p_quantity),
      p_user_id
    );
  END LOOP;
  
  -- Update batch with calculated costs
  UPDATE production_batches 
  SET total_cost = v_total_cost, unit_cost = v_total_cost / p_quantity
  WHERE id = v_batch_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'batch_id', v_batch_id,
    'total_cost', v_total_cost,
    'unit_cost', v_total_cost / p_quantity
  );
END;
$$;

-- Function to change production status with proper stock handling
CREATE OR REPLACE FUNCTION change_production_status(
  p_batch_id uuid,
  p_new_status text,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_item RECORD;
BEGIN
  -- Get current batch info
  SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lote não encontrado');
  END IF;
  
  -- Validate status transitions
  IF v_batch.status = 'estornado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lote já estornado não pode ser alterado');
  END IF;
  
  IF v_batch.status = p_new_status THEN
    RETURN jsonb_build_object('success', false, 'error', 'Status já é ' || p_new_status);
  END IF;
  
  -- Handle status change logic
  CASE p_new_status
    WHEN 'concluido' THEN
      -- From produzindo to concluido: add to finished goods stock
      IF v_batch.status = 'produzindo' THEN
        INSERT INTO finished_goods_stock (product_id, current_quantity)
        VALUES (v_batch.product_id, v_batch.quantity_produced)
        ON CONFLICT (product_id) DO UPDATE 
        SET current_quantity = finished_goods_stock.current_quantity + v_batch.quantity_produced,
            updated_at = now();
      END IF;
      
    WHEN 'perda' THEN
      -- Materials already consumed, just mark as loss
      -- If was concluido, remove from finished goods
      IF v_batch.status = 'concluido' THEN
        UPDATE finished_goods_stock 
        SET current_quantity = GREATEST(0, current_quantity - v_batch.quantity_produced),
            updated_at = now()
        WHERE product_id = v_batch.product_id;
      END IF;
      
    WHEN 'estornado' THEN
      -- Return all materials to stock
      FOR v_item IN 
        SELECT * FROM production_batch_items WHERE batch_id = p_batch_id
      LOOP
        PERFORM update_raw_material_stock(
          v_item.raw_material_id,
          v_item.quantity_consumed,
          'estorno'::movement_type,
          p_batch_id,
          'production_batch_reversal',
          format('Estorno lote %s', LEFT(p_batch_id::text, 8)),
          p_user_id
        );
      END LOOP;
      
      -- If was concluido, also remove from finished goods
      IF v_batch.status = 'concluido' THEN
        UPDATE finished_goods_stock 
        SET current_quantity = GREATEST(0, current_quantity - v_batch.quantity_produced),
            updated_at = now()
        WHERE product_id = v_batch.product_id;
      END IF;
      
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Status inválido: ' || p_new_status);
  END CASE;
  
  -- Update batch status
  UPDATE production_batches 
  SET status = p_new_status,
      reversed_at = CASE WHEN p_new_status = 'estornado' THEN now() ELSE reversed_at END,
      reversed_by = CASE WHEN p_new_status = 'estornado' THEN p_user_id ELSE reversed_by END
  WHERE id = p_batch_id;
  
  RETURN jsonb_build_object('success', true, 'new_status', p_new_status);
END;
$$;

-- Function to delete production batch with proper cleanup
CREATE OR REPLACE FUNCTION delete_production_batch(
  p_batch_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_item RECORD;
BEGIN
  -- Get current batch info
  SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lote não encontrado');
  END IF;
  
  -- If status is 'produzindo', return materials to stock before deleting
  IF v_batch.status = 'produzindo' THEN
    FOR v_item IN 
      SELECT * FROM production_batch_items WHERE batch_id = p_batch_id
    LOOP
      PERFORM update_raw_material_stock(
        v_item.raw_material_id,
        v_item.quantity_consumed,
        'estorno'::movement_type,
        p_batch_id,
        'production_batch_deletion',
        format('Exclusão lote produzindo %s', LEFT(p_batch_id::text, 8)),
        p_user_id
      );
    END LOOP;
  END IF;
  
  -- If status is 'concluido', also remove from finished goods
  IF v_batch.status = 'concluido' THEN
    UPDATE finished_goods_stock 
    SET current_quantity = GREATEST(0, current_quantity - v_batch.quantity_produced),
        updated_at = now()
    WHERE product_id = v_batch.product_id;
  END IF;
  
  -- Delete batch items first
  DELETE FROM production_batch_items WHERE batch_id = p_batch_id;
  
  -- Delete the batch
  DELETE FROM production_batches WHERE id = p_batch_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;
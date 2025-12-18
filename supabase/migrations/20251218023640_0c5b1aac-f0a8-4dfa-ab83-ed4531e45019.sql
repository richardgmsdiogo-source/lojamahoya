-- Fix create_production_batch to add to finished_goods_stock when initial_status is 'concluido'
CREATE OR REPLACE FUNCTION public.create_production_batch(p_recipe_id uuid, p_quantity integer, p_notes text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_initial_status text DEFAULT 'produzindo'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- If initial status is 'concluido', add to finished goods stock
  IF p_initial_status = 'concluido' THEN
    INSERT INTO finished_goods_stock (product_id, current_quantity)
    VALUES (v_product_id, p_quantity)
    ON CONFLICT (product_id) DO UPDATE 
    SET current_quantity = finished_goods_stock.current_quantity + p_quantity,
        updated_at = now();
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'batch_id', v_batch_id,
    'total_cost', v_total_cost,
    'unit_cost', v_total_cost / p_quantity
  );
END;
$function$;
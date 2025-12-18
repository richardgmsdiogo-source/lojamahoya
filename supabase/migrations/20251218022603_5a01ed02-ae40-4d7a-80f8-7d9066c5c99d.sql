-- Update delete_production_batch to return raw materials for all statuses (except estornado)
CREATE OR REPLACE FUNCTION public.delete_production_batch(p_batch_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch RECORD;
  v_item RECORD;
BEGIN
  -- Get current batch info
  SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lote não encontrado');
  END IF;
  
  -- Return raw materials to stock for all statuses except 'estornado' (already returned)
  IF v_batch.status != 'estornado' THEN
    FOR v_item IN 
      SELECT * FROM production_batch_items WHERE batch_id = p_batch_id
    LOOP
      PERFORM update_raw_material_stock(
        v_item.raw_material_id,
        v_item.quantity_consumed,
        'estorno'::movement_type,
        p_batch_id,
        'production_batch_deletion',
        format('Exclusão lote %s (%s)', LEFT(p_batch_id::text, 8), v_batch.status),
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
$function$;
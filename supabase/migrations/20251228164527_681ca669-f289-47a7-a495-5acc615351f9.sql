-- Fix calculate_recipe_cost function to properly use cost_per_unit and convert units
CREATE OR REPLACE FUNCTION public.calculate_recipe_cost(p_recipe_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_cost NUMERIC := 0;
BEGIN
  -- Calculate cost considering unit conversions (L->ml, kg->g)
  SELECT COALESCE(SUM(
    CASE ri.unit
      WHEN 'l' THEN ri.quantity * 1000 * COALESCE(rm.cost_per_unit, 0)
      WHEN 'kg' THEN ri.quantity * 1000 * COALESCE(rm.cost_per_unit, 0)
      ELSE ri.quantity * COALESCE(rm.cost_per_unit, 0)
    END
  ), 0) INTO v_total_cost
  FROM recipe_items ri
  JOIN raw_materials rm ON rm.id = ri.raw_material_id
  WHERE ri.recipe_id = p_recipe_id;
  
  UPDATE recipes SET total_cost = v_total_cost, updated_at = now()
  WHERE id = p_recipe_id;
  
  RETURN v_total_cost;
END;
$function$;
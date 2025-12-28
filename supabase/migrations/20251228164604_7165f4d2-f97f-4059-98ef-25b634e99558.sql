-- Fix convert_to_base_unit function to include search_path
CREATE OR REPLACE FUNCTION public.convert_to_base_unit(quantity numeric, unit measurement_unit)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  CASE unit
    WHEN 'l' THEN RETURN quantity * 1000;
    WHEN 'kg' THEN RETURN quantity * 1000;
    ELSE RETURN quantity;
  END CASE;
END;
$function$;
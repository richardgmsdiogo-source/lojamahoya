-- Expose ONLY availability (in_stock) for catalog without exposing inventory quantities
-- Uses SECURITY DEFINER to avoid granting direct SELECT on finished_goods_stock

CREATE OR REPLACE FUNCTION public.get_catalog_availability(p_only_active boolean DEFAULT true)
RETURNS TABLE (
  product_id uuid,
  in_stock boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS product_id,
    (COALESCE(fgs.current_quantity, 0) > 0) AS in_stock
  FROM public.products p
  LEFT JOIN public.finished_goods_stock fgs
    ON fgs.product_id = p.id
  WHERE (NOT p_only_active) OR (p.is_active = true);
$$;

-- Allow public callers (anon) and logged-in users to call this function
GRANT EXECUTE ON FUNCTION public.get_catalog_availability(boolean) TO anon, authenticated;

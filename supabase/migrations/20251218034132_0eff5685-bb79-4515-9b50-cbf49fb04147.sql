-- Corrigir search_path nas funções IMMUTABLE
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(p_total_xp integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_level integer := 1;
  v_xp_needed integer := 0;
BEGIN
  WHILE v_xp_needed <= p_total_xp LOOP
    v_level := v_level + 1;
    v_xp_needed := v_xp_needed + (v_level * 100);
  END LOOP;
  RETURN v_level - 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.xp_for_next_level(p_current_level integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
BEGIN
  FOR i IN 2..p_current_level + 1 LOOP
    v_total := v_total + (i * 100);
  END LOOP;
  RETURN v_total;
END;
$$;
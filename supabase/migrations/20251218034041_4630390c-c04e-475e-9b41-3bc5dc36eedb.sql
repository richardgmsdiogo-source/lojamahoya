-- Tabela para armazenar XP e nível dos usuários
CREATE TABLE public.user_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_xp integer NOT NULL DEFAULT 0,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own XP"
ON public.user_xp FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all XP"
ON public.user_xp FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Função para calcular nível baseado no XP
-- Cada nível requer mais XP (progressão exponencial suave)
-- Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 4: 600 XP...
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(p_total_xp integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
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

-- Função para obter XP necessário para o próximo nível
CREATE OR REPLACE FUNCTION public.xp_for_next_level(p_current_level integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
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

-- Função para adicionar XP ao usuário
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_xp_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record record;
  v_new_total_xp integer;
  v_new_level integer;
  v_old_level integer;
BEGIN
  -- Buscar ou criar registro de XP
  SELECT * INTO v_record FROM user_xp WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_xp (user_id, current_xp, total_xp, level)
    VALUES (p_user_id, p_xp_amount, p_xp_amount, calculate_level_from_xp(p_xp_amount))
    RETURNING * INTO v_record;
    
    RETURN jsonb_build_object(
      'success', true,
      'xp_added', p_xp_amount,
      'new_total_xp', v_record.total_xp,
      'new_level', v_record.level,
      'leveled_up', v_record.level > 1
    );
  END IF;
  
  v_old_level := v_record.level;
  v_new_total_xp := v_record.total_xp + p_xp_amount;
  v_new_level := calculate_level_from_xp(v_new_total_xp);
  
  UPDATE user_xp
  SET 
    current_xp = current_xp + p_xp_amount,
    total_xp = v_new_total_xp,
    level = v_new_level,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_added', p_xp_amount,
    'new_total_xp', v_new_total_xp,
    'new_level', v_new_level,
    'leveled_up', v_new_level > v_old_level
  );
END;
$$;

-- Trigger para criar registro de XP quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_xp (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_xp
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_xp();
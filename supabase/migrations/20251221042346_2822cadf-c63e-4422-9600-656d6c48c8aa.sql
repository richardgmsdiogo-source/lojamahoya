-- Tabela de definições de títulos por nível
CREATE TABLE public.player_titles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level integer NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Inserir títulos padrão
INSERT INTO public.player_titles (level, title, description) VALUES
  (1, 'Iniciante', 'Começou a jornada alquímica'),
  (2, 'Aprendiz', 'Primeiros passos no caminho'),
  (3, 'Aventureiro', 'Explorando o mundo das essências'),
  (5, 'Explorador', 'Descobrindo novos aromas'),
  (7, 'Artesão', 'Mestre das combinações'),
  (10, 'Mago', 'Domina a arte olfativa'),
  (15, 'Arquimago', 'Sabedoria olfativa elevada'),
  (20, 'Lenda', 'Referência na comunidade'),
  (25, 'Mestre Supremo', 'O mais alto nível de excelência');

-- Tabela de conquistas (achievements)
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text DEFAULT '🏆',
  xp_reward integer DEFAULT 0,
  requirement_type text NOT NULL DEFAULT 'manual', -- manual, orders_count, total_spent, level
  requirement_value numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de conquistas dos usuários
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Tabela de benefícios ativos
CREATE TABLE public.user_benefits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  discount_percent numeric DEFAULT 0,
  discount_fixed numeric DEFAULT 0,
  valid_until date,
  is_used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_benefits ENABLE ROW LEVEL SECURITY;

-- Políticas para player_titles (apenas leitura pública, admins gerenciam)
CREATE POLICY "Anyone can view player_titles" ON public.player_titles FOR SELECT USING (true);
CREATE POLICY "Admins can manage player_titles" ON public.player_titles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para achievements
CREATE POLICY "Anyone can view active achievements" ON public.achievements FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para user_achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user_achievements" ON public.user_achievements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para user_benefits
CREATE POLICY "Users can view own benefits" ON public.user_benefits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user_benefits" ON public.user_benefits FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserir algumas conquistas padrão
INSERT INTO public.achievements (name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
  ('Primeira Compra', 'Realizou sua primeira compra', '🛒', 100, 'orders_count', 1),
  ('Cliente Fiel', 'Realizou 5 compras', '⭐', 250, 'orders_count', 5),
  ('Colecionador', 'Realizou 10 compras', '🎖️', 500, 'orders_count', 10),
  ('Entusiasta', 'Atingiu o nível 5', '🌟', 200, 'level', 5),
  ('Mestre Alquimista', 'Atingiu o nível 10', '🧙', 500, 'level', 10);
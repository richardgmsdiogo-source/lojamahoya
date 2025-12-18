-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enum for raw material categories
CREATE TYPE public.raw_material_category AS ENUM (
  'base', 'essencia', 'fixador', 'corante', 'frasco', 'rotulo', 'caixa', 'embalagem', 'outro'
);

-- Enum for measurement units
CREATE TYPE public.measurement_unit AS ENUM (
  'ml', 'l', 'g', 'kg', 'unidade'
);

-- Enum for movement types
CREATE TYPE public.movement_type AS ENUM (
  'entrada', 'ajuste', 'baixa_producao', 'estorno', 'perda'
);

-- Raw materials table (Matéria-prima)
CREATE TABLE public.raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category raw_material_category NOT NULL DEFAULT 'outro',
  unit measurement_unit NOT NULL DEFAULT 'ml',
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  purchase_cost NUMERIC NOT NULL DEFAULT 0,
  purchase_quantity NUMERIC NOT NULL DEFAULT 1,
  cost_per_unit NUMERIC GENERATED ALWAYS AS (
    CASE WHEN purchase_quantity > 0 THEN purchase_cost / purchase_quantity ELSE 0 END
  ) STORED,
  minimum_stock NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Raw material movements (Movimentações)
CREATE TABLE public.raw_material_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  movement_type movement_type NOT NULL,
  quantity NUMERIC NOT NULL,
  cost_per_unit_at_time NUMERIC NOT NULL DEFAULT 0,
  balance_before NUMERIC NOT NULL DEFAULT 0,
  balance_after NUMERIC NOT NULL DEFAULT 0,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Recipes table (Receitas/Fichas Técnicas)
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, version)
);

-- Recipe items (Itens da receita)
CREATE TABLE public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit measurement_unit NOT NULL DEFAULT 'ml',
  cost_at_creation NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Production batches (Lotes de produção)
CREATE TABLE public.production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id),
  quantity_produced INTEGER NOT NULL,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  produced_by UUID REFERENCES auth.users(id),
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Production batch items (Consumo por insumo no lote)
CREATE TABLE public.production_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id),
  quantity_consumed NUMERIC NOT NULL,
  unit measurement_unit NOT NULL,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Finished goods stock (Estoque produto acabado)
CREATE TABLE public.finished_goods_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE UNIQUE,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finished_goods_stock ENABLE ROW LEVEL SECURITY;

-- RLS Policies for raw_materials
CREATE POLICY "Admins can manage raw_materials" ON public.raw_materials
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active raw_materials" ON public.raw_materials
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- RLS Policies for raw_material_movements
CREATE POLICY "Admins can manage movements" ON public.raw_material_movements
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all movements" ON public.raw_material_movements
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for recipes
CREATE POLICY "Admins can manage recipes" ON public.recipes
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all recipes" ON public.recipes
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for recipe_items
CREATE POLICY "Admins can manage recipe_items" ON public.recipe_items
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all recipe_items" ON public.recipe_items
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for production_batches
CREATE POLICY "Admins can manage production_batches" ON public.production_batches
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all production_batches" ON public.production_batches
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for production_batch_items
CREATE POLICY "Admins can manage production_batch_items" ON public.production_batch_items
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all production_batch_items" ON public.production_batch_items
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for finished_goods_stock
CREATE POLICY "Admins can manage finished_goods_stock" ON public.finished_goods_stock
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view finished_goods_stock" ON public.finished_goods_stock
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Function to convert units to base unit (ml or g or unidade)
CREATE OR REPLACE FUNCTION public.convert_to_base_unit(quantity NUMERIC, unit measurement_unit)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE unit
    WHEN 'l' THEN RETURN quantity * 1000;
    WHEN 'kg' THEN RETURN quantity * 1000;
    ELSE RETURN quantity;
  END CASE;
END;
$$;

-- Function to update raw material stock
CREATE OR REPLACE FUNCTION public.update_raw_material_stock(
  p_raw_material_id UUID,
  p_quantity NUMERIC,
  p_movement_type movement_type,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_cost_per_unit NUMERIC;
  v_movement_id UUID;
BEGIN
  SELECT current_quantity, cost_per_unit INTO v_balance_before, v_cost_per_unit
  FROM raw_materials WHERE id = p_raw_material_id;
  
  IF p_movement_type IN ('entrada', 'estorno') THEN
    v_balance_after := v_balance_before + p_quantity;
  ELSE
    v_balance_after := v_balance_before - p_quantity;
  END IF;
  
  UPDATE raw_materials 
  SET current_quantity = v_balance_after, updated_at = now()
  WHERE id = p_raw_material_id;
  
  INSERT INTO raw_material_movements (
    raw_material_id, movement_type, quantity, cost_per_unit_at_time,
    balance_before, balance_after, reference_id, reference_type, notes, user_id
  ) VALUES (
    p_raw_material_id, p_movement_type, p_quantity, v_cost_per_unit,
    v_balance_before, v_balance_after, p_reference_id, p_reference_type, p_notes, p_user_id
  ) RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$;

-- Function to calculate recipe cost
CREATE OR REPLACE FUNCTION public.calculate_recipe_cost(p_recipe_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_cost NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(ri.quantity * rm.cost_per_unit), 0) INTO v_total_cost
  FROM recipe_items ri
  JOIN raw_materials rm ON rm.id = ri.raw_material_id
  WHERE ri.recipe_id = p_recipe_id;
  
  UPDATE recipes SET total_cost = v_total_cost, updated_at = now()
  WHERE id = p_recipe_id;
  
  RETURN v_total_cost;
END;
$$;

-- Trigger to update recipe cost when items change
CREATE OR REPLACE FUNCTION public.trigger_update_recipe_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_recipe_cost(OLD.recipe_id);
    RETURN OLD;
  ELSE
    PERFORM calculate_recipe_cost(NEW.recipe_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER recipe_items_cost_update
  AFTER INSERT OR UPDATE OR DELETE ON public.recipe_items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_recipe_cost();

-- Updated at trigger for raw_materials
CREATE TRIGGER raw_materials_updated_at
  BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
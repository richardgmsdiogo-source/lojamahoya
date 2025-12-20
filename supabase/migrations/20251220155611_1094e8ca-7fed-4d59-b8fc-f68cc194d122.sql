-- Tabela para encomendas internas (produção sob demanda)
CREATE TABLE public.internal_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  due_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'produzindo', 'concluido', 'entregue', 'cancelado')),
  production_batch_id UUID REFERENCES public.production_batches(id),
  total_cost NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage internal_orders"
  ON public.internal_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view internal_orders"
  ON public.internal_orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_internal_orders_updated_at
  BEFORE UPDATE ON public.internal_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
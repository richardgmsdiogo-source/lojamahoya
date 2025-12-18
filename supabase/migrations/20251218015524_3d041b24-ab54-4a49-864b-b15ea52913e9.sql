-- Create fixed_assets table for company assets
CREATE TABLE public.fixed_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'outros',
  purchase_date DATE,
  purchase_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  useful_life_months INTEGER DEFAULT 60,
  depreciation_rate NUMERIC DEFAULT 0,
  location TEXT,
  serial_number TEXT,
  supplier TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

-- Policies for admin access
CREATE POLICY "Admins can manage fixed_assets"
ON public.fixed_assets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view fixed_assets"
ON public.fixed_assets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_fixed_assets_updated_at
BEFORE UPDATE ON public.fixed_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
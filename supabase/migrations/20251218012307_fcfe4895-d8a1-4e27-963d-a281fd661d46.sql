-- Create scent_families table
CREATE TABLE public.scent_families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scent_families ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view scent families" 
ON public.scent_families 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage scent families" 
ON public.scent_families 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add scent_family_id to products
ALTER TABLE public.products 
ADD COLUMN scent_family_id UUID REFERENCES public.scent_families(id);

-- Create trigger for updated_at
CREATE TRIGGER update_scent_families_updated_at
BEFORE UPDATE ON public.scent_families
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create table to store D20 roll results
CREATE TABLE public.d20_rolls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  roll_result INTEGER NOT NULL CHECK (roll_result >= 1 AND roll_result <= 20),
  prize_code TEXT NOT NULL,
  prize_title TEXT NOT NULL,
  prize_description TEXT NOT NULL,
  rolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  used_in_order_id UUID REFERENCES public.orders(id)
);

-- Enable RLS
ALTER TABLE public.d20_rolls ENABLE ROW LEVEL SECURITY;

-- Users can view their own roll
CREATE POLICY "Users can view own d20 roll"
ON public.d20_rolls
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own roll (only once due to unique constraint)
CREATE POLICY "Users can insert own d20 roll"
ON public.d20_rolls
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own roll (for marking as used)
CREATE POLICY "Users can update own d20 roll"
ON public.d20_rolls
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all rolls
CREATE POLICY "Admins can manage d20 rolls"
ON public.d20_rolls
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
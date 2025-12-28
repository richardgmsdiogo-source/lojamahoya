-- Add is_active column to categories table for soft delete functionality
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
-- Ejecuta esto en el SQL Editor de Supabase para arreglar el error de "banner_image"
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS banner_image text;

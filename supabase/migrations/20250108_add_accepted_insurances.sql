ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS accepted_insurances text[];
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS accepted_insurances text[];

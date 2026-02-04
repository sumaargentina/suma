-- Migration: Add birth_date column to patients table
-- Description: Adds birth_date to allow age calculation and replaces the manual age input requirement
-- Date: 2026-02-03

ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN public.patients.birth_date IS 'Fecha de nacimiento del paciente';

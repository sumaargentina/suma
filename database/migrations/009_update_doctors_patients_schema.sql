-- Migration: Add missing columns to doctors and patients tables
-- Description: Adds document_type and sector columns which are required by the registration forms
-- Date: 2026-02-03

-- Update DOCTORS table
ALTER TABLE public.doctors 
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS sector TEXT;

-- Update PATIENTS table (just in case they are missing too based on profile page usage)
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.doctors.document_type IS 'Tipo de documento (DNI, Pasaporte, Otro)';
COMMENT ON COLUMN public.doctors.sector IS 'Sector o barrio del consultorio';
COMMENT ON COLUMN public.patients.document_type IS 'Tipo de documento del paciente';

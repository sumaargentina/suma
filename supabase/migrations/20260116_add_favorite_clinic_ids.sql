-- Migration: Add favorite_clinic_ids column to patients table
-- Date: 2026-01-16

-- Add column for favorite clinic IDs
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS favorite_clinic_ids TEXT[] DEFAULT '{}';

-- Ensure proper default value
UPDATE public.patients 
SET favorite_clinic_ids = '{}' 
WHERE favorite_clinic_ids IS NULL;

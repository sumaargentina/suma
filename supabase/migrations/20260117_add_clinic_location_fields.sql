-- Add location fields to clinics table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS sector text;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS address text;

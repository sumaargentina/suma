-- Add additional profile fields to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS religion text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS education text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation text;

-- Add same fields to family_members table
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS blood_type text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS religion text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS education text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS city text;

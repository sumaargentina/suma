-- Add new medical record fields
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS evaluation text;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS requested_studies text;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS evolution text;

-- Rename notes to evolution if migration from old schema (optional comment)
-- UPDATE medical_records SET evolution = notes WHERE evolution IS NULL AND notes IS NOT NULL;

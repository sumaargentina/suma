-- Migration: Add prescription to medical_records and signature_url, stamp_url to doctors
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medical_records' AND column_name = 'prescription'
    ) THEN
        ALTER TABLE medical_records ADD COLUMN prescription TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'doctors' AND column_name = 'signature_url'
    ) THEN
        ALTER TABLE doctors ADD COLUMN signature_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'doctors' AND column_name = 'stamp_url'
    ) THEN
        ALTER TABLE doctors ADD COLUMN stamp_url TEXT;
    END IF;
END $$;

-- Add read_by_clinic column to support_tickets table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'read_by_clinic') THEN
        ALTER TABLE support_tickets ADD COLUMN read_by_clinic BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =====================================================
-- MIGRATION: Doctor-Patient Chat System
-- =====================================================
-- Creates a continuous chat system between doctors and patients
-- Independent of appointments - one conversation per doctor-patient pair
-- Only the account holder (main patient) can chat, not family members
-- =====================================================

-- Create doctor_patient_messages table
CREATE TABLE IF NOT EXISTS doctor_patient_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('doctor', 'patient')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_doctor_patient_messages_doctor ON doctor_patient_messages(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_messages_patient ON doctor_patient_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_messages_created ON doctor_patient_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_messages_conversation ON doctor_patient_messages(doctor_id, patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_messages_unread ON doctor_patient_messages(doctor_id, patient_id, is_read) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE doctor_patient_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role (used by API)
CREATE POLICY "Service role full access on doctor_patient_messages"
    ON doctor_patient_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Doctors can see their conversations
CREATE POLICY "Doctors can view their chat messages"
    ON doctor_patient_messages
    FOR SELECT
    USING (doctor_id::text = auth.uid()::text);

-- Policy: Patients can see their conversations  
CREATE POLICY "Patients can view their chat messages"
    ON doctor_patient_messages
    FOR SELECT
    USING (patient_id::text = auth.uid()::text);

-- Create a view for conversation summaries (optional, for efficiency)
CREATE OR REPLACE VIEW doctor_patient_conversations AS
SELECT 
    doctor_id,
    patient_id,
    COUNT(*) as message_count,
    MAX(created_at) as last_message_at,
    COUNT(*) FILTER (WHERE is_read = FALSE AND sender_type = 'patient') as unread_by_doctor,
    COUNT(*) FILTER (WHERE is_read = FALSE AND sender_type = 'doctor') as unread_by_patient
FROM doctor_patient_messages
GROUP BY doctor_id, patient_id;

-- Comments
COMMENT ON TABLE doctor_patient_messages IS 'Continuous chat between doctors and patients, independent of appointments';
COMMENT ON COLUMN doctor_patient_messages.patient_id IS 'Always the account holder (main patient), never family members';

-- =====================================================
-- REALTIME CONFIGURATION
-- =====================================================
-- Enable Realtime for instant message updates

-- First, drop the table from publication if it exists (to avoid errors)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'doctor_patient_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE doctor_patient_messages;
    END IF;
END $$;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE doctor_patient_messages;

-- Grant necessary permissions for realtime to work
GRANT SELECT ON doctor_patient_messages TO anon, authenticated;

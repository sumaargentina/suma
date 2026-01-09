-- Clinic Patient Chat Messages Table
-- Direct messaging between clinics and patients

CREATE TABLE IF NOT EXISTS clinic_patient_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('clinic', 'patient')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_clinic_patient_messages_clinic ON clinic_patient_messages(clinic_id);
CREATE INDEX idx_clinic_patient_messages_patient ON clinic_patient_messages(patient_id);
CREATE INDEX idx_clinic_patient_messages_created ON clinic_patient_messages(created_at DESC);
CREATE INDEX idx_clinic_patient_messages_conversation ON clinic_patient_messages(clinic_id, patient_id, created_at DESC);

-- Enable RLS
ALTER TABLE clinic_patient_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Clinics can see/send messages for their conversations
CREATE POLICY "Clinics can manage their chat messages"
    ON clinic_patient_messages
    FOR ALL
    USING (clinic_id = auth.uid());

-- Policy: Patients can see/send messages for their conversations
CREATE POLICY "Patients can manage their chat messages"
    ON clinic_patient_messages
    FOR ALL
    USING (patient_id = auth.uid());

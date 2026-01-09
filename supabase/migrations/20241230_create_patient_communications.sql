-- Patient Communications Table
-- Stores the history of messages sent from clinics to patients

CREATE TABLE IF NOT EXISTS patient_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('whatsapp', 'email', 'phone_call', 'sms')),
    template VARCHAR(50), -- e.g., 'appointment_reminder', 'follow_up', 'custom'
    message TEXT NOT NULL,
    sent_by UUID NOT NULL, -- User who sent the message
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_patient_communications_clinic ON patient_communications(clinic_id);
CREATE INDEX idx_patient_communications_patient ON patient_communications(patient_id);
CREATE INDEX idx_patient_communications_sent_at ON patient_communications(sent_at DESC);

-- Enable RLS
ALTER TABLE patient_communications ENABLE ROW LEVEL SECURITY;

-- Policy: Clinic can manage their own patient communications
CREATE POLICY "Clinic can manage their patient communications"
    ON patient_communications
    FOR ALL
    USING (clinic_id = auth.uid());

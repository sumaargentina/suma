-- Add service_name and clinic_service_id columns to appointments table
-- These are needed for clinic service bookings without a doctor

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinic_service_id UUID REFERENCES clinic_services(id) ON DELETE SET NULL;

-- Create index for clinic service appointments
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_service ON appointments(clinic_service_id);

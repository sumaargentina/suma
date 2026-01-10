-- Add status and verification_status columns to clinics table
-- This enables admin to activate/deactivate clinics

ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive'));

ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clinics_status ON clinics(status);
CREATE INDEX IF NOT EXISTS idx_clinics_verification_status ON clinics(verification_status);

-- Comment for documentation
COMMENT ON COLUMN clinics.status IS 'Whether the clinic is active and visible to patients';
COMMENT ON COLUMN clinics.verification_status IS 'Admin verification status: pending, verified, or rejected';

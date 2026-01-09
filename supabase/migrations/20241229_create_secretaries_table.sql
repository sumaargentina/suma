CREATE TABLE IF NOT EXISTS secretaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'secretary',
  permissions TEXT[] DEFAULT ARRAY['agenda'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE secretaries ENABLE ROW LEVEL SECURITY;

-- Clinic Admin can view their secretaries
CREATE POLICY "Clinic admins can view their secretaries" ON secretaries
  FOR SELECT
  USING (clinic_id IN (
    SELECT id FROM clinics WHERE admin_email = auth.email() -- This might tricky if auth.email is not consistent with clinic admin logic
    -- Better to rely on server-side logic for now as secretaries are managed by logic
  ));
  
-- Allow public insert via API (since we use service role in API)

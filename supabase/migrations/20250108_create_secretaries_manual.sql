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

ALTER TABLE secretaries ENABLE ROW LEVEL SECURITY;

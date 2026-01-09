-- 1. Create clinics table
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_email TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    description TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    password TEXT, -- Hashed password
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create clinic_branches table
CREATE TABLE IF NOT EXISTS public.clinic_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT,
    location JSONB, -- { lat: number, lng: number } or "link"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create clinic_services table
CREATE TABLE IF NOT EXISTS public.clinic_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.clinic_branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service_category TEXT, -- "Laboratorio", "Rayos X", "Vacunación", etc. (Flexible)
    price NUMERIC NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    daily_capacity INTEGER, -- Optional max validation
    operating_hours JSONB, -- { "monday": ["08:00-12:00"], ... }
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update doctors table
ALTER TABLE public.doctors 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id),
ADD COLUMN IF NOT EXISTS is_clinic_employee BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS branch_ids UUID[]; -- Simple array for now

-- 5. Update appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS clinic_service_id UUID REFERENCES public.clinic_services(id),
ALTER COLUMN doctor_id DROP NOT NULL;

-- 6. Enable Realtime for new tables (Commented out to prevent errors on re-run)
-- Run these manually if they are not enabled yet
-- ALTER PUBLICATION supabase_realtime ADD TABLE clinics;
-- ALTER PUBLICATION supabase_realtime ADD TABLE clinic_branches;
-- ALTER PUBLICATION supabase_realtime ADD TABLE clinic_services;

-- 7. RLS Policies (Draft - will refine later)
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_services ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for booking)
CREATE POLICY "Public clinics are viewable by everyone" ON public.clinics FOR SELECT USING (true);
CREATE POLICY "Public branches are viewable by everyone" ON public.clinic_branches FOR SELECT USING (true);
CREATE POLICY "Public services are viewable by everyone" ON public.clinic_services FOR SELECT USING (true);

-- Allow clinic admins to manage their own data
-- (Note: admin_email check is a simple auth implementation, can be improved with auth.uid())

-- CRITICAL FIX: Ensure password column exists even if table was already created
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS password TEXT;

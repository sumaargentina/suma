-- Create clinic_specialties table
CREATE TABLE IF NOT EXISTS public.clinic_specialties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clinic_specialties ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public clinic specialties are viewable by everyone" 
ON public.clinic_specialties FOR SELECT USING (true);

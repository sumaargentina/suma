-- ==============================================================================
-- MIGRATION 005: DOCTOR INTEGRATIONS (MERCADOPAGO)
-- ==============================================================================
-- Purpose: Store OAuth tokens for doctor's MercadoPago integrations.
-- Security: RLS enabled to ensure only the doctor can manage their integration.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.doctor_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('mercadopago')),
    
    -- MercadoPago specific fields
    mp_access_token TEXT,
    mp_refresh_token TEXT,
    mp_public_key TEXT,
    mp_user_id TEXT, -- The doctor's MercadoPago user ID
    mp_expires_in INTEGER,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one integration per provider per doctor
    UNIQUE(doctor_id, provider)
);

-- Enable RLS
ALTER TABLE public.doctor_integrations ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Doctor can view their own integrations
CREATE POLICY "Doctors can view own integrations" 
ON public.doctor_integrations 
FOR SELECT 
USING (doctor_id = auth.uid());

-- Doctor can update their own integrations (usually via API, but good to have)
CREATE POLICY "Doctors can update own integrations" 
ON public.doctor_integrations 
FOR UPDATE 
USING (doctor_id = auth.uid());

-- Service Role (backend) implies full access (bypass RLS), but for direct inserts:
CREATE POLICY "System can insert integrations" 
ON public.doctor_integrations 
FOR INSERT 
WITH CHECK (auth.uid() = doctor_id); -- Or service role

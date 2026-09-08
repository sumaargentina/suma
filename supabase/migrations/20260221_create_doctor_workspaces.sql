-- 1. Crear la tabla de espacios de trabajo / perfiles de atención
CREATE TABLE IF NOT EXISTS public.doctor_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    workspace_type TEXT NOT NULL CHECK (workspace_type IN ('private', 'clinic', 'public_hospital')),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    custom_name TEXT,
    role_in_workplace TEXT DEFAULT 'staff_doctor',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending_invitation', 'inactive')),
    
    -- Permisos específicos por espacio
    can_manage_finances BOOLEAN DEFAULT FALSE,
    can_manage_schedule BOOLEAN DEFAULT TRUE,
    
    -- Configuración específica de la sede
    consultation_fee NUMERIC DEFAULT 0,
    slot_duration INTEGER DEFAULT 30,
    schedule JSONB,
    
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_doctor_workspaces_doctor_id ON public.doctor_workspaces(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_workspaces_clinic_id ON public.doctor_workspaces(clinic_id);

-- 3. Habilitar RLS
ALTER TABLE public.doctor_workspaces ENABLE ROW LEVEL SECURITY;

-- 4. Política pública de lectura y gestión
DROP POLICY IF EXISTS "Workspaces viewable by all" ON public.doctor_workspaces;
CREATE POLICY "Workspaces viewable by all" ON public.doctor_workspaces FOR SELECT USING (true);

DROP POLICY IF EXISTS "Workspaces manageable by service role and admin" ON public.doctor_workspaces;
CREATE POLICY "Workspaces manageable by service role and admin" ON public.doctor_workspaces FOR ALL USING (true);

-- 5. MIGRACIÓN AUTOMÁTICA: Crear espacio "Consultorio Privado" para todos los médicos actuales
INSERT INTO public.doctor_workspaces (doctor_id, workspace_type, custom_name, role_in_workplace, can_manage_finances, is_default)
SELECT 
    d.id, 
    'private', 
    'Mi Consultorio Privado', 
    'owner', 
    TRUE, 
    TRUE
FROM public.doctors d
WHERE NOT EXISTS (
    SELECT 1 FROM public.doctor_workspaces w 
    WHERE w.doctor_id = d.id AND w.workspace_type = 'private'
);

-- 6. MIGRACIÓN AUTOMÁTICA: Si algún médico ya tenía una clínica asociada, crearle su segundo espacio institucional
INSERT INTO public.doctor_workspaces (doctor_id, workspace_type, clinic_id, custom_name, role_in_workplace, can_manage_finances, is_default)
SELECT 
    d.id, 
    'clinic', 
    d.clinic_id, 
    COALESCE(c.name, 'Clínica Institucional'), 
    'staff_doctor', 
    FALSE, 
    FALSE
FROM public.doctors d
JOIN public.clinics c ON d.clinic_id = c.id
WHERE d.clinic_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.doctor_workspaces w 
    WHERE w.doctor_id = d.id AND w.clinic_id = d.clinic_id
);

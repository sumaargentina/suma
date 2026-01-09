-- =====================================================
-- MIGRACIÓN 006: HISTORIA DE SALUD Y BIENESTAR (HCE)
-- Descripción: Tablas para gestionar el historial de pacientes/clientes
-- Adaptado para: Médicos, Especialistas, Spas y Centros de Bienestar
-- Fecha: 2025-12-14
-- =====================================================

-- 1. TABLA DE ANTECEDENTES Y PREFERENCIAS
-- Sirve para: Enfermedades (Médico) o Condiciones/Preferencias (Spa)
-- Ej: "Diabetes" (Médico) o "Piel Sensible" (Spa)
CREATE TABLE IF NOT EXISTS public.patient_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    condition_name TEXT NOT NULL, 
    diagnosed_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'controlled')),
    type TEXT DEFAULT 'medical' CHECK (type IN ('medical', 'wellness', 'aesthetic', 'preference')), -- Nuevo campo para diferenciar
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- Profesional que lo registró
);

-- 2. TABLA DE ALERGIAS Y CONTRAINDICACIONES
-- Ej: "Penicilina" (Médico) o "Alergia a Lavanda" (Spa)
CREATE TABLE IF NOT EXISTS public.patient_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    allergen TEXT NOT NULL, 
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
    reaction TEXT, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- 3. TABLA DE ANTECEDENTES FAMILIARES (Opcional para Spa, vital para médicos)
CREATE TABLE IF NOT EXISTS public.family_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    condition_name TEXT NOT NULL,
    relationship TEXT NOT NULL, 
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- 4. TABLA PRINCIPAL DE REGISTROS (NOTAS DE EVOLUCIÓN / SESIONES)
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT, -- "Doctor" aquí es el "Profesional" (Médico o Especialista)
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    
    visit_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Tipo de registro para adaptar la UI
    record_type TEXT DEFAULT 'consultation' CHECK (record_type IN ('consultation', 'wellness_session', 'aesthetic_procedure', 'checkup', 'emergency')),
    
    -- Campos flexibles
    reason_for_visit TEXT,   -- Motivo de consulta / Servicio solicitado
    symptoms TEXT,           -- Síntomas / Molestias / Necesidades del cliente
    
    diagnosis TEXT,          -- Diagnóstico Médico / Evaluación Estética (Ej: "Contractura muscular leve")
    treatment_plan TEXT,     -- Tratamiento Recetado / Procedimiento Realizado (Ej: "Masaje descontracturante 60min")
    
    notes TEXT,              -- Notas internas del profesional
    
    -- Datos estructurados (Signos vitales O Medidas corporales para estética)
    -- Ej Médico: { "pressure": "120/80", "weight": 70 }
    -- Ej Spa: { "skin_type": "dry", "tension_areas": ["neck", "shoulders"] }
    vital_signs JSONB, 
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE ARCHIVOS ADJUNTOS (ESTUDIOS, FOTOS ANTES/DESPUÉS)
CREATE TABLE IF NOT EXISTS public.medical_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL, 
    
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT, 
    file_size INTEGER,
    
    category TEXT DEFAULT 'general' CHECK (category IN ('lab_result', 'imaging', 'prescription', 'before_after_photo', 'general')),
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_patient_conditions_patient ON patient_conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient ON patient_allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON medical_records(record_type);

-- RLS (ROW LEVEL SECURITY)
ALTER TABLE public.patient_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_attachments ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS SIMPLIFICADAS PARA DESARROLLO (Luego ajustar a roles específicos)

-- Lectura: Autenticados (Profesionales y el propio Paciente)
CREATE POLICY "Authenticated users can view records" ON public.medical_records
    FOR SELECT USING (auth.role() = 'authenticated'); -- TODO: Restringir a dueño y profesional

-- Escritura: Solo Profesionales (Doctors)
CREATE POLICY "Professionals can insert records" ON public.medical_records
    FOR INSERT WITH CHECK (auth.role() = 'authenticated'); -- Asumimos que la app valida el rol de 'doctor'

CREATE POLICY "Professionals can view conditions" ON public.patient_conditions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Professionals can insert conditions" ON public.patient_conditions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Professionals can view allergies" ON public.patient_allergies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Professionals can insert allergies" ON public.patient_allergies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view attachments" ON public.medical_attachments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert attachments" ON public.medical_attachments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

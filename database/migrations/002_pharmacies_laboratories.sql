-- =====================================================
-- MIGRACIÓN: FARMACIAS Y LABORATORIOS
-- Descripción: Nuevos tipos de usuarios para recetas digitales
-- Fecha: 2025-12-14
-- Versión: 1.0.0
-- =====================================================

-- =====================================================
-- 1. TABLA DE FARMACIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pharmacies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    
    -- Business Info
    license_number TEXT UNIQUE NOT NULL, -- Matrícula de farmacia
    chain_name TEXT, -- Si pertenece a una cadena
    
    -- Location
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Argentina',
    
    -- Geolocation
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    -- Hours
    opening_hours JSONB, -- {monday: {open: "09:00", close: "18:00"}, ...}
    is_24_hours BOOLEAN DEFAULT FALSE,
    
    -- Images
    logo_url TEXT,
    photos JSONB, -- Array de URLs
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    verified BOOLEAN DEFAULT FALSE,
    
    -- Banking (para pagos)
    bank_details JSONB,
    
    -- Stats
    total_prescriptions_filled INTEGER DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pharmacies_email ON pharmacies(email);
CREATE INDEX IF NOT EXISTS idx_pharmacies_license ON pharmacies(license_number);
CREATE INDEX IF NOT EXISTS idx_pharmacies_city ON pharmacies(city);
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON pharmacies(status);
-- Geospatial index (simple version - can upgrade later)
CREATE INDEX IF NOT EXISTS idx_pharmacies_lat ON pharmacies(latitude);
CREATE INDEX IF NOT EXISTS idx_pharmacies_lng ON pharmacies(longitude);

-- =====================================================
-- 2. TABLA DE LABORATORIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.laboratories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    
    -- Business Info
    license_number TEXT UNIQUE NOT NULL, -- Habilitación de laboratorio
    accreditations JSONB, -- Acreditaciones y certificaciones
    
    -- Location
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Argentina',
    
    -- Geolocation
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    -- Hours
    opening_hours JSONB,
    appointment_required BOOLEAN DEFAULT FALSE,
    
    -- Services
    services JSONB, -- Array de estudios que realizan
    home_service BOOLEAN DEFAULT FALSE, -- Servicio a domicilio
    
    -- Images
    logo_url TEXT,
    photos JSONB,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    verified BOOLEAN DEFAULT FALSE,
    
    -- Banking
    bank_details JSONB,
    
    -- Stats
    total_studies_performed INTEGER DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_laboratories_email ON laboratories(email);
CREATE INDEX IF NOT EXISTS idx_laboratories_license ON laboratories(license_number);
CREATE INDEX IF NOT EXISTS idx_laboratories_city ON laboratories(city);
CREATE INDEX IF NOT EXISTS idx_laboratories_status ON laboratories(status);
-- Geospatial index (simple version - can upgrade later)
CREATE INDEX IF NOT EXISTS idx_laboratories_lat ON laboratories(latitude);
CREATE INDEX IF NOT EXISTS idx_laboratories_lng ON laboratories(longitude);

-- =====================================================
-- 3. TABLA DE PRESCRIPCIONES (RECETAS)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    
    -- Prescription Details
    prescription_number TEXT UNIQUE NOT NULL, -- Número único de receta
    diagnosis TEXT NOT NULL,
    
    -- Medications (array de medicamentos)
    medications JSONB NOT NULL, 
    /*
    [
        {
            name: "Ibuprofeno 600mg",
            dosage: "600mg",
            frequency: "Cada 8 horas",
            duration: "7 días",
            instructions: "Tomar con alimentos",
            quantity: 21
        }
    ]
    */
    
    -- Digital Signature
    digital_signature TEXT, -- Firma digital del médico
    qr_code TEXT, -- QR code para validación
    verification_code TEXT UNIQUE, -- Código de 6 dígitos para verificación
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ, -- Fecha de vencimiento
    is_chronic BOOLEAN DEFAULT FALSE, -- Si es para tratamiento crónico (no vence)
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dispensed', 'partially_dispensed', 'expired', 'cancelled')),
    
    -- Dispensation tracking
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
    dispensed_at TIMESTAMPTZ,
    dispensed_by TEXT, -- Nombre del farmacéutico
    
    -- Notes
    doctor_notes TEXT,
    pharmacy_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_number ON prescriptions(prescription_number);
CREATE INDEX IF NOT EXISTS idx_prescriptions_verification ON prescriptions(verification_code);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at DESC);

-- =====================================================
-- 4. TABLA DE ÓRDENES DE LABORATORIO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.laboratory_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    laboratory_id UUID REFERENCES laboratories(id) ON DELETE SET NULL,
    
    -- Order Details
    order_number TEXT UNIQUE NOT NULL,
    
    -- Studies requested (array de estudios)
    studies JSONB NOT NULL,
    /*
    [
        {
            code: "HEMO001",
            name: "Hemograma completo",
            category: "Hematología",
            fasting_required: false,
            special_instructions: "..."
        }
    ]
    */
    
    -- Clinical info
    diagnosis TEXT,
    clinical_indications TEXT,
    
    -- Digital Signature
    digital_signature TEXT,
    qr_code TEXT,
    verification_code TEXT UNIQUE,
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ, -- Generalmente 30 días
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    
    -- Scheduling
    scheduled_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    
    -- Results
    results_available BOOLEAN DEFAULT FALSE,
    results_url TEXT, -- URL al PDF de resultados
    results_uploaded_at TIMESTAMPTZ,
    
    -- Notes
    doctor_notes TEXT,
    laboratory_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor ON laboratory_orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON laboratory_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_laboratory ON laboratory_orders(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_number ON laboratory_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_lab_orders_verification ON laboratory_orders(verification_code);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON laboratory_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_created_at ON laboratory_orders(created_at DESC);

-- =====================================================
-- 5. TABLA DE HISTORIAL DE DISPENSACIÓN
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prescription_dispensation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE RESTRICT,
    
    -- What was dispensed
    medications_dispensed JSONB NOT NULL, -- Subset of original medications
    
    -- Who dispensed
    pharmacist_name TEXT NOT NULL,
    pharmacist_license TEXT NOT NULL,
    
    -- When
    dispensed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Notes
    notes TEXT,
    
    -- Verification
    patient_signature TEXT, -- Puede ser digital
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispensation_prescription ON prescription_dispensation_history(prescription_id);
CREATE INDEX IF NOT EXISTS idx_dispensation_pharmacy ON prescription_dispensation_history(pharmacy_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Pharmacies
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacies can view own profile"
    ON public.pharmacies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND pharmacy_id = pharmacies.id
        )
    );

CREATE POLICY "Pharmacies can update own profile"
    ON public.pharmacies
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND pharmacy_id = pharmacies.id
        )
    );

CREATE POLICY "Public can view active pharmacies"
    ON public.pharmacies
    FOR SELECT
    USING (status = 'active' AND verified = true);

-- Laboratories
ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Laboratories can view own profile"
    ON public.laboratories
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND laboratory_id = laboratories.id
        )
    );

CREATE POLICY "Laboratories can update own profile"
    ON public.laboratories
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND laboratory_id = laboratories.id
        )
    );

CREATE POLICY "Public can view active laboratories"
    ON public.laboratories
    FOR SELECT
    USING (status = 'active' AND verified = true);

-- Prescriptions
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own prescriptions"
    ON public.prescriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND doctor_id = prescriptions.doctor_id
        )
    );

CREATE POLICY "Patients can view own prescriptions"
    ON public.prescriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND patient_id = prescriptions.patient_id
        )
    );

CREATE POLICY "Pharmacies can view prescriptions being dispensed"
    ON public.prescriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.pharmacies ph ON up.pharmacy_id = ph.id
            WHERE up.id = auth.uid()
        )
    );

-- Laboratory Orders
ALTER TABLE public.laboratory_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own orders"
    ON public.laboratory_orders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND doctor_id = laboratory_orders.doctor_id
        )
    );

CREATE POLICY "Patients can view own orders"
    ON public.laboratory_orders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND patient_id = laboratory_orders.patient_id
        )
    );

CREATE POLICY "Laboratories can view assigned orders"
    ON public.laboratory_orders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND laboratory_id = laboratory_orders.laboratory_id
        )
    );

-- =====================================================
-- 7. FUNCIONES AUXILIARES
-- =====================================================

-- Generar número de receta único
CREATE OR REPLACE FUNCTION generate_prescription_number()
RETURNS TEXT AS $$
DECLARE
    v_number TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_number := 'RX-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        SELECT EXISTS(SELECT 1 FROM prescriptions WHERE prescription_number = v_number) INTO v_exists;
        
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Generar código de verificación de 6 dígitos
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Generar número de orden de laboratorio
CREATE OR REPLACE FUNCTION generate_lab_order_number()
RETURNS TEXT AS $$
DECLARE
    v_number TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_number := 'LAB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        SELECT EXISTS(SELECT 1 FROM laboratory_orders WHERE order_number = v_number) INTO v_exists;
        
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Auto-generar prescription_number
CREATE OR REPLACE FUNCTION set_prescription_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.prescription_number IS NULL THEN
        NEW.prescription_number := generate_prescription_number();
    END IF;
    
    IF NEW.verification_code IS NULL THEN
        NEW.verification_code := generate_verification_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_prescription
    BEFORE INSERT ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION set_prescription_number();

-- Auto-generar order_number para laboratorios
CREATE OR REPLACE FUNCTION set_lab_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_lab_order_number();
    END IF;
    
    IF NEW.verification_code IS NULL THEN
        NEW.verification_code := generate_verification_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_lab_order
    BEFORE INSERT ON laboratory_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_lab_order_number();

-- =====================================================
-- 9. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE public.pharmacies IS 'Farmacias registradas en el sistema';
COMMENT ON TABLE public.laboratories IS 'Laboratorios clínicos registrados';
COMMENT ON TABLE public.prescriptions IS 'Recetas médicas digitales con firma y QR';
COMMENT ON TABLE public.laboratory_orders IS 'Órdenes de estudios de laboratorio';
COMMENT ON TABLE public.prescription_dispensation_history IS 'Historial de dispensación de medicamentos';

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migración de Farmacias y Laboratorios completada';
    RAISE NOTICE '📊 Tablas creadas: pharmacies, laboratories, prescriptions, laboratory_orders';
    RAISE NOTICE '🔒 RLS habilitado';
    RAISE NOTICE '⚡ Funciones y triggers configurados';
END $$;

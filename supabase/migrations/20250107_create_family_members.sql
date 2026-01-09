-- =====================================================
-- NÚCLEO FAMILIAR - Migración
-- Fecha: 2025-01-07
-- =====================================================

-- 1. Crear tabla de miembros familiares
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Titular de la cuenta (paciente principal)
    account_holder_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Datos del familiar
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    cedula VARCHAR(20), -- DNI del familiar (opcional para menores)
    birth_date DATE NOT NULL,
    gender VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(30),
    
    -- Relación con el titular
    relationship VARCHAR(50) NOT NULL, -- 'hijo', 'hija', 'padre', 'madre', 'abuelo', 'abuela', 'nieto', 'nieta', 'conyuge', 'hermano', 'hermana', 'otro'
    relationship_detail VARCHAR(100), -- Detalles adicionales si es 'otro'
    
    -- Si el familiar tiene cuenta propia vinculada
    linked_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    
    -- Permisos
    can_view_history BOOLEAN DEFAULT true,
    can_book_appointments BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_verification'))
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_family_members_account_holder ON family_members(account_holder_id);
CREATE INDEX IF NOT EXISTS idx_family_members_linked_patient ON family_members(linked_patient_id);
CREATE INDEX IF NOT EXISTS idx_family_members_status ON family_members(status);

-- RLS (Row Level Security)
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Política: Titulares pueden ver sus familiares
CREATE POLICY "Titulares pueden ver sus familiares" ON family_members
    FOR SELECT USING (
        account_holder_id::text = auth.uid()::text OR 
        linked_patient_id::text = auth.uid()::text
    );

-- Política: Titulares pueden insertar familiares
CREATE POLICY "Titulares pueden agregar familiares" ON family_members
    FOR INSERT WITH CHECK (account_holder_id::text = auth.uid()::text);

-- Política: Titulares pueden actualizar sus familiares
CREATE POLICY "Titulares pueden actualizar familiares" ON family_members
    FOR UPDATE USING (account_holder_id::text = auth.uid()::text);

-- Política: Titulares pueden eliminar sus familiares
CREATE POLICY "Titulares pueden eliminar familiares" ON family_members
    FOR DELETE USING (account_holder_id::text = auth.uid()::text);

-- 2. Modificar tabla appointments para soportar familiares
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS booked_by_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;

-- Comentarios para documentación
COMMENT ON COLUMN appointments.family_member_id IS 'Si no es NULL, la cita es para este familiar del paciente';
COMMENT ON COLUMN appointments.booked_by_patient_id IS 'ID del paciente que agendó la cita (puede ser diferente al paciente que recibe la consulta)';

-- Índice para búsquedas por familiar
CREATE INDEX IF NOT EXISTS idx_appointments_family_member ON appointments(family_member_id);
CREATE INDEX IF NOT EXISTS idx_appointments_booked_by ON appointments(booked_by_patient_id);

-- 3. Modificar tabla medical_records para soportar familiares
ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL;

COMMENT ON COLUMN medical_records.family_member_id IS 'Si no es NULL, el historial pertenece a este familiar';

-- Índice para búsquedas por familiar
CREATE INDEX IF NOT EXISTS idx_medical_records_family_member ON medical_records(family_member_id);

-- 4. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_family_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_family_members_updated_at ON family_members;
CREATE TRIGGER trigger_update_family_members_updated_at
    BEFORE UPDATE ON family_members
    FOR EACH ROW
    EXECUTE FUNCTION update_family_members_updated_at();

-- 5. Función para obtener la edad a partir de fecha de nacimiento
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_age IS 'Calcula la edad en años a partir de la fecha de nacimiento';

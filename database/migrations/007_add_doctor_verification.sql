-- Agregar campo de verificación para doctores
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Crear índice para búsquedas rápidas de doctores no verificados
CREATE INDEX IF NOT EXISTS idx_doctors_verified ON doctors(verified);

-- Comentarios
COMMENT ON COLUMN doctors.verified IS 'Indica si el doctor ha sido verificado por un administrador';
COMMENT ON COLUMN doctors.verification_notes IS 'Notas del administrador sobre la verificación';
COMMENT ON COLUMN doctors.verified_at IS 'Fecha y hora de verificación';
COMMENT ON COLUMN doctors.verified_by IS 'Email del administrador que verificó';

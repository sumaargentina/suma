-- Agregar campo de número de matrícula médica
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS medical_license TEXT;

-- Crear índice para búsquedas rápidas por matrícula
CREATE INDEX IF NOT EXISTS idx_doctors_medical_license ON doctors(medical_license);

-- Comentario
COMMENT ON COLUMN doctors.medical_license IS 'Número de matrícula médica del doctor';

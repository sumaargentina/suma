ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) DEFAULT 'DNI';

COMMENT ON COLUMN doctors.document_type IS 'Tipo de documento de identidad del doctor (DNI, Pasaporte, etc.)';

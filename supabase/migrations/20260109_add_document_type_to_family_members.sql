ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) DEFAULT 'DNI';

COMMENT ON COLUMN family_members.document_type IS 'Tipo de documento de identidad (DNI, Pasaporte, etc.)';

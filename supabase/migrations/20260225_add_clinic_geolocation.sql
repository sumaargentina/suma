-- Migración: Agregar columnas de geolocalización a clínicas
-- Para que las clínicas se puedan mostrar en el mapa interactivo

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS lat NUMERIC(10,8);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS lng NUMERIC(11,8);

-- Índice geoespacial para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_clinics_location ON clinics(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doctors_location ON doctors(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

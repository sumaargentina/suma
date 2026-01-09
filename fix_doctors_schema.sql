-- Script para arreglar restricciones de la tabla doctors
-- Ejecutar este script en Supabase SQL Editor

-- 1. Hacer cedula nullable y remover UNIQUE constraint
ALTER TABLE doctors ALTER COLUMN cedula DROP NOT NULL;
ALTER TABLE doctors DROP CONSTRAINT IF EXISTS doctors_cedula_key;

-- 2. Hacer sector nullable
ALTER TABLE doctors ALTER COLUMN sector DROP NOT NULL;

-- 3. Crear un índice parcial para cedulas no vacías (para mantener unicidad cuando se proporciona)
CREATE UNIQUE INDEX IF NOT EXISTS doctors_cedula_unique_idx ON doctors(cedula) WHERE cedula IS NOT NULL AND cedula != '';

-- 4. Actualizar registros existentes con cedula vacía a NULL
UPDATE doctors SET cedula = NULL WHERE cedula = '';
UPDATE doctors SET sector = NULL WHERE sector = '';

-- Verificar cambios
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'doctors' 
AND column_name IN ('cedula', 'sector');

-- Migración para agregar 'no_especificar' como opción de género
-- Ejecutar en Supabase

-- Actualizar el CHECK constraint de género en pacientes
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_gender_check;
ALTER TABLE patients ADD CONSTRAINT patients_gender_check 
  CHECK (gender IN ('masculino', 'femenino', 'otro', 'no_especificar'));

-- También actualizar en family_members si existe
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_gender_check;
ALTER TABLE family_members ADD CONSTRAINT family_members_gender_check 
  CHECK (gender IN ('masculino', 'femenino', 'otro', 'no_especificar') OR gender IS NULL);

-- =====================================================
-- SCRIPT: Agregar Constraints UNIQUE a la Base de Datos
-- Fecha: 2025-12-24
-- Descripción: Agrega restricciones de unicidad para evitar
--              datos duplicados en campos críticos.
-- 
-- IMPORTANTE: Ejecutar este script en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICAR Y LIMPIAR DUPLICADOS EXISTENTES
-- =====================================================
-- Antes de agregar constraints, necesitamos verificar si hay duplicados.
-- Si los hay, debemos limpiarlos manualmente primero.

-- Verificar emails duplicados en doctors
SELECT email, COUNT(*) as count 
FROM doctors 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Verificar emails duplicados en patients
SELECT email, COUNT(*) as count 
FROM patients 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Verificar emails duplicados en sellers
SELECT email, COUNT(*) as count 
FROM sellers 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Verificar emails duplicados en admins
SELECT email, COUNT(*) as count 
FROM admins 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Verificar cédulas duplicadas en doctors
SELECT cedula, COUNT(*) as count 
FROM doctors 
WHERE cedula IS NOT NULL AND cedula != ''
GROUP BY cedula 
HAVING COUNT(*) > 1;

-- Verificar matrículas duplicadas en doctors
SELECT medical_license, COUNT(*) as count 
FROM doctors 
WHERE medical_license IS NOT NULL AND medical_license != ''
GROUP BY medical_license 
HAVING COUNT(*) > 1;

-- Verificar códigos de referido duplicados en sellers
SELECT referral_code, COUNT(*) as count 
FROM sellers 
WHERE referral_code IS NOT NULL AND referral_code != ''
GROUP BY referral_code 
HAVING COUNT(*) > 1;

-- =====================================================
-- PASO 2: AGREGAR CONSTRAINTS UNIQUE
-- =====================================================
-- NOTA: Si algún constraint falla, significa que hay duplicados.
--       Debes limpiarlos primero.

-- DOCTORS: Email único
ALTER TABLE doctors 
ADD CONSTRAINT doctors_email_unique UNIQUE (email);

-- DOCTORS: Cédula/DNI único (solo si no es vacío)
-- Usamos un índice parcial para permitir valores vacíos múltiples
CREATE UNIQUE INDEX doctors_cedula_unique 
ON doctors (cedula) 
WHERE cedula IS NOT NULL AND cedula != '';

-- DOCTORS: Matrícula médica única (solo si no es vacía)
CREATE UNIQUE INDEX doctors_medical_license_unique 
ON doctors (medical_license) 
WHERE medical_license IS NOT NULL AND medical_license != '';

-- PATIENTS: Email único
ALTER TABLE patients 
ADD CONSTRAINT patients_email_unique UNIQUE (email);

-- PATIENTS: Cédula/DNI único (solo si no es vacío)
CREATE UNIQUE INDEX patients_cedula_unique 
ON patients (cedula) 
WHERE cedula IS NOT NULL AND cedula != '';

-- SELLERS: Email único
ALTER TABLE sellers 
ADD CONSTRAINT sellers_email_unique UNIQUE (email);

-- SELLERS: Código de referido único
CREATE UNIQUE INDEX sellers_referral_code_unique 
ON sellers (referral_code) 
WHERE referral_code IS NOT NULL AND referral_code != '';

-- ADMINS: Email único
ALTER TABLE admins 
ADD CONSTRAINT admins_email_unique UNIQUE (email);

-- =====================================================
-- PASO 3: CONSTRAINT COMPUESTO PARA CITAS
-- =====================================================
-- Evita que un doctor tenga dos citas en el mismo horario

CREATE UNIQUE INDEX appointments_doctor_datetime_unique 
ON appointments (doctor_id, date, time)
WHERE attendance != 'Cancelada';

-- =====================================================
-- PASO 4: VERIFICAR CONSTRAINTS CREADOS
-- =====================================================

-- Listar todos los constraints únicos
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Listar todos los índices únicos
SELECT 
    tablename, 
    indexname, 
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexdef LIKE '%UNIQUE%'
ORDER BY tablename;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 
-- 1. Si algún ALTER TABLE falla con error de duplicados:
--    - Ejecuta la query de verificación correspondiente
--    - Decide qué registro mantener
--    - Elimina o actualiza los duplicados
--    - Vuelve a intentar el ALTER TABLE
--
-- 2. Los índices parciales (WHERE ... != '') permiten:
--    - Múltiples registros con valores NULL o vacíos
--    - Pero NO dos registros con el mismo valor no vacío
--
-- 3. Para eliminar un constraint si necesitas:
--    ALTER TABLE doctors DROP CONSTRAINT doctors_email_unique;
--    DROP INDEX doctors_cedula_unique;
--
-- =====================================================

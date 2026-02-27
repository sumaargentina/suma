-- Script para actualizar el status de todos los doctores a 'active'
-- Ejecuta esto en el SQL Editor de Supabase

-- Actualizar todos los doctores que no tienen status o tienen status NULL
UPDATE doctors
SET status = 'active'
WHERE status IS NULL OR status = '';

-- Actualizar todos los doctores que tienen status 'inactive' a 'active'
-- (Comenta esta línea si quieres mantener algunos doctores como inactivos)
UPDATE doctors
SET status = 'active'
WHERE status = 'inactive';

-- Verificar los resultados
SELECT id, name, email, status
FROM doctors
ORDER BY name;

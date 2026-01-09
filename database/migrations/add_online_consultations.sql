-- Script SQL para agregar soporte de consultas online
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna para configuración de consultas online en la tabla doctors
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS online_consultation JSONB;

-- 2. Agregar columnas para tipo de consulta y link de reunión en appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(20) DEFAULT 'presencial',
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- 3. Agregar índice para búsquedas por tipo de consulta
CREATE INDEX IF NOT EXISTS idx_appointments_consultation_type 
ON appointments(consultation_type);

-- 4. Comentarios para documentar las columnas
COMMENT ON COLUMN doctors.online_consultation IS 'Configuración JSON para consultas online: {enabled, consultationFee, schedule, platform, services}';
COMMENT ON COLUMN appointments.consultation_type IS 'Tipo de consulta: presencial u online';
COMMENT ON COLUMN appointments.meeting_link IS 'Link de videollamada para consultas online';

-- 5. Ejemplo de actualización para un doctor que ofrece consultas online
-- NOTA: Reemplazar 'DOCTOR_ID_AQUI' con el ID real del doctor
/*
UPDATE doctors 
SET online_consultation = '{
  "enabled": true,
  "consultationFee": 5000,
  "platform": "Google Meet",
  "schedule": {
    "monday": {
      "active": true,
      "slots": [{"start": "18:00", "end": "21:00"}]
    },
    "tuesday": {
      "active": true,
      "slots": [{"start": "18:00", "end": "21:00"}]
    },
    "wednesday": {
      "active": false,
      "slots": []
    },
    "thursday": {
      "active": true,
      "slots": [{"start": "18:00", "end": "21:00"}]
    },
    "friday": {
      "active": true,
      "slots": [{"start": "18:00", "end": "20:00"}]
    },
    "saturday": {
      "active": false,
      "slots": []
    },
    "sunday": {
      "active": false,
      "slots": []
    }
  },
  "services": [
    {
      "id": "online-1",
      "name": "Consulta de seguimiento online",
      "price": 2000
    }
  ]
}'::jsonb
WHERE id = 'DOCTOR_ID_AQUI';
*/

-- 6. Verificar la estructura actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'doctors' 
  AND column_name = 'online_consultation';

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
  AND column_name IN ('consultation_type', 'meeting_link');

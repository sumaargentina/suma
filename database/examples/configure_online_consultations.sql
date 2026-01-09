-- Ejemplo: Configurar consultas online para un médico
-- Este script muestra cómo actualizar un médico existente para que ofrezca consultas online

-- PASO 1: Identificar el ID del médico
-- Reemplaza 'nombre_del_medico' con el nombre real
SELECT id, name, email, specialty, city 
FROM doctors 
WHERE name ILIKE '%nombre_del_medico%';

-- PASO 2: Configurar consultas online
-- Reemplaza 'DOCTOR_ID_AQUI' con el ID obtenido en el paso anterior

-- Ejemplo 1: Médico con consultas online en horario nocturno
UPDATE doctors 
SET online_consultation = '{
  "enabled": true,
  "consultationFee": 5000,
  "platform": "Google Meet",
  "schedule": {
    "monday": {
      "active": true,
      "slots": [
        {"start": "19:00", "end": "21:00"}
      ]
    },
    "tuesday": {
      "active": true,
      "slots": [
        {"start": "19:00", "end": "21:00"}
      ]
    },
    "wednesday": {
      "active": true,
      "slots": [
        {"start": "19:00", "end": "21:00"}
      ]
    },
    "thursday": {
      "active": true,
      "slots": [
        {"start": "19:00", "end": "21:00"}
      ]
    },
    "friday": {
      "active": true,
      "slots": [
        {"start": "19:00", "end": "20:00"}
      ]
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
      "id": "online-seguimiento",
      "name": "Consulta de seguimiento online",
      "price": 2000
    },
    {
      "id": "online-receta",
      "name": "Renovación de receta online",
      "price": 1500
    }
  ]
}'::jsonb
WHERE id = 'DOCTOR_ID_AQUI';

-- Ejemplo 2: Médico con consultas online todo el día
UPDATE doctors 
SET online_consultation = '{
  "enabled": true,
  "consultationFee": 6000,
  "platform": "Zoom",
  "schedule": {
    "monday": {
      "active": true,
      "slots": [
        {"start": "08:00", "end": "12:00"},
        {"start": "14:00", "end": "18:00"}
      ]
    },
    "tuesday": {
      "active": true,
      "slots": [
        {"start": "08:00", "end": "12:00"},
        {"start": "14:00", "end": "18:00"}
      ]
    },
    "wednesday": {
      "active": true,
      "slots": [
        {"start": "08:00", "end": "12:00"},
        {"start": "14:00", "end": "18:00"}
      ]
    },
    "thursday": {
      "active": true,
      "slots": [
        {"start": "08:00", "end": "12:00"},
        {"start": "14:00", "end": "18:00"}
      ]
    },
    "friday": {
      "active": true,
      "slots": [
        {"start": "08:00", "end": "12:00"},
        {"start": "14:00", "end": "17:00"}
      ]
    },
    "saturday": {
      "active": true,
      "slots": [
        {"start": "09:00", "end": "13:00"}
      ]
    },
    "sunday": {
      "active": false,
      "slots": []
    }
  }
}'::jsonb
WHERE id = 'DOCTOR_ID_AQUI';

-- Ejemplo 3: Médico solo con consultas online (sin consultorio físico)
UPDATE doctors 
SET online_consultation = '{
  "enabled": true,
  "consultationFee": 4500,
  "platform": "WhatsApp Video",
  "schedule": {
    "monday": {
      "active": true,
      "slots": [
        {"start": "10:00", "end": "20:00"}
      ]
    },
    "tuesday": {
      "active": true,
      "slots": [
        {"start": "10:00", "end": "20:00"}
      ]
    },
    "wednesday": {
      "active": true,
      "slots": [
        {"start": "10:00", "end": "20:00"}
      ]
    },
    "thursday": {
      "active": true,
      "slots": [
        {"start": "10:00", "end": "20:00"}
      ]
    },
    "friday": {
      "active": true,
      "slots": [
        {"start": "10:00", "end": "20:00"}
      ]
    },
    "saturday": {
      "active": true,
      "slots": [
        {"start": "10:00", "end": "18:00"}
      ]
    },
    "sunday": {
      "active": true,
      "slots": [
        {"start": "10:00", "end": "14:00"}
      ]
    }
  },
  "services": [
    {
      "id": "online-primera-vez",
      "name": "Primera consulta online",
      "price": 0
    },
    {
      "id": "online-control",
      "name": "Control online",
      "price": 2500
    },
    {
      "id": "online-urgencia",
      "name": "Consulta urgente online",
      "price": 3000
    }
  ]
}'::jsonb
WHERE id = 'DOCTOR_ID_AQUI';

-- PASO 3: Verificar la configuración
SELECT 
    id,
    name,
    specialty,
    consultation_fee as precio_presencial,
    online_consultation->>'enabled' as online_habilitado,
    online_consultation->>'consultationFee' as precio_online,
    online_consultation->>'platform' as plataforma
FROM doctors 
WHERE id = 'DOCTOR_ID_AQUI';

-- PASO 4: Ver el horario online completo
SELECT 
    name,
    jsonb_pretty(online_consultation->'schedule') as horario_online
FROM doctors 
WHERE id = 'DOCTOR_ID_AQUI';

-- PASO 5: Desactivar consultas online (si es necesario)
UPDATE doctors 
SET online_consultation = jsonb_set(
    online_consultation,
    '{enabled}',
    'false'::jsonb
)
WHERE id = 'DOCTOR_ID_AQUI';

-- PASO 6: Actualizar solo el precio de consulta online
UPDATE doctors 
SET online_consultation = jsonb_set(
    online_consultation,
    '{consultationFee}',
    '7000'::jsonb
)
WHERE id = 'DOCTOR_ID_AQUI';

-- PASO 7: Actualizar la plataforma
UPDATE doctors 
SET online_consultation = jsonb_set(
    online_consultation,
    '{platform}',
    '"Microsoft Teams"'::jsonb
)
WHERE id = 'DOCTOR_ID_AQUI';

-- PASO 8: Listar todos los médicos con consultas online habilitadas
SELECT 
    id,
    name,
    specialty,
    city,
    consultation_fee as precio_presencial,
    online_consultation->>'consultationFee' as precio_online,
    online_consultation->>'platform' as plataforma
FROM doctors 
WHERE online_consultation->>'enabled' = 'true'
ORDER BY name;

-- PASO 9: Estadísticas de consultas online vs presenciales
SELECT 
    consultation_type,
    COUNT(*) as total_citas,
    SUM(total_price) as ingresos_totales,
    AVG(total_price) as precio_promedio
FROM appointments
WHERE doctor_id = 'DOCTOR_ID_AQUI'
GROUP BY consultation_type;

-- PASO 10: Ver próximas citas online de un médico
SELECT 
    a.id,
    a.patient_name,
    a.date,
    a.time,
    a.consultation_type,
    a.total_price,
    a.payment_status,
    a.meeting_link
FROM appointments a
WHERE a.doctor_id = 'DOCTOR_ID_AQUI'
  AND a.consultation_type = 'online'
  AND a.date >= CURRENT_DATE
ORDER BY a.date, a.time;

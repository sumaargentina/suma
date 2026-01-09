-- Script de inicialización de datos para Argentina (CORREGIDO)
-- Ejecutar este script en el SQL Editor de Supabase

-- Insertar o actualizar configuración con datos argentinos
INSERT INTO settings (
  id,
  cities,
  specialties,
  beauty_specialties,
  coupons,
  company_bank_details,
  company_expenses,
  currency,
  timezone,
  logo_url,
  hero_image_url,
  billing_cycle_start_day,
  billing_cycle_end_day
) VALUES (
  'main', -- ID fijo
  -- Ciudades de Argentina
  '[
    {"name": "Buenos Aires", "subscriptionFee": 50000},
    {"name": "Córdoba", "subscriptionFee": 45000},
    {"name": "Rosario", "subscriptionFee": 45000},
    {"name": "Mendoza", "subscriptionFee": 40000},
    {"name": "La Plata", "subscriptionFee": 45000},
    {"name": "San Miguel de Tucumán", "subscriptionFee": 35000},
    {"name": "Mar del Plata", "subscriptionFee": 40000},
    {"name": "Salta", "subscriptionFee": 35000},
    {"name": "Santa Fe", "subscriptionFee": 40000},
    {"name": "San Juan", "subscriptionFee": 35000}
  ]'::jsonb,
  -- Especialidades médicas
  '[
    "Medicina General",
    "Cardiología",
    "Dermatología",
    "Pediatría",
    "Ginecología",
    "Traumatología",
    "Oftalmología",
    "Neurología",
    "Psiquiatría",
    "Psicología",
    "Nutrición",
    "Kinesiología",
    "Odontología",
    "Endocrinología",
    "Gastroenterología",
    "Urología",
    "Otorrinolaringología",
    "Reumatología",
    "Oncología",
    "Medicina del Deporte"
  ]'::jsonb,
  -- Especialidades estéticas
  '[
    "Cirugía Plástica",
    "Dermatología Estética",
    "Medicina Estética",
    "Tratamientos Faciales",
    "Tratamientos Corporales"
  ]'::jsonb,
  '[]'::jsonb, -- coupons vacío
  '[]'::jsonb, -- company_bank_details vacío
  '[]'::jsonb, -- company_expenses vacío
  'ARS', -- Peso Argentino
  'America/Argentina/Buenos_Aires',
  '', -- logo_url vacío
  '', -- hero_image_url vacío
  1, -- billing_cycle_start_day
  25 -- billing_cycle_end_day
)
ON CONFLICT (id) DO UPDATE SET
  cities = EXCLUDED.cities,
  specialties = EXCLUDED.specialties,
  beauty_specialties = EXCLUDED.beauty_specialties,
  timezone = EXCLUDED.timezone,
  currency = EXCLUDED.currency,
  updated_at = NOW();

-- Verificar que los datos se insertaron correctamente
SELECT 
  id,
  jsonb_array_length(cities) as cantidad_ciudades,
  jsonb_array_length(specialties) as cantidad_especialidades,
  timezone,
  currency,
  updated_at
FROM settings
WHERE id = 'main';

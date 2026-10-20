-- Migration: Add multi-currency and historical exchange audit columns
-- Created on 2026-09-08

-- 1. Appointments Table: Add currency, exchange rate, and frozen financial audit fields
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14, 4) DEFAULT 1;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS amount_in_usd NUMERIC(10, 2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS amount_in_local_currency NUMERIC(16, 2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_account_details JSONB DEFAULT NULL;

-- 2. Settings Table: Add exchange rate columns
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bcv_rate NUMERIC(14, 4) DEFAULT 65.50;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bcv_last_updated TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE settings ADD COLUMN IF NOT EXISTS exchange_rates JSONB DEFAULT '{"VES": 65.50, "USD": 1.0}'::jsonb;

-- Comment on columns for auditing documentation
COMMENT ON COLUMN appointments.currency IS 'Moneda base del sistema (generalmente USD)';
COMMENT ON COLUMN appointments.payment_currency IS 'Moneda con la que el paciente pagó o pagará (USD o VES)';
COMMENT ON COLUMN appointments.exchange_rate IS 'Tasa de cambio congelada al momento del pago/reserva para auditoría contable';
COMMENT ON COLUMN appointments.amount_in_usd IS 'Monto equivalente en USD congelado';
COMMENT ON COLUMN appointments.amount_in_local_currency IS 'Monto congelado en moneda local (ej: Bs.)';
COMMENT ON COLUMN appointments.paid_at IS 'Fecha y hora en la que se confirmó el pago de la cita';
COMMENT ON COLUMN appointments.payment_account_details IS 'Datos de la cuenta bancaria seleccionada congelados en la transacción';

-- Add payment_settings column to clinics table
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.clinics.payment_settings IS 'Configuration for payment methods (Transfer, Mercado Pago, Cash)';

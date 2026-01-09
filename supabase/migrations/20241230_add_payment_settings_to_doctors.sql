-- Add payment_settings column to doctors table
ALTER TABLE public.doctors
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{
  "cash": {"enabled": true},
  "transfer": {"enabled": false},
  "mercadopago": {"enabled": false}
}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.doctors.payment_settings IS 'Configuration for payment methods (Cash, Transfer, Mercado Pago)';

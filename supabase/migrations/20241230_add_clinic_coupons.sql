-- Add coupons column to clinics table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS coupons JSONB DEFAULT '[]'::jsonb;

-- Add subscription fields to clinics table and create clinic_payments table
-- This enables the subscription and payment system for clinics

-- Add subscription-related columns to clinics table
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'pending_payment'));

ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS next_payment_date DATE;

ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS subscription_fee DECIMAL(10,2) DEFAULT 0;

-- Create clinic_payments table for payment history
CREATE TABLE IF NOT EXISTS clinic_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Rejected')),
    payment_method TEXT DEFAULT 'transfer' CHECK (payment_method IN ('transfer', 'mercadopago', 'cash')),
    transaction_id TEXT,
    payment_proof_url TEXT,
    notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clinic_payments_clinic_id ON clinic_payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_payments_status ON clinic_payments(status);
CREATE INDEX IF NOT EXISTS idx_clinic_payments_date ON clinic_payments(date);
CREATE INDEX IF NOT EXISTS idx_clinics_subscription_status ON clinics(subscription_status);

-- Add comments for documentation
COMMENT ON TABLE clinic_payments IS 'Payment history for clinic subscriptions';
COMMENT ON COLUMN clinics.subscription_status IS 'Subscription status: active, inactive, or pending_payment';
COMMENT ON COLUMN clinics.last_payment_date IS 'Date of last approved payment';
COMMENT ON COLUMN clinics.next_payment_date IS 'Due date for next payment';
COMMENT ON COLUMN clinics.subscription_fee IS 'Monthly subscription fee for this clinic based on their plan';

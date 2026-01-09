-- Migración inicial: Esquema completo de la base de datos
-- Este script crea todas las tablas necesarias para reemplazar las colecciones de Firestore

-- =====================================================
-- ENABLE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Tabla: doctors
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cedula TEXT NOT NULL UNIQUE,
  specialty TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  sector TEXT NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  profile_image TEXT,
  banner_image TEXT,
  ai_hint TEXT,
  description TEXT,
  services JSONB DEFAULT '[]'::jsonb,
  bank_details JSONB DEFAULT '[]'::jsonb,
  expenses JSONB DEFAULT '[]'::jsonb,
  coupons JSONB DEFAULT '[]'::jsonb,
  schedule JSONB NOT NULL,
  slot_duration INTEGER DEFAULT 30,
  consultation_fee NUMERIC(10, 2) NOT NULL,
  seller_id UUID,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_payment_date DATE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  whatsapp TEXT,
  lat NUMERIC(10, 8),
  lng NUMERIC(11, 8),
  join_date DATE NOT NULL,
  subscription_status TEXT DEFAULT 'pending_payment' CHECK (subscription_status IN ('active', 'inactive', 'pending_payment')),
  next_payment_date DATE,
  read_by_admin BOOLEAN DEFAULT FALSE,
  read_by_seller BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: sellers
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  phone TEXT,
  profile_image TEXT,
  referral_code TEXT UNIQUE,
  commission_rate NUMERIC(5, 4) NOT NULL,
  bank_details JSONB DEFAULT '[]'::jsonb,
  expenses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  age INTEGER,
  gender TEXT CHECK (gender IN ('masculino', 'femenino', 'otro')),
  phone TEXT,
  cedula TEXT,
  city TEXT,
  favorite_doctor_ids JSONB DEFAULT '[]'::jsonb,
  profile_image TEXT,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  services JSONB DEFAULT '[]'::jsonb,
  total_price NUMERIC(10, 2) NOT NULL,
  consultation_fee NUMERIC(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia')),
  payment_status TEXT DEFAULT 'Pendiente' CHECK (payment_status IN ('Pendiente', 'Pagado')),
  payment_proof TEXT,
  attendance TEXT DEFAULT 'Pendiente' CHECK (attendance IN ('Atendido', 'No Asistió', 'Pendiente')),
  patient_confirmation_status TEXT DEFAULT 'Pendiente' CHECK (patient_confirmation_status IN ('Pendiente', 'Confirmada', 'Cancelada')),
  clinical_notes TEXT,
  prescription TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  read_by_doctor BOOLEAN DEFAULT FALSE,
  read_by_patient BOOLEAN DEFAULT TRUE,
  unread_messages_by_doctor INTEGER DEFAULT 0,
  unread_messages_by_patient INTEGER DEFAULT 0,
  last_message_timestamp TIMESTAMPTZ,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  applied_coupon TEXT,
  patient_phone TEXT,
  doctor_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: doctor_payments
CREATE TABLE IF NOT EXISTS doctor_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Paid', 'Pending', 'Rejected')),
  payment_proof_url TEXT,
  transaction_id TEXT,
  read_by_admin BOOLEAN DEFAULT FALSE,
  read_by_doctor BOOLEAN DEFAULT FALSE,
  payment_method TEXT,
  target_account TEXT,
  payment_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: seller_payments
CREATE TABLE IF NOT EXISTS seller_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  period TEXT NOT NULL,
  included_doctors JSONB DEFAULT '[]'::jsonb,
  payment_proof_url TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  read_by_seller BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: marketing_materials
CREATE TABLE IF NOT EXISTS marketing_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'file', 'url')),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('doctor', 'seller')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'abierto' CHECK (status IN ('abierto', 'cerrado')),
  date DATE NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  read_by_admin BOOLEAN DEFAULT FALSE,
  read_by_seller BOOLEAN DEFAULT FALSE,
  read_by_doctor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: settings (singleton)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  cities JSONB DEFAULT '[]'::jsonb,
  specialties JSONB DEFAULT '[]'::jsonb,
  company_bank_details JSONB DEFAULT '[]'::jsonb,
  timezone TEXT DEFAULT 'America/Caracas',
  logo_url TEXT,
  currency TEXT DEFAULT 'USD',
  beauty_specialties JSONB DEFAULT '[]'::jsonb,
  hero_image_url TEXT,
  billing_cycle_start_day INTEGER DEFAULT 1,
  billing_cycle_end_day INTEGER DEFAULT 30,
  coupons JSONB DEFAULT '[]'::jsonb,
  company_expenses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: admins
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '["all"]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: doctor_reviews
CREATE TABLE IF NOT EXISTS doctor_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_profile_image TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  appointment_id UUID,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, patient_id)
);

-- Tabla: inactivation_logs
CREATE TABLE IF NOT EXISTS inactivation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  reason TEXT,
  inactivated_at TIMESTAMPTZ DEFAULT NOW(),
  inactivated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: admin_notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('payment', 'new_doctor', 'support_ticket')),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Doctors indexes
CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email);
CREATE INDEX IF NOT EXISTS idx_doctors_city ON doctors(city);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);
CREATE INDEX IF NOT EXISTS idx_doctors_seller_id ON doctors(seller_id);

-- Sellers indexes
CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);
CREATE INDEX IF NOT EXISTS idx_sellers_referral_code ON sellers(referral_code);

-- Patients indexes
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_time ON appointments(doctor_id, date, time);

-- Doctor payments indexes
CREATE INDEX IF NOT EXISTS idx_doctor_payments_doctor_id ON doctor_payments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_payments_status ON doctor_payments(status);
CREATE INDEX IF NOT EXISTS idx_doctor_payments_date ON doctor_payments(date);

-- Seller payments indexes
CREATE INDEX IF NOT EXISTS idx_seller_payments_seller_id ON seller_payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payments_status ON seller_payments(status);

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Doctor reviews indexes
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id ON doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_patient_id ON doctor_reviews(patient_id);

-- Inactivation logs indexes
CREATE INDEX IF NOT EXISTS idx_inactivation_logs_doctor_id ON inactivation_logs(doctor_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_payments_updated_at BEFORE UPDATE ON doctor_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_payments_updated_at BEFORE UPDATE ON seller_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_materials_updated_at BEFORE UPDATE ON marketing_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_reviews_updated_at BEFORE UPDATE ON doctor_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE inactivation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for doctors (doctors can read/update their own data)
CREATE POLICY "Doctors can view their own data" ON doctors
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Doctors can update their own data" ON doctors
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Policies for sellers (sellers can view their own data)
CREATE POLICY "Sellers can view their own data" ON sellers
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Sellers can update their own data" ON sellers
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Policies for patients (patients can read/update their own data)
CREATE POLICY "Patients can view their own data" ON patients
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Patients can update their own data" ON patients
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Policies for appointments
CREATE POLICY "Patients can view their appointments" ON appointments
  FOR SELECT USING (auth.uid()::text = patient_id::text);

CREATE POLICY "Doctors can view their appointments" ON appointments
  FOR SELECT USING (auth.uid()::text = doctor_id::text);

-- Policies for doctor_reviews (anyone can read, only patients can create)
CREATE POLICY "Anyone can view reviews" ON doctor_reviews
  FOR SELECT USING (true);

-- Policies for settings (anyone can read)
CREATE POLICY "Anyone can view settings" ON settings
  FOR SELECT USING (true);

-- Policies for marketing_materials (anyone can read)
CREATE POLICY "Anyone can view marketing materials" ON marketing_materials
  FOR SELECT USING (true);

-- Insert default settings row
INSERT INTO settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create storage buckets (run these in Supabase dashboard or via SQL)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('settings-images', 'settings-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('main-page-images', 'main-page-images', true);

-- =====================================================
-- LABORATORY MODULE - Tables and Policies
-- =====================================================

-- 1. Create laboratories table
CREATE TABLE IF NOT EXISTS public.laboratories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_email TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    description TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    website TEXT,
    password TEXT, -- Hashed password
    country TEXT,
    state TEXT,
    city TEXT,
    address TEXT,
    sector TEXT,
    banner_image TEXT,
    rating NUMERIC DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    payment_settings JSONB,
    coupons JSONB DEFAULT '[]'::jsonb,
    plan TEXT DEFAULT 'esencial' CHECK (plan IN ('esencial', 'profesional', 'empresarial', 'integral')),
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    accepted_insurances TEXT[] DEFAULT '{}',
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'pending_payment')),
    last_payment_date TIMESTAMP WITH TIME ZONE,
    next_payment_date TIMESTAMP WITH TIME ZONE,
    subscription_fee NUMERIC DEFAULT 0,
    lat NUMERIC,
    lng NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create laboratory_services table
CREATE TABLE IF NOT EXISTS public.laboratory_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    laboratory_id UUID REFERENCES public.laboratories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service_category TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    duration INTEGER, -- estimated time in minutes
    daily_capacity INTEGER,
    operating_hours JSONB, -- { "monday": ["08:00-12:00", "14:00-18:00"], ... }
    description TEXT,
    preparation_instructions TEXT, -- e.g. "Ayuno de 12 horas"
    results_delivery_time TEXT, -- e.g. "24-48 horas"
    is_active BOOLEAN DEFAULT TRUE,
    items JSONB DEFAULT '[]'::jsonb, -- sub-items with individual prices
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_laboratories_admin_email ON public.laboratories(admin_email);
CREATE INDEX IF NOT EXISTS idx_laboratories_slug ON public.laboratories(slug);
CREATE INDEX IF NOT EXISTS idx_laboratories_status ON public.laboratories(status);
CREATE INDEX IF NOT EXISTS idx_laboratory_services_lab_id ON public.laboratory_services(laboratory_id);

-- 4. Enable RLS
ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratory_services ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Public read access
CREATE POLICY "Laboratories are viewable by everyone"
    ON public.laboratories FOR SELECT USING (true);

CREATE POLICY "Laboratory services are viewable by everyone"
    ON public.laboratory_services FOR SELECT USING (true);

-- 6. RLS Policies - Service role full access (for API routes)
CREATE POLICY "Service role can manage laboratories"
    ON public.laboratories FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage laboratory services"
    ON public.laboratory_services FOR ALL
    USING (auth.role() = 'service_role');

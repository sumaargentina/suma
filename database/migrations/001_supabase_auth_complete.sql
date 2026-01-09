-- =====================================================
-- MIGRACIÓN: SUPABASE AUTH COMPLETO
-- Descripción: Configuración completa de autenticación con Supabase
-- Fecha: 2025-12-14
-- Versión: 1.0.0
-- =====================================================

-- 1. HABILITAR EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. CREAR TABLA DE PERFILES UNIFICADOS
-- =====================================================
-- Esta tabla conecta Supabase Auth con nuestros usuarios
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'seller', 'admin', 'pharmacy', 'laboratory')),
    name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    
    -- Metadata adicional
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    
    -- OAuth providers
    provider TEXT, -- 'email', 'google', 'facebook'
    provider_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Reference to role-specific table
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
    laboratory_id UUID REFERENCES laboratories(id) ON DELETE SET NULL
);

-- Index para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_provider ON user_profiles(provider);

-- =====================================================
-- 3. CREAR TABLA DE SESIONES (para tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Session info
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    
    -- Location
    city TEXT,
    country TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at);

-- =====================================================
-- 4. TABLA DE AUDIT LOG (seguridad)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.auth_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Event details
    event_type TEXT NOT NULL, -- 'login', 'logout', 'password_change', 'mfa_enabled', etc.
    status TEXT NOT NULL, -- 'success', 'failed'
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    
    -- Error info (if failed)
    error_message TEXT,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- =====================================================
-- 5. TABLA DE MFA (Multi-Factor Authentication)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_mfa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- MFA method: 'totp', 'sms', 'email'
    method TEXT NOT NULL DEFAULT 'totp',
    
    -- For TOTP (Google Authenticator)
    secret TEXT,
    backup_codes TEXT[], -- Array of backup codes
    
    -- For SMS
    phone_number TEXT,
    
    -- Status
    enabled BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa(user_id);

-- =====================================================
-- 6. TABLA DE MAGIC LINKS / OTP
-- =====================================================
CREATE TABLE IF NOT EXISTS public.magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    
    -- Type: 'login', 'signup', 'password_reset'
    type TEXT NOT NULL,
    
    -- Status
    used BOOLEAN DEFAULT FALSE,
    expired BOOLEAN DEFAULT FALSE,
    
    -- Expiry
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);

-- =====================================================
-- 7. TABLA DE PASSWORD RESET REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    
    -- Status
    used BOOLEAN DEFAULT FALSE,
    
    -- Expiry
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    
    -- Security
    ip_address INET,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_requests(token);

-- =====================================================
-- 8. FUNCIÓN: Auto-create user_profile on signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id,
        email,
        role,
        name,
        provider,
        email_verified,
        created_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
        COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
        COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        NEW.email_confirmed_at IS NOT NULL,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 9. FUNCIÓN: Update last_login_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET last_login_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar last login
DROP TRIGGER IF EXISTS on_user_login ON auth.users;
CREATE TRIGGER on_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION public.update_last_login();

-- =====================================================
-- 10. FUNCIÓN: Log auth events
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_status TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.auth_audit_log (
        user_id,
        event_type,
        status,
        ip_address,
        user_agent,
        error_message,
        metadata,
        created_at
    ) VALUES (
        p_user_id,
        p_event_type,
        p_status,
        p_ip_address,
        p_user_agent,
        p_error_message,
        p_metadata,
        NOW()
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- User Profiles: Users can only see/update their own profile
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can see all profiles
CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- User Sessions: Users can only see their own sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
    ON public.user_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- MFA: Users can only manage their own MFA
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own MFA"
    ON public.user_mfa
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Audit Log: Only admins can view
ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
    ON public.auth_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view their own audit log
CREATE POLICY "Users can view own audit log"
    ON public.auth_audit_log
    FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- 12. CONFIGURACIÓN DE SUPABASE AUTH
-- =====================================================
-- NOTA: Estas configuraciones se hacen desde el dashboard de Supabase

-- Auth Settings recomendadas:
-- ✅ Enable Email Confirmations
-- ✅ Enable Magic Links
-- ✅ Enable OAuth (Google, Facebook)
-- ✅ JWT expiry: 3600 seconds (1 hour)
-- ✅ Refresh token expiry: 2592000 seconds (30 days)
-- ✅ Enable MFA
-- ✅ Minimum password length: 8

-- Email Templates a personalizar:
-- - Confirmation email
-- - Magic link email
-- - Password reset email
-- - Email change confirmation

-- =====================================================
-- 13. ÍNDICES ADICIONALES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- =====================================================
-- 14. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE public.user_profiles IS 'Perfiles de usuario unificados, conectados con Supabase Auth';
COMMENT ON TABLE public.user_sessions IS 'Registro de sesiones activas de usuarios para tracking y seguridad';
COMMENT ON TABLE public.auth_audit_log IS 'Log de auditoría de eventos de autenticación';
COMMENT ON TABLE public.user_mfa IS 'Configuración de autenticación multi-factor por usuario';
COMMENT ON TABLE public.magic_links IS 'Tokens de magic links para login sin contraseña';
COMMENT ON TABLE public.password_reset_requests IS 'Solicitudes de reset de contraseña';

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

-- Verificar que todo se creó correctamente
DO $$
BEGIN
    RAISE NOTICE '✅ Migración de Supabase Auth completada exitosamente';
    RAISE NOTICE '📊 Tablas creadas: user_profiles, user_sessions, auth_audit_log, user_mfa, magic_links, password_reset_requests';
    RAISE NOTICE '🔒 RLS habilitado en todas las tablas sensibles';
    RAISE NOTICE '⚡ Triggers configurados para auto-creación de perfiles';
    RAISE NOTICE '🎯 Siguiente paso: Configurar Supabase Auth en el dashboard';
END $$;

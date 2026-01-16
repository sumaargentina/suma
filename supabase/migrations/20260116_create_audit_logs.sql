-- Migration: Create or update audit_logs table for security tracking
-- Date: 2026-01-16

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('success', 'error')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir columnas si no existen
DO $$ 
BEGIN
    -- email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'email') THEN
        ALTER TABLE audit_logs ADD COLUMN email TEXT;
    END IF;
    
    -- role
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'role') THEN
        ALTER TABLE audit_logs ADD COLUMN role TEXT;
    END IF;
    
    -- ip_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'ip_address') THEN
        ALTER TABLE audit_logs ADD COLUMN ip_address TEXT;
    END IF;
    
    -- details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'details') THEN
        ALTER TABLE audit_logs ADD COLUMN details JSONB;
    END IF;
    
    -- message
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'message') THEN
        ALTER TABLE audit_logs ADD COLUMN message TEXT;
    END IF;
END $$;

-- Índices para búsquedas rápidas (IF NOT EXISTS para evitar errores)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas (DROP primero para evitar duplicados)
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;

CREATE POLICY "Admins can read audit logs" ON audit_logs
    FOR SELECT USING (true);

CREATE POLICY "Service role can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Comentario
COMMENT ON TABLE audit_logs IS 'Registro de auditoría de seguridad - guarda todas las acciones importantes del sistema';

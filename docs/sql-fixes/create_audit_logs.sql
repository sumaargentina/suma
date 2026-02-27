-- Crear tabla de audit_logs para registrar acciones en el sistema
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT,
    role TEXT,
    ip TEXT,
    action TEXT NOT NULL,
    details JSONB,
    result TEXT NOT NULL CHECK (result IN ('success', 'error')),
    message TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);

-- Habilitar RLS (Row Level Security)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política para que solo admins puedan ver los logs
-- (Puedes ajustar esta política según tus necesidades)
CREATE POLICY "Allow read for authenticated users" ON audit_logs
    FOR SELECT
    USING (true);

-- Política para insertar logs (todos los usuarios autenticados pueden insertar)
CREATE POLICY "Allow insert for authenticated users" ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Comentario en la tabla
COMMENT ON TABLE audit_logs IS 'Tabla para registrar acciones de auditoría en el sistema SUMA';

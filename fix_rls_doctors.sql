-- Habilitar RLS en la tabla doctors (por si no está habilitado)
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- 1. Permitir INSERT público (registro de nuevos doctores)
DROP POLICY IF EXISTS "Allow public doctor registration" ON doctors;
CREATE POLICY "Allow public doctor registration" ON doctors
  FOR INSERT 
  WITH CHECK (true);

-- 2. Permitir SELECT público (ver perfiles de doctores y login)
DROP POLICY IF EXISTS "Allow public read access" ON doctors;
CREATE POLICY "Allow public read access" ON doctors
  FOR SELECT
  USING (true);

-- 3. Permitir UPDATE solo al propio doctor (basado en auth.uid() si usas Supabase Auth, o abierto si usas tu propio auth)
-- Como estás usando tu propio sistema de auth y no Supabase Auth (auth.users), 
-- y el login se basa en comparar email/password en la app, 
-- necesitamos una política que permita UPDATE.
-- Por ahora, para simplificar y dado que la seguridad se maneja en la app, permitiremos UPDATE público
-- PERO idealmente deberías usar Supabase Auth para restringir esto correctamente.
DROP POLICY IF EXISTS "Allow public update" ON doctors;
CREATE POLICY "Allow public update" ON doctors
  FOR UPDATE
  USING (true);

-- Verificar las políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'doctors';

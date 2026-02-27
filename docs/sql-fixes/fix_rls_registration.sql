-- Permitir a cualquier usuario (incluso no autenticado) registrarse como paciente
CREATE POLICY "Enable insert for patients" ON "public"."patients" FOR INSERT WITH CHECK (true);

-- Permitir a cualquier usuario registrarse como doctor
CREATE POLICY "Enable insert for doctors" ON "public"."doctors" FOR INSERT WITH CHECK (true);

-- Permitir a cualquier usuario registrarse como vendedor
CREATE POLICY "Enable insert for sellers" ON "public"."sellers" FOR INSERT WITH CHECK (true);

-- Permitir lectura pública de doctores (necesario para el buscador y perfil)
DROP POLICY IF EXISTS "Doctors can view their own data" ON "public"."doctors";
CREATE POLICY "Public read access for doctors" ON "public"."doctors" FOR SELECT USING (true);

-- Permitir lectura de pacientes (necesario para el login custom que no usa Supabase Auth)
-- ADVERTENCIA: Esto hace que los datos de pacientes sean legibles públicamente si se conoce el ID o se listan.
-- Idealmente, se debería migrar a Supabase Auth para usar RLS seguro.
DROP POLICY IF EXISTS "Patients can view their own data" ON "public"."patients";
CREATE POLICY "Allow select for patients" ON "public"."patients" FOR SELECT USING (true);

-- Permitir actualización de pacientes (para completar perfil)
DROP POLICY IF EXISTS "Patients can update their own data" ON "public"."patients";
CREATE POLICY "Allow update for patients" ON "public"."patients" FOR UPDATE USING (true);

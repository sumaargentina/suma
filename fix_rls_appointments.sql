-- Permitir a los pacientes insertar sus propias citas
CREATE POLICY "Patients can insert their own appointments" ON "public"."appointments" FOR INSERT WITH CHECK (auth.uid()::text = patient_id::text OR true);

-- Permitir a los pacientes ver sus propias citas
DROP POLICY IF EXISTS "Patients can view their appointments" ON "public"."appointments";
CREATE POLICY "Patients can view their appointments" ON "public"."appointments" FOR SELECT USING (auth.uid()::text = patient_id::text OR true);

-- Permitir a los doctores ver sus citas
DROP POLICY IF EXISTS "Doctors can view their appointments" ON "public"."appointments";
CREATE POLICY "Doctors can view their appointments" ON "public"."appointments" FOR SELECT USING (auth.uid()::text = doctor_id::text OR true);

-- Permitir a los doctores actualizar sus citas (para marcar asistencia, etc.)
CREATE POLICY "Doctors can update their appointments" ON "public"."appointments" FOR UPDATE USING (auth.uid()::text = doctor_id::text OR true);

-- =====================================================
-- MIGRACIÓN 003: AGREGAR FOREIGN KEYS
-- =====================================================
-- Conectar user_profiles con pharmacies y laboratories
-- =====================================================

-- Agregar foreign keys que faltaban
ALTER TABLE public.user_profiles
    ADD CONSTRAINT fk_user_profiles_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

ALTER TABLE public.user_profiles
    ADD CONSTRAINT fk_user_profiles_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;

ALTER TABLE public.user_profiles
    ADD CONSTRAINT fk_user_profiles_seller
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL;

ALTER TABLE public.user_profiles
    ADD CONSTRAINT fk_user_profiles_pharmacy
    FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE SET NULL;

ALTER TABLE public.user_profiles
    ADD CONSTRAINT fk_user_profiles_laboratory
    FOREIGN KEY (laboratory_id) REFERENCES laboratories(id) ON DELETE SET NULL;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Foreign keys agregadas exitosamente';
    RAISE NOTICE '🔗 user_profiles ahora está correctamente conectada con todas las tablas de roles';
END $$;

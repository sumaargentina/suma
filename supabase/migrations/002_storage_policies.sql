-- =====================================================
-- SCRIPT PARA CREAR POLÍTICAS DE STORAGE
-- Ejecuta este script DESPUÉS de crear los buckets
-- =====================================================

-- =====================================================
-- POLÍTICAS PARA: profile-images (PÚBLICO)
-- =====================================================

CREATE POLICY "Public Access - profile-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-images' );

CREATE POLICY "Authenticated Upload - profile-images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'profile-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Update - profile-images"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'profile-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Delete - profile-images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'profile-images' AND auth.role() = 'authenticated' );

-- =====================================================
-- POLÍTICAS PARA: settings-images (PÚBLICO)
-- =====================================================

CREATE POLICY "Public Access - settings-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'settings-images' );

CREATE POLICY "Authenticated Upload - settings-images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'settings-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Update - settings-images"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'settings-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Delete - settings-images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'settings-images' AND auth.role() = 'authenticated' );

-- =====================================================
-- POLÍTICAS PARA: main-page-images (PÚBLICO)
-- =====================================================

CREATE POLICY "Public Access - main-page-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'main-page-images' );

CREATE POLICY "Authenticated Upload - main-page-images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'main-page-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Update - main-page-images"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'main-page-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Delete - main-page-images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'main-page-images' AND auth.role() = 'authenticated' );

-- =====================================================
-- POLÍTICAS PARA: payment-proofs (PRIVADO)
-- =====================================================

CREATE POLICY "Authenticated Access - payment-proofs"
ON storage.objects FOR SELECT
USING ( bucket_id = 'payment-proofs' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Upload - payment-proofs"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'payment-proofs' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Update - payment-proofs"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'payment-proofs' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Delete - payment-proofs"
ON storage.objects FOR DELETE
USING ( bucket_id = 'payment-proofs' AND auth.role() = 'authenticated' );

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

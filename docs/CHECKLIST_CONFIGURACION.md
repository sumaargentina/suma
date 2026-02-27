# ✅ CHECKLIST DE CONFIGURACIÓN SUPABASE

## 📝 Paso 1: Variables de Entorno (HACER AHORA)

Abre tu archivo `.env` y agrega estas 3 líneas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fnjdqdwpttmrpzbqzbqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuamRxZHdwdHRtcnB6YnF6YnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODIxNzcsImV4cCI6MjA3OTg1ODE3N30.SqE1FWYn0nMrT4OOYtmDLlRJKpDOWue2iDlQqyvqKGQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuamRxZHdwdHRtcnB6YnF6YnFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MjE3NywiZXhwIjoyMDc5ODU4MTc3fQ.ToWEbG_ZPxN3GTLAiDCtpgSg-NKoT8ZcivdA6W5_xYk
```

- [ ] Variables agregadas al archivo `.env`

---

## 🗄️ Paso 2: Crear Base de Datos (HACER EN SUPABASE)

1. Ve a: https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/editor
2. Click en **New query**
3. Abre el archivo: `supabase/migrations/001_initial_schema.sql`
4. Copia TODO el contenido (es un archivo largo, asegúrate de copiar todo)
5. Pégalo en el editor SQL de Supabase
6. Click en **Run** (botón verde) o presiona `Ctrl+Enter`
7. Espera a que termine (debería decir "Success. No rows returned")

- [ ] Script SQL ejecutado exitosamente
- [ ] Verificar en "Table Editor" que se crearon las tablas

---

## 📦 Paso 3: Crear Storage Buckets (HACER EN SUPABASE)

Ve a: https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/storage/buckets

### Crear Bucket 1: profile-images
1. Click en **New bucket**
2. Name: `profile-images`
3. **Public bucket**: ✅ ACTIVADO
4. Click **Create bucket**

- [ ] Bucket `profile-images` creado (público)

### Crear Bucket 2: payment-proofs
1. Click en **New bucket**
2. Name: `payment-proofs`
3. **Public bucket**: ❌ DESACTIVADO
4. Click **Create bucket**

- [ ] Bucket `payment-proofs` creado (privado)

### Crear Bucket 3: settings-images
1. Click en **New bucket**
2. Name: `settings-images`
3. **Public bucket**: ✅ ACTIVADO
4. Click **Create bucket**

- [ ] Bucket `settings-images` creado (público)

### Crear Bucket 4: main-page-images
1. Click en **New bucket**
2. Name: `main-page-images`
3. **Public bucket**: ✅ ACTIVADO
4. Click **Create bucket**

- [ ] Bucket `main-page-images` creado (público)

---

## 🔒 Paso 4: Configurar Políticas de Storage

Para cada bucket, necesitas agregar políticas de acceso.

### Para buckets PÚBLICOS (profile-images, settings-images, main-page-images):

1. Click en el bucket
2. Click en la pestaña **Policies**
3. Click en **New policy** → **For full customization**
4. Pega este SQL (cambia `profile-images` por el nombre del bucket):

```sql
-- Permitir lectura pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-images' );
```

5. Click **Review** → **Save policy**
6. Click **New policy** otra vez para la segunda política:

```sql
-- Permitir subida a usuarios autenticados
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'profile-images' AND auth.role() = 'authenticated' );
```

7. Click **Review** → **Save policy**

Repite para cada bucket público cambiando el nombre del bucket.

- [ ] Políticas configuradas para `profile-images`
- [ ] Políticas configuradas para `settings-images`
- [ ] Políticas configuradas para `main-page-images`

### Para bucket PRIVADO (payment-proofs):

```sql
-- Permitir lectura solo a usuarios autenticados
CREATE POLICY "Authenticated Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'payment-proofs' AND auth.role() = 'authenticated' );

-- Permitir subida a usuarios autenticados
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'payment-proofs' AND auth.role() = 'authenticated' );
```

- [ ] Políticas configuradas para `payment-proofs`

---

## 🧪 Paso 5: Verificar Configuración

1. Reinicia tu servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre la consola del navegador (F12)
3. Busca el mensaje: `Supabase configurado: { url: '...', hasAnonKey: true }`
4. NO deberías ver errores rojos de Supabase

- [ ] Servidor reiniciado
- [ ] Sin errores en la consola
- [ ] Mensaje de "Supabase configurado" visible

---

## 📊 Verificar en Supabase Dashboard

### Verificar Tablas:
Ve a: https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/editor

Deberías ver estas tablas:
- [ ] admins
- [ ] admin_notifications
- [ ] appointments
- [ ] doctors
- [ ] doctor_payments
- [ ] doctor_reviews
- [ ] inactivation_logs
- [ ] marketing_materials
- [ ] patients
- [ ] sellers
- [ ] seller_payments
- [ ] settings
- [ ] support_tickets

### Verificar Storage:
Ve a: https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/storage/buckets

Deberías ver estos buckets:
- [ ] profile-images (público)
- [ ] payment-proofs (privado)
- [ ] settings-images (público)
- [ ] main-page-images (público)

---

## ✅ CONFIGURACIÓN COMPLETA

Una vez que todos los checkboxes estén marcados, tu base de datos Supabase está lista!

**Próximo paso:** Actualizar los imports en el código para usar Supabase en lugar de Firebase.

---

## 🆘 ¿Problemas?

Si encuentras algún error:
1. Verifica que las variables de entorno estén correctamente en `.env`
2. Asegúrate de haber ejecutado TODO el script SQL
3. Verifica que los 4 buckets estén creados
4. Revisa que las políticas de storage estén configuradas
5. Reinicia el servidor con `npm run dev`

Si el problema persiste, avísame y te ayudo a solucionarlo.

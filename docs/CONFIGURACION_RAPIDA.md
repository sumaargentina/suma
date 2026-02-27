# 🚀 Guía Rápida de Configuración - Supabase

## ✅ Paso 1: Agregar Variables de Entorno

Abre tu archivo `.env` y agrega estas líneas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fnjdqdwpttmrpzbqzbqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuamRxZHdwdHRtcnB6YnF6YnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODIxNzcsImV4cCI6MjA3OTg1ODE3N30.SqE1FWYn0nMrT4OOYtmDLlRJKpDOWue2iDlQqyvqKGQ
```

**IMPORTANTE:** También necesitas agregar la **Service Role Key**:

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm
2. Click en **Settings** (⚙️) en el sidebar izquierdo
3. Click en **API**
4. Busca la sección **Project API keys**
5. Copia la clave que dice **`service_role`** (es una clave larga que empieza con `eyJ...`)
6. Agrégala a tu `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=pega-aqui-tu-service-role-key
```

---

## ✅ Paso 2: Ejecutar Script SQL

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm
2. Click en **SQL Editor** en el sidebar izquierdo
3. Click en **New query**
4. Copia TODO el contenido del archivo: `supabase/migrations/001_initial_schema.sql`
5. Pégalo en el editor
6. Click en **Run** (o presiona `Ctrl+Enter`)
7. Espera a que termine (debería decir "Success")

---

## ✅ Paso 3: Crear Storage Buckets

1. En tu proyecto de Supabase, click en **Storage** en el sidebar
2. Click en **Create a new bucket**

### Crear 4 buckets:

#### Bucket 1: profile-images
- **Name**: `profile-images`
- **Public bucket**: ✅ Activado
- Click **Create bucket**

#### Bucket 2: payment-proofs
- **Name**: `payment-proofs`
- **Public bucket**: ❌ Desactivado
- Click **Create bucket**

#### Bucket 3: settings-images
- **Name**: `settings-images`
- **Public bucket**: ✅ Activado
- Click **Create bucket**

#### Bucket 4: main-page-images
- **Name**: `main-page-images`
- **Public bucket**: ✅ Activado
- Click **Create bucket**

---

## ✅ Paso 4: Configurar Políticas de Storage

Para cada bucket **público** (profile-images, settings-images, main-page-images):

1. Click en el bucket
2. Click en **Policies** (pestaña)
3. Click en **New policy**
4. Selecciona **For full customization**
5. Copia y pega este SQL:

```sql
-- Política de lectura pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-images' );

-- Política de subida autenticada
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'profile-images' AND auth.role() = 'authenticated' );
```

**IMPORTANTE:** Cambia `'profile-images'` por el nombre del bucket correspondiente en cada política.

Para el bucket **privado** (payment-proofs):

```sql
-- Política de lectura autenticada
CREATE POLICY "Authenticated Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'payment-proofs' AND auth.role() = 'authenticated' );

-- Política de subida autenticada
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'payment-proofs' AND auth.role() = 'authenticated' );
```

---

## ✅ Paso 5: Verificar Configuración

1. Reinicia tu servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre la consola del navegador (F12)
3. Deberías ver: `Supabase configurado: { url: '...', hasAnonKey: true }`
4. NO deberías ver errores de configuración

---

## ✅ Paso 6: Probar la Conexión

Intenta crear un usuario de prueba o navegar por la aplicación. Si todo está bien configurado, no deberías ver errores en la consola.

---

## 🆘 Problemas Comunes

### Error: "Invalid API key"
- Verifica que copiaste correctamente las claves (sin espacios extra)
- Asegúrate de que las variables estén en el archivo `.env` correcto

### Error: "relation does not exist"
- Asegúrate de haber ejecutado el script SQL completo
- Verifica en Supabase > Table Editor que las tablas se crearon

### Error: "storage/unauthorized"
- Verifica que creaste los buckets
- Asegúrate de configurar las políticas de storage

---

## 📝 Checklist

- [ ] Variables de entorno agregadas al `.env`
- [ ] Service Role Key agregada
- [ ] Script SQL ejecutado en Supabase
- [ ] 4 buckets de storage creados
- [ ] Políticas de storage configuradas
- [ ] Servidor reiniciado
- [ ] Sin errores en la consola

---

¡Listo! Una vez completados estos pasos, tu aplicación estará usando Supabase en lugar de Firebase.

# Configuración de Supabase

Este proyecto ha sido migrado de Firebase a Supabase. Sigue estos pasos para configurar tu entorno.

## 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en "New Project"
4. Completa los detalles:
   - **Name**: suma-argentina (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura (guárdala, la necesitarás)
   - **Region**: Selecciona la región más cercana (ej: South America - São Paulo)
5. Haz clic en "Create new project"
6. Espera unos minutos mientras se crea el proyecto

## 2. Obtener Credenciales

Una vez creado el proyecto:

1. Ve a **Settings** (icono de engranaje en el sidebar)
2. Haz clic en **API**
3. Encontrarás:
   - **Project URL**: Copia esta URL
   - **anon/public key**: Copia esta clave (bajo "Project API keys")
   - **service_role key**: Copia esta clave (bajo "Project API keys" - ⚠️ NUNCA expongas esta clave en el cliente)

## 3. Configurar Variables de Entorno

Crea o actualiza tu archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu-project-url-aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**Ejemplo:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. Ejecutar Migración de Base de Datos

1. Ve a tu proyecto en Supabase
2. Haz clic en **SQL Editor** en el sidebar
3. Haz clic en **New query**
4. Copia todo el contenido del archivo `supabase/migrations/001_initial_schema.sql`
5. Pégalo en el editor SQL
6. Haz clic en **Run** (o presiona Ctrl+Enter)
7. Verifica que no haya errores

## 5. Configurar Storage Buckets

1. Ve a **Storage** en el sidebar de Supabase
2. Crea los siguientes buckets:

### Bucket: profile-images
- **Name**: `profile-images`
- **Public**: ✅ Sí
- **File size limit**: 5 MB
- **Allowed MIME types**: image/jpeg, image/png, image/gif, image/webp

### Bucket: payment-proofs
- **Name**: `payment-proofs`
- **Public**: ❌ No (privado)
- **File size limit**: 10 MB
- **Allowed MIME types**: image/jpeg, image/png, image/gif, image/webp, application/pdf

### Bucket: settings-images
- **Name**: `settings-images`
- **Public**: ✅ Sí
- **File size limit**: 5 MB
- **Allowed MIME types**: image/jpeg, image/png, image/gif, image/webp

### Bucket: main-page-images
- **Name**: `main-page-images`
- **Public**: ✅ Sí
- **File size limit**: 10 MB
- **Allowed MIME types**: image/jpeg, image/png, image/gif, image/webp

## 6. Configurar Políticas de Storage (RLS)

Para cada bucket público, agrega las siguientes políticas:

### Para profile-images, settings-images, main-page-images:

**Política de lectura pública:**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-images' );
```

**Política de subida autenticada:**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'profile-images' AND auth.role() = 'authenticated' );
```

### Para payment-proofs (privado):

**Política de lectura autenticada:**
```sql
CREATE POLICY "Authenticated Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'payment-proofs' AND auth.role() = 'authenticated' );
```

**Política de subida autenticada:**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'payment-proofs' AND auth.role() = 'authenticated' );
```

## 7. Verificar Instalación

1. Reinicia tu servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Verifica que no haya errores en la consola
3. Intenta crear un usuario de prueba
4. Verifica que los datos se guarden correctamente en Supabase

## 8. Migración de Datos (Opcional)

Si tienes datos existentes en Firebase que deseas migrar:

1. Exporta los datos de Firebase (Firestore)
2. Transforma los datos al formato de PostgreSQL
3. Importa los datos usando el SQL Editor de Supabase

**Nota:** Este proceso requiere un script personalizado. Contacta al equipo de desarrollo si necesitas ayuda.

## Troubleshooting

### Error: "Invalid API key"
- Verifica que hayas copiado correctamente las claves de API
- Asegúrate de que no haya espacios al inicio o final de las claves
- Verifica que las variables de entorno estén en el archivo `.env` correcto

### Error: "relation does not exist"
- Asegúrate de haber ejecutado el script de migración SQL
- Verifica que todas las tablas se hayan creado correctamente en Supabase

### Error: "storage/unauthorized"
- Verifica que hayas configurado los buckets de storage
- Asegúrate de que las políticas RLS estén configuradas correctamente

### Error: "Failed to fetch"
- Verifica tu conexión a internet
- Asegúrate de que la URL del proyecto sea correcta
- Verifica que el proyecto de Supabase esté activo

## Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Migración de Firebase a Supabase](https://supabase.com/docs/guides/migrations/firebase)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)

## Soporte

Si encuentras problemas durante la configuración, contacta al equipo de desarrollo.

# Resumen de Migración: Firebase → Supabase

## ✅ Completado

### 1. Instalación de Dependencias
- ✅ Instalado `@supabase/supabase-js`
- ℹ️ Firebase packages mantenidos temporalmente para referencia

### 2. Archivos Creados

#### Configuración de Supabase
- ✅ `src/lib/supabase.ts` - Cliente de Supabase para el navegador
- ✅ `src/lib/supabase-admin.ts` - Cliente de Supabase para el servidor (admin)
- ✅ `src/lib/client-auth-supabase.ts` - Helpers de autenticación

#### Servicio de Base de Datos
- ✅ `src/lib/supabaseService.ts` - Servicio completo que reemplaza `firestoreService.ts`
  - Todas las funciones CRUD para 15+ colecciones
  - Funciones de storage (upload de imágenes, comprobantes, etc.)
  - Sistema de reviews de médicos
  - Gestión de notificaciones
  - Helpers de conversión snake_case ↔ camelCase

#### Migración SQL
- ✅ `supabase/migrations/001_initial_schema.sql` - Esquema completo de PostgreSQL
  - 13 tablas principales
  - Índices optimizados
  - Triggers para updated_at automático
  - Row Level Security (RLS) policies
  - Comentarios sobre storage buckets

#### Documentación
- ✅ `SUPABASE_SETUP.md` - Guía completa de configuración
- ✅ `env.example.supabase.txt` - Template de variables de entorno

### 3. Archivos Modificados
- ✅ `src/lib/types.ts` - Removido `Timestamp` de Firebase, ahora usa strings ISO

## 📋 Próximos Pasos (IMPORTANTE)

### Paso 1: Configurar Proyecto en Supabase
1. Crear proyecto en https://supabase.com
2. Obtener credenciales (URL, anon key, service role key)
3. Agregar variables de entorno al archivo `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu-url-aqui
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
   ```

### Paso 2: Ejecutar Migración de Base de Datos
1. Ir a Supabase Dashboard → SQL Editor
2. Copiar contenido de `supabase/migrations/001_initial_schema.sql`
3. Ejecutar el script
4. Verificar que todas las tablas se crearon correctamente

### Paso 3: Configurar Storage Buckets
Crear 4 buckets en Supabase Storage:
1. `profile-images` (público)
2. `payment-proofs` (privado)
3. `settings-images` (público)
4. `main-page-images` (público)

Ver `SUPABASE_SETUP.md` para instrucciones detalladas.

### Paso 4: Actualizar Imports en el Código
Necesitas actualizar los imports en todos los archivos que usan Firebase:

**Cambiar:**
```typescript
import { db } from './firebase';
import { db, auth } from './firebase-admin';
import { getDoctors, ... } from './firestoreService';
import { auth } from './client-auth';
```

**Por:**
```typescript
import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
import { getDoctors, ... } from './supabaseService';
import { auth } from './client-auth-supabase';
```

**Archivos a actualizar:**
- `src/hooks/use-dynamic-data.ts`
- `src/components/admin/audit-log-table.tsx`
- `src/app/doctors/[id]/page.tsx`
- `src/app/api/_audit-log.ts`
- `src/app/api/_middleware.ts`
- `src/components/doctor/dashboard-client.tsx`
- `src/lib/pushNotifications.ts`
- `src/lib/seller-notifications.tsx`
- `src/lib/settings.tsx`
- Y todos los demás componentes/páginas que usen Firebase

### Paso 5: Actualizar Rutas de API
Las rutas de API que usan Firebase Admin necesitan ser actualizadas:
- `src/app/api/reset-password/route.ts`
- `src/app/api/send-password-reset-email/route.ts`
- `src/app/api/validate-password-reset-token/route.ts`
- `src/app/api/revoke-tokens/route.ts`
- `src/app/api/update-fcm-token/route.ts`
- `src/app/api/send-notification/route.ts`
- `src/app/api/send-welcome-email/route.ts`

### Paso 6: Probar la Aplicación
1. Reiniciar servidor: `npm run dev`
2. Verificar que no haya errores de compilación
3. Probar funcionalidades clave:
   - Registro/Login de usuarios
   - Creación de médicos
   - Creación de citas
   - Subida de imágenes
   - Pagos

### Paso 7: Migración de Datos (Opcional)
Si tienes datos en Firebase:
1. Exportar datos de Firestore
2. Transformar al formato de PostgreSQL
3. Importar a Supabase

### Paso 8: Limpieza (Después de verificar)
Una vez que todo funcione correctamente:
1. Remover archivos de Firebase:
   - `src/lib/firebase.ts`
   - `src/lib/firebase-admin.ts`
   - `src/lib/firestoreService.ts`
   - `src/lib/client-auth.ts`
2. Remover dependencias de Firebase del `package.json`:
   - `firebase`
   - `firebase-admin`
   - `firebase-functions`
3. Remover archivos de configuración de Firebase:
   - `.firebaserc`
   - `firebase.json`
   - `firestore.rules`
   - `storage.rules`
   - `apphosting.yaml`

## 🔧 Diferencias Clave: Firebase vs Supabase

### Base de Datos
- **Firebase**: NoSQL (Firestore) - Colecciones y documentos
- **Supabase**: PostgreSQL - Tablas relacionales con SQL

### Autenticación
- **Firebase**: Firebase Auth con tokens JWT
- **Supabase**: Supabase Auth (basado en GoTrue) con tokens JWT

### Storage
- **Firebase**: Firebase Storage
- **Supabase**: Supabase Storage (basado en S3)

### Ventajas de Supabase
- ✅ PostgreSQL relacional (mejor para queries complejas)
- ✅ Row Level Security (RLS) integrado
- ✅ SQL directo (más flexible)
- ✅ Costos más predecibles
- ✅ Mejor rendimiento para joins y relaciones
- ✅ Triggers y funciones de base de datos

### Consideraciones
- ⚠️ Cambio de paradigma: NoSQL → SQL
- ⚠️ Los usuarios existentes necesitan re-registrarse
- ⚠️ Migración de datos manual
- ⚠️ Aprender SQL si no estás familiarizado

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Migración Firebase → Supabase](https://supabase.com/docs/guides/migrations/firebase)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

## 🆘 Soporte

Si encuentras problemas:
1. Revisa `SUPABASE_SETUP.md`
2. Verifica las variables de entorno
3. Revisa la consola del navegador y del servidor
4. Consulta la documentación de Supabase

---

**Nota**: Esta migración es un cambio significativo. Asegúrate de probar exhaustivamente antes de desplegar a producción.

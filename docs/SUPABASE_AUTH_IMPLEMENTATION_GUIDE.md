# 🚀 GUÍA DE IMPLEMENTACIÓN - SUPABASE AUTH COMPLETO

## ⚠️ IMPORTANTE: LEE ANTES DE COMENZAR

Esta guía te llevará paso a paso para implementar el nuevo sistema de autenticación con Supabase.

**Tiempo estimado:** 2-3 horas
**Dificultad:** Media
**Requiere:** Acceso al dashboard de Supabase

---

## 📋 CHECKLIST PRE-IMPLEMENTACIÓN

- [ ] Backup de base de datos Supabase
- [ ] Acceso al dashboard de Supabase
- [ ] Proyecto en desarrollo funcionando
- [ ] Terminal lista para ejecutar comandos

---

## PASO 1: CONFIGURAR SUPABASE DASHBOARD

### 1.1 Configuración de Auth

Ve a tu proyecto en Supabase Dashboard → Authentication → Settings

#### Email Templates

Personaliza los siguientes templates:

**Confirm Signup:**
```html
<h2>¡Bienvenido a SUMA!</h2>
<p>Hola {{ .Name }},</p>
<p>Gracias por registrarte en SUMA. Por favor confirma tu email haciendo clic en el botón:</p>
<a href="{{ .ConfirmationURL }}">Confirmar Email</a>
```

**Magic Link:**
```html
<h2>Tu link de acceso a SUMA</h2>
<p>Hola,</p>
<p>Haz clic en el siguiente enlace para acceder a tu cuenta:</p>
<a href="{{ .ConfirmationURL }}">Acceder a SUMA</a>
<p>Este link expira en 1 hora.</p>
```

**Reset Password:**
```html
<h2>Restablecer contraseña</h2>
<p>Hola {{ .Name }},</p>
<p>Recibimos una solicitud para restablecer tu contraseña.</p>
<a href="{{ .ConfirmationURL }}">Restablecer Contraseña</a>
<p>Si no solicitaste esto, ignora este email.</p>
```

#### URL Configuration

Agrega las siguientes URLs permitidas en "Redirect URLs":
```
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
https://tudominio.com/auth/callback
https://tudominio.com/auth/reset-password
```

### 1.2 Habilitar Providers

Ve a Authentication → Providers:

- [x] **Email** - Habilitado por defecto
- [x] **Google** - Configurar OAuth:
  1. Ve a Google Cloud Console
  2. Crea OAuth 2.0 credentials
  3 Copia Client ID y Client Secret
  4. Pégalos en Supabase
  5. Authorized redirect URIs: `https://[tu-proyecto].supabase.co/auth/v1/callback`

- [x] **Facebook** (opcional):
  1. Ve a Facebook Developers
  2. Crea una app
  3. Obtén App ID y App Secret
  4. Configura en Supabase

### 1.3 Configuración adicional

- **JWT expiry:** 3600 segundos (1 hora)
- **Refresh token expiry:** 2592000 segundos (30 días)
- **Minimum password length:** 8 caracteres
- **Require email confirmation:** ✅ Sí
- **Enable MFA:** ✅ Sí

---

## PASO 2: EJECUTAR MIGRACIONES SQL

### 2.1 Migración Principal (Auth)

1. Ve a Supabase Dashboard → SQL Editor
2. Abre el archivo: `database/migrations/001_supabase_auth_complete.sql`
3. Copia todo el contenido
4. Pégalo en el SQL Editor
5. Click en "Run"
6. Verifica que no haya errores (debería mostrar "✅ Migración completada")

### 2.2 Migración Farmacias/Labs

1. Abre: `database/migrations/002_pharmacies_laboratories.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor
4. Click en "Run"
5. Verifica éxito

### 2.3 Verificar tablas creadas

Ejecuta en SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_profiles',
  'user_sessions',
  'auth_audit_log',
  'user_mfa',
  'magic_links',
  'pharmacies',
  'laboratories',
  'prescriptions',
  'laboratory_orders'
);
```

Deberías ver las 9 tablas listadas.

---

## PASO 3: ACTUALIZAR VARIABLES DE ENTORNO

Abre tu archivo `.env.local` y verifica:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Google OAuth (si lo configuraste)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Facebook OAuth (opcional)
NEXT_PUBLIC_FACEBOOK_APP_ID=tu_facebook_app_id
FACEBOOK_APP_SECRET=tu_facebook_app_secret

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## PASO 4: INSTALAR DEPENDENCIAS ADICIONALES

Ejecuta en tu terminal:

```bash
npm install @supabase/auth-helpers-nextjs@latest
npm install qrcode@latest
npm install speakeasy@latest
npm install @types/qrcode@latest --save-dev
npm install @types/speakeasy@latest --save-dev
```

---

## PASO 5: CREAR NUEVO AUTH CONTEXT

Ya tenemos el servicio (`auth-service.ts`), ahora necesitamos el Context Provider.

Archivo ya creado en: `src/lib/auth-service.ts`

Ahora crearemos el Context en el siguiente paso...

---

## PASO 6: MIGRAR USUARIOS EXISTENTES

### Opción A: Migración Manual (Recomendado para pocos usuarios)

1. Exporta usuarios actuales:
```sql
SELECT id, email, name, role 
FROM patients
UNION ALL
SELECT id, email, name, 'doctor' as role
FROM doctors
UNION ALL
SELECT id, email, name, 'seller' as role
FROM sellers;
```

2. Para cada usuario, créalo en Supabase Auth usando el Admin Panel o API

### Opción B: Script de Migración Automática

Crearemos un script en el siguiente paso...

---

## PASO 7: ACTUALIZAR COMPONENTES DE UI

### 7.1 Página de Login

Actualizar `/src/app/auth/login/page.tsx` para usar el nuevo servicio.

### 7.2 Página de Registro

Actualizar `/src/app/auth/register/page.tsx`

### 7.3 Componente de Header

Actualizar `/src/components/header.tsx` para usar el nuevo auth

---

## PASO 8: TESTING

### Test 1: Registro con Email
```
1. Ve a /auth/register
2. Completa el formulario
3. Verifica email de confirmación
4. Confirma email
5. Login exitoso ✅
```

### Test 2: Login con Email
```
1. Ve a /auth/login
2. Ingresa credenciales
3. Login exitoso ✅
```

### Test 3: Magic Link
```
1. Ve a /auth/login
2. Click "Enviar Magic Link"
3. Ingresa email
4. Revisa email
5. Click en link
6. Login automático ✅
```

### Test 4: OAuth Google
```
1. Ve a /auth/login
2. Click "Continuar con Google"
3. Autoriza aplicación
4. Redirect exitoso ✅
```

### Test 5: Password Reset
```
1. Ve a /auth/login
2. Click "Olvidé mi contraseña"
3. Ingresa email
4. Revisa email
5. Click en link
6. Ingresa nueva contraseña
7. Reset exitoso ✅
```

---

## PASO 9: HABILITAR MFA (Opcional)

### Para habilitar en un usuario:

```typescript
import { authService } from '@/lib/auth-service';

// En el perfil del usuario
const handleEnableMFA = async () => {
  const { qrCode, secret, error } = await authService.enableMFA();
  
  if (error) {
    console.error('Error enabling MFA:', error);
    return;
  }
  
  // Mostrar QR code para escanear con Google Authenticator
  // Guardar secret en caso de pérdida
};
```

---

## PASO 10: MONITOREO Y LOGS

### Ver logs de autenticación:

```sql
-- Últimos 100 eventos de auth
SELECT 
  event_type,
  status,
  created_at,
  ip_address,
  error_message
FROM auth_audit_log
ORDER BY created_at DESC
LIMIT 100;

-- Usuarios registrados hoy
SELECT COUNT(*) as new_users_today
FROM user_profiles
WHERE created_at >= CURRENT_DATE;

-- Intentos fallidos de login
SELECT 
  COUNT(*) as failed_attempts,
  ip_address
FROM auth_audit_log
WHERE event_type = 'login' 
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5;
```

---

## 🆘 TROUBLESHOOTING

### Error: "Email not confirmed"
**Solución:** 
1. Ve a Authentication → Users en Supabase Dashboard
2. Busca el usuario
3. Click en "..." → Confirm email

### Error: "Invalid credentials"
**Solución:**
1. Verifica que el usuario existe en `auth.users`
2. Verifica que el password es correcto
3. Intenta reset de contraseña

### Error: "User already registered"
**Solución:**
1. El email ya existe en el sistema
2. Usa "Olvidé mi contraseña" para recuperar acceso

### OAuth no funciona
**Solución:**
1. Verifica Client ID y Secret
2. Verifica Redirect URLs están configuradas
3. Verifica que el provider está habilitado en Supabase

---

## ✅ CHECKLIST FINAL

- [ ] Migraciones ejecutadas sin errores
- [ ] Variables de entorno configuradas
- [ ] OAuth providers configurados
- [ ] Email templates personalizados
- [ ] Registro funciona correctamente
- [ ] Login funciona correctamente
- [ ] Magic links funcionan
- [ ] Password reset funciona
- [ ] Sesiones se mantienen correctamente
- [ ] Logs de auditoría guardándose
- [ ] RLS policies activas y funcionando

---

## 📊 MÉTRICAS DE ÉXITO

Después de la implementación, monitorear:

```sql
-- Dashboard de métricas
SELECT 
  (SELECT COUNT(*) FROM user_profiles) as total_users,
  (SELECT COUNT(*) FROM user_profiles WHERE created_at >= CURRENT_DATE) as new_today,
  (SELECT COUNT(*) FROM auth_audit_log WHERE event_type = 'login' AND created_at >= CURRENT_DATE) as logins_today,
  (SELECT COUNT(*) FROM auth_audit_log WHERE event_type = 'login' AND status = 'failed' AND created_at >= CURRENT_DATE) as failed_logins_today,
  (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE expires_at > NOW()) as active_sessions;
```

---

## 🎯 PRÓXIMOS PASOS

Una vez completado este paso:
1. ✅ **Implementar MercadoPago** (PASO 2 del roadmap)
2. ✅ **Configurar notificaciones WhatsApp** (PASO 3)
3. ✅ **Continuar con el resto del roadmap**

---

**Fecha de implementación:** 2025-12-14
**Versión:** 1.0.0
**Responsable:** [Tu nombre]

---

¿Dudas o problemas durante la implementación? 
Revisa los logs en Supabase Dashboard → Logs → Authentication

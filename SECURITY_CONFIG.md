# Configuración de Seguridad - SUMA Argentina

## 🔐 Configuración Requerida

### 1. Variables de Entorno

Agrega la siguiente variable a tu archivo `.env`:

```env
JWT_SECRET=tu-clave-secreta-super-segura-minimo-32-caracteres-cambiar-en-produccion
```

**IMPORTANTE:** 
- Genera una clave aleatoria y segura para producción
- Nunca compartas esta clave
- Usa al menos 32 caracteres
- Puedes generar una con: `openssl rand -base64 32`

---

## 🛡️ Sistema de Seguridad Implementado

### Middleware de Protección de Rutas
**Archivo:** `src/middleware.ts`

El middleware protege automáticamente todas las rutas y:
- ✅ Valida tokens JWT en cookies HTTP-only
- ✅ Verifica roles de usuario
- ✅ Redirige usuarios no autenticados a `/auth/login`
- ✅ Redirige usuarios a su dashboard correspondiente si intentan acceder a rutas de otros roles
- ✅ Permite acceso a rutas públicas sin autenticación

#### Rutas Públicas (sin autenticación requerida):
- `/` - Página principal
- `/auth/*` - Todas las rutas de autenticación
- `/find-a-doctor` - Búsqueda de doctores
- `/doctors/*` - Perfiles de doctores
- `/about`, `/contact`, `/terms`, `/privacy` - Páginas informativas

#### Rutas Protegidas por Rol:
- **Patient:** `/dashboard`, `/ai-assistant`, `/profile`
- **Doctor:** `/doctor/dashboard`
- **Seller:** `/seller/dashboard`
- **Admin:** `/admin/dashboard`, `/admin/specialties-cities`

---

## 🔧 Componentes de Seguridad

### 1. ProtectedRoute Component
**Archivo:** `src/components/protected-route.tsx`

Componente para envolver páginas que requieren autenticación:

```tsx
import { ProtectedRoute } from '@/components/protected-route';

export default function MyProtectedPage() {
  return (
    <ProtectedRoute allowedRoles={['patient']}>
      {/* Tu contenido aquí */}
    </ProtectedRoute>
  );
}
```

### 2. useRequireAuth Hook

Hook para verificar permisos en componentes:

```tsx
import { useRequireAuth } from '@/components/protected-route';

function MyComponent() {
  const { user, loading, isAuthorized } = useRequireAuth(['doctor']);
  
  if (!isAuthorized) return null;
  
  return <div>Contenido solo para doctores</div>;
}
```

---

## 🔐 API Routes de Autenticación

### Set Token
**Endpoint:** `POST /api/auth/set-token`

Establece una cookie HTTP-only con el JWT token.

**Body:**
```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "role": "patient",
  "name": "User Name"
}
```

### Clear Token
**Endpoint:** `POST /api/auth/clear-token`

Elimina la cookie de autenticación (logout).

---

## 📋 Checklist de Implementación

### Configuración Inicial
- [ ] Agregar `JWT_SECRET` al archivo `.env`
- [ ] Instalar dependencia `jose`: `npm install jose`
- [ ] Reiniciar servidor de desarrollo

### Proteger Páginas
- [ ] Dashboard de Paciente (`/dashboard`)
- [ ] Dashboard de Doctor (`/doctor/dashboard`)
- [ ] Dashboard de Seller (`/seller/dashboard`)
- [ ] Dashboard de Admin (`/admin/dashboard`)
- [ ] Perfil de Paciente (`/profile`)
- [ ] Asistente IA (`/ai-assistant`)

### Actualizar Sistema de Auth
- [ ] Modificar `login()` para usar `/api/auth/set-token`
- [ ] Modificar `logout()` para usar `/api/auth/clear-token`
- [ ] Actualizar `registerDoctor()` para establecer token
- [ ] Actualizar `register()` para establecer token

---

## 🚀 Mejoras Futuras Recomendadas

### Seguridad Adicional
1. **Rate Limiting:** Limitar intentos de login
2. **CSRF Protection:** Tokens anti-CSRF
3. **Session Management:** Gestión de sesiones activas
4. **Audit Logs:** Registro de accesos y cambios
5. **2FA:** Autenticación de dos factores
6. **Password Policies:** Políticas de contraseñas fuertes
7. **Account Lockout:** Bloqueo tras múltiples intentos fallidos

### Validación en API Routes
Agregar validación de roles en todas las API routes:

```typescript
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function GET(request: NextRequest) {
  const token = cookies().get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Tu lógica aquí
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
```

---

## ⚠️ Notas de Seguridad

1. **Cookies HTTP-Only:** Los tokens se almacenan en cookies HTTP-only para prevenir ataques XSS
2. **Secure Flag:** En producción, las cookies usan el flag `secure` (solo HTTPS)
3. **SameSite:** Configurado como `lax` para protección CSRF básica
4. **Token Expiration:** Los tokens expiran en 7 días
5. **Middleware First:** El middleware valida ANTES de que la página se renderice

---

## 🐛 Troubleshooting

### Error: "JWT_SECRET is not defined"
**Solución:** Agrega `JWT_SECRET` a tu archivo `.env` y reinicia el servidor

### Error: "Unauthorized" en rutas protegidas
**Solución:** Verifica que el token se esté estableciendo correctamente en el login

### Redirecciones infinitas
**Solución:** Verifica que las rutas públicas estén correctamente definidas en el middleware

### Token no persiste entre recargas
**Solución:** Verifica que las cookies se estén estableciendo con `httpOnly: true` y `path: '/'`

---

## 📚 Recursos

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Jose JWT Library](https://github.com/panva/jose)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)

---

**Última actualización:** 2025-11-29
**Versión:** 1.0.0

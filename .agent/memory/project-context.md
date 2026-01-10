# SUMA - Sistema Unificado de Medicina Avanzada
## Memoria del Proyecto - Última actualización: 2026-01-10

---

## 📋 Descripción General

SUMA es una plataforma médica completa que conecta pacientes, médicos, vendedoras y administradores. Permite agendar citas, gestionar pagos, historial médico, y más.

**Stack tecnológico:**
- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **UI**: shadcn/ui, Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: JWT con cookies HTTP-only + bcrypt para hashing
- **Email**: Resend API
- **Notificaciones**: WhatsApp (Twilio), Push, Email

---

## 🗄️ Estructura de Base de Datos

### Tablas principales:
| Tabla | Descripción |
|-------|-------------|
| `patients` | Pacientes registrados |
| `doctors` | Médicos con sus servicios, consultorios, cupones |
| `sellers` | Vendedoras con código de referido |
| `admins` | Administradores del sistema |
| `appointments` | Citas médicas |
| `medical_records` | Historial médico de pacientes |
| `support_tickets` | Tickets de soporte |
| `scheduled_notifications` | Notificaciones programadas |
| `notification_logs` | Logs de notificaciones enviadas |

### Campos únicos (constraints implementados 2024-12-24):
- `doctors.email` - UNIQUE
- `doctors.cedula` - UNIQUE INDEX (parcial, no vacío)
- `doctors.medical_license` - UNIQUE INDEX (parcial, no vacío)
- `patients.email` - UNIQUE
- `patients.cedula` - UNIQUE INDEX (parcial, no vacío)
- `sellers.email` - UNIQUE
- `sellers.referral_code` - UNIQUE INDEX (parcial, no vacío)
- `admins.email` - UNIQUE
- `appointments(doctor_id, date, time)` - UNIQUE INDEX (evita doble reserva)

---

## 🔐 Sistema de Autenticación

### Roles:
1. **patient** - Pacientes
2. **doctor** - Médicos
3. **seller** - Vendedoras
4. **admin** - Administradores

### Flujo:
1. Login en `/auth/login`
2. JWT generado y almacenado en cookie HTTP-only
3. Context `AuthProvider` mantiene sesión del lado cliente
4. Helpers en `auth-helpers.ts` para verificar roles en API routes

### Archivos clave:
- `src/lib/auth.tsx` - Contexto de autenticación
- `src/lib/auth-helpers.ts` - Helpers para API routes
- `src/lib/password-utils.ts` - bcrypt hashing
- `src/app/api/auth/set-token/route.ts` - Establece cookie JWT

---

## 📁 Estructura de Archivos Principales

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/               # Autenticación
│   │   ├── support/            # Tickets de soporte
│   │   ├── appointments/       # Citas
│   │   ├── validate-unique/    # Validación de campos únicos
│   │   └── cron/               # Jobs programados
│   ├── auth/                   # Páginas de auth
│   │   ├── login/
│   │   ├── register/           # Registro paciente
│   │   └── register-doctor/    # Registro médico
│   ├── dashboard/              # Dashboard paciente
│   ├── doctor/                 # Páginas doctor
│   ├── seller/                 # Páginas vendedora
│   ├── admin/                  # Panel admin
│   └── profile/                # Perfil paciente
├── components/
│   ├── admin/tabs/             # Tabs del panel admin
│   ├── doctor/                 # Componentes doctor
│   │   ├── dashboard-client.tsx  # Dashboard principal doctor
│   │   ├── dashboard/tabs/     # Tabs del dashboard
│   ├── clinic/tabs/            # Tabs panel clínica (Doctors, Services)
│   ├── seller/tabs/            # Tabs panel vendedora
│   └── ui/                     # Componentes shadcn (incluye date-range-picker)
├── lib/
│   ├── supabase.ts             # Cliente Supabase (anon)
│   ├── supabase-admin.ts       # Cliente Supabase (service role)
│   ├── supabaseService.ts      # Servicios CRUD
│   ├── types.ts                # Tipos TypeScript
│   ├── auth.tsx                # Contexto autenticación
│   ├── validation-utils.ts     # Validaciones y sanitización
│   ├── unique-validation.ts    # Validación campos únicos
│   └── notifications/          # Servicios notificaciones
└── hooks/                      # Custom hooks
```

---

## 🔧 Configuración Supabase

**Project ID**: `fnjdqdwpttmrpzbqzbqm`
**URL**: `https://fnjdqdwpttmrpzbqzbqm.supabase.co`

### Variables de entorno necesarias:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
RESEND_API_KEY=
```

---

## ✅ Funcionalidades Implementadas

### Sistema de Soporte (2024-12-24):
- ✅ Tickets con timestamps completos (fecha + hora)
- ✅ Mensajes con actualización optimista
- ✅ Enter para enviar, Shift+Enter para nueva línea
- ✅ Sender correcto ('user' para doctor/seller, 'admin' para admin)

### Validación de Campos Únicos (2024-12-24):
- ✅ Constraints en Supabase para todos los campos únicos
- ✅ API `/api/validate-unique` para validar desde cliente
- ✅ Validación cruzada de emails entre tablas
- ✅ Validación en registro doctor (email, DNI, matrícula)
- ✅ Validación en registro paciente (email)
- ✅ Validación en walk-in (email no en otras tablas)

### Walk-in (Citas sin cita previa):
- ✅ Crear paciente automáticamente si no existe
- ✅ Validar que email no sea de doctor/seller/admin
- ✅ Contraseña temporal: `Suma..00`
- ✅ Envío de email de bienvenida

### Dashboard Clínica (2024-12-31):
- ✅ **Filtrado Avanzado de Fechas**:
  - Panel principal y vistas detalladas (Médicos/Servicios).
  - Presets rápidos: "Hoy", "7 Días", "Mes".
  - Selector de rango personalizado (`DatePickerWithRange`).
- ✅ **Historial Detallado**:
  - Panel lateral (`Sheet`) con historial completo filtrable.
  - Estadísticas de ingresos y pacientes por rango de fecha.
  - APIs actualizadas (`getDoctorAppointmentHistory`, `getServiceAppointmentHistory`) para soportar rangos.

### Núcleo Familiar (2025-01-07):
- ✅ **Base de Datos**:
  - Nueva tabla `family_members` con relaciones familiares.
  - Columnas agregadas a `appointments`: `family_member_id`, `booked_by_patient_id`.
  - Columna agregada a `medical_records`: `family_member_id`.
- ✅ **Backend**:
  - Funciones CRUD: `getFamilyMembers`, `addFamilyMember`, `updateFamilyMember`, `deleteFamilyMember`.
  - API Routes: `/api/family-members`, `/api/family-members/[id]`.
- ✅ **Frontend**:
  - Componente `FamilyTab` para gestión de familiares.
  - Página `/dashboard/family` para pacientes.
  - Card en dashboard principal con acceso directo.
- ✅ **Flujo de Reserva**:
  - Nuevo paso "¿Para quién es la cita?" al inicio del flujo.
  - Selector de familiar con lista de miembros activos.
  - `appointmentData` actualizado con `familyMemberId` y `bookedByPatientId`.
  - Indicador en confirmación de cita.
- ✅ **Historial Médico**:
  - Badge "Para: [Familiar]" en tarjetas de citas.
  - Filtro por familiar en sección de historial.
  - Selector con opciones: Todas, Solo mías, [Familiares].
- ✅ **Visualización Admin/Clínica**:
  - Admin: Sección "Núcleo Familiar" en detalles del paciente.
  - Clínica: Nueva tab "Familia" en el diálogo de paciente.
  - Muestra: nombre, relación, edad, teléfono, email de cada familiar.
- ✅ **Notificaciones y Vinculación**:
  - Notificación de cita confirmada se envía también al familiar si tiene email.
  - Funcionalidad para vincular un perfil de familiar con una cuenta existente de SUMA.
  - Endpoint `/api/family-members/[id]/link` validado.
- ✅ **Migración SQL ejecutada** en Supabase.

### Dashboard Médico: Finanzas (Enero 2026):
- ✅ **Filtros por Consultorio**:
  - Corrección de mapping: direcciones físicas ahora se muestran con el nombre comercial del consultorio.
  - Tarjetas de resumen interactivas: click para filtrar todo el dashboard por ese consultorio.
  - Eliminada opción "Sin consultorio" para forzar integridad de datos.
- ✅ **Nueva Pestaña de Ingresos**:
  - Tabla detallada de citas pagadas por consultorio.
- ✅ **Mejoras UI/UX**:
  - Menú de pestañas rediseñado: botones grandes, íconos, contraste alto (Verde Ingresos, Rojo Gastos).
  - Registro de gastos obliga a seleccionar un consultorio válido.

### Registro de Médicos (Enero 2026):
- ✅ **Nuevos Campos Obligatorios**:
  - Dirección completa del consultorio.
  - Sector / Barrio.
  - Teléfono móvil (con UI mejorada y validación).
  - Licencia Médica.
- ✅ **Validaciones**:
  - DNI con límite de 12 caracteres.
  - Soporte explícito documentado para Pasaportes y otros documentos.

---

## ⚠️ Issues Conocidos / Pendientes

### Seguridad (pendiente de implementar):
- [ ] Rate limiting en endpoints sensibles
- [ ] Headers de seguridad (CSP, X-Frame-Options, etc.)
- [ ] Tokens CSRF completos
- [ ] JWT_SECRET fijo en producción (no usar fallback)
- [ ] Middleware de autenticación mejorado
- [ ] Logging de auditoría

### Errores de compilación pre-existentes:
- `scripts/check-api-response.ts` - Error de tipos
- `src/lib/notifications/email-s...` - Posible archivo incompleto

---

## 📝 Notas de Desarrollo

### Para crear citas walk-in:
El doctor puede crear citas para pacientes que llegan sin cita. Si el paciente no existe, se crea automáticamente con contraseña `Suma..00`.

### Para validar campos únicos:
```typescript
// Desde el cliente
const response = await fetch('/api/validate-unique', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    type: 'email', // o 'doctor_cedula', 'doctor_medical_license', etc.
    value: 'test@email.com',
    excludeId: 'uuid-opcional' // para updates
  })
});
const result = await response.json();
// result = { isUnique: boolean, field: string, message: string }
```

### Comandos útiles:
```bash
# Desarrollo
npm run dev

# Build
npm run build

# Verificar tipos
npx tsc --noEmit
```

---

## 📞 Contacto del Proyecto

**Repositorio local**: `c:\Users\peroz\OneDrive\Escritorio\suma - argentina`

---

*Este archivo se actualiza automáticamente para mantener contexto entre sesiones.*

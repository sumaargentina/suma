# 🔍 REVISIÓN COMPLETA DEL SISTEMA - SUPABASE

## Estado Actual de Migración
- ✅ Migrado de Firestore a Supabase
- ✅ Usando `supabaseAdmin` para operaciones que requieren bypass de RLS
- ⚠️ RLS activo en todas las tablas

---

## 1️⃣ MÓDULO: PACIENTES (Patients)

### Operaciones Críticas:
- ✅ **Registro** (`addPatient`) - Usa `supabaseAdmin` ✓
- ✅ **Login** (`findUserByEmail`) - Usa `supabase` (lectura pública) ✓
- ✅ **Actualizar perfil** (`updatePatient`) - Usa `supabase` ⚠️
- ✅ **Ver citas propias** (`getPatientAppointments`) - Usa `supabase` ⚠️
- ✅ **Crear cita** (`addAppointment`) - Usa `supabaseAdmin` ✓

### Problemas Potenciales:
1. **updatePatient**: Usa `supabase` normal, podría fallar si RLS no permite al paciente actualizar su propio perfil
2. **getPatientAppointments**: Usa `supabase`, podría no retornar citas si RLS es muy restrictivo

### Archivos Involucrados:
- `src/lib/supabaseService.ts` - Funciones de BD
- `src/lib/auth.tsx` - Registro/Login
- `src/app/auth/register/page.tsx` - UI de registro
- `src/app/dashboard/page.tsx` - Dashboard del paciente
- `src/app/doctors/[id]/page.tsx` - Agendar citas

---

## 2️⃣ MÓDULO: DOCTORES (Doctors)

### Operaciones Críticas:
- ✅ **Registro** (`addDoctor`) - Usa `supabaseAdmin` ✓
- ✅ **Login** (`findUserByEmail`) - Usa `supabase` (lectura pública) ✓
- ✅ **Actualizar perfil** (`updateDoctor`) - Usa `supabase` ⚠️
- ✅ **Ver citas recibidas** (`getDoctorAppointments`) - Usa `supabase` ⚠️
- ✅ **Actualizar cita** (`updateAppointment`) - Usa `supabase` ⚠️
- ✅ **Listar todos los doctores** (`getDoctors`) - Usa `supabase` ⚠️
- ✅ **Ver perfil público** (`getDoctor`) - Usa `supabase` ⚠️

### Problemas Potenciales:
1. **getDoctorAppointments**: Podría no retornar citas si RLS bloquea
2. **updateDoctor**: Podría fallar si el doctor no puede actualizar su propio perfil
3. **getDoctors**: Necesita ser público para el buscador de doctores

### Archivos Involucrados:
- `src/lib/supabaseService.ts` - Funciones de BD
- `src/lib/auth.tsx` - Registro/Login de doctores
- `src/app/find-a-doctor/page.tsx` - Buscador público
- `src/app/doctor-dashboard/page.tsx` - Dashboard del doctor

---

## 3️⃣ MÓDULO: VENDEDORES (Sellers)

### Operaciones Críticas:
- ✅ **Registro** (`addSeller`) - Usa `supabaseAdmin` ✓
- ✅ **Login** (`findUserByEmail`) - Usa `supabase` ✓
- ✅ **Actualizar perfil** (`updateSeller`) - Usa `supabase` ⚠️
- ✅ **Ver doctores asignados** - Filtro por `seller_id` ⚠️

### Problemas Potenciales:
1. **updateSeller**: Podría fallar si RLS no permite actualización
2. **Filtrar doctores por seller_id**: Necesita permisos de lectura

---

## 4️⃣ MÓDULO: ADMINISTRADOR (Admin)

### Operaciones Críticas:
- ✅ **Login** - Tabla `admins` separada
- ✅ **Gestión completa** - Debería usar `supabaseAdmin` para todo

### Problemas Potenciales:
1. Verificar que el admin tenga acceso completo a todas las tablas

---

## 🔴 PROBLEMAS IDENTIFICADOS Y SOLUCIONES

### Problema 1: RLS en operaciones de lectura/escritura
**Afecta**: Pacientes, Doctores, Vendedores
**Solución**: 
- Opción A: Configurar políticas RLS correctas en Supabase
- Opción B: Usar `supabaseAdmin` para todas las operaciones (menos seguro pero más simple)

### Problema 2: getDoctorAppointments podría no funcionar
**Archivo**: `src/lib/supabaseService.ts:93-105`
**Código actual**:
```typescript
export const getDoctorAppointments = async (doctorId: string): Promise<Appointment[]> => {
    const { data, error } = await supabase  // ⚠️ Usa supabase normal
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId);
```
**Solución**: Cambiar a `supabaseAdmin` o configurar RLS

### Problema 3: getPatientAppointments podría no funcionar
**Archivo**: `src/lib/supabaseService.ts:107-119`
**Código actual**:
```typescript
export const getPatientAppointments = async (patientId: string): Promise<Appointment[]> => {
    const { data, error } = await supabase  // ⚠️ Usa supabase normal
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId);
```
**Solución**: Cambiar a `supabaseAdmin` o configurar RLS

### Problema 4: updatePatient/updateDoctor/updateSeller
**Archivo**: `src/lib/supabaseService.ts` (múltiples líneas)
**Problema**: Usan `supabase` normal, podrían fallar por RLS
**Solución**: Cambiar a `supabaseAdmin` o configurar RLS correctamente

---

## ✅ RECOMENDACIONES INMEDIATAS

### Opción 1: Usar supabaseAdmin para todo (Rápido pero menos seguro)
Cambiar todas las operaciones a `supabaseAdmin` para garantizar que funcionen.

### Opción 2: Configurar RLS correctamente (Seguro pero requiere SQL)
Ejecutar políticas SQL en Supabase para permitir:
- Pacientes: leer/actualizar su propio perfil y citas
- Doctores: leer/actualizar su propio perfil y citas recibidas
- Vendedores: leer/actualizar su propio perfil y doctores asignados
- Público: leer lista de doctores activos

---

## 📝 SIGUIENTE PASO

¿Qué prefieres?
1. **Rápido**: Cambio todas las operaciones a `supabaseAdmin` (5 minutos)
2. **Seguro**: Creo scripts SQL para configurar RLS correctamente (15 minutos)
3. **Híbrido**: Uso `supabaseAdmin` para operaciones críticas y RLS para el resto

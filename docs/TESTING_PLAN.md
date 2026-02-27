# 🧪 PLAN DE PRUEBAS COMPLETO - SISTEMA SUMA

## ✅ CAMBIOS APLICADOS

### Operaciones que ahora usan `supabaseAdmin` (bypass RLS):
1. ✅ `addPatient` - Registro de pacientes
2. ✅ `addDoctor` - Registro de doctores
3. ✅ `addSeller` - Registro de vendedores
4. ✅ `addAppointment` - Creación de citas
5. ✅ `updatePatient` - Actualización de perfil de paciente
6. ✅ `updateDoctor` - Actualización de perfil de doctor
7. ✅ `updateSeller` - Actualización de perfil de vendedor
8. ✅ `updateAppointment` - Actualización de citas
9. ✅ `updateDoctorStatus` - Cambio de estado de doctor
10. ✅ `getDoctorAppointments` - Obtener citas del doctor
11. ✅ `getPatientAppointments` - Obtener citas del paciente
12. ✅ `deletePatient`, `deleteDoctor`, `deleteSeller` - Eliminaciones

---

## 📋 PRUEBAS POR USUARIO

### 🔵 PACIENTE (Patient)

#### Test 1: Registro
**URL**: `/auth/register`
**Pasos**:
1. Ir a la página de registro
2. Ingresar:
   - Nombre completo: "Juan Pérez"
   - Email: "juan.perez@test.com"
   - Contraseña: "Test1234"
   - Confirmar contraseña: "Test1234"
3. Click en "Registrarse"

**Resultado esperado**: 
- ✅ Usuario creado en tabla `patients`
- ✅ Redirección al dashboard o perfil del doctor (si hay cita pendiente)
- ✅ Email de bienvenida enviado (si está configurado)

#### Test 2: Login
**URL**: `/auth/login`
**Pasos**:
1. Ingresar email: "juan.perez@test.com"
2. Ingresar contraseña: "Test1234"
3. Click en "Iniciar Sesión"

**Resultado esperado**:
- ✅ Login exitoso
- ✅ Redirección al dashboard

#### Test 3: Completar Perfil
**URL**: `/dashboard` (después de login)
**Pasos**:
1. Click en "Completar Perfil" o ir a configuración
2. Llenar:
   - Edad: 30
   - Género: Masculino
   - Teléfono: +54 11 1234-5678
   - DNI: 12345678
   - Ciudad: Buenos Aires
3. Guardar

**Resultado esperado**:
- ✅ Perfil actualizado en BD
- ✅ `profile_completed = true`

#### Test 4: Agendar Cita
**URL**: `/find-a-doctor` → Seleccionar un doctor
**Pasos**:
1. Buscar un doctor activo
2. Click en "Ver Perfil"
3. **Paso 1**: Seleccionar fecha y hora disponible
4. Click "Continuar al Paso 2"
5. **Paso 2**: Seleccionar servicios adicionales (opcional)
6. Aplicar cupón si existe (opcional)
7. Click "Continuar al Paso 3"
8. **Paso 3**: Seleccionar método de pago (Efectivo o Transferencia)
9. Si es transferencia, subir comprobante
10. Click "Confirmar Cita"

**Resultado esperado**:
- ✅ Cita creada en tabla `appointments`
- ✅ `patient_id` = ID del paciente
- ✅ `doctor_id` = ID del doctor seleccionado
- ✅ `read_by_doctor = false` (doctor debe ser notificado)
- ✅ `read_by_patient = true`

#### Test 5: Ver Mis Citas
**URL**: `/dashboard` (sección de citas)
**Pasos**:
1. Ir al dashboard
2. Ver lista de citas agendadas

**Resultado esperado**:
- ✅ Se muestran todas las citas del paciente
- ✅ Información completa: doctor, fecha, hora, servicios, precio

---

### 🟢 DOCTOR (Doctor)

#### Test 1: Registro
**URL**: `/doctor-registration` (si existe) o proceso de registro de doctor
**Pasos**:
1. Llenar formulario completo:
   - Nombre, DNI, Especialidad
   - Ciudad, Dirección, Sector
   - Email, Contraseña
   - Tarifa de consulta
   - Horarios de atención
   - Servicios adicionales
   - Datos bancarios
2. Enviar registro

**Resultado esperado**:
- ✅ Doctor creado en tabla `doctors`
- ✅ `status = 'active'` (por defecto)
- ✅ `subscription_status = 'pending_payment'`

#### Test 2: Login
**URL**: `/auth/login`
**Pasos**:
1. Ingresar email de doctor
2. Ingresar contraseña
3. Click "Iniciar Sesión"

**Resultado esperado**:
- ✅ Login exitoso
- ✅ Redirección a `/doctor-dashboard`

#### Test 3: Ver Citas Recibidas
**URL**: `/doctor-dashboard` (sección de citas)
**Pasos**:
1. Ir al dashboard del doctor
2. Ver lista de citas

**Resultado esperado**:
- ✅ Se muestran TODAS las citas donde `doctor_id = ID del doctor`
- ✅ Información completa de cada cita
- ✅ Citas nuevas marcadas como no leídas

#### Test 4: Actualizar Estado de Cita
**URL**: `/doctor-dashboard` → Click en una cita
**Pasos**:
1. Abrir detalles de una cita
2. Marcar asistencia: "Atendido" / "No Asistió"
3. Agregar notas clínicas (opcional)
4. Agregar prescripción (opcional)
5. Guardar

**Resultado esperado**:
- ✅ Cita actualizada en BD
- ✅ `attendance` cambiado
- ✅ `read_by_patient = false` (paciente debe ser notificado)

#### Test 5: Actualizar Perfil
**URL**: `/doctor-dashboard` → Configuración
**Pasos**:
1. Modificar horarios
2. Agregar/quitar servicios
3. Actualizar tarifa
4. Cambiar datos bancarios
5. Guardar

**Resultado esperado**:
- ✅ Perfil actualizado en BD
- ✅ Cambios reflejados en perfil público

---

### 🟡 VENDEDOR (Seller)

#### Test 1: Registro
**URL**: Proceso de registro de vendedor
**Pasos**:
1. Llenar formulario:
   - Nombre, Email, Contraseña
   - Teléfono
   - Tasa de comisión
2. Enviar

**Resultado esperado**:
- ✅ Vendedor creado en tabla `sellers`
- ✅ `referral_code` generado automáticamente

#### Test 2: Login
**URL**: `/auth/login`
**Pasos**:
1. Ingresar email de vendedor
2. Ingresar contraseña
3. Login

**Resultado esperado**:
- ✅ Login exitoso
- ✅ Redirección a dashboard de vendedor

#### Test 3: Ver Doctores Asignados
**URL**: Dashboard de vendedor
**Pasos**:
1. Ver lista de doctores donde `seller_id = ID del vendedor`

**Resultado esperado**:
- ✅ Lista de doctores asignados
- ✅ Información de cada doctor

---

### 🔴 ADMINISTRADOR (Admin)

#### Test 1: Login
**URL**: `/auth/login`
**Pasos**:
1. Ingresar email de admin
2. Ingresar contraseña
3. Login

**Resultado esperado**:
- ✅ Login exitoso
- ✅ Redirección a `/admin-dashboard`

#### Test 2: Ver Todos los Usuarios
**URL**: `/admin-dashboard`
**Pasos**:
1. Ver lista de pacientes
2. Ver lista de doctores
3. Ver lista de vendedores

**Resultado esperado**:
- ✅ Acceso completo a todas las tablas
- ✅ Puede ver, editar, eliminar cualquier registro

---

## 🔍 VERIFICACIONES EN BASE DE DATOS

### Después de cada prueba, verificar en Supabase:

#### Tabla `patients`:
```sql
SELECT * FROM patients WHERE email = 'juan.perez@test.com';
```
**Verificar**:
- ✅ `password` está hasheado
- ✅ `profile_completed` es `true` después de completar perfil
- ✅ `favorite_doctor_ids` es un array JSON

#### Tabla `doctors`:
```sql
SELECT * FROM doctors WHERE status = 'active';
```
**Verificar**:
- ✅ `schedule` es un objeto JSON con días de la semana
- ✅ `services` es un array JSON
- ✅ `bank_details` es un array JSON
- ✅ `consultation_fee` es un número

#### Tabla `appointments`:
```sql
SELECT * FROM appointments 
WHERE doctor_id = 'ID_DEL_DOCTOR' 
ORDER BY date DESC, time DESC;
```
**Verificar**:
- ✅ Todas las citas del doctor aparecen
- ✅ `patient_id` y `doctor_id` son UUIDs válidos
- ✅ `services` es un array JSON
- ✅ `total_price` es correcto
- ✅ `read_by_doctor` y `read_by_patient` son booleanos

---

## 🚨 PROBLEMAS CONOCIDOS Y SOLUCIONES

### Problema: "Cannot read properties of undefined"
**Causa**: Datos faltantes en BD (services, bankDetails, etc.)
**Solución**: ✅ Ya aplicada - checks de seguridad en el código

### Problema: "Row violates RLS policy"
**Causa**: Políticas de seguridad muy restrictivas
**Solución**: ✅ Ya aplicada - uso de `supabaseAdmin` en operaciones críticas

### Problema: "Module not found: firebase-admin"
**Causa**: Dependencia obsoleta
**Solución**: ✅ Ya aplicada - eliminada de todos los archivos

---

## ✅ CHECKLIST FINAL

Antes de dar por terminado, verificar:

- [ ] Paciente puede registrarse
- [ ] Paciente puede hacer login
- [ ] Paciente puede completar perfil
- [ ] Paciente puede agendar cita
- [ ] Paciente puede ver sus citas
- [ ] Doctor puede registrarse
- [ ] Doctor puede hacer login
- [ ] Doctor puede ver TODAS sus citas
- [ ] Doctor puede actualizar estado de citas
- [ ] Doctor puede actualizar su perfil
- [ ] Vendedor puede registrarse
- [ ] Vendedor puede hacer login
- [ ] Vendedor puede ver sus doctores
- [ ] Admin puede hacer login
- [ ] Admin puede ver todos los datos
- [ ] Buscador de doctores funciona
- [ ] Perfil público de doctor se muestra correctamente
- [ ] Cupones se aplican correctamente
- [ ] Subida de comprobantes de pago funciona

---

## 📞 SIGUIENTE PASO

Ejecuta las pruebas en orden y reporta cualquier error que encuentres.
Para cada error, necesito:
1. ¿Qué usuario estabas usando? (Paciente/Doctor/Vendedor/Admin)
2. ¿Qué acción estabas haciendo?
3. ¿Qué mensaje de error apareció?
4. ¿En qué URL estabas?

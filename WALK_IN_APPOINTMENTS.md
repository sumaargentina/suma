# 🚶‍♂️ FUNCIONALIDAD WALK-IN - REGISTRO DE PACIENTES SIN CITA

## 📋 OBJETIVO
Permitir al médico registrar pacientes que llegan sin cita previa, creando automáticamente su cuenta y la cita.

## 🎯 FUNCIONALIDADES

### 1. **Botón "Registrar Cita Walk-in"**
- Ubicación: En la sección "Citas de Hoy" del módulo de Citas
- Visible siempre para el médico
- Abre un diálogo para registrar al paciente

### 2. **Formulario de Registro Walk-in**
Campos requeridos:
- ✅ **Nombre completo** del paciente
- ✅ **Email** (se usará como usuario)
- ✅ **Teléfono** (opcional pero recomendado)
- ✅ **DNI/Pasaporte** (opcional)
- ✅ **Edad** (opcional)
- ✅ **Género** (opcional)
- ✅ **Servicios** realizados (selector múltiple)
- ✅ **Método de pago** (efectivo/transferencia)
- ✅ **Monto pagado**
- ✅ **Consultorio** (si tiene múltiples)

### 3. **Proceso Automático**
1. **Validar email** - Verificar si ya existe un paciente con ese email
2. **Crear paciente** (si no existe):
   - Email como usuario
   - Contraseña predeterminada: `Suma..00`
   - Perfil incompleto (para que lo complete después)
3. **Crear cita**:
   - Fecha: Hoy
   - Hora: Hora actual
   - Estado: "Atendido"
   - Pago: Según lo ingresado
   - Servicios: Los seleccionados
4. **Notificar al médico** del éxito
5. **Enviar email al paciente** (opcional) con credenciales

### 4. **Seguridad**
- ✅ Hash de contraseña con bcrypt
- ✅ Validación de email único
- ✅ Validación de datos mínimos

## 📝 ARCHIVOS A MODIFICAR

### 1. `src/components/doctor/dashboard/tabs/appointments-tab.tsx`
- Agregar botón "Registrar Walk-in"
- Pasar callback al dashboard-client

### 2. `src/components/doctor/dashboard-client.tsx`
- Agregar estado para diálogo walk-in
- Agregar función `handleWalkInAppointment`
- Agregar diálogo de formulario

### 3. `src/lib/supabaseService.ts`
- Agregar función `createWalkInAppointment(data)`
- Función para crear paciente y cita en una transacción

## 🎨 UI/UX

### Botón
```
┌────────────────────────────────────┐
│ Citas de Hoy (3)                   │
│                                    │
│ [+ Registrar Cita Walk-in]         │
│                                    │
│ • 09:00 - Juan Pérez               │
│ • 10:30 - María García             │
└────────────────────────────────────┘
```

### Diálogo
```
┌─────────────────────────────────────────┐
│ 🚶 Registrar Paciente Walk-in           │
│                                         │
│ Datos del Paciente                      │
│ ┌─────────────────────────────────┐    │
│ │ Nombre completo *               │    │
│ └─────────────────────────────────┘    │
│ ┌─────────────────────────────────┐    │
│ │ Email *                         │    │
│ └─────────────────────────────────┘    │
│                                         │
│ Detalles de la Consulta                │
│ ┌─────────────────────────────────┐    │
│ │ Servicios realizados *          │    │
│ └─────────────────────────────────┘    │
│ ┌─────────────────────────────────┐    │
│ │ Monto pagado *                  │    │
│ └─────────────────────────────────┘    │
│                                         │
│ ℹ️ Se creará una cuenta con:            │
│ Usuario: email ingresado                │
│ Contraseña: Suma..00                    │
│                                         │
│ [Cancelar]  [Registrar Paciente]       │
└─────────────────────────────────────────┘
```

## ✅ VALIDACIONES

1. **Email**:
   - Formato válido
   - Si existe → Usar paciente existente
   - Si no existe → Crear nuevo

2. **Nombre**: Mínimo 3 caracteres

3. **Servicios**: Al menos 1 servicio seleccionado

4. **Monto**: Mayor a 0

## 🔄 FLUJO COMPLETO

```
1. Médico click "Registrar Walk-in"
2. Llena formulario con datos del paciente
3. Sistema valida email
   ├─ Email existe → Usa paciente existente
   └─ Email nuevo → Crea paciente con Suma..00
4. Crea cita con estado "Atendido"
5. Muestra confirmación
6. Actualiza lista de citas
7. (Opcional) Envía email al paciente
```

## 📧 EMAIL AL PACIENTE (Opcional)

```
Asunto: Bienvenido a SUMA - Tus credenciales de acceso

Hola [Nombre],

Has sido atendido por el Dr. [Nombre Médico] en SUMA.

Tus credenciales de acceso son:
Usuario: [email]
Contraseña: Suma..00

Por favor, ingresa a https://suma.com y cambia tu contraseña.

Saludos,
Equipo SUMA
```

## 🚀 IMPLEMENTACIÓN

### Prioridad Alta:
1. ✅ Botón en appointments-tab
2. ✅ Diálogo de formulario
3. ✅ Función createWalkInAppointment
4. ✅ Validación de email
5. ✅ Creación de paciente + cita

### Prioridad Media:
6. ⏳ Email de notificación
7. ⏳ Validaciones avanzadas

### Prioridad Baja:
8. ⏳ Estadísticas de walk-ins
9. ⏳ Reportes especiales

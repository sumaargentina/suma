# Consultas Online - Guía de Implementación

## Descripción General

El sistema ahora soporta **consultas online** además de las consultas presenciales. Cada médico puede ofrecer consultas por videollamada con su propio horario y precio, independiente de sus consultorios físicos.

## Estructura de Datos

### Tipo `OnlineConsultation`

```typescript
export type OnlineConsultation = {
  enabled: boolean;              // Si el médico ofrece consultas online
  consultationFee: number;       // Precio de la consulta online
  schedule: Schedule;            // Horario disponible para consultas online
  platform?: string;             // Plataforma (ej: "Zoom", "Google Meet", "WhatsApp Video")
  services?: Service[];          // Servicios adicionales disponibles online
};
```

### Tipo `Doctor` (actualizado)

El tipo `Doctor` ahora incluye el campo opcional `onlineConsultation`:

```typescript
export type Doctor = {
  // ... campos existentes
  addresses?: DoctorAddress[];        // Consultorios físicos
  onlineConsultation?: OnlineConsultation;  // Configuración de consultas online
  // ... más campos
};
```

### Tipo `Appointment` (actualizado)

Las citas ahora incluyen:

```typescript
export type Appointment = {
  // ... campos existentes
  consultationType?: 'presencial' | 'online';  // Tipo de consulta
  meetingLink?: string;                        // Link de videollamada (para online)
  // ... más campos
};
```

## Configuración en la Base de Datos

### Tabla `doctors`

Agregar columna JSON para consultas online:

```sql
ALTER TABLE doctors 
ADD COLUMN online_consultation JSONB;
```

Ejemplo de datos:

```json
{
  "enabled": true,
  "consultationFee": 5000,
  "platform": "Google Meet",
  "schedule": {
    "monday": {
      "active": true,
      "slots": [
        { "start": "18:00", "end": "21:00" }
      ]
    },
    "tuesday": {
      "active": true,
      "slots": [
        { "start": "18:00", "end": "21:00" }
      ]
    },
    // ... otros días
  },
  "services": [
    {
      "id": "online-1",
      "name": "Consulta de seguimiento online",
      "price": 2000
    }
  ]
}
```

### Tabla `appointments`

Agregar columnas:

```sql
ALTER TABLE appointments 
ADD COLUMN consultation_type VARCHAR(20) DEFAULT 'presencial',
ADD COLUMN meeting_link TEXT;
```

## Flujo de Usuario

### 1. Selección de Tipo de Consulta

En la página del doctor (`/doctors/[id]`), el paciente puede elegir entre:

- **Presencial**: Consulta en un consultorio físico
- **Online**: Consulta por videollamada (solo si el doctor lo ofrece)

### 2. Selección de Consultorio (solo presencial)

Si elige presencial y el doctor tiene múltiples consultorios, debe seleccionar uno.

### 3. Horarios Dinámicos

Los horarios disponibles cambian según el tipo de consulta:

- **Presencial**: Usa el horario del consultorio seleccionado
- **Online**: Usa el horario de `onlineConsultation.schedule`

### 4. Precios Dinámicos

El precio base cambia según el tipo:

- **Presencial**: `consultorio.consultationFee` o `doctor.consultationFee`
- **Online**: `onlineConsultation.consultationFee`

### 5. Servicios Adicionales

Los servicios disponibles también pueden variar:

- **Presencial**: `consultorio.services` o `doctor.services`
- **Online**: `onlineConsultation.services` o `doctor.services`

## Interfaz de Usuario

### Selector de Tipo de Consulta

```tsx
<div className="mb-6">
  <Label>Tipo de Consulta:</Label>
  <div className="flex gap-2">
    <Button variant={consultationType === 'presencial' ? "default" : "outline"}>
      <Building2 className="w-4 h-4 mr-2" />
      Presencial
    </Button>
    {doctor.onlineConsultation?.enabled && (
      <Button variant={consultationType === 'online' ? "default" : "outline"}>
        <Video className="w-4 h-4 mr-2" />
        Online
      </Button>
    )}
  </div>
</div>
```

### Indicador en Tarjetas de Citas

Las citas online se muestran con un ícono de video:

```tsx
{appointment.consultationType === 'online' ? (
  <div className="flex items-center text-blue-600">
    <Video className="h-4 w-4" />
    <span>Consulta Online</span>
  </div>
) : (
  <div className="flex items-center">
    <MapPin className="h-4 w-4" />
    <span>{appointment.doctorAddress}</span>
  </div>
)}
```

## Ejemplo de Configuración

### Médico con Consultas Presenciales y Online

```json
{
  "id": "doc-123",
  "name": "Dr. Juan Pérez",
  "consultationFee": 8000,
  "addresses": [
    {
      "id": "addr-1",
      "name": "Consultorio Centro",
      "address": "Av. Principal 123",
      "city": "Buenos Aires",
      "consultationFee": 8000,
      "schedule": {
        "monday": { "active": true, "slots": [{ "start": "09:00", "end": "13:00" }] }
      }
    },
    {
      "id": "addr-2",
      "name": "Consultorio Norte",
      "address": "Calle Norte 456",
      "city": "Buenos Aires",
      "consultationFee": 7000,
      "schedule": {
        "wednesday": { "active": true, "slots": [{ "start": "14:00", "end": "18:00" }] }
      }
    }
  ],
  "onlineConsultation": {
    "enabled": true,
    "consultationFee": 6000,
    "platform": "Google Meet",
    "schedule": {
      "monday": { "active": true, "slots": [{ "start": "19:00", "end": "21:00" }] },
      "tuesday": { "active": true, "slots": [{ "start": "19:00", "end": "21:00" }] },
      "thursday": { "active": true, "slots": [{ "start": "19:00", "end": "21:00" }] }
    }
  }
}
```

En este ejemplo:
- **Lunes 9-13h**: Presencial en Consultorio Centro ($8000)
- **Lunes 19-21h**: Online ($6000)
- **Miércoles 14-18h**: Presencial en Consultorio Norte ($7000)
- **Martes y Jueves 19-21h**: Online ($6000)

## Beneficios

1. **Flexibilidad**: Los médicos pueden ofrecer múltiples modalidades
2. **Precios diferenciados**: Consultas online pueden tener precio menor
3. **Horarios extendidos**: Consultas online en horarios nocturnos
4. **Alcance geográfico**: Pacientes de otras ciudades pueden consultar online
5. **Organización clara**: Sistema distingue claramente entre presencial y online

## Próximos Pasos

1. **Integración con plataformas de videollamada**: Generar links automáticos de Zoom/Meet
2. **Notificaciones**: Enviar link de videollamada antes de la cita
3. **Panel de administración**: Interfaz para que médicos configuren sus consultas online
4. **Estadísticas**: Reportes separados de consultas presenciales vs online

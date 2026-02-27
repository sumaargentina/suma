# Arquitectura del Sistema de Consultas Online

## Diagrama de Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────┐
│                    Página del Doctor                         │
│                  /doctors/[id]/page.tsx                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PASO 1: Selección de Tipo                       │
│                                                               │
│  ┌──────────────┐              ┌──────────────┐             │
│  │  Presencial  │              │    Online    │             │
│  │  (Building2) │              │    (Video)   │             │
│  └──────────────┘              └──────────────┘             │
│         │                              │                     │
│         ▼                              ▼                     │
│  ┌──────────────┐              ┌──────────────┐             │
│  │ Seleccionar  │              │  Plataforma  │             │
│  │ Consultorio  │              │  Google Meet │             │
│  └──────────────┘              └──────────────┘             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         PASO 2: Selección de Fecha y Hora                   │
│                                                               │
│  Horarios según tipo:                                        │
│  • Presencial → consultorio.schedule                        │
│  • Online → onlineConsultation.schedule                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         PASO 3: Servicios Adicionales                        │
│                                                               │
│  Servicios según tipo:                                       │
│  • Presencial → consultorio.services                        │
│  • Online → onlineConsultation.services                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         PASO 4: Pago y Confirmación                          │
│                                                               │
│  Precio según tipo:                                          │
│  • Presencial → consultorio.consultationFee                 │
│  • Online → onlineConsultation.consultationFee              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Cita Creada en Base de Datos                    │
│                                                               │
│  appointment {                                               │
│    consultationType: 'presencial' | 'online'                │
│    doctorAddress: string                                     │
│    meetingLink?: string                                      │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Estructura de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                        Doctor                                │
├─────────────────────────────────────────────────────────────┤
│  • id: string                                                │
│  • name: string                                              │
│  • consultationFee: number (precio base presencial)         │
│  • schedule: Schedule (horario base presencial)             │
│  • addresses?: DoctorAddress[] ────────┐                    │
│  • onlineConsultation?: OnlineConsultation ─┐               │
└─────────────────────────────────────────────┼───────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
      ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
      │   DoctorAddress      │  │   DoctorAddress      │  │ OnlineConsultation   │
      │   (Consultorio 1)    │  │   (Consultorio 2)    │  │                      │
      ├──────────────────────┤  ├──────────────────────┤  ├──────────────────────┤
      │ • id: "addr-1"       │  │ • id: "addr-2"       │  │ • enabled: true      │
      │ • name: "Centro"     │  │ • name: "Norte"      │  │ • consultationFee:   │
      │ • address: "Av..."   │  │ • address: "Calle.." │  │   5000               │
      │ • consultationFee:   │  │ • consultationFee:   │  │ • platform:          │
      │   8000               │  │   7000               │  │   "Google Meet"      │
      │ • schedule: {...}    │  │ • schedule: {...}    │  │ • schedule: {...}    │
      │ • services: [...]    │  │ • services: [...]    │  │ • services: [...]    │
      └──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

## Lógica de Selección de Configuración

```typescript
// En src/app/doctors/[id]/page.tsx

const currentAddress = useMemo(() => {
  if (!doctor) return null;
  
  // CASO 1: Consulta Online
  if (consultationType === 'online' && doctor.onlineConsultation?.enabled) {
    return {
      id: 'online',
      name: 'Consulta Online',
      address: 'Videollamada',
      city: doctor.city,
      schedule: doctor.onlineConsultation.schedule,      // ← Horario online
      consultationFee: doctor.onlineConsultation.consultationFee, // ← Precio online
      services: doctor.onlineConsultation.services || doctor.services
    };
  }
  
  // CASO 2: Consulta Presencial con múltiples consultorios
  if (doctor.addresses && doctor.addresses.length > 0 && selectedAddressId) {
    return doctor.addresses.find(a => a.id === selectedAddressId) || doctor.addresses[0];
  }
  
  // CASO 3: Consulta Presencial con consultorio único (legacy)
  return {
    id: 'legacy',
    name: 'Consultorio Principal',
    address: doctor.address,
    city: doctor.city,
    schedule: doctor.schedule,
    consultationFee: doctor.consultationFee,
    services: doctor.services
  };
}, [doctor, selectedAddressId, consultationType]);
```

## Componentes Visuales

### Tarjeta de Cita - Presencial
```
┌─────────────────────────────────────────────────────┐
│ Juan Pérez                              $8,000      │
│ 📅 15 Dic 2025    🕐 10:00                          │
│ 📍 Av. Principal 123, Buenos Aires                  │
│                                                      │
│ [💬 Chat]  [👁️ Ver Detalles]  [WhatsApp]           │
└─────────────────────────────────────────────────────┘
```

### Tarjeta de Cita - Online
```
┌─────────────────────────────────────────────────────┐
│ María García                            $5,000      │
│ 📅 16 Dic 2025    🕐 19:00                          │
│ 📹 Consulta Online (Google Meet)                    │
│                                                      │
│ [💬 Chat]  [👁️ Ver Detalles]  [WhatsApp]           │
└─────────────────────────────────────────────────────┘
```

## Base de Datos

### Tabla: doctors
```sql
┌────────────────────────────────────────────────────────────┐
│ id │ name         │ consultation_fee │ online_consultation │
├────┼──────────────┼──────────────────┼─────────────────────┤
│ 1  │ Dr. Pérez    │ 8000             │ {                   │
│    │              │                  │   "enabled": true,  │
│    │              │                  │   "consultationFee":│
│    │              │                  │   5000,             │
│    │              │                  │   "platform":       │
│    │              │                  │   "Google Meet",    │
│    │              │                  │   "schedule": {...} │
│    │              │                  │ }                   │
└────┴──────────────┴──────────────────┴─────────────────────┘
```

### Tabla: appointments
```sql
┌────────────────────────────────────────────────────────────────────┐
│ id │ patient │ doctor │ date       │ consultation_type │ meeting_link │
├────┼─────────┼────────┼────────────┼───────────────────┼──────────────┤
│ 1  │ Juan    │ Dr. P  │ 2025-12-15 │ presencial        │ NULL         │
│ 2  │ María   │ Dr. P  │ 2025-12-16 │ online            │ meet.google..│
└────┴─────────┴────────┴────────────┴───────────────────┴──────────────┘
```

## Casos de Uso

### Caso 1: Médico con Consultorio Físico y Online
```
Dr. Juan Pérez - Cardiólogo

Lunes:
  09:00-13:00 → Presencial (Consultorio Centro) - $8,000
  19:00-21:00 → Online (Google Meet) - $5,000

Martes:
  14:00-18:00 → Presencial (Consultorio Norte) - $7,000
  19:00-21:00 → Online (Google Meet) - $5,000

Miércoles:
  09:00-13:00 → Presencial (Consultorio Centro) - $8,000
```

### Caso 2: Médico Solo Online
```
Dra. Ana López - Psicóloga

Lunes a Viernes:
  10:00-20:00 → Online (Zoom) - $4,500

Sábado:
  10:00-14:00 → Online (Zoom) - $4,500
```

### Caso 3: Médico Solo Presencial (Sin cambios)
```
Dr. Carlos Ruiz - Traumatólogo

Lunes a Viernes:
  08:00-12:00 → Presencial (Consultorio) - $10,000
  14:00-18:00 → Presencial (Consultorio) - $10,000
```

## Ventajas del Sistema

1. **Flexibilidad Total**
   - Médicos pueden ofrecer ambas modalidades
   - Horarios independientes para cada tipo
   - Precios diferenciados

2. **Experiencia de Usuario**
   - Selección clara del tipo de consulta
   - Indicadores visuales distintivos
   - Información completa en cada paso

3. **Escalabilidad**
   - Fácil agregar nuevas plataformas
   - Configuración por JSON flexible
   - Compatible con sistema existente

4. **Reportes y Análisis**
   - Separación clara de métricas
   - Análisis de rentabilidad por modalidad
   - Optimización de horarios

## Próximas Mejoras

1. **Generación Automática de Links**
   ```typescript
   // Integración con Zoom API
   const meetingLink = await createZoomMeeting({
     topic: `Consulta con ${doctor.name}`,
     start_time: appointmentDateTime,
     duration: 30
   });
   ```

2. **Notificaciones Inteligentes**
   ```typescript
   // 24 horas antes
   sendEmail({
     subject: "Recordatorio: Consulta Online Mañana",
     body: `Link de reunión: ${appointment.meetingLink}`
   });
   
   // 15 minutos antes
   sendSMS({
     message: `Tu consulta online comienza en 15 min: ${appointment.meetingLink}`
   });
   ```

3. **Panel de Control para Médicos**
   - Activar/desactivar consultas online
   - Configurar horarios visualmente
   - Ver estadísticas separadas
   - Gestionar plataformas

4. **Integración con Calendario**
   - Sincronización con Google Calendar
   - Eventos con link de videollamada
   - Recordatorios automáticos

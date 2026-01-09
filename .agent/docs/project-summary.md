# 📚 SUMA - Sistema Unificado de Medicina Avanzada

## 🎯 Descripción General

SUMA es una plataforma integral de gestión médica para Argentina que conecta doctores, pacientes y administradores en un ecosistema digital completo.

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Next.js API Routes, Server Actions
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Storage**: Firebase Storage (archivos grandes)
- **Pagos**: MercadoPago
- **UI**: shadcn/ui, Tailwind CSS
- **Gráficos**: Recharts
- **Mapas**: Google Maps API

### Estructura de Directorios
```
suma-argentina/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── auth/              # Páginas de autenticación
│   │   ├── doctors/           # Perfiles públicos de doctores
│   │   ├── admin/             # Panel de administración
│   │   └── actions.ts         # Server Actions
│   ├── components/            # Componentes React
│   │   ├── ui/               # Componentes base (shadcn)
│   │   ├── doctor/           # Componentes del doctor
│   │   ├── admin/            # Componentes del admin
│   │   └── seller/           # Componentes de vendedoras
│   ├── lib/                   # Utilidades y configuración
│   │   ├── types.ts          # Tipos TypeScript
│   │   ├── supabaseService.ts # Servicio de Supabase
│   │   ├── auth.tsx          # Context de autenticación
│   │   └── notifications.tsx  # Sistema de notificaciones
│   └── styles/
├── database/
│   ├── migrations/           # Migraciones SQL
│   └── schema.sql           # Schema completo
├── public/                   # Archivos estáticos
└── .agent/
    └── docs/                # Documentación del proyecto
```

## 👥 Roles del Sistema

### 1. **Pacientes**
- Buscar y filtrar doctores
- Agendar citas online y presenciales
- Ver historial médico
- Chat con doctores
- Gestionar perfil

### 2. **Doctores**
- Dashboard completo
- Gestión de citas
- Múltiples consultorios
- Consultas online
- **Módulo financiero avanzado** con estadísticas
- Gestión de servicios y precios
- Sistema de verificación de matrícula
- Chat con pacientes
- Historial médico de pacientes

### 3. **Administradores**
- Gestión de doctores (aprobar, verificar matrículas)
- Gestión de vendedoras
- Configuración del sistema
- Soporte técnico
- Gestión de pagos

### 4. **Vendedoras**
- Gestión de doctores asignados
- Comisiones
- Reportes de ventas

## 🔐 Autenticación y Seguridad

- **Supabase Auth** para autenticación
- **Row Level Security (RLS)** en todas las tablas
- **Roles**: patient, doctor, admin, seller
- **Políticas de acceso** granulares por rol
- **Validación** en cliente y servidor

## 💾 Base de Datos

### Tablas Principales
- `users` - Usuarios del sistema
- `doctors` - Información de doctores
- `appointments` - Citas médicas
- `medical_records` - Historiales médicos
- `support_tickets` - Tickets de soporte
- `doctor_payments` - Pagos de suscripción
- `settings` - Configuración global

### Características de la BD
- **Migraciones versionadas** en `database/migrations/`
- **Triggers** para notificaciones automáticas
- **Funciones** para lógica compleja
- **Índices** optimizados para búsquedas

## 🌍 Localización Argentina

- **Ciudades**: Buenos Aires, Córdoba, Rosario, Mendoza, etc.
- **Moneda**: Pesos argentinos ($)
- **Idioma**: Español (es-AR)
- **Formato de fechas**: dd/MM/yyyy
- **Métodos de pago**: Efectivo, Transferencia, MercadoPago

## 📱 Características Principales

### Para Doctores
1. **Gestión de Consultorios Múltiples**
   - Direcciones independientes
   - Horarios personalizados por consultorio
   - Duración de citas configurable por ubicación

2. **Consultas Online**
   - Videollamadas integradas
   - Horarios separados
   - Precios diferenciados

3. **Módulo Financiero Avanzado** ⭐ NUEVO
   - Estadísticas por consultorio
   - Gráficos interactivos (Recharts)
   - KPIs: Valor promedio, margen de beneficio, tasa de conversión
   - Tendencias mensuales
   - Distribución de gastos por categoría
   - Análisis de métodos de pago

4. **Sistema de Verificación**
   - Matrícula médica verificada por admin
   - Badge visible para pacientes
   - Estados: Pendiente/Verificado/Rechazado

5. **Gestión de Gastos**
   - 12 categorías predefinidas
   - Asignación por consultorio
   - Reportes y análisis

### Para Pacientes
1. **Búsqueda Avanzada**
   - Por especialidad, ciudad, nombre
   - Filtros múltiples
   - Resultados paginados

2. **Sistema de Citas**
   - Reserva online
   - Selección de servicios
   - Aplicación de cupones
   - Múltiples métodos de pago

3. **Historial Médico**
   - Registros por cita
   - Diagnósticos y tratamientos
   - Prescripciones

4. **Confianza**
   - Doctores verificados (badge)
   - Reseñas y calificaciones
   - Información transparente

## 🔄 Estado Actual del Sistema

### ✅ Completado
- [x] Autenticación multi-rol
- [x] Dashboard de doctores
- [x] Dashboard de administradores
- [x] Sistema de citas
- [x] Consultas online
- [x] Múltiples consultorios
- [x] Módulo financiero con gráficos
- [x] Sistema de verificación de matrículas
- [x] Categorías de gastos predefinidas
- [x] Duración de citas por consultorio
- [x] Historial médico
- [x] Chat en tiempo real
- [x] Sistema de notificaciones
- [x] Integración MercadoPago

### 🚧 En Progreso
- [ ] Exportación de datos financieros (Excel/PDF)
- [ ] Proyecciones financieras
- [ ] Alertas automáticas

### 📋 Pendiente
Ver `pending-tasks.md` para lista completa

## 🚀 Deployment

- **Producción**: Firebase Hosting / Vercel
- **Base de Datos**: Supabase Cloud
- **Variables de entorno**: Ver `.env.example`

## 📖 Documentación Adicional

- `features-implemented.md` - Funcionalidades detalladas
- `pending-tasks.md` - Tareas pendientes
- `architecture.md` - Arquitectura técnica detallada
- `api-reference.md` - Referencia de API

---

**Última actualización**: 2025-12-20
**Versión**: 2.0.0

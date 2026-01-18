# Changelog

## [2026-01-17] - Módulo de Soporte Clínica
### Added
- **Panel Soporte Clínica**: Implementación completa de `SupportTab` para clínicas, permitiendo crear tickets y chatear.
- **Panel Soporte Admin**: Actualización para filtrar y gestionar tickets de rol `clinic`.
- **Backend**: Funciones `createClinicSupportTicket`, `getClinicSupportTickets` y actualización de `addMessageToSupportTicket` para manejo robusto de notificaciones (`read_by_clinic`).
- **DB Migration**: Script SQL para añadir columna `read_by_clinic`.

## [2024-12-31] - Filtrado Avanzado Dashboard Clínica
### Added
- **Componente DatePickerWithRange**: Selector de rango de fechas reutilizable basado en Shadcn UI + React Day Picker.
- **Filtros en DoctorsTab**: Botones de preset (Hoy, 7 Días, Mes) y selector de rango custom.
- **Filtros en ServicesTab**: Botones de preset y selector de rango custom.
- **Advanced Detail View filters**: Añadidos filtros de fecha dentro del panel lateral "Ver Detalles" para médicos y servicios.
- **Backend support**: Actualizadas funciones `getClinicAppointments`, `getDoctorAppointmentHistory`, `getServiceAppointmentHistory` en `supabaseService.ts` para aceptar parámetros `startDate` y `endDate`.

### Fixed
- **getDoctorAppointments Query**: Corregido error en JOIN con tabla `patients`. Se cambió a `select('*')` simple para evitar errores de RLS/FK faltantes.
- **Regex Compatibility**: Corregido flag no soportado (`/s`) en regex de `supabaseService.ts` para compatibilidad con targets ES antiguos.
- **UI Bugs**: Corregidos errores de sintaxis en `doctors-tab.tsx` (missing parenthesis) y `services-tab.tsx` (stray characters).

## [2024-12-24] - Soporte y Validaciones
### Added
- Sistema de Tickets de Soporte con chat en tiempo real.
- Validación estricta de campos únicos (Email, DNI, Licencia) con API dedicada `/api/validate-unique`.
- Flujo de "Walk-in" para crear pacientes y citas en el momento.

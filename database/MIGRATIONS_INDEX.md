# 📋 Índice de Migraciones de Base de Datos

> Última actualización: 2026-02-12

## Carpeta `database/migrations/` — Migraciones Estructurales

Estas migraciones definen la estructura principal de la base de datos en Supabase.

| # | Archivo | Descripción | Tablas/Objetos |
|---|---------|-------------|----------------|
| 001 | `001_supabase_auth_complete.sql` | Auth con Supabase: perfiles, sesiones, MFA, magic links | `user_profiles`, `user_sessions`, `auth_audit_log`, `user_mfa`, `magic_links`, `password_reset_requests` |
| 002 | `002_pharmacies_laboratories.sql` | Farmacias, laboratorios, recetas digitales | `pharmacies`, `laboratories`, `prescriptions`, `laboratory_orders`, `prescription_dispensation_history` |
| 003 | `003_add_foreign_keys.sql` | FKs de `user_profiles` → tablas de rol | FKs a `patients`, `doctors`, `sellers`, `pharmacies`, `laboratories` |
| 004 | `004_notifications_system.sql` | Sistema de notificaciones multi-canal | `notification_logs`, `push_subscriptions`, `notification_preferences`, `scheduled_notifications` |
| 005 | `005_doctor_integrations.sql` | Integraciones OAuth (MercadoPago) | `doctor_integrations` |
| 006 | `006_medical_records.sql` | Historia clínica electrónica (HCE) | `patient_conditions`, `patient_allergies`, `family_history`, `medical_records`, `medical_attachments` |
| 007 | `007_add_doctor_verification.sql` | Campos de verificación de doctores | Columnas en `doctors`: `verified`, `verification_notes`, `verified_at`, `verified_by` |
| 007b | `007b_analytics.sql` | Funciones RPC para dashboards | Funciones: `get_admin_monthly_revenue()`, `get_top_performing_doctors()`, `get_doctor_analytics()`, `get_admin_kpis()` |
| 008 | `008_add_medical_license.sql` | Matrícula médica | Columna `medical_license` en `doctors` |
| 009 | `009_update_doctors_patients_schema.sql` | Tipo de documento y sector | Columnas `document_type`, `sector` en `doctors`; `document_type` en `patients` |
| 010 | `010_add_patient_birth_date.sql` | Fecha de nacimiento de pacientes | Columna `birth_date` en `patients` |
| 011 | `011_add_online_consultations.sql` | Consultas online / telemedicina | Columna `online_consultation` en `doctors`; `consultation_type`, `meeting_link` en `appointments` |

---

## Carpeta `supabase/migrations/` — Migraciones Incrementales

Estas son las migraciones gestionadas por el CLI de Supabase con timestamps.

| Archivo | Descripción |
|---------|-------------|
| `001_initial_schema.sql` | Esquema base inicial (patients, doctors, appointments, etc.) |
| `002_storage_policies.sql` | Políticas de storage para archivos |
| `20241229_create_clinic_module.sql` | Módulo de clínicas |
| `20241229_create_secretaries_table.sql` | Tabla de secretarias |
| `20241230_add_appointments_service_columns.sql` | Columnas de servicio en citas |
| `20241230_add_clinic_coupons.sql` | Cupones de clínicas |
| `20241230_add_clinic_specialties.sql` | Especialidades de clínicas |
| `20241230_add_items_to_clinic_services.sql` | Items en servicios de clínicas |
| `20241230_add_payment_settings_to_clinics.sql` | Configuración de pagos (clínicas) |
| `20241230_add_payment_settings_to_doctors.sql` | Configuración de pagos (doctores) |
| `20241230_create_clinic_expenses.sql` | Gastos de clínicas |
| `20241230_create_clinic_patient_chat.sql` | Chat clínica-paciente |
| `20241230_create_patient_communications.sql` | Comunicaciones con pacientes |
| `20250107_create_family_members.sql` | Miembros familiares |
| `20250108_add_accepted_insurances.sql` | Obras sociales aceptadas |
| `20250108_create_secretaries_manual.sql` | Secretarias (manual) |
| `20250110_add_clinic_subscription_system.sql` | Sistema de suscripción de clínicas |
| `20250110_add_status_to_clinics.sql` | Estado de clínicas |
| `20260109_add_document_type_to_doctors.sql` | Tipo de documento (doctores) |
| `20260109_add_document_type_to_family_members.sql` | Tipo de documento (familiares) |
| `20260110_add_coupons_to_doctors.sql` | Cupones de doctores |
| `20260116_add_favorite_clinic_ids.sql` | Clínicas favoritas |
| `20260116_create_audit_logs.sql` | Logs de auditoría |
| `20260117_add_clinic_location_fields.sql` | Campos de ubicación de clínicas |
| `20260117_support_tickets_update.sql` | Actualización tickets de soporte |
| `20260120_add_medical_record_fields.sql` | Campos adicionales de historia clínica |
| `20260120_add_patient_profile_fields.sql` | Campos de perfil de pacientes |
| `20260203_create_doctor_patient_chat.sql` | Chat doctor-paciente |
| `20260204_add_gender_no_especificar.sql` | Opción "No especificar" en género |

---

## ⚠️ Notas Importantes

1. **Dos carpetas de migraciones**: `database/migrations/` contiene las migraciones estructurales principales, mientras que `supabase/migrations/` contiene migraciones incrementales gestionadas por Supabase CLI.

2. **Esquema inicial**: El esquema base (`001_initial_schema.sql` en `supabase/`) define las tablas core: `patients`, `doctors`, `appointments`, `sellers`, `clinics`, `settings`, `support_tickets`, `messages`, `reviews`, `notifications`.

3. **Tablas principales del sistema**:
   - `patients` — Pacientes
   - `doctors` — Doctores/Profesionales
   - `appointments` — Citas médicas
   - `clinics` — Clínicas
   - `sellers` — Vendedoras
   - `settings` — Configuración global
   - `user_profiles` — Perfiles unificados (Auth)
   - `medical_records` — Historia clínica
   - `prescriptions` — Recetas digitales
   - `family_members` — Miembros familiares
   - `audit_logs` — Auditoría

4. **Todas las tablas sensibles tienen RLS activado**.

5. **SQL fixes históricos** almacenados en `docs/sql-fixes/` como referencia.

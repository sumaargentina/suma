# Estado del Proyecto y Tareas Pendientes

## 🟢 Lo que está LISTO y funcionando
1.  **Marketplace de Citas**: Landing page, búsqueda de médicos, agenda y reservas.
2.  **Infraestructura de Pagos (MercadoPago Integration)**: Backend listo para cobrar comisiones y pagar a médicos.
3.  **Historia Clínica Electrónica (HCE)**: 
    - Módulo Doctor (Crear evoluciones, diagnósticos, ver línea de tiempo).
    - Módulo Paciente (Ver historial y resúmenes).
    - Adaptabilidad para Clínicas de Estética/Bienestar.
4.  **Analíticas (BI)**:
    - Panel Admin (`/admin/dashboard/analytics`): Ingresos globales y rankings.
    - Panel Médico (`/doctor/dashboard/analytics`): Ingresos personales.

## 🟡 Tareas Inmediatas de Configuración (CRÍTICO)
Para que el sistema cobre dinero real, debes configurar esto:
- [ ] **Credenciales MercadoPago**:
    - Obtener `MP_APP_ID` y `MP_CLIENT_SECRET` en MercadoPago Developers.
    - Agregarlos al archivo `.env.local` (ver `ADMIN_ONLY_MERCADOPAGO_SETUP.md`).
    - Configurar la URI de redirección.

- [ ] **Base de Datos**:
    - Asegurarse de haber ejecutado los scripts SQL:
        - `005_doctor_integrations.sql`
        - `006_medical_records.sql`
        - `007_analytics.sql`

## 🔴 Roadmap Futuro (Pausado)
Estas son las funciones ideales para la próxima fase ("Siguiente Nivel"):

### 1. Receta Digital (E-Prescriptions)
- **Concepto**: El médico genera PDF con QR desde la consulta.
- **Falta**: Frontend para generar receta y vista de Farmacia para validarla.
- **Tablas**: Ya existen (`prescriptions`, `pharmacies`).

### 2. Notificaciones Automáticas (WhatsApp/Email)
- **Concepto**: Recordatorios automáticos 24h antes para reducir ausentismo.
- **Falta**: Integración con Twilio/Resend (Backend service existe, falta activar triggers).

### 3. Sistema de Referidos
- **Concepto**: Médicos derivando pacientes a otros especialistas de la red.
- **Falta**: Tablas de referidos y UI de derivación.

### 4. App Móvil (PWA)
- **Concepto**: Mejorar la experiencia en celulares Android/iOS.
- **Falta**: Refinar la configuración de `next-pwa` y manifest.

---
*Última actualización: 15 de Diciembre 2025*

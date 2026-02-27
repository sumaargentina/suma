# 📱 SISTEMA DE NOTIFICACIONES - GUÍA DE CONFIGURACIÓN

## ✅ ARCHIVOS CREADOS

### Servicios:
- `src/lib/notifications/notification-service.ts` - Servicio principal
- `src/lib/notifications/whatsapp-service.ts` - WhatsApp vía Twilio
- `src/lib/notifications/email-service.ts` - Email vía Resend
- `src/lib/notifications/push-service.ts` - Push Notifications

### Base de Datos:
- `database/migrations/004_notifications_system.sql` - Tablas y triggers

---

## 🚀 PASO 1: EJECUTAR MIGRACIÓN SQL

1. Ve a **Supabase Dashboard → SQL Editor**
2. Abre: `database/migrations/004_notifications_system.sql`
3. Copia TODO el contenido
4. Pega en SQL Editor
5. **Run**

---

## 🔑 PASO 2: OBTENER CREDENCIALES

### A) TWILIO (WhatsApp)

1. Ve a: [https://www.twilio.com/console](https://www.twilio.com/console)
2. Crea una cuenta (trial gratis)
3. Ve a: **Console → Account Info**
4. Copia:
   - `Account SID`
   - `Auth Token`

5. Para **WhatsApp Sandbox** (testing):
   - Ve a: **Messaging → Try it out → Send a WhatsApp message**
   - Sigue las instrucciones para conectar tu WhatsApp
   - Número sandbox: `+1 415 523 8886` (default de Twilio)

6. Para **WhatsApp Production** (después):
   - Ve a: **Messaging → WhatsApp → Senders**
   - Request approval para tu número

**Costo:** 
- Sandbox: GRATIS (para testing)
- Producción: ~$0.005 USD por mensaje (muy barato!)

---

### B) RESEND (Email)

1. Ve a: [https://resend.com](https://resend.com)
2. Crea una cuenta (100 emails/día GRATIS)
3. Ve a: **API Keys**
4. Click **Create API Key**
5. Copia la key (empieza con `re_...`)

6. **Verificar dominio** (opcional pero recomendado):
   - Ve a: **Domains**
   - Add domain
   - Agrega los registros DNS que te indique
   - Espera verificación (5-30 min)

**Costo:**
- Free tier: 100 emails/día, 3,000/mes
- Pro: $20/mes = 50,000 emails

---

### C) VAPID KEYS (Push Notifications)

**Generar keys automáticamente:**

```bash
node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log('PUBLIC:', keys.publicKey); console.log('PRIVATE:', keys.privateKey);"
```

Esto te dará 2 keys largas. Guárdalas.

---

## 📝 PASO 3: CONFIGURAR VARIABLES DE ENTORNO

Agrega a tu `.env.local`:

```env
# ===========================================
# NOTIFICACIONES
# ===========================================

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
# Para producción, cambia a: whatsapp:+54911XXXXXXXX

# Resend (Email)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=SUMA <noreply@tusitio.com>

# VAPID Keys (Push Notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
VAPID_SUBJECT=mailto:noreply@tusitio.com

# App URL (para links en emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✅ PASO 4: TESTING

### Test WhatsApp:

```typescript
import { whatsappService } from '@/lib/notifications/whatsapp-service';

// Tu número de WhatsApp (debe estar conectado al sandbox de Twilio primero)
await whatsappService.send({
  to: '+54911XXXXXXXX', // Tu número
  message: '¡Hola desde SUMA! 🎉 Este es un mensaje de prueba.'
});
```

### Test Email:

```typescript
import { emailService } from '@/lib/notifications/email-service';

await emailService.send({
  to: 'tucorreo@ejemplo.com',
  subject: 'Test desde SUMA',
  text: '¡Funciona! 🎉',
});
```

### Test Push:

```typescript
import { pushService } from '@/lib/notifications/push-service';

await pushService.send({
  userId: 'user-uuid-aqui',
  title: 'Test Push',
  body: '¡Funciona! 🎉',
});
```

### Test Completo (Confirmación de Cita):

```typescript
import { notificationService } from '@/lib/notifications/notification-service';

await notificationService.sendAppointmentConfirmation('appointment-uuid-aqui');
```

---

## 📊 VERIFICAR QUE TODO FUNCIONA

### En Supabase SQL Editor:

```sql
-- Ver logs de notificaciones
SELECT 
  type,
  channels,
  delivered,
  created_at
FROM notification_logs
ORDER BY created_at DESC
LIMIT 10;

-- Ver notificaciones programadas
SELECT 
  type,
  scheduled_for,
  status,
  created_at
FROM scheduled_notifications
WHERE status = 'pending'
ORDER BY scheduled_for;

-- Ver preferencias de usuarios
SELECT 
  user_id,
  whatsapp_enabled,
  email_enabled,
  push_enabled
FROM notification_preferences
LIMIT 10;
```

---

## 🎯 CÓMO SE USA EN TU APP

### 1. Al crear una cita:

```typescript
// En src/app/doctors/[id]/page.tsx (función handlePaymentSubmit)

// ... después de crear la cita exitosamente

// Enviar confirmación automática
await notificationService.sendAppointmentConfirmation(appointmentId);

// Los recordatorios se programan automáticamente vía trigger SQL
```

### 2. Para enviar notificación custom:

```typescript
import { notificationService } from '@/lib/notifications/notification-service';

await notificationService.send({
  userId: 'user-id',
  email: 'paciente@ejemplo.com',
  phone: '+5491112345678',
  subject: 'Resultado de laboratorio disponible',
  message: 'Tus resultados de laboratorio ya están disponibles. Revisa tu panel.',
  type: 'lab_results_ready',
  channels: ['email', 'whatsapp', 'push'],
  priority: 'high',
});
```

---

## 🔄 RECORDATORIOS AUTOMÁTICOS

El sistema automáticamente programa:

- **24 horas antes**: WhatsApp + Push
- **2 horas antes**: WhatsApp + Push

Estos se ejecutan vía:
- **Trigger SQL** al crear la cita
- **Cron job** o **Supabase Edge Function** para ejecutar los programados

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Error: "Twilio client not initialized"
**Solución:** Verifica que `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` estén en `.env.local`

### Error: "Resend client not initialized"
**Solución:** Verifica que `RESEND_API_KEY` esté en `.env.local`

### WhatsApp no llega
**Solución:** 
1. Verifica que conectaste tu número al sandbox de Twilio
2. Envía "join [palabra-clave]" al +1 415 523 8886 desde WhatsApp

### Email no llega
**Solución:**
1. Verifica en spam
2. Verifica que el dominio esté verificado en Resend
3. Usa un email de prueba primero

### Push no funciona
**Solución:**
1. Verifica que VAPID keys estén configuradas
2. El usuario debe aceptar notificaciones en el browser
3. Solo funciona en HTTPS (en producción)

---

## 💰 COSTOS ESTIMADOS

Para **1,000 citas/mes**:

- **WhatsApp:** 3,000 mensajes (recordatorios) = $15 USD/mes
- **Email:** Gratis (dentro del free tier de Resend)
- **Push:** Gratis (infraestructura propia)

**Total: ~$15 USD/mes**

**ROI:** Si reduces no-shows de 20% a 10%, eso son 100 citas más atendidas/mes

---

## 📈 PRÓXIMOS PASOS

1. ✅ Ejecutar migración SQL
2. ✅ Configurar credenciales
3. ✅ Hacer tests
4. ✅ Integrar en flujo de creación de citas
5. ⏳ Crear cron job para enviar notificaciones programadas
6. ⏳ Dashboard para administrar preferencias de notificaciones
7. ⏳ Analytics de entregas y aperturas

---

**Creado:** 2025-12-14
**Versión:** 1.0.0
**Documentación:** Este archivo

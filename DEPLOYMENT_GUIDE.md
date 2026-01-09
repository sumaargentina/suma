# Guía de Implementación en Producción - Consultas Online

## ⚠️ IMPORTANTE: Leer antes de implementar

Esta guía te llevará paso a paso para implementar el sistema de consultas online en producción de manera segura.

## Checklist Pre-Implementación

- [ ] Hacer backup completo de la base de datos
- [ ] Revisar todos los archivos modificados
- [ ] Probar en ambiente de desarrollo
- [ ] Verificar que el build compile sin errores
- [ ] Preparar plan de rollback

## Paso 1: Backup de Base de Datos

### En Supabase Dashboard:

1. Ve a tu proyecto en Supabase
2. Settings → Database → Backups
3. Crea un backup manual antes de continuar
4. Descarga el backup localmente como respaldo adicional

```bash
# Alternativamente, usando pg_dump (si tienes acceso)
pg_dump -h your-project.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Paso 2: Ejecutar Migraciones de Base de Datos

### En Supabase SQL Editor:

1. Abre el archivo `database/migrations/add_online_consultations.sql`
2. Copia el contenido completo
3. Pégalo en el SQL Editor de Supabase
4. Ejecuta el script
5. Verifica que no haya errores

### Verificación:

```sql
-- Verificar que las columnas se crearon correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'doctors' 
  AND column_name = 'online_consultation';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
  AND column_name IN ('consultation_type', 'meeting_link');
```

**Resultado esperado:**
- `doctors.online_consultation` → tipo `jsonb`
- `appointments.consultation_type` → tipo `character varying`
- `appointments.meeting_link` → tipo `text`

## Paso 3: Actualizar Código en Producción

### Opción A: Deploy con Vercel (recomendado)

```bash
# 1. Asegúrate de estar en la rama correcta
git status

# 2. Agregar archivos modificados
git add src/lib/types.ts
git add src/app/doctors/[id]/page.tsx
git add src/components/doctor/appointment-card.tsx
git add src/app/actions.ts

# 3. Agregar archivos de documentación
git add ONLINE_CONSULTATIONS.md
git add CHANGELOG_ONLINE_CONSULTATIONS.md
git add ARCHITECTURE_ONLINE_CONSULTATIONS.md
git add database/migrations/add_online_consultations.sql
git add database/examples/configure_online_consultations.sql

# 4. Commit
git commit -m "feat: Agregar soporte para consultas online

- Nuevo tipo OnlineConsultation con horarios y precios independientes
- Selector de tipo de consulta en página de doctor
- Indicadores visuales para citas online
- Documentación completa y scripts de migración
- Compatible con sistema existente (backward compatible)"

# 5. Push a producción
git push origin main

# 6. Vercel desplegará automáticamente
# Monitorea el deploy en: https://vercel.com/dashboard
```

### Opción B: Deploy Manual

```bash
# 1. Build local para verificar
npm run build

# 2. Si el build es exitoso, sube los cambios
# (según tu método de deploy)
```

## Paso 4: Configurar Primer Médico con Consultas Online

### Prueba con un médico de confianza primero:

1. Abre `database/examples/configure_online_consultations.sql`
2. Identifica un médico para la prueba:

```sql
-- Buscar médico
SELECT id, name, email, specialty 
FROM doctors 
WHERE name ILIKE '%nombre%'
LIMIT 5;
```

3. Copia el ID del médico
4. Usa el Ejemplo 1 del archivo de configuración:

```sql
UPDATE doctors 
SET online_consultation = '{
  "enabled": true,
  "consultationFee": 5000,
  "platform": "Google Meet",
  "schedule": {
    "monday": {"active": true, "slots": [{"start": "19:00", "end": "21:00"}]},
    "tuesday": {"active": true, "slots": [{"start": "19:00", "end": "21:00"}]},
    "wednesday": {"active": false, "slots": []},
    "thursday": {"active": true, "slots": [{"start": "19:00", "end": "21:00"}]},
    "friday": {"active": true, "slots": [{"start": "19:00", "end": "20:00"}]},
    "saturday": {"active": false, "slots": []},
    "sunday": {"active": false, "slots": []}
  }
}'::jsonb
WHERE id = 'REEMPLAZAR_CON_ID_DEL_MEDICO';
```

5. Ejecuta la query
6. Verifica:

```sql
SELECT 
    name,
    online_consultation->>'enabled' as online_habilitado,
    online_consultation->>'consultationFee' as precio_online,
    online_consultation->>'platform' as plataforma
FROM doctors 
WHERE id = 'ID_DEL_MEDICO';
```

## Paso 5: Pruebas en Producción

### Test 1: Visualización

1. Ve a la página del médico configurado: `https://tuapp.com/doctors/[id]`
2. Verifica que aparezcan los botones:
   - ✅ "Presencial" (con ícono de edificio)
   - ✅ "Online" (con ícono de video)

### Test 2: Selección de Tipo

1. Haz clic en "Online"
2. Verifica que:
   - ✅ El selector de consultorio desaparece (si había múltiples)
   - ✅ Aparece "Consulta por Videollamada"
   - ✅ Se muestra la plataforma (ej: "Google Meet")

### Test 3: Horarios

1. Selecciona una fecha (ej: próximo lunes)
2. Verifica que:
   - ✅ Los horarios mostrados coinciden con el horario online configurado
   - ✅ No aparecen horarios del consultorio presencial

### Test 4: Precio

1. Continúa con el flujo de reserva
2. En el paso de pago, verifica:
   - ✅ El precio base es el de consulta online ($5,000 en el ejemplo)
   - ✅ No es el precio presencial

### Test 5: Crear Cita Online

1. Completa el flujo y crea una cita online
2. Verifica en la base de datos:

```sql
SELECT 
    id,
    patient_name,
    doctor_name,
    date,
    time,
    consultation_type,
    total_price
FROM appointments
WHERE doctor_id = 'ID_DEL_MEDICO'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
- `consultation_type` = `'online'`

### Test 6: Visualización de Cita

1. Ve al dashboard del médico
2. Verifica que la cita online muestre:
   - ✅ Ícono de video (📹)
   - ✅ Texto "Consulta Online" en azul
   - ✅ NO muestra dirección física

## Paso 6: Monitoreo Post-Deploy

### Primeras 24 horas:

```sql
-- Ver todas las citas online creadas
SELECT 
    COUNT(*) as total_citas_online,
    SUM(total_price) as ingresos_online
FROM appointments
WHERE consultation_type = 'online'
  AND created_at >= NOW() - INTERVAL '24 hours';

-- Ver médicos con consultas online habilitadas
SELECT 
    COUNT(*) as medicos_con_online
FROM doctors
WHERE online_consultation->>'enabled' = 'true';

-- Detectar posibles errores
SELECT 
    id,
    doctor_id,
    consultation_type,
    doctor_address
FROM appointments
WHERE consultation_type = 'online'
  AND doctor_address IS NOT NULL
  AND doctor_address != 'Videollamada';
-- Esto no debería retornar resultados
```

### Logs a revisar:

```bash
# En Vercel Dashboard
# Buscar errores relacionados con:
# - "onlineConsultation"
# - "consultationType"
# - "currentAddress"
```

## Paso 7: Rollout Gradual

### Semana 1: Piloto
- ✅ 1-3 médicos de confianza
- ✅ Monitoreo diario
- ✅ Recopilar feedback

### Semana 2: Expansión Limitada
- ✅ 10-20 médicos más
- ✅ Diferentes especialidades
- ✅ Monitoreo cada 2 días

### Semana 3: Rollout Completo
- ✅ Ofrecer a todos los médicos interesados
- ✅ Crear tutorial para médicos
- ✅ Soporte activo

## Paso 8: Comunicación

### Email a Médicos (Plantilla):

```
Asunto: 🎉 Nueva Funcionalidad: Consultas Online

Estimado Dr./Dra. [Nombre],

Nos complace informarle que ahora puede ofrecer consultas online a través de nuestra plataforma.

Beneficios:
✅ Horarios flexibles (puede atender desde casa)
✅ Precio diferenciado (puede ser menor que presencial)
✅ Mayor alcance (pacientes de otras ciudades)
✅ Plataforma de su elección (Zoom, Google Meet, etc.)

¿Cómo activarlo?
Contáctenos respondiendo este email y le configuraremos sus consultas online según su disponibilidad.

Saludos,
Equipo SUMA
```

### Email a Pacientes (Plantilla):

```
Asunto: 📹 Ahora puedes consultar a tu médico online

Hola [Nombre],

¡Tenemos buenas noticias! Ahora puedes agendar consultas online con tus médicos favoritos.

Ventajas:
✅ Desde la comodidad de tu hogar
✅ Ahorra tiempo de traslado
✅ Precios accesibles
✅ Misma calidad de atención

¿Cómo funciona?
1. Entra al perfil de tu médico
2. Selecciona "Consulta Online"
3. Elige fecha y hora
4. ¡Listo! Recibirás el link de videollamada

Pruébalo ahora: [Link a la app]

Saludos,
Equipo SUMA
```

## Plan de Rollback (Si algo sale mal)

### Opción 1: Rollback de Código (Rápido)

```bash
# 1. Revertir el último commit
git revert HEAD

# 2. Push
git push origin main

# 3. Vercel desplegará la versión anterior automáticamente
```

### Opción 2: Rollback de Base de Datos (Si es necesario)

```sql
-- Desactivar todas las consultas online
UPDATE doctors 
SET online_consultation = jsonb_set(
    COALESCE(online_consultation, '{}'::jsonb),
    '{enabled}',
    'false'::jsonb
)
WHERE online_consultation->>'enabled' = 'true';

-- Verificar
SELECT COUNT(*) 
FROM doctors 
WHERE online_consultation->>'enabled' = 'true';
-- Debería retornar 0
```

### Opción 3: Rollback Completo (Último recurso)

```sql
-- Eliminar columnas agregadas
ALTER TABLE doctors DROP COLUMN IF EXISTS online_consultation;
ALTER TABLE appointments DROP COLUMN IF EXISTS consultation_type;
ALTER TABLE appointments DROP COLUMN IF EXISTS meeting_link;

-- Restaurar desde backup
-- (usar el backup creado en Paso 1)
```

## Métricas de Éxito

### Semana 1:
- [ ] Al menos 1 médico con consultas online activas
- [ ] Al menos 3 citas online agendadas
- [ ] 0 errores críticos reportados
- [ ] Feedback positivo de médicos piloto

### Mes 1:
- [ ] 10+ médicos con consultas online
- [ ] 50+ citas online completadas
- [ ] Tasa de satisfacción > 4.5/5
- [ ] Tiempo de respuesta < 2s en página de doctor

## Soporte y Contacto

### Durante el rollout:
- **Slack**: #consultas-online-support
- **Email**: soporte@sumasalud.app
- **Teléfono**: [Número de emergencia]

### Documentación:
- `ONLINE_CONSULTATIONS.md` - Guía general
- `ARCHITECTURE_ONLINE_CONSULTATIONS.md` - Arquitectura técnica
- `CHANGELOG_ONLINE_CONSULTATIONS.md` - Resumen de cambios

## ✅ Checklist Final

Antes de marcar como completado:

- [ ] Backup de base de datos creado
- [ ] Migraciones ejecutadas sin errores
- [ ] Código desplegado en producción
- [ ] Al menos 1 médico configurado para pruebas
- [ ] Todas las pruebas pasaron exitosamente
- [ ] Monitoreo configurado
- [ ] Plan de rollback documentado
- [ ] Equipo notificado del deploy
- [ ] Documentación actualizada
- [ ] Comunicación a usuarios enviada (opcional en fase piloto)

---

**Última actualización**: 2025-12-09
**Versión**: 1.0.0
**Responsable**: [Tu nombre]

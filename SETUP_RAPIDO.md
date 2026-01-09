# 🚀 CONFIGURACIÓN AUTOMÁTICA DE SUPABASE

## ⚡ PASOS RÁPIDOS (Solo 3 cosas que hacer manualmente)

### ✅ Paso 1: Copiar Variables de Entorno (30 segundos)

Abre tu archivo `.env` y pega estas 3 líneas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fnjdqdwpttmrpzbqzbqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuamRxZHdwdHRtcnB6YnF6YnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODIxNzcsImV4cCI6MjA3OTg1ODE3N30.SqE1FWYn0nMrT4OOYtmDLlRJKpDOWue2iDlQqyvqKGQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuamRxZHdwdHRtcnB6YnF6YnFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MjE3NywiZXhwIjoyMDc5ODU4MTc3fQ.ToWEbG_ZPxN3GTLAiDCtpgSg-NKoT8ZcivdA6W5_xYk
```

---

### ✅ Paso 2: Ejecutar Script SQL (2 minutos)

1. **Abre este link:** https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/editor

2. **Click en "New query"**

3. **Copia y pega** el contenido completo del archivo:
   ```
   supabase/migrations/001_initial_schema.sql
   ```

4. **Click en "Run"** (botón verde) o presiona `Ctrl+Enter`

5. **Espera** a que termine (debería decir "Success")

---

### ✅ Paso 3: Crear Buckets y Ejecutar Políticas (3 minutos)

#### 3.1 Crear los 4 buckets:

**Abre este link:** https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/storage/buckets

Click en **"New bucket"** 4 veces y crea:

1. **Nombre:** `profile-images` → **Public:** ✅ SÍ
2. **Nombre:** `payment-proofs` → **Public:** ❌ NO
3. **Nombre:** `settings-images` → **Public:** ✅ SÍ
4. **Nombre:** `main-page-images` → **Public:** ✅ SÍ

#### 3.2 Configurar políticas de storage:

1. **Vuelve al SQL Editor:** https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/editor

2. **Click en "New query"**

3. **Copia y pega** el contenido completo del archivo:
   ```
   supabase/migrations/002_storage_policies.sql
   ```

4. **Click en "Run"**

---

## 🎉 ¡LISTO!

Una vez completados estos 3 pasos, ejecuta:

```bash
npm run dev
```

Y tu aplicación estará usando Supabase en lugar de Firebase.

---

## 📋 Resumen de lo que hice automáticamente:

✅ Instalé `@supabase/supabase-js`
✅ Creé cliente de Supabase (`src/lib/supabase.ts`)
✅ Creé cliente admin (`src/lib/supabase-admin.ts`)
✅ Creé servicio completo de base de datos (`src/lib/supabaseService.ts`)
✅ Creé helpers de autenticación (`src/lib/client-auth-supabase.ts`)
✅ Creé esquema SQL completo (`supabase/migrations/001_initial_schema.sql`)
✅ Creé script de políticas de storage (`supabase/migrations/002_storage_policies.sql`)
✅ Actualicé tipos para remover dependencias de Firebase
✅ Configuré las credenciales en el código

---

## ⚠️ Lo que necesitas hacer manualmente (solo 3 cosas):

1. ❌ Copiar variables al `.env` (30 segundos)
2. ❌ Ejecutar script SQL principal (2 minutos)
3. ❌ Crear buckets y ejecutar políticas (3 minutos)

**Total: ~5 minutos de trabajo manual**

---

## 🔗 Links Directos:

- **SQL Editor:** https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/editor
- **Storage:** https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/storage/buckets
- **Table Editor:** https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/editor

---

## 🆘 Si algo falla:

1. Verifica que las variables estén en `.env`
2. Asegúrate de ejecutar TODO el script SQL
3. Verifica que los 4 buckets estén creados
4. Ejecuta el script de políticas de storage
5. Reinicia con `npm run dev`

¡Avísame cuando termines y verifico que todo funcione!

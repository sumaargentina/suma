# 🚀 SOLO 3 PASOS - 5 MINUTOS

## ✅ TODO EL CÓDIGO YA ESTÁ MIGRADO

Solo necesitas hacer 3 cosas en Supabase:

---

## 📝 PASO 1: Copiar al .env (30 segundos)

Abre tu archivo `.env` y pega estas 3 líneas:

```
NEXT_PUBLIC_SUPABASE_URL=https://fnjdqdwpttmrpzbqzbqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuamRxZHdwdHRtcnB6YnF6YnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODIxNzcsImV4cCI6MjA3OTg1ODE3N30.SqE1FWYn0nMrT4OOYtmDLlRJKpDOWue2iDlQqyvqKGQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuamRxZHdwdHRtcnB6YnF6YnFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MjE3NywiZXhwIjoyMDc5ODU4MTc3fQ.ToWEbG_ZPxN3GTLAiDCtpgSg-NKoT8ZcivdA6W5_xYk
```

---

## 🗄️ PASO 2: Ejecutar SQL (2 minutos)

1. Abre: https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/editor
2. Click "New query"
3. Abre el archivo `supabase/migrations/001_initial_schema.sql`
4. Copia TODO (Ctrl+A, Ctrl+C)
5. Pégalo en Supabase (Ctrl+V)
6. Click "Run" (o Ctrl+Enter)

---

## 📦 PASO 3: Crear Buckets (3 minutos)

1. Abre: https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/storage/buckets

2. Click "New bucket" 4 veces:
   - Nombre: `profile-images` → Public: ✅ SÍ
   - Nombre: `payment-proofs` → Public: ❌ NO
   - Nombre: `settings-images` → Public: ✅ SÍ
   - Nombre: `main-page-images` → Public: ✅ SÍ

3. Vuelve al SQL Editor: https://supabase.com/dashboard/project/fnjdqdwpttmrpzbqzbqm/editor

4. Click "New query"

5. Abre el archivo `supabase/migrations/002_storage_policies.sql`

6. Copia TODO y pégalo

7. Click "Run"

---

## 🎉 ¡LISTO!

Ejecuta:
```bash
npm run dev
```

Tu aplicación ahora usa Supabase en lugar de Firebase.

---

## ✅ Checklist:
- [ ] Variables en .env
- [ ] SQL ejecutado
- [ ] 4 buckets creados
- [ ] Políticas ejecutadas
- [ ] npm run dev

¡Avísame si necesitas ayuda!

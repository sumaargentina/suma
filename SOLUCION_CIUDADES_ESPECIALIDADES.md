# 🚀 SOLUCIÓN: Ciudades y Especialidades Vacías

## ❌ PROBLEMA
Al intentar registrar médicos, los selectores de **especialidad** y **ciudad** aparecen vacíos.

## ✅ SOLUCIÓN

### Opción 1: Ejecutar Script SQL (RECOMENDADO)

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (en el menú izquierdo)
4. Copia y pega el contenido del archivo `INICIALIZAR_DATOS_ARGENTINA.sql`
5. Haz clic en **Run** ▶️
6. Recarga la página en tu navegación (`F5` o `Ctrl+R`)

### Opción 2: Crear Manualmente desde la UI

Si prefieres crear los datos desde la interfaz de administración:

1. Inicia sesión como **admin** en tu aplicación
2. Ve a **Admin Dashboard → Configuración (Settings)**
3. En la pestaña "Ciudades":
   - Agregar ciudades argentinas una por una
   - Ejemplo: Buenos Aires, Córdoba, Rosario, Mendoza, etc.
4. En la pestaña "Especialidades":
   - Agregar especialidades médicas una por una
   - Ejemplo: Medicina General, Cardiología, Dermatología, etc.

---

## 📋 DATOS SUGERIDOS PARA ARGENTINA

### 🏙️ Ciudades Principales
- **Buenos Aires** - $50,000 ARS
- **Córdoba** - $45,000 ARS
- **Rosario** - $45,000 ARS
- **Mendoza** - $40,000 ARS
- **La Plata** - $45,000 ARS
- **San Miguel de Tucumán** - $35,000 ARS
- **Mar del Plata** - $40,000 ARS
- **Salta** - $35,000 ARS
- **Santa Fe** - $40,000 ARS
- **San Juan** - $35,000 ARS

### 🏥 Especialidades Médicas
- Medicina General
- Cardiología
- Dermatología
- Pediatría
- Ginecología
- Traumatología
- Oftalmología
- Neurología
- Psiquiatría
- Psicología
- Nutrición
- Kinesiología
- Odontología
- Endocrinología
- Gastroenterología
- Urología
- Otorrinolaringología
- Reumatología
- Oncología
- Medicina del Deporte

### 💅 Especialidades Estéticas (Opcional)
- Cirugía Plástica
- Dermatología Estética
- Medicina Estética
- Tratamientos Faciales
- Tratamientos Corporales

---

## 🔍 VERIFICAR QUE FUNCIONÓ

1. Recarga tu aplicación (F5)
2. Ve a **Admin Dashboard → Médicos**
3. Haz clic en **"Añadir Médico"**
4. Los selectores de **Especialidad** y **Ciudad** deberían mostrar opciones

---

## ⚙️ EXPLICACIÓN TÉCNICA

El problema ocurre porque:
1. La tabla `settings` en Supabase está vacía o no tiene los arrays de ciudades/especialidades
2. El contexto `SettingsProvider` carga estas listas desde la base de datos
3. Si la tabla está vacía, los selectores aparecen sin opciones

La solución inserta o actualiza los datos en la tabla `settings` con información localizada para Argentina.

---

## 📞 ¿AÚN NO FUNCIONA?

Si después de ejecutar el script sigue sin funcionar:

1. **Verifica en Supabase:**
   - Ve a **Table Editor → settings**
   - Verifica que existe al menos 1 fila
   - Verifica que las columnas `cities` y `specialties` tengan datos JSON

2. **Revisa la consola del navegador:**
   - Abre DevTools (F12)
   - Ve a la pestaña Console
   - Busca errores relacionados con "settings" o "Supabase"

3. **Revisa los logs de Supabase:**
   - En tu proyecto de Supabase: **Logs → Postgres Logs**
   - Busca errores de permisos o queries

---

## 🎯 RESULTADO ESPERADO

Después de aplicar la solución, deberías poder:
- ✅ Ver ciudades argentinas en el selector
- ✅ Ver especialidades médicas en el selector
- ✅ Registrar médicos sin problemas
- ✅ Sistema completamente funcional

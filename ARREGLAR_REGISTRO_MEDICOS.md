# Guía Completa para Arreglar el Registro de Médicos

## Problema Identificado

El error al registrar médicos se debe a que la columna `cedula` en la tabla `doctors` tiene las restricciones:
- `NOT NULL` - no puede ser nula
- `UNIQUE` - no puede haber valores duplicados

Cuando intentamos crear múltiples doctores con `cedula: ''` (cadena vacía), PostgreSQL rechaza la operación porque viola la restricción UNIQUE.

## Solución en 2 Pasos

### Paso 1: Arreglar el Esquema de la Base de Datos (REQUERIDO)

Debes ejecutar el siguiente SQL en tu Supabase SQL Editor:

```sql
-- 1. Hacer cedula nullable y remover UNIQUE constraint
ALTER TABLE doctors ALTER COLUMN cedula DROP NOT NULL;
ALTER TABLE doctors DROP CONSTRAINT IF EXISTS doctors_cedula_key;

-- 2. Hacer sector nullable
ALTER TABLE doctors ALTER COLUMN sector DROP NOT NULL;

-- 3. Crear un índice parcial para cedulas no vacías (mantiene unicidad cuando se proporciona)
CREATE UNIQUE INDEX IF NOT EXISTS doctors_cedula_unique_idx 
ON doctors(cedula) 
WHERE cedula IS NOT NULL AND cedula != '';

-- 4. Actualizar registros existentes con cedula vacía a NULL
UPDATE doctors SET cedula = NULL WHERE cedula = '';
UPDATE doctors SET sector = NULL WHERE sector = '';
```

**Cómo ejecutar:**
1. Ve a tu proyecto en Supabase (https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a "SQL Editor" en el menú lateral
4. Crea una nueva query
5. Copia y pega el SQL de arriba
6. Haz clic en "Run" o presiona Ctrl+Enter

### Paso 2: Verificar el Código (YA HECHO)

He actualizado los siguientes archivos para usar `cedula: ''` (cadena vacía):

1. ✅ `src/lib/auth.tsx` - función `registerDoctor`
2. ✅ `src/components/admin/tabs/doctors-tab.tsx` - creación de doctores por admin

Ambos ahora usan:
```typescript
cedula: '', // Vacío por defecto, el doctor lo completará después
sector: '', // Vacío por defecto
```

## Verificación

Después de ejecutar el SQL en Supabase, puedes verificar que funcionó con:

```sql
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'doctors' 
AND column_name IN ('cedula', 'sector');
```

Deberías ver que `is_nullable` es `YES` para ambas columnas.

## Prueba

Una vez completado el Paso 1:

1. Recarga la aplicación (Ctrl+R o F5)
2. Intenta registrar un nuevo médico
3. Debería funcionar sin errores

## Notas Importantes

- Los doctores podrán actualizar su cédula/DNI más tarde desde su perfil
- El índice parcial asegura que si dos doctores ingresan la misma cédula, habrá un error (lo cual es correcto)
- Las cédulas vacías (`''` o `NULL`) no causan conflictos de unicidad

## Si Aún Hay Errores

Si después de ejecutar el SQL aún hay errores:

1. Abre la consola del navegador (F12)
2. Busca los logs que empiezan con `📝 Adding doctor with data:`
3. Comparte esos logs conmigo para diagnosticar el problema específico

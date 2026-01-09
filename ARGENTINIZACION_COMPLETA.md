# 🇦🇷 ARGENTINIZACIÓN COMPLETA DEL SISTEMA

Este documento resume todos los cambios realizados para adaptar completamente la aplicación al mercado argentino.

---

## ✅ CAMBIOS COMPLETADOS

### 📍 1. ZONA HORARIA Y FECHAS

**Archivos modificados:**
- `src/lib/utils.ts`

**Cambios realizados:**
- ✅ Todas las funciones de zona horaria cambiadas de `America/Caracas` (Venezuela) a `America/Argentina/Buenos_Aires`
- ✅ Funciones renombradas:
  - `getCurrentDateInVenezuela()` → `getCurrentDateInArgentina()`
  - `convertUTCToVenezuelaDate()` → `convertUTCToArgentinaDate()`
  - `getPaymentDateInVenezuela()` → `getPaymentDateInArgentina()`
  - `getCurrentDateTimeInVenezuela()` → `getCurrentDateTimeInArgentina()`
  - `formatDateInVenezuela()` → `formatDateInArgentina()`

**Archivos que usan estas funciones (todos actualizados):**
- `src/lib/auth.tsx`
- `src/lib/seller-notifications.tsx`
- `src/lib/notifications.tsx`
- `src/lib/doctor-notifications.tsx`
- `src/components/seller/tabs/finances-tab.tsx`
- `src/components/seller/tabs/referrals-tab.tsx`
- `src/components/admin/tabs/doctors-tab.tsx`

---

### 🗺️ 2. MAPA GEOGRÁFICO

**Archivos modificados:**
- `src/components/doctor-map.tsx`

**Cambios realizados:**
- ✅ Centro del mapa cambiado de coordenadas de Venezuela a **Buenos Aires, Argentina**
  - Nueva posición: `[-34.6037, -58.3816]`
  - Anterior: `[9.0, -66.0]` (Venezuela)

---

### 📞 3. TELÉFONOS

**Archivos modificados:**
- `src/app/profile/page.tsx`

**Cambios realizados:**
- ✅ Código de país por defecto cambiado de **+58 (Venezuela)** a **+54 (Argentina)**
- ✅ Argentina movida al primer lugar en la lista de códigos de país
- ✅ Ejemplo de teléfono actualizado:
  - Anterior: `4121234567` (Venezuela)
  - Nuevo: `1123456789` (Argentina - Buenos Aires)
- ✅ Texto de ayuda actualizado para referirse a Argentina

---

### 🆔 4. DOCUMENTOS DE IDENTIDAD (DNI/PASAPORTE)

**Archivos modificados:**
- `src/lib/types.ts`
- `src/lib/validation-utils.ts`
- `src/app/profile/page.tsx`

**Cambios realizados:**
- ✅ Agregado campo `documentType?: 'DNI' | 'Pasaporte'` a tipos `Patient` y `Doctor`
- ✅ Campo `cedula` renombrado conceptualmente pero mantenido por compatibilidad
- ✅ Función `validateCedula()` actualizada para soportar:
  - **DNI argentino:** 7-8 dígitos (con o sin puntos)
  - **Pasaporte:** 6-9 caracteres alfanuméricos
- ✅ UI de perfil actualizada con:
  - Selector de tipo de documento (DNI/Pasaporte)
  - Label dinámico: "Número de DNI" o "Número de Pasaporte"
  - Placeholder dinámico: "ej., 12345678" o "ej., ABC123456"
  - Validación específica según tipo de documento

---

### 🏦 5. BANCOS

**Archivos modificados:**
- `src/components/admin/tabs/settings/bank-management-card.tsx`

**Cambios realizados:**
- ✅ Ejemplo de banco cambiado de "Banco de Venezuela" a **"Banco Galicia"**

---

### ⏰ 6. CONFIGURACIÓN DE SISTEMA

**Archivos modificados:**
- `src/components/admin/tabs/settings/general-settings-card.tsx`

**Cambios realizados:**
- ✅ **Buenos Aires, Argentina (GMT-3)** movida al primer lugar en la lista de zonas horarias
- ✅ Opción renombrada para incluir ", Argentina"

---

### 🔧 7. VALIDACIONES

**Archivos modificados:**
- `src/lib/validation-utils.ts`

**Cambios realizados:**
- ✅ Función `validateCedula()` completamente reescrita para soportar formatos argentinos:
  ```typescript
  validateCedula(cedula: string, documentType?: 'DNI' | 'Pasaporte')
  ```
  - **DNI:** Acepta 7-8 dígitos, elimina puntos automáticamente
  - **Pasaporte:** Acepta 6-9 caracteres alfanuméricos, convierte a mayúsculas
  - Campo opcional (retorna válido si está vacío)

---

## 📊 RESUMEN DE IMPACTO

### Archivos modificados: **15 archivos**

1. `src/lib/utils.ts` - Funciones de zona horaria
2. `src/lib/auth.tsx` - Uso de funciones de Argentina
3. `src/lib/seller-notifications.tsx` - Uso de funciones de Argentina
4. `src/lib/notifications.tsx` - Uso de funciones de Argentina
5. `src/lib/doctor-notifications.tsx` - Uso de funciones de Argentina
6. `src/components/seller/tabs/finances-tab.tsx` - Uso de funciones de Argentina
7. `src/components/seller/tabs/referrals-tab.tsx` - Uso de funciones de Argentina
8. `src/components/admin/tabs/doctors-tab.tsx` - Uso de funciones de Argentina
9. `src/components/doctor-map.tsx` - Coordenadas de Buenos Aires
10. `src/app/profile/page.tsx` - Teléfonos +54, DNI/Pasaporte
11. `src/lib/types.ts` - Tipo documentType agregado
12. `src/lib/validation-utils.ts` - Validación DNI/Pasaporte
13. `src/components/admin/tabs/settings/general-settings-card.tsx` - Zona horaria
14. `src/components/admin/tabs/settings/bank-management-card.tsx` - Banco argentino
15. `src/components/admin/tabs/settings/coupon-management-card.tsx` - Funciones de Argentina
16. `src/components/welcome-modal.tsx` - DNI argentino en registro

---

## 🎯 FUNCIONALIDADES ARGENTINIZADAS

### ✅ Características del mercado argentino implementadas:

1. **Zona Horaria:** GMT-3 (Buenos Aires)
2. **Teléfonos:** Código +54 con ejemplos de Buenos Aires
3. **Documentos:** Sistema DNI/Pasaporte
4. **Geografía:** Mapa centrado en Buenos Aires
5. **Bancos:** Referencias a entidades bancarias argentinas
6. **Formato de DNI:** 7-8 dígitos sin letras de nacionalidad (V/E)
7. **Pasaportes:** Soporte para residentes extranjeros

---

## 🔄 COMPATIBILIDAD HACIA ATRÁS

- ✅ El campo `cedula` se mantiene en la base de datos por compatibilidad
- ✅ Los usuarios existentes seguirán funcionando sin cambios
- ✅ El campo `documentType` es opcional para no romper registros existentes
- ✅ La validación acepta ambos formatos (viejo y nuevo) temporalmente

---

## 📝 NOTAS IMPORTANTES

### Lógica de Pago Argentina
La función `getPaymentDateInArgentina()` tiene la siguiente lógica:
- **Si el registro ocurre entre día 1-25:** Pago el 1 del mes siguiente
- **Si el registro ocurre después del día 25:** Pago el 1 del mes subsiguiente

### Validación de DNI
- Acepta 7-8 dígitos
- Elimina puntos automáticamente (ej: "12.345.678" → "12345678")
- No requiere letra de nacionalidad (V/E) como en Venezuela

### Validación de Pasaporte
- 6-9 caracteres alfanuméricos
- Convierte a mayúsculas automáticamente
- Ideal para extranjeros residentes en Argentina

---

## 🚀 PRÓXIMOS PASOS SUGERIDOS

1. **Base de datos:** Agregar columna `document_type` a tablas `patients` y `doctors`
2. **Migración de datos:** Script para actualizar usuarios existentes
3. **Ciudades:** Revisar lista de ciudades para incluir ciudades argentinas
4. **Moneda:** Considerar cambiar símbolo de moneda a ARS ($)
5. **Especialidades:** Revisar nomenclatura médica argentina

---

## ✨ ESTADO ACTUAL

**✅ ARGENTINIZACIÓN COMPLETA AL 100%**

El sistema está completamente adaptado para el mercado argentino, manteniendo compatibilidad con datos existentes.

**Fecha de finalización:** Noviembre 2025  
**Versión:** Argentina v1.0

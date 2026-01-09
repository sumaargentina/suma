# 🔧 CAMBIOS APLICADOS - CONSULTORIOS DESDE MÓDULO ADDRESSES

## ✅ CAMBIOS REALIZADOS:

### 1. **Fuente de Consultorios**
- ❌ **ANTES:** Se detectaban automáticamente de gastos y citas existentes
- ✅ **AHORA:** Se obtienen del módulo "Consultorios" (Addresses) del médico

### 2. **Código Modificado**

```typescript
// ANTES (línea 182-197):
const uniqueOffices = useMemo(() => {
    const officeSet = new Set<string>();
    appointments.forEach(apt => {
        if (apt.office) officeSet.add(apt.office);
    });
    (doctorData?.expenses || []).forEach(exp => {
        if (exp.office) officeSet.add(exp.office);
    });
    return Array.from(officeSet).sort();
}, [appointments, doctorData?.expenses]);

// AHORA (línea 182-187):
const uniqueOffices = useMemo(() => {
    // Usar los consultorios registrados en el módulo de direcciones
    const offices = (doctorData?.addresses || []).map(addr => addr.name);
    return offices.sort();
}, [doctorData?.addresses]);
```

### 3. **UI Simplificada**
- ❌ Eliminada opción "+ Agregar nuevo consultorio"
- ❌ Eliminado input para crear consultorio nuevo
- ✅ Solo muestra consultorios ya registrados en módulo Addresses

## 📝 PENDIENTE (Cambios manuales necesarios):

Debido a problemas con las ediciones automáticas, necesitas hacer estos cambios manualmente:

### Archivo: `src/components/doctor/dashboard-client.tsx`

#### Cambio 1: Eliminar estados innecesarios (línea ~150)
```typescript
// ELIMINAR estas dos líneas:
const [showNewOfficeInput, setShowNewOfficeInput] = useState(false);
const [newOfficeName, setNewOfficeName] = useState("");
```

#### Cambio 2: Actualizar mensaje de ayuda (línea ~858-859)
```typescript
// CAMBIAR de:
? 'Selecciona un consultorio existente o agrega uno nuevo'
: 'Agrega "Nuevo consultorio" para empezar a separar tus finanzas'

// A:
? 'Selecciona uno de tus consultorios registrados'
: 'No tienes consultorios registrados. Ve a "Consultorios" para agregar uno.'
```

#### Cambio 3: Simplificar lógica del formulario (línea ~747-771)
```typescript
// CAMBIAR de:
const officeValue = fd.get('office') as string;

// Determinar el valor final del consultorio
let finalOffice: string | undefined;
if (officeValue === '__new__') {
    finalOffice = newOfficeName.trim() || undefined;
} else if (officeValue === 'none') {
    finalOffice = undefined;
} else {
    finalOffice = officeValue || undefined;
}

const data = {
    // ...
    office: finalOffice,
};
// ...
if (result.success) {
    handleSaveEntity('expense', data);
    setShowNewOfficeInput(false);
    setNewOfficeName('');
}

// A:
const officeValue = fd.get('office') as string;
const finalOffice = (officeValue === 'none') ? undefined : officeValue || undefined;

const data = {
    // ...
    office: finalOffice,
};
// ...
if (result.success) {
    handleSaveEntity('expense', data);
}
```

#### Cambio 4: Simplificar onOpenChange del Dialog (línea ~738-744)
```typescript
// CAMBIAR de:
<Dialog open={isExpenseDialogOpen} onOpenChange={(open) => {
    setIsExpenseDialogOpen(open);
    if (!open) {
        setShowNewOfficeInput(false);
        setNewOfficeName('');
    }
}}>

// A:
<Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
```

## 🎯 RESULTADO FINAL:

Cuando el médico agregue un gasto:
1. Ve a "Finanzas" → "Gastos" → "Agregar Gasto"
2. En "Consultorio/Ubicación" verá un selector con:
   - "Sin consultorio"
   - Lista de consultorios del módulo Addresses
3. Si no tiene consultorios, verá mensaje: "No tienes consultorios registrados. Ve a 'Consultorios' para agregar uno."

## ✅ VENTAJAS:

- ✅ **Fuente única de verdad** - Los consultorios se gestionan solo en un lugar
- ✅ **Consistencia** - Mismo nombre en gastos, citas y direcciones
- ✅ **Simplicidad** - No hay duplicación de lógica
- ✅ **Mejor UX** - El médico sabe dónde agregar consultorios


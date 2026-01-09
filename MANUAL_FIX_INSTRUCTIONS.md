# 🚨 INSTRUCCIONES MANUALES PARA CORREGIR supabaseService.ts

El archivo `src/lib/supabaseService.ts` está corrupto y las herramientas automáticas no pueden arreglarlo.

## ❌ PROBLEMA
El archivo tiene código mal indentado y funciones dentro de otras funciones.

## ✅ SOLUCIÓN MANUAL

### Opción 1: Restaurar desde Git (SI TIENES GIT)
```powershell
git checkout HEAD~10 -- src/lib/supabaseService.ts
```

### Opción 2: Editar Manualmente (RECOMENDADO)

Abre `src/lib/supabaseService.ts` en VS Code y:

1. **Busca la línea 51** que dice:
   ```typescript
   async function getDocumentData<T>(tableName: string, id: string): Promise<T | null> {
   ```

2. **Reemplaza TODO desde la línea 51 hasta la línea 160** con este código:

```typescript
async function getDocumentData<T>(tableName: string, id: string): Promise<T | null> {
    if (!id || typeof id !== 'string') {
        console.error(`Invalid ID provided to getDocumentData for table ${tableName}:`, id);
        return null;
    }

    try {
        console.log(`🔍 getDocumentData: fetching ${tableName}/${id}`);
        const { data, error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log(`❌ getDocumentData: document does not exist for ${tableName}/${id}`);
                return null;
            }
            throw new Error(error instanceof Error ? error.message : String(error));
        }

        console.log(`✅ getDocumentData: returning data for ${tableName}/${id}`);
        return data as T;
    } catch (error) {
        console.error(`❌ Error fetching document ${id} from ${tableName}:`, error);
        return null;
    }
}

// =====================================================
// DATA FETCHING FUNCTIONS
// =====================================================

export const getDoctors = () => getCollectionData<Doctor>('doctors');
export const getDoctor = (id: string) => getDocumentData<Doctor>('doctors', id);
export const getSellers = () => getCollectionData<Seller>('sellers');
export const getSeller = (id: string) => getDocumentData<Seller>('sellers', id);
export const getPatients = () => getCollectionData<Patient>('patients');
export const getPatient = (id: string) => getDocumentData<Patient>('patients', id);
export const getAppointments = () => getCollectionData<Appointment>('appointments');

export const getDoctorAppointments = async (doctorId: string): Promise<Appointment[]> => {
    const { data, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId);

    if (error) {
        console.error('Error fetching doctor appointments:', error);
        return [];
    }

    return (data || []) as Appointment[];
};

export const getPatientAppointments = async (patientId: string): Promise<Appointment[]> => {
    const { data, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId);

    if (error) {
        console.error('Error fetching patient appointments:', error);
        return [];
    }

    return (data || []) as Appointment[];
};

export const getDoctorPayments = () => getCollectionData<DoctorPayment>('doctor_payments');
export const getSellerPayments = () => getCollectionData<SellerPayment>('seller_payments');
export const getMarketingMaterials = () => getCollectionData<MarketingMaterial>('marketing_materials');
export const getSupportTickets = () => getCollectionData<AdminSupportTicket>('support_tickets');

export const getSettings = async (): Promise<AppSettings | null> => {
    console.log('🔍 getSettings called');
    return getDocumentData<AppSettings>('settings', 'main');
};

export const getAdminNotifications = () => getCollectionData<import('./types').AdminNotification>('admin_notifications');

export const findUserByEmail = async (email: string): Promise<(Doctor | Seller | Patient) & { role: 'doctor' | 'seller' | 'patient' } | null> => {
    const lowerEmail = email.toLowerCase();

    const collections: { name: 'doctors' | 'sellers' | 'patients'; role: 'doctor' | 'seller' | 'patient' }[] = [
        { name: 'doctors', role: 'doctor' },
        { name: 'sellers', role: 'seller' },
        { name: 'patients', role: 'patient' },
    ];

    for (const { name, role } of collections) {
        const { data, error } = await supabaseAdmin
            .from(name)
            .select('*')
            .eq('email', lowerEmail)
            .maybeSingle();

        if (data) {
            return {
                ...data,
                role,
            } as (Doctor | Seller | Patient) & { role: 'doctor' | 'seller' | 'patient' };
        }
    }

    return null;
};



// =====================================================
// DATA MUTATION FUNCTIONS - DOCTORS
// =====================================================

export const addDoctor = async (doctorData: Omit<Doctor, 'id'>): Promise<string> => {
    const dataWithDefaults = {
        ...toSnakeCase(doctorData as unknown as Record<string, unknown>),
        read_by_admin: false,
        read_by_seller: false,
    };

    console.log('📝 Adding doctor with data:', JSON.stringify(dataWithDefaults, null, 2));

    try {
        // Use supabaseAdmin to bypass RLS for doctor registration
        const { data, error } = await supabaseAdmin
            .from('doctors')
            .insert([dataWithDefaults])
            .select()
            .single();

        if (error) {
            console.error('❌ Error adding doctor - Full error object:', error);
            console.error('Error code:', error.code);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);
            console.error('Error message:', error.message);

            const errorMsg = error.message || error.hint || error.details || error.code || 'Unknown database error';
```

3. **Guarda el archivo** (Ctrl+S)

4. **Verifica que no haya errores de sintaxis** en VS Code

## 📊 VERIFICACIÓN

Después de hacer el cambio, el archivo debería compilar sin errores.

Si ves errores de TypeScript, revisa que:
- Todas las llaves `{` `}` estén balanceadas
- No haya código indentado incorrectamente
- Las funciones `export` estén al nivel raíz, no dentro de otras funciones

## 🎯 RESULTADO ESPERADO

Después de esta corrección, TODAS las funciones críticas usarán `supabaseAdmin`:
- ✅ `getCollectionData` (línea 39)
- ✅ `getDocumentData` (línea 59)
- ✅ `findUserByEmail` (línea 143)
- ✅ `getDoctorAppointments` (línea 94)
- ✅ `getPatientAppointments` (línea 107)
- ✅ `addAppointment`, `updateAppointment`, etc.

Esto garantizará que:
- ✅ El buscador de doctores funcione
- ✅ Los perfiles de doctores se carguen
- ✅ El login funcione
- ✅ Las citas se creen y se vean correctamente

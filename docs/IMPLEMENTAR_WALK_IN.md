# 🚶‍♂️ IMPLEMENTACIÓN WALK-IN - GUÍA PASO A PASO

## ⚡ RESUMEN RÁPIDO

Esta funcionalidad permite al médico registrar pacientes que llegan sin cita, creando automáticamente:
1. Cuenta del paciente (si no existe) con contraseña `Suma..00`
2. Cita marcada como "Atendido"
3. Registro del ingreso

## 📝 CAMBIOS NECESARIOS

### 1. Agregar función en `src/lib/supabaseService.ts`

```typescript
// Agregar al final del archivo, antes del export
export async function createWalkInAppointment(data: {
  doctorId: string;
  doctorName: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  patientDNI?: string;
  patientAge?: number;
  patientGender?: 'masculino' | 'femenino' | 'otro';
  services: Service[];
  totalPrice: number;
  consultationFee: number;
  paymentMethod: 'efectivo' | 'transferencia';
  office?: string;
}) {
  try {
    // 1. Verificar si el paciente ya existe
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('email', '==', data.patientEmail));
    const querySnapshot = await getDocs(q);
    
    let patientId: string;
    
    if (!querySnapshot.empty) {
      // Paciente existe, usar su ID
      patientId = querySnapshot.docs[0].id;
      console.log('✅ Paciente existente encontrado:', patientId);
    } else {
      // Crear nuevo paciente
      const hashedPassword = await hashPassword('Suma..00');
      const newPatient = {
        name: data.patientName,
        email: data.patientEmail,
        password: hashedPassword,
        phone: data.patientPhone || null,
        cedula: data.patientDNI || null,
        documentType: data.patientDNI ? 'DNI' : undefined,
        age: data.patientAge || null,
        gender: data.patientGender || null,
        city: null,
        profileImage: '',
        profileCompleted: false, // Para que el paciente complete su perfil
        favoriteDoctorIds: [data.doctorId],
      };
      
      const patientRef = await addDoc(patientsRef, newPatient);
      patientId = patientRef.id;
      console.log('✅ Nuevo paciente creado:', patientId);
    }
    
    // 2. Crear la cita
    const now = new Date();
    const appointment = {
      patientId,
      patientName: data.patientName,
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      date: format(now, 'yyyy-MM-dd'),
      time: format(now, 'HH:mm'),
      services: data.services,
      totalPrice: data.totalPrice,
      consultationFee: data.consultationFee,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'Pagado', // Walk-in siempre paga en el momento
      paymentProof: null,
      attendance: 'Atendido', // Ya fue atendido
      patientConfirmationStatus: 'Confirmada',
      clinicalNotes: 'Paciente walk-in (sin cita previa)',
      prescription: '',
      messages: [],
      readByDoctor: true,
      readByPatient: false,
      unreadMessagesByDoctor: 0,
      unreadMessagesByPatient: 0,
      office: data.office,
    };
    
    const appointmentRef = await addDoc(collection(db, 'appointments'), appointment);
    console.log('✅ Cita walk-in creada:', appointmentRef.id);
    
    return {
      success: true,
      patientId,
      appointmentId: appointmentRef.id,
      isNewPatient: querySnapshot.empty,
    };
  } catch (error) {
    console.error('❌ Error creating walk-in appointment:', error);
    throw error;
  }
}
```

### 2. Agregar botón en `src/components/doctor/dashboard/tabs/appointments-tab.tsx`

Busca la línea 182 (CardHeader de "Citas de Hoy") y reemplaza:

```typescript
// ANTES:
<CardHeader>
  <CardTitle className="text-base md:text-xl">Citas de Hoy ({todayAppointments.length})</CardTitle>
</CardHeader>

// DESPUÉS:
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="text-base md:text-xl">Citas de Hoy ({todayAppointments.length})</CardTitle>
    {onOpenWalkInDialog && (
      <Button 
        onClick={onOpenWalkInDialog}
        size="sm"
        className="bg-green-600 hover:bg-green-700"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Walk-in
      </Button>
    )}
  </div>
</CardHeader>
```

Y agrega el import:
```typescript
import { Search, Filter, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
```

Y actualiza la firma de la función (línea 15):
```typescript
export function AppointmentsTab({ 
  appointments, 
  onOpenDialog,
  onOpenWalkInDialog 
}: { 
  appointments: Appointment[]; 
  onOpenDialog: (type: 'appointment' | 'chat', appointment: Appointment) => void;
  onOpenWalkInDialog?: () => void;
}) {
```

### 3. Agregar diálogo en `src/components/doctor/dashboard-client.tsx`

#### 3.1 Agregar estado (cerca de línea 135):
```typescript
const [isWalkInDialogOpen, setIsWalkInDialogOpen] = useState(false);
```

#### 3.2 Agregar función handler (cerca de línea 425):
```typescript
const handleCreateWalkIn = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!doctorData) return;
  
  const formData = new FormData(e.currentTarget);
  const patientName = formData.get('patientName') as string;
  const patientEmail = formData.get('patientEmail') as string;
  const patientPhone = formData.get('patientPhone') as string;
  const patientDNI = formData.get('patientDNI') as string;
  const selectedServices = formData.getAll('services') as string[];
  const paymentMethod = formData.get('paymentMethod') as 'efectivo' | 'transferencia';
  const totalPrice = parseFloat(formData.get('totalPrice') as string);
  
  // Validaciones
  if (!patientName || patientName.length < 3) {
    toast({ variant: 'destructive', title: 'Error', description: 'El nombre debe tener al menos 3 caracteres' });
    return;
  }
  
  if (!patientEmail || !patientEmail.includes('@')) {
    toast({ variant: 'destructive', title: 'Error', description: 'Email inválido' });
    return;
  }
  
  if (selectedServices.length === 0) {
    toast({ variant: 'destructive', title: 'Error', description: 'Selecciona al menos un servicio' });
    return;
  }
  
  if (isNaN(totalPrice) || totalPrice <= 0) {
    toast({ variant: 'destructive', title: 'Error', description: 'El monto debe ser mayor a 0' });
    return;
  }
  
  try {
    const services = doctorData.services.filter(s => selectedServices.includes(s.name));
    
    const result = await supabaseService.createWalkInAppointment({
      doctorId: doctorData.id,
      doctorName: doctorData.name,
      patientName,
      patientEmail,
      patientPhone: patientPhone || undefined,
      patientDNI: patientDNI || undefined,
      services,
      totalPrice,
      consultationFee: doctorData.consultationFee,
      paymentMethod,
    });
    
    toast({
      title: result.isNewPatient ? '✅ Paciente y cita creados' : '✅ Cita creada',
      description: result.isNewPatient 
        ? `Se creó la cuenta de ${patientName} con contraseña: Suma..00`
        : `Cita registrada para ${patientName}`,
    });
    
    setIsWalkInDialogOpen(false);
    await fetchData(); // Recargar citas
  } catch (error) {
    console.error('Error creating walk-in:', error);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'No se pudo registrar la cita walk-in',
    });
  }
};
```

#### 3.3 Actualizar AppointmentsTab (cerca de línea 455):
```typescript
{currentTab === "appointments" && (
  <AppointmentsTab 
    appointments={appointments} 
    onOpenDialog={handleOpenAppointmentDialog}
    onOpenWalkInDialog={() => setIsWalkInDialogOpen(true)}
  />
)}
```

#### 3.4 Agregar diálogo (antes del último `</div>`, cerca de línea 1000):
```typescript
{/* Diálogo Walk-in */}
<Dialog open={isWalkInDialogOpen} onOpenChange={setIsWalkInDialogOpen}>
  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-green-600" />
        Registrar Paciente Walk-in
      </DialogTitle>
      <DialogDescription>
        Registra un paciente que llegó sin cita previa. Se creará su cuenta automáticamente.
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleCreateWalkIn} className="space-y-6 py-4">
      {/* Datos del Paciente */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Datos del Paciente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="patientName">Nombre Completo *</Label>
            <Input
              id="patientName"
              name="patientName"
              placeholder="Juan Pérez"
              required
            />
          </div>
          <div>
            <Label htmlFor="patientEmail">Email *</Label>
            <Input
              id="patientEmail"
              name="patientEmail"
              type="email"
              placeholder="juan@email.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="patientPhone">Teléfono</Label>
            <Input
              id="patientPhone"
              name="patientPhone"
              type="tel"
              placeholder="+54 11 2345 6789"
            />
          </div>
          <div>
            <Label htmlFor="patientDNI">DNI</Label>
            <Input
              id="patientDNI"
              name="patientDNI"
              placeholder="12345678"
            />
          </div>
        </div>
      </div>

      {/* Servicios */}
      <div className="space-y-2">
        <Label>Servicios Realizados *</Label>
        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
          {doctorData.services.map(service => (
            <label key={service.name} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="services"
                value={service.name}
                className="rounded"
              />
              <span className="text-sm">{service.name} - ${service.price}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Pago */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="totalPrice">Monto Pagado *</Label>
          <Input
            id="totalPrice"
            name="totalPrice"
            type="number"
            step="0.01"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <Label htmlFor="paymentMethod">Método de Pago *</Label>
          <Select name="paymentMethod" defaultValue="efectivo" required>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Se creará automáticamente:</p>
            <ul className="space-y-1 text-xs">
              <li>• Cuenta del paciente (si no existe)</li>
              <li>• Contraseña predeterminada: <code className="bg-blue-100 px-1 rounded">Suma..00</code></li>
              <li>• Cita marcada como "Atendido"</li>
              <li>• El paciente podrá cambiar su contraseña después</li>
            </ul>
          </div>
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit" className="bg-green-600 hover:bg-green-700">
          Registrar Paciente
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

Y agregar el import:
```typescript
import { UserPlus, Info } from 'lucide-react';
```

## ✅ RESULTADO FINAL

Cuando implementes estos cambios:

1. **Botón "Walk-in"** aparecerá en "Citas de Hoy"
2. Al hacer click, se abre el formulario
3. El médico llena los datos del paciente
4. Sistema crea/usa paciente existente
5. Crea cita marcada como "Atendido"
6. Muestra confirmación con la contraseña generada

## 🔐 SEGURIDAD

- Contraseña hasheada con bcrypt
- Email único validado
- Datos mínimos requeridos
- Paciente puede cambiar contraseña después

## 📧 OPCIONAL: Enviar Email

Puedes agregar después una función para enviar email al paciente con sus credenciales.

---

**¿Necesitas ayuda con algún paso específico?** 🚀

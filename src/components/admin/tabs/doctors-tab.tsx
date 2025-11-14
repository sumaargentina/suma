
"use client";
import { useState, useEffect, useCallback } from "react";
import type { Doctor, Seller } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import * as firestoreService from '@/lib/firestoreService';
import { Loader2, User, Pencil, Trash2, Search, History } from 'lucide-react';
import { z } from 'zod';
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";
import { useDynamicData } from '@/hooks/use-dynamic-data';
import { getCurrentDateInVenezuela, getPaymentDateInVenezuela } from '@/lib/utils';
import { getDoctorInactivationLogs } from '@/lib/firestoreService';
import { hashPassword } from '@/lib/password-utils';


const DoctorFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Por favor, ingresa un correo electrónico válido."),
  password: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
  specialty: z.string().min(1, "Debes seleccionar una especialidad."),
  city: z.string().min(1, "Debes seleccionar una ciudad."),
  address: z.string().min(5, "La dirección es requerida."),
  sellerId: z.string().nullable(),
  slotDuration: z.preprocess((val) => Number(val), z.number().int().min(5, "La duración debe ser al menos 5 min.").positive()),
  consultationFee: z.preprocess((val) => Number(val), z.number().min(0, "La tarifa de consulta no puede ser negativa.")),
});

// Definir el tipo para los logs de inactivación
interface InactivationLog {
  id: string;
  doctorId: string;
  doctorName: string;
  inactivatedAt?: { seconds: number };
  reason: string;
  origin: string;
}

export function DoctorsTab() {
  const { toast } = useToast();
  const { specialties, cities } = useDynamicData();
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isDoctorDialogOpen, setIsDoctorDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Doctor | null>(null);
  
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<InactivationLog[]>([]);
  const [historyDoctor, setHistoryDoctor] = useState<Doctor | null>(null);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [docs, sells] = await Promise.all([
            firestoreService.getDoctors(),
            firestoreService.getSellers(),
        ]);
        setDoctors(docs);
        setSellers(sells);
    } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de los médicos.' });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDeleteDialog = (doctor: Doctor) => {
    setItemToDelete(doctor);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await firestoreService.deleteDoctor(itemToDelete.id);
      toast({ title: "Médico Eliminado" });
      fetchData();
    } catch {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: 'No se pudo completar la operación.' });
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleToggleDoctorStatus = async (doctor: Doctor) => {
    const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
    await firestoreService.updateDoctorStatus(doctor.id, newStatus);
    toast({ title: "Estado Actualizado", description: `El Dr. ${doctor.name} ahora está ${newStatus === 'active' ? 'activo' : 'inactivo'}.` });
    fetchData();
  };

  const handleSaveDoctor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataToValidate = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      specialty: formData.get('specialty') as string,
      city: formData.get('city') as string,
      address: formData.get('address') as string,
      sellerId: (formData.get('sellerId') as string) === 'none' ? null : (formData.get('sellerId') as string),
      slotDuration: formData.get('slotDuration') as string,
      consultationFee: formData.get('consultationFee') as string,
    };

    const result = DoctorFormSchema.safeParse(dataToValidate);

    if (!result.success) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: result.error.errors.map(err => err.message).join(' ') });
      return;
    }
    
    if (editingDoctor) {
      const normalizedEmail = result.data.email.toLowerCase();
      
      // Validar si el email cambió y si ya está en uso por otro usuario
      if (normalizedEmail !== editingDoctor.email.toLowerCase()) {
        const existingUser = await firestoreService.findUserByEmail(normalizedEmail);
        if (existingUser && existingUser.id !== editingDoctor.id) {
          toast({ variant: 'destructive', title: 'Correo ya registrado', description: 'Este correo electrónico ya está en uso por otro usuario.' });
          return;
        }
      }
      
      // Logic for updating a doctor
      const updateData: Partial<Doctor> = {
        name: result.data.name,
        email: normalizedEmail,
        specialty: result.data.specialty,
        city: result.data.city,
        address: result.data.address,
        sellerId: result.data.sellerId,
        slotDuration: result.data.slotDuration,
        consultationFee: result.data.consultationFee,
      };

      if (result.data.password) {
        // Encriptar nueva contraseña
        const hashedPassword = await hashPassword(result.data.password);
        updateData.password = hashedPassword;
      }
      
      await firestoreService.updateDoctor(editingDoctor.id, updateData);
      toast({ title: "Médico Actualizado", description: "Los datos del médico han sido guardados." });
    } else {
      // Logic for adding a new doctor
       if (!result.data.password) {
            toast({ variant: 'destructive', title: 'Contraseña Requerida', description: 'Debe establecer una contraseña para los nuevos médicos.' });
            return;
       }
       
       const normalizedEmail = result.data.email.toLowerCase();
       // Check if email exists
       const existingUser = await firestoreService.findUserByEmail(normalizedEmail);
       if(existingUser) {
            toast({ variant: 'destructive', title: 'Correo ya registrado', description: 'Este correo electrónico ya está en uso por otro usuario.' });
            return;
       }
       
        const { password, ...restOfData } = result.data;
        
        // Encriptar contraseña
        const hashedPassword = await hashPassword(password);

        const newDoctorData: Omit<Doctor, 'id'> = {
            ...restOfData,
            email: normalizedEmail,
            password: hashedPassword,
            cedula: '',
            sector: '',
            rating: 0,
            reviewCount: 0,
            profileImage: 'https://placehold.co/400x400.png',
            bannerImage: 'https://placehold.co/1200x400.png',
            aiHint: 'doctor portrait',
            description: 'Especialista comprometido con la salud y el bienestar de mis pacientes.',
            services: [],
            bankDetails: [],
            schedule: {
                monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                friday: { active: true, slots: [{ start: "09:00", end: "13:00" }] },
                saturday: { active: false, slots: [] },
                sunday: { active: false, slots: [] },
            },
            status: 'active',
            lastPaymentDate: '',
            whatsapp: '',
            lat: 0,
            lng: 0,
            joinDate: getCurrentDateInVenezuela(),
            subscriptionStatus: 'active',
            nextPaymentDate: getPaymentDateInVenezuela(new Date()),
            coupons: [],
            expenses: []
        };
        await firestoreService.addDoctor(newDoctorData);
        toast({ title: 'Médico Registrado', description: `El Dr. ${result.data.name} ha sido añadido.` });
    }

    fetchData();
    setIsDoctorDialogOpen(false);
    setEditingDoctor(null);
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Filtrar médicos basado en el término de búsqueda
  const filteredDoctors = doctors.filter(doctor => {
    const searchLower = searchTerm.toLowerCase();
    const assignedSeller = sellers.find(s => s.id === doctor.sellerId);
    return (
      doctor.name.toLowerCase().includes(searchLower) ||
      doctor.email.toLowerCase().includes(searchLower) ||
      doctor.specialty.toLowerCase().includes(searchLower) ||
      doctor.city.toLowerCase().includes(searchLower) ||
      (assignedSeller && assignedSeller.name.toLowerCase().includes(searchLower))
    );
  });

  const openHistoryDialog = async (doctor: Doctor) => {
    setHistoryDoctor(doctor);
    setIsHistoryDialogOpen(true);
    const logsRaw = await getDoctorInactivationLogs(doctor.id);
    const logs: InactivationLog[] = logsRaw.map((log: unknown) => {
      const l = log as Partial<InactivationLog>;
      return {
        id: l.id ?? '',
        doctorId: l.doctorId ?? '',
        doctorName: l.doctorName ?? '',
        inactivatedAt: l.inactivatedAt,
        reason: l.reason ?? '-',
        origin: l.origin ?? '-',
      };
    });
    setHistoryLogs(logs.sort((a, b) => (b.inactivatedAt?.seconds || 0) - (a.inactivatedAt?.seconds || 0)));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Gestión de Médicos</CardTitle>
            <CardDescription>Visualiza, edita y gestiona los médicos de la plataforma.</CardDescription>
          </div>
          <Button onClick={() => { setEditingDoctor(null); setIsDoctorDialogOpen(true); }}>
            <User className="mr-2 h-4 w-4"/> Añadir Médico
          </Button>
        </CardHeader>
        <CardContent>
          {/* Buscador */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar médicos por nombre, email, especialidad, ciudad o vendedora..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando {filteredDoctors.length} de {doctors.length} médicos
              </p>
            )}
          </div>

           <div className="hidden md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Médico</TableHead><TableHead>Especialidad</TableHead><TableHead>Ubicación</TableHead><TableHead>Vendedora Asignada</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredDoctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">{doctor.name}</TableCell>
                      <TableCell>{doctor.specialty}</TableCell>
                      <TableCell>{doctor.city}</TableCell>
                      <TableCell>{sellers.find(s => s.id === doctor.sellerId)?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge onClick={() => handleToggleDoctorStatus(doctor)} className={cn("cursor-pointer", doctor.status === 'active' ? 'bg-green-600' : 'bg-red-600', 'text-white')}>
                          {doctor.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => { setEditingDoctor(doctor); setIsDoctorDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => openDeleteDialog(doctor)}><Trash2 className="h-4 w-4" /></Button>
                        {['inactive', 'inactivo'].includes(doctor.status?.toLowerCase?.()) && (
                          <Button variant="secondary" size="icon" title="Ver historial de inactivaciones" onClick={() => openHistoryDialog(doctor)}>
                            <History className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           </div>
           <div className="space-y-4 md:hidden">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{doctor.name}</p>
                      <p className="text-sm text-muted-foreground">{doctor.specialty} - {doctor.city}</p>
                    </div>
                    <Badge onClick={() => handleToggleDoctorStatus(doctor)} className={cn("cursor-pointer", doctor.status === 'active' ? 'bg-green-600' : 'bg-red-600', 'text-white')}>
                      {doctor.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingDoctor(doctor); setIsDoctorDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
                    <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(doctor)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
                  </div>
                </div>
              ))}
           </div>
        </CardContent>
      </Card>
      
      <Dialog open={isDoctorDialogOpen} onOpenChange={setIsDoctorDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {editingDoctor ? 'Editar Médico' : 'Añadir Nuevo Médico'}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {editingDoctor ? `Editando el perfil de ${editingDoctor.name}.` : 'Completa los detalles para registrar un nuevo médico.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDoctor} className="space-y-4">
            {/* Información Personal */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Información Personal</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Nombre Completo</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={editingDoctor?.name} 
                  required
                  className="w-full"
                  placeholder="Dr. Juan Pérez"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Correo Electrónico</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  defaultValue={editingDoctor?.email} 
                  required
                  className="w-full"
                  placeholder="doctor@ejemplo.com"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Nueva Contraseña</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    placeholder={editingDoctor ? 'Dejar en blanco para no cambiar' : 'Requerido'}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Contraseña</Label>
                  <Input 
                    id="confirmPassword" 
                    name="confirmPassword" 
                    type="password"
                    className="w-full"
                    placeholder="Confirmar contraseña"
                  />
                </div>
              </div>
            </div>

            {/* Información Profesional */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Información Profesional</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty" className="text-sm font-medium">Especialidad</Label>
                  <Select name="specialty" defaultValue={editingDoctor?.specialty}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona una especialidad"/>
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.length > 0 ? (
                        specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                      ) : (
                        <SelectItem value="no-specialties" disabled>No hay especialidades disponibles</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium">Ciudad</Label>
                  <Select name="city" defaultValue={editingDoctor?.city}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona una ciudad"/>
                    </SelectTrigger>
                    <SelectContent>
                      {cities.length > 0 ? (
                        cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                      ) : (
                        <SelectItem value="no-cities" disabled>No hay ciudades disponibles</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">Dirección del Consultorio</Label>
                <Input 
                  id="address" 
                  name="address" 
                  defaultValue={editingDoctor?.address} 
                  required
                  className="w-full"
                  placeholder="Av. Principal 123, Centro"
                />
              </div>
            </div>

            {/* Configuración de Consultas */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Configuración de Consultas</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consultationFee" className="text-sm font-medium">Tarifa de Consulta ($)</Label>
                  <Input 
                    id="consultationFee" 
                    name="consultationFee" 
                    type="number" 
                    defaultValue={editingDoctor?.consultationFee || 20} 
                    required
                    className="w-full"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slotDuration" className="text-sm font-medium">Duración por Cita (min)</Label>
                  <Input 
                    id="slotDuration" 
                    name="slotDuration" 
                    type="number" 
                    defaultValue={editingDoctor?.slotDuration || 30} 
                    required
                    className="w-full"
                    min="5"
                    step="5"
                  />
                </div>
              </div>
            </div>

            {/* Asignación de Vendedora */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Asignación</h3>
              
              <div className="space-y-2">
                <Label htmlFor="sellerId" className="text-sm font-medium">Vendedora Asignada</Label>
                <Select name="sellerId" defaultValue={editingDoctor?.sellerId || 'none'}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una vendedora"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna</SelectItem>
                    {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" className="w-full sm:w-auto">
                {editingDoctor ? 'Actualizar' : 'Registrar'} Médico
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro que deseas eliminar?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción es permanente y no se puede deshacer. Se eliminará a {itemToDelete?.name} del sistema.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sí, Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de historial de inactivaciones */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Historial de Inactivaciones
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {historyDoctor ? `Dr(a). ${historyDoctor.name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {historyLogs.length === 0 ? (
              <p className="text-muted-foreground text-center">No hay inactivaciones registradas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Origen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{('inactivatedAt' in log && log.inactivatedAt?.seconds)
  ? new Date(log.inactivatedAt.seconds * 1000).toLocaleString()
  : '-'}</TableCell>
                      <TableCell>{log.reason}</TableCell>
                      <TableCell>{log.origin}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

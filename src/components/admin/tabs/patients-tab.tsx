
"use client";
import { useState, useCallback, useEffect } from "react";
import type { Patient, Appointment } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import * as firestoreService from '@/lib/firestoreService';
import { Eye, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { z } from 'zod';
import { cn } from "@/lib/utils";
import { hashPassword } from '@/lib/password-utils';

const PatientFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Correo electrónico inválido."),
  cedula: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
});

export function PatientsTab() {
  const { toast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isPatientDetailDialogOpen, setIsPatientDetailDialogOpen] = useState(false);
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<Patient | null>(null);
  const [isPatientEditDialogOpen, setIsPatientEditDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Patient | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pats, apps] = await Promise.all([
        firestoreService.getPatients(),
        firestoreService.getAppointments(),
      ]);
      setPatients(pats);
      setAppointments(apps);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de los pacientes.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDeleteDialog = (patient: Patient) => {
    setItemToDelete(patient);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await firestoreService.deletePatient(itemToDelete.id);
      toast({ title: "Paciente Eliminado" });
      fetchData();
    } catch {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: 'No se pudo completar la operación.' });
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };


  const handleViewPatientDetails = (patient: Patient) => {
    setSelectedPatientForDetail(patient);
    setIsPatientDetailDialogOpen(true);
  };

  const handleOpenPatientEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setIsPatientEditDialogOpen(true);
  };

  const handleSavePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPatient) return;
    
    const formData = new FormData(e.currentTarget);
    const dataToValidate = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      cedula: formData.get('cedula') as string,
      phone: formData.get('phone') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    const result = PatientFormSchema.safeParse(dataToValidate);
    
    if (!result.success) {
        const errorMessage = result.error.errors.map(err => err.message).join(' ');
        toast({ variant: 'destructive', title: 'Errores de Validación', description: errorMessage });
        return;
    }

    const normalizedEmail = result.data.email.toLowerCase();
    
    // Validar si el email cambió y si ya está en uso por otro usuario
    if (normalizedEmail !== editingPatient.email.toLowerCase()) {
      const existingUser = await firestoreService.findUserByEmail(normalizedEmail);
      if (existingUser && existingUser.id !== editingPatient.id) {
        toast({ variant: 'destructive', title: 'Correo ya registrado', description: 'Este correo electrónico ya está en uso por otro usuario.' });
        return;
      }
    }

    const updatedPatientData: Partial<Patient> = {
      name: result.data.name,
      email: normalizedEmail,
      cedula: result.data.cedula || null,
      phone: result.data.phone || null,
    };
    
    if (result.data.password) {
        // Encriptar nueva contraseña
        const hashedPassword = await hashPassword(result.data.password);
        updatedPatientData.password = hashedPassword;
    }
    
    await firestoreService.updatePatient(editingPatient.id, updatedPatientData);
    toast({ title: "Paciente Actualizado", description: `La información de ${updatedPatientData.name} ha sido guardada.` });
    fetchData();
    setIsPatientEditDialogOpen(false);
    setEditingPatient(null);
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Filtrar pacientes basado en el término de búsqueda
  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.name.toLowerCase().includes(searchLower) ||
      patient.email.toLowerCase().includes(searchLower) ||
      (patient.cedula && patient.cedula.toLowerCase().includes(searchLower)) ||
      (patient.phone && patient.phone.toLowerCase().includes(searchLower))
    );
  });
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Pacientes</CardTitle>
          <CardDescription>Busca y gestiona la información de los pacientes registrados.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Buscador */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pacientes por nombre, email, cédula o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando {filteredPatients.length} de {patients.length} pacientes
              </p>
            )}
          </div>

           <div className="hidden md:block">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Paciente</TableHead><TableHead>Cédula</TableHead><TableHead>Contacto</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredPatients.map((patient) => (
                          <TableRow key={patient.id}>
                              <TableCell className="font-medium">{patient.name}</TableCell>
                              <TableCell>{patient.cedula || 'N/A'}</TableCell>
                              <TableCell><p>{patient.email}</p><p className="text-xs text-muted-foreground">{patient.phone || 'N/A'}</p></TableCell>
                              <TableCell className="text-right flex items-center justify-end gap-2">
                                  <Button variant="outline" size="icon" onClick={() => handleViewPatientDetails(patient)}><Eye className="h-4 w-4" /></Button>
                                  <Button variant="outline" size="icon" onClick={() => handleOpenPatientEditDialog(patient)}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="destructive" size="icon" onClick={() => openDeleteDialog(patient)}><Trash2 className="h-4 w-4" /></Button>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
           </div>
            <div className="space-y-4 md:hidden">
                  {filteredPatients.map((patient) => (
                      <div key={patient.id} className="p-4 border rounded-lg space-y-3">
                          <div><p className="font-semibold">{patient.name}</p><p className="text-xs text-muted-foreground">{patient.email}</p></div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><p className="text-xs text-muted-foreground">Cédula</p><p>{patient.cedula || 'N/A'}</p></div>
                              <div><p className="text-xs text-muted-foreground">Teléfono</p><p>{patient.phone || 'N/A'}</p></div>
                          </div>
                          <Separator />
                          <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewPatientDetails(patient)}><Eye className="mr-2 h-4 w-4" /> Ver</Button>
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenPatientEditDialog(patient)}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
                              <Button variant="destructive" size="sm" className="flex-1" onClick={() => openDeleteDialog(patient)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
                          </div>
                      </div>
                  ))}
                  {filteredPatients.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'No se encontraron pacientes con ese criterio de búsqueda.' : 'No hay pacientes registrados.'}
                    </p>
                  )}
              </div>
        </CardContent>
      </Card>
      <Dialog open={isPatientDetailDialogOpen} onOpenChange={setIsPatientDetailDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader><DialogTitle>Historial del Paciente: {selectedPatientForDetail?.name}</DialogTitle><DialogDescription>Consulta el historial completo de citas y pagos del paciente.</DialogDescription></DialogHeader>
            {selectedPatientForDetail && (
                <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                    <Card><CardHeader><CardTitle className="text-lg">Información del Paciente</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                            <p><strong>Nombre:</strong> {selectedPatientForDetail.name}</p><p><strong>Email:</strong> {selectedPatientForDetail.email}</p>
                            <p><strong>Cédula:</strong> {selectedPatientForDetail.cedula || 'N/A'}</p><p><strong>Teléfono:</strong> {selectedPatientForDetail.phone || 'N/A'}</p>
                            <p className="col-span-2"><strong>Contraseña:</strong> •••••••• (Encriptada por seguridad)</p>
                        </CardContent>
                    </Card>
                    <Card><CardHeader><CardTitle className="text-lg">Historial de Citas</CardTitle></CardHeader>
                        <CardContent>
                            {(() => {
                                const patientAppointments = appointments.filter(a => a.patientId === selectedPatientForDetail.id);
                                if (patientAppointments.length === 0) {
                                    return <p className="text-center text-muted-foreground py-8">Este paciente no tiene citas registradas.</p>;
                                }
                                return (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Doctor</TableHead><TableHead>Fecha</TableHead><TableHead>Servicios</TableHead><TableHead>Monto</TableHead><TableHead>Pago</TableHead><TableHead>Asistencia</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {patientAppointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(appt => (
                                                <TableRow key={appt.id}>
                                                    <TableCell className="font-medium">{appt.doctorName}</TableCell>
                                                    <TableCell>{new Date(appt.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</TableCell>
                                                    <TableCell className="text-xs">{appt.services.map(s => s.name).join(', ')}</TableCell><TableCell className="font-mono">${appt.totalPrice.toFixed(2)}</TableCell>
                                                    <TableCell><Badge variant={appt.paymentStatus === 'Pagado' ? 'default' : 'secondary'} className={cn(appt.paymentStatus === 'Pagado' ? 'bg-green-600 text-white' : '')}>{appt.paymentStatus}</Badge></TableCell>
                                                    <TableCell><Badge variant={appt.attendance === 'Atendido' ? 'default' : appt.attendance === 'No Asistió' ? 'destructive' : 'secondary'}>{appt.attendance}</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            )}
            <DialogFooter><DialogClose asChild><Button variant="outline">Cerrar</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isPatientEditDialogOpen} onOpenChange={setIsPatientEditDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Editar Paciente</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Actualiza la información del paciente {editingPatient?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePatient}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="patient-name" className="text-sm font-medium">Nombre Completo</Label>
                <Input 
                  id="patient-name" 
                  name="name" 
                  defaultValue={editingPatient?.name} 
                  required 
                  className="w-full"
                  placeholder="Ingresa el nombre completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="patient-email" className="text-sm font-medium">Correo Electrónico</Label>
                <Input 
                  id="patient-email" 
                  name="email" 
                  type="email" 
                  defaultValue={editingPatient?.email} 
                  required 
                  className="w-full"
                  placeholder="ejemplo@email.com"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-cedula" className="text-sm font-medium">Cédula</Label>
                  <Input 
                    id="patient-cedula" 
                    name="cedula" 
                    defaultValue={editingPatient?.cedula || ''} 
                    className="w-full"
                    placeholder="Número de cédula"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="patient-phone" className="text-sm font-medium">Teléfono</Label>
                  <Input 
                    id="patient-phone" 
                    name="phone" 
                    defaultValue={editingPatient?.phone || ''} 
                    className="w-full"
                    placeholder="Número de teléfono"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="patient-password" className="text-sm font-medium">Nueva Contraseña</Label>
                <Input 
                  id="patient-password" 
                  name="password" 
                  type="password" 
                  placeholder="Dejar en blanco para no cambiar"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres, con mayúsculas, minúsculas y números.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="patient-confirm-password" className="text-sm font-medium">Confirmar Contraseña</Label>
                <Input 
                  id="patient-confirm-password" 
                  name="confirmPassword" 
                  type="password" 
                  placeholder="Repite la contraseña"
                  className="w-full"
                />
              </div>
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" className="w-full sm:w-auto">
                Guardar Cambios
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
    </>
  );
}


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
import * as supabaseService from '@/lib/supabaseService';
import { Loader2, User, Pencil, Trash2, Search, History, CheckCircle, XCircle, Clock, ShieldCheck, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Pill } from 'lucide-react';
import { z } from 'zod';
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ProfessionSpecialtySelector } from "@/components/ui/profession-specialty-selector";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { resolveDoctorCapabilities } from "@/lib/professions-catalog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettings } from "@/lib/settings";
import { useDynamicData } from '@/hooks/use-dynamic-data';
import { getCurrentDateInArgentina, getPaymentDateInArgentina } from '@/lib/utils';
import { getDoctorInactivationLogs } from '@/lib/supabaseService';
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
  const { cities } = useDynamicData();
  const { professionsCatalog } = useSettings();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isDoctorDialogOpen, setIsDoctorDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Estado del selector de profesión, especialidad, ciudad y permisos clínicos dentro del modal
  const [formProfession, setFormProfession] = useState<string>('Médico');
  const [formSpecialty, setFormSpecialty] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('');
  const [formSellerId, setFormSellerId] = useState<string>('none');
  const [formHasMedicalRecord, setFormHasMedicalRecord] = useState<boolean>(true);
  const [formHasPrescription, setFormHasPrescription] = useState<boolean>(true);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Doctor | null>(null);

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<InactivationLog[]>([]);
  const [historyDoctor, setHistoryDoctor] = useState<Doctor | null>(null);

  // Paginación y filtro de verificación
  const [currentPage, setCurrentPage] = useState(1);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const ITEMS_PER_PAGE = 20;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [docs, sells] = await Promise.all([
        supabaseService.getDoctors(),
        supabaseService.getSellers(),
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

  useEffect(() => {
    if (editingDoctor) {
      const resolved = resolveDoctorCapabilities(editingDoctor, professionsCatalog);
      setFormProfession(resolved.profession || 'Médico');
      setFormSpecialty(editingDoctor.specialty || '');
      setFormCity(editingDoctor.city || '');
      setFormSellerId(editingDoctor.sellerId || 'none');
      setFormHasMedicalRecord(resolved.hasMedicalRecord);
      setFormHasPrescription(resolved.hasPrescription);
    } else {
      setFormProfession('Médico');
      setFormSpecialty('');
      setFormCity('');
      setFormSellerId('none');
      setFormHasMedicalRecord(true);
      setFormHasPrescription(true);
    }
  }, [editingDoctor, professionsCatalog, isDoctorDialogOpen]);

  const handleQuickToggleCapability = async (
    doctor: Doctor,
    field: 'hasMedicalRecord' | 'hasPrescription'
  ) => {
    const resolved = resolveDoctorCapabilities(doctor, professionsCatalog);
    const nextVal = field === 'hasMedicalRecord' ? !resolved.hasMedicalRecord : !resolved.hasPrescription;
    try {
      await supabaseService.updateDoctor(doctor.id, {
        [field]: nextVal,
        profession: resolved.profession,
      });
      toast({
        title: 'Permiso actualizado',
        description: `${field === 'hasMedicalRecord' ? 'Historia Médica' : 'Récipe Médico'} ${nextVal ? 'habilitado' : 'deshabilitado'} para ${doctor.name}.`,
      });
      fetchData();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el permiso.' });
    }
  };

  // Resetear a página 1 cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const openDeleteDialog = (doctor: Doctor) => {
    setItemToDelete(doctor);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await supabaseService.deleteDoctor(itemToDelete.id);
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
    await supabaseService.updateDoctorStatus(doctor.id, newStatus);
    toast({ title: "Estado Actualizado", description: `El Dr. ${doctor.name} ahora está ${newStatus === 'active' ? 'activo' : 'inactivo'}.` });
    fetchData();
  };

  const handleVerificationStatusChange = async (doctor: Doctor, status: 'pending' | 'verified' | 'rejected') => {
    try {
      await supabaseService.updateDoctor(doctor.id, { verificationStatus: status });
      toast({
        title: status === 'verified' ? '✅ Médico Verificado' : 'Verificación Actualizada',
        description:
          status === 'verified'
            ? `El Dr(a). ${doctor.name} ha sido verificado exitosamente y se le ha enviado un correo de confirmación.`
            : `La matrícula del Dr(a). ${doctor.name} ha sido marcada como ${status === 'rejected' ? 'rechazada' : 'pendiente'}.`,
      });
      fetchData();
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el estado de verificación." });
    }
  };

  const handleSaveDoctor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataToValidate = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      specialty: formSpecialty || (formData.get('specialty') as string),
      city: formData.get('city') as string,
      address: formData.get('address') as string,
      sellerId: (formData.get('sellerId') as string) === 'none' ? null : (formData.get('sellerId') as string),
      slotDuration: formData.get('slotDuration') as string,
      consultationFee: formData.get('consultationFee') as string,
    };

    // Get medicalLicense separately as it's not in the schema
    const medicalLicense = formData.get('medicalLicense') as string;

    const result = DoctorFormSchema.safeParse(dataToValidate);

    if (!result.success) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: result.error.errors.map(err => err.message).join(' ') });
      return;
    }

    if (editingDoctor) {
      const normalizedEmail = result.data.email.toLowerCase();

      // Validar si el email cambió y si ya está en uso por otro usuario
      if (normalizedEmail !== editingDoctor.email.toLowerCase()) {
        const existingUser = await supabaseService.findUserByEmail(normalizedEmail);
        if (existingUser && existingUser.id !== editingDoctor.id) {
          toast({ variant: 'destructive', title: 'Correo ya registrado', description: 'Este correo electrónico ya está en uso por otro usuario.' });
          return;
        }
      }

      // Logic for updating a doctor
      const updateData: Partial<Doctor> = {
        name: result.data.name,
        email: normalizedEmail,
        profession: formProfession,
        specialty: result.data.specialty,
        hasMedicalRecord: formHasMedicalRecord,
        hasPrescription: formHasPrescription,
        city: result.data.city,
        address: result.data.address,
        sellerId: result.data.sellerId,
        slotDuration: result.data.slotDuration,
        consultationFee: result.data.consultationFee,
        medicalLicense: medicalLicense || '',
      };

      if (result.data.password) {
        // Encriptar nueva contraseña
        const hashedPassword = await hashPassword(result.data.password);
        updateData.password = hashedPassword;
      }

      await supabaseService.updateDoctor(editingDoctor.id, updateData);
      toast({ title: "Médico Actualizado", description: "Los datos del médico han sido guardados." });
    } else {
      // Logic for adding a new doctor
      if (!result.data.password) {
        toast({ variant: 'destructive', title: 'Contraseña Requerida', description: 'Debe establecer una contraseña para los nuevos médicos.' });
        return;
      }

      const normalizedEmail = result.data.email.toLowerCase();
      // Check if email exists
      const existingUser = await supabaseService.findUserByEmail(normalizedEmail);
      if (existingUser) {
        toast({ variant: 'destructive', title: 'Correo ya registrado', description: 'Este correo electrónico ya está en uso por otro usuario.' });
        return;
      }

      const { password, confirmPassword, ...restOfData } = result.data;

      // Encriptar contraseña
      const hashedPassword = await hashPassword(password);

      const newDoctorData: Omit<Doctor, 'id'> = {
        ...restOfData,
        profession: formProfession,
        hasMedicalRecord: formHasMedicalRecord,
        hasPrescription: formHasPrescription,
        email: normalizedEmail,
        password: hashedPassword,
        cedula: '', // Vacío por defecto, el doctor lo completará después
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
        // lastPaymentDate: null, // Dejar que la base de datos maneje el valor por defecto (NULL)
        whatsapp: '',
        lat: 0,
        lng: 0,
        joinDate: getCurrentDateInArgentina(),
        subscriptionStatus: 'active',
        nextPaymentDate: getPaymentDateInArgentina(new Date()),
        coupons: [],
        expenses: []
      };
      await supabaseService.addDoctor(newDoctorData);
      toast({ title: 'Médico Registrado', description: `El Dr. ${result.data.name} ha sido añadido.` });
    }

    fetchData();
    setIsDoctorDialogOpen(false);
    setEditingDoctor(null);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Contadores por estatus de verificación
  const pendingVerificationCount = doctors.filter(d => !d.verificationStatus || d.verificationStatus === 'pending').length;
  const verifiedCount = doctors.filter(d => d.verificationStatus === 'verified').length;
  const rejectedCount = doctors.filter(d => d.verificationStatus === 'rejected').length;

  // Filtrar médicos basado en el término de búsqueda y estatus de verificación
  const filteredDoctors = doctors.filter(doctor => {
    const docVerifStatus = doctor.verificationStatus || 'pending';
    if (verificationFilter !== 'all' && docVerifStatus !== verificationFilter) {
      return false;
    }

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

  // Cálculos de paginación
  const totalPages = Math.ceil(filteredDoctors.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDoctors = filteredDoctors.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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
            <User className="mr-2 h-4 w-4" /> Añadir Médico
          </Button>
        </CardHeader>
        <CardContent>
          {/* Buscador y Filtros de Verificación */}
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar médicos por nombre, email, especialidad, ciudad o vendedora..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={verificationFilter === 'all' ? 'default' : 'outline'}
                onClick={() => { setVerificationFilter('all'); setCurrentPage(1); }}
                className="h-8 text-xs"
              >
                Todos ({doctors.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={verificationFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => { setVerificationFilter('pending'); setCurrentPage(1); }}
                className={cn(
                  "h-8 text-xs gap-1.5",
                  verificationFilter === 'pending'
                    ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                    : "text-amber-700 border-amber-300 bg-amber-50/60 hover:bg-amber-100"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Pendientes por Verificar ({pendingVerificationCount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={verificationFilter === 'verified' ? 'default' : 'outline'}
                onClick={() => { setVerificationFilter('verified'); setCurrentPage(1); }}
                className={cn(
                  "h-8 text-xs gap-1.5",
                  verificationFilter === 'verified'
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "text-blue-700 border-blue-200 hover:bg-blue-50"
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Verificados ({verifiedCount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={verificationFilter === 'rejected' ? 'default' : 'outline'}
                onClick={() => { setVerificationFilter('rejected'); setCurrentPage(1); }}
                className={cn(
                  "h-8 text-xs gap-1.5",
                  verificationFilter === 'rejected'
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "text-red-700 border-red-200 hover:bg-red-50"
                )}
              >
                <XCircle className="h-3.5 w-3.5" />
                Rechazados ({rejectedCount})
              </Button>
            </div>

            {(searchTerm || verificationFilter !== 'all') && (
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredDoctors.length} de {doctors.length} médicos
              </p>
            )}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader><TableRow><TableHead>Especialista</TableHead><TableHead>Profesión / Especialidad</TableHead><TableHead>Módulos Clínicos (Clic para editar)</TableHead><TableHead>Matrícula</TableHead><TableHead>Ubicación</TableHead><TableHead>Vendedora</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {paginatedDoctors.map((doctor) => {
                  const caps = resolveDoctorCapabilities(doctor, professionsCatalog);
                  return (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                          {caps.profession}
                        </span>
                        <span className="text-xs font-medium text-slate-800">
                          {doctor.specialty}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          onClick={() => handleQuickToggleCapability(doctor, 'hasMedicalRecord')}
                          title="Clic para activar/desactivar Historia Médica en este especialista"
                          className={cn(
                            "cursor-pointer text-[11px] gap-1 transition-all select-none",
                            caps.hasMedicalRecord
                              ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                              : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 line-through"
                          )}
                        >
                          <FileText className="h-3 w-3" />
                          Historia Médica
                        </Badge>
                        <Badge
                          variant="outline"
                          onClick={() => handleQuickToggleCapability(doctor, 'hasPrescription')}
                          title="Clic para activar/desactivar Récipe Médico en este especialista"
                          className={cn(
                            "cursor-pointer text-[11px] gap-1 transition-all select-none",
                            caps.hasPrescription
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 line-through"
                          )}
                        >
                          <Pill className="h-3 w-3" />
                          Récipe Médico
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{doctor.medicalLicense || '-'}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Badge
                              className={cn("cursor-pointer w-fit flex items-center gap-1",
                                doctor.verificationStatus === 'verified' ? 'bg-blue-600 hover:bg-blue-700' :
                                  doctor.verificationStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                                    'bg-yellow-500 hover:bg-yellow-600'
                              )}
                            >
                              {doctor.verificationStatus === 'verified' ? <ShieldCheck className="h-3 w-3" /> :
                                doctor.verificationStatus === 'rejected' ? <XCircle className="h-3 w-3" /> :
                                  <Clock className="h-3 w-3" />
                              }
                              {doctor.verificationStatus === 'verified' ? 'Verificado' : doctor.verificationStatus === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>Estado de Matrícula</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleVerificationStatusChange(doctor, 'verified')}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Aprobar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleVerificationStatusChange(doctor, 'rejected')}>
                              <XCircle className="mr-2 h-4 w-4 text-red-500" /> Rechazar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleVerificationStatusChange(doctor, 'pending')}>
                              <Clock className="mr-2 h-4 w-4 text-yellow-500" /> Pendiente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-4 md:hidden">
            {paginatedDoctors.map((doctor) => (
              <div key={doctor.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{doctor.name}</p>
                    <p className="text-sm text-muted-foreground">{doctor.specialty} - {doctor.city}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Matrícula: {doctor.medicalLicense || 'No indicada'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge onClick={() => handleToggleDoctorStatus(doctor)} className={cn("cursor-pointer", doctor.status === 'active' ? 'bg-green-600' : 'bg-red-600', 'text-white')}>
                      {doctor.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge
                          className={cn("cursor-pointer w-fit flex items-center gap-1",
                            doctor.verificationStatus === 'verified' ? 'bg-blue-600 hover:bg-blue-700' :
                              doctor.verificationStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                                'bg-yellow-500 hover:bg-yellow-600'
                          )}
                        >
                          {doctor.verificationStatus === 'verified' ? <ShieldCheck className="h-3 w-3" /> :
                            doctor.verificationStatus === 'rejected' ? <XCircle className="h-3 w-3" /> :
                              <Clock className="h-3 w-3" />
                          }
                          {doctor.verificationStatus === 'verified' ? 'Verificado' : doctor.verificationStatus === 'rejected' ? 'Rechazado' : 'Pendiente'}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Estado de Matrícula</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleVerificationStatusChange(doctor, 'verified')}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Aprobar (Verificar)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleVerificationStatusChange(doctor, 'rejected')}>
                          <XCircle className="mr-2 h-4 w-4 text-red-500" /> Rechazar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleVerificationStatusChange(doctor, 'pending')}>
                          <Clock className="mr-2 h-4 w-4 text-yellow-500" /> Pendiente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingDoctor(doctor); setIsDoctorDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(doctor)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
                </div>
              </div>
            ))}
          </div>

          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredDoctors.length)} de {filteredDoctors.length} médicos
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-3">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Información Profesional y Permisos Clínicos</h3>

              <ProfessionSpecialtySelector
                profession={formProfession}
                specialty={formSpecialty}
                onChange={({ profession, specialty, hasMedicalRecord, hasPrescription }) => {
                  setFormProfession(profession);
                  setFormSpecialty(specialty);
                  setFormHasMedicalRecord(hasMedicalRecord);
                  setFormHasPrescription(hasPrescription);
                }}
              />

              {/* Interruptores manuales para que el Admin pueda sobreescribir permisos del especialista */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5 space-y-2.5">
                <p className="text-xs font-bold text-teal-950">
                  Permisos de Módulos Clínicos para este Especialista
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Historia Médica</p>
                        <p className="text-[10px] text-slate-500">Acceso a evolución clínica</p>
                      </div>
                    </div>
                    <Switch
                      checked={formHasMedicalRecord}
                      onCheckedChange={setFormHasMedicalRecord}
                    />
                  </div>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Récipe Médico</p>
                        <p className="text-[10px] text-slate-500">Emisión de recetas y farmacia</p>
                      </div>
                    </div>
                    <Switch
                      checked={formHasPrescription}
                      onCheckedChange={setFormHasPrescription}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium">Ciudad (puedes escribir para filtrar)</Label>
                  <SearchableSelect
                    name="city"
                    value={formCity}
                    onValueChange={(val) => setFormCity(val)}
                    options={cities.map((c) => ({ value: c, label: c }))}
                    placeholder="Selecciona o escribe la ciudad..."
                    searchPlaceholder="Escribe las iniciales de la ciudad..."
                    emptyMessage="No se encontró esa ciudad."
                  />
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

              <div className="space-y-2">
                <Label htmlFor="medicalLicense" className="text-sm font-medium">Número de Matrícula Médica</Label>
                <Input
                  id="medicalLicense"
                  name="medicalLicense"
                  defaultValue={editingDoctor?.medicalLicense || ''}
                  className="w-full"
                  placeholder="Ej: MN 123456"
                />
                <p className="text-xs text-muted-foreground">
                  Este número puede ser verificado usando el badge en la tabla
                </p>
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
                <SearchableSelect
                  name="sellerId"
                  value={formSellerId}
                  onValueChange={(val) => setFormSellerId(val)}
                  options={[
                    { value: 'none', label: 'Ninguna' },
                    ...sellers.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                  placeholder="Selecciona o escribe una vendedora..."
                  searchPlaceholder="Escribe el nombre de la vendedora..."
                  emptyMessage="No se encontró esa vendedora."
                />
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

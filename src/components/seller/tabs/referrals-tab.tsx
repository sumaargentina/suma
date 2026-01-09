"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Doctor, DoctorPayment } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import * as supabaseService from '@/lib/supabaseService';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { useDynamicData } from '@/hooks/use-dynamic-data';
import { z } from 'zod';
import { hashPassword } from '@/lib/password-utils';
import { PlusCircle, Search, Link as LinkIcon, Copy, Mail, Phone, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCurrentDateInArgentina, getPaymentDateInArgentina } from '@/lib/utils';

const passwordSchema = z.string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula.")
  .regex(/[a-z]/, "Debe contener al menos una minúscula.")
  .regex(/[0-9]/, "Debe contener al menos un número.");

const DoctorFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Por favor, ingresa un correo electrónico válido."),
  password: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
  specialty: z.string().min(1, "Debes seleccionar una especialidad."),
  city: z.string().min(1, "Debes seleccionar una ciudad."),
  address: z.string().min(5, "La dirección es requerida."),
  slotDuration: z.preprocess((val) => Number(val), z.number().int().min(5, "La duración debe ser al menos 5 min.").positive()),
  consultationFee: z.preprocess((val) => Number(val), z.number().min(0, "La tarifa de consulta no puede ser negativa.")),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password) {
    const passResult = passwordSchema.safeParse(password);
    if (!passResult.success) {
      passResult.error.errors.forEach(err => ctx.addIssue({ ...err, path: ['password'] }));
    }
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las contraseñas no coinciden.",
        path: ["confirmPassword"],
      });
    }
  }
});

interface ReferralsTabProps {
  referredDoctors: Doctor[];
  referralCode: string;
  onUpdate: () => void;
}

export function ReferralsTab({ referredDoctors, referralCode, onUpdate }: ReferralsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cities, specialties } = useDynamicData();
  const [doctorPayments, setDoctorPayments] = useState<DoctorPayment[]>([]);

  const [isDoctorDialogOpen, setIsDoctorDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [doctorsToShow, setDoctorsToShow] = useState(10);
  const [isDoctorPaymentsDialogOpen, setIsDoctorPaymentsDialogOpen] = useState(false);
  const [selectedDoctorForPayments, setSelectedDoctorForPayments] = useState<Doctor | null>(null);

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/register-doctor?ref=${referralCode}`;

  useEffect(() => {
    const fetchPayments = async () => {
      const allPayments = await supabaseService.getDoctorPayments();
      setDoctorPayments(allPayments);
    }
    fetchPayments();
  }, [])

  const filteredAndSortedDoctors = useMemo(() => {
    let doctors = [...referredDoctors]
      .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());

    if (searchTerm) {
      doctors = doctors.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (cityFilter !== 'all') {
      doctors = doctors.filter(doc => doc.city === cityFilter);
    }

    if (doctorsToShow !== -1) {
      return doctors.slice(0, doctorsToShow);
    }

    return doctors;
  }, [referredDoctors, searchTerm, cityFilter, doctorsToShow]);

  const handleViewDoctorPayments = (doctor: Doctor) => {
    setSelectedDoctorForPayments(doctor);
    setIsDoctorPaymentsDialogOpen(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || user.role !== 'seller') return;

    const formData = new FormData(e.currentTarget);
    const dataToValidate = {
      name: formData.get('doc-name') as string,
      email: formData.get('doc-email') as string,
      password: formData.get('doc-password') as string,
      confirmPassword: formData.get('doc-confirm-password') as string,
      specialty: formData.get('doc-specialty') as string,
      city: formData.get('doc-city') as string,
      address: formData.get('doc-address') as string,
      slotDuration: parseInt(formData.get('doc-slot-duration') as string, 10),
      consultationFee: parseFloat(formData.get('doc-consultation-fee') as string),
    };

    const result = DoctorFormSchema.safeParse(dataToValidate);

    if (!result.success) {
      const errorMessage = result.error.errors.map(err => err.message).join(' ');
      toast({ variant: 'destructive', title: 'Errores de Validación', description: errorMessage });
      return;
    }

    if (!result.data.password) {
      toast({ variant: 'destructive', title: 'Contraseña Requerida', description: 'Debe establecer una contraseña para los nuevos médicos.' });
      return;
    }

    const normalizedEmail = result.data.email.toLowerCase();
    const existingUser = await supabaseService.findUserByEmail(normalizedEmail);
    if (existingUser) {
      toast({ variant: 'destructive', title: 'Correo ya registrado', description: 'Este correo electrónico ya está en uso por otro usuario.' });
      return;
    }

    const { name, specialty, city, address, password, slotDuration, consultationFee } = result.data;

    // Encriptar contraseña
    const hashedPassword = await hashPassword(password);

    const joinDate = new Date();
    const joinDateArgentina = getCurrentDateInArgentina();
    const paymentDateArgentina = getPaymentDateInArgentina(joinDate);

    const newDoctorData: Omit<Doctor, 'id'> = {
      name, email: normalizedEmail, specialty, city, address,
      password: hashedPassword,
      sellerId: user.id,
      cedula: '', sector: '', rating: 0, reviewCount: 0,
      profileImage: 'https://placehold.co/400x400.png',
      bannerImage: 'https://placehold.co/1200x400.png',
      aiHint: 'doctor portrait', description: '', services: [], bankDetails: [],
      slotDuration: slotDuration, consultationFee,
      schedule: {
        monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
        tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
        wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
        thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
        friday: { active: true, slots: [{ start: "09:00", end: "13:00" }] },
        saturday: { active: false, slots: [] },
        sunday: { active: false, slots: [] },
      },
      status: 'active', lastPaymentDate: '',
      whatsapp: '', lat: 0, lng: 0,
      joinDate: joinDateArgentina,
      subscriptionStatus: 'active', nextPaymentDate: paymentDateArgentina,
      coupons: [], expenses: [],
    };

    try {
      await supabaseService.addDoctor(newDoctorData);
      toast({ title: 'Médico Registrado', description: `El Dr. ${name} ha sido añadido como tu referido.` });
      onUpdate();
      setIsDoctorDialogOpen(false);
    } catch (error) {
      console.error("Error adding doctor:", error);
      toast({ variant: 'destructive', title: 'Error al registrar', description: 'No se pudo crear el médico en la base de datos.' });
    }
  };

  return (
    <>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LinkIcon className="text-primary" /> Tu Enlace de Referido</CardTitle>
            <CardDescription>Comparte este enlace con los médicos para que se registren bajo tu código.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-stretch gap-2">
            <Input value={referralLink} readOnly className="text-sm bg-background flex-1" />
            <Button onClick={() => navigator.clipboard.writeText(referralLink)} className="w-full sm:w-auto">
              <Copy className="mr-2 h-4 w-4" />Copiar Enlace
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Mis Médicos Referidos</CardTitle>
                <CardDescription>Busca, filtra y registra los doctores que se han unido con tu enlace.</CardDescription>
              </div>
              <Button onClick={() => setIsDoctorDialogOpen(true)} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Registrar Médico
              </Button>
            </div>
            <div className="mt-4 flex flex-col md:flex-row gap-2">
              <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por nombre..." className="pl-8 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <Select value={cityFilter} onValueChange={setCityFilter}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filtrar por ciudad" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las ciudades</SelectItem>{cities.map((city) => (<SelectItem key={city} value={city}>{city}</SelectItem>))}</SelectContent></Select>
              <Select value={String(doctorsToShow)} onValueChange={(val) => setDoctorsToShow(Number(val))}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Mostrar" /></SelectTrigger><SelectContent><SelectItem value="5">Mostrar 5</SelectItem><SelectItem value="10">Mostrar 10</SelectItem><SelectItem value="20">Mostrar 20</SelectItem><SelectItem value="-1">Mostrar Todos</SelectItem></SelectContent></Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="hidden md:table">
              <Table><TableHeader><TableRow><TableHead>Médico</TableHead><TableHead>Contacto</TableHead><TableHead>Especialidad</TableHead><TableHead>Ubicación</TableHead><TableHead>Fecha de Registro</TableHead><TableHead className="text-center">Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredAndSortedDoctors.length > 0 ? filteredAndSortedDoctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">{doctor.name}</TableCell>
                      <TableCell><div className="flex flex-col gap-1 text-xs"><span key={`${doctor.id}-email`} className="flex items-center gap-1.5"><Mail className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{doctor.email}</span></span><span key={`${doctor.id}-phone`} className="flex items-center gap-1.5"><Phone className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{doctor.whatsapp}</span></span></div></TableCell>
                      <TableCell>{doctor.specialty}</TableCell><TableCell>{doctor.city}, {doctor.sector}</TableCell>
                      <TableCell>{format(new Date(doctor.joinDate + 'T00:00:00'), "d 'de' LLLL, yyyy", { locale: es })}</TableCell>
                      <TableCell className="text-center"><Badge variant={doctor.status === 'active' ? 'default' : 'destructive'} className={cn(doctor.status === 'active' && 'bg-green-600 text-white')}>{doctor.status === 'active' ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}{doctor.status === 'active' ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="icon" onClick={() => handleViewDoctorPayments(doctor)}><DollarSign className="h-4 w-4" /><span className="sr-only">Ver Pagos</span></Button></TableCell>
                    </TableRow>
                  )) : (<TableRow><TableCell colSpan={7} className="h-24 text-center">No se encontraron médicos con los filtros actuales.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-4 md:hidden">
              {filteredAndSortedDoctors.length > 0 ? filteredAndSortedDoctors.map((doctor) => (
                <div key={doctor.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-start gap-2"><div><p className="font-bold">{doctor.name}</p><p className="text-sm text-muted-foreground">{doctor.specialty}</p></div><Badge variant={doctor.status === 'active' ? 'default' : 'destructive'} className={cn(doctor.status === 'active' && 'bg-green-600 text-white')}>{doctor.status === 'active' ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}{doctor.status === 'active' ? 'Activo' : 'Inactivo'}</Badge></div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div key={`${doctor.id}-location`}><p className="font-semibold text-xs text-muted-foreground mb-1">Ubicación</p><p>{doctor.city}</p></div><div key={`${doctor.id}-date`}><p className="font-semibold text-xs text-muted-foreground mb-1">Fecha Registro</p><p>{format(new Date(doctor.joinDate + 'T00:00:00'), "d MMM, yyyy", { locale: es })}</p></div><div key={`${doctor.id}-contact`} className="col-span-2"><p className="font-semibold text-xs text-muted-foreground mb-1">Contacto</p><div className="flex flex-col gap-1.5 text-xs"><span key={`${doctor.id}-email-mobile`} className="flex items-center gap-1.5"><Mail className="h-3 w-3 flex-shrink-0" /> <span>{doctor.email}</span></span><span key={`${doctor.id}-phone-mobile`} className="flex items-center gap-1.5"><Phone className="h-3 w-3 flex-shrink-0" /> <span>{doctor.whatsapp}</span></span></div></div></div>
                  <Separator /><Button variant="outline" size="sm" className="w-full" onClick={() => handleViewDoctorPayments(doctor)}><DollarSign className="mr-2 h-4 w-4" /> Ver Historial de Pagos</Button>
                </div>
              )) : (<div className="h-24 text-center flex items-center justify-center text-muted-foreground">No se encontraron médicos con los filtros actuales.</div>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDoctorDialogOpen} onOpenChange={setIsDoctorDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Registrar Nuevo Médico</DialogTitle>
            <DialogDescription>
              Completa la información del perfil del médico. Quedará registrado como tu referido.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDoctor}>
            <div className="space-y-6 py-4">
              {/* Información Personal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b pb-2">Información Personal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-name">Nombre Completo</Label>
                    <Input
                      id="doc-name"
                      name="doc-name"
                      placeholder="Dr. Juan Pérez"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-email">Correo Electrónico</Label>
                    <Input
                      id="doc-email"
                      name="doc-email"
                      type="email"
                      placeholder="doctor@ejemplo.com"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Seguridad */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b pb-2">Seguridad</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-password">Contraseña</Label>
                    <Input
                      id="doc-password"
                      name="doc-password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      8+ caracteres, con mayúsculas, minúsculas y números
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-confirm-password">Confirmar Contraseña</Label>
                    <Input
                      id="doc-confirm-password"
                      name="doc-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Información Profesional */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b pb-2">Información Profesional</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-specialty">Especialidad</Label>
                    <Select name="doc-specialty">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una especialidad..." />
                      </SelectTrigger>
                      <SelectContent>
                        {specialties.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-city">Ciudad</Label>
                    <Select name="doc-city">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una ciudad..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-address">Dirección del Consultorio</Label>
                  <Input
                    id="doc-address"
                    name="doc-address"
                    placeholder="Ej: Av. Principal, Centro Médico, Piso 2, Consultorio 204"
                    required
                  />
                </div>
              </div>

              {/* Configuración de Citas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b pb-2">Configuración de Citas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-slot-duration">Duración por Cita (minutos)</Label>
                    <Input
                      id="doc-slot-duration"
                      name="doc-slot-duration"
                      type="number"
                      defaultValue="30"
                      min="5"
                      max="120"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Tiempo promedio por consulta
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-consultation-fee">Tarifa de Consulta ($)</Label>
                    <Input
                      id="doc-consultation-fee"
                      name="doc-consultation-fee"
                      type="number"
                      defaultValue="20"
                      min="0"
                      step="0.01"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Precio base por consulta
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Médico
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isDoctorPaymentsDialogOpen} onOpenChange={setIsDoctorPaymentsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Historial de Pagos de {selectedDoctorForPayments?.name}</DialogTitle><DialogDescription>Lista de todos los pagos de suscripción realizados por este médico.</DialogDescription></DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Monto</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>
                {doctorPayments.filter(p => p.doctorId === selectedDoctorForPayments?.id).length > 0 ? (
                  doctorPayments.filter(p => p.doctorId === selectedDoctorForPayments?.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.date + 'T00:00:00'), "d MMM yyyy", { locale: es })}</TableCell>
                        <TableCell>${payment.amount.toFixed(2)}</TableCell>
                        <TableCell><Badge className={cn({ 'bg-green-600 text-white': payment.status === 'Paid', 'bg-amber-500 text-white': payment.status === 'Pending', 'bg-red-600 text-white': payment.status === 'Rejected', })}>{payment.status === 'Paid' ? 'Pagado' : payment.status === 'Pending' ? 'En Revisión' : 'Rechazado'}</Badge></TableCell>
                      </TableRow>
                    ))
                ) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">Este médico no tiene pagos registrados.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cerrar</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

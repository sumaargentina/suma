"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Doctor, ClinicBranch, ClinicSpecialty } from '@/lib/types';
import { getClinicDoctors, addDoctor, updateDoctor, getClinicBranches, getClinicSpecialties, getClinicAppointments, getDoctorAppointmentHistory, uploadPublicImage } from '@/lib/supabaseService';
import Image from 'next/image';
import { Appointment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { hashPassword } from '@/lib/password-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, User, Mail, Building2, Settings, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { getCurrentDateInArgentina, getPaymentDateInArgentina } from '@/lib/utils';
import { DoctorConfigurationModal } from '../doctor-config-modal';
import { getClinicServices } from '@/lib/supabaseService';
import { Service } from '@/lib/types';

export function DoctorsTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [clinicServices, setClinicServices] = useState<Service[]>([]); // To pass to config modal
    const [specialties, setSpecialties] = useState<ClinicSpecialty[]>([]);
    const [loading, setLoading] = useState(true);

    // Create/Edit Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
    const [changePassword, setChangePassword] = useState(false);

    // Config Modal State
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configDoctor, setConfigDoctor] = useState<Doctor | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '', // Only for new doctors
        specialty: '',
    });

    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [previewProfile, setPreviewProfile] = useState('');
    const [previewBanner, setPreviewBanner] = useState('');

    const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]); // This will now hold filtered appointments, not just today's
    const [selectedDoctorForStats, setSelectedDoctorForStats] = useState<Doctor | null>(null);
    const [doctorHistory, setDoctorHistory] = useState<Appointment[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Advanced Filter State
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });
    const [activePreset, setActivePreset] = useState<string>('today');

    // Handle preset clicks
    const handlePresetChange = (preset: string) => {
        setActivePreset(preset);
        const today = new Date();
        switch (preset) {
            case 'today':
                setDateRange({ from: today, to: today });
                break;
            case 'yesterday':
                const yest = subDays(today, 1);
                setDateRange({ from: yest, to: yest });
                break;
            case 'week':
                setDateRange({ from: subDays(today, 7), to: today });
                break;
            case 'month':
                setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
                break;
        }
    };

    // Handle manual picker change
    const handleDateRangeChange = (range: DateRange | undefined) => {
        setDateRange(range);
        setActivePreset('custom');
    };

    // Details Sheet Filter State
    const [detailsDateRange, setDetailsDateRange] = useState<DateRange | undefined>(undefined);
    const [detailsPreset, setDetailsPreset] = useState<string>('all');

    const handleDetailsPresetChange = (preset: string) => {
        setDetailsPreset(preset);
        const today = new Date();
        switch (preset) {
            case 'all':
                setDetailsDateRange(undefined);
                break;
            case 'today':
                setDetailsDateRange({ from: today, to: today });
                break;
            case 'month':
                setDetailsDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
                break;
        }
    };

    const handleDetailsDateRangeChange = (range: DateRange | undefined) => {
        setDetailsDateRange(range);
        setDetailsPreset('custom');
    };

    const handleViewDetails = async (doctor: Doctor) => {
        setSelectedDoctorForStats(doctor);
        // Reset details filter
        setDetailsDateRange(undefined);
        setDetailsPreset('all');
        // Fetch will be triggered by useEffect below or we can call it here initially?
        // But useEffect is safer for updates.
        // We need a separate useEffect for details.
    };

    useEffect(() => {
        const fetchHistory = async () => {
            if (!selectedDoctorForStats) return;
            setIsLoadingHistory(true);
            try {
                const start = detailsDateRange?.from ? format(detailsDateRange.from, 'yyyy-MM-dd') : undefined;
                const end = detailsDateRange?.to ? format(detailsDateRange.to, 'yyyy-MM-dd') : start;

                const history = await getDoctorAppointmentHistory(selectedDoctorForStats.id, start, end);
                setDoctorHistory(history);
            } catch (e) {
                console.error(e);
                toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial." });
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [selectedDoctorForStats, detailsDateRange]);

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id, dateRange]); // Fetch when dateRange changes

    const loadData = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);

            // Format dates for API
            const startDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
            // If only 'from' is selected, use it as end date too (single day), OR behave as 'from onwards'.
            // Usually range picker sets 'from' first. If 'to' is undefined, user might be selecting.
            // Let's default 'to' = 'from' if undefined for query, or just wait?
            // Shadcn range picker usually handles this.

            // If dateRange is undefined, skip fetching filters or fetch all?
            // Let's assume default is Today initiated above.

            const endDateStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : startDateStr;

            const [doctorsData, servicesData, specialtiesData] = await Promise.all([
                getClinicDoctors(user.id),
                getClinicServices(user.id),
                getClinicSpecialties(user.id)
            ]);

            const filteredAppts = startDateStr ? await getClinicAppointments(user.id, startDateStr, endDateStr) : [];

            setDoctors(doctorsData);
            setClinicServices(servicesData);
            setSpecialties(specialtiesData);
            setTodaysAppointments(filteredAppts);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenConfig = (doctor: Doctor) => {
        setConfigDoctor(doctor);
        setIsConfigOpen(true);
    };

    const handleSaveConfig = () => {
        loadData(); // Reload to reflect changes
    };



    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', specialty: '' });
        setProfileFile(null);
        setBannerFile(null);
        setPreviewProfile('');
        setPreviewBanner('');
        setEditingDoctor(null);
    };

    const handleToggleStatus = async (doctor: Doctor) => {
        const newStatus = doctor.status === 'active' ? 'inactive' : 'active';

        // Optimistic update
        setDoctors(docs => docs.map(d => d.id === doctor.id ? { ...d, status: newStatus } : d));

        try {
            await updateDoctor(doctor.id, { status: newStatus });
            toast({
                title: newStatus === 'active' ? "Médico habilitado" : "Médico deshabilitado",
                description: `El Dr. ${doctor.name} ahora está ${newStatus === 'active' ? 'activo' : 'inactivo'}.`
            });
        } catch (error) {
            console.error('Error updating status:', error);
            // Revert changes on error
            setDoctors(docs => docs.map(d => d.id === doctor.id ? { ...d, status: doctor.status } : d));
            toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar el estado." });
        }
    };

    const handleOpenDialog = (doctor?: Doctor) => {
        if (doctor) {
            setEditingDoctor(doctor);
            setFormData({
                name: doctor.name,
                email: doctor.email,
                password: '', // Don't show password
                specialty: doctor.specialty,
            });
        } else {
            resetForm();
        }
        // Force reset if editing -> new transition managed by resetForm but here we also need to set previews for editing
        if (doctor) {
            setPreviewProfile(doctor.profileImage || '');
            setPreviewBanner(doctor.bannerImage || '');
            setProfileFile(null);
            setBannerFile(null);
        }
        setChangePassword(false);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        try {
            setIsSubmitting(true);

            if (editingDoctor) {
                // Upload images if new ones selected
                let profileUrl = editingDoctor.profileImage;
                if (profileFile) {
                    profileUrl = await uploadPublicImage(profileFile, 'images', `doctors/${editingDoctor.id}/profile`);
                }

                let bannerUrl = editingDoctor.bannerImage;
                if (bannerFile) {
                    bannerUrl = await uploadPublicImage(bannerFile, 'images', `doctors/${editingDoctor.id}/banner`);
                }

                // Update
                const updateData: any = {
                    name: formData.name,
                    email: formData.email,
                    specialty: formData.specialty,
                    profileImage: profileUrl,
                    bannerImage: bannerUrl,
                };

                if (changePassword && formData.password) {
                    updateData.password = await hashPassword(formData.password);
                }

                await updateDoctor(editingDoctor.id, updateData);
                toast({ title: "Médico actualizado", description: "Los cambios se guardaron correctamente." });
            } else {
                // Create
                if (!formData.password) {
                    toast({ variant: "destructive", title: "Error", description: "La contraseña es requerida." });
                    setIsSubmitting(false);
                    return;
                }

                // Upload images for new doctor (using temp path or timestamp)
                const docId = `new_${Date.now()}`;
                let profileUrl = 'https://placehold.co/400x400.png';
                if (profileFile) {
                    profileUrl = await uploadPublicImage(profileFile, 'images', `doctors/${docId}/profile`);
                }

                let bannerUrl = 'https://placehold.co/1200x400.png';
                if (bannerFile) {
                    bannerUrl = await uploadPublicImage(bannerFile, 'images', `doctors/${docId}/banner`);
                }

                const hashedPassword = await hashPassword(formData.password);
                const joinDateArgentina = getCurrentDateInArgentina();
                const paymentDateArgentina = getPaymentDateInArgentina(new Date());

                // Construct new doctor object with defaults
                const newDoctorData: Omit<Doctor, 'id'> = {
                    name: formData.name,
                    email: formData.email.toLowerCase(),
                    specialty: formData.specialty,
                    city: '', // Clinic city?
                    address: '',
                    password: hashedPassword,
                    sellerId: null,
                    cedula: '', // Required?
                    sector: '',
                    rating: 0,
                    reviewCount: 0,
                    profileImage: profileUrl,
                    bannerImage: bannerUrl,
                    aiHint: 'doctor portrait',
                    description: 'Médico de clínica',
                    services: [],
                    bankDetails: [],
                    slotDuration: 30,
                    consultationFee: 0,
                    schedule: {
                        monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                        tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                        wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                        thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                        friday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                        saturday: { active: false, slots: [] },
                        sunday: { active: false, slots: [] },
                    },
                    status: 'active',
                    lastPaymentDate: null,
                    whatsapp: '',
                    lat: 0,
                    lng: 0,
                    joinDate: joinDateArgentina,
                    subscriptionStatus: 'active',
                    nextPaymentDate: paymentDateArgentina,
                    coupons: [],
                    expenses: [],
                    medicalLicense: '', // Required? Tab UI should probably include it.
                    clinicId: user.id,
                    isClinicEmployee: true,
                    branchIds: [],
                };

                await addDoctor(newDoctorData);
                toast({ title: "Médico registrado", description: "Se ha creado la cuenta para el médico." });
            }

            setIsDialogOpen(false);
            loadData();
            resetForm();
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : "Ocurrió un error al guardar.";
            toast({ variant: "destructive", title: "Error", description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Médicos</h2>
                    <p className="text-muted-foreground">Gestiona el plantel médico de la clínica.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Registrar Médico
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingDoctor ? 'Editar Médico' : 'Nuevo Médico'}</DialogTitle>
                            <DialogDescription>
                                {editingDoctor ? 'Modifica los datos del médico.' : 'Registra un nuevo médico para tu clínica.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6 py-4">

                            {/* Sección Foto de Perfil */}
                            <div className="flex items-start gap-5">
                                <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm shrink-0 bg-slate-50">
                                    {previewProfile ? (
                                        <Image src={previewProfile} alt="Profile" fill className="object-cover object-top" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full w-full bg-slate-100 text-slate-300">
                                            <User className="h-10 w-10" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label>Foto de Perfil</Label>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setProfileFile(file);
                                                setPreviewProfile(URL.createObjectURL(file));
                                            }
                                        }}
                                        className="text-xs file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer border-slate-200 bg-slate-50"
                                    />
                                    <p className="text-[11px] text-muted-foreground">Recomendado: 400x400px. Formatos: JPG, PNG.</p>
                                </div>
                            </div>

                            {/* Sección Banner */}
                            <div className="space-y-2">
                                <Label>Imagen de Portada</Label>
                                <div className="relative h-40 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                                    {previewBanner ? (
                                        <Image src={previewBanner} alt="Banner" fill className="object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <Building2 className="h-8 w-8 mb-2 opacity-50" />
                                            <span className="text-xs">Sin portada</span>
                                        </div>
                                    )}
                                </div>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setBannerFile(file);
                                            setPreviewBanner(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="text-xs file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-secondary/10 file:text-secondary hover:file:bg-secondary/20 transition-all cursor-pointer border-slate-200 bg-slate-50"
                                />
                                <p className="text-[11px] text-muted-foreground">Recomendado: 1200x400px. Se mostrará en el perfil público.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre Completo</Label>
                                    <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Dr. Juan Perez" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@ejemplo.com" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="specialty">Especialidad</Label>
                                <Select
                                    value={formData.specialty}
                                    onValueChange={(val) => setFormData({ ...formData, specialty: val })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {specialties.map(s => (
                                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {specialties.length === 0 && (
                                    <p className="text-xs text-amber-600">
                                        No hay especialidades configuradas. Ve a Configuración &gt; Especialidades.
                                    </p>
                                )}
                            </div>

                            <div className="pt-2 border-t">
                                {editingDoctor && (
                                    <div className="flex items-center space-x-2 pb-3">
                                        <Checkbox id="changePassword" checked={changePassword} onCheckedChange={(checked) => setChangePassword(checked as boolean)} />
                                        <Label htmlFor="changePassword" className="text-sm font-medium">Cambiar Contraseña</Label>
                                    </div>
                                )}

                                {(!editingDoctor || changePassword) && (
                                    <div className="space-y-2">
                                        <Label htmlFor="password">{editingDoctor ? 'Nueva Contraseña' : 'Contraseña Provisional'}</Label>
                                        <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" required={!editingDoctor} />
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Cambios
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>

                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {doctors.length === 0 ? (
                    <Card className="col-span-full border-dashed">
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <User className="h-12 w-12 mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold">No hay médicos registrados</h3>
                            <p className="mb-4">Agrega los médicos que forman parte de tu equipo.</p>
                            <Button variant="outline" onClick={() => handleOpenDialog()}>Registrar Médico</Button>
                        </CardContent>
                    </Card>
                ) : (
                    doctors.map((doctor) => (
                        <Card key={doctor.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg truncate">{doctor.name}</CardTitle>
                                    <div className="flex items-center gap-2" title={doctor.status === 'active' ? "Deshabilitar médico" : "Habilitar médico"}>
                                        <span className={`text-xs font-medium ${doctor.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                                            {doctor.status === 'active' ? 'Activo' : 'Inactivo'}
                                        </span>
                                        <Switch
                                            checked={doctor.status === 'active'}
                                            onCheckedChange={() => handleToggleStatus(doctor)}
                                            className="scale-75 origin-right"
                                        />
                                    </div>
                                </div>
                                <CardDescription>
                                    {doctor.specialty}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" /> {doctor.email}
                                </div>

                                <div className="flex gap-2 mt-4 pt-2 border-t">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(doctor)}>
                                        <Pencil className="h-3 w-3 mr-2" /> Editar
                                    </Button>
                                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleOpenConfig(doctor)}>
                                        <Settings className="h-3 w-3 mr-2" /> Configurar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
            {/* Configuration Modal */}
            <DoctorConfigurationModal
                doctor={configDoctor}
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                onSave={handleSaveConfig}
                clinicServices={clinicServices}
            />
            {/* Performance List Section */}
            <div className="mt-12 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                        Rendimiento de Profesionales
                    </h3>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                            <Button variant={activePreset === 'today' ? "secondary" : "ghost"} size="sm" onClick={() => handlePresetChange('today')} className={activePreset === 'today' ? "shadow-sm bg-white dark:bg-slate-700 font-medium" : "text-muted-foreground"}>Hoy</Button>
                            <Button variant={activePreset === 'week' ? "secondary" : "ghost"} size="sm" onClick={() => handlePresetChange('week')} className={activePreset === 'week' ? "shadow-sm bg-white dark:bg-slate-700 font-medium" : "text-muted-foreground"}>7 Días</Button>
                            <Button variant={activePreset === 'month' ? "secondary" : "ghost"} size="sm" onClick={() => handlePresetChange('month')} className={activePreset === 'month' ? "shadow-sm bg-white dark:bg-slate-700 font-medium" : "text-muted-foreground"}>Mes</Button>
                        </div>
                        <DatePickerWithRange date={dateRange} setDate={handleDateRangeChange} />
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Médico</TableHead>
                                    <TableHead>Especialidad</TableHead>
                                    <TableHead className="text-center">Pacientes</TableHead>
                                    <TableHead className="text-right">Ingresos</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {doctors.map((doctor) => {
                                    const docsAppts = todaysAppointments.filter(a => a.doctorId === doctor.id || a.doctorName === doctor.name);
                                    const income = docsAppts.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

                                    return (
                                        <TableRow key={doctor.id}>
                                            <TableCell className="font-medium">{doctor.name}</TableCell>
                                            <TableCell>{doctor.specialty || '-'}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{docsAppts.length}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-700">
                                                ${income.toLocaleString('es-AR')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" onClick={() => handleViewDetails(doctor)}>
                                                    Ver Detalles
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Details Sheet */}
            <Sheet open={!!selectedDoctorForStats} onOpenChange={(open) => !open && setSelectedDoctorForStats(null)}>
                <SheetContent side="right" className="w-[800px] sm:max-w-[800px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Historial de {selectedDoctorForStats?.name}</SheetTitle>
                        <SheetDescription>
                            Historial completo de citas y rendimiento.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="py-4 space-y-4">
                        {/* Details Filter UI */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 justify-between">
                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                                <Button variant={detailsPreset === 'all' ? "secondary" : "ghost"} size="sm" onClick={() => handleDetailsPresetChange('all')} className="text-xs">Todos</Button>
                                <Button variant={detailsPreset === 'today' ? "secondary" : "ghost"} size="sm" onClick={() => handleDetailsPresetChange('today')} className="text-xs">Hoy</Button>
                                <Button variant={detailsPreset === 'month' ? "secondary" : "ghost"} size="sm" onClick={() => handleDetailsPresetChange('month')} className="text-xs">Mes</Button>
                            </div>
                            <DatePickerWithRange date={detailsDateRange} setDate={handleDetailsDateRangeChange} className="w-full sm:w-auto" />
                        </div>

                        {isLoadingHistory ? (
                            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : (
                            <div className="space-y-6">
                                {/* Summary Cards based on filtered data */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader className="p-4 pb-2">
                                            <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <div className="text-2xl font-bold">{doctorHistory.length}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="p-4 pb-2">
                                            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <div className="text-2xl font-bold">
                                                ${doctorHistory.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0).toLocaleString('es-AR')}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Paciente</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead className="text-right">Monto</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {doctorHistory.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                                        No hay registros en este periodo.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                doctorHistory.map((appt) => (
                                                    <TableRow key={appt.id}>
                                                        <TableCell className="font-medium">
                                                            {format(new Date(appt.date), 'dd/MM/yyyy')} <br />
                                                            <span className="text-xs text-muted-foreground">{appt.time}</span>
                                                        </TableCell>
                                                        <TableCell>{appt.patientName || 'Sin nombre'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{appt.attendance || 'Pendiente'}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">${(appt.totalPrice || 0).toLocaleString('es-AR')}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

        </div>
    );
}

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Doctor, ClinicBranch, ClinicSpecialty } from '@/lib/types';
import { getClinicDoctors, addDoctor, updateDoctor, getClinicBranches, getClinicSpecialties, getClinicAppointments, getDoctorAppointmentHistory, uploadPublicImage, affiliateClinicDoctor } from '@/lib/supabaseService';
import Image from 'next/image';
import { Appointment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, CheckCircle2, Search, AlertTriangle, Sparkles, UserCheck } from 'lucide-react';
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

    // DNI Lookup / Existing Doctor State
    const [isSearchingDni, setIsSearchingDni] = useState(false);
    const [existingDoctorFound, setExistingDoctorFound] = useState<Doctor | null>(null);
    const [isAlreadyAffiliated, setIsAlreadyAffiliated] = useState(false);

    // Config Modal State
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configDoctor, setConfigDoctor] = useState<Doctor | null>(null);

    const [formData, setFormData] = useState({
        dni: '',
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
        setFormData({ dni: '', name: '', email: '', password: '', specialty: '' });
        setProfileFile(null);
        setBannerFile(null);
        setPreviewProfile('');
        setPreviewBanner('');
        setEditingDoctor(null);
        setExistingDoctorFound(null);
        setIsAlreadyAffiliated(false);
    };

    const handleLookupDoctor = async (dniValue: string) => {
        const clean = dniValue.trim().replace(/\D/g, '');
        if (clean.length < 6) {
            setExistingDoctorFound(null);
            setIsAlreadyAffiliated(false);
            return;
        }

        setIsSearchingDni(true);
        try {
            const res = await fetch(`/api/doctors/lookup?dni=${encodeURIComponent(clean)}&clinicId=${user?.id || ''}`);
            const data = await res.json();
            if (data.found && data.doctor) {
                setExistingDoctorFound(data.doctor);
                setIsAlreadyAffiliated(data.isAffiliated || false);
                setFormData(prev => ({
                    ...prev,
                    dni: dniValue,
                    name: data.doctor.name || prev.name,
                    email: data.doctor.email || prev.email,
                    specialty: data.doctor.specialty || prev.specialty || (specialties[0]?.name || ''),
                }));
                if (data.doctor.profileImage) setPreviewProfile(data.doctor.profileImage);
                if (data.doctor.bannerImage) setPreviewBanner(data.doctor.bannerImage);
            } else {
                setExistingDoctorFound(null);
                setIsAlreadyAffiliated(false);
            }
        } catch (err) {
            console.error('Error looking up doctor by DNI:', err);
        } finally {
            setIsSearchingDni(false);
        }
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
                dni: doctor.cedula || '',
                name: doctor.name,
                email: doctor.email,
                password: '', // Don't show password
                specialty: doctor.specialty,
            });
            setPreviewProfile(doctor.profileImage || '');
            setPreviewBanner(doctor.bannerImage || '');
            setProfileFile(null);
            setBannerFile(null);
            setExistingDoctorFound(null);
            setIsAlreadyAffiliated(false);
        } else {
            resetForm();
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
                    cedula: formData.dni.replace(/\D/g, ''),
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
                // Validación básica
                if (!formData.dni.trim()) {
                    toast({ variant: "destructive", title: "Error", description: "El DNI / Cédula es obligatorio." });
                    setIsSubmitting(false);
                    return;
                }

                if (!existingDoctorFound && !formData.password) {
                    toast({ variant: "destructive", title: "Error", description: "La contraseña provisional es requerida para nuevos médicos." });
                    setIsSubmitting(false);
                    return;
                }

                let profileUrl = previewProfile || 'https://placehold.co/400x400.png';
                if (profileFile) {
                    const docId = `new_${Date.now()}`;
                    profileUrl = await uploadPublicImage(profileFile, 'images', `doctors/${docId}/profile`);
                }

                let bannerUrl = previewBanner || 'https://placehold.co/1200x400.png';
                if (bannerFile) {
                    const docId = `new_${Date.now()}`;
                    bannerUrl = await uploadPublicImage(bannerFile, 'images', `doctors/${docId}/banner`);
                }

                const result = await affiliateClinicDoctor({
                    clinicId: user.id,
                    doctorId: existingDoctorFound?.id,
                    isExistingDoctor: !!existingDoctorFound,
                    dni: formData.dni,
                    name: formData.name,
                    email: formData.email,
                    specialty: formData.specialty,
                    password: existingDoctorFound ? undefined : formData.password,
                    profileImage: profileUrl,
                    bannerImage: bannerUrl,
                });

                toast({
                    title: result.isNew ? "✅ Médico registrado" : "✅ Médico vinculado",
                    description: result.message || "Operación realizada con éxito."
                });
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
                    <p className="text-muted-foreground">Gestiona el plantel médico de la clínica y vincula profesionales.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Registrar / Vincular Médico
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingDoctor ? 'Editar Médico' : existingDoctorFound ? 'Vincular Médico Existente' : 'Registrar Nuevo Médico'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingDoctor
                                    ? 'Modifica los datos del médico en tu clínica.'
                                    : 'Ingresa el DNI para verificar si el médico ya cuenta con usuario en SUMA o registrar uno nuevo.'}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-5 py-2">
                            {/* Campo DNI / Cédula con búsqueda en tiempo real */}
                            {!editingDoctor && (
                                <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="dni" className="font-semibold text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">
                                            DNI / Cédula del Profesional *
                                        </Label>
                                        {isSearchingDni && (
                                            <span className="flex items-center gap-1 text-xs text-primary font-medium animate-pulse">
                                                <Loader2 className="w-3 h-3 animate-spin" /> Buscando en SUMA...
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="dni"
                                            value={formData.dni}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFormData(prev => ({ ...prev, dni: val }));
                                                handleLookupDoctor(val);
                                            }}
                                            placeholder="Ej. 20935658"
                                            className="bg-white dark:bg-slate-950 pr-9 font-mono"
                                            required
                                            autoFocus
                                        />
                                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                    </div>

                                    {/* Alertas dinámicas según búsqueda */}
                                    {existingDoctorFound && (
                                        <div className="mt-2.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5 animate-in fade-in duration-200">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                            <div className="text-xs space-y-0.5 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                                        Médico detectado: {existingDoctorFound.name}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 border-emerald-300">
                                                        Cuenta SUMA Activa
                                                    </Badge>
                                                </div>
                                                <p className="text-emerald-700 dark:text-emerald-400">
                                                    Este médico ya tiene cuenta en SUMA ({existingDoctorFound.email}). Se vinculará a tu clínica <strong>sin requerir contraseña provisional</strong> y podrá acceder con su sesión habitual.
                                                </p>
                                                {isAlreadyAffiliated && (
                                                    <p className="text-amber-700 dark:text-amber-300 font-semibold pt-1">
                                                        ⚠️ Este médico ya forma parte activa del equipo de tu clínica.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {!existingDoctorFound && formData.dni.replace(/\D/g, '').length >= 6 && !isSearchingDni && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                            DNI no registrado previamente. Completa los datos para crear su cuenta en SUMA.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Sección Foto de Perfil */}
                            <div className="flex items-start gap-5">
                                <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm shrink-0 bg-slate-50">
                                    {previewProfile ? (
                                        <Image src={previewProfile} alt="Profile" fill className="object-cover object-top" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full w-full bg-slate-100 text-slate-300">
                                            <User className="h-8 w-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <Label className="text-xs font-medium">Foto de Perfil</Label>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        disabled={!!existingDoctorFound}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setProfileFile(file);
                                                setPreviewProfile(URL.createObjectURL(file));
                                            }
                                        }}
                                        className="text-xs file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer border-slate-200 bg-slate-50"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        {existingDoctorFound ? 'Foto tomada del perfil de SUMA del médico.' : 'Recomendado: 400x400px. Formatos: JPG, PNG.'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-xs font-semibold">Nombre Completo *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Dr. Juan Perez"
                                        disabled={!!existingDoctorFound}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-semibold">Correo Electrónico *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="doctor@ejemplo.com"
                                        disabled={!!existingDoctorFound}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="specialty" className="text-xs font-semibold">Especialidad de Atención en la Clínica *</Label>
                                <Select
                                    value={formData.specialty}
                                    onValueChange={(val) => setFormData({ ...formData, specialty: val })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona la especialidad..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {specialties.map(s => (
                                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {specialties.length === 0 && (
                                    <p className="text-xs text-amber-600">
                                        No hay especialidades configuradas en la clínica. Ve a Configuración &gt; Especialidades.
                                    </p>
                                )}
                            </div>

                            {/* Sección Contraseña: Solo si es un médico NUEVO o si se está editando con cambio de clave */}
                            {(!existingDoctorFound || editingDoctor) && (
                                <div className="pt-2 border-t">
                                    {editingDoctor && (
                                        <div className="flex items-center space-x-2 pb-3">
                                            <Checkbox id="changePassword" checked={changePassword} onCheckedChange={(checked) => setChangePassword(checked as boolean)} />
                                            <Label htmlFor="changePassword" className="text-sm font-medium">Cambiar Contraseña</Label>
                                        </div>
                                    )}

                                    {(!editingDoctor || changePassword) && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="password">
                                                {editingDoctor ? 'Nueva Contraseña' : 'Contraseña Provisional para el Médico *'}
                                            </Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="••••••••"
                                                required={!editingDoctor}
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                El médico usará esta contraseña para su primer ingreso en SUMA.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <DialogFooter className="pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting || (isAlreadyAffiliated && !editingDoctor)}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingDoctor ? 'Guardar Cambios' : existingDoctorFound ? 'Vincular a la Clínica' : 'Crear y Vincular Médico'}
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

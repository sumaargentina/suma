"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Doctor, ClinicBranch, ClinicSpecialty } from '@/lib/types';
import { getClinicDoctors, addDoctor, updateDoctor, getClinicBranches, getClinicSpecialties, getClinicAppointments, getDoctorAppointmentHistory, uploadPublicImage, affiliateClinicDoctor, unlinkClinicDoctor } from '@/lib/supabaseService';
import Image from 'next/image';
import { Appointment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, CheckCircle2, Search, AlertTriangle, Sparkles, UserCheck, UserMinus } from 'lucide-react';
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
import { ProfessionSpecialtySelector } from '@/components/ui/profession-specialty-selector';
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

    // DNI / Email Lookup / Existing Doctor State
    const [registrationMode, setRegistrationMode] = useState<'existing' | 'new'>('existing');
    const [isSearchingDni, setIsSearchingDni] = useState(false);
    const [existingDoctorFound, setExistingDoctorFound] = useState<Doctor | null>(null);
    const [lookupPerformed, setLookupPerformed] = useState(false);
    const [isAlreadyAffiliated, setIsAlreadyAffiliated] = useState(false);

    // Config Modal State
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configDoctor, setConfigDoctor] = useState<Doctor | null>(null);
    const [doctorToUnlink, setDoctorToUnlink] = useState<Doctor | null>(null);
    const [isUnlinking, setIsUnlinking] = useState(false);

    const [formData, setFormData] = useState({
        dni: '',
        name: '',
        email: '',
        phone: '',
        medicalLicense: '',
        password: '', // Only for new doctors
        profession: 'Médico',
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
        setFormData({ dni: '', name: '', email: '', phone: '', medicalLicense: '', password: '', profession: 'Médico', specialty: '' });
        setProfileFile(null);
        setBannerFile(null);
        setPreviewProfile('');
        setPreviewBanner('');
        setEditingDoctor(null);
        setExistingDoctorFound(null);
        setLookupPerformed(false);
        setIsAlreadyAffiliated(false);
        setRegistrationMode('existing');
    };

    const handleLookupDoctor = async (dniValue?: string, emailValue?: string) => {
        const rawDni = (dniValue ?? formData.dni).trim();
        const rawEmail = (emailValue ?? formData.email).trim().toLowerCase();
        const cleanDigits = rawDni.replace(/\D/g, '');

        if (cleanDigits.length < 5 && (!rawEmail || !rawEmail.includes('@'))) {
            setExistingDoctorFound(null);
            setLookupPerformed(false);
            setIsAlreadyAffiliated(false);
            return;
        }

        setIsSearchingDni(true);
        try {
            const params = new URLSearchParams();
            if (cleanDigits.length >= 5) params.set('dni', rawDni);
            if (rawEmail && rawEmail.includes('@')) params.set('email', rawEmail);
            if (user?.id) params.set('clinicId', user.id);

            const res = await fetch(`/api/doctors/lookup?${params.toString()}`);
            const data = await res.json();
            setLookupPerformed(true);
            if (data.found && data.doctor) {
                setExistingDoctorFound(data.doctor);
                setIsAlreadyAffiliated(data.isAffiliated || false);
                setFormData(prev => ({
                    ...prev,
                    dni: data.doctor.cedula || prev.dni || rawDni,
                    name: data.doctor.name || prev.name,
                    email: data.doctor.email || prev.email,
                    phone: data.doctor.phone || prev.phone,
                    medicalLicense: data.doctor.medicalLicense || prev.medicalLicense,
                    profession: data.doctor.profession || prev.profession || 'Médico',
                    specialty: data.doctor.specialty || prev.specialty || (specialties[0]?.name || ''),
                }));
                if (data.doctor.profileImage) setPreviewProfile(data.doctor.profileImage);
                if (data.doctor.bannerImage) setPreviewBanner(data.doctor.bannerImage);
            } else {
                setExistingDoctorFound(null);
                setIsAlreadyAffiliated(false);
            }
        } catch (err) {
            console.error('Error looking up doctor:', err);
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

    const handleUnlinkDoctor = async () => {
        if (!user?.id || !doctorToUnlink) return;
        setIsUnlinking(true);
        try {
            const res = await unlinkClinicDoctor(user.id, doctorToUnlink.id);
            setDoctors(docs => docs.filter(d => d.id !== doctorToUnlink.id));
            toast({
                title: 'Médico desvinculado',
                description: res.message || `El Dr. ${doctorToUnlink.name} ya no forma parte del equipo activo de tu institución.`,
            });
            setDoctorToUnlink(null);
        } catch (error: any) {
            console.error('Error unlinking doctor:', error);
            toast({
                variant: 'destructive',
                title: 'Error al desvincular',
                description: error.message || 'No se pudo desvincular al médico.',
            });
        } finally {
            setIsUnlinking(false);
        }
    };

    const handleOpenDialog = (doctor?: Doctor) => {
        if (doctor) {
            setEditingDoctor(doctor);
            setFormData({
                dni: doctor.cedula || '',
                name: doctor.name,
                email: doctor.email,
                phone: doctor.phone || doctor.whatsapp || '',
                medicalLicense: doctor.medicalLicense || '',
                password: '', // Don't show password
                profession: doctor.profession || 'Médico',
                specialty: doctor.specialty,
            });
            setPreviewProfile(doctor.profileImage || '');
            setPreviewBanner(doctor.bannerImage || '');
            setProfileFile(null);
            setBannerFile(null);
            setExistingDoctorFound(null);
            setLookupPerformed(false);
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
                    cedula: formData.dni.trim(),
                    phone: formData.phone.trim(),
                    whatsapp: formData.phone.trim(),
                    medicalLicense: formData.medicalLicense.trim(),
                    profession: formData.profession || 'Médico',
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
                const isLinkingExisting = !!existingDoctorFound || registrationMode === 'existing';

                if (isLinkingExisting && !existingDoctorFound && !formData.dni.trim() && !formData.email.trim()) {
                    toast({ variant: "destructive", title: "Datos requeridos", description: "Ingresa el DNI/Cédula o el Correo Electrónico del médico que pertenece a SUMA." });
                    setIsSubmitting(false);
                    return;
                }

                if (!isLinkingExisting) {
                    if (!formData.dni.trim() || !formData.name.trim() || !formData.email.trim() || !formData.specialty.trim()) {
                        toast({ variant: "destructive", title: "Campos requeridos", description: "Cédula/DNI, Nombre, Correo y Especialidad son obligatorios para registrar al médico." });
                        setIsSubmitting(false);
                        return;
                    }
                    if (!formData.password || formData.password.length < 6) {
                        toast({ variant: "destructive", title: "Contraseña requerida", description: "Asigna una contraseña provisional de al menos 6 caracteres para el nuevo médico." });
                        setIsSubmitting(false);
                        return;
                    }
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
                    isExistingDoctor: isLinkingExisting,
                    dni: formData.dni,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    profession: formData.profession,
                    specialty: formData.specialty,
                    medicalLicense: formData.medicalLicense,
                    password: existingDoctorFound ? undefined : formData.password,
                    profileImage: profileUrl,
                    bannerImage: bannerUrl,
                });

                toast({
                    title: result.isNew ? "✅ Nuevo Médico Registrado y Vinculado" : "✅ Médico de SUMA Vinculado",
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
                    <p className="text-muted-foreground">Gestiona el plantel médico de la clínica: vincula médicos que ya pertenecen a SUMA o registra médicos nuevos.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Registrar / Vincular Médico
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingDoctor
                                    ? 'Editar Médico'
                                    : registrationMode === 'existing'
                                        ? 'Vincular Médico que pertenece a SUMA'
                                        : 'Registrar Médico Nuevo en SUMA'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingDoctor
                                    ? 'Modifica los datos del médico en tu clínica.'
                                    : 'Elige si el médico ya tiene cuenta en SUMA para vincularlo o si deseas crearle su cuenta desde tu institución.'}
                            </DialogDescription>
                        </DialogHeader>

                        {!editingDoctor && (
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRegistrationMode('existing');
                                    }}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        registrationMode === 'existing'
                                            ? 'bg-teal-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <UserCheck className="h-4 w-4" />
                                    Médico YA en SUMA
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRegistrationMode('new');
                                        setExistingDoctorFound(null);
                                        setIsAlreadyAffiliated(false);
                                    }}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        registrationMode === 'new'
                                            ? 'bg-teal-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Plus className="h-4 w-4" />
                                    Médico Nuevo (No está en SUMA)
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5 py-2">
                            {/* Buscador por DNI / Cédula o Correo */}
                            {!editingDoctor && (
                                <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-semibold text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">
                                            {registrationMode === 'existing'
                                                ? 'Buscar Médico en SUMA por Cédula/DNI o Correo *'
                                                : 'Datos de Identificación del Nuevo Médico *'}
                                        </Label>
                                        {isSearchingDni && (
                                            <span className="flex items-center gap-1 text-xs text-primary font-medium animate-pulse">
                                                <Loader2 className="w-3 h-3 animate-spin" /> Verificando en SUMA...
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <Label htmlFor="dni" className="text-xs font-medium">Cédula / DNI {registrationMode === 'new' ? '*' : ''}</Label>
                                            <div className="relative mt-1">
                                                <Input
                                                    id="dni"
                                                    value={formData.dni}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setFormData(prev => ({ ...prev, dni: val }));
                                                        handleLookupDoctor(val, formData.email);
                                                    }}
                                                    placeholder="Ej: V-15432890 o 15432890"
                                                    className="bg-white dark:bg-slate-950 font-mono text-xs"
                                                    required={registrationMode === 'new'}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="lookup-email" className="text-xs font-medium">Correo Electrónico {registrationMode === 'new' ? '*' : ''}</Label>
                                            <div className="relative flex gap-1.5 mt-1">
                                                <Input
                                                    id="lookup-email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setFormData(prev => ({ ...prev, email: val }));
                                                    }}
                                                    onBlur={() => handleLookupDoctor(formData.dni, formData.email)}
                                                    placeholder="doctor@correo.com"
                                                    className="bg-white dark:bg-slate-950 text-xs"
                                                    required={registrationMode === 'new'}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="shrink-0"
                                                    title="Buscar médico en SUMA"
                                                    onClick={() => handleLookupDoctor(formData.dni, formData.email)}
                                                >
                                                    <Search className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Alertas dinámicas según búsqueda */}
                                    {existingDoctorFound && (
                                        <div className="mt-2.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5 animate-in fade-in duration-200">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                            <div className="text-xs space-y-1 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                                        Médico encontrado en SUMA: {existingDoctorFound.name}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 border-emerald-300">
                                                        {existingDoctorFound.specialty || 'Especialista'}
                                                    </Badge>
                                                </div>
                                                <p className="text-emerald-700 dark:text-emerald-400">
                                                    Correo: <strong>{existingDoctorFound.email}</strong> • Doc: <strong>{existingDoctorFound.cedula || 'N/A'}</strong>. Haz clic en <strong>"Vincular a la Clínica"</strong> abajo para integrarlo a tu equipo médico.
                                                </p>
                                                {isAlreadyAffiliated && (
                                                    <p className="text-amber-700 dark:text-amber-300 font-semibold pt-1">
                                                        ⚠️ Este médico ya forma parte activa del equipo de tu clínica.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {registrationMode === 'existing' && lookupPerformed && !existingDoctorFound && !isSearchingDni && (
                                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <p className="font-bold">No se encontró un médico en SUMA con esos datos.</p>
                                                <p className="text-[11px] text-amber-800">Puedes crearle su cuenta nueva directamente desde aquí conservando los datos ingresados.</p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0"
                                                onClick={() => setRegistrationMode('new')}
                                            >
                                                Crear como Médico Nuevo
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Formulario completo para Médico Nuevo o Edición */}
                            {(editingDoctor || registrationMode === 'new' || existingDoctorFound) && (
                                <>
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
                                                disabled={!!existingDoctorFound && !editingDoctor}
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

                                    {editingDoctor && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-dni" className="text-xs font-semibold">Cédula / DNI *</Label>
                                                <Input
                                                    id="edit-dni"
                                                    value={formData.dni}
                                                    onChange={e => setFormData({ ...formData, dni: e.target.value })}
                                                    placeholder="Ej: V-15432890"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit-email" className="text-xs font-semibold">Correo Electrónico *</Label>
                                                <Input
                                                    id="edit-email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="doctor@ejemplo.com"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="name" className="text-xs font-semibold">Nombre Completo *</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Dr(a). Juan Pérez"
                                                disabled={!!existingDoctorFound && !editingDoctor}
                                                required={!existingDoctorFound}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="doc-phone" className="text-xs font-semibold">Teléfono / WhatsApp</Label>
                                            <Input
                                                id="doc-phone"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="+58 414 123-4567"
                                                disabled={!!existingDoctorFound && !editingDoctor}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="doc-license" className="text-xs font-semibold">Matrícula / MPPS</Label>
                                            <Input
                                                id="doc-license"
                                                value={formData.medicalLicense}
                                                onChange={e => setFormData({ ...formData, medicalLicense: e.target.value })}
                                                placeholder="Ej: MPPS 12345"
                                                disabled={!!existingDoctorFound && !editingDoctor}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <ProfessionSpecialtySelector
                                            profession={formData.profession}
                                            specialty={formData.specialty}
                                            onChange={({ profession, specialty }) =>
                                                setFormData(prev => ({ ...prev, profession, specialty }))
                                            }
                                        />
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
                                                        placeholder="Mínimo 6 caracteres"
                                                        required={!editingDoctor && !existingDoctorFound}
                                                    />
                                                    <p className="text-[11px] text-muted-foreground">
                                                        El médico usará su correo y esta contraseña para entrar a su panel en SUMA.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <DialogFooter className="pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || (isAlreadyAffiliated && !editingDoctor) || (registrationMode === 'existing' && !existingDoctorFound && !editingDoctor)}
                                    className="bg-teal-600 hover:bg-teal-700 text-white"
                                >
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingDoctor
                                        ? 'Guardar Cambios'
                                        : existingDoctorFound
                                            ? 'Vincular Médico a la Clínica'
                                            : 'Crear Cuenta y Vincular a la Clínica'}
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
                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <CardDescription className="truncate">
                                        {doctor.specialty}
                                    </CardDescription>
                                    {(doctor as any).workspaceStatus === 'pending_invitation' ? (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] shrink-0">
                                            ⏳ Pendiente de validar
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0">
                                            ✅ Espacio Validado
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" /> {doctor.email}
                                </div>

                                <div className="flex gap-2 mt-4 pt-2 border-t">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(doctor)}>
                                        <Pencil className="h-3 w-3 mr-1.5" /> Editar
                                    </Button>
                                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleOpenConfig(doctor)}>
                                        <Settings className="h-3 w-3 mr-1.5" /> Configurar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 px-2.5"
                                        title="Desvincular médico de esta institución"
                                        onClick={() => setDoctorToUnlink(doctor)}
                                    >
                                        <UserMinus className="h-3.5 w-3.5" />
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

            {/* Modal de Confirmación para Desvincular Médico */}
            <Dialog open={!!doctorToUnlink} onOpenChange={(open) => !open && setDoctorToUnlink(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <UserMinus className="h-5 w-5" />
                            Desvincular Médico de la Institución
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-slate-600 space-y-2">
                            <p>
                                ¿Confirmas que <strong>{doctorToUnlink?.name}</strong> ya no trabaja en <strong>{user?.name}</strong>?
                            </p>
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                                <p>• Se retirará de tu plantel médico y de las reservas públicas de tu sede.</p>
                                <p>• El médico ya no verá el espacio de trabajo de tu institución en su panel.</p>
                                <p>• <strong>Su cuenta personal en SUMA y el historial de citas atendidas se conservan intactos.</strong></p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDoctorToUnlink(null)} disabled={isUnlinking}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleUnlinkDoctor}
                            disabled={isUnlinking}
                        >
                            {isUnlinking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserMinus className="h-4 w-4 mr-2" />}
                            Sí, Desvincular Médico
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                                    {user?.plan !== 'hospital_gratuito' && (
                                        <TableHead className="text-right">Ingresos</TableHead>
                                    )}
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {doctors.map((doctor) => {
                                    const docsAppts = todaysAppointments.filter(a => a.doctorId === doctor.id || a.doctorName === doctor.name);
                                    const income = docsAppts.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

                                    return (
                                        <TableRow key={doctor.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span>{doctor.name}</span>
                                                    {(doctor as any).workspaceStatus === 'pending_invitation' && (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                                                            Por validar
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{doctor.specialty || '-'}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{docsAppts.length}</Badge>
                                            </TableCell>
                                            {user?.plan !== 'hospital_gratuito' && (
                                                <TableCell className="text-right font-bold text-green-700">
                                                    ${income.toLocaleString('en-US')}
                                                </TableCell>
                                            )}
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
                                                ${doctorHistory.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0).toLocaleString('en-US')}
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
                                                        <TableCell className="text-right">${(appt.totalPrice || 0).toLocaleString('en-US')}</TableCell>
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

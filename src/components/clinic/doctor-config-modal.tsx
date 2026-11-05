"use client";

import { useState, useEffect } from 'react';
import { Doctor, Service, Schedule } from '@/lib/types';
import { updateDoctor, updateClinicDoctorConfig, uploadPublicImage } from '@/lib/supabaseService';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Loader2, DollarSign, Stethoscope, Save, Plus, Trash2, User, ShieldCheck, Building2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface DoctorConfigurationModalProps {
    clinicId?: string;
    doctor: Doctor | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    clinicServices: Service[]; // Services available in the clinic to assign
    initialTab?: 'general' | 'schedule' | 'services';
}

const DEFAULT_SCHEDULE: Schedule = {
    monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    friday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    saturday: { active: false, slots: [] },
    sunday: { active: false, slots: [] },
};

export function DoctorConfigurationModal({
    clinicId,
    doctor,
    isOpen,
    onClose,
    onSave,
    clinicServices,
    initialTab = 'services',
}: DoctorConfigurationModalProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(initialTab);

    // Form State
    const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [consultationFee, setConsultationFee] = useState<number>(0);
    const [slotDuration, setSlotDuration] = useState<number>(30);
    const [medicalLicense, setMedicalLicense] = useState('');
    const [profileImage, setProfileImage] = useState('');
    const [bannerImage, setBannerImage] = useState('');

    // New Service State
    const [newServiceName, setNewServiceName] = useState('');
    const [newServicePrice, setNewServicePrice] = useState('');

    // Image Upload State
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [profilePreview, setProfilePreview] = useState('');
    const [bannerPreview, setBannerPreview] = useState('');

    // Insurances State
    const [insurances, setInsurances] = useState<string[]>([]);
    const [newInsurance, setNewInsurance] = useState('');

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    useEffect(() => {
        if (doctor) {
            setSchedule(doctor.schedule || DEFAULT_SCHEDULE);
            setSelectedServices(Array.isArray(doctor.services) ? doctor.services : []);
            setConsultationFee(doctor.consultationFee || 0);
            setSlotDuration(doctor.slotDuration || 30);
            setMedicalLicense(doctor.medicalLicense || '');
            setProfileImage(doctor.profileImage || '');
            setBannerImage(doctor.bannerImage || '');

            // Set previews
            setProfilePreview(doctor.profileImage || '');
            setBannerPreview(doctor.bannerImage || '');
            setProfileFile(null);
            setBannerFile(null);

            setInsurances(doctor.acceptedInsurances || []);
        }
    }, [doctor]);

    const handleSave = async () => {
        if (!doctor) return;
        setIsSaving(true);
        try {
            let finalProfileUrl = profileImage;
            if (profileFile) {
                finalProfileUrl = await uploadPublicImage(profileFile, 'images', `doctors/${doctor.id}/profile`);
            }

            let finalBannerUrl = bannerImage;
            if (bannerFile) {
                finalBannerUrl = await uploadPublicImage(bannerFile, 'images', `doctors/${doctor.id}/banner`);
            }

            // Si el usuario indicó un servicio en los inputs y olvidó darle a "+ Agregar", incluirlo automáticamente
            let finalServices = [...selectedServices];
            if (newServiceName.trim() && newServicePrice !== '') {
                finalServices.push({
                    id: `srv-${Date.now()}`,
                    name: newServiceName.trim(),
                    price: Number(newServicePrice || 0),
                    duration: slotDuration,
                });
                setNewServiceName('');
                setNewServicePrice('');
            }

            const payload = {
                schedule,
                services: finalServices,
                consultationFee,
                slotDuration,
                medicalLicense,
                profileImage: finalProfileUrl,
                bannerImage: finalBannerUrl,
                acceptedInsurances: insurances,
            };

            if (clinicId) {
                await updateClinicDoctorConfig(clinicId, doctor.id, payload);
            } else {
                await updateDoctor(doctor.id, payload);
            }

            toast({
                title: "✅ Configuración guardada en la clínica",
                description: `Los servicios, precios y horarios de ${doctor.name} en esta sede han sido actualizados.`,
            });
            onSave();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleDayActive = (day: keyof Schedule) => {
        setSchedule(prev => {
            const isActive = !prev[day].active;
            let newSlots = prev[day].slots;

            if (isActive && newSlots.length === 0) {
                newSlots = [{ start: "09:00", end: "17:00" }];
            }

            return {
                ...prev,
                [day]: { ...prev[day], active: isActive, slots: newSlots }
            };
        });
    };

    const updateTimeSlot = (day: keyof Schedule, index: number, field: 'start' | 'end', value: string) => {
        setSchedule(prev => {
            const newSlots = [...prev[day].slots];
            newSlots[index] = { ...newSlots[index], [field]: value };
            return {
                ...prev,
                [day]: { ...prev[day], slots: newSlots }
            };
        });
    };

    const addTimeSlot = (day: keyof Schedule) => {
        setSchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                slots: [...prev[day].slots, { start: "09:00", end: "13:00" }]
            }
        }));
    };

    const removeTimeSlot = (day: keyof Schedule, index: number) => {
        setSchedule(prev => {
            const newSlots = [...prev[day].slots];
            newSlots.splice(index, 1);
            return {
                ...prev,
                [day]: { ...prev[day], slots: newSlots }
            };
        });
    };

    const addNewService = () => {
        if (!newServiceName.trim()) {
            toast({ variant: "destructive", title: "Falta el nombre", description: "Escribe el nombre del servicio que presta el médico en la clínica." });
            return;
        }
        if (newServicePrice === '' || isNaN(Number(newServicePrice))) {
            toast({ variant: "destructive", title: "Falta el precio", description: "Indica el precio del servicio en la clínica (puedes colocar 0 si es gratuito)." });
            return;
        }

        const newService: Service = {
            id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: newServiceName.trim(),
            price: Number(newServicePrice),
            duration: slotDuration,
        };

        setSelectedServices(prev => [...prev, newService]);
        setNewServiceName('');
        setNewServicePrice('');
    };

    const addQuickService = (srv: { name: string; price?: number }) => {
        if (selectedServices.some(s => s.name.toLowerCase() === srv.name.toLowerCase())) {
            toast({ title: "Ya agregado", description: `El servicio "${srv.name}" ya está en la lista del médico.` });
            return;
        }
        setSelectedServices(prev => [
            ...prev,
            {
                id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: srv.name,
                price: Number(srv.price ?? consultationFee ?? 0),
                duration: slotDuration,
            }
        ]);
    };

    const updateServicePrice = (index: number, newPrice: number) => {
        setSelectedServices(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], price: newPrice };
            return updated;
        });
    };

    const removeService = (index: number) => {
        const updated = [...selectedServices];
        updated.splice(index, 1);
        setSelectedServices(updated);
    };

    const handleAddInsurance = () => {
        if (!newInsurance.trim()) return;
        if (insurances.includes(newInsurance.trim())) {
            setNewInsurance('');
            return;
        }
        setInsurances([...insurances, newInsurance.trim()]);
        setNewInsurance('');
    };

    const handleRemoveInsurance = (ins: string) => {
        setInsurances(insurances.filter(i => i !== ins));
    };

    if (!doctor) return null;

    const privateServicesList: Service[] = Array.isArray((doctor as any).privateServices) ? (doctor as any).privateServices : [];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-teal-600" />
                        Configurar en Clínica: {doctor.name}
                    </DialogTitle>
                    <DialogDescription>
                        Administra los servicios, precios y horarios que este profesional ofrece específicamente en tu clínica (sin alterar su consultorio privado independiente).
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="services">Servicios y Precios ({selectedServices.length})</TabsTrigger>
                        <TabsTrigger value="schedule">Horarios en Clínica</TabsTrigger>
                        <TabsTrigger value="general">Perfil y Coberturas</TabsTrigger>
                    </TabsList>

                    {/* Services Tab */}
                    <TabsContent value="services" className="space-y-4 py-4">
                        <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl flex items-start gap-2.5">
                            <Building2 className="h-5 w-5 text-teal-700 mt-0.5 shrink-0" />
                            <div className="text-xs space-y-0.5">
                                <p className="font-bold text-teal-950">Catálogo Exclusivo del Médico en esta Clínica</p>
                                <p className="text-teal-800">
                                    Los servicios y tarifas que configures aquí son exclusivos para las citas de <strong>{doctor.name}</strong> dentro de tu clínica. Su consultorio privado independiente mantiene su propio catálogo separado.
                                </p>
                            </div>
                        </div>

                        {/* Precio Base de Consulta en la Clínica */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border bg-slate-50/70">
                            <div className="space-y-1.5">
                                <Label className="font-semibold text-xs uppercase tracking-wide text-slate-700">
                                    Precio Base de Consulta en esta Clínica ($)
                                </Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-teal-600" />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="pl-8 bg-white font-semibold"
                                        value={consultationFee}
                                        onChange={(e) => setConsultationFee(Number(e.target.value))}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Tarifa principal de consulta del médico cuando atiende en tu institución.
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="font-semibold text-xs uppercase tracking-wide text-slate-700">
                                    Duración del Turno en Clínica
                                </Label>
                                <Select value={String(slotDuration)} onValueChange={(v) => setSlotDuration(Number(v))}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Selecciona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 minutos</SelectItem>
                                        <SelectItem value="20">20 minutos</SelectItem>
                                        <SelectItem value="30">30 minutos</SelectItem>
                                        <SelectItem value="45">45 minutos</SelectItem>
                                        <SelectItem value="60">60 minutos</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground">
                                    Tiempo estimado por paciente en la agenda de la clínica.
                                </p>
                            </div>
                        </div>

                        {/* Add New Service Form */}
                        <div className="space-y-3 border p-4 rounded-xl bg-white shadow-2xs">
                            <Label className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                                <Plus className="h-4 w-4 text-teal-600" />
                                Agregar Servicio que realiza {doctor.name} en la Clínica
                            </Label>
                            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs text-slate-600">Nombre del Servicio / Procedimiento</Label>
                                    <Input
                                        placeholder="Ej. Consulta Especializada, Ecografía, Control Postoperatorio..."
                                        value={newServiceName}
                                        onChange={(e) => setNewServiceName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addNewService();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="w-full sm:w-36 space-y-1">
                                    <Label className="text-xs text-slate-600">Precio en Clínica ($)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={newServicePrice}
                                        onChange={(e) => setNewServicePrice(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addNewService();
                                            }
                                        }}
                                    />
                                </div>
                                <Button
                                    onClick={addNewService}
                                    type="button"
                                    className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                                >
                                    <Plus className="h-4 w-4 mr-1.5" /> Agregar Servicio
                                </Button>
                            </div>

                            {/* Sugerencias rápidas del catálogo de la clínica o del médico */}
                            {(clinicServices.length > 0 || privateServicesList.length > 0) && (
                                <div className="pt-2 border-t space-y-2">
                                    {clinicServices.length > 0 && (
                                        <div className="space-y-1.5">
                                            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                                                <Sparkles className="h-3 w-3 text-teal-600" />
                                                Clic para asignar rápido desde el catálogo de la clínica:
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {clinicServices.map((cs, idx) => {
                                                    const isAdded = selectedServices.some(s => s.name.toLowerCase() === cs.name.toLowerCase());
                                                    return (
                                                        <button
                                                            key={cs.id || idx}
                                                            type="button"
                                                            disabled={isAdded}
                                                            onClick={() => addQuickService({ name: cs.name, price: cs.price })}
                                                            className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                                                                isAdded
                                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 opacity-60 cursor-default'
                                                                    : 'bg-slate-50 hover:bg-teal-50 border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-800'
                                                            }`}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            <span>{cs.name}</span>
                                                            <span className="font-bold text-teal-700">${cs.price}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {privateServicesList.length > 0 && (
                                        <div className="space-y-1.5">
                                            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                                                <Stethoscope className="h-3 w-3 text-blue-600" />
                                                Servicios que el médico realiza en su consultorio (clic para copiar a la clínica y ajustar precio):
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {privateServicesList.map((ps, idx) => {
                                                    const isAdded = selectedServices.some(s => s.name.toLowerCase() === ps.name.toLowerCase());
                                                    return (
                                                        <button
                                                            key={ps.id || idx}
                                                            type="button"
                                                            disabled={isAdded}
                                                            onClick={() => addQuickService({ name: ps.name, price: ps.price })}
                                                            className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                                                                isAdded
                                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 opacity-60 cursor-default'
                                                                    : 'bg-blue-50/50 hover:bg-blue-50 border-blue-200 text-blue-800'
                                                            }`}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            <span>{ps.name}</span>
                                                            <span className="font-semibold">(${ps.price})</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* List of Services */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Servicios Activos del Médico en esta Clínica ({selectedServices.length})
                            </Label>
                            {selectedServices.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8 border border-dashed rounded-xl bg-slate-50/50 text-sm">
                                    Aún no has agregado servicios adicionales para {doctor.name} en esta clínica.
                                    <br />
                                    <span className="text-xs">Usa el formulario de arriba para agregar cada servicio con su precio en la clínica.</span>
                                </div>
                            ) : (
                                selectedServices.map((service, index) => (
                                    <div key={service.id || index} className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card shadow-2xs">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-sm text-slate-900 truncate">{service.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="relative w-28">
                                                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-500">$</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={service.price}
                                                    onChange={(e) => updateServicePrice(index, Number(e.target.value))}
                                                    className="pl-6 h-8 text-sm font-bold text-right"
                                                    title="Editar precio de este servicio en la clínica"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                onClick={() => removeService(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* Schedule Tab */}
                    <TabsContent value="schedule" className="space-y-4 py-4">
                        <div className="space-y-4">
                            {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as Array<keyof Schedule>).map((day) => {
                                const dayLabels: Record<string, string> = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
                                return (
                                    <div key={day} className="flex flex-col gap-2 border-b pb-4 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={schedule[day].active}
                                                onCheckedChange={() => toggleDayActive(day)}
                                            />
                                            <Label className={!schedule[day].active ? "text-muted-foreground font-semibold w-24" : "font-semibold w-24"}>
                                                {dayLabels[day]}
                                            </Label>
                                        </div>

                                        {schedule[day].active ? (
                                            <div className="pl-12 space-y-2">
                                                {schedule[day].slots.map((slot, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            type="time"
                                                            value={slot.start}
                                                            onChange={(e) => updateTimeSlot(day, idx, 'start', e.target.value)}
                                                            className="w-32"
                                                        />
                                                        <span className="text-muted-foreground">-</span>
                                                        <Input
                                                            type="time"
                                                            value={slot.end}
                                                            onChange={(e) => updateTimeSlot(day, idx, 'end', e.target.value)}
                                                            className="w-32"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeTimeSlot(day, idx)}
                                                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addTimeSlot(day)}
                                                    className="mt-1"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> Agregar bloque
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="pl-12 text-sm text-muted-foreground italic">
                                                No atiende en la clínica este día
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </TabsContent>

                    {/* General Tab */}
                    <TabsContent value="general" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4 col-span-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Foto de Perfil</Label>
                                        <div className="flex items-center gap-4 border p-3 rounded-lg bg-muted/20">
                                            <div className="relative h-16 w-16 rounded-full overflow-hidden border bg-background shrink-0">
                                                {profilePreview ? (
                                                    <Image src={profilePreview} alt="Profile" fill className="object-cover" />
                                                ) : (
                                                    <User className="h-full w-full p-3 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 w-full min-w-0">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    className="text-xs"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setProfileFile(file);
                                                            setProfilePreview(URL.createObjectURL(file));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Imagen de Portada</Label>
                                        <div className="flex flex-col gap-2 border p-3 rounded-lg bg-muted/20">
                                            <div className="relative h-20 w-full rounded-md overflow-hidden border bg-background">
                                                {bannerPreview ? (
                                                    <Image src={bannerPreview} alt="Banner" fill className="object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                                        Sin portada
                                                    </div>
                                                )}
                                            </div>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                className="text-xs"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setBannerFile(file);
                                                        setBannerPreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label>Matrícula / Licencia Médica</Label>
                                <Input
                                    value={medicalLicense}
                                    onChange={(e) => setMedicalLicense(e.target.value)}
                                    placeholder="MPPS / CM 123456"
                                />
                            </div>

                            <div className="space-y-4 col-span-2 border-t pt-4">
                                <Label className="flex items-center gap-2 font-semibold">
                                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                                    Coberturas Médicas / Seguros aceptados en esta Clínica
                                </Label>
                                <p className="text-xs text-muted-foreground -mt-2 mb-2">
                                    Define qué seguros o coberturas acepta este profesional dentro de la clínica.
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ej. Seguros Mercantil, Sanitas, Particular..."
                                        value={newInsurance}
                                        onChange={(e) => setNewInsurance(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddInsurance();
                                            }
                                        }}
                                        className="text-sm"
                                    />
                                    <Button type="button" onClick={handleAddInsurance} variant="outline" size="icon">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-md min-h-[50px]">
                                    {insurances.length > 0 ? insurances.map(ins => (
                                        <div key={ins} className="flex items-center gap-1 bg-background border border-border px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                                            <span>{ins}</span>
                                            <button type="button" onClick={() => handleRemoveInsurance(ins)} className="text-muted-foreground hover:text-destructive ml-1">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )) : (
                                        <span className="text-muted-foreground text-xs italic">No hay coberturas asignadas.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-6 flex justify-between sm:justify-between">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Servicios y Configuración
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

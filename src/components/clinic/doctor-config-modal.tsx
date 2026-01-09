"use client";

import { useState, useEffect } from 'react';
import { Doctor, Service, Schedule, DaySchedule, ClinicBranch } from '@/lib/types';
import { updateDoctor, uploadPublicImage } from '@/lib/supabaseService';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Loader2, DollarSign, Calendar, Stethoscope, Save, AlertTriangle, Plus, Trash2, User, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface DoctorConfigurationModalProps {
    doctor: Doctor | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    clinicServices: Service[]; // Services available in the clinic to assign
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

export function DoctorConfigurationModal({ doctor, isOpen, onClose, onSave, clinicServices }: DoctorConfigurationModalProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

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
        if (doctor) {
            setSchedule(doctor.schedule || DEFAULT_SCHEDULE);
            setSelectedServices(doctor.services || []);
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

            await updateDoctor(doctor.id, {
                schedule,
                services: selectedServices,
                consultationFee,
                slotDuration,
                medicalLicense,
                profileImage: finalProfileUrl,
                bannerImage: finalBannerUrl,
                acceptedInsurances: insurances
            });
            toast({ title: "Configuración guardada", description: "El perfil del médico ha sido actualizado." });
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

            // If activating and no slots, add a default one
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
        if (!newServiceName || !newServicePrice) {
            toast({ variant: "destructive", title: "Error", description: "Completa nombre y precio." });
            return;
        }

        const newService: Service = {
            id: `temp-${Date.now()}`, // Temporary ID, will be stored in array
            name: newServiceName,
            price: Number(newServicePrice),
            duration: slotDuration // Default to slot duration or add field? Keeping it simple.
        };

        setSelectedServices([...selectedServices, newService]);
        setNewServiceName('');
        setNewServicePrice('');
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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configurar Médico: {doctor.name}</DialogTitle>
                    <DialogDescription>
                        Administra horarios, servicios y precios para este profesional.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="general">Información General</TabsTrigger>
                        <TabsTrigger value="schedule">Horarios</TabsTrigger>
                        <TabsTrigger value="services">Servicios y Precios</TabsTrigger>
                    </TabsList>

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

                            <div className="space-y-2">
                                <Label>Matrícula / Licencia Médica</Label>
                                <Input
                                    value={medicalLicense}
                                    onChange={(e) => setMedicalLicense(e.target.value)}
                                    placeholder="MN 123456"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Duración del Turno (minutos)</Label>
                                <Select value={String(slotDuration)} onValueChange={(v) => setSlotDuration(Number(v))}>
                                    <SelectTrigger>
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
                            </div>
                            <div className="space-y-2">
                                <Label>Precio Base de Consulta ($)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        className="pl-8"
                                        value={consultationFee}
                                        onChange={(e) => setConsultationFee(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4 col-span-2 border-t pt-4">
                                <Label className="flex items-center gap-2 font-semibold">
                                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                                    Coberturas Médicas (Obras Sociales / Prepagas)
                                </Label>
                                <p className="text-xs text-muted-foreground -mt-2 mb-2">
                                    Define qué coberturas acepta este profesional específicamente.
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ej. OSDE, Swiss Medical"
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

                    {/* Schedule Tab */}
                    <TabsContent value="schedule" className="space-y-4 py-4">
                        <div className="space-y-4">
                            {/* Use explicit order for days */}
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
                                                No atiende
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </TabsContent>

                    {/* Services Tab - REFACTORED FOR MANUAL ENTRY */}
                    <TabsContent value="services" className="space-y-4 py-4">
                        <div className="mb-4 p-4 bg-muted/50 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold text-blue-900">Servicios del Profesional</p>
                                <p className="text-muted-foreground">
                                    Define los servicios específicos que realiza este médico (ej. Consulta General, Control, etc.) y sus precios.
                                    Estos son independientes de los servicios generales de la clínica.
                                </p>
                            </div>
                        </div>

                        {/* Add New Service Form */}
                        <div className="flex gap-2 items-end border p-4 rounded-lg bg-gray-50 mb-4">
                            <div className="flex-1 space-y-2">
                                <Label>Nombre del Servicio</Label>
                                <Input
                                    placeholder="Ej. Consulta Especialista"
                                    value={newServiceName}
                                    onChange={(e) => setNewServiceName(e.target.value)}
                                />
                            </div>
                            <div className="w-32 space-y-2">
                                <Label>Precio ($)</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={newServicePrice}
                                    onChange={(e) => setNewServicePrice(e.target.value)}
                                />
                            </div>
                            <Button onClick={addNewService} type="button">
                                <Plus className="h-4 w-4 mr-2" /> Agregar
                            </Button>
                        </div>

                        {/* List of Services */}
                        <div className="space-y-2">
                            {selectedServices.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No hay servicios configurados para este médico.
                                </p>
                            ) : (
                                selectedServices.map((service, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                        <div>
                                            <p className="font-medium">{service.name}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline" className="text-lg px-3">
                                                ${service.price}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
                </Tabs>

                <DialogFooter className="mt-6 flex justify-between sm:justify-between">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Configuración
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

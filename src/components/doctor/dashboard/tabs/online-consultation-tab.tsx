"use client";

import { useState } from 'react';
import type { Doctor, OnlineConsultation, Schedule, Service, DaySchedule } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Save, Loader2, Plus, X, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as supabaseService from '@/lib/supabaseService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OnlineConsultationTabProps {
    doctorData: Doctor;
    onUpdate: () => void;
}

const initialSchedule: Schedule = {
    monday: { active: true, slots: [{ start: "18:00", end: "21:00" }] },
    tuesday: { active: true, slots: [{ start: "18:00", end: "21:00" }] },
    wednesday: { active: true, slots: [{ start: "18:00", end: "21:00" }] },
    thursday: { active: true, slots: [{ start: "18:00", end: "21:00" }] },
    friday: { active: true, slots: [{ start: "18:00", end: "20:00" }] },
    saturday: { active: false, slots: [] },
    sunday: { active: false, slots: [] },
};

const dayLabels: Record<keyof Schedule, string> = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
const daysOfWeek: (keyof Schedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function OnlineConsultationTab({ doctorData, onUpdate }: OnlineConsultationTabProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // Si no existe configuración online, inicializamos con valores por defecto
    // Redondeamos consultationFee para evitar problemas de precisión de punto flotante
    const initialConsultationFee = doctorData.onlineConsultation?.consultationFee ?? doctorData.consultationFee ?? 0;
    const [config, setConfig] = useState<OnlineConsultation>({
        enabled: doctorData.onlineConsultation?.enabled ?? false,
        consultationFee: Math.round(initialConsultationFee * 100) / 100,
        platform: doctorData.onlineConsultation?.platform ?? 'Google Meet',
        schedule: doctorData.onlineConsultation?.schedule ?? initialSchedule,
        slotDuration: doctorData.onlineConsultation?.slotDuration,
        services: doctorData.onlineConsultation?.services?.map(s => ({
            ...s,
            price: Math.round(s.price * 100) / 100
        })) ?? []
    });

    const [tempSchedule, setTempSchedule] = useState<Schedule>(config.schedule || initialSchedule);
    const [tempServices, setTempServices] = useState<Service[]>(config.services || []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const newConfig: OnlineConsultation = {
                ...config,
                // Redondear a 2 decimales para evitar problemas de precisión de punto flotante
                consultationFee: Math.round(config.consultationFee * 100) / 100,
                schedule: tempSchedule,
                services: tempServices.map(service => ({
                    ...service,
                    price: Math.round(service.price * 100) / 100
                }))
            };

            await supabaseService.updateDoctor(doctorData.id, { onlineConsultation: newConfig });

            toast({
                title: "Configuración guardada",
                description: "Tus preferencias de consulta online han sido actualizadas."
            });
            onUpdate();
        } catch (error) {
            console.error('Error saving online consultation settings:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo guardar la configuración."
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Schedule handlers
    const handleScheduleChange = (day: keyof Schedule, field: 'active' | 'slot', value: unknown, slotIndex?: number) => {
        const newSchedule = { ...tempSchedule };
        const daySchedule = newSchedule[day] as DaySchedule;

        if (field === 'active') {
            daySchedule.active = Boolean(value);
        } else if (field === 'slot' && slotIndex !== undefined) {
            if (typeof value === 'object' && value !== null) {
                daySchedule.slots[slotIndex] = value as { start: string; end: string };
            }
        }
        setTempSchedule(newSchedule);
    };

    const handleAddSlot = (day: keyof Schedule) => {
        const newSchedule = { ...tempSchedule };
        const daySchedule = newSchedule[day] as DaySchedule;
        daySchedule.slots.push({ start: '19:00', end: '20:00' });
        setTempSchedule(newSchedule);
    };

    const handleRemoveSlot = (day: keyof Schedule, slotIndex: number) => {
        const newSchedule = { ...tempSchedule };
        const daySchedule = newSchedule[day] as DaySchedule;
        daySchedule.slots.splice(slotIndex, 1);
        setTempSchedule(newSchedule);
    };

    // Services handlers
    const handleAddService = () => {
        setTempServices([...tempServices, { id: crypto.randomUUID(), name: 'Consulta Online Especializada', price: config.consultationFee }]);
    };

    const handleUpdateService = (index: number, field: keyof Service, value: string | number) => {
        const newServices = [...tempServices];
        if (field === 'price') {
            const parsed = Number(value);
            newServices[index] = { ...newServices[index], price: isNaN(parsed) ? 0 : parsed };
        } else if (field === 'name') {
            newServices[index] = { ...newServices[index], name: String(value) };
        }
        setTempServices(newServices);
    };

    const handleRemoveService = (index: number) => {
        const newServices = [...tempServices];
        newServices.splice(index, 1);
        setTempServices(newServices);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Video className="h-6 w-6 text-primary" />
                        Consultas Online
                    </h2>
                    <p className="text-muted-foreground">Configura tus horarios y precios para videollamadas.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Configuración General</CardTitle>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="enabled-switch" className={config.enabled ? "text-primary font-bold" : "text-muted-foreground"}>
                                {config.enabled ? 'Habilitado' : 'Deshabilitado'}
                            </Label>
                            <Switch
                                id="enabled-switch"
                                checked={config.enabled}
                                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="consultationFee">Precio Consulta Online ($)</Label>
                            <Input
                                id="consultationFee"
                                type="number"
                                min="0"
                                step="0.01"
                                value={config.consultationFee === 0 ? '' : config.consultationFee}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    const parsed = parseFloat(value);
                                    setConfig({ ...config, consultationFee: isNaN(parsed) ? 0 : parsed });
                                }}
                                disabled={!config.enabled}
                            />
                            <p className="text-xs text-muted-foreground">Precio base para la videollamada.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="platform">Plataforma de Videollamada</Label>
                            <Select
                                value={config.platform || 'Google Meet'}
                                onValueChange={(value) => setConfig({ ...config, platform: value })}
                                disabled={!config.enabled}
                            >
                                <SelectTrigger id="platform">
                                    <SelectValue placeholder="Selecciona plataforma" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Google Meet">Google Meet</SelectItem>
                                    <SelectItem value="Zoom">Zoom</SelectItem>
                                    <SelectItem value="WhatsApp Video">WhatsApp Video</SelectItem>
                                    <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                                    <SelectItem value="Skype">Skype</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="onlineSlotDuration">Duración de cada Consulta Online (minutos)</Label>
                            <Input
                                id="onlineSlotDuration"
                                type="number"
                                min="5"
                                step="5"
                                placeholder="20"
                                value={config.slotDuration || ''}
                                onChange={(e) => setConfig({ ...config, slotDuration: parseInt(e.target.value) || undefined })}
                                disabled={!config.enabled}
                            />
                            <p className="text-xs text-muted-foreground">
                                Tiempo asignado para cada videollamada. Si no se especifica, se usará la duración general de tu perfil.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {config.enabled && (
                <Tabs defaultValue="schedule" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="schedule">Horarios Online</TabsTrigger>
                        <TabsTrigger value="services">Servicios Adicionales</TabsTrigger>
                    </TabsList>

                    <TabsContent value="schedule" className="py-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Disponibilidad Online</CardTitle>
                                <CardDescription>Define en qué horarios estás disponible para videollamadas. Estos horarios son independientes de tus consultorios físicos.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {daysOfWeek.map(day => {
                                    const daySchedule = tempSchedule[day] as DaySchedule;
                                    return (
                                        <div key={day} className="border p-4 rounded-lg space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold">{dayLabels[day]}</h3>
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={`switch-${day}`}>Disponible</Label>
                                                    <Switch
                                                        id={`switch-${day}`}
                                                        checked={daySchedule.active}
                                                        onCheckedChange={(checked) => handleScheduleChange(day, 'active', checked)}
                                                    />
                                                </div>
                                            </div>
                                            {daySchedule.active && (
                                                <div className="space-y-2">
                                                    {daySchedule.slots.map((slot, index) => (
                                                        <div key={index} className="flex items-center gap-2">
                                                            <Input type="time" value={slot.start} onChange={(e) => handleScheduleChange(day, 'slot', { ...slot, start: e.target.value }, index)} className="w-32" />
                                                            <span className="text-muted-foreground">-</span>
                                                            <Input type="time" value={slot.end} onChange={(e) => handleScheduleChange(day, 'slot', { ...slot, end: e.target.value }, index)} className="w-32" />
                                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveSlot(day, index)}><X className="h-4 w-4" /></Button>
                                                        </div>
                                                    ))}
                                                    <Button variant="outline" size="sm" onClick={() => handleAddSlot(day)}>+ Añadir bloque</Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="services" className="py-4">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Servicios Online</CardTitle>
                                        <CardDescription>Servicios específicos que ofreces por videollamada.</CardDescription>
                                    </div>
                                    <Button onClick={handleAddService} size="sm" variant="outline">
                                        <Plus className="mr-2 h-4 w-4" /> Agregar Servicio
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {tempServices.length === 0 ? (
                                    <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground">
                                        No hay servicios adicionales configurados para videollamadas.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {tempServices.map((service, index) => (
                                            <div key={service.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                                                <div className="flex-1">
                                                    <Label className="text-xs mb-1 block">Nombre del Servicio</Label>
                                                    <Input
                                                        value={service.name}
                                                        onChange={(e) => handleUpdateService(index, 'name', e.target.value)}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="w-32">
                                                    <Label className="text-xs mb-1 block">Precio ($)</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={service.price === 0 ? '' : service.price}
                                                        onChange={(e) => handleUpdateService(index, 'price', e.target.value)}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="pt-5">
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveService(index)} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect } from 'react';
import type { Doctor, DoctorAddress, Schedule, Service, DaySchedule } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Plus, MapPin, Trash2, Edit, Clock, CheckCircle, X, Power } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as supabaseService from '@/lib/supabaseService';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddressesTabProps {
    doctorData: Doctor;
    onUpdate: () => void;
}

const initialSchedule: Schedule = {
    monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    friday: { active: true, slots: [{ start: "09:00", end: "13:00" }] },
    saturday: { active: false, slots: [] },
    sunday: { active: false, slots: [] },
};

const dayLabels: Record<keyof Schedule, string> = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
const daysOfWeek: (keyof Schedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function AddressesTab({ doctorData, onUpdate }: AddressesTabProps) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<DoctorAddress | null>(null);
    const [availableCities, setAvailableCities] = useState<string[]>([]);

    // Form states
    const [formData, setFormData] = useState<Partial<DoctorAddress>>({});
    const [tempSchedule, setTempSchedule] = useState<Schedule>(initialSchedule);
    const [tempServices, setTempServices] = useState<Service[]>([]);

    // Load available cities from settings
    useEffect(() => {
        const loadCities = async () => {
            try {
                const settings = await supabaseService.getSettings();
                if (settings && settings.cities) {
                    setAvailableCities(settings.cities.map(c => c.name));
                }
            } catch (error) {
                console.error('Error loading cities:', error);
            }
        };
        loadCities();
    }, []);

    const handleOpenDialog = (address?: DoctorAddress) => {
        if (address) {
            setEditingAddress(address);
            setFormData(address);
            setTempSchedule(JSON.parse(JSON.stringify(address.schedule || initialSchedule)));
            setTempServices(address.services || []);
        } else {
            setEditingAddress(null);
            setFormData({
                name: '',
                address: '',
                city: doctorData.city || '',
                lat: 0,
                lng: 0,
                consultationFee: doctorData.consultationFee || 20
            });
            setTempSchedule(JSON.parse(JSON.stringify(initialSchedule)));
            setTempServices([]);
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.address || !formData.city) {
            toast({ variant: "destructive", title: "Error", description: "Por favor completa todos los campos requeridos." });
            return;
        }

        try {
            const newAddress: DoctorAddress = {
                id: editingAddress?.id || crypto.randomUUID(),
                name: formData.name!,
                address: formData.address!,
                city: formData.city!,
                schedule: tempSchedule,
                lat: formData.lat || 0,
                lng: formData.lng || 0,
                consultationFee: formData.consultationFee,
                slotDuration: formData.slotDuration,
                services: tempServices
            };

            let updatedAddresses = [...(doctorData.addresses || [])];

            if (editingAddress) {
                updatedAddresses = updatedAddresses.map(addr => addr.id === editingAddress.id ? newAddress : addr);
            } else {
                updatedAddresses.push(newAddress);
            }

            await supabaseService.updateDoctor(doctorData.id, { addresses: updatedAddresses });

            // Si es la primera dirección o se editó la primera, actualizar también los campos legacy por compatibilidad
            if (updatedAddresses.length === 1 || (editingAddress && doctorData.addresses && doctorData.addresses[0].id === editingAddress.id)) {
                await supabaseService.updateDoctor(doctorData.id, {
                    address: newAddress.address,
                    city: newAddress.city,
                    schedule: newAddress.schedule
                });
            }

            toast({ title: "Dirección guardada", description: "La información del consultorio ha sido actualizada." });
            setIsDialogOpen(false);
            onUpdate();
        } catch (error) {
            console.error('Error saving address:', error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la dirección." });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar este consultorio?")) return;

        try {
            const updatedAddresses = (doctorData.addresses || []).filter(a => a.id !== id);
            await supabaseService.updateDoctor(doctorData.id, { addresses: updatedAddresses });
            toast({ title: "Consultorio eliminado" });
            onUpdate();
        } catch (error) {
            console.error('Error deleting address:', error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el consultorio." });
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
        daySchedule.slots.push({ start: '09:00', end: '10:00' });
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
        setTempServices([...tempServices, { id: crypto.randomUUID(), name: 'Consulta Especializada', price: 30 }]);
    };

    const handleUpdateService = (index: number, field: keyof Service, value: string | number) => {
        const newServices = [...tempServices];
        if (field === 'price') {
            newServices[index] = { ...newServices[index], price: Number(value) };
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
                    <h2 className="text-2xl font-bold">Mis Consultorios</h2>
                    <p className="text-muted-foreground">Gestiona tus ubicaciones y horarios de atención.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Consultorio
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {doctorData.addresses && doctorData.addresses.map((address) => (
                    <Card key={address.id} className="relative">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                {address.name}
                            </CardTitle>
                            <CardDescription>{address.address}, {address.city}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 mt-2">
                                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(address)}>
                                    <Edit className="h-4 w-4 mr-2" /> Editar
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(address.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {(!doctorData.addresses || doctorData.addresses.length === 0) && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No tienes consultorios registrados.</p>
                        <Button variant="link" onClick={() => handleOpenDialog()}>Agregar el primero</Button>
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingAddress ? 'Editar Consultorio' : 'Nuevo Consultorio'}</DialogTitle>
                        <DialogDescription>Configura la ubicación, servicios y horarios para este consultorio.</DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">Detalles</TabsTrigger>
                            <TabsTrigger value="services">Servicios y Precios</TabsTrigger>
                            <TabsTrigger value="schedule">Horarios</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4 py-4">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre del Consultorio</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ej: Consultorio Centro, Clínica Las Mercedes..."
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="address">Dirección Física</Label>
                                    <Input
                                        id="address"
                                        placeholder="Calle, Número, Piso, Oficina..."
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="city">Ciudad</Label>
                                    <Select
                                        value={formData.city || ''}
                                        onValueChange={(value) => setFormData({ ...formData, city: value })}
                                    >
                                        <SelectTrigger id="city">
                                            <SelectValue placeholder="Selecciona una ciudad" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableCities.map((city) => (
                                                <SelectItem key={city} value={city}>
                                                    {city}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {availableCities.length === 0 && (
                                        <p className="text-xs text-muted-foreground">Cargando ciudades disponibles...</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="consultationFee">Precio de Consulta General ($)</Label>
                                    <Input
                                        id="consultationFee"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.consultationFee || ''}
                                        onChange={(e) => setFormData({ ...formData, consultationFee: parseFloat(e.target.value) })}
                                    />
                                    <p className="text-xs text-muted-foreground">Este es el precio base para una consulta en este consultorio.</p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="slotDuration">Duración de cada Cita (minutos)</Label>
                                    <Input
                                        id="slotDuration"
                                        type="number"
                                        min="5"
                                        step="5"
                                        placeholder="30"
                                        value={formData.slotDuration || ''}
                                        onChange={(e) => setFormData({ ...formData, slotDuration: parseInt(e.target.value) || undefined })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Tiempo asignado para cada cita en este consultorio. Si no se especifica, se usará la duración general de tu perfil.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="services" className="space-y-4 py-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">Servicios Adicionales</h3>
                                <Button onClick={handleAddService} size="sm" variant="outline">
                                    <Plus className="mr-2 h-4 w-4" /> Agregar Servicio
                                </Button>
                            </div>

                            {tempServices.length === 0 ? (
                                <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground">
                                    No hay servicios específicos configurados para este consultorio.
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
                                                    value={service.price}
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
                        </TabsContent>

                        <TabsContent value="schedule" className="space-y-4 py-4">
                            <div className="space-y-4">
                                {daysOfWeek.map(day => {
                                    const daySchedule = tempSchedule[day] as DaySchedule;
                                    return (
                                        <div key={day} className="border p-4 rounded-lg space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold">{dayLabels[day]}</h3>
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={`switch-${day}`}>Atiende</Label>
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
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar Consultorio</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

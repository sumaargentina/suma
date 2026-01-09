"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { ClinicService, ClinicBranch } from '@/lib/types';
import { getClinicServices, addClinicService, updateClinicService, deleteClinicService, getClinicBranches, getClinicAppointments, getServiceAppointmentHistory } from '@/lib/supabaseService';
import { Appointment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea'; // If textarea exists
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Tag, Clock, DollarSign, Building2, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export function ServicesTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [services, setServices] = useState<ClinicService[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingService, setEditingService] = useState<ClinicService | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        serviceCategory: '',
        price: 0,
        duration: 30,
        description: '',
        items: [] as { name: string; price: number }[],
    });

    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [selectedServiceForStats, setSelectedServiceForStats] = useState<ClinicService | null>(null);
    const [serviceHistory, setServiceHistory] = useState<Appointment[]>([]);
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

    const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);


    const handleViewDetails = async (service: ClinicService) => {
        setSelectedServiceForStats(service);
        setDetailsDateRange(undefined);
        setDetailsPreset('all');
        // Fetch handled by useEffect
    };

    useEffect(() => {
        const fetchHistory = async () => {
            if (!selectedServiceForStats) return;
            setIsLoadingHistory(true);
            try {
                const start = detailsDateRange?.from ? format(detailsDateRange.from, 'yyyy-MM-dd') : undefined;
                const end = detailsDateRange?.to ? format(detailsDateRange.to, 'yyyy-MM-dd') : start;

                const history = await getServiceAppointmentHistory(selectedServiceForStats.id, start, end);
                setServiceHistory(history);
            } catch (e) {
                console.error(e);
                toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial." });
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [selectedServiceForStats, detailsDateRange]);

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id, dateRange]);

    const loadData = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);

            // Format dates for API
            const startDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
            const endDateStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : startDateStr;

            // First fetch main data if needed (services)
            // Then fetch filtered appointments

            // Wait, reusing existing logic:
            const servicesData = await getClinicServices(user.id);
            setServices(servicesData);

            const filteredAppts = startDateStr ? await getClinicAppointments(user.id, startDateStr, endDateStr) : [];
            setTodaysAppointments(filteredAppts);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', serviceCategory: '', price: 0, duration: 30, description: '', items: [] });
        setEditingService(null);
        setNewItemName('');
        setNewItemPrice('');
    };

    const handleOpenDialog = (service?: ClinicService) => {
        if (service) {
            setEditingService(service);
            setFormData({
                name: service.name,
                serviceCategory: service.serviceCategory || '',
                price: service.price,
                duration: service.duration,
                description: service.description || '',
                items: service.items || [],
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const addItem = () => {
        if (!newItemName || !newItemPrice) {
            toast({ variant: "destructive", title: "Error", description: "Completa nombre y precio del ítem." });
            return;
        }
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { name: newItemName, price: Number(newItemPrice) }]
        }));
        setNewItemName('');
        setNewItemPrice('');
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        try {
            setIsSubmitting(true);

            if (editingService) {
                await updateClinicService(editingService.id, {
                    name: formData.name,
                    serviceCategory: formData.serviceCategory,
                    price: formData.price,
                    duration: formData.duration,
                    description: formData.description,
                    items: formData.items
                });
                toast({ title: "Servicio actualizado", description: "Los cambios se guardaron correctamente." });
            } else {
                await addClinicService({
                    ...formData,
                    clinicId: user.id,
                    branchId: user.id,
                    isActive: true
                });
                toast({ title: "Servicio creado", description: "El nuevo servicio ha sido registrado." });
            }

            setIsDialogOpen(false);
            loadData();
            resetForm();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Ocurrió un error al guardar." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar el servicio "${name}"? Esta acción no se puede deshacer.`)) return;

        try {
            await deleteClinicService(id);
            toast({ title: "Servicio eliminado", description: "El servicio ha sido eliminado correctamente." });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el servicio." });
        }
    };

    const handleToggleStatus = async (service: ClinicService) => {
        const newState = !service.isActive;

        // Optimistic update
        setServices(prev => prev.map(s => s.id === service.id ? { ...s, isActive: newState } : s));

        try {
            await updateClinicService(service.id, { isActive: newState });
            toast({
                title: newState ? "Servicio habilitado" : "Servicio deshabilitado",
                description: `El servicio ${service.name} ahora está ${newState ? 'activo' : 'inactivo'}.`
            });
        } catch (error) {
            console.error('Error updating status:', error);
            // Revert
            setServices(prev => prev.map(s => s.id === service.id ? { ...s, isActive: service.isActive } : s));
            toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar el estado." });
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Servicios</h2>
                    <p className="text-muted-foreground">Administra los servicios ofrecidos en tu clínica.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Agregar Servicio
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingService ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
                            <DialogDescription>
                                Ingresa los detalles del servicio y sus opciones.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre del Servicio</Label>
                                    <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Laboratorio, Enfermería" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Categoría</Label>
                                    <Input id="category" value={formData.serviceCategory} onChange={e => setFormData({ ...formData, serviceCategory: e.target.value })} placeholder="Ej: Estudios, Prácticas" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Precio Base (Opcional)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5">$</span>
                                        <Input id="price" type="number" className="pl-6" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} min="0" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">O deja en 0 si depende de los ítems sub-servicios.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Duración Estimada (min)</Label>
                                    <Input id="duration" type="number" value={formData.duration} onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })} required min="5" step="5" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción</Label>
                                <Input id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Detalles adicionales..." />
                            </div>

                            {/* ITEM SUB-SERVICES SECTION */}
                            <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold text-slate-700">Ítems / Sub-servicios</Label>
                                    <Badge variant="secondary" className="text-xs">Opcional</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Agrega opciones específicas. Ej: Para "Laboratorio", agrega "Hemograma", "Orina Completa".
                                </p>

                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs">Nombre ítem</Label>
                                        <Input
                                            placeholder="Ej: Hemograma"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-xs">Precio</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={newItemPrice}
                                            onChange={(e) => setNewItemPrice(e.target.value)}
                                        />
                                    </div>
                                    <Button type="button" size="sm" onClick={addItem} className="mb-0.5">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-2 mt-2">
                                    {formData.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white p-2 border rounded shadow-sm text-sm">
                                            <span>{item.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-green-700">${item.price}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => removeItem(idx)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {formData.items.length === 0 && (
                                        <p className="text-center text-xs text-muted-foreground py-2 italic">Sin ítems agregados.</p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services.length === 0 ? (
                    <Card className="col-span-full border-dashed">
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <Tag className="h-12 w-12 mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold">No hay servicios registrados</h3>
                            <p className="mb-4">Comienza agregando los servicios que ofrece tu clínica.</p>
                            <Button variant="outline" onClick={() => handleOpenDialog()}>Agregar Servicio</Button>
                        </CardContent>
                    </Card>
                ) : (
                    services.map((service) => (
                        <Card key={service.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{service.name}</CardTitle>
                                        <Badge variant="outline" className="font-normal">{service.serviceCategory || 'General'}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-medium ${service.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                            {service.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                        <Switch
                                            checked={service.isActive}
                                            onCheckedChange={() => handleToggleStatus(service)}
                                            className="scale-75 origin-right"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="h-4 w-4" /> {service.duration} min
                                    </div>
                                    <div className="flex items-center gap-1 font-semibold text-green-600">
                                        <DollarSign className="h-4 w-4" /> {service.price}
                                    </div>
                                </div>
                                <p className="text-muted-foreground text-xs line-clamp-2">{service.description || 'Sin descripción'}</p>

                                <div className="flex gap-2 mt-4 pt-2 border-t">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(service)}>
                                        <Pencil className="h-3 w-3 mr-2" /> Editar
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(service.id, service.name)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
            <div className="mt-12 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                        Rendimiento de Servicios
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
                                    <TableHead>Servicio</TableHead>
                                    <TableHead className="text-center">Pacientes</TableHead>
                                    <TableHead className="text-right">Ingresos</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {services.map((service) => {
                                    // Match by clinicServiceId or if name matches (fallback)
                                    const serviceAppts = todaysAppointments.filter(a => a.clinicServiceId === service.id || a.serviceName === service.name);
                                    const income = serviceAppts.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

                                    return (
                                        <TableRow key={service.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{service.name}</span>
                                                    <span className="text-xs text-muted-foreground">{service.serviceCategory}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{serviceAppts.length}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-700">
                                                ${income.toLocaleString('es-AR')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" onClick={() => handleViewDetails(service)}>
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
            <Sheet open={!!selectedServiceForStats} onOpenChange={(open) => !open && setSelectedServiceForStats(null)}>
                <SheetContent side="right" className="w-[800px] sm:max-w-[800px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Historial de {selectedServiceForStats?.name}</SheetTitle>
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
                                <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader className="p-4 pb-2">
                                            <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <div className="text-2xl font-bold">{serviceHistory.length}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="p-4 pb-2">
                                            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <div className="text-2xl font-bold">
                                                ${serviceHistory.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0).toLocaleString('es-AR')}
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
                                            {serviceHistory.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                                        No hay registros en este periodo.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                serviceHistory.map((appt) => (
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


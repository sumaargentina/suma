"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import type { LaboratoryService } from '@/lib/types';
import { 
    getLaboratoryServices, 
    addLaboratoryService, 
    updateLaboratoryService, 
    deleteLaboratoryService 
} from '@/lib/supabaseService';
import { useSettings } from '@/lib/settings';
import { getExchangeRate } from '@/lib/currency-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Loader2, 
    Plus, 
    Pencil, 
    Trash2, 
    FlaskConical, 
    Clock, 
    DollarSign, 
    Search, 
    Info, 
    CheckCircle2, 
    XCircle, 
    Tag,
    ListPlus,
    X,
    Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const DEFAULT_CATEGORIES = [
    'Hematología',
    'Bioquímica Clínica',
    'Inmunología / Serología',
    'Microbiología / Cultivos',
    'Coprología y Uroanálisis',
    'Hormonas y Endocrinología',
    'Marcadores Tumorales',
    'Perfiles Integrales',
    'Pruebas Especiales'
];

export function LaboratoryServicesTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { settings } = useSettings();
    const bcvRate = getExchangeRate(settings, 'VES') || 1;

    const [services, setServices] = useState<LaboratoryService[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<LaboratoryService | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete dialog
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<LaboratoryService | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        serviceCategory: 'Hematología',
        customCategory: '',
        price: 0,
        duration: 15,
        dailyCapacity: 50,
        description: '',
        preparationInstructions: '',
        resultsDeliveryTime: 'Mismo día',
        isActive: true,
        items: [] as { name: string; price: number }[],
    });

    const [newItemName, setNewItemName] = useState('');
    const effectiveLabId = user?.role === 'secretary' ? (user.laboratoryId || user.id) : user?.id;

    const loadServices = async () => {
        if (!effectiveLabId) return;
        try {
            setLoading(true);
            const data = await getLaboratoryServices(effectiveLabId);
            setServices(data);
        } catch (error) {
            console.error('Error loading laboratory services:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudieron cargar las pruebas del laboratorio.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadServices();
    }, [user?.id]);

    const handleOpenCreate = () => {
        setEditingService(null);
        setFormData({
            name: '',
            serviceCategory: 'Hematología',
            customCategory: '',
            price: 0,
            duration: 15,
            dailyCapacity: 50,
            description: '',
            preparationInstructions: 'Ayuno mínimo de 8 a 12 horas. No ingerir bebidas alcohólicas 24 horas antes.',
            resultsDeliveryTime: 'Mismo día (4:00 PM)',
            isActive: true,
            items: [],
        });
        setNewItemName('');
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (service: LaboratoryService) => {
        setEditingService(service);
        const isCustom = !DEFAULT_CATEGORIES.includes(service.serviceCategory || '');
        setFormData({
            name: service.name,
            serviceCategory: isCustom ? 'custom' : (service.serviceCategory || 'Hematología'),
            customCategory: isCustom ? (service.serviceCategory || '') : '',
            price: service.price,
            duration: service.duration || 15,
            dailyCapacity: service.dailyCapacity || 50,
            description: service.description || '',
            preparationInstructions: service.preparationInstructions || '',
            resultsDeliveryTime: service.resultsDeliveryTime || 'Mismo día',
            isActive: service.isActive !== false,
            items: service.items || [],
        });
        setNewItemName('');
        setIsDialogOpen(true);
    };

    const handleAddItem = () => {
        if (!newItemName.trim()) return;
        setFormData({
            ...formData,
            items: [...formData.items, { name: newItemName.trim(), price: 0 }]
        });
        setNewItemName('');
    };

    const handleRemoveItem = (index: number) => {
        const next = [...formData.items];
        next.splice(index, 1);
        setFormData({ ...formData, items: next });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        if (!formData.name.trim()) {
            toast({
                variant: 'destructive',
                title: 'Nombre requerido',
                description: 'Por favor indica el nombre de la prueba o perfil.'
            });
            return;
        }

        const finalCategory = formData.serviceCategory === 'custom' 
            ? (formData.customCategory.trim() || 'General')
            : formData.serviceCategory;

        try {
            setIsSubmitting(true);
            const payload: Partial<LaboratoryService> = {
                laboratoryId: effectiveLabId,
                name: formData.name.trim(),
                serviceCategory: finalCategory,
                price: Number(formData.price) || 0,
                duration: Number(formData.duration) || 15,
                dailyCapacity: Number(formData.dailyCapacity) || 50,
                description: formData.description.trim(),
                preparationInstructions: formData.preparationInstructions.trim(),
                resultsDeliveryTime: formData.resultsDeliveryTime.trim(),
                isActive: formData.isActive,
                items: formData.items,
            };

            if (editingService) {
                await updateLaboratoryService(editingService.id, payload);
                toast({
                    title: 'Prueba Actualizada',
                    description: `"${formData.name}" ha sido modificada con éxito.`
                });
            } else {
                await addLaboratoryService(payload);
                toast({
                    title: 'Prueba Agregada',
                    description: `"${formData.name}" fue añadida al catálogo.`
                });
            }

            setIsDialogOpen(false);
            await loadServices();
        } catch (error: any) {
            console.error('Error saving laboratory service:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo guardar la prueba.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!serviceToDelete) return;
        try {
            setIsDeleting(true);
            await deleteLaboratoryService(serviceToDelete.id);
            toast({
                title: 'Prueba Eliminada',
                description: 'La prueba ha sido retirada del catálogo.'
            });
            setIsDeleteDialogOpen(false);
            setServiceToDelete(null);
            await loadServices();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo eliminar la prueba.'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleActive = async (service: LaboratoryService) => {
        try {
            const nextActive = !service.isActive;
            await updateLaboratoryService(service.id, { isActive: nextActive });
            setServices(services.map(s => s.id === service.id ? { ...s, isActive: nextActive } : s));
            toast({
                title: nextActive ? 'Prueba Activada' : 'Prueba Desactivada',
                description: `"${service.name}" ahora está ${nextActive ? 'disponible' : 'oculta'} para los pacientes.`
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo actualizar el estado.'
            });
        }
    };

    // Filtered services
    const filteredServices = useMemo(() => {
        return services.filter((svc) => {
            const matchesSearch = 
                svc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (svc.serviceCategory || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (svc.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCategory = categoryFilter === 'ALL' || svc.serviceCategory === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [services, searchTerm, categoryFilter]);

    // Available categories for filter
    const availableCategories = useMemo(() => {
        const set = new Set<string>();
        services.forEach(s => {
            if (s.serviceCategory) set.add(s.serviceCategory);
        });
        return Array.from(set).sort();
    }, [services]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <FlaskConical className="h-6 w-6 text-teal-600" />
                        Catálogo de Pruebas y Análisis
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Configura los exámenes disponibles, precios, preparación para el paciente y tiempos de entrega de resultados.
                    </p>
                </div>
                <Button 
                    onClick={handleOpenCreate} 
                    className="bg-teal-600 hover:bg-teal-700 text-white shadow-md gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Prueba o Perfil
                </Button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-teal-100 bg-teal-50/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                            <FlaskConical className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Total Pruebas</p>
                            <h3 className="text-2xl font-bold text-teal-900">{services.length}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-emerald-100 bg-emerald-50/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Activas al Público</p>
                            <h3 className="text-2xl font-bold text-emerald-900">
                                {services.filter(s => s.isActive !== false).length}
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 bg-slate-50/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                            <Tag className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Categorías</p>
                            <h3 className="text-2xl font-bold text-slate-900">{availableCategories.length}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar por nombre, categoría o indicaciones..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas las categorías</SelectItem>
                                {availableCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Services Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                            <p>Cargando catálogo de pruebas...</p>
                        </div>
                    ) : filteredServices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
                            <FlaskConical className="h-12 w-12 text-slate-300" />
                            <h3 className="text-lg font-semibold text-slate-700">No hay pruebas registradas</h3>
                            <p className="text-sm max-w-sm">
                                {searchTerm || categoryFilter !== 'ALL'
                                    ? 'No se encontraron pruebas con los filtros aplicados.'
                                    : 'Comienza agregando los exámenes de sangre, perfiles o análisis que realiza tu laboratorio.'}
                            </p>
                            <Button onClick={handleOpenCreate} className="mt-2 bg-teal-600 hover:bg-teal-700 text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Primera Prueba
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50">
                                    <TableHead>Prueba / Análisis</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Preparación e Indicaciones</TableHead>
                                    <TableHead>Entrega</TableHead>
                                    <TableHead>Precio (USD / Bs.)</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredServices.map((service) => {
                                    const priceBs = (service.price * bcvRate).toFixed(2);
                                    return (
                                        <TableRow key={service.id} className="hover:bg-slate-50/60 transition-colors">
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-slate-900">{service.name}</p>
                                                    {service.items && service.items.length > 0 && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                            Incluye: {service.items.map(i => i.name).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <Badge variant="outline" className="border-teal-200 text-teal-800 bg-teal-50 text-xs">
                                                    {service.serviceCategory || 'General'}
                                                </Badge>
                                            </TableCell>

                                            <TableCell className="max-w-[240px]">
                                                {service.preparationInstructions ? (
                                                    <p className="text-xs text-slate-700 line-clamp-2" title={service.preparationInstructions}>
                                                        {service.preparationInstructions}
                                                    </p>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Sin requisitos especiales</span>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                                    <Clock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                                    <span>{service.resultsDeliveryTime || 'Mismo día'}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-slate-900">${service.price.toFixed(2)}</p>
                                                    <p className="text-[11px] text-muted-foreground font-mono">Bs. {priceBs}</p>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <Switch 
                                                    checked={service.isActive !== false} 
                                                    onCheckedChange={() => handleToggleActive(service)}
                                                    className="data-[state=checked]:bg-teal-600"
                                                />
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                                                        onClick={() => handleOpenEdit(service)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                        onClick={() => {
                                                            setServiceToDelete(service);
                                                            setIsDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Modal: Crear / Editar Prueba de Laboratorio */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <FlaskConical className="h-5 w-5 text-teal-600" />
                            {editingService ? 'Editar Prueba de Laboratorio' : 'Nueva Prueba o Perfil'}
                        </DialogTitle>
                        <DialogDescription>
                            Define los detalles del examen, instrucciones de preparación y tiempo de entrega.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="test-name">Nombre de la Prueba o Perfil *</Label>
                                <Input
                                    id="test-name"
                                    placeholder="Ej. Perfil 20, Hematología Completa, Glicemia Basal..."
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="test-category">Categoría</Label>
                                <Select
                                    value={formData.serviceCategory}
                                    onValueChange={(val) => setFormData({ ...formData, serviceCategory: val })}
                                >
                                    <SelectTrigger id="test-category">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DEFAULT_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                        <SelectItem value="custom">+ Otra Categoría Personalizada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.serviceCategory === 'custom' && (
                                <div className="space-y-2">
                                    <Label htmlFor="custom-cat">Especifica la Categoría</Label>
                                    <Input
                                        id="custom-cat"
                                        placeholder="Ej. Toxicología, Genética..."
                                        value={formData.customCategory}
                                        onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="test-price">Precio (USD) *</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="test-price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        className="pl-9"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Equivale a aprox. Bs. {(formData.price * bcvRate).toFixed(2)} (Tasa BCV)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="test-delivery">Tiempo de Entrega de Resultados</Label>
                                <Input
                                    id="test-delivery"
                                    placeholder="Ej. Mismo día (4:00 PM), 24 horas, 48 horas..."
                                    value={formData.resultsDeliveryTime}
                                    onChange={(e) => setFormData({ ...formData, resultsDeliveryTime: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="test-capacity">Capacidad Diaria (Muestras)</Label>
                                <Input
                                    id="test-capacity"
                                    type="number"
                                    min="1"
                                    value={formData.dailyCapacity}
                                    onChange={(e) => setFormData({ ...formData, dailyCapacity: parseInt(e.target.value) || 50 })}
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="test-prep">Instrucciones de Preparación para el Paciente *</Label>
                                <Textarea
                                    id="test-prep"
                                    placeholder="Ej. Ayuno estricto de 10 a 12 horas. No ingerir bebidas alcohólicas 24 horas antes. Tomar primera orina de la mañana..."
                                    rows={3}
                                    value={formData.preparationInstructions}
                                    onChange={(e) => setFormData({ ...formData, preparationInstructions: e.target.value })}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Esta información es vital: el paciente la verá antes de agendar y en su comprobante de cita.
                                </p>
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="test-desc">Descripción o Detalles Clínicos (Opcional)</Label>
                                <Textarea
                                    id="test-desc"
                                    placeholder="Incluye recuento plaquetario, glóbulos blancos, fórmula leucocitaria y hemoglobina..."
                                    rows={2}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* Sub-pruebas / Componentes del Perfil */}
                            <div className="space-y-2 sm:col-span-2 border-t pt-3">
                                <Label className="flex items-center gap-1.5 font-semibold text-slate-800">
                                    <ListPlus className="h-4 w-4 text-teal-600" />
                                    Sub-pruebas o Parámetros Incluidos (Para Perfiles)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Si es un perfil (como Perfil 20 o Perfil Lipídico), puedes desglosar las pruebas que incluye:
                                </p>

                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ej. Glicemia, Urea, Creatinina, Colesterol Total..."
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddItem();
                                            }
                                        }}
                                    />
                                    <Button type="button" onClick={handleAddItem} variant="secondary">
                                        Agregar
                                    </Button>
                                </div>

                                {formData.items.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        {formData.items.map((item, idx) => (
                                            <Badge key={idx} variant="secondary" className="gap-1 bg-slate-100 text-slate-800 border">
                                                {item.name}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="hover:text-rose-600"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between sm:col-span-2 border-t pt-3">
                                <div>
                                    <Label className="text-sm font-medium">Estado Activo</Label>
                                    <p className="text-xs text-muted-foreground">Los pacientes podrán ver y solicitar esta prueba.</p>
                                </div>
                                <Switch
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                    className="data-[state=checked]:bg-teal-600"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-4 border-t">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsDialogOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editingService ? 'Guardar Cambios' : 'Registrar Prueba'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Confirmar Eliminación */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar prueba del catálogo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar "{serviceToDelete?.name}"? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

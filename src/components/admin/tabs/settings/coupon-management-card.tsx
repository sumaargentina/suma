"use client";

import { useState, useEffect } from 'react';
import type { Coupon, Doctor } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Pencil, Trash2, Loader2, CreditCard, Percent, DollarSign, Users, User, Stethoscope, MapPin, Globe } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getDoctors, getSettings } from '@/lib/supabaseService';
import { getCurrentDateTimeInArgentina } from '@/lib/utils';

interface CouponManagementCardProps {
    coupons: Coupon[];
    onAddCoupon: (coupon: Omit<Coupon, 'id'>) => Promise<void>;
    onUpdateCoupon: (id: string, coupon: Coupon) => Promise<void>;
    onDeleteCoupon: (id: string) => Promise<void>;
}

export function CouponManagementCard({ coupons, onAddCoupon, onUpdateCoupon, onDeleteCoupon }: CouponManagementCardProps) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Coupon | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [scopeType, setScopeType] = useState<'all' | 'specialty' | 'specific' | 'city'>('all');
    const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [cities, setCities] = useState<string[]>([]);
    const [scopeCity, setScopeCity] = useState<string>('');

    // Cargar médicos y especialidades
    useEffect(() => {
        const loadData = async () => {
            setIsLoadingData(true);
            try {
                const doctorsData = await getDoctors();
                setDoctors(doctorsData);

                // Extraer especialidades únicas
                const uniqueSpecialties = [...new Set(doctorsData.map(d => d.specialty))].sort();
                setSpecialties(uniqueSpecialties);
            } catch (error) {
                console.error('Error cargando datos:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los médicos y especialidades.' });
            } finally {
                setIsLoadingData(false);
            }
        };

        loadData();
    }, [toast]);

    // 3. Cargar ciudades al montar el componente
    useEffect(() => {
        async function fetchCities() {
            try {
                const settings = await getSettings();
                if (settings && settings.cities) {
                    // Extraer solo los nombres de las ciudades configuradas
                    const citiesList = settings.cities.map(city => city.name).sort();
                    setCities(citiesList);
                } else {
                    setCities([]);
                }
            } catch (error) {
                console.error('Error cargando ciudades:', error);
                setCities([]);
            }
        }
        fetchCities();
    }, []);

    const openDialog = (item: Coupon | null) => {
        setEditingCoupon(item);

        // Configurar el alcance basado en el cupón existente
        if (item) {
            setScopeType(item.scopeType);
            setSelectedDoctors(item.scopeDoctors || []);
            setSelectedSpecialty(item.scopeSpecialty || '');
            setScopeCity(item.scopeCity || '');
        } else {
            setScopeType('all');
            setSelectedDoctors([]);
            setSelectedSpecialty('');
            setScopeCity('');
        }

        setIsDialogOpen(true);
    };

    const openDeleteDialog = (item: Coupon) => {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            code: formData.get('code') as string,
            discountType: formData.get('discountType') as 'fixed' | 'percentage',
            discountValue: Number(formData.get('discountValue')),
            scopeType: scopeType,
            selectedDoctors: selectedDoctors,
            selectedSpecialty: selectedSpecialty,
            scopeCity: scopeCity,
        };

        // Validaciones básicas
        if (!data.code.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El código del cupón es requerido.' });
            setIsSaving(false);
            return;
        }

        if (data.discountValue <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'El valor del descuento debe ser mayor a 0.' });
            setIsSaving(false);
            return;
        }

        // Validaciones específicas según el tipo de alcance
        if (scopeType === 'specialty' && !selectedSpecialty) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar una especialidad.' });
            setIsSaving(false);
            return;
        }

        if (scopeType === 'specific' && selectedDoctors.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar al menos un médico.' });
            setIsSaving(false);
            return;
        }

        if (scopeType === 'city' && !scopeCity) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar una ciudad.' });
            setIsSaving(false);
            return;
        }

        try {
            const couponData: Record<string, unknown> = {
                code: data.code.trim().toUpperCase(),
                description: `Cupón ${data.code.trim().toUpperCase()}`,
                discountType: data.discountType,
                discountValue: data.discountValue,
                validFrom: getCurrentDateTimeInArgentina().toISOString().split('T')[0],
                validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días
                isActive: true,
                createdAt: getCurrentDateTimeInArgentina().toISOString(),
                updatedAt: getCurrentDateTimeInArgentina().toISOString(),
                scopeType: scopeType,
            };

            // Solo agregar campos si tienen valor
            if (selectedSpecialty) {
                couponData.scopeSpecialty = selectedSpecialty;
            }
            if (selectedDoctors.length > 0) {
                couponData.scopeDoctors = selectedDoctors;
            }
            if (scopeCity) {
                couponData.scopeCity = scopeCity;
            }

            if (editingCoupon) {
                await onUpdateCoupon(editingCoupon.id, { ...couponData, id: editingCoupon.id } as Coupon);
                toast({ title: 'Cupón actualizado', description: 'Los cambios han sido guardados exitosamente.' });
            } else {
                await onAddCoupon(couponData as Omit<Coupon, "id">);
                toast({ title: 'Cupón añadido', description: 'El cupón ha sido creado exitosamente.' });
            }
            setIsDialogOpen(false);
            setEditingCoupon(null);
        } catch (error) {
            console.error('Error saving coupon:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el cupón.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);

        try {
            await onDeleteCoupon(itemToDelete.id);
            toast({ title: 'Cupón eliminado', description: 'El cupón ha sido eliminado exitosamente.' });
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el cupón.' });
        } finally {
            setIsDeleting(false);
        }
    };

    const getDiscountIcon = (type: 'fixed' | 'percentage') => {
        return type === 'fixed' ? <DollarSign className="h-4 w-4" /> : <Percent className="h-4 w-4" />;
    };

    const getDiscountLabel = (type: 'fixed' | 'percentage') => {
        return type === 'fixed' ? 'Monto Fijo' : 'Porcentaje';
    };

    // Cambiar getScopeIcon para que reciba el objeto coupon
    function getScopeIcon(coupon: Coupon) {
        switch (coupon.scopeType) {
            case 'all':
                return <Users className="h-4 w-4" />;
            case 'specialty':
                return <Stethoscope className="h-4 w-4" />;
            case 'city':
                return <MapPin className="h-4 w-4" />;
            case 'specific':
                return <User className="h-4 w-4" />;
            default:
                return <Globe className="h-4 w-4" />;
        }
    }

    // 1. Donde se usaba 'value' en vez de 'discountValue'
    // Reemplazar item.value por item.discountValue
    // 2. Donde se usaba 'scope' en vez de 'scopeType', 'scopeCity', 'scopeSpecialty', 'scopeDoctors'
    // Reemplazar item.scope por lógica basada en item.scopeType y los campos relacionados
    function getScopeDescription(item: Coupon) {
        switch (item.scopeType) {
            case 'all':
                return 'Todos los médicos';
            case 'specialty':
                return `Especialidad: ${item.scopeSpecialty || ''}`;
            case 'city':
                return `Ciudad: ${item.scopeCity || ''}`;
            case 'specific':
                return `Médicos específicos (${item.scopeDoctors?.length || 0})`;
            default:
                return 'Alcance no definido';
        }
    }

    return (
        <>
            <Card className="border-primary/10">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary" />
                                Cupones de Descuento
                            </CardTitle>
                            <CardDescription className="text-base">
                                Gestiona los cupones para pacientes y médicos.
                            </CardDescription>
                        </div>
                        <Button onClick={() => openDialog(null)} className="shrink-0 w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Cupón
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Vista móvil mejorada */}
                    <div className="md:hidden space-y-3">
                        {coupons.map(coupon => (
                            <div key={coupon.id} className="p-4 border rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">Código:</span>
                                            <span className="text-sm font-bold font-mono">{coupon.code}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                {getDiscountIcon(coupon.discountType)}
                                                {getDiscountLabel(coupon.discountType)}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">Valor:</span>
                                            <span className="text-sm font-bold">
                                                {coupon.discountType === 'fixed' ? `$${coupon.discountValue}` : `${coupon.discountValue}%`}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">Alcance:</span>
                                            <div className="flex items-center gap-1 text-sm font-medium truncate ml-2">
                                                {getScopeIcon(coupon)}
                                                <span className="truncate">{getScopeDescription(coupon)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openDialog(coupon)}
                                        className="h-8 px-3"
                                    >
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Editar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openDeleteDialog(coupon)}
                                        className="h-8 px-3 text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {coupons.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <CreditCard className="h-8 w-8 mx-auto mb-2" />
                                <p>No hay cupones creados</p>
                                <p className="text-sm">Comienza añadiendo el primer cupón</p>
                            </div>
                        )}
                    </div>

                    {/* Tabla responsiva para desktop */}
                    <div className="hidden md:block rounded-md border">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Alcance</TableHead>
                                        <TableHead className="w-24 text-center">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {coupons.map(coupon => (
                                        <TableRow key={coupon.id} className="hover:bg-muted/50">
                                            <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                    {getDiscountIcon(coupon.discountType)}
                                                    {getDiscountLabel(coupon.discountType)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-bold">
                                                {coupon.discountType === 'fixed' ? `$${coupon.discountValue}` : `${coupon.discountValue}%`}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getScopeIcon(coupon)}
                                                    <span>{getScopeDescription(coupon)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => openDialog(coupon)}
                                                        className="h-8 w-8"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => openDeleteDialog(coupon)}
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {coupons.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <CreditCard className="h-8 w-8 mx-auto mb-2" />
                                <p>No hay cupones creados</p>
                                <p className="text-sm">Comienza añadiendo el primer cupón</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Diálogo de edición/creación mejorado */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCoupon ? 'Modifica los datos del cupón existente.' : 'Crea un nuevo cupón de descuento para pacientes.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code" className="text-sm font-medium">
                                Código del Cupón <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="code"
                                name="code"
                                defaultValue={editingCoupon?.code}
                                required
                                placeholder="Ej: DESCUENTO20"
                                className="h-10 font-mono"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="discountType" className="text-sm font-medium">
                                Tipo de Descuento <span className="text-red-500">*</span>
                            </Label>
                            <Select name="discountType" defaultValue={editingCoupon?.discountType || 'fixed'}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Selecciona el tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            Monto Fijo ($)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="percentage">
                                        <div className="flex items-center gap-2">
                                            <Percent className="h-4 w-4" />
                                            Porcentaje (%)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="discountValue" className="text-sm font-medium">
                                Valor del Descuento <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="discountValue"
                                name="discountValue"
                                type="number"
                                defaultValue={editingCoupon?.discountValue}
                                required
                                placeholder="0.00"
                                className="h-10"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Alcance <span className="text-red-500">*</span>
                            </Label>
                            <Select value={scopeType} onValueChange={(value) => setScopeType(value as 'all' | 'specialty' | 'specific' | 'city')}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Selecciona el alcance" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Todos los médicos
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="specialty">
                                        <div className="flex items-center gap-2">
                                            <Stethoscope className="h-4 w-4" />
                                            Por especialidad
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="specific">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            Médicos específicos
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="city">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Por ciudad
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Opciones específicas según el tipo de alcance */}
                        {scopeType === 'specialty' && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Especialidad <span className="text-red-500">*</span>
                                </Label>
                                <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Selecciona una especialidad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {specialties.map(specialty => (
                                            <SelectItem key={specialty} value={specialty}>
                                                {specialty}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {scopeType === 'specific' && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Médicos <span className="text-red-500">*</span>
                                </Label>
                                <ScrollArea className="h-32 border rounded-md p-2">
                                    {isLoadingData ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="ml-2">Cargando médicos...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {doctors.map(doctor => (
                                                <div key={doctor.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={doctor.id}
                                                        checked={selectedDoctors.includes(doctor.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedDoctors([doctor.id]); // Por ahora solo uno
                                                            } else {
                                                                setSelectedDoctors(selectedDoctors.filter(id => id !== doctor.id));
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor={doctor.id} className="text-sm cursor-pointer">
                                                        Dr. {doctor.name} - {doctor.specialty}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        )}

                        {/* Selector de ciudad si scopeType === 'city' */}
                        {scopeType === 'city' && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Ciudad <span className="text-red-500">*</span>
                                </Label>
                                <Select value={scopeCity} onValueChange={setScopeCity}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Selecciona una ciudad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cities.map(city => (
                                            <SelectItem key={city} value={city}>
                                                {city}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <DialogFooter className="flex flex-col sm:flex-row gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className="w-full sm:w-auto">
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    'Guardar'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Diálogo de confirmación de eliminación mejorado */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que quieres eliminar este cupón?
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                'Eliminar'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

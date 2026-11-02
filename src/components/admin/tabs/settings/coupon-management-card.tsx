"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Coupon, Doctor, Clinic } from '@/lib/types';
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    PlusCircle,
    Pencil,
    Trash2,
    Loader2,
    CreditCard,
    Percent,
    DollarSign,
    Users,
    User,
    Stethoscope,
    MapPin,
    Globe,
    Building2,
    Briefcase,
    Calendar,
    Copy,
    Search,
    Sparkles,
    CheckCircle2,
    XCircle,
    Clock,
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getDoctors, getClinics, getSettings } from '@/lib/supabaseService';
import { DEFAULT_PROFESSIONS_CATALOG, DEFAULT_SPECIALTIES_LIST } from '@/lib/professions-catalog';
import { getCitiesByState } from '@/lib/geo-data';

interface CouponManagementCardProps {
    coupons: Coupon[];
    onAddCoupon: (coupon: Omit<Coupon, 'id'>) => Promise<void>;
    onUpdateCoupon: (id: string, coupon: Coupon) => Promise<void>;
    onDeleteCoupon: (id: string) => Promise<void>;
}

type ScopeTypeOption = 'all' | 'profession' | 'specialty' | 'specific' | 'clinic' | 'city';

function getTodayDateString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDaysToDateString(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function normalizeDateInput(dateStr?: string): string {
    if (!dateStr) return '';
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
}

function getCouponValidityStatus(coupon: Coupon): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string } {
    if (coupon.isActive === false) {
        return { label: 'Pausado', variant: 'secondary', className: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    const now = new Date();
    const fromStr = normalizeDateInput(coupon.validFrom);
    const toStr = normalizeDateInput(coupon.validTo);

    if (fromStr) {
        const fromDate = new Date(`${fromStr}T00:00:00`);
        if (!isNaN(fromDate.getTime()) && fromDate > now) {
            return { label: 'Programado', variant: 'outline', className: 'bg-blue-50 text-blue-700 border-blue-200' };
        }
    }
    if (toStr) {
        const toDate = new Date(`${toStr}T23:59:59.999`);
        if (!isNaN(toDate.getTime()) && toDate < now) {
            return { label: 'Vencido', variant: 'destructive', className: 'bg-red-50 text-red-700 border-red-200' };
        }
    }
    if (coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses) {
        return { label: 'Agotado', variant: 'destructive', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: 'Activo', variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

export function CouponManagementCard({ coupons, onAddCoupon, onUpdateCoupon, onDeleteCoupon }: CouponManagementCardProps) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Coupon | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Catálogos cargados
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [professions, setProfessions] = useState<string[]>([]);
    const [cities, setCities] = useState<string[]>([]);

    // Campos controlados del formulario
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
    const [discountValue, setDiscountValue] = useState<string>('');
    const [maxDiscount, setMaxDiscount] = useState<string>('');
    const [maxUses, setMaxUses] = useState<string>('');
    const [validFrom, setValidFrom] = useState<string>(getTodayDateString());
    const [validTo, setValidTo] = useState<string>(addDaysToDateString(30));
    const [isActive, setIsActive] = useState<boolean>(true);

    // Alcance
    const [scopeType, setScopeType] = useState<ScopeTypeOption>('all');
    const [selectedProfession, setSelectedProfession] = useState<string>('');
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
    const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
    const [selectedClinics, setSelectedClinics] = useState<string[]>([]);
    const [scopeCity, setScopeCity] = useState<string>('');

    // Buscadores internos del modal
    const [doctorSearch, setDoctorSearch] = useState('');
    const [clinicSearch, setClinicSearch] = useState('');
    const [specialtySearch, setSpecialtySearch] = useState('');

    // Cargar médicos, clínicas, especialidades, profesiones y ciudades
    useEffect(() => {
        const loadData = async () => {
            setIsLoadingData(true);
            try {
                const [doctorsData, clinicsData, settings] = await Promise.all([
                    getDoctors().catch(() => [] as Doctor[]),
                    getClinics().catch(() => [] as Clinic[]),
                    getSettings().catch(() => null),
                ]);

                setDoctors(doctorsData);
                setClinics(clinicsData);

                // Profesiones / Rubros
                const profCatalog = (settings?.professionsCatalog && settings.professionsCatalog.length > 0)
                    ? settings.professionsCatalog
                    : DEFAULT_PROFESSIONS_CATALOG;
                const profNames = Array.from(new Set([
                    ...profCatalog.map(p => p.name),
                    'Bienestar y Estética',
                ])).filter(Boolean);
                setProfessions(profNames);

                // Especialidades (Catálogo + Settings + Médicos registrados)
                const catalogSpecs = profCatalog.flatMap(p => p.specialties.map(s => s.name));
                const settingsSpecs = (settings?.specialties || []).map((s: any) => typeof s === 'string' ? s : s?.name).filter(Boolean);
                const doctorSpecs = doctorsData.map(d => d.specialty).filter(Boolean);
                const allSpecs = Array.from(new Set([
                    ...DEFAULT_SPECIALTIES_LIST,
                    ...catalogSpecs,
                    ...settingsSpecs,
                    ...doctorSpecs,
                ])).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
                setSpecialties(allSpecs);

                // Ciudades (Settings + Oficiales + Médicos/Clínicas)
                const configCities = (settings?.cities || [])
                    .map((c: any) => typeof c === 'string' ? c : c?.name)
                    .filter(Boolean);
                const geoCitiesVE = getCitiesByState('VE').map(c => c.name);
                const docCities = doctorsData.map(d => d.city).filter(Boolean);
                const cliCities = clinicsData.map(c => c.city).filter((c): c is string => Boolean(c));
                const allCities = Array.from(new Set([
                    ...configCities,
                    ...docCities,
                    ...cliCities,
                    ...geoCitiesVE,
                ])).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
                setCities(allCities);
            } catch (error) {
                console.error('Error cargando datos para cupones:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar algunos catálogos.' });
            } finally {
                setIsLoadingData(false);
            }
        };

        loadData();
    }, [toast]);

    const filteredDoctorsList = useMemo(() => {
        const q = doctorSearch.trim().toLowerCase();
        if (!q) return doctors;
        return doctors.filter(d =>
            d.name?.toLowerCase().includes(q) ||
            d.specialty?.toLowerCase().includes(q) ||
            d.city?.toLowerCase().includes(q)
        );
    }, [doctors, doctorSearch]);

    const filteredClinicsList = useMemo(() => {
        const q = clinicSearch.trim().toLowerCase();
        if (!q) return clinics;
        return clinics.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.city?.toLowerCase().includes(q)
        );
    }, [clinics, clinicSearch]);

    const filteredSpecialtiesList = useMemo(() => {
        const q = specialtySearch.trim().toLowerCase();
        if (!q) return specialties;
        return specialties.filter(s => s.toLowerCase().includes(q));
    }, [specialties, specialtySearch]);

    const openDialog = (item: Coupon | null) => {
        setEditingCoupon(item);
        setDoctorSearch('');
        setClinicSearch('');
        setSpecialtySearch('');

        if (item) {
            const val = item.discountValue ?? item.value ?? 0;
            setCode(item.code || '');
            setName(item.name || '');
            setDescription(item.description || '');
            setDiscountType(item.discountType || 'fixed');
            setDiscountValue(String(val));
            setMaxDiscount(item.maxDiscount ? String(item.maxDiscount) : '');
            setMaxUses(item.maxUses ? String(item.maxUses) : '');
            setValidFrom(normalizeDateInput(item.validFrom) || getTodayDateString());
            setValidTo(normalizeDateInput(item.validTo) || addDaysToDateString(30));
            setIsActive(item.isActive !== false);

            setScopeType((item.scopeType as ScopeTypeOption) || 'all');
            setSelectedProfession(item.scopeProfession || '');
            setSelectedSpecialty(item.scopeSpecialty || '');
            setSelectedDoctors(item.scopeDoctors || []);
            const initialClinics = item.scopeClinics?.length
                ? item.scopeClinics
                : (item.scopeClinic ? [item.scopeClinic] : (item.clinicId ? [item.clinicId] : []));
            setSelectedClinics(initialClinics);
            setScopeCity(item.scopeCity || '');
        } else {
            setCode('');
            setName('');
            setDescription('');
            setDiscountType('percentage');
            setDiscountValue('');
            setMaxDiscount('');
            setMaxUses('');
            setValidFrom(getTodayDateString());
            setValidTo(addDaysToDateString(30));
            setIsActive(true);

            setScopeType('all');
            setSelectedProfession('');
            setSelectedSpecialty('');
            setSelectedDoctors([]);
            setSelectedClinics([]);
            setScopeCity('');
        }

        setIsDialogOpen(true);
    };

    const generateRandomCode = () => {
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const valPart = discountValue ? Math.round(Number(discountValue)) : 'PROMO';
        setCode(`SUMA${valPart}${suffix}`);
    };

    const handleCopyCode = (couponCode: string) => {
        navigator.clipboard.writeText(couponCode).then(() => {
            toast({ title: 'Código copiado', description: `El cupón ${couponCode} fue copiado al portapapeles.` });
        });
    };

    const handleToggleActiveQuick = async (coupon: Coupon) => {
        try {
            const updated: Coupon = {
                ...coupon,
                isActive: coupon.isActive === false ? true : false,
                updatedAt: new Date().toISOString(),
            };
            await onUpdateCoupon(coupon.id, updated);
            toast({
                title: updated.isActive ? 'Cupón activado' : 'Cupón pausado',
                description: `El cupón ${coupon.code} ahora está ${updated.isActive ? 'activo' : 'pausado'}.`,
            });
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cambiar el estado del cupón.' });
        }
    };

    const openDeleteDialog = (item: Coupon) => {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const cleanCode = code.trim().toUpperCase();
        const numericValue = Number(discountValue);

        if (!cleanCode || cleanCode.length < 3) {
            toast({ variant: 'destructive', title: 'Error', description: 'El código del cupón debe tener al menos 3 caracteres.' });
            return;
        }

        if (isNaN(numericValue) || numericValue <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'El valor del descuento debe ser mayor a 0.' });
            return;
        }

        if (discountType === 'percentage' && numericValue > 100) {
            toast({ variant: 'destructive', title: 'Error', description: 'El porcentaje de descuento no puede ser mayor a 100%.' });
            return;
        }

        if (!validFrom || !validTo) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes indicar la fecha de inicio y de caducación.' });
            return;
        }

        if (new Date(`${validTo}T23:59:59`) < new Date(`${validFrom}T00:00:00`)) {
            toast({ variant: 'destructive', title: 'Error', description: 'La fecha de caducación no puede ser anterior a la fecha de inicio.' });
            return;
        }

        // Validaciones específicas según el tipo de alcance
        if (scopeType === 'profession' && !selectedProfession) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un rubro o profesión.' });
            return;
        }

        if (scopeType === 'specialty' && !selectedSpecialty) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar una especialidad.' });
            return;
        }

        if (scopeType === 'specific' && selectedDoctors.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar al menos un médico.' });
            return;
        }

        if (scopeType === 'clinic' && selectedClinics.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar al menos una clínica.' });
            return;
        }

        if (scopeType === 'city' && !scopeCity) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar una ciudad.' });
            return;
        }

        setIsSaving(true);
        try {
            const nowIso = new Date().toISOString();
            const couponData: Record<string, unknown> = {
                code: cleanCode,
                name: name.trim() || `Cupón ${cleanCode}`,
                description: description.trim() || `Descuento ${discountType === 'fixed' ? `$${numericValue}` : `${numericValue}%`}`,
                discountType,
                discountValue: numericValue,
                value: numericValue, // Compatibilidad con todos los módulos
                validFrom,
                validTo,
                isActive,
                createdAt: editingCoupon?.createdAt || nowIso,
                updatedAt: nowIso,
                scopeType,
            };

            if (maxDiscount && Number(maxDiscount) > 0) {
                couponData.maxDiscount = Number(maxDiscount);
            }
            if (maxUses && Number(maxUses) > 0) {
                couponData.maxUses = Number(maxUses);
            }

            if (scopeType === 'profession' && selectedProfession) {
                couponData.scopeProfession = selectedProfession;
            }
            if (scopeType === 'specialty' && selectedSpecialty) {
                couponData.scopeSpecialty = selectedSpecialty;
            }
            if (scopeType === 'specific' && selectedDoctors.length > 0) {
                couponData.scopeDoctors = selectedDoctors;
            }
            if (scopeType === 'clinic' && selectedClinics.length > 0) {
                couponData.scopeClinics = selectedClinics;
                couponData.scopeClinic = selectedClinics[0];
                couponData.clinicId = selectedClinics[0];
            }
            if (scopeType === 'city' && scopeCity) {
                couponData.scopeCity = scopeCity;
            }

            if (editingCoupon) {
                await onUpdateCoupon(editingCoupon.id, { ...couponData, id: editingCoupon.id } as Coupon);
                toast({ title: 'Cupón actualizado', description: `El cupón ${cleanCode} fue actualizado correctamente.` });
            } else {
                await onAddCoupon(couponData as Omit<Coupon, "id">);
                toast({ title: 'Cupón creado', description: `El cupón ${cleanCode} ya está disponible para los pacientes.` });
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
        return type === 'fixed' ? <DollarSign className="h-3.5 w-3.5" /> : <Percent className="h-3.5 w-3.5" />;
    };

    const getDiscountLabel = (type: 'fixed' | 'percentage') => {
        return type === 'fixed' ? 'Monto Fijo' : 'Porcentaje';
    };

    function getScopeIcon(coupon: Coupon) {
        switch (coupon.scopeType) {
            case 'all':
                return <Users className="h-4 w-4 text-primary" />;
            case 'profession':
                return <Briefcase className="h-4 w-4 text-purple-600" />;
            case 'specialty':
                return <Stethoscope className="h-4 w-4 text-teal-600" />;
            case 'specific':
                return <User className="h-4 w-4 text-blue-600" />;
            case 'clinic':
                return <Building2 className="h-4 w-4 text-indigo-600" />;
            case 'city':
                return <MapPin className="h-4 w-4 text-orange-600" />;
            default:
                return <Globe className="h-4 w-4 text-slate-500" />;
        }
    }

    function getScopeDescription(item: Coupon) {
        switch (item.scopeType) {
            case 'all':
                return 'Todos los médicos y clínicas';
            case 'profession':
                return `Rubro: ${item.scopeProfession || ''}`;
            case 'specialty':
                return `Especialidad: ${item.scopeSpecialty || ''}`;
            case 'city':
                return `Ciudad: ${item.scopeCity || ''}`;
            case 'clinic': {
                const cIds = item.scopeClinics?.length ? item.scopeClinics : (item.scopeClinic ? [item.scopeClinic] : (item.clinicId ? [item.clinicId] : []));
                if (cIds.length === 1) {
                    const found = clinics.find(c => c.id === cIds[0]);
                    return `Clínica: ${found ? found.name : '1 seleccionada'}`;
                }
                return `Clínicas específicas (${cIds.length})`;
            }
            case 'specific': {
                const dIds = item.scopeDoctors || [];
                if (dIds.length === 1) {
                    const found = doctors.find(d => d.id === dIds[0]);
                    return `Médico: ${found ? found.name : '1 seleccionado'}`;
                }
                return `Médicos específicos (${dIds.length})`;
            }
            default:
                return 'Todos los médicos';
        }
    }

    const formatDisplayValue = (coupon: Coupon) => {
        const val = coupon.discountValue ?? coupon.value ?? 0;
        return coupon.discountType === 'fixed' ? `$${val}` : `${val}%`;
    };

    return (
        <>
            <Card className="border-primary/10">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary" />
                                Cupones de Descuento (Administración)
                            </CardTitle>
                            <CardDescription className="text-sm md:text-base">
                                Crea cupones para todo tipo de pacientes: generales, por rubro/profesión, por especialidad, para un médico específico, para una clínica específica o por ciudad, con control de fechas de caducación.
                            </CardDescription>
                        </div>
                        <Button onClick={() => openDialog(null)} className="shrink-0 w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nuevo Cupón
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Vista móvil */}
                    <div className="md:hidden space-y-3">
                        {coupons.map(coupon => {
                            const status = getCouponValidityStatus(coupon);
                            const fromStr = normalizeDateInput(coupon.validFrom);
                            const toStr = normalizeDateInput(coupon.validTo);
                            return (
                                <div key={coupon.id} className="p-4 border rounded-xl space-y-3 bg-white shadow-2xs">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-bold font-mono text-slate-900">{coupon.code}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => handleCopyCode(coupon.code)}
                                                >
                                                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                                                </Button>
                                            </div>
                                            {(coupon.name || coupon.description) && (
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {coupon.name || coupon.description}
                                                </p>
                                            )}
                                        </div>
                                        <Badge variant="outline" className={status.className}>
                                            {status.label}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                        <div className="bg-slate-50 p-2 rounded-lg">
                                            <span className="text-muted-foreground block">Descuento</span>
                                            <span className="font-bold text-sm text-emerald-700">
                                                {formatDisplayValue(coupon)} ({getDiscountLabel(coupon.discountType)})
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-lg">
                                            <span className="text-muted-foreground block">Caducación</span>
                                            <span className="font-semibold text-slate-800">
                                                {toStr || 'Sin fecha'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                                        {getScopeIcon(coupon)}
                                        <span className="truncate">{getScopeDescription(coupon)}</span>
                                    </div>

                                    {fromStr && toStr && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>Vigencia: {fromStr} al {toStr}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleActiveQuick(coupon)}
                                            className="h-8 px-2.5 text-xs"
                                        >
                                            {coupon.isActive === false ? 'Activar' : 'Pausar'}
                                        </Button>
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
                            );
                        })}

                        {coupons.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-60" />
                                <p className="font-medium">No hay cupones creados</p>
                                <p className="text-sm">Comienza añadiendo el primer cupón</p>
                            </div>
                        )}
                    </div>

                    {/* Tabla para desktop */}
                    <div className="hidden md:block rounded-xl border overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow>
                                        <TableHead>Cupón / Campaña</TableHead>
                                        <TableHead>Tipo y Valor</TableHead>
                                        <TableHead>Alcance / Rubro</TableHead>
                                        <TableHead>Vigencia y Caducación</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="w-32 text-center">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {coupons.map(coupon => {
                                        const status = getCouponValidityStatus(coupon);
                                        const fromStr = normalizeDateInput(coupon.validFrom);
                                        const toStr = normalizeDateInput(coupon.validTo);
                                        return (
                                            <TableRow key={coupon.id} className="hover:bg-muted/40">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono font-bold text-slate-900">{coupon.code}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-slate-400 hover:text-slate-700"
                                                                onClick={() => handleCopyCode(coupon.code)}
                                                                title="Copiar código"
                                                            >
                                                                <Copy className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                        {(coupon.name || coupon.description) && (
                                                            <span className="text-xs text-muted-foreground line-clamp-1">
                                                                {coupon.name || coupon.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-base text-emerald-700">
                                                            {formatDisplayValue(coupon)}
                                                        </span>
                                                        <Badge variant="outline" className="flex items-center gap-1 text-[11px]">
                                                            {getDiscountIcon(coupon.discountType)}
                                                            {getDiscountLabel(coupon.discountType)}
                                                        </Badge>
                                                    </div>
                                                    {coupon.maxDiscount ? (
                                                        <span className="text-[11px] text-muted-foreground block">
                                                            Tope máx: ${coupon.maxDiscount}
                                                        </span>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                        {getScopeIcon(coupon)}
                                                        <span>{getScopeDescription(coupon)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs space-y-0.5">
                                                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                            <span>Vence: <strong>{toStr || 'Sin límite'}</strong></span>
                                                        </div>
                                                        {fromStr && (
                                                            <span className="text-[11px] text-muted-foreground block pl-4">
                                                                Desde: {fromStr}
                                                            </span>
                                                        )}
                                                        {coupon.maxUses ? (
                                                            <span className="text-[11px] text-muted-foreground block pl-4">
                                                                Usos: {coupon.usedCount || 0} / {coupon.maxUses}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={status.className}>
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleToggleActiveQuick(coupon)}
                                                            className="h-8 w-8"
                                                            title={coupon.isActive === false ? 'Activar cupón' : 'Pausar cupón'}
                                                        >
                                                            {coupon.isActive === false ? (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 text-slate-400 hover:text-amber-600" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => openDialog(coupon)}
                                                            className="h-8 w-8"
                                                            title="Editar cupón"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => openDeleteDialog(coupon)}
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            title="Eliminar cupón"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {coupons.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground">
                                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-60" />
                                <p className="font-medium">No hay cupones creados</p>
                                <p className="text-sm">Comienza añadiendo el primer cupón</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Diálogo de creación / edición de cupón */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl max-w-[95vw] max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <CreditCard className="h-5 w-5 text-primary" />
                            {editingCoupon ? 'Editar Cupón de Descuento' : 'Crear Nuevo Cupón de Descuento'}
                        </DialogTitle>
                        <DialogDescription>
                            Configura el código, monto o porcentaje, el rubro/alcance (general, profesión, especialidad, médico, clínica o ciudad) y su fecha de caducación.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4 py-1">
                        {/* 1. Código y Nombre */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="code" className="text-sm font-semibold">
                                    Código del Cupón <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex gap-1.5">
                                    <Input
                                        id="code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        required
                                        placeholder="Ej: SUMA20"
                                        className="h-10 font-mono uppercase font-bold"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 shrink-0"
                                        onClick={generateRandomCode}
                                        title="Generar código automático"
                                    >
                                        <Sparkles className="h-4 w-4 text-primary" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-sm font-semibold">
                                    Nombre / Motivo del Cupón
                                </Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Jornada de Salud / Promo Especial"
                                    className="h-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="description" className="text-sm font-medium">
                                Descripción o Condiciones (Opcional)
                            </Label>
                            <Input
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ej: Válido para consultas médicas reservadas por la app"
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* 2. Tipo y Valor del Descuento */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">
                                    Tipo de Descuento <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={discountType}
                                    onValueChange={(val) => setDiscountType(val as 'fixed' | 'percentage')}
                                >
                                    <SelectTrigger className="h-10 bg-white">
                                        <SelectValue placeholder="Selecciona el tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">
                                            <div className="flex items-center gap-2">
                                                <Percent className="h-4 w-4 text-primary" />
                                                Porcentaje (%)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="fixed">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-emerald-600" />
                                                Monto Fijo ($)
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="discountValue" className="text-sm font-semibold">
                                    Valor ({discountType === 'fixed' ? 'USD $' : 'Porcentaje %'}) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="discountValue"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={discountType === 'percentage' ? '100' : undefined}
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(e.target.value)}
                                    required
                                    placeholder={discountType === 'fixed' ? 'Ej: 10.00' : 'Ej: 20'}
                                    className="h-10 bg-white font-bold"
                                />
                            </div>

                            {discountType === 'percentage' && (
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="maxDiscount" className="text-xs font-medium text-slate-600">
                                        Tope máximo de descuento en USD $ (Opcional — deja vacío si no tiene tope)
                                    </Label>
                                    <Input
                                        id="maxDiscount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={maxDiscount}
                                        onChange={(e) => setMaxDiscount(e.target.value)}
                                        placeholder="Ej: 25.00"
                                        className="h-9 bg-white text-sm"
                                    />
                                </div>
                            )}
                        </div>

                        {/* 3. Alcance / Rubro */}
                        <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">
                                    Alcance / Rubro del Cupón <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={scopeType}
                                    onValueChange={(value) => setScopeType(value as ScopeTypeOption)}
                                >
                                    <SelectTrigger className="h-10 bg-white">
                                        <SelectValue placeholder="Selecciona a quién aplica este cupón" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-primary" />
                                                Todos los médicos y clínicas (General)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="specific">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-blue-600" />
                                                Médico(s) específico(s)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="specialty">
                                            <div className="flex items-center gap-2">
                                                <Stethoscope className="h-4 w-4 text-teal-600" />
                                                Especialidad específica (ej. Pediatría, Cardiología)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="clinic">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-indigo-600" />
                                                Clínica o Centro de Salud específico
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="profession">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="h-4 w-4 text-purple-600" />
                                                Por Rubro / Profesión (ej. Medicina, Odontología, Psicología)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="city">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-orange-600" />
                                                Por Ciudad (ej. Maturín, Punta de Mata)
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Selector por Rubro / Profesión */}
                            {scopeType === 'profession' && (
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">
                                        Rubro / Profesión <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={selectedProfession} onValueChange={setSelectedProfession}>
                                        <SelectTrigger className="h-10 bg-white">
                                            <SelectValue placeholder="Selecciona un rubro profesional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {professions.map(prof => (
                                                <SelectItem key={prof} value={prof}>
                                                    {prof}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Selector por Especialidad */}
                            {scopeType === 'specialty' && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Especialidad <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                        <Input
                                            value={specialtySearch}
                                            onChange={(e) => setSpecialtySearch(e.target.value)}
                                            placeholder="Filtrar especialidad (ej. Ginecología, Cirugía, Pediatría...)"
                                            className="pl-9 h-9 bg-white text-sm"
                                        />
                                    </div>
                                    <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                                        <SelectTrigger className="h-10 bg-white">
                                            <SelectValue placeholder="Selecciona una especialidad" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredSpecialtiesList.map(specialty => (
                                                <SelectItem key={specialty} value={specialty}>
                                                    {specialty}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Selector por Médico(s) específico(s) */}
                            {scopeType === 'specific' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">
                                            Selecciona uno o varios médicos <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {selectedDoctors.length} seleccionado(s)
                                            </Badge>
                                            {selectedDoctors.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs text-red-600"
                                                    onClick={() => setSelectedDoctors([])}
                                                >
                                                    Limpiar
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                        <Input
                                            value={doctorSearch}
                                            onChange={(e) => setDoctorSearch(e.target.value)}
                                            placeholder="Buscar médico por nombre, especialidad o ciudad..."
                                            className="pl-9 h-9 bg-white text-sm"
                                        />
                                    </div>
                                    <ScrollArea className="h-44 border rounded-lg p-2 bg-white">
                                        {isLoadingData ? (
                                            <div className="flex items-center justify-center h-full py-6">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="ml-2 text-sm">Cargando médicos...</span>
                                            </div>
                                        ) : filteredDoctorsList.length === 0 ? (
                                            <p className="text-xs text-center text-muted-foreground py-6">
                                                No se encontraron médicos con ese filtro.
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {filteredDoctorsList.map(doctor => {
                                                    const isChecked = selectedDoctors.includes(doctor.id);
                                                    return (
                                                        <div
                                                            key={doctor.id}
                                                            className={`flex items-center space-x-2.5 p-1.5 rounded-md transition-colors ${isChecked ? 'bg-primary/5 border border-primary/20' : 'hover:bg-slate-50'}`}
                                                        >
                                                            <Checkbox
                                                                id={`doc-${doctor.id}`}
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setSelectedDoctors(prev => Array.from(new Set([...prev, doctor.id])));
                                                                    } else {
                                                                        setSelectedDoctors(prev => prev.filter(id => id !== doctor.id));
                                                                    }
                                                                }}
                                                            />
                                                            <Label htmlFor={`doc-${doctor.id}`} className="text-xs sm:text-sm cursor-pointer flex-1 leading-tight">
                                                                <span className="font-semibold text-slate-900">{doctor.name}</span>
                                                                <span className="text-muted-foreground"> — {doctor.specialty} ({doctor.city})</span>
                                                            </Label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            )}

                            {/* Selector por Clínica(s) específica(s) */}
                            {scopeType === 'clinic' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">
                                            Selecciona una o varias clínicas <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {selectedClinics.length} seleccionada(s)
                                            </Badge>
                                            {selectedClinics.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs text-red-600"
                                                    onClick={() => setSelectedClinics([])}
                                                >
                                                    Limpiar
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                        <Input
                                            value={clinicSearch}
                                            onChange={(e) => setClinicSearch(e.target.value)}
                                            placeholder="Buscar clínica por nombre o ciudad..."
                                            className="pl-9 h-9 bg-white text-sm"
                                        />
                                    </div>
                                    <ScrollArea className="h-40 border rounded-lg p-2 bg-white">
                                        {isLoadingData ? (
                                            <div className="flex items-center justify-center h-full py-6">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="ml-2 text-sm">Cargando clínicas...</span>
                                            </div>
                                        ) : filteredClinicsList.length === 0 ? (
                                            <p className="text-xs text-center text-muted-foreground py-6">
                                                No se encontraron clínicas registradas.
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {filteredClinicsList.map(clinic => {
                                                    const isChecked = selectedClinics.includes(clinic.id);
                                                    return (
                                                        <div
                                                            key={clinic.id}
                                                            className={`flex items-center space-x-2.5 p-1.5 rounded-md transition-colors ${isChecked ? 'bg-indigo-50/70 border border-indigo-200' : 'hover:bg-slate-50'}`}
                                                        >
                                                            <Checkbox
                                                                id={`clinic-${clinic.id}`}
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setSelectedClinics(prev => Array.from(new Set([...prev, clinic.id])));
                                                                    } else {
                                                                        setSelectedClinics(prev => prev.filter(id => id !== clinic.id));
                                                                    }
                                                                }}
                                                            />
                                                            <Label htmlFor={`clinic-${clinic.id}`} className="text-xs sm:text-sm cursor-pointer flex-1 leading-tight">
                                                                <span className="font-semibold text-slate-900">{clinic.name}</span>
                                                                {clinic.city && <span className="text-muted-foreground"> — {clinic.city}</span>}
                                                            </Label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            )}

                            {/* Selector por Ciudad */}
                            {scopeType === 'city' && (
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">
                                        Ciudad <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={scopeCity} onValueChange={setScopeCity}>
                                        <SelectTrigger className="h-10 bg-white">
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
                        </div>

                        {/* 4. Fechas de Vigencia, Caducación y Límites */}
                        <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                                <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-primary" />
                                    Vigencia y Fecha de Caducación
                                </Label>
                                <div className="flex flex-wrap gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-[11px] bg-white"
                                        onClick={() => setValidTo(getTodayDateString())}
                                    >
                                        Solo Hoy
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-[11px] bg-white"
                                        onClick={() => setValidTo(addDaysToDateString(7))}
                                    >
                                        +7 días
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-[11px] bg-white"
                                        onClick={() => setValidTo(addDaysToDateString(30))}
                                    >
                                        +30 días
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-[11px] bg-white"
                                        onClick={() => setValidTo(addDaysToDateString(90))}
                                    >
                                        +3 meses
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-[11px] bg-white"
                                        onClick={() => setValidTo(addDaysToDateString(365))}
                                    >
                                        +1 año
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="validFrom" className="text-xs font-medium text-slate-600">
                                        Válido Desde <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="validFrom"
                                        type="date"
                                        value={validFrom}
                                        onChange={(e) => setValidFrom(e.target.value)}
                                        required
                                        className="h-9 bg-white text-sm"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="validTo" className="text-xs font-medium text-slate-600">
                                        Fecha de Caducación <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="validTo"
                                        type="date"
                                        value={validTo}
                                        onChange={(e) => setValidTo(e.target.value)}
                                        required
                                        className="h-9 bg-white text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                    <Label htmlFor="maxUses" className="text-xs font-medium text-slate-600">
                                        Límite máximo de usos (Opcional)
                                    </Label>
                                    <Input
                                        id="maxUses"
                                        type="number"
                                        min="1"
                                        value={maxUses}
                                        onChange={(e) => setMaxUses(e.target.value)}
                                        placeholder="Ilimitado"
                                        className="h-9 bg-white text-sm"
                                    />
                                </div>

                                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border h-9 self-end">
                                    <Label htmlFor="isActiveSwitch" className="text-xs font-semibold cursor-pointer">
                                        Cupón Activo
                                    </Label>
                                    <Switch
                                        id="isActiveSwitch"
                                        checked={isActive}
                                        onCheckedChange={setIsActive}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
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
                                    editingCoupon ? 'Guardar Cambios' : 'Crear Cupón'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Diálogo de confirmación de eliminación */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que quieres eliminar el cupón <strong>{itemToDelete?.code}</strong>?
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

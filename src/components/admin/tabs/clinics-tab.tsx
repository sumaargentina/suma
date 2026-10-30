"use client";

import { useState, useEffect } from 'react';
import { getAdminClinics, updateClinicStatus } from '@/lib/supabaseService';
import { Clinic } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Eye, Building2, Pencil, Save, X, KeyRound, Plus, Trash2, Phone, MapPin, Power } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LocationSelector, type LocationData } from '@/components/ui/location-selector';

export function ClinicsTab() {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Clinic>>({});
    const [newPassword, setNewPassword] = useState('');

    // Estados para crear clínica nueva
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newClinicData, setNewClinicData] = useState({
        name: '',
        legalName: '',
        rif: '',
        adminEmail: '',
        email: '',
        password: '',
        phone: '',
        whatsapp: '',
        website: '',
        country: 'VE',
        state: 'Monagas',
        city: 'Maturín',
        sector: '',
        address: '',
        description: '',
        plan: 'integral' as string,
        billingCycle: 'monthly' as string,
        billingMonths: 1 as number,
        subscriptionFee: 0 as number,
        subscriptionStatus: 'active' as 'active' | 'pending_payment' | 'inactive',
    });

    const loadClinics = async () => {
        try {
            setLoading(true);
            const data = await getAdminClinics();
            setClinics(data);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las clínicas.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClinics();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleUpdateStatus = async (
        clinic: Clinic,
        newStatus: 'active' | 'inactive',
        verification?: 'verified' | 'rejected' | 'pending'
    ) => {
        setProcessingId(clinic.id);
        const nextVerification = verification || (newStatus === 'active' ? 'verified' : (clinic.verificationStatus || 'verified'));
        const nextSubscription: 'active' | 'inactive' = newStatus === 'active' ? 'active' : 'inactive';
        try {
            await updateClinicStatus(clinic.id, {
                status: newStatus,
                verificationStatus: nextVerification,
                subscriptionStatus: nextSubscription,
            });

            setClinics(prev => prev.map(c =>
                c.id === clinic.id
                    ? { ...c, status: newStatus, verificationStatus: nextVerification, subscriptionStatus: nextSubscription }
                    : c
            ));

            toast({
                title: newStatus === 'active' ? 'Clínica Activada' : 'Clínica Inactivada',
                description: newStatus === 'active'
                    ? `"${clinic.name}" está activa y su tarjeta es visible en el buscador.`
                    : `"${clinic.name}" pasó a inactiva y su tarjeta ya no se muestra en el buscador.`,
            });
            if (selectedClinic?.id === clinic.id) {
                setSelectedClinic({
                    ...selectedClinic,
                    status: newStatus,
                    verificationStatus: nextVerification,
                    subscriptionStatus: nextSubscription,
                });
            }
        } catch (error: any) {
            console.error('Update failed:', error);
            toast({
                variant: 'destructive',
                title: 'Error de Actualización',
                description: error.message || 'No se pudo actualizar el estado.'
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleQuickToggleStatus = async (clinic: Clinic) => {
        const isCurrentlyActive = clinic.status === 'active' && clinic.subscriptionStatus !== 'inactive';
        const targetStatus: 'active' | 'inactive' = isCurrentlyActive ? 'inactive' : 'active';
        await handleUpdateStatus(clinic, targetStatus);
    };

    const handleEditClick = () => {
        if (selectedClinic) {
            setEditData({ ...selectedClinic });
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditData({});
        setNewPassword('');
    };

    const handleSaveEdit = async () => {
        if (!selectedClinic) return;

        setProcessingId(selectedClinic.id);
        try {
            // Include password in the update if provided
            const dataToSave = { ...editData };
            if (newPassword.trim()) {
                (dataToSave as any).password = newPassword;
            }

            await updateClinicStatus(selectedClinic.id, dataToSave);

            const updatedClinic = { ...selectedClinic, ...editData };
            setClinics(prev => prev.map(c => c.id === selectedClinic.id ? updatedClinic : c));
            setSelectedClinic(updatedClinic);
            setIsEditing(false);
            setEditData({});
            setNewPassword('');

            toast({
                title: 'Clínica actualizada',
                description: newPassword.trim() ? 'Los cambios y la contraseña han sido guardados.' : 'Los cambios han sido guardados.'
            });
        } catch (error: any) {
            console.error('Save failed:', error);
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: error.message || 'No se pudieron guardar los cambios.'
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleInputChange = (field: keyof Clinic, value: string) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const handleDeleteClinic = async (clinic: Clinic) => {
        if (!confirm(`¿Estás seguro de eliminar permanentemente la clínica "${clinic.name}"?`)) return;

        setProcessingId(clinic.id);
        try {
            const res = await fetch(`/api/clinics?id=${clinic.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo eliminar la clínica');

            setClinics(prev => prev.filter(c => c.id !== clinic.id));
            if (selectedClinic?.id === clinic.id) {
                setSelectedClinic(null);
            }
            toast({
                title: 'Clínica eliminada',
                description: `"${clinic.name}" ha sido eliminada de la base de datos.`
            });
        } catch (error: any) {
            console.error('Error deleting clinic:', error);
            toast({
                variant: 'destructive',
                title: 'Error al eliminar',
                description: error.message || 'No se pudo eliminar la clínica.'
            });
        } finally {
            setProcessingId(null);
        }
    };

    // Función para crear clínica nueva
    const handleCreateClinic = async () => {
        if (!newClinicData.name.trim() || !newClinicData.adminEmail.trim() || !newClinicData.password.trim()) {
            toast({
                variant: 'destructive',
                title: 'Campos requeridos',
                description: 'Nombre de la institución, email administrador y contraseña son obligatorios.'
            });
            return;
        }

        setIsCreating(true);
        try {
            const isHospital = newClinicData.plan === 'hospital_gratuito';
            const res = await fetch('/api/clinics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newClinicData.name.trim(),
                    legalName: newClinicData.legalName.trim() || null,
                    rif: newClinicData.rif.trim() || null,
                    adminEmail: newClinicData.adminEmail.toLowerCase().trim(),
                    email: (newClinicData.email || newClinicData.adminEmail).toLowerCase().trim(),
                    password: newClinicData.password,
                    phone: newClinicData.phone.trim(),
                    whatsapp: (newClinicData.whatsapp || newClinicData.phone).trim(),
                    website: newClinicData.website.trim() || null,
                    country: newClinicData.country || 'VE',
                    state: newClinicData.state || '',
                    city: newClinicData.city || '',
                    sector: newClinicData.sector || '',
                    address: newClinicData.address || '',
                    description: newClinicData.description.trim(),
                    plan: newClinicData.plan,
                    billingCycle: isHospital ? 'free' : (newClinicData.billingMonths === 12 ? 'annual' : 'monthly'),
                    billingMonths: isHospital ? 12 : newClinicData.billingMonths,
                    subscriptionFee: isHospital ? 0 : Number(newClinicData.subscriptionFee) || 0,
                    subscriptionStatus: isHospital ? 'active' : newClinicData.subscriptionStatus,
                    status: 'active',
                    verificationStatus: 'verified',
                }),
            });
            const resData = await res.json();
            if (!res.ok) throw new Error(resData.error || 'No se pudo crear la clínica');

            toast({
                title: 'Institución creada exitosamente',
                description: `${newClinicData.name} ha sido registrada y activada en SUMA.`
            });

            // Limpiar y cerrar modal
            setNewClinicData({
                name: '',
                legalName: '',
                rif: '',
                adminEmail: '',
                email: '',
                password: '',
                phone: '',
                whatsapp: '',
                website: '',
                country: 'VE',
                state: 'Monagas',
                city: 'Maturín',
                sector: '',
                address: '',
                description: '',
                plan: 'integral',
                billingCycle: 'monthly',
                billingMonths: 1,
                subscriptionFee: 0,
                subscriptionStatus: 'active',
            });
            setShowCreateModal(false);

            // Recargar lista
            loadClinics();
        } catch (error: any) {
            console.error('Error creating clinic:', error);
            toast({
                variant: 'destructive',
                title: 'Error al crear clínica',
                description: error.message || 'No se pudo crear la clínica.'
            });
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Gestión de Clínicas y Hospitales ({clinics.length})
                        </CardTitle>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Clínica / Hospital
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Institución / RIF</TableHead>
                                <TableHead>Plan / Ciclo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Contacto / Ubicación</TableHead>
                                <TableHead>Registro</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clinics.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No hay clínicas registradas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                clinics.map((clinic) => (
                                    <TableRow key={clinic.id}>
                                        <TableCell>
                                            <p className="font-semibold text-slate-900">{clinic.name}</p>
                                            {clinic.rif && (
                                                <p className="text-xs text-muted-foreground font-mono">RIF/ID: {clinic.rif}</p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 items-start">
                                                {clinic.plan === 'hospital_gratuito' ? (
                                                    <Badge className="bg-sky-100 text-sky-800 border-sky-300 uppercase text-xs font-semibold">
                                                        🏥 Hospital Gratuito
                                                    </Badge>
                                                ) : (
                                                    <>
                                                        <Badge variant="outline" className="uppercase text-xs" style={{
                                                            borderColor: clinic.plan === 'empresarial' ? 'purple' : clinic.plan === 'profesional' ? 'green' : 'blue',
                                                            color: clinic.plan === 'empresarial' ? 'purple' : clinic.plan === 'profesional' ? 'green' : 'blue'
                                                        }}>
                                                            {clinic.plan || 'Integral'}
                                                        </Badge>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {clinic.billingMonths ? `${clinic.billingMonths} ${clinic.billingMonths === 1 ? 'mes' : 'meses'}` : (clinic.billingCycle === 'annual' ? '12 meses' : '1 mes')}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 items-start">
                                                <Badge
                                                    onClick={() => processingId !== clinic.id && handleQuickToggleStatus(clinic)}
                                                    title="Clic para cambiar entre Activa e Inactiva"
                                                    className={`cursor-pointer select-none transition-all ${
                                                        clinic.status === 'active' && clinic.subscriptionStatus !== 'inactive'
                                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                                            : 'bg-red-600 hover:bg-red-700 text-white'
                                                    }`}
                                                >
                                                    {processingId === clinic.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                    ) : (
                                                        <Power className="h-3 w-3 mr-1" />
                                                    )}
                                                    {clinic.status === 'active' && clinic.subscriptionStatus !== 'inactive' ? 'Activa' : 'Inactiva'}
                                                </Badge>
                                                {clinic.verificationStatus === 'pending' && (
                                                    <Badge variant="secondary" className="text-xs text-orange-600">Pendiente Verif.</Badge>
                                                )}
                                                {clinic.subscriptionStatus === 'inactive' && (
                                                    <span className="text-[10px] font-medium text-rose-600">Sin pago / Oculta</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs space-y-0.5">
                                                <p className="font-medium text-slate-800">{clinic.adminEmail}</p>
                                                {(clinic.phone || clinic.whatsapp) && (
                                                    <p className="text-teal-700 flex items-center gap-1 font-medium">
                                                        <Phone className="h-3 w-3" />
                                                        {clinic.phone || clinic.whatsapp}
                                                    </p>
                                                )}
                                                {(clinic.city || clinic.state) && (
                                                    <p className="text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {[clinic.city, clinic.state].filter(Boolean).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {clinic.createdAt ? format(new Date(clinic.createdAt), 'dd/MM/yyyy', { locale: es }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleQuickToggleStatus(clinic)}
                                                    disabled={processingId === clinic.id}
                                                    title={clinic.status === 'active' && clinic.subscriptionStatus !== 'inactive' ? 'Inactivar por falta de pago' : 'Activar clínica'}
                                                    className={
                                                        clinic.status === 'active' && clinic.subscriptionStatus !== 'inactive'
                                                            ? 'text-amber-700 border-amber-200 hover:bg-amber-50 h-8 px-2 text-xs'
                                                            : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8 px-2 text-xs'
                                                    }
                                                >
                                                    {processingId === clinic.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Power className="h-3.5 w-3.5 mr-1" />
                                                    )}
                                                    {clinic.status === 'active' && clinic.subscriptionStatus !== 'inactive' ? 'Inactivar' : 'Activar'}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Editar clínica"
                                                    onClick={() => {
                                                        setSelectedClinic(clinic);
                                                        setEditData({ ...clinic });
                                                        setIsEditing(true);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" title="Ver detalles" onClick={() => { setSelectedClinic(clinic); setIsEditing(false); }}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDeleteClinic(clinic)}
                                                    disabled={processingId === clinic.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Details/Edit Modal */}
            <Dialog open={!!selectedClinic} onOpenChange={(open) => { if (!open) { setSelectedClinic(null); setIsEditing(false); } }}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl">{selectedClinic?.name}</DialogTitle>
                                <DialogDescription>Información completa de la clínica o institución</DialogDescription>
                            </div>
                            {!isEditing ? (
                                <Button variant="outline" size="sm" onClick={handleEditClick}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancelar
                                    </Button>
                                    <Button size="sm" onClick={handleSaveEdit} disabled={!!processingId}>
                                        {processingId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        Guardar
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {selectedClinic && (
                        <ScrollArea className="max-h-[65vh] pr-4">
                            <Tabs defaultValue="general" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="general">General y Ubicación</TabsTrigger>
                                    <TabsTrigger value="contact">Contacto</TabsTrigger>
                                    <TabsTrigger value="config">Plan y Configuración</TabsTrigger>
                                </TabsList>

                                <TabsContent value="general" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nombre Comercial</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editData.name || ''}
                                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded">{selectedClinic.name}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>RIF / CUIT / Identificación Fiscal</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editData.rif || ''}
                                                    onChange={(e) => handleInputChange('rif', e.target.value)}
                                                    placeholder="Ej: J-12345678-9"
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded font-mono">{selectedClinic.rif || '-'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Razón Social / Nombre Legal</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editData.legalName || ''}
                                                    onChange={(e) => handleInputChange('legalName', e.target.value)}
                                                    placeholder="Razón social..."
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded">{selectedClinic.legalName || '-'}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Slug (URL Pública)</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editData.slug || ''}
                                                    onChange={(e) => handleInputChange('slug', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded font-mono">{selectedClinic.slug || '-'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Descripción</Label>
                                        {isEditing ? (
                                            <Textarea
                                                value={editData.description || ''}
                                                onChange={(e) => handleInputChange('description', e.target.value)}
                                                rows={3}
                                            />
                                        ) : (
                                            <p className="text-sm p-2 bg-muted rounded min-h-[60px]">{selectedClinic.description || 'Sin descripción'}</p>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="border-t pt-3">
                                            <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Ubicación Geográfica</Label>
                                            <LocationSelector
                                                country={editData.country || selectedClinic.country || 'VE'}
                                                state={editData.state || selectedClinic.state || ''}
                                                city={editData.city || selectedClinic.city || ''}
                                                sector={editData.sector || selectedClinic.sector || ''}
                                                address={editData.address || selectedClinic.address || ''}
                                                onLocationChange={(loc: LocationData) => {
                                                    setEditData(prev => ({
                                                        ...prev,
                                                        country: loc.country,
                                                        state: loc.state,
                                                        city: loc.city,
                                                        sector: loc.sector,
                                                        address: loc.address,
                                                    }));
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>País / Estado / Ciudad / Sector</Label>
                                                <p className="text-sm p-2 bg-muted rounded">
                                                    {[selectedClinic.country, selectedClinic.state, selectedClinic.city, selectedClinic.sector].filter(Boolean).join(' • ') || '-'}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Dirección</Label>
                                                <p className="text-sm p-2 bg-muted rounded">{selectedClinic.address || '-'}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>ID del Sistema</Label>
                                        <p className="text-xs p-2 bg-muted rounded font-mono text-muted-foreground">{selectedClinic.id}</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="contact" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Email Administrador</Label>
                                            {isEditing ? (
                                                <Input
                                                    type="email"
                                                    value={editData.adminEmail || ''}
                                                    onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded">{selectedClinic.adminEmail}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email Público</Label>
                                            {isEditing ? (
                                                <Input
                                                    type="email"
                                                    value={editData.email || ''}
                                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded">{selectedClinic.email || '-'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Teléfono Principal</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editData.phone || ''}
                                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded">{selectedClinic.phone || '-'}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>WhatsApp</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editData.whatsapp || ''}
                                                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded">{selectedClinic.whatsapp || '-'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Sitio Web</Label>
                                        {isEditing ? (
                                            <Input
                                                type="url"
                                                value={editData.website || ''}
                                                onChange={(e) => handleInputChange('website', e.target.value)}
                                            />
                                        ) : (
                                            <p className="text-sm p-2 bg-muted rounded">{selectedClinic.website || '-'}</p>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="config" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tipo / Plan</Label>
                                            {isEditing ? (
                                                <Select
                                                    value={editData.plan || 'integral'}
                                                    onValueChange={(value) => {
                                                        handleInputChange('plan', value);
                                                        if (value === 'hospital_gratuito') {
                                                            handleInputChange('billingCycle', 'free');
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="hospital_gratuito">🏥 Hospital / Centro Gratuito (100% Gratis)</SelectItem>
                                                        <SelectItem value="integral">Clínica - Integral</SelectItem>
                                                        <SelectItem value="esencial">Clínica - Esencial</SelectItem>
                                                        <SelectItem value="profesional">Clínica - Profesional</SelectItem>
                                                        <SelectItem value="empresarial">Clínica - Empresarial</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge variant="outline" className="uppercase">
                                                    {selectedClinic.plan === 'hospital_gratuito' ? '🏥 Hospital Gratuito' : (selectedClinic.plan || 'Integral')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Duración del Plan (Meses)</Label>
                                            {isEditing ? (
                                                <Select
                                                    value={String(editData.billingMonths || (editData.billingCycle === 'annual' ? 12 : 1))}
                                                    onValueChange={(value) => {
                                                        const m = Number(value);
                                                        setEditData(prev => ({
                                                            ...prev,
                                                            billingMonths: m,
                                                            billingCycle: m === 12 ? 'annual' : 'monthly',
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1">1 Mes (Mensual)</SelectItem>
                                                        <SelectItem value="3">3 Meses (Trimestral)</SelectItem>
                                                        <SelectItem value="6">6 Meses (Semestral)</SelectItem>
                                                        <SelectItem value="12">12 Meses (Anual)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded">
                                                    {selectedClinic.plan === 'hospital_gratuito'
                                                        ? 'Exento ($0)'
                                                        : `${selectedClinic.billingMonths || (selectedClinic.billingCycle === 'annual' ? 12 : 1)} ${(selectedClinic.billingMonths || 1) === 1 ? 'Mes' : 'Meses'}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Estado de Suscripción</Label>
                                            {isEditing ? (
                                                <Select
                                                    value={editData.subscriptionStatus || 'active'}
                                                    onValueChange={(value: any) => {
                                                        setEditData(prev => ({
                                                            ...prev,
                                                            subscriptionStatus: value,
                                                            status: value === 'inactive' ? 'inactive' : 'active',
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Activa / Al día</SelectItem>
                                                        <SelectItem value="pending_payment">Pago en Revisión</SelectItem>
                                                        <SelectItem value="inactive">Vencida / Inactiva (Oculta tarjeta)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge className={selectedClinic.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                                                    {selectedClinic.subscriptionStatus === 'active' ? 'Suscripción Activa' : selectedClinic.subscriptionStatus === 'pending_payment' ? 'Pago en Revisión' : 'Suscripción Inactiva'}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Monto de Suscripción ($ USD)</Label>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={editData.subscriptionFee ?? 0}
                                                    onChange={(e) => setEditData(prev => ({ ...prev, subscriptionFee: Number(e.target.value) || 0 }))}
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded font-mono">${selectedClinic.subscriptionFee || 0} USD</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Estado de Cuenta (Visibilidad en Buscador)</Label>
                                            {isEditing ? (
                                                <Select
                                                    value={editData.status || 'inactive'}
                                                    onValueChange={(value: any) => {
                                                        setEditData(prev => ({
                                                            ...prev,
                                                            status: value,
                                                            subscriptionStatus: value === 'inactive' ? 'inactive' : (prev.subscriptionStatus === 'inactive' ? 'active' : prev.subscriptionStatus || 'active'),
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Activa (Visible en Buscador)</SelectItem>
                                                        <SelectItem value="inactive">Inactiva (Oculta por Falta de Pago)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge className={selectedClinic.status === 'active' && selectedClinic.subscriptionStatus !== 'inactive' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                    {selectedClinic.status === 'active' && selectedClinic.subscriptionStatus !== 'inactive' ? 'Activa' : 'Inactiva'}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Verificación</Label>
                                            {isEditing ? (
                                                <Select
                                                    value={editData.verificationStatus || 'pending'}
                                                    onValueChange={(value) => handleInputChange('verificationStatus', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pendiente</SelectItem>
                                                        <SelectItem value="verified">Verificada</SelectItem>
                                                        <SelectItem value="rejected">Rechazada</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge variant="outline" className={
                                                    selectedClinic.verificationStatus === 'verified' ? 'border-green-500 text-green-600' :
                                                        selectedClinic.verificationStatus === 'rejected' ? 'border-red-500 text-red-600' :
                                                            'border-orange-500 text-orange-600'
                                                }>
                                                    {selectedClinic.verificationStatus === 'verified' ? 'Verificada' :
                                                        selectedClinic.verificationStatus === 'rejected' ? 'Rechazada' : 'Pendiente'}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Password Change Section */}
                                    {isEditing && (
                                        <div className="space-y-2 pt-4 border-t">
                                            <Label className="flex items-center gap-2">
                                                <KeyRound className="h-4 w-4" />
                                                Nueva Contraseña (opcional)
                                            </Label>
                                            <Input
                                                type="password"
                                                placeholder="Dejar en blanco para no cambiar"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">Solo ingresa una contraseña si deseas cambiarla.</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            {/* Quick Actions */}
                            {!isEditing && (
                                <div className="flex justify-between items-center pt-4 mt-4 border-t gap-2">
                                    {selectedClinic.status !== 'active' || selectedClinic.subscriptionStatus === 'inactive' ? (
                                        <Button
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleUpdateStatus(selectedClinic, 'active', 'verified')}
                                            disabled={!!processingId}
                                        >
                                            {processingId === selectedClinic.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                            Activar Clínica (Mostrar en Buscador)
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
                                            onClick={() => handleUpdateStatus(selectedClinic, 'inactive', 'verified')}
                                            disabled={!!processingId}
                                        >
                                            {processingId === selectedClinic.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                            Cambiar a Inactiva (Ocultar por falta de pago)
                                        </Button>
                                    )}
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleDeleteClinic(selectedClinic)}
                                        disabled={!!processingId}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar Clínica
                                    </Button>
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal para crear clínica nueva */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-teal-600" />
                            Registrar Nueva Clínica o Hospital
                        </DialogTitle>
                        <DialogDescription>
                            Completa los datos fiscales, de contacto, ubicación geográfica y plan en meses para crear la cuenta institucional.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-2">
                        {/* Datos de Identificación */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre de la Clínica / Hospital *</Label>
                                <Input
                                    value={newClinicData.name}
                                    onChange={(e) => setNewClinicData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ej: Clínica Santa Sofía / Hospital Central"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>RIF / CUIT / Identificación Fiscal</Label>
                                <Input
                                    value={newClinicData.rif}
                                    onChange={(e) => setNewClinicData(prev => ({ ...prev, rif: e.target.value }))}
                                    placeholder="Ej: J-12345678-9"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Razón Social / Nombre Legal (Opcional)</Label>
                                <Input
                                    value={newClinicData.legalName}
                                    onChange={(e) => setNewClinicData(prev => ({ ...prev, legalName: e.target.value }))}
                                    placeholder="Ej: Centro Clínico Santa Sofía C.A."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Sitio Web (Opcional)</Label>
                                <Input
                                    value={newClinicData.website}
                                    onChange={(e) => setNewClinicData(prev => ({ ...prev, website: e.target.value }))}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {/* Credenciales de Acceso y Contacto */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                            <div className="space-y-2">
                                <Label>Email Administrador (Inicio de Sesión) *</Label>
                                <Input
                                    type="email"
                                    value={newClinicData.adminEmail}
                                    onChange={(e) => setNewClinicData(prev => ({ ...prev, adminEmail: e.target.value }))}
                                    placeholder="admin@clinica.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Contraseña de Acceso *</Label>
                                <Input
                                    type="password"
                                    value={newClinicData.password}
                                    onChange={(e) => setNewClinicData(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="Mínimo 8 caracteres"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Teléfono de Contacto *</Label>
                                <Input
                                    value={newClinicData.phone}
                                    onChange={(e) => setNewClinicData(prev => ({
                                        ...prev,
                                        phone: e.target.value,
                                        whatsapp: prev.whatsapp || e.target.value,
                                    }))}
                                    placeholder="+58 414 123-4567"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>WhatsApp de Atención</Label>
                                <Input
                                    value={newClinicData.whatsapp}
                                    onChange={(e) => setNewClinicData(prev => ({ ...prev, whatsapp: e.target.value }))}
                                    placeholder="+58 414 123-4567"
                                />
                            </div>
                        </div>

                        {/* Ubicación Geográfica Completa */}
                        <div className="pt-2 border-t space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Ubicación Geográfica de la Sede Principal
                            </Label>
                            <LocationSelector
                                country={newClinicData.country}
                                state={newClinicData.state}
                                city={newClinicData.city}
                                sector={newClinicData.sector}
                                address={newClinicData.address}
                                onLocationChange={(loc: LocationData) => {
                                    setNewClinicData(prev => ({
                                        ...prev,
                                        country: loc.country || 'VE',
                                        state: loc.state || '',
                                        city: loc.city || '',
                                        sector: loc.sector || '',
                                        address: loc.address || '',
                                    }));
                                }}
                            />
                        </div>

                        {/* Plan y Meses de Suscripción */}
                        <div className="pt-2 border-t space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Configuración de Plan y Meses de Pago
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo de Institución / Plan *</Label>
                                    <Select
                                        value={newClinicData.plan}
                                        onValueChange={(value) => setNewClinicData(prev => ({
                                            ...prev,
                                            plan: value,
                                            billingCycle: value === 'hospital_gratuito' ? 'free' : (prev.billingMonths === 12 ? 'annual' : 'monthly'),
                                        }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="integral">🏢 Clínica Privada - Plan Integral</SelectItem>
                                            <SelectItem value="esencial">🏢 Clínica Privada - Plan Esencial</SelectItem>
                                            <SelectItem value="profesional">🏢 Clínica Privada - Plan Profesional</SelectItem>
                                            <SelectItem value="empresarial">🏢 Clínica Privada - Plan Empresarial</SelectItem>
                                            <SelectItem value="hospital_gratuito">🏥 Hospital / Centro Gratuito (100% Gratis)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {newClinicData.plan !== 'hospital_gratuito' ? (
                                    <div className="space-y-2">
                                        <Label>Plan de Pago en Meses *</Label>
                                        <Select
                                            value={String(newClinicData.billingMonths)}
                                            onValueChange={(value) => {
                                                const m = Number(value);
                                                setNewClinicData(prev => ({
                                                    ...prev,
                                                    billingMonths: m,
                                                    billingCycle: m === 12 ? 'annual' : 'monthly',
                                                }));
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">1 Mes (Mensual)</SelectItem>
                                                <SelectItem value="3">3 Meses (Trimestral)</SelectItem>
                                                <SelectItem value="6">6 Meses (Semestral)</SelectItem>
                                                <SelectItem value="12">12 Meses (1 Año)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Facturación</Label>
                                        <div className="h-10 px-3 flex items-center rounded-md border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-800">
                                            Exento de Mensualidad ($0)
                                        </div>
                                    </div>
                                )}
                            </div>

                            {newClinicData.plan !== 'hospital_gratuito' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Estado Inicial de Suscripción</Label>
                                        <Select
                                            value={newClinicData.subscriptionStatus}
                                            onValueChange={(value: any) => setNewClinicData(prev => ({ ...prev, subscriptionStatus: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Activa (Habilitada inmediatamente)</SelectItem>
                                                <SelectItem value="pending_payment">Pendiente de Pago</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Monto Acordado del Plan ($ USD)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newClinicData.subscriptionFee}
                                            onChange={(e) => setNewClinicData(prev => ({ ...prev, subscriptionFee: Number(e.target.value) || 0 }))}
                                            placeholder="Ej: 50.00"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción / Especialidades Principales</Label>
                            <Textarea
                                value={newClinicData.description}
                                onChange={(e) => setNewClinicData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descripción de la clínica u hospital, servicios que ofrece..."
                                rows={2}
                            />
                        </div>

                        {newClinicData.plan === 'hospital_gratuito' && (
                            <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-1">
                                <p className="font-bold">🏥 Modalidad Hospital / Centro Gratuito:</p>
                                <p>Esta cuenta tendrá el mismo panel operativo de una clínica, pero sin cobro de mensualidad a SUMA y todos sus servicios/consultas para los pacientes serán 100% gratuitos ($0).</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isCreating}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateClinic} disabled={isCreating} className="bg-teal-600 hover:bg-teal-700 text-white">
                            {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            {newClinicData.plan === 'hospital_gratuito' ? 'Crear Hospital Gratuito' : 'Registrar Clínica'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

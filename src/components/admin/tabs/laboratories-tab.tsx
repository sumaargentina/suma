"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
    getLaboratories, 
    addLaboratory, 
    updateLaboratory, 
    deleteLaboratory,
    getLaboratoryServices
} from '@/lib/supabaseService';
import type { Laboratory, LaboratoryService } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    CheckCircle, 
    XCircle, 
    Eye, 
    FlaskConical, 
    Pencil, 
    Trash2,
    KeyRound, 
    Plus, 
    Search, 
    Building2, 
    Phone, 
    Mail, 
    MapPin, 
    Clock, 
    ShieldCheck, 
    DollarSign,
    Activity,
    FileText
} from 'lucide-react';
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
    DialogFooter
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

export function LaboratoriesTab() {
    const { toast } = useToast();
    const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cityFilter, setCityFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // Services Inspection Modal
    const [showServicesModal, setShowServicesModal] = useState(false);
    const [labServices, setLabServices] = useState<LaboratoryService[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [activeLabForServices, setActiveLabForServices] = useState<Laboratory | null>(null);

    // Delete Modal
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [labToDelete, setLabToDelete] = useState<Laboratory | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Create Form
    const [createForm, setCreateForm] = useState({
        name: '',
        adminEmail: '',
        password: '',
        phone: '',
        whatsapp: '',
        city: 'Maturín',
        state: 'Monagas',
        address: '',
        description: '',
        plan: 'integral',
        billingCycle: 'monthly',
        logoUrl: '',
        bannerImage: '',
    });

    // Edit Form
    const [editForm, setEditForm] = useState<Partial<Laboratory>>({});

    const loadLaboratories = async () => {
        try {
            setLoading(true);
            const data = await getLaboratories();
            setLaboratories(data);
        } catch (error: any) {
            console.error('Error loading laboratories:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudieron cargar los laboratorios clínicos.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLaboratories();
    }, []);

    // Filtered labs
    const filteredLabs = useMemo(() => {
        return laboratories.filter((lab) => {
            const matchesSearch = 
                (lab.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (lab.adminEmail || lab.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (lab.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (lab.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCity = cityFilter === 'ALL' || lab.city === cityFilter;
            const matchesStatus = statusFilter === 'ALL' || lab.status === statusFilter;

            return matchesSearch && matchesCity && matchesStatus;
        });
    }, [laboratories, searchTerm, cityFilter, statusFilter]);

    // Unique cities
    const uniqueCities = useMemo(() => {
        const set = new Set<string>();
        laboratories.forEach((lab) => {
            if (lab.city) set.add(lab.city);
        });
        return Array.from(set).sort();
    }, [laboratories]);

    // Handle Create Laboratory
    const handleCreateLaboratory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.name || !createForm.adminEmail || !createForm.password) {
            toast({
                variant: 'destructive',
                title: 'Campos requeridos',
                description: 'Por favor completa el nombre, correo de acceso y contraseña.'
            });
            return;
        }

        try {
            setIsCreating(true);
            await addLaboratory({
                name: createForm.name,
                adminEmail: createForm.adminEmail,
                password: createForm.password,
                phone: createForm.phone,
                whatsapp: createForm.whatsapp || createForm.phone,
                city: createForm.city,
                state: createForm.state,
                address: createForm.address,
                description: createForm.description,
                plan: createForm.plan as any,
                billingCycle: createForm.billingCycle as any,
                logoUrl: createForm.logoUrl || undefined,
                bannerImage: createForm.bannerImage || undefined,
                status: 'active',
                verificationStatus: 'verified',
            });

            toast({
                title: 'Laboratorio Registrado',
                description: `El laboratorio "${createForm.name}" ha sido creado con éxito.`
            });

            setShowCreateModal(false);
            setCreateForm({
                name: '',
                adminEmail: '',
                password: '',
                phone: '',
                whatsapp: '',
                city: 'Maturín',
                state: 'Monagas',
                address: '',
                description: '',
                plan: 'integral',
                billingCycle: 'monthly',
                logoUrl: '',
                bannerImage: '',
            });
            await loadLaboratories();
        } catch (error: any) {
            console.error('Error creating laboratory:', error);
            toast({
                variant: 'destructive',
                title: 'Error al registrar',
                description: error.message || 'No se pudo crear el laboratorio.'
            });
        } finally {
            setIsCreating(false);
        }
    };

    // Open Edit Modal
    const handleOpenEdit = (lab: Laboratory) => {
        setSelectedLab(lab);
        setEditForm({
            name: lab.name,
            adminEmail: lab.adminEmail || lab.email,
            phone: lab.phone || '',
            whatsapp: lab.whatsapp || '',
            city: lab.city || '',
            state: lab.state || '',
            address: lab.address || '',
            description: lab.description || '',
            plan: lab.plan || 'integral',
            billingCycle: lab.billingCycle || 'monthly',
            status: lab.status || 'active',
            verificationStatus: lab.verificationStatus || 'verified',
            logoUrl: lab.logoUrl || '',
            bannerImage: lab.bannerImage || '',
        });
        setNewPassword('');
        setIsEditing(true);
    };

    // Save Edit
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLab) return;

        try {
            setIsUpdating(true);
            const updates: Partial<Laboratory> = {
                ...editForm,
            };
            if (newPassword && newPassword.trim()) {
                updates.password = newPassword.trim();
            }

            await updateLaboratory(selectedLab.id, updates);

            toast({
                title: 'Laboratorio Actualizado',
                description: 'Los datos del laboratorio han sido actualizados con éxito.'
            });

            setIsEditing(false);
            setSelectedLab(null);
            await loadLaboratories();
        } catch (error: any) {
            console.error('Error updating laboratory:', error);
            toast({
                variant: 'destructive',
                title: 'Error al actualizar',
                description: error.message || 'No se pudo actualizar el laboratorio.'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    // Toggle Status
    const handleToggleStatus = async (lab: Laboratory) => {
        const nextStatus = lab.status === 'active' ? 'inactive' : 'active';
        try {
            await updateLaboratory(lab.id, { status: nextStatus });
            toast({
                title: nextStatus === 'active' ? 'Laboratorio Activado' : 'Laboratorio Desactivado',
                description: `El estado del laboratorio ha cambiado a ${nextStatus}.`
            });
            await loadLaboratories();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo cambiar el estado.'
            });
        }
    };

    // Open Services Inspection
    const handleInspectServices = async (lab: Laboratory) => {
        setActiveLabForServices(lab);
        setShowServicesModal(true);
        try {
            setLoadingServices(true);
            const data = await getLaboratoryServices(lab.id);
            setLabServices(data);
        } catch (error) {
            console.error('Error loading lab services:', error);
        } finally {
            setLoadingServices(false);
        }
    };

    // Delete Laboratory
    const handleDeleteLab = async () => {
        if (!labToDelete) return;
        try {
            setIsDeleting(true);
            await deleteLaboratory(labToDelete.id);
            toast({
                title: 'Laboratorio Eliminado',
                description: 'El laboratorio ha sido retirado del sistema.'
            });
            setIsDeleteDialogOpen(false);
            setLabToDelete(null);
            await loadLaboratories();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error al eliminar',
                description: error.message || 'No se pudo eliminar el laboratorio.'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <FlaskConical className="h-6 w-6 text-teal-600" />
                        Laboratorios Clínicos y Diagnósticos
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Administra los laboratorios del sistema, gestiona sus credenciales y supervisa su catálogo de pruebas.
                    </p>
                </div>
                <Button 
                    onClick={() => setShowCreateModal(true)} 
                    className="bg-teal-600 hover:bg-teal-700 text-white shadow-md gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Registrar Laboratorio
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-teal-100 bg-teal-50/30">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                            <FlaskConical className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Laboratorios</p>
                            <h3 className="text-2xl font-bold text-teal-900">{laboratories.length}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-emerald-100 bg-emerald-50/30">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Activos</p>
                            <h3 className="text-2xl font-bold text-emerald-900">
                                {laboratories.filter(l => l.status === 'active').length}
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 bg-slate-50/30">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ciudades con Cobertura</p>
                            <h3 className="text-2xl font-bold text-slate-900">{uniqueCities.length}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar por nombre, correo o teléfono..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={cityFilter} onValueChange={setCityFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Ciudad" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas las ciudades</SelectItem>
                                {uniqueCities.map(city => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los estados</SelectItem>
                                <SelectItem value="active">Activos</SelectItem>
                                <SelectItem value="inactive">Inactivos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Laboratories Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                            <p>Cargando laboratorios registrados...</p>
                        </div>
                    ) : filteredLabs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
                            <FlaskConical className="h-12 w-12 text-slate-300" />
                            <h3 className="text-lg font-semibold text-slate-700">No se encontraron laboratorios</h3>
                            <p className="text-sm max-w-sm">
                                {searchTerm || cityFilter !== 'ALL' || statusFilter !== 'ALL'
                                    ? 'Prueba cambiando los filtros de búsqueda.'
                                    : 'Aún no se ha registrado ningún laboratorio. Haz clic en "Registrar Laboratorio" para comenzar.'}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50">
                                    <TableHead>Laboratorio</TableHead>
                                    <TableHead>Contacto / Acceso</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLabs.map((lab) => (
                                    <TableRow key={lab.id} className="hover:bg-slate-50/60 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl overflow-hidden bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                                                    {lab.logoUrl ? (
                                                        <img src={lab.logoUrl} alt={lab.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <FlaskConical className="h-5 w-5 text-teal-600" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 truncate">{lab.name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{lab.slug}</p>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="space-y-0.5 text-xs">
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    <span>{lab.adminEmail || lab.email}</span>
                                                </div>
                                                {lab.phone && (
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                                        <span>{lab.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs text-slate-700">
                                                <p className="font-medium">{lab.city || 'No definida'}</p>
                                                <p className="text-muted-foreground truncate max-w-[180px]">{lab.address || '-'}</p>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline" className="capitalize text-xs font-normal border-teal-200 text-teal-800 bg-teal-50">
                                                {lab.plan || 'Integral'}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            {lab.status === 'active' ? (
                                                <Badge className="bg-emerald-100 text-emerald-800 border-0 shadow-none font-medium text-xs">
                                                    Activo
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0 font-medium text-xs">
                                                    Inactivo
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Ver Pruebas y Servicios"
                                                    className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                                    onClick={() => handleInspectServices(lab)}
                                                >
                                                    <Activity className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Editar Laboratorio"
                                                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                                                    onClick={() => handleOpenEdit(lab)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title={lab.status === 'active' ? 'Desactivar' : 'Activar'}
                                                    className={`h-8 w-8 p-0 ${lab.status === 'active' ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
                                                    onClick={() => handleToggleStatus(lab)}
                                                >
                                                    {lab.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Eliminar Laboratorio"
                                                    className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                    onClick={() => {
                                                        setLabToDelete(lab);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Modal: Registrar Nuevo Laboratorio */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <FlaskConical className="h-5 w-5 text-teal-600" />
                            Registrar Nuevo Laboratorio
                        </DialogTitle>
                        <DialogDescription>
                            El laboratorio se registrará como usuario en la plataforma. Solo el administrador puede darlo de alta en esta etapa.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateLaboratory} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="lab-name">Nombre del Laboratorio *</Label>
                                <Input
                                    id="lab-name"
                                    placeholder="Ej. Laboratorio Clínico Central"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-email">Correo Administrador (Login) *</Label>
                                <Input
                                    id="lab-email"
                                    type="email"
                                    placeholder="admin@laboratorio.com"
                                    value={createForm.adminEmail}
                                    onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-password">Contraseña de Acceso *</Label>
                                <Input
                                    id="lab-password"
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-phone">Teléfono de Contacto</Label>
                                <Input
                                    id="lab-phone"
                                    placeholder="+58 414 1234567"
                                    value={createForm.phone}
                                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-whatsapp">WhatsApp para Notificaciones</Label>
                                <Input
                                    id="lab-whatsapp"
                                    placeholder="+58 424 1234567"
                                    value={createForm.whatsapp}
                                    onChange={(e) => setCreateForm({ ...createForm, whatsapp: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-city">Ciudad</Label>
                                <Input
                                    id="lab-city"
                                    placeholder="Maturín"
                                    value={createForm.city}
                                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-state">Estado / Provincia</Label>
                                <Input
                                    id="lab-state"
                                    placeholder="Monagas"
                                    value={createForm.state}
                                    onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="lab-address">Dirección Física</Label>
                                <Input
                                    id="lab-address"
                                    placeholder="Av. Principal, Edificio Médico, Nivel PB"
                                    value={createForm.address}
                                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="lab-desc">Descripción o Servicios Destacados</Label>
                                <Textarea
                                    id="lab-desc"
                                    placeholder="Especialistas en pruebas de rutina, microbiología, perfiles hormonales y exámenes especiales..."
                                    rows={2}
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-plan">Plan de Plataforma</Label>
                                <Select 
                                    value={createForm.plan} 
                                    onValueChange={(val) => setCreateForm({ ...createForm, plan: val })}
                                >
                                    <SelectTrigger id="lab-plan">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="esencial">Esencial</SelectItem>
                                        <SelectItem value="profesional">Profesional</SelectItem>
                                        <SelectItem value="integral">Integral (Recomendado)</SelectItem>
                                        <SelectItem value="empresarial">Empresarial</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-billing">Ciclo de Facturación</Label>
                                <Select 
                                    value={createForm.billingCycle} 
                                    onValueChange={(val) => setCreateForm({ ...createForm, billingCycle: val })}
                                >
                                    <SelectTrigger id="lab-billing">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Mensual</SelectItem>
                                        <SelectItem value="annual">Anual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setShowCreateModal(false)}
                                disabled={isCreating}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                                disabled={isCreating}
                            >
                                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                                Crear Laboratorio
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Editar Laboratorio */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Pencil className="h-5 w-5 text-teal-600" />
                            Editar Laboratorio: {selectedLab?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Modifica los datos administrativos y la configuración del laboratorio.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="edit-name">Nombre del Laboratorio</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Correo Administrador</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editForm.adminEmail || ''}
                                    onChange={(e) => setEditForm({ ...editForm, adminEmail: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-password">Nueva Contraseña (Opcional)</Label>
                                <Input
                                    id="edit-password"
                                    type="password"
                                    placeholder="Dejar en blanco para mantener"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">Teléfono</Label>
                                <Input
                                    id="edit-phone"
                                    value={editForm.phone || ''}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                                <Input
                                    id="edit-whatsapp"
                                    value={editForm.whatsapp || ''}
                                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-city">Ciudad</Label>
                                <Input
                                    id="edit-city"
                                    value={editForm.city || ''}
                                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-state">Estado</Label>
                                <Input
                                    id="edit-state"
                                    value={editForm.state || ''}
                                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="edit-address">Dirección Física</Label>
                                <Input
                                    id="edit-address"
                                    value={editForm.address || ''}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="edit-description">Descripción</Label>
                                <Textarea
                                    id="edit-description"
                                    rows={2}
                                    value={editForm.description || ''}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-status">Estado</Label>
                                <Select 
                                    value={editForm.status || 'active'} 
                                    onValueChange={(val: any) => setEditForm({ ...editForm, status: val })}
                                >
                                    <SelectTrigger id="edit-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Activo</SelectItem>
                                        <SelectItem value="inactive">Inactivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-plan">Plan</Label>
                                <Select 
                                    value={editForm.plan || 'integral'} 
                                    onValueChange={(val: any) => setEditForm({ ...editForm, plan: val })}
                                >
                                    <SelectTrigger id="edit-plan">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="esencial">Esencial</SelectItem>
                                        <SelectItem value="profesional">Profesional</SelectItem>
                                        <SelectItem value="integral">Integral</SelectItem>
                                        <SelectItem value="empresarial">Empresarial</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsEditing(false)}
                                disabled={isUpdating}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                                disabled={isUpdating}
                            >
                                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                                Guardar Cambios
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Ver Servicios de Laboratorio */}
            <Dialog open={showServicesModal} onOpenChange={setShowServicesModal}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-teal-600" />
                            Pruebas y Exámenes: {activeLabForServices?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Catálogo de servicios y análisis registrados por este laboratorio.
                        </DialogDescription>
                    </DialogHeader>

                    {loadingServices ? (
                        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                            <p className="text-sm">Cargando catálogo...</p>
                        </div>
                    ) : labServices.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground space-y-2">
                            <FileText className="h-10 w-10 mx-auto text-slate-300" />
                            <p className="text-sm">Este laboratorio aún no ha registrado pruebas en su catálogo.</p>
                        </div>
                    ) : (
                        <div className="divide-y rounded-lg border">
                            {labServices.map((svc) => (
                                <div key={svc.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-slate-900">{svc.name}</span>
                                            {svc.serviceCategory && (
                                                <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">
                                                    {svc.serviceCategory}
                                                </Badge>
                                            )}
                                            {!svc.isActive && (
                                                <Badge variant="outline" className="text-[10px] text-slate-500">Inactivo</Badge>
                                            )}
                                        </div>
                                        {svc.preparationInstructions && (
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                Prep: {svc.preparationInstructions}
                                            </p>
                                        )}
                                        {svc.resultsDeliveryTime && (
                                            <p className="text-xs text-teal-700 font-medium">
                                                Entrega: {svc.resultsDeliveryTime}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0 pl-4">
                                        <p className="text-base font-bold text-slate-900">${svc.price.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowServicesModal(false)}>
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Confirmar Eliminación */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar laboratorio?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el laboratorio "{labToDelete?.name}" y todos sus servicios asociados de forma permanente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteLab}
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

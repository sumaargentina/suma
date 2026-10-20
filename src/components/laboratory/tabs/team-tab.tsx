"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Secretary } from '@/lib/types';
import { getLaboratorySecretaries, addLaboratorySecretary, deleteLaboratorySecretary } from '@/lib/supabaseService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, User, Trash2, Mail, Shield, Phone, MapPin, FlaskConical, Calendar, FileText, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';

const AVAILABLE_PERMISSIONS = [
    { id: 'agenda', label: 'Citas y Toma de Muestras', icon: Calendar, description: 'Gestionar turnos de pacientes y recepción de muestras' },
    { id: 'results', label: 'Carga de Resultados', icon: FileText, description: 'Adjuntar informes y resultados de análisis' },
    { id: 'services', label: 'Catálogo de Análisis', icon: FlaskConical, description: 'Consultar precios y pruebas ofrecidas' },
    { id: 'patients', label: 'Directorio de Pacientes', icon: User, description: 'Ver fichas y datos de contacto de pacientes' },
    { id: 'chat', label: 'Mensajería / Chat', icon: MessageSquare, description: 'Atención directa y consultas con pacientes' },
];

export function LaboratoryTeamTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [secretaries, setSecretaries] = useState<Secretary[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        country: 'VE',
        state: '',
        city: '',
        sector: '',
        address: '',
        permissions: ['agenda', 'results', 'patients'] as string[]
    });

    const effectiveLabId = user?.role === 'secretary' ? (user.laboratoryId || user.id) : user?.id;

    useEffect(() => {
        if (effectiveLabId) {
            loadData();
        }
    }, [effectiveLabId]);

    const loadData = async () => {
        if (!effectiveLabId) return;
        try {
            setLoading(true);
            const data = await getLaboratorySecretaries(effectiveLabId);
            setSecretaries(data);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los miembros del equipo."
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionToggle = (permissionId: string) => {
        setFormData(prev => {
            const exists = prev.permissions.includes(permissionId);
            return {
                ...prev,
                permissions: exists
                    ? prev.permissions.filter(p => p !== permissionId)
                    : [...prev.permissions, permissionId]
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!effectiveLabId) return;

        if (formData.permissions.length === 0) {
            toast({
                variant: "destructive",
                title: "Permisos requeridos",
                description: "Selecciona al menos un permiso para el usuario."
            });
            return;
        }

        try {
            setIsSubmitting(true);
            await addLaboratorySecretary({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                laboratoryId: effectiveLabId,
                role: 'secretary',
                permissions: formData.permissions,
                phone: formData.phone,
                country: formData.country,
                state: formData.state,
                city: formData.city,
                sector: formData.sector,
                address: formData.address,
            });

            toast({
                title: "Personal registrado",
                description: "La cuenta de secretaría ha sido creada exitosamente."
            });
            setIsDialogOpen(false);
            setFormData({
                name: '',
                email: '',
                password: '',
                phone: '',
                country: 'VE',
                state: '',
                city: '',
                sector: '',
                address: '',
                permissions: ['agenda', 'results', 'patients']
            });
            loadData();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error al registrar secretaria";
            toast({
                variant: "destructive",
                title: "Error al registrar",
                description: message
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este miembro del equipo? Perderá el acceso de forma inmediata.')) return;

        try {
            await deleteLaboratorySecretary(id);
            toast({
                title: "Miembro eliminado",
                description: "El acceso ha sido revocado correctamente."
            });
            loadData();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "No se pudo eliminar al usuario";
            toast({
                variant: "destructive",
                title: "Error",
                description: message
            });
        }
    };

    const handleLocationChange = (data: LocationData) => {
        setFormData(prev => ({
            ...prev,
            country: data.country || 'VE',
            state: data.state || '',
            city: data.city || '',
            sector: data.sector || '',
            address: data.address || ''
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <User className="h-6 w-6 text-teal-600" />
                        Equipo y Secretarías del Laboratorio
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Gestiona el personal de recepción, secretarias y asistentes autorizados para operar la plataforma en tu laboratorio.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm">
                            <Plus className="h-4 w-4" />
                            Agregar Secretaria / Personal
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle className="text-xl flex items-center gap-2 text-teal-700 dark:text-teal-400">
                                    <Shield className="h-5 w-5" />
                                    Registrar Nueva Secretaria o Asistente
                                </DialogTitle>
                                <DialogDescription>
                                    Crea una cuenta para que un miembro del equipo gestione la recepción, muestras o entregas de tu laboratorio.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre Completo *</Label>
                                    <Input
                                        id="name"
                                        required
                                        placeholder="Ej: María Rodríguez"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Correo Electrónico *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            placeholder="maria@tudominio.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Contraseña de Acceso *</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            required
                                            minLength={6}
                                            placeholder="Mínimo 6 caracteres"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                                    <Input
                                        id="phone"
                                        placeholder="+58 412 1234567"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                <div className="pt-2 border-t">
                                    <Label className="font-semibold block mb-2">Ubicación y Domicilio (Opcional)</Label>
                                    <LocationSelector
                                        onLocationChange={handleLocationChange}
                                        country={formData.country}
                                        state={formData.state}
                                        city={formData.city}
                                        sector={formData.sector}
                                        address={formData.address}
                                    />
                                </div>

                                <div className="pt-2 border-t space-y-3">
                                    <Label className="font-semibold block">Permisos de Acceso Asignados *</Label>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {AVAILABLE_PERMISSIONS.map((perm) => {
                                            const PermIcon = perm.icon;
                                            const isChecked = formData.permissions.includes(perm.id);
                                            return (
                                                <div
                                                    key={perm.id}
                                                    onClick={() => handlePermissionToggle(perm.id)}
                                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                                        isChecked
                                                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
                                                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                                                    }`}
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={() => handlePermissionToggle(perm.id)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 font-medium text-sm text-slate-900 dark:text-slate-100">
                                                            <PermIcon className="h-4 w-4 text-teal-600" />
                                                            {perm.label}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
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
                                    Crear Cuenta
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                </div>
            ) : secretaries.length === 0 ? (
                <Card className="text-center py-12 border-dashed">
                    <CardContent className="space-y-4">
                        <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-teal-600">
                            <User className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">No hay personal administrativo registrado</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                Agrega recepcionistas y asistentes para que puedan gestionar la recepción de muestras y turnos sin compartir tu cuenta principal.
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsDialogOpen(true)}
                            variant="outline"
                            className="text-teal-600 border-teal-200 hover:bg-teal-50"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Primera Secretaria
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {secretaries.map((sec) => (
                        <Card key={sec.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
                            <CardHeader className="pb-3 pt-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                            {sec.name}
                                        </CardTitle>
                                        <Badge variant="secondary" className="bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-normal">
                                            Secretaria / Recepción
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 w-8"
                                        onClick={() => handleDelete(sec.id)}
                                        title="Eliminar acceso"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span className="truncate">{sec.email}</span>
                                </div>
                                {sec.phone && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                                        <span>{sec.phone}</span>
                                    </div>
                                )}
                                {(sec.city || sec.state) && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                                        <span className="truncate">{[sec.city, sec.state].filter(Boolean).join(', ')}</span>
                                    </div>
                                )}

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-xs text-muted-foreground mb-1.5 font-medium">Permisos asignados:</div>
                                    <div className="flex flex-wrap gap-1">
                                        {(sec.permissions || []).map((permId) => {
                                            const permDef = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
                                            return (
                                                <Badge
                                                    key={permId}
                                                    variant="outline"
                                                    className="text-xs border-teal-200 text-teal-800 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-950/40"
                                                >
                                                    {permDef?.label || permId}
                                                </Badge>
                                            );
                                        })}
                                        {(!sec.permissions || sec.permissions.length === 0) && (
                                            <span className="text-xs text-muted-foreground italic">Sin permisos específicos</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { ClinicBranch } from '@/lib/types';
import { getClinicBranches, addClinicBranch, updateClinicBranch, deleteClinicBranch } from '@/lib/supabaseService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, MapPin, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';

export function BranchesTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [branches, setBranches] = useState<ClinicBranch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingBranch, setEditingBranch] = useState<ClinicBranch | null>(null);

    const [formData, setFormData] = useState<{
        name: string;
        country: string;
        state: string;
        city: string;
        sector: string;
        address: string;
        phone: string;
        location: string;
    }>({
        name: '',
        country: 'VE',
        state: 'Monagas',
        city: 'Maturín',
        sector: '',
        address: '',
        phone: '',
        location: '',
    });

    useEffect(() => {
        if (user?.id) {
            loadBranches();
        }
    }, [user?.id]);

    const loadBranches = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const data = await getClinicBranches(user.id);
            setBranches(data);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las sedes." });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            country: 'VE',
            state: 'Monagas',
            city: 'Maturín',
            sector: '',
            address: '',
            phone: '',
            location: '',
        });
        setEditingBranch(null);
    };

    const handleOpenDialog = (branch?: ClinicBranch) => {
        if (branch) {
            setEditingBranch(branch);
            setFormData({
                name: branch.name,
                country: branch.country || 'VE',
                state: branch.state || '',
                city: branch.city || '',
                sector: branch.sector || '',
                address: branch.address || '',
                phone: branch.phone || '',
                location: typeof branch.location === 'string' ? branch.location : '',
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        try {
            setIsSubmitting(true);

            if (editingBranch) {
                await updateClinicBranch(editingBranch.id, { ...formData });
                toast({ title: "Sede actualizada", description: "Los cambios se guardaron correctamente." });
            } else {
                await addClinicBranch({
                    ...formData,
                    clinicId: user.id,
                    isActive: true
                });
                toast({ title: "Sede creada", description: "La nueva sede ha sido registrada." });
            }

            setIsDialogOpen(false);
            loadBranches();
            resetForm();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Ocurrió un error al guardar." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar la sede "${name}"? Esta acción no se puede deshacer.`)) return;

        try {
            await deleteClinicBranch(id);
            toast({ title: "Sede eliminada", description: "La sede ha sido eliminada correctamente." });
            loadBranches();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la sede." });
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Sedes</h2>
                    <p className="text-muted-foreground">Administra las sucursales de tu clínica.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Agregar Sede
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingBranch ? 'Editar Sede' : 'Nueva Sede'}</DialogTitle>
                            <DialogDescription>
                                {editingBranch ? 'Modifica los datos de la sucursal.' : 'Ingresa los datos para registrar una nueva sucursal.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la Sede</Label>
                                <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Sede Centro" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono de la Sede</Label>
                                <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Ej: +58 412 1234567" required />
                            </div>

                            <div className="border-t pt-3">
                                <h4 className="text-sm font-semibold mb-2">Ubicación y Dirección de la Sede</h4>
                                <LocationSelector
                                    country={formData.country}
                                    state={formData.state}
                                    city={formData.city}
                                    sector={formData.sector}
                                    address={formData.address}
                                    onLocationChange={(loc: LocationData) => setFormData(prev => ({
                                        ...prev,
                                        country: loc.country,
                                        state: loc.state,
                                        city: loc.city,
                                        sector: loc.sector || '',
                                        address: loc.address || '',
                                    }))}
                                />
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
                {branches.length === 0 ? (
                    <Card className="col-span-full border-dashed">
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <MapPin className="h-12 w-12 mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold">No hay sedes registradas</h3>
                            <p className="mb-4">Comienza registrando tu primera sucursal.</p>
                            <Button variant="outline" onClick={() => handleOpenDialog()}>Registrar Sede</Button>
                        </CardContent>
                    </Card>
                ) : (
                    branches.map((branch) => (
                        <Card key={branch.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex justify-between items-start">
                                    {branch.name}
                                    <Badge variant={branch.isActive ? "default" : "secondary"}>{branch.isActive ? "Activa" : "Inactiva"}</Badge>
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {branch.city}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <p className="font-medium">{branch.address}</p>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-4 w-4" /> {branch.phone}
                                </div>
                                <div className="flex gap-2 mt-4 pt-2 border-t">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(branch)}>
                                        <Pencil className="h-3 w-3 mr-2" /> Editar
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(branch.id, branch.name)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

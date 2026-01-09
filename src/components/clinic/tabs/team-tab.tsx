"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Secretary } from '@/lib/types';
import { getClinicSecretaries, addSecretary, deleteSecretary } from '@/lib/supabaseService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, User, Trash2, Mail, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { hashPassword } from '@/lib/password-utils';

export function TeamTab() {
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
    });

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id]);

    const loadData = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const data = await getClinicSecretaries(user.id);
            setSecretaries(data);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los secretarios." });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        try {
            setIsSubmitting(true);
            // Send plain password to API to create Supabase Auth user
            await addSecretary({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                clinicId: user.id,
                role: 'secretary',
                permissions: ['agenda', 'patients'], // Default permissions
            });

            toast({ title: "Secretaria registrada", description: "La cuenta ha sido creada exitosamente." });
            setIsDialogOpen(false);
            setFormData({ name: '', email: '', password: '' });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo registrar." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este acceso?')) return;
        try {
            await deleteSecretary(id);
            toast({ title: "Eliminado", description: "Acceso revocado correctamente." });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Equipo</h2>
                    <p className="text-muted-foreground">Administra el personal administrativo de la clínica.</p>
                </div>
                {secretaries.length >= 1 ? (
                    <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
                        <User className="mr-2 h-4 w-4" /> Límite de Personal Alcanzado
                    </Button>
                ) : (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Acceso
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Agregar Secretaria/o</DialogTitle>
                                <DialogDescription>
                                    Crea una cuenta para que tu personal pueda gestionar la agenda.
                                    <br /><span className="text-xs text-muted-foreground font-semibold">Límite: 1 secretaria.</span>
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre</Label>
                                    <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Crear Cuenta
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {secretaries.length === 0 ? (
                    <Card className="col-span-full border-dashed">
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <User className="h-12 w-12 mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold">Sin personal administrativo</h3>
                            <p>Agrega secretarias para que te ayuden con la agenda.</p>
                        </CardContent>
                    </Card>
                ) : (
                    secretaries.map((sec) => (
                        <Card key={sec.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{sec.name}</CardTitle>
                                    <Badge variant="outline">Secretaria</Badge>
                                </div>
                                <CardDescription className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> {sec.email}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                    <Shield className="h-4 w-4" /> Permisos: Agenda, Pacientes
                                </div>
                                <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDelete(sec.id)}>
                                    <Trash2 className="h-3 w-3 mr-2" /> Revocar Acceso
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

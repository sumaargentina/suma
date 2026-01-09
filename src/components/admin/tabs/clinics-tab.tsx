"use client";

import { useState, useEffect } from 'react';
import { getAdminClinics, updateClinicStatus } from '@/lib/supabaseService';
import { Clinic } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Eye, Building2 } from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ClinicsTab() {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadClinics = async () => {
        try {
            setLoading(true);
            // Assuming getAdminClinics is recently added to supabaseService
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

    const handleUpdateStatus = async (clinic: Clinic, newStatus: 'active' | 'inactive', verification: 'verified' | 'rejected') => {
        if (!confirm(`¿Estás seguro de cambiar el estado de ${clinic.name}?`)) return;

        setProcessingId(clinic.id);
        try {
            await updateClinicStatus(clinic.id, {
                status: newStatus,
                verificationStatus: verification
            });

            setClinics(prev => prev.map(c =>
                c.id === clinic.id
                    ? { ...c, status: newStatus, verificationStatus: verification }
                    : c
            ));

            toast({ title: 'Estado actualizado', description: `La clínica ahora está ${newStatus === 'active' ? 'activa' : 'inactiva'}.` });
            if (selectedClinic?.id === clinic.id) {
                setSelectedClinic(null);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.' });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Gestión de Clínicas ({clinics.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Email Admin</TableHead>
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
                                        <TableCell className="font-medium">{clinic.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="uppercase text-xs" style={{
                                                borderColor: clinic.plan === 'empresarial' ? 'purple' : clinic.plan === 'profesional' ? 'green' : 'blue',
                                                color: clinic.plan === 'empresarial' ? 'purple' : clinic.plan === 'profesional' ? 'green' : 'blue'
                                            }}>
                                                {clinic.plan || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge className={clinic.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                    {clinic.status === 'active' ? 'Activa' : 'Inactiva'}
                                                </Badge>
                                                {clinic.verificationStatus === 'pending' && (
                                                    <Badge variant="secondary" className="text-xs text-orange-600">Pendiente Verif.</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{clinic.adminEmail}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {clinic.createdAt ? format(new Date(clinic.createdAt), 'dd/MM/yyyy', { locale: es }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedClinic(clinic)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Details Modal */}
            <Dialog open={!!selectedClinic} onOpenChange={(open) => !open && setSelectedClinic(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedClinic?.name}</DialogTitle>
                        <DialogDescription>Detalles de la cuenta clínica</DialogDescription>
                    </DialogHeader>

                    {selectedClinic && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground font-semibold">Plan</p>
                                    <p className="uppercase">{selectedClinic.plan || 'Sin plan'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-semibold">Teléfono</p>
                                    <p>{selectedClinic.phone || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-muted-foreground font-semibold">Email Admin</p>
                                    <p>{selectedClinic.adminEmail}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-muted-foreground font-semibold">ID Sistema</p>
                                    <p className="font-mono text-xs">{selectedClinic.id}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t gap-2">
                                {selectedClinic.status !== 'active' ? (
                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        onClick={() => handleUpdateStatus(selectedClinic, 'active', 'verified')}
                                        disabled={!!processingId}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Aprobar y Activar
                                    </Button>
                                ) : (
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => handleUpdateStatus(selectedClinic, 'inactive', 'rejected')}
                                        disabled={!!processingId}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Suspender Cuenta
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

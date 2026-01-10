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
import { Loader2, CheckCircle, XCircle, Eye, Building2, Pencil, Save, X, KeyRound } from 'lucide-react';
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

export function ClinicsTab() {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Clinic>>({});
    const [newPassword, setNewPassword] = useState('');

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
                setSelectedClinic({ ...selectedClinic, status: newStatus, verificationStatus: verification });
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
                                            <Button variant="ghost" size="sm" onClick={() => { setSelectedClinic(clinic); setIsEditing(false); }}>
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

            {/* Details/Edit Modal */}
            <Dialog open={!!selectedClinic} onOpenChange={(open) => { if (!open) { setSelectedClinic(null); setIsEditing(false); } }}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl">{selectedClinic?.name}</DialogTitle>
                                <DialogDescription>Información completa de la clínica</DialogDescription>
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
                        <ScrollArea className="max-h-[60vh] pr-4">
                            <Tabs defaultValue="general" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="general">General</TabsTrigger>
                                    <TabsTrigger value="contact">Contacto</TabsTrigger>
                                    <TabsTrigger value="config">Configuración</TabsTrigger>
                                </TabsList>

                                <TabsContent value="general" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nombre</Label>
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
                                            <Label>Slug (URL)</Label>
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Dirección</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editData.address || ''}
                                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded">{selectedClinic.address || '-'}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ciudad</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={editData.city || ''}
                                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded">{selectedClinic.city || '-'}</p>
                                            )}
                                        </div>
                                    </div>

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
                                            <Label>Teléfono</Label>
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
                                            <Label>Plan</Label>
                                            {isEditing ? (
                                                <Select
                                                    value={editData.plan || 'esencial'}
                                                    onValueChange={(value) => handleInputChange('plan', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="esencial">Esencial</SelectItem>
                                                        <SelectItem value="profesional">Profesional</SelectItem>
                                                        <SelectItem value="empresarial">Empresarial</SelectItem>
                                                        <SelectItem value="integral">Integral</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge variant="outline" className="uppercase">{selectedClinic.plan || 'Sin plan'}</Badge>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ciclo de Facturación</Label>
                                            {isEditing ? (
                                                <Select
                                                    value={editData.billingCycle || 'monthly'}
                                                    onValueChange={(value) => handleInputChange('billingCycle', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="monthly">Mensual</SelectItem>
                                                        <SelectItem value="annual">Anual</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <p className="text-sm p-2 bg-muted rounded capitalize">{selectedClinic.billingCycle || 'Mensual'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Estado</Label>
                                            {isEditing ? (
                                                <Select
                                                    value={editData.status || 'inactive'}
                                                    onValueChange={(value) => handleInputChange('status', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Activa</SelectItem>
                                                        <SelectItem value="inactive">Inactiva</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge className={selectedClinic.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                    {selectedClinic.status === 'active' ? 'Activa' : 'Inactiva'}
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Calificación</Label>
                                            <p className="text-sm p-2 bg-muted rounded">{selectedClinic.rating?.toFixed(1) || '0.0'} ⭐</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Reseñas</Label>
                                            <p className="text-sm p-2 bg-muted rounded">{selectedClinic.reviewCount || 0}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Fecha de Registro</Label>
                                        <p className="text-sm p-2 bg-muted rounded">
                                            {selectedClinic.createdAt ? format(new Date(selectedClinic.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es }) : '-'}
                                        </p>
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
                                    {selectedClinic.status !== 'active' ? (
                                        <Button
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                            onClick={() => handleUpdateStatus(selectedClinic, 'active', 'verified')}
                                            disabled={!!processingId}
                                        >
                                            {processingId === selectedClinic.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                            Aprobar y Activar
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={() => handleUpdateStatus(selectedClinic, 'inactive', 'rejected')}
                                            disabled={!!processingId}
                                        >
                                            {processingId === selectedClinic.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                            Suspender Cuenta
                                        </Button>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

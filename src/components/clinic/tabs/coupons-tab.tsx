"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getClinic, updateClinic } from '@/lib/supabaseService';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, Ticket, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Coupon, Clinic } from '@/lib/types';
import { z } from 'zod';

const CouponFormSchema = z.object({
    code: z.string().min(3, "El código debe tener al menos 3 caracteres"),
    discountType: z.enum(['fixed', 'percentage']),
    value: z.number().positive("El valor debe ser positivo"),
});

export function CouponsTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            loadClinic();
        }
    }, [user]);

    const loadClinic = async () => {
        try {
            const data = await getClinic(user!.id);
            setClinic(data);
        } catch (error) {
            console.error('Error loading clinic:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la información de la clínica.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        const rawData = {
            code: formData.get('code') as string,
            discountType: formData.get('discountType') as 'percentage' | 'fixed',
            value: parseFloat(formData.get('value') as string)
        };

        const result = CouponFormSchema.safeParse(rawData);

        if (!result.success) {
            toast({ variant: 'destructive', title: 'Error', description: result.error.errors.map(e => e.message).join(' ') });
            setIsSubmitting(false);
            return;
        }

        try {
            const list = clinic?.coupons || [];
            let newList;

            if (editingCoupon) {
                // Edit existing
                newList = list.map(c => c.id === editingCoupon.id ? { ...c, ...result.data, code: result.data.code.toUpperCase() } : c);
            } else {
                // Add new
                // Check duplicate code
                if (list.some(c => c.code.toUpperCase() === result.data.code.toUpperCase())) {
                    throw new Error('Ya existe un cupón con este código.');
                }

                const newCoupon: Coupon = {
                    id: `coupon-${Date.now()}`,
                    ...result.data,
                    code: result.data.code.toUpperCase(),
                    discountValue: result.data.value,
                    description: '',
                    isActive: true,
                    validFrom: new Date().toISOString(),
                    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year default
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    scopeType: 'all',
                    clinicId: user!.id
                };
                newList = [...list, newCoupon];
            }

            await updateClinic(user!.id, { coupons: newList });
            setClinic(prev => prev ? { ...prev, coupons: newList } : null);
            toast({ title: editingCoupon ? 'Cupón actualizado' : 'Cupón creado' });
            setIsDialogOpen(false);
        } catch (error: any) {
            console.error('Error saving coupon:', error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo guardar el cupón.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este cupón?')) return;

        try {
            const list = clinic?.coupons || [];
            const newList = list.filter(c => c.id !== id);
            await updateClinic(user!.id, { coupons: newList });
            setClinic(prev => prev ? { ...prev, coupons: newList } : null);
            toast({ title: 'Cupón eliminado' });
        } catch (error) {
            console.error('Error deleting coupon:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el cupón.' });
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    const coupons = clinic?.coupons || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Cupones</h2>
                    <p className="text-muted-foreground">Gestiona descuentos para tus pacientes.</p>
                </div>
                <Button onClick={() => { setEditingCoupon(null); setIsDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Cupón
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-center w-[120px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coupons.length > 0 ? coupons.map(coupon => (
                                <TableRow key={coupon.id}>
                                    <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                                    <TableCell className="capitalize">
                                        {coupon.discountType === 'fixed' ? 'Monto Fijo' : 'Porcentaje'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {coupon.discountType === 'fixed' ? `$${coupon.value}` : `${coupon.value}%`}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-2">
                                            <Button variant="outline" size="icon" onClick={() => { setEditingCoupon(coupon); setIsDialogOpen(true); }}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="icon" onClick={() => handleDelete(coupon.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        No hay cupones creados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Código del Cupón</Label>
                            <Input
                                id="code"
                                name="code"
                                placeholder="EJEMPLO10"
                                defaultValue={editingCoupon?.code || ''}
                                className="uppercase"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="discountType">Tipo de Descuento</Label>
                                <Select name="discountType" defaultValue={editingCoupon?.discountType || 'fixed'}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="value">Valor</Label>
                                <Input
                                    id="value"
                                    name="value"
                                    type="number"
                                    step="0.01"
                                    defaultValue={editingCoupon?.value || ''}
                                    required
                                />
                            </div>
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
    );
}

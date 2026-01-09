"use client";

import { useState } from 'react';
import type { BankDetail } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Landmark, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { z } from 'zod';

const BankDetailFormSchema = z.object({
    bank: z.string().min(3, "El nombre del banco es requerido."),
    accountHolder: z.string().min(3, "El nombre del titular es requerido."),
    idNumber: z.string().min(5, "El C.I./R.I.F. es requerido."),
    accountNumber: z.string().min(20, "El número de cuenta debe tener 20 dígitos.").max(20, "El número de cuenta debe tener 20 dígitos."),
    description: z.string().optional(),
});

interface BankManagementCardProps {
    bankDetails: BankDetail[];
    onAddBankDetail: (detail: Omit<BankDetail, 'id'>) => Promise<void>;
    onUpdateBankDetail: (id: string, detail: BankDetail) => Promise<void>;
    onDeleteBankDetail: (id: string) => Promise<void>;
}

export function BankManagementCard({ bankDetails, onAddBankDetail, onUpdateBankDetail, onDeleteBankDetail }: BankManagementCardProps) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBankDetail, setEditingBankDetail] = useState<BankDetail | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<BankDetail | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const openDialog = (item: BankDetail | null) => {
        setEditingBankDetail(item);
        setIsDialogOpen(true);
    };

    const openDeleteDialog = (item: BankDetail) => {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            bank: formData.get('bankName') as string,
            accountHolder: formData.get('holderName') as string,
            idNumber: formData.get('idNumber') as string,
            accountNumber: formData.get('accountNumber') as string,
            description: formData.get('description') as string,
        };
        const result = BankDetailFormSchema.safeParse(data);
        if (!result.success) {
            toast({ variant: 'destructive', title: 'Error', description: result.error.errors.map(e => e.message).join(' ') });
            setIsSaving(false);
            return;
        }

        try {
            if (editingBankDetail) {
                await onUpdateBankDetail(editingBankDetail.id, { ...result.data, id: editingBankDetail.id });
                toast({ title: 'Cuenta Actualizada', description: 'Los cambios han sido guardados exitosamente.' });
            } else {
                await onAddBankDetail(result.data);
                toast({ title: 'Cuenta Añadida', description: 'La cuenta bancaria ha sido creada exitosamente.' });
            }
            setIsDialogOpen(false);
            setEditingBankDetail(null);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la cuenta bancaria.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);

        try {
            await onDeleteBankDetail(itemToDelete.id);
            toast({ title: 'Cuenta eliminada', description: 'La cuenta bancaria ha sido eliminada exitosamente.' });
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la cuenta.' });
        } finally {
            setIsDeleting(false);
        }
    };

    const formatAccountNumber = (number: string) => {
        // Formatear número de cuenta para mejor legibilidad
        return number.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    return (
        <>
            <Card className="border-primary/10">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Landmark className="h-5 w-5 text-primary" />
                                Cuentas Bancarias de SUMA
                            </CardTitle>
                            <CardDescription className="text-base">
                                Cuentas para recibir pagos de suscripciones.
                            </CardDescription>
                        </div>
                        <Button onClick={() => openDialog(null)} className="shrink-0 w-full sm:w-auto">
                            <Landmark className="mr-2 h-4 w-4" />
                            Añadir Cuenta
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Vista móvil mejorada */}
                    <div className="md:hidden space-y-3">
                        {bankDetails.map(bank => (
                            <div key={bank.id} className="p-4 border rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">Banco:</span>
                                            <span className="text-sm font-bold">{bank.bank}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">Titular:</span>
                                            <span className="text-sm font-medium truncate ml-2">{bank.accountHolder}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">C.I./R.I.F.:</span>
                                            <span className="text-sm font-mono">{bank.idNumber}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">Número:</span>
                                            <span className="text-sm font-mono">{formatAccountNumber(bank.accountNumber)}</span>
                                        </div>
                                        {bank.description && (
                                            <div className="flex items-start justify-between">
                                                <span className="text-sm font-medium text-muted-foreground">Descripción:</span>
                                                <span className="text-sm text-muted-foreground truncate ml-2 max-w-32">{bank.description}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openDialog(bank)}
                                        className="h-8 px-3"
                                    >
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Editar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openDeleteDialog(bank)}
                                        className="h-8 px-3 text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {bankDetails.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Landmark className="h-8 w-8 mx-auto mb-2" />
                                <p>No hay cuentas bancarias registradas</p>
                                <p className="text-sm">Comienza añadiendo la primera cuenta</p>
                            </div>
                        )}
                    </div>

                    {/* Tabla responsiva para desktop */}
                    <div className="hidden md:block rounded-md border">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Banco</TableHead>
                                        <TableHead>Titular</TableHead>
                                        <TableHead>C.I./R.I.F.</TableHead>
                                        <TableHead>Número de Cuenta</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead className="w-24 text-center">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bankDetails.map(bank => (
                                        <TableRow key={bank.id} className="hover:bg-muted/50">
                                            <TableCell className="font-bold">{bank.bank}</TableCell>
                                            <TableCell>{bank.accountHolder}</TableCell>
                                            <TableCell className="font-mono">{bank.idNumber}</TableCell>
                                            <TableCell className="font-mono">{formatAccountNumber(bank.accountNumber)}</TableCell>
                                            <TableCell className="max-w-32">
                                                <span className="truncate block" title={bank.description || undefined}>
                                                    {bank.description || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => openDialog(bank)}
                                                        className="h-8 w-8"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => openDeleteDialog(bank)}
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

                        {bankDetails.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Landmark className="h-8 w-8 mx-auto mb-2" />
                                <p>No hay cuentas bancarias registradas</p>
                                <p className="text-sm">Comienza añadiendo la primera cuenta</p>
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
                            <Landmark className="h-5 w-5" />
                            {editingBankDetail ? 'Editar Cuenta' : 'Nueva Cuenta'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bankName" className="text-sm font-medium">
                                Nombre del Banco <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="bankName"
                                name="bankName"
                                defaultValue={editingBankDetail?.bank}
                                required
                                placeholder="Ej: Banco Galicia"
                                className="h-10"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="holderName" className="text-sm font-medium">
                                Nombre del Titular <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="holderName"
                                name="holderName"
                                defaultValue={editingBankDetail?.accountHolder}
                                required
                                placeholder="Nombre completo del titular"
                                className="h-10"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="idNumber" className="text-sm font-medium">
                                C.I./R.I.F. <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="idNumber"
                                name="idNumber"
                                defaultValue={editingBankDetail?.idNumber}
                                required
                                placeholder="Ej: V-12345678"
                                className="h-10"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="accountNumber" className="text-sm font-medium">
                                Número de Cuenta <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="accountNumber"
                                name="accountNumber"
                                defaultValue={editingBankDetail?.accountNumber}
                                required
                                placeholder="20 dígitos"
                                maxLength={20}
                                className="h-10 font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                Ingresa solo los números, sin espacios ni guiones
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-medium">
                                Descripción (Opcional)
                            </Label>
                            <Textarea
                                id="description"
                                name="description"
                                defaultValue={editingBankDetail?.description || ''}
                                placeholder="Descripción adicional de la cuenta"
                                className="min-h-20"
                            />
                        </div>

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
                            ¿Estás seguro de que quieres eliminar esta cuenta bancaria?
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

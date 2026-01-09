
"use client";

import { useState } from 'react';
import type { Seller, BankDetail } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import * as supabaseService from '@/lib/supabaseService';
import { PlusCircle, Pencil, Trash2, Coins } from 'lucide-react';
import { z } from 'zod';

const BankDetailFormSchema = z.object({
  bank: z.string().min(3, "El nombre del banco es requerido."),
  accountHolder: z.string().min(3, "El nombre del titular es requerido."),
  idNumber: z.string().min(5, "El C.I./R.I.F. es requerido."),
  accountNumber: z.string().min(20, "El número de cuenta debe tener 20 dígitos.").max(20, "El número de cuenta debe tener 20 dígitos."),
  description: z.string().nullable().optional(),
});

interface AccountsTabProps {
  sellerData: Seller;
  onUpdate: () => void;
}

export function AccountsTab({ sellerData, onUpdate }: AccountsTabProps) {
  const { toast } = useToast();
  const [isBankDetailDialogOpen, setIsBankDetailDialogOpen] = useState(false);
  const [editingBankDetail, setEditingBankDetail] = useState<BankDetail | null>(null);

  const handleOpenBankDetailDialog = (bankDetail: BankDetail | null) => {
    setEditingBankDetail(bankDetail);
    setIsBankDetailDialogOpen(true);
  };
  
  const handleSaveBankDetail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataToValidate = {
        bank: formData.get('bankName') as string,
        accountHolder: formData.get('accountHolder') as string,
        idNumber: formData.get('idNumber') as string,
        accountNumber: formData.get('accountNumber') as string,
        description: formData.get('description') as string,
    };
    const result = BankDetailFormSchema.safeParse(dataToValidate);

    if (!result.success) {
        toast({ variant: 'destructive', title: 'Error de Validación', description: result.error.errors.map(err => err.message).join(' ') });
        return;
    }
    
    if (!sellerData) return;
    
    const newBankDetail: BankDetail = {
      id: editingBankDetail ? editingBankDetail.id : `bank-${Date.now()}`,
      ...result.data,
    };
    
    let updatedBankDetails;
    if (editingBankDetail) {
      updatedBankDetails = sellerData.bankDetails.map(bd => bd.id === editingBankDetail.id ? newBankDetail : bd);
    } else {
      updatedBankDetails = [...sellerData.bankDetails, newBankDetail];
    }
    
    await supabaseService.updateSeller(sellerData.id, { bankDetails: updatedBankDetails });
    onUpdate();
    setIsBankDetailDialogOpen(false);
    toast({ title: "Cuenta Bancaria Guardada" });
  };

  const handleDeleteBankDetail = async (bankDetailId: string) => {
    if (!sellerData) return;
    const updatedBankDetails = sellerData.bankDetails.filter(bd => bd.id !== bankDetailId);
    await supabaseService.updateSeller(sellerData.id, { bankDetails: updatedBankDetails });
    onUpdate();
    toast({ title: "Cuenta Bancaria Eliminada" });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Coins /> Mis Cuentas Bancarias</CardTitle>
            <CardDescription>Gestiona tus cuentas para recibir los pagos de comisiones.</CardDescription>
          </div>
          <Button onClick={() => handleOpenBankDetailDialog(null)} className="w-full sm:w-auto">
            <PlusCircle className="mr-2"/> Agregar Cuenta
          </Button>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead><TableHead>Descripción</TableHead><TableHead>Titular</TableHead>
                  <TableHead>Nro. de Cuenta</TableHead><TableHead>C.I./R.I.F.</TableHead><TableHead className="w-[120px] text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sellerData.bankDetails || []).map(bd => (
                  <TableRow key={bd.id}>
                    <TableCell className="font-medium">{bd.bank}</TableCell>
                    <TableCell className="text-muted-foreground">{bd.description || '-'}</TableCell>
                    <TableCell>{bd.accountHolder}</TableCell>
                    <TableCell>{bd.accountNumber}</TableCell>
                    <TableCell>{bd.idNumber}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenBankDetailDialog(bd)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteBankDetail(bd.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(sellerData.bankDetails || []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">No tienes cuentas bancarias registradas.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-4 md:hidden">
            {(sellerData.bankDetails || []).length > 0 ? (sellerData.bankDetails || []).map(bd => (
              <div key={bd.id} className="p-4 border rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div><p className="text-xs text-muted-foreground">Banco</p><p className="font-medium">{bd.bank}</p></div>
                  <div><p className="text-xs text-muted-foreground">Descripción</p><p className="font-medium">{bd.description || '-'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Titular</p><p className="font-medium">{bd.accountHolder}</p></div>
                  <div><p className="text-xs text-muted-foreground">Nro. Cuenta</p><p className="font-mono text-sm">{bd.accountNumber}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">C.I./R.I.F.</p><p className="font-mono text-sm">{bd.idNumber}</p></div>
                </div>
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenBankDetailDialog(bd)}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDeleteBankDetail(bd.id)}><Trash2 className="mr-2 h-4 w-4" /> Borrar</Button>
                </div>
              </div>
            )) : (<p className="text-center text-muted-foreground py-8">No tienes cuentas bancarias registradas.</p>)}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isBankDetailDialogOpen} onOpenChange={setIsBankDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBankDetail ? "Editar Cuenta Bancaria" : "Agregar Nueva Cuenta"}</DialogTitle>
            <DialogDescription>{editingBankDetail ? "Modifica los detalles de esta cuenta." : "Añade una nueva cuenta para recibir tus comisiones."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBankDetail}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="bankName" className="text-right">Banco</Label><Input id="bankName" name="bankName" defaultValue={editingBankDetail?.bank} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="accountHolder" className="text-right">Titular</Label><Input id="accountHolder" name="accountHolder" defaultValue={editingBankDetail?.accountHolder} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="idNumber" className="text-right">C.I./R.I.F.</Label><Input id="idNumber" name="idNumber" defaultValue={editingBankDetail?.idNumber} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="accountNumber" className="text-right">Nro. Cuenta</Label><Input id="accountNumber" name="accountNumber" defaultValue={editingBankDetail?.accountNumber} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="description" className="text-right">Descripción</Label><Input id="description" name="description" defaultValue={editingBankDetail?.description || ''} className="col-span-3" placeholder="Ej: Cuenta en Dólares" /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

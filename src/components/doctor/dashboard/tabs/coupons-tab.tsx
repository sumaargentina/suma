"use client";

import type { Coupon } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, Share2, ClipboardCopy, Calendar } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CouponsTabProps {
  coupons: Coupon[];
  onOpenDialog: (coupon: Coupon | null) => void;
  onDeleteItem: (type: 'coupon', id: string) => void;
  doctorId: string;
}

function getDoctorCouponStatus(coupon: Coupon) {
  if (coupon.isActive === false) {
    return { label: "Inactivo", className: "bg-slate-100 text-slate-600 border-slate-200" };
  }
  const toStr = coupon.validTo ? (coupon.validTo.includes('T') ? coupon.validTo.split('T')[0] : coupon.validTo) : '';
  if (toStr) {
    const toDate = new Date(`${toStr}T23:59:59.999`);
    if (!isNaN(toDate.getTime()) && toDate < new Date()) {
      return { label: "Vencido", className: "bg-red-50 text-red-700 border-red-200" };
    }
  }
  return { label: "Activo", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

export function CouponsTab({ coupons, onOpenDialog, onDeleteItem, doctorId }: CouponsTabProps) {
  const { toast } = useToast();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({
        title: "¡Código copiado!",
        description: `El código ${code} ha sido copiado al portapapeles.`
      });
    }).catch(() => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo copiar el código." });
    });
  };

  const handleShare = (coupon: Coupon) => {
    const val = coupon.value ?? coupon.discountValue ?? 0;
    const discountLabel = coupon.discountType === 'fixed' ? `$${val} de descuento` : `${val}% de descuento`;
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/doctors/${doctorId}` : '';
    const shareText = `¡Obtén ${discountLabel} en tu consulta médica usando mi código promocional: *${coupon.code}*!\n\nReserva tu cita aquí: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: `Descuento con ${coupon.name || coupon.code}`,
        text: shareText,
        url: shareUrl,
      }).catch((err) => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        toast({
          title: "Mensaje promocional copiado",
          description: "El enlace y código promocional se copiaron al portapapeles."
        });
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle>Mis Cupones Promocionales</CardTitle>
          <CardDescription>
            Crea cupones independientes por monto fijo ($) o porcentaje (%) para tus pacientes.
          </CardDescription>
        </div>
        <Button onClick={() => onOpenDialog(null)} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Cupón
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Cupón</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Caducación</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead className="text-center w-[160px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length > 0 ? coupons.map(coupon => {
                const val = coupon.value ?? coupon.discountValue ?? 0;
                const status = getDoctorCouponStatus(coupon);
                const toStr = coupon.validTo ? (coupon.validTo.includes('T') ? coupon.validTo.split('T')[0] : coupon.validTo) : '';

                return (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-base">{coupon.code}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.className}`}>
                            {status.label}
                          </Badge>
                        </div>
                        {coupon.name && <span className="text-xs text-muted-foreground">{coupon.name}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-2" title={coupon.description}>
                        {coupon.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{toStr || 'Sin límite'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-green-600 text-base">
                          {coupon.discountType === 'fixed' ? `$${val}` : `${val}%`}
                        </span>
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {coupon.discountType === 'fixed' ? 'Monto Fijo' : 'Porcentaje'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleCopyCode(coupon.code)} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                                <ClipboardCopy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar Código</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleShare(coupon)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Compartir Promoción</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button variant="ghost" size="icon" onClick={() => onOpenDialog(coupon)} title="Editar cupón">
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteItem('coupon', coupon.id)} title="Eliminar cupón">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No has creado cupones aún. ¡Crea uno por monto fijo o porcentaje para atraer pacientes!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

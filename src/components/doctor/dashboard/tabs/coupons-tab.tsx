
"use client";

import type { Coupon } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, Share2, ClipboardCopy } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CouponsTabProps {
  coupons: Coupon[];
  onOpenDialog: (coupon: Coupon | null) => void;
  onDeleteItem: (type: 'coupon', id: string) => void;
  doctorId: string;
}

export function CouponsTab({ coupons, onOpenDialog, onDeleteItem, doctorId }: CouponsTabProps) {
  const { toast } = useToast();

  const handleShare = (coupon: Coupon) => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/doctors/${doctorId}` : '';
    const shareText = `¡Obtén un descuento en tu consulta con el código: *${coupon.code}*!\n\nReserva aquí: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: `Descuento con ${coupon.name || 'mi cupón'}`,
        text: shareText,
        url: shareUrl,
      }).catch((err) => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        toast({
          title: "¡Listo para compartir!",
          description: "Mensaje y enlace copiados al portapapeles."
        });
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mis Cupones</CardTitle>
        <Button onClick={() => onOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Cupón
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Cupón</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center w-[160px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length > 0 ? coupons.map(coupon => (
              <TableRow key={coupon.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-base">{coupon.code}</span>
                    {coupon.name && <span className="text-xs text-muted-foreground">{coupon.name}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground line-clamp-2" title={coupon.description}>
                    {coupon.description || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-green-600">
                      {coupon.discountType === 'fixed' ? `$${coupon.value}` : `${coupon.value}%`}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {coupon.discountType === 'fixed' ? 'Monto Fijo' : 'Descuento'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleShare(coupon)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Compartir</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button variant="ghost" size="icon" onClick={() => onOpenDialog(coupon)}>
                      <Pencil className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteItem('coupon', coupon.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No has creado cupones aún. ¡Crea uno para atraer pacientes!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

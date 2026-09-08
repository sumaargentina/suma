
"use client";

import Link from "next/link";
import type { BankDetail } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Pencil, Trash2, CreditCard, User, Hash, BarChart3 } from 'lucide-react';

interface BankDetailsTabProps {
  bankDetails: BankDetail[];
  onOpenDialog: (detail: BankDetail | null) => void;
  onDeleteItem: (type: 'bank', id: string) => void;
}

export function BankDetailsTab({ bankDetails, onOpenDialog, onDeleteItem }: BankDetailsTabProps) {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-green-200 bg-green-50/30">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CreditCard className="h-6 w-6" />
              Mis Cuentas Bancarias
            </CardTitle>
            <p className="text-green-700 text-sm mt-1">
              Gestiona las cuentas (Pago Móvil, Transferencias) donde recibirás los pagos de tus consultas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/doctor/dashboard/analytics">
              <Button variant="outline" size="sm" className="gap-1.5 border-green-300 text-green-800 hover:bg-green-100">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Ver</span> Estadísticas
              </Button>
            </Link>
            <Button 
              size="sm"
              onClick={() => onOpenDialog(null)}
              className="bg-green-600 hover:bg-green-700"
            >
              <PlusCircle className="mr-1.5 h-4 w-4"/>
              Añadir Cuenta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Vista móvil con cards */}
          <div className="block sm:hidden space-y-3">
            {bankDetails.length > 0 ? (
              bankDetails.map(bankDetail => (
                <Card key={bankDetail.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-4 w-4 text-green-600" />
                          <Badge variant="outline" className="text-green-700">
                            {bankDetail.bank}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{bankDetail.accountHolder}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-xs">{bankDetail.accountNumber}</span>
                          </div>
                          {bankDetail.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {bankDetail.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onOpenDialog(bankDetail)}
                        className="flex-1"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => onDeleteItem('bank', bankDetail.id)}
                        className="flex-1"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-green-400" />
                <p className="text-muted-foreground mb-4">No has registrado cuentas bancarias.</p>
                <Button 
                  onClick={() => onOpenDialog(null)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir primera cuenta
                </Button>
              </div>
            )}
          </div>

          {/* Vista desktop con tabla */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead className="text-right">Número de Cuenta</TableHead>
                  <TableHead className="text-center w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankDetails.length > 0 ? bankDetails.map(bd => (
                  <TableRow key={bd.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        {bd.bank}
                      </div>
                    </TableCell>
                    <TableCell>{bd.accountHolder}</TableCell>
                    <TableCell className="text-right font-mono">{bd.accountNumber}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => onOpenDialog(bd)}>
                          <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => onDeleteItem('bank', bd.id)}>
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      <div className="flex flex-col items-center gap-2">
                        <CreditCard className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No has registrado cuentas bancarias.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onOpenDialog(null)}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Añadir primera cuenta
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

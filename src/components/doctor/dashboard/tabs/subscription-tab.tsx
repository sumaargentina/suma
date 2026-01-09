
"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Doctor, DoctorPayment, AppSettings } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Shield, Upload, Eye, Calendar, DollarSign, CreditCard, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight, Building2, Copy, Check, BanknoteIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { getSettings } from '@/lib/supabaseService';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionTabProps {
  doctorData: Doctor;
  doctorPayments: DoctorPayment[];
  onOpenPaymentDialog: () => void;
  subscriptionFee: number;
}

export function SubscriptionTab({ doctorData, doctorPayments, onOpenPaymentDialog, subscriptionFee }: SubscriptionTabProps) {
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const { toast } = useToast();
  const paymentsPerPage = 20;
  
  const sortedPayments = useMemo(() => {
    return [...doctorPayments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [doctorPayments]);

  // Calcular paginación
  const totalPages = Math.ceil(sortedPayments.length / paymentsPerPage);
  const startIndex = (currentPage - 1) * paymentsPerPage;
  const endIndex = startIndex + paymentsPerPage;
  const currentPayments = sortedPayments.slice(startIndex, endIndex);

  // Cargar configuraciones para obtener cuentas bancarias
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoadingSettings(true);
        const settingsData = await getSettings();
        setSettings(settingsData);
      } catch {
        console.error('Error cargando configuraciones');
        toast({
          title: "Error",
          description: "No se pudieron cargar las cuentas bancarias de SUMA",
          variant: "destructive"
        });
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, [toast]);

  const handleViewProof = (paymentProofUrl: string | null) => {
    if (!paymentProofUrl) {
      alert('No hay comprobante disponible para este pago.');
      return;
    }
    setViewingProof(paymentProofUrl);
    setIsProofDialogOpen(true);
  };

  const handleCopyAccount = async (accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccount(accountNumber);
      toast({
        title: "Copiado",
        description: "Número de cuenta copiado al portapapeles",
      });
      setTimeout(() => setCopiedAccount(null), 2000);
    } catch {
      toast({
        title: "Error",
        description: "No se pudo copiar el número de cuenta",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'Rejected':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'Pagado';
      case 'Pending':
        return 'En Revisión';
      case 'Rejected':
        return 'Rechazado';
      default:
        return 'Desconocido';
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  function getNextCycleDates(settings: AppSettings | null, today = new Date()) {
    if (!settings?.billingCycleStartDay || !settings?.billingCycleEndDay) return { nextStart: null, nextEnd: null };
    const year = today.getFullYear();
    const month = today.getMonth();
    const startDay = settings.billingCycleStartDay;
    const endDay = settings.billingCycleEndDay;
    let nextStart, nextEnd;
    if (today.getDate() < startDay) {
      nextStart = new Date(year, month, startDay);
      nextEnd = new Date(year, month, endDay);
    } else {
      // Si ya pasó el inicio, el próximo ciclo es el mes siguiente
      nextStart = new Date(year, month + 1, startDay);
      nextEnd = new Date(year, month + 1, endDay);
    }
    return { nextStart, nextEnd };
  }
  const { nextStart, nextEnd } = getNextCycleDates(settings);

  return (
    <>
      <div className="space-y-6">
        {/* Información de Suscripción */}
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Shield className="h-6 w-6" /> 
              Mi Suscripción
            </CardTitle>
            <CardDescription className="text-blue-700">
              Gestiona tu membresía en SUMA para seguir recibiendo pacientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Estado y detalles principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-muted-foreground">Estado Actual</p>
                  </div>
                  <Badge className={cn('capitalize text-sm px-2 py-1', {
                    'bg-green-600 text-white': doctorData.subscriptionStatus === 'active', 
                    'bg-amber-500 text-white': doctorData.subscriptionStatus === 'pending_payment',
                    'bg-red-600 text-white': doctorData.subscriptionStatus === 'inactive'
                  })}>
                    {doctorData.subscriptionStatus === 'active' ? 'Activa' : 
                     doctorData.subscriptionStatus === 'pending_payment' ? 'Pago en Revisión' : 'Inactiva'}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-muted-foreground">Monto Mensual</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    ${subscriptionFee.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/mes</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-muted-foreground">Último Pago</p>
                  </div>
                  <p className="font-semibold text-sm">
                    {doctorData.lastPaymentDate
                      ? format(new Date(doctorData.lastPaymentDate + 'T00:00:00'), "d 'de' MMM, yyyy", { locale: es })
                      : 'Usuario nuevo, sin pago'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-muted-foreground">Próximo Pago</p>
                  </div>
                  <p className="font-semibold text-sm">
                    {nextStart ? format(nextStart, "d 'de' MMM, yyyy", { locale: es }) : 'N/A'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <p className="text-sm text-muted-foreground">Próximo Vencimiento</p>
                  </div>
                  <p className="font-semibold text-sm">
                    {nextEnd ? format(nextEnd, "d 'de' MMM, yyyy", { locale: es }) : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Cuentas Bancarias de SUMA */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Building2 className="h-5 w-5" />
                  Cuentas Bancarias de SUMA
                </CardTitle>
                <CardDescription className="text-green-700">
                  Realiza tu pago a cualquiera de estas cuentas oficiales de SUMA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSettings ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="ml-2 text-green-700">Cargando cuentas bancarias...</span>
                  </div>
                ) : settings?.companyBankDetails && settings.companyBankDetails.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {settings.companyBankDetails.map((account, index) => (
                      <Card key={index} className="bg-white border-green-200 hover:border-green-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <BanknoteIcon className="h-4 w-4 text-green-600" />
                              <span className="font-semibold text-green-800">{account.bank}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyAccount(account.accountNumber)}
                              className="h-8 w-8 p-0"
                            >
                              {copiedAccount === account.accountNumber ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4 text-gray-500 hover:text-green-600" />
                              )}
                            </Button>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Titular:</span>
                              <p className="font-medium">{account.accountHolder}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">CI/RIF:</span>
                              <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {account.idNumber}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Número de Cuenta:</span>
                              <p className="font-mono text-sm bg-green-50 px-2 py-1 rounded border">
                                {account.accountNumber}
                              </p>
                            </div>
                            {account.description && (
                              <div>
                                <span className="text-muted-foreground">Descripción:</span>
                                <p className="text-xs italic">{account.description}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BanknoteIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No hay cuentas bancarias configuradas.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Contacta al administrador para obtener la información de pago.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sección de Reportar Pago */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <CreditCard className="h-5 w-5" />
                  Reportar un Pago
                </CardTitle>
                <CardDescription className="text-blue-700">
                  {doctorData.subscriptionStatus === 'pending_payment' 
                    ? 'Ya tienes un pago en revisión. Si realizaste un nuevo pago, puedes reportarlo aquí.'
                    : '¿Ya realizaste el pago de tu suscripción? Repórtalo aquí para que el equipo de SUMA lo verifique.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={onOpenPaymentDialog}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="mr-2 h-4 w-4" /> 
                  {doctorData.subscriptionStatus === 'pending_payment' ? 'Reportar Nuevo Pago' : 'Reportar Pago'}
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Historial de Pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Historial de Pagos
            </CardTitle>
            <CardDescription>
              Registro de todos tus pagos de suscripción ({sortedPayments.length} pagos totales)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Vista móvil con cards */}
            <div className="block sm:hidden space-y-3">
              {currentPayments.length > 0 ? (
                <>
                  {currentPayments.map(payment => (
                    <Card key={payment.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusIcon(payment.status)}
                              <Badge className={cn('text-xs', {
                                'bg-green-600 text-white': payment.status === 'Paid',
                                'bg-amber-500 text-white': payment.status === 'Pending',
                                'bg-red-600 text-white': payment.status === 'Rejected'
                              })}>
                                {getStatusText(payment.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.date + 'T00:00:00'), "d 'de' MMMM, yyyy", { locale: es })}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg text-green-600">
                              ${payment.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">ID Transacción:</span>
                            <span className="font-mono">{payment.transactionId}</span>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewProof(payment.paymentProofUrl)}
                            disabled={!payment.paymentProofUrl}
                            className="w-full"
                          >
                            <Eye className="mr-2 h-3 w-3" /> 
                            Ver Comprobante
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Paginación móvil */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No hay pagos registrados.</p>
                  <Button 
                    onClick={onOpenPaymentDialog}
                    variant="outline"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Reportar primer pago
                  </Button>
                </div>
              )}
            </div>

            {/* Vista desktop con tabla */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>ID Transacción</TableHead>
                    <TableHead className="text-right">Comprobante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPayments.length > 0 ? (
                    currentPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {format(new Date(p.date + 'T00:00:00'), "d MMM, yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          ${p.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(p.status)}
                            <Badge className={cn('text-xs', {
                              'bg-green-600 text-white': p.status === 'Paid',
                              'bg-amber-500 text-white': p.status === 'Pending',
                              'bg-red-600 text-white': p.status === 'Rejected'
                            })}>
                              {getStatusText(p.status)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.transactionId}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewProof(p.paymentProofUrl)}
                            disabled={!p.paymentProofUrl}
                          >
                            <Eye className="mr-2 h-4 w-4" /> Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <CreditCard className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No hay pagos registrados.</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={onOpenPaymentDialog}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Reportar primer pago
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Paginación desktop */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1}-{Math.min(endIndex, sortedPayments.length)} de {sortedPayments.length} pagos
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para mostrar el comprobante */}
      <Dialog open={isProofDialogOpen} onOpenChange={setIsProofDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Comprobante de Pago
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {viewingProof && (
              <div className="relative w-full h-[60vh] bg-muted rounded-lg overflow-hidden">
                {viewingProof.startsWith('data:') ? (
                  // Es un archivo base64
                  <Image 
                    src={viewingProof} 
                    alt="Comprobante de pago" 
                    fill 
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  />
                ) : (
                  // Es una URL
                  <Image 
                    src={viewingProof} 
                    alt="Comprobante de pago" 
                    fill 
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  />
                )}
              </div>
            )}
            {!viewingProof && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No se pudo cargar el comprobante
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProofDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

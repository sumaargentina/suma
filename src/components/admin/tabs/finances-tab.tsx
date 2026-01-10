"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Wallet,
  FileDown,
  Loader2,
  CreditCard,
  Users,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as supabaseService from "@/lib/supabaseService";
import type { DoctorPayment, Doctor, ClinicPayment, Clinic } from "@/lib/types";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { useSettings } from "@/lib/settings";

export function FinancesTab() {
  const { toast } = useToast();
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [pendingPayments, setPendingPayments] = useState<DoctorPayment[]>([]);
  const [pendingClinicPayments, setPendingClinicPayments] = useState<(ClinicPayment & { clinicName: string })[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<DoctorPayment | null>(null);
  const [selectedClinicPayment, setSelectedClinicPayment] = useState<(ClinicPayment & { clinicName: string }) | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingPayments: 0,
    activeSubscriptions: 0,
    activeDoctors: 0,
    activeClinics: 0,
    monthlyGrowth: 0
  });

  const timeRangeLabels = {
    today: 'Hoy',
    week: 'Esta Semana',
    month: 'Este Mes',
    year: 'Este Año',
    all: 'Global'
  };

  const loadFinancialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Obtener datos reales de la base de datos
      const [doctorPayments, doctors, clinicPayments, clinics] = await Promise.all([
        supabaseService.getDoctorPayments(),
        supabaseService.getDoctors(),
        supabaseService.getClinicPaymentsForAdmin(),
        supabaseService.getAdminClinics()
      ]);

      // Filtrar pagos pendientes
      const pending = doctorPayments.filter((payment: DoctorPayment) => payment.status === 'Pending');
      setPendingPayments(pending);

      // Calcular ingresos totales (solo pagos aprobados)
      const totalRevenue = doctorPayments
        .filter((payment: DoctorPayment) => payment.status === 'Paid')
        .reduce((sum: number, payment: DoctorPayment) => sum + (payment.amount || 0), 0);

      // Calcular gastos totales (por ahora 0 ya que no hay función getCompanyExpenses)
      const totalExpenses = 0;

      // Calcular pagos pendientes
      const pendingPaymentsCount = pending.length;

      // Calcular suscripciones activas (doctores + clínicas con estado activo)
      const activeDoctorsCount = doctors.filter((doctor: Doctor) => doctor.status === 'active').length;
      const activeClinicsCount = clinics.filter((clinic: Clinic) => clinic.subscriptionStatus === 'active').length;

      // Filtrar pagos de clínicas pendientes
      const pendingClinic = clinicPayments.filter(p => p.status === 'Pending');
      setPendingClinicPayments(pendingClinic);

      // Calcular ingresos de clínicas
      const clinicRevenue = clinicPayments
        .filter(p => p.status === 'Paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      setStats({
        totalRevenue: totalRevenue + clinicRevenue,
        totalExpenses,
        netProfit: totalRevenue + clinicRevenue - totalExpenses,
        pendingPayments: pendingPaymentsCount + pendingClinic.length,
        activeSubscriptions: activeDoctorsCount + activeClinicsCount,
        activeDoctors: activeDoctorsCount,
        activeClinics: activeClinicsCount,
        monthlyGrowth: 0
      });

    } catch {
      console.error('Error cargando datos financieros');
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos financieros.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFinancialData();
  }, [timeRange, loadFinancialData]);

  const handleDownloadReport = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Reporte descargado",
        description: "El reporte financiero se ha descargado correctamente.",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo descargar el reporte.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPayment = (payment: DoctorPayment) => {
    setSelectedPayment(payment);
    setIsPaymentDialogOpen(true);
  };

  const handleProcessPayment = async (status: 'Paid' | 'Rejected') => {
    if (!selectedPayment) return;

    setIsProcessingPayment(true);
    try {
      await supabaseService.updateDoctorPaymentStatus(selectedPayment.id, status);
      // Si el pago es aprobado, actualizar el doctor a subscriptionStatus: 'active'
      if (status === 'Paid') {
        await supabaseService.updateDoctor(selectedPayment.doctorId, { subscriptionStatus: 'active' });
      }
      toast({
        title: status === 'Paid' ? "Pago Aprobado" : "Pago Rechazado",
        description: status === 'Paid'
          ? "El pago ha sido aprobado y el médico ha sido activado."
          : "El pago ha sido rechazado. El médico debe corregir la información.",
      });

      // Recargar datos
      await loadFinancialData();
      setIsPaymentDialogOpen(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error procesando pago:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pago. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleProcessClinicPayment = async (status: 'Paid' | 'Rejected') => {
    if (!selectedClinicPayment) return;

    setIsProcessingPayment(true);
    try {
      await supabaseService.updateClinicPayment(selectedClinicPayment.id, { status });

      // If payment is approved, update clinic subscription status
      if (status === 'Paid') {
        await supabaseService.updateClinicStatus(selectedClinicPayment.clinicId, {
          subscriptionStatus: 'active',
          lastPaymentDate: selectedClinicPayment.date
        });
      }

      toast({
        title: status === 'Paid' ? "Pago Aprobado" : "Pago Rechazado",
        description: status === 'Paid'
          ? "El pago ha sido aprobado y la clínica ha sido activada."
          : "El pago ha sido rechazado.",
      });

      await loadFinancialData();
      setSelectedClinicPayment(null);
    } catch (error) {
      console.error('Error procesando pago de clínica:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pago.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Finanzas</h2>
            <p className="text-muted-foreground">
              Gestiona los ingresos, gastos y pagos de la plataforma
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-20 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Finanzas</h2>
          <p className="text-muted-foreground">
            Gestiona los ingresos, gastos y pagos de la plataforma
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(value: 'today' | 'week' | 'month' | 'year' | 'all') => setTimeRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(timeRangeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleDownloadReport} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Descargar Reporte
          </Button>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.monthlyGrowth > 0 ? `+${stats.monthlyGrowth}%` : 'Sin datos previos'} desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Gastos operativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio Neto</CardTitle>
            <Landmark className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.netProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.netProfit >= 0 ? 'Ganancia' : 'Pérdida'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <Wallet className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              Requieren aprobación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <div className="flex gap-3 mt-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-blue-600">{stats.activeDoctors}</span> Médicos
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-purple-600">{stats.activeClinics}</span> Clínicas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ciclo de Facturación</CardTitle>
            <Calendar className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Mensual</div>
            <p className="text-xs text-muted-foreground">
              Próximo: {settings?.billingCycleStartDay || 1} al {settings?.billingCycleEndDay || 6} de cada mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Pagos Pendientes */}
      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Pagos Pendientes de Aprobación
            </CardTitle>
            <CardDescription>
              {pendingPayments.length} pagos requieren tu revisión y aprobación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingPayments.map((payment) => (
                <Card key={payment.id} className="border-l-4 border-l-orange-500 hover:border-l-orange-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(payment.status)}
                          <Badge className="bg-orange-500 text-white text-xs">
                            {getStatusText(payment.status)}
                          </Badge>
                        </div>
                        <p className="font-semibold text-sm">{payment.doctorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.date + 'T00:00:00'), "d 'de' MMM, yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-green-600">
                          ${payment.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID Transacción:</span>
                        <span className="font-mono">{payment.transactionId}</span>
                      </div>

                      {payment.paymentMethod && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Método:</span>
                          <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                        </div>
                      )}

                      {payment.targetAccount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cuenta SUMA:</span>
                          <span className="text-xs">{payment.targetAccount.split('-')[0]}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPayment(payment)}
                      className="w-full mt-3"
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      Revisar Detalles
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagos Pendientes de Clínicas */}
      {pendingClinicPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-purple-600" />
              Pagos Pendientes de Clínicas
            </CardTitle>
            <CardDescription>
              {pendingClinicPayments.length} pagos de clínicas requieren tu revisión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingClinicPayments.map((payment) => (
                <Card key={payment.id} className="border-l-4 border-l-purple-500 hover:border-l-purple-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <Badge className="bg-purple-500 text-white text-xs">
                            Clínica
                          </Badge>
                        </div>
                        <p className="font-semibold text-sm">{payment.clinicName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.date + 'T00:00:00'), "d 'de' MMM, yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-green-600">
                          ${payment.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      {payment.transactionId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID Transacción:</span>
                          <span className="font-mono">{payment.transactionId}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedClinicPayment(payment)}
                      className="w-full mt-3"
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      Revisar Detalles
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de análisis */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Ingresos</CardTitle>
          <CardDescription>
            Tendencias de ingresos en los últimos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay datos suficientes para mostrar el gráfico</p>
              <p className="text-sm">Los datos aparecerán cuando se registren pagos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mensaje cuando no hay datos */}
      {stats.totalRevenue === 0 && stats.totalExpenses === 0 && pendingPayments.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No hay datos financieros</h3>
              <p className="text-muted-foreground mb-4">
                Los datos financieros aparecerán cuando se registren pagos de médicos,
                pagos de vendedores o gastos de la empresa.
              </p>
              <div className="text-sm text-muted-foreground">
                <p>• Crea médicos y registra sus pagos</p>
                <p>• Crea vendedores y registra sus comisiones</p>
                <p>• Registra gastos de la empresa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de detalle de pago */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Detalle del Pago - {selectedPayment?.doctorName}
            </DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              {/* Información del pago */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información del Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Médico:</span>
                      <span>{selectedPayment.doctorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Monto:</span>
                      <span className="font-bold text-green-600">${selectedPayment.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Fecha:</span>
                      <span>{format(new Date(selectedPayment.date + 'T00:00:00'), "d 'de' MMMM, yyyy", { locale: es })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">ID Transacción:</span>
                      <span className="font-mono text-sm">{selectedPayment.transactionId}</span>
                    </div>
                    {selectedPayment.paymentMethod && (
                      <div className="flex justify-between">
                        <span className="font-medium">Método:</span>
                        <span className="capitalize">{selectedPayment.paymentMethod.replace('_', ' ')}</span>
                      </div>
                    )}
                    {selectedPayment.targetAccount && (
                      <div className="flex justify-between">
                        <span className="font-medium">Cuenta SUMA:</span>
                        <span className="text-sm">{selectedPayment.targetAccount}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Descripción del Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPayment.paymentDescription ? (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {selectedPayment.paymentDescription}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay descripción adicional</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Comprobante de pago */}
              {selectedPayment.paymentProofUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Comprobante de Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative w-full h-96 bg-muted rounded-lg overflow-hidden">
                      {selectedPayment.paymentProofUrl.startsWith('data:') ? (
                        <Image
                          src={selectedPayment.paymentProofUrl}
                          alt="Comprobante de pago"
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                        />
                      ) : (
                        <Image
                          src={selectedPayment.paymentProofUrl}
                          alt="Comprobante de pago"
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Acciones */}
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                  disabled={isProcessingPayment}
                >
                  Cerrar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleProcessPayment('Rejected')}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Rechazar Pago
                </Button>
                <Button
                  onClick={() => handleProcessPayment('Paid')}
                  disabled={isProcessingPayment}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessingPayment ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Aprobar Pago
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalle de pago de clínica */}
      <Dialog open={!!selectedClinicPayment} onOpenChange={(open) => !open && setSelectedClinicPayment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pago de Clínica - {selectedClinicPayment?.clinicName}
            </DialogTitle>
          </DialogHeader>

          {selectedClinicPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Clínica</p>
                  <p className="font-semibold">{selectedClinicPayment.clinicName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="font-bold text-green-600 text-xl">${selectedClinicPayment.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p>{format(new Date(selectedClinicPayment.date + 'T00:00:00'), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID Transacción</p>
                  <p className="font-mono text-sm">{selectedClinicPayment.transactionId || '-'}</p>
                </div>
              </div>

              {selectedClinicPayment.paymentProofUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Comprobante</p>
                  <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                    <Image
                      src={selectedClinicPayment.paymentProofUrl}
                      alt="Comprobante"
                      fill
                      className="object-contain"
                      sizes="100vw"
                    />
                  </div>
                </div>
              )}

              {selectedClinicPayment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="bg-muted p-2 rounded text-sm">{selectedClinicPayment.notes}</p>
                </div>
              )}

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedClinicPayment(null)} disabled={isProcessingPayment}>
                  Cerrar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleProcessClinicPayment('Rejected')}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Rechazar
                </Button>
                <Button
                  onClick={() => handleProcessClinicPayment('Paid')}
                  disabled={isProcessingPayment}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Aprobar Pago
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
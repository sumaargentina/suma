"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Clinic, ClinicPayment, AppSettings } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Upload, Eye, Calendar, DollarSign, CreditCard, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight, Building2, Copy, Check, BanknoteIcon, Loader2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { getSettings, getClinicPayments, addClinicPayment } from '@/lib/supabaseService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

// Plan prices (should match backend configuration)
const PLAN_PRICES: Record<string, number> = {
    esencial: 50,
    profesional: 100,
    empresarial: 200,
    integral: 300,
};

export function SubscriptionTab() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [clinicData, setClinicData] = useState<Clinic | null>(null);
    const [clinicPayments, setClinicPayments] = useState<ClinicPayment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
    const [viewingProof, setViewingProof] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

    // Payment dialog state
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        transactionId: '',
        notes: '',
        proofFile: null as File | null,
    });

    const paymentsPerPage = 20;

    // Load clinic data
    useEffect(() => {
        const loadData = async () => {
            if (!user?.id) return;

            try {
                setIsLoading(true);

                // Get clinic data from user context
                const clinicInfo: Clinic = {
                    id: user.id,
                    name: user.name,
                    adminEmail: user.email,
                    slug: '',
                    createdAt: '',
                    plan: (user as any).plan || 'esencial',
                    subscriptionStatus: (user as any).subscriptionStatus || 'inactive',
                    lastPaymentDate: (user as any).lastPaymentDate,
                    nextPaymentDate: (user as any).nextPaymentDate,
                    subscriptionFee: PLAN_PRICES[(user as any).plan || 'esencial'],
                };
                setClinicData(clinicInfo);

                // Load payments
                const payments = await getClinicPayments(user.id);
                setClinicPayments(payments);

            } catch (error) {
                console.error('Error loading subscription data:', error);
                toast({
                    title: "Error",
                    description: "No se pudo cargar la información de suscripción",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [user, toast]);

    // Load settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                setIsLoadingSettings(true);
                const settingsData = await getSettings();
                setSettings(settingsData);
            } catch {
                console.error('Error cargando configuraciones');
            } finally {
                setIsLoadingSettings(false);
            }
        };
        loadSettings();
    }, []);

    const sortedPayments = useMemo(() => {
        return [...clinicPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [clinicPayments]);

    const totalPages = Math.ceil(sortedPayments.length / paymentsPerPage);
    const startIndex = (currentPage - 1) * paymentsPerPage;
    const endIndex = startIndex + paymentsPerPage;
    const currentPayments = sortedPayments.slice(startIndex, endIndex);

    const subscriptionFee = clinicData?.subscriptionFee || PLAN_PRICES[clinicData?.plan || 'esencial'];

    const handleViewProof = (paymentProofUrl: string | null) => {
        if (!paymentProofUrl) {
            toast({ title: "Sin comprobante", description: "No hay comprobante disponible para este pago.", variant: "destructive" });
            return;
        }
        setViewingProof(paymentProofUrl);
        setIsProofDialogOpen(true);
    };

    const handleCopyAccount = async (accountNumber: string) => {
        try {
            await navigator.clipboard.writeText(accountNumber);
            setCopiedAccount(accountNumber);
            toast({ title: "Copiado", description: "Número de cuenta copiado al portapapeles" });
            setTimeout(() => setCopiedAccount(null), 2000);
        } catch {
            toast({ title: "Error", description: "No se pudo copiar", variant: "destructive" });
        }
    };

    const handleSubmitPayment = async () => {
        if (!clinicData || !paymentForm.transactionId) {
            toast({ title: "Error", description: "Complete los campos requeridos", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            let proofUrl = null;

            // Convert file to base64 if provided
            if (paymentForm.proofFile) {
                const reader = new FileReader();
                proofUrl = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(paymentForm.proofFile!);
                });
            }

            await addClinicPayment({
                clinicId: clinicData.id,
                amount: subscriptionFee,
                date: format(new Date(), 'yyyy-MM-dd'),
                status: 'Pending',
                paymentMethod: 'transfer',
                transactionId: paymentForm.transactionId,
                paymentProofUrl: proofUrl,
                notes: paymentForm.notes,
            });

            // Reload payments
            const payments = await getClinicPayments(clinicData.id);
            setClinicPayments(payments);

            setIsPaymentDialogOpen(false);
            setPaymentForm({ transactionId: '', notes: '', proofFile: null });

            toast({ title: "Pago reportado", description: "Tu pago ha sido enviado para revisión" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo reportar el pago", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Paid': return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'Pending': return <Clock className="h-4 w-4 text-amber-500" />;
            case 'Rejected': return <AlertCircle className="h-4 w-4 text-red-600" />;
            default: return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'Paid': return 'Aprobado';
            case 'Pending': return 'En Revisión';
            case 'Rejected': return 'Rechazado';
            default: return 'Desconocido';
        }
    };

    const getPlanLabel = (plan: string) => {
        const labels: Record<string, string> = {
            esencial: 'Esencial',
            profesional: 'Profesional',
            empresarial: 'Empresarial',
            integral: 'Integral',
        };
        return labels[plan] || plan;
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
            nextStart = new Date(year, month + 1, startDay);
            nextEnd = new Date(year, month + 1, endDay);
        }
        return { nextStart, nextEnd };
    }

    const { nextStart, nextEnd } = getNextCycleDates(settings);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!clinicData) {
        return (
            <div className="text-center py-20">
                <p className="text-muted-foreground">No se pudo cargar la información</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Plan Information */}
                <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-800">
                            <Crown className="h-6 w-6" />
                            Mi Plan: {getPlanLabel(clinicData.plan || 'esencial')}
                        </CardTitle>
                        <CardDescription className="text-purple-700">
                            Gestiona tu suscripción y mantén tu clínica activa en SUMA
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Status Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="h-4 w-4 text-purple-600" />
                                        <p className="text-sm text-muted-foreground">Estado</p>
                                    </div>
                                    <Badge className={cn('capitalize text-sm px-2 py-1', {
                                        'bg-green-600 text-white': clinicData.subscriptionStatus === 'active',
                                        'bg-amber-500 text-white': clinicData.subscriptionStatus === 'pending_payment',
                                        'bg-red-600 text-white': clinicData.subscriptionStatus === 'inactive'
                                    })}>
                                        {clinicData.subscriptionStatus === 'active' ? 'Activa' :
                                            clinicData.subscriptionStatus === 'pending_payment' ? 'Pago en Revisión' : 'Inactiva'}
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
                                        {clinicData.lastPaymentDate
                                            ? format(new Date(clinicData.lastPaymentDate + 'T00:00:00'), "d 'de' MMM, yyyy", { locale: es })
                                            : 'Sin pagos registrados'}
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

                        {/* Bank Accounts */}
                        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-800">
                                    <Building2 className="h-5 w-5" />
                                    Cuentas Bancarias de SUMA
                                </CardTitle>
                                <CardDescription className="text-green-700">
                                    Realiza tu pago a cualquiera de estas cuentas oficiales
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingSettings ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                                    </div>
                                ) : settings?.companyBankDetails && settings.companyBankDetails.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {settings.companyBankDetails.map((account, index) => (
                                            <Card key={index} className="bg-white border-green-200">
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
                                                                <Copy className="h-4 w-4 text-gray-500" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-2 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground">Titular:</span>
                                                            <p className="font-medium">{account.accountHolder}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Número:</span>
                                                            <p className="font-mono text-sm bg-green-50 px-2 py-1 rounded">{account.accountNumber}</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-4">No hay cuentas configuradas</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Report Payment Button */}
                        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-800">
                                    <CreditCard className="h-5 w-5" />
                                    Reportar un Pago
                                </CardTitle>
                                <CardDescription className="text-blue-700">
                                    ¿Ya realizaste el pago de tu suscripción? Repórtalo aquí para que sea verificado.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => setIsPaymentDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Reportar Pago
                                </Button>
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>

                {/* Payment History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Historial de Pagos
                        </CardTitle>
                        <CardDescription>
                            Registro de todos tus pagos de suscripción ({sortedPayments.length} pagos)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                            <TableCell>{format(new Date(p.date + 'T00:00:00'), "d MMM, yyyy", { locale: es })}</TableCell>
                                            <TableCell className="font-bold text-green-600">${p.amount.toFixed(2)}</TableCell>
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
                                            <TableCell className="font-mono text-xs">{p.transactionId || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewProof(p.paymentProofUrl || null)}
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
                                                <p className="text-muted-foreground">No hay pagos registrados</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="text-sm text-muted-foreground">
                                    Mostrando {startIndex + 1}-{Math.min(endIndex, sortedPayments.length)} de {sortedPayments.length}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* View Proof Dialog */}
            <Dialog open={isProofDialogOpen} onOpenChange={setIsProofDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Comprobante de Pago</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {viewingProof && (
                            <div className="relative w-full h-[60vh] bg-muted rounded-lg overflow-hidden">
                                <Image src={viewingProof} alt="Comprobante" fill className="object-contain" sizes="80vw" />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProofDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Report Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reportar Pago</DialogTitle>
                        <DialogDescription>
                            Ingresa los datos de tu transferencia para verificación
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Monto a Pagar</Label>
                            <p className="text-2xl font-bold text-green-600">${subscriptionFee.toFixed(2)}</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transactionId">Número de Transacción / Referencia *</Label>
                            <Input
                                id="transactionId"
                                placeholder="Ej: 123456789"
                                value={paymentForm.transactionId}
                                onChange={(e) => setPaymentForm(prev => ({ ...prev, transactionId: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="proof">Comprobante (imagen)</Label>
                            <Input
                                id="proof"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPaymentForm(prev => ({ ...prev, proofFile: e.target.files?.[0] || null }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas adicionales</Label>
                            <Textarea
                                id="notes"
                                placeholder="Información adicional sobre el pago..."
                                value={paymentForm.notes}
                                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmitPayment} disabled={isSubmitting || !paymentForm.transactionId}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                            Enviar para Revisión
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

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
import { Shield, Upload, Eye, Calendar, DollarSign, CreditCard, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight, Building2, Copy, Check, BanknoteIcon, Loader2, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { getSettings, getClinic, getClinicPayments, addClinicPayment } from '@/lib/supabaseService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

const DEFAULT_MONTHLY_PRICE = 200;

const PLAN_PRICES: Record<string, number> = {
    esencial: 99,
    profesional: 149,
    integral: 200,
    empresarial: 249,
    hospital_gratuito: 0,
};

// Discounts for multi-month payments
const DISCOUNTS: Record<number, number> = {
    1: 0,
    3: 0.05,  // 5% off
    6: 0.08,  // 8% off
    12: 0.15, // 15% off
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
    const [selectedMonths, setSelectedMonths] = useState(1);
    const [paymentForm, setPaymentForm] = useState({
        transactionId: '',
        notes: '',
        proofFile: null as File | null,
    });

    const paymentsPerPage = 20;

    // Load clinic data in real-time from DB
    useEffect(() => {
        const loadData = async () => {
            if (!user?.id) return;

            try {
                setIsLoading(true);
                const [freshClinic, payments] = await Promise.all([
                    getClinic(user.id),
                    getClinicPayments(user.id),
                ]);

                if (freshClinic) {
                    setClinicData({
                        ...freshClinic,
                        subscriptionStatus: freshClinic.subscriptionStatus || (freshClinic.status === 'active' ? 'active' : 'inactive'),
                    });
                } else {
                    setClinicData({
                        id: user.id,
                        name: user.name,
                        adminEmail: user.email,
                        slug: '',
                        createdAt: '',
                        plan: (user as any).plan || 'integral',
                        subscriptionStatus: 'active',
                        subscriptionFee: DEFAULT_MONTHLY_PRICE,
                    });
                }

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

    const baseMonthlyPrice = useMemo(() => {
        if (!clinicData) return DEFAULT_MONTHLY_PRICE;
        if (clinicData.plan === 'hospital_gratuito') return 0;
        if (clinicData.subscriptionFee && clinicData.subscriptionFee > 0) return clinicData.subscriptionFee;
        const planKey = (clinicData.plan || 'integral').toLowerCase();
        return PLAN_PRICES[planKey] ?? DEFAULT_MONTHLY_PRICE;
    }, [clinicData]);

    const bcvRate = settings?.bcvRate || 65.50;

    // Calculate total and discount for a given number of months
    const { total: paymentTotal, discount, pricePerMonth } = useMemo(() => {
        const disc = DISCOUNTS[selectedMonths] || 0;
        const subtotal = baseMonthlyPrice * selectedMonths;
        const total = subtotal * (1 - disc);
        const perMonth = total / selectedMonths;
        return { total, discount: disc, pricePerMonth: perMonth, subtotal };
    }, [baseMonthlyPrice, selectedMonths]);

    const sortedPayments = useMemo(() => {
        return [...clinicPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [clinicPayments]);

    const totalPages = Math.ceil(sortedPayments.length / paymentsPerPage);
    const startIndex = (currentPage - 1) * paymentsPerPage;
    const endIndex = startIndex + paymentsPerPage;
    const currentPayments = sortedPayments.slice(startIndex, endIndex);

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

            if (paymentForm.proofFile) {
                const reader = new FileReader();
                proofUrl = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(paymentForm.proofFile!);
                });
            }

            await addClinicPayment({
                clinicId: clinicData.id,
                amount: paymentTotal,
                date: format(new Date(), 'yyyy-MM-dd'),
                status: 'Pending',
                paymentMethod: 'transfer',
                transactionId: paymentForm.transactionId,
                paymentProofUrl: proofUrl,
                notes: `${selectedMonths} mes(es) de suscripción (${getPlanLabel(clinicData.plan || 'integral')})${paymentForm.notes ? '. ' + paymentForm.notes : ''}`,
            });

            const payments = await getClinicPayments(clinicData.id);
            setClinicPayments(payments);
            setClinicData(prev => prev ? { ...prev, subscriptionStatus: 'pending_payment' } : prev);

            setIsPaymentDialogOpen(false);
            setPaymentForm({ transactionId: '', notes: '', proofFile: null });

            toast({ title: "Pago reportado", description: "Tu pago ha sido enviado para revisión por el equipo administrativo de SUMA." });
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
            hospital_gratuito: 'Hospital / Centro Gratuito',
        };
        return labels[plan] || plan;
    };

    function getNextCycleDates(settingsObj: AppSettings | null, createdAtStr?: string, today = new Date()) {
        if (createdAtStr) {
            const createdDate = new Date(createdAtStr);
            if (!isNaN(createdDate.getTime())) {
                const freeEnd = addDays(createdDate, 30);
                if (freeEnd > today) {
                    return { nextStart: createdDate, nextEnd: freeEnd, isFreeMonth: true };
                }
            }
        }
        if (!settingsObj?.billingCycleStartDay || !settingsObj?.billingCycleEndDay) {
            return { nextStart: null, nextEnd: addDays(today, 30), isFreeMonth: false };
        }
        const year = today.getFullYear();
        const month = today.getMonth();
        const startDay = settingsObj.billingCycleStartDay;
        const endDay = settingsObj.billingCycleEndDay;
        let nextStart, nextEnd;
        if (today.getDate() < startDay) {
            nextStart = new Date(year, month, startDay);
            nextEnd = new Date(year, month, endDay);
        } else {
            nextStart = new Date(year, month + 1, startDay);
            nextEnd = new Date(year, month + 1, endDay);
        }
        return { nextStart, nextEnd, isFreeMonth: false };
    }

    const { nextEnd, isFreeMonth } = getNextCycleDates(settings, clinicData?.createdAt);

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

    if (clinicData.plan === 'hospital_gratuito') {
        return (
            <Card className="border-2 border-sky-200 bg-gradient-to-r from-sky-50 to-emerald-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sky-900">
                        <Building2 className="h-6 w-6 text-sky-600" />
                        Modalidad Institucional: Hospital / Centro Gratuito
                    </CardTitle>
                    <CardDescription className="text-sky-800">
                        Esta cuenta institucional fue otorgada de forma 100% gratuita por la administración de SUMA.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-sky-900">
                    <p>✅ <strong>Exento de Mensualidad:</strong> Tu institución no paga suscripción mensual ni anual en SUMA.</p>
                    <p>✅ <strong>Servicios Gratuitos:</strong> Todas las consultas y servicios ofrecidos a los pacientes se agendan sin costo ($0).</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Plan Information */}
                <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-purple-800">
                                    <Crown className="h-6 w-6" />
                                    Mi Plan: {getPlanLabel(clinicData.plan || 'integral')}
                                </CardTitle>
                                <CardDescription className="text-purple-700">
                                    Gestiona tu suscripción y mantén tu clínica activa en SUMA
                                </CardDescription>
                            </div>
                            {(isFreeMonth || (clinicPayments.length === 0 && clinicData.status === 'active')) && (
                                <Badge className="bg-emerald-600 text-white px-3 py-1 text-xs font-bold flex items-center gap-1.5 w-fit">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    1er Mes Gratis de Bienvenida Activo
                                </Badge>
                            )}
                        </div>
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
                                        <p className="text-sm text-muted-foreground">Tarifa Mensual</p>
                                    </div>
                                    <p className="text-xl font-bold text-green-600">
                                        ${baseMonthlyPrice.toLocaleString('en-US')} USD
                                        <span className="text-sm font-normal text-muted-foreground">/mes</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        ≈ Bs. {(baseMonthlyPrice * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (BCV)
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
                                            : 'Período de 1er Mes Gratis'}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="h-4 w-4 text-orange-600" />
                                        <p className="text-sm text-muted-foreground">Próximo Corte</p>
                                    </div>
                                    <p className="font-semibold text-sm">
                                        {clinicData.nextPaymentDate
                                            ? format(new Date(clinicData.nextPaymentDate + 'T00:00:00'), "d 'de' MMM, yyyy", { locale: es })
                                            : nextEnd
                                            ? format(nextEnd, "d 'de' MMM, yyyy", { locale: es })
                                            : 'N/A'}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Bank Accounts */}
                        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-800">
                                    <Building2 className="h-5 w-5" />
                                    Cuentas Bancarias Oficiales de SUMA
                                </CardTitle>
                                <CardDescription className="text-green-700">
                                    Realiza el pago de tu suscripción a cualquiera de estas cuentas oficiales de SUMA
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
                                                        {account.idNumber && (
                                                            <div>
                                                                <span className="text-muted-foreground">RIF / C.I.:</span>
                                                                <p className="font-medium">{account.idNumber}</p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="text-muted-foreground">Número / Datos:</span>
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
                                    Reportar Pago de Suscripción a SUMA
                                </CardTitle>
                                <CardDescription className="text-blue-700">
                                    ¿Ya realizaste el pago de tu mensualidad o plan anual? Repórtalo aquí con tu número de referencia y comprobante para que sea verificado.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => setIsPaymentDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Reportar Pago a SUMA
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
                            Historial de Pagos a SUMA
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
                                    <TableHead>Referencia</TableHead>
                                    <TableHead className="text-right">Comprobante</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentPayments.length > 0 ? (
                                    currentPayments.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>{format(new Date(p.date + 'T00:00:00'), "d MMM, yyyy", { locale: es })}</TableCell>
                                            <TableCell className="font-bold text-green-600">${p.amount.toFixed(2)} USD</TableCell>
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
                                                <p className="text-muted-foreground">No hay pagos registrados aún</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

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
                        <DialogTitle>Reportar Pago de Suscripción a SUMA</DialogTitle>
                        <DialogDescription>
                            Selecciona la cantidad de meses e ingresa los datos de tu pago para validación.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Month Selector */}
                        <div className="space-y-2">
                            <Label>Selecciona el período a pagar</Label>
                            <div className="flex flex-wrap gap-2 bg-slate-100 p-2 rounded-xl">
                                {[1, 3, 6, 12].map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setSelectedMonths(m)}
                                        className={cn(
                                            'px-4 py-2 rounded-lg text-sm font-bold transition-all relative',
                                            selectedMonths === m
                                                ? 'bg-slate-900 text-white shadow-lg'
                                                : 'text-slate-600 hover:bg-slate-200'
                                        )}
                                    >
                                        {m === 1 ? '1 Mes' : `${m} Meses`}
                                        {DISCOUNTS[m] > 0 && (
                                            <span className={cn(
                                                'absolute -top-2 -right-2 text-white text-[10px] px-1.5 py-0.5 rounded-full',
                                                m === 3 ? 'bg-blue-500' : m === 6 ? 'bg-purple-500' : 'bg-green-500'
                                            )}>
                                                -{Math.round(DISCOUNTS[m] * 100)}%
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Payment Summary with Dual Currency (USD + Bs BCV) */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">Tarifa base por mes:</span>
                                <span className="font-medium">${baseMonthlyPrice.toLocaleString('en-US')} USD</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between items-center mb-2 text-green-600">
                                    <span className="text-sm">Descuento ({Math.round(discount * 100)}%):</span>
                                    <span className="font-medium">-${((baseMonthlyPrice * selectedMonths) * discount).toLocaleString('en-US')} USD</span>
                                </div>
                            )}
                            <div className="border-t pt-2 mt-2 flex justify-between items-center">
                                <span className="font-bold">Total a pagar (USD):</span>
                                <span className="text-2xl font-bold text-green-700">${paymentTotal.toLocaleString('en-US')} USD</span>
                            </div>
                            <div className="flex justify-between items-center mt-1 text-xs text-slate-600">
                                <span>Equivalente en Bolívares (Tasa BCV {bcvRate.toFixed(2)}):</span>
                                <span className="font-bold text-slate-900">
                                    Bs. {(paymentTotal * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            {selectedMonths > 1 && (
                                <p className="text-xs text-muted-foreground mt-1 text-right">
                                    Equivale a ${pricePerMonth.toLocaleString('en-US')} USD/mes
                                </p>
                            )}
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
                            <Label htmlFor="proof">Comprobante de Pago (imagen)</Label>
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
                                placeholder="Banco emisor, método utilizado u observaciones..."
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

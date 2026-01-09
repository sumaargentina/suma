"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format, addDays, parseISO, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Clinic, ClinicBranch, ClinicService } from "@/lib/types";
import { getClinicBySlug, getClinicBranches, getClinicServices, addAppointment, getServiceAppointments } from "@/lib/supabaseService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeaderWrapper, BottomNav } from "@/components/header";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Phone, Clock, Building2, ArrowLeft, CheckCircle, CalendarDays, CreditCard, Banknote, Wallet, Copy } from "lucide-react";

// Time slot generation
const generateTimeSlots = (start: string, end: string, durationMinutes: number): string[] => {
    const slots: string[] = [];
    let current = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);

    while (current < endTime) {
        slots.push(current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
        current.setMinutes(current.getMinutes() + durationMinutes);
    }
    return slots;
};

export default function ServiceBookingPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const slug = params?.slug as string;
    const serviceId = params?.serviceId as string;

    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [service, setService] = useState<ClinicService | null>(null);
    const [branch, setBranch] = useState<ClinicBranch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [step, setStep] = useState<'selectDateTime' | 'selectServices' | 'payment' | 'confirmation'>('selectDateTime');

    // Booking state
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'mercadopago' | null>(null);

    // New state for item selection
    const [selectedItemIndices, setSelectedItemIndices] = useState<number[]>([]);
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null); // Using any temporarily to avoid import issues if Coupon is not exported
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);

    useEffect(() => {
        if (slug && serviceId) {
            loadData();
        }
    }, [slug, serviceId]);

    // Load booked slots when date changes
    useEffect(() => {
        const loadBookedSlots = async () => {
            if (!service || !selectedDate) return;

            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            try {
                const appointments = await getServiceAppointments(service.id, dateStr);
                const booked = appointments
                    .filter(app => app.patientConfirmationStatus !== 'Cancelada')
                    .map(app => app.time);
                setBookedSlots(booked);
            } catch (error) {
                console.error("Error loading booked slots:", error);
            }
        };

        loadBookedSlots();
    }, [selectedDate, service]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const clinicData = await getClinicBySlug(slug);
            if (!clinicData) {
                notFound();
                return;
            }
            setClinic(clinicData);

            const [servicesData, branchesData] = await Promise.all([
                getClinicServices(clinicData.id),
                getClinicBranches(clinicData.id)
            ]);

            const foundService = servicesData.find(s => s.id === serviceId);
            if (!foundService) {
                notFound();
                return;
            }
            setService(foundService);

            // Find the branch associated with this service
            const foundBranch = branchesData.find(b => b.id === foundService.branchId);
            setBranch(foundBranch || null);

        } catch (error) {
            console.error("Error loading service data:", error);
        } finally {
            setIsLoading(false);
        }
    };


    // Calculate total price
    const totalPrice = useMemo(() => {
        if (!service) return 0;
        const base = service.price || 0;
        const extras = selectedItemIndices.reduce((acc, idx) => {
            return acc + (service.items?.[idx]?.price || 0);
        }, 0);
        const subtotal = base + extras;

        if (appliedCoupon) {
            if (appliedCoupon.discountType === 'percentage') {
                const discount = subtotal * (appliedCoupon.value / 100);
                return Math.max(0, subtotal - discount);
            } else {
                return Math.max(0, subtotal - appliedCoupon.value);
            }
        }
        return subtotal;
    }, [service, selectedItemIndices, appliedCoupon]);

    const handleApplyCoupon = () => {
        if (!couponCode.trim()) return;

        const coupons = clinic?.coupons || [];
        const found = coupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.isActive);

        if (!found) {
            toast({ variant: 'destructive', title: 'Cupón no válido', description: 'El código ingresado no existe o ha expirado.' });
            return;
        }

        // Validate dates
        const now = new Date();
        if (new Date(found.validFrom) > now || new Date(found.validTo) < now) {
            toast({ variant: 'destructive', title: 'Cupón vencido', description: 'Este cupón ya no es válido.' });
            return;
        }

        setAppliedCoupon(found);
        toast({ title: 'Cupón aplicado', description: `Se ha aplicado un descuento de ${found.discountType === 'percentage' ? `${found.value}%` : `$${found.value}`}` });
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        toast({ title: 'Cupón eliminado' });
    };

    const handleToggleItem = (index: number) => {
        setSelectedItemIndices(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    // Generate available dates (next 30 days, excluding Sundays)
    const availableDates = useMemo(() => {
        const dates: Date[] = [];
        const today = startOfDay(new Date());
        for (let i = 1; i <= 30; i++) {
            const date = addDays(today, i);
            if (date.getDay() !== 0) { // Exclude Sundays
                dates.push(date);
            }
        }
        return dates;
    }, []);

    // Generate time slots (simplified for MVP - 8AM to 5PM)
    const timeSlots = useMemo(() => {
        if (!service) return [];
        const allSlots = generateTimeSlots("08:00", "17:00", service.duration || 30);

        // Filter out booked slots
        return allSlots.filter(slot => !bookedSlots.includes(slot));
    }, [service, bookedSlots]);

    const handleDateTimeContinue = () => {
        // Verificar que el usuario esté logueado como paciente
        if (!user) {
            toast({ variant: 'destructive', title: 'Iniciar Sesión Requerido', description: 'Debes iniciar sesión para continuar con la reserva.' });
            router.push('/auth/login');
            return;
        }

        if (user.role !== 'patient') {
            toast({ variant: 'destructive', title: 'Acceso Restringido', description: 'Solo los pacientes pueden agendar citas.' });
            return;
        }

        if (service?.items && service.items.length > 0) {
            setStep('selectServices');
        } else {
            setStep('payment');
        }
    };

    const handleSubmit = async () => {
        if (!selectedDate || !selectedTime) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor completa todos los campos.' });
            return;
        }

        if (!user) {
            toast({ variant: 'destructive', title: 'Iniciar Sesión Requerido', description: 'Debes iniciar sesión para agendar.' });
            router.push('/auth/login');
            return;
        }

        if (!paymentMethod) {
            toast({ variant: 'destructive', title: 'Método de Pago', description: 'Selecciona una forma de pago para continuar.' });
            return;
        }

        setIsSubmitting(true);
        try {
            // Construct services array compatible with Appointment type
            const appointmentServices: any[] = [{
                id: service!.id,
                name: service!.name,
                price: service!.price,
                duration: service!.duration
            }];

            selectedItemIndices.forEach(idx => {
                const item = service!.items![idx];
                appointmentServices.push({
                    id: `${service!.id}-item-${idx}`,
                    name: item.name,
                    price: item.price
                });
            });

            const finalServiceName = `${service!.name}${selectedItemIndices.length > 0 ? ` (+${selectedItemIndices.length} extras)` : ''}`;

            await addAppointment({
                patientId: user.id,
                patientName: user.name,
                doctorId: undefined, // Explicit
                doctorName: clinic!.name, // Show clinic name in place of doctor name
                clinicServiceId: service!.id,
                serviceName: finalServiceName,
                date: format(selectedDate!, 'yyyy-MM-dd'),
                time: selectedTime!,
                totalPrice: totalPrice,
                consultationFee: 0,
                paymentMethod: paymentMethod!,
                paymentStatus: 'Pendiente',
                paymentProof: null,
                attendance: 'Pendiente',
                patientConfirmationStatus: 'Pendiente',
                services: appointmentServices,
                messages: [],
                appliedCoupon: appliedCoupon?.code,
                clinicalNotes: selectedItemIndices.length > 0
                    ? `Items adicionales: ${selectedItemIndices.map(i => service!.items![i].name).join(', ')}`
                    : undefined
            });

            toast({ title: '¡Cita Agendada!', description: 'Te hemos enviado los detalles por email.' });
            setStep('confirmation');

        } catch (error: any) {
            console.error("Booking error:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo agendar la cita.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copiado', description: 'Copiado al portapapeles' });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!clinic || !service) {
        return notFound();
    }

    // Default payment settings if none exist or empty object
    const paymentSettings = clinic.paymentSettings || {
        cash: { enabled: true },
        transfer: { enabled: false },
        mercadopago: { enabled: false }
    };

    const anyPaymentMethodAvailable = paymentSettings.cash?.enabled || paymentSettings.transfer?.enabled || paymentSettings.mercadopago?.enabled;

    return (
        <>
            <HeaderWrapper />
            <main className="min-h-screen bg-background pb-20 md:pb-0">
                <div className="container mx-auto px-4 py-8 max-w-3xl">
                    {/* Back Button */}
                    <Button variant="ghost" asChild className="mb-4">
                        <Link href={`/clinica/${slug}`}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver a {clinic.name}
                        </Link>
                    </Button>

                    {/* Service Header */}
                    <Card className="mb-6">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl">{service.name}</CardTitle>
                                    <CardDescription>{clinic.name}</CardDescription>
                                </div>
                                <Badge variant="secondary">{service.serviceCategory || "General"}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-4 w-4" /> {service.duration} min
                            </div>
                            <div className="flex items-center gap-1 text-green-600 font-semibold text-lg">
                                ${totalPrice}
                            </div>
                            {branch && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Building2 className="h-4 w-4" /> {branch.name}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Step 1: Booking Date & Time */}
                    {step === 'selectDateTime' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>1. Selecciona Fecha y Hora</CardTitle>
                                <CardDescription>Elige el momento ideal para tu cita.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Calendar */}
                                <div className="flex justify-center">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        disabled={(date) =>
                                            isBefore(date, startOfDay(new Date())) ||
                                            date.getDay() === 0
                                        }
                                        locale={es}
                                        className="rounded-md border"
                                    />
                                </div>

                                {/* Time Slots */}
                                {selectedDate && (
                                    <div>
                                        <Label className="mb-2 block">Horarios disponibles para {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</Label>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                            {timeSlots.map((time) => (
                                                <Button
                                                    key={time}
                                                    variant={selectedTime === time ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setSelectedTime(time)}
                                                >
                                                    {time}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2">
                                <Button
                                    className="w-full"
                                    disabled={!selectedDate || !selectedTime}
                                    onClick={handleDateTimeContinue}
                                >
                                    Siguiente Paso
                                </Button>
                                {!user && selectedDate && selectedTime && (
                                    <p className="text-xs text-center text-muted-foreground">
                                        * Debes <a href="/auth/login" className="text-primary underline">iniciar sesión</a> para continuar
                                    </p>
                                )}
                            </CardFooter>
                        </Card>
                    )}

                    {/* Step 2: Service Options / Sub-services Selection (Only if items exist) */}
                    {step === 'selectServices' && service.items && (
                        <Card className="border-blue-100 bg-blue-50/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-blue-600" />
                                    2. Personaliza tu servicio
                                </CardTitle>
                                <CardDescription>Selecciona los estudios o ítems específicos que necesitas.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="bg-white rounded-lg border p-4">
                                    {service.items.map((item, idx) => (
                                        <div key={idx} className={`flex items-start space-x-3 p-3 rounded-md transition-colors ${selectedItemIndices.includes(idx) ? 'bg-blue-50/50' : ''}`}>
                                            <Checkbox
                                                id={`item-${idx}`}
                                                checked={selectedItemIndices.includes(idx)}
                                                onCheckedChange={() => handleToggleItem(idx)}
                                                className="mt-1"
                                            />
                                            <div className="grid gap-1.5 leading-none flex-1">
                                                <label
                                                    htmlFor={`item-${idx}`}
                                                    className="text-sm font-medium leading-none cursor-pointer"
                                                >
                                                    {item.name}
                                                </label>
                                                <p className="text-xs text-muted-foreground">
                                                    Costo adicional: ${item.price}
                                                </p>
                                            </div>
                                            <div className="font-semibold text-green-700">
                                                +${item.price}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-100">
                                    <span className="font-medium text-green-900">Total a pagar estimado:</span>
                                    <span className="text-2xl font-bold text-green-700">${totalPrice}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep('selectDateTime')}>
                                    Atrás
                                </Button>
                                <Button className="flex-1" onClick={() => setStep('payment')}>
                                    Continuar
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Step 3: Payment */}
                    {step === 'payment' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>3. Confirma tu Reserva</CardTitle>
                                <CardDescription>
                                    Revisa los detalles y selecciona tu forma de pago.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Coupon Section */}
                                <div className="space-y-2">
                                    <Label>Código de Descuento</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                placeholder="Ingresa tu cupón"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                disabled={!!appliedCoupon}
                                            />
                                            {appliedCoupon && (
                                                <div className="absolute right-3 top-2.5 text-green-600">
                                                    <CheckCircle className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                        {appliedCoupon ? (
                                            <Button variant="outline" onClick={handleRemoveCoupon} className="text-red-500 border-red-200 hover:bg-red-50">
                                                Quitar
                                            </Button>
                                        ) : (
                                            <Button variant="outline" onClick={handleApplyCoupon} disabled={!couponCode}>
                                                Aplicar
                                            </Button>
                                        )}
                                    </div>
                                    {appliedCoupon && (
                                        <p className="text-sm text-green-600 flex items-center gap-1">
                                            Descuento aplicado: {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.value}%` : `$${appliedCoupon.value}`}
                                        </p>
                                    )}
                                </div>

                                {/* Summary Box */}
                                <div className="bg-muted/30 border rounded-lg p-4 text-sm space-y-2">
                                    <div className="flex justify-between font-medium text-base">
                                        <span>Total a Pagar</span>
                                        <span className="text-primary">${totalPrice}</span>
                                    </div>
                                    <div className="border-t pt-2 mt-2 space-y-1 text-muted-foreground">
                                        <p><span className="font-semibold text-foreground">Paciente:</span> {user?.name}</p>
                                        <p><span className="font-semibold text-foreground">Fecha:</span> {format(selectedDate!, "EEEE d 'de' MMMM", { locale: es })}</p>
                                        <p><span className="font-semibold text-foreground">Hora:</span> {selectedTime}</p>
                                        <p><span className="font-semibold text-foreground">Servicio:</span> {service.name} {selectedItemIndices.length > 0 ? `(+${selectedItemIndices.length} items)` : ''}</p>
                                    </div>
                                </div>

                                {/* Payment Methods */}
                                <div className="space-y-3">
                                    <Label className="text-base">Método de Pago</Label>
                                    {!anyPaymentMethodAvailable && (
                                        <p className="text-sm text-red-500 bg-red-50 p-3 rounded border border-red-100">
                                            No hay métodos de pago habilitados. Comunícate con la clínica.
                                        </p>
                                    )}
                                    <div className="grid gap-3">
                                        {/* Efectivo */}
                                        {paymentSettings.cash?.enabled && (
                                            <div
                                                className={`border p-4 rounded-lg cursor-pointer flex items-start gap-3 transition-colors hover:bg-muted/50 ${paymentMethod === 'efectivo' ? 'border-green-500 bg-green-50/50 ring-1 ring-green-500' : ''}`}
                                                onClick={() => setPaymentMethod('efectivo')}
                                            >
                                                <div className="bg-green-100 p-2 rounded-full text-green-700">
                                                    <Banknote className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">Efectivo en Consultorio</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{paymentSettings.cash.description || "Pagas al momento de tu cita."}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Transferencia */}
                                        {paymentSettings.transfer?.enabled && (
                                            <div
                                                className={`border p-4 rounded-lg cursor-pointer flex items-start gap-3 transition-colors hover:bg-muted/50 ${paymentMethod === 'transferencia' ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : ''}`}
                                                onClick={() => setPaymentMethod('transferencia')}
                                            >
                                                <div className="bg-blue-100 p-2 rounded-full text-blue-700">
                                                    <Building2 className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold">Transferencia Bancaria</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Te mostraremos los datos bancarios.</p>

                                                    {/* Bank Details Dropdown */}
                                                    {paymentMethod === 'transferencia' && (
                                                        <div className="mt-3 bg-white border rounded-md p-3 text-sm text-foreground space-y-1 animate-in fade-in slide-in-from-top-2 cursor-default" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">CBU:</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono select-all">{paymentSettings.transfer.cbu}</span>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); copyToClipboard(paymentSettings.transfer!.cbu!); }}>
                                                                        <Copy className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            {paymentSettings.transfer.alias && (
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-muted-foreground">Alias:</span>
                                                                    <span className="font-mono font-medium select-all">{paymentSettings.transfer.alias}</span>
                                                                </div>
                                                            )}
                                                            {paymentSettings.transfer.bank && (
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-muted-foreground">Banco:</span>
                                                                    <span>{paymentSettings.transfer.bank}</span>
                                                                </div>
                                                            )}
                                                            <p className="text-xs text-amber-600 mt-2 pt-2 border-t border-amber-100">
                                                                * Envía el comprobante por WhatsApp tras confirmar.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Mercado Pago */}
                                        {paymentSettings.mercadopago?.enabled && (
                                            <div
                                                className={`border p-4 rounded-lg cursor-pointer flex items-start gap-3 transition-colors hover:bg-muted/50 ${paymentMethod === 'mercadopago' ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500' : ''}`}
                                                onClick={() => setPaymentMethod('mercadopago')}
                                            >
                                                <div className="bg-sky-100 p-2 rounded-full text-sky-700">
                                                    <Wallet className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold">Mercado Pago</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Paga online de forma segura.</p>
                                                    {paymentMethod === 'mercadopago' && paymentSettings.mercadopago.link && (
                                                        <div className="mt-2">
                                                            <Button size="sm" variant="outline" className="w-full text-sky-700 border-sky-200 hover:bg-sky-50" asChild onClick={(e) => e.stopPropagation()}>
                                                                <a href={paymentSettings.mercadopago.link} target="_blank" rel="noopener noreferrer">
                                                                    Ir a Pagar
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </CardContent>
                            <CardFooter className="flex gap-2">
                                <Button variant="outline" onClick={() => service.items && service.items.length > 0 ? setStep('selectServices') : setStep('selectDateTime')} disabled={isSubmitting}>
                                    Atrás
                                </Button>
                                <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting || !paymentMethod}>
                                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Confirmar Cita
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {step === 'confirmation' && (
                        <Card>
                            <CardContent className="py-8 space-y-6">
                                {/* Success Header */}
                                <div className="text-center">
                                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-green-700">¡Cita Confirmada!</h2>
                                    <p className="text-muted-foreground mt-1">Tu reserva ha sido registrada exitosamente</p>
                                </div>

                                {/* Appointment Details Card */}
                                <div className="bg-slate-50 border rounded-lg p-5 space-y-4 max-w-md mx-auto">
                                    <h3 className="font-semibold text-slate-700 border-b pb-2 mb-3">Detalles de tu Cita</h3>

                                    {/* Clinic Info */}
                                    <div className="flex items-start gap-3">
                                        <Building2 className="h-5 w-5 text-primary mt-0.5" />
                                        <div>
                                            <p className="font-medium">{clinic.name}</p>
                                            {branch && (
                                                <p className="text-sm text-muted-foreground">{branch.name}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Service */}
                                    <div className="flex items-start gap-3">
                                        <CalendarDays className="h-5 w-5 text-primary mt-0.5" />
                                        <div>
                                            <p className="font-medium">{service.name}</p>
                                            {selectedItemIndices.length > 0 && (
                                                <p className="text-sm text-muted-foreground">
                                                    +{selectedItemIndices.length} item(s) adicionales
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Date & Time */}
                                    <div className="flex items-start gap-3">
                                        <Clock className="h-5 w-5 text-primary mt-0.5" />
                                        <div>
                                            <p className="font-medium">{format(selectedDate!, "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
                                            <p className="text-sm text-muted-foreground">Hora: {selectedTime}</p>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    {branch && (
                                        <div className="flex items-start gap-3">
                                            <MapPin className="h-5 w-5 text-primary mt-0.5" />
                                            <div>
                                                <p className="font-medium">{branch.address}</p>
                                                <p className="text-sm text-muted-foreground">{branch.city}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment Method */}
                                    <div className="flex items-start gap-3 pt-3 border-t">
                                        {paymentMethod === 'efectivo' && <Banknote className="h-5 w-5 text-green-600 mt-0.5" />}
                                        {paymentMethod === 'transferencia' && <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />}
                                        {paymentMethod === 'mercadopago' && <Wallet className="h-5 w-5 text-sky-600 mt-0.5" />}
                                        <div>
                                            <p className="font-medium">
                                                {paymentMethod === 'efectivo' && 'Pago en Efectivo'}
                                                {paymentMethod === 'transferencia' && 'Transferencia Bancaria'}
                                                {paymentMethod === 'mercadopago' && 'Mercado Pago'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">Estado: Pendiente de pago</p>
                                        </div>
                                    </div>

                                    {/* Total */}
                                    <div className="flex justify-between items-center pt-3 border-t bg-green-50 -mx-5 -mb-5 px-5 py-4 rounded-b-lg">
                                        <span className="font-semibold text-green-800">Total a Pagar:</span>
                                        <span className="text-2xl font-bold text-green-700">${totalPrice}</span>
                                    </div>
                                </div>

                                {/* Next Steps */}
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg max-w-md mx-auto text-sm">
                                    <p className="font-semibold text-amber-800 mb-2">📋 Próximos Pasos:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-amber-700">
                                        <li>Recibirás un email con los detalles de tu cita.</li>
                                        {paymentMethod === 'transferencia' && (
                                            <li><strong>Importante:</strong> Envía tu comprobante de transferencia por WhatsApp.</li>
                                        )}
                                        {paymentMethod === 'efectivo' && (
                                            <li>Recuerda llevar el monto exacto en efectivo a tu cita.</li>
                                        )}
                                        {paymentMethod === 'mercadopago' && (
                                            <li>Completa el pago en Mercado Pago para confirmar tu reserva.</li>
                                        )}
                                        <li>Puedes ver y gestionar tu cita desde tu panel de paciente.</li>
                                    </ul>
                                </div>

                                {/* Clinic Contact (if available) */}
                                {(clinic.phone || clinic.whatsapp) && (
                                    <div className="text-center text-sm text-muted-foreground">
                                        <p>¿Alguna consulta? Contacta a la clínica:</p>
                                        <p className="font-medium text-foreground">
                                            {clinic.phone && <span>📞 {clinic.phone}</span>}
                                            {clinic.phone && clinic.whatsapp && ' | '}
                                            {clinic.whatsapp && <span>💬 {clinic.whatsapp}</span>}
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                                    <Button asChild>
                                        <Link href="/dashboard">Ir a Mis Citas</Link>
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <Link href={`/clinica/${slug}`}>Ver más servicios</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main >
            <BottomNav />
        </>
    );
}

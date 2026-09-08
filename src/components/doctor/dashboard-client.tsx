"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useSearchParams } from 'next/navigation';
import { HeaderWrapper } from '@/components/header';
import * as supabaseService from '@/lib/supabaseService';
import { createWalkInAppointmentAction, sendMessageAction } from '@/app/actions';
import { EXPENSE_CATEGORIES, DOCUMENT_TYPES, DocumentType } from '@/lib/types';
import { CountryCodeSelect } from '@/components/ui/country-code-select';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, MessageCircle, CreditCard, Send, AlertCircle, Info, ArrowDown, UserPlus } from 'lucide-react';
import { useSettings } from '@/lib/settings';
import { useDoctorNotifications } from '@/lib/doctor-notifications';
import { useChatNotifications } from '@/lib/chat-notifications';
import { } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { z } from 'zod';

import { AppointmentsTab } from './dashboard/tabs/appointments-tab';
import { PatientsTab } from './dashboard/tabs/patients-tab';
import { FinancesTab } from './dashboard/tabs/finances-tab';
import { SubscriptionTab } from './dashboard/tabs/subscription-tab';
import { ProfileTab } from './dashboard/tabs/profile-tab';

import { ScheduleTab } from './dashboard/tabs/schedule-tab';
import { AddressesTab } from './dashboard/tabs/addresses-tab';
import { BankDetailsTab } from './dashboard/tabs/bank-details-tab';
import { CouponsTab } from './dashboard/tabs/coupons-tab';
import { ChatTab } from './dashboard/tabs/chat-tab';
import { OnlineConsultationTab } from './dashboard/tabs/online-consultation-tab';
import { SupportTab } from './dashboard/tabs/support-tab';
import { AppointmentDetailDialog } from '@/components/doctor/appointment-detail-dialog';
import { Skeleton } from '../ui/skeleton';
import { PaymentIntegrationsTab } from './dashboard/tabs/payment-integrations-tab';
import { InsurancesTab } from './dashboard/tabs/insurances-tab';
import { WorkspaceSelectorModal } from '@/components/doctor/workspace-selector-modal';
import { DoctorWelcomeModal } from '@/components/doctor/doctor-welcome-modal';
import { format } from 'date-fns';

const BankDetailFormSchema = z.object({
    bank: z.string().min(3, "El nombre del banco es requerido."),
    accountHolder: z.string().min(3, "El nombre del titular es requerido."),
    idNumber: z.string().min(5, "El C.I./R.I.F. es requerido."),
    accountNumber: z.string().min(20, "El número de cuenta debe tener 20 dígitos.").max(20, "El número de cuenta debe tener 20 dígitos."),
    description: z.string().nullable().optional(),
});

const ServiceFormSchema = z.object({
    name: z.string().min(3, "El nombre del servicio es requerido."),
    price: z.preprocess((val) => Number(val), z.number().min(0, "El precio no puede ser negativo.")),
});

const CouponFormSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    code: z.string().min(3, "El código debe tener al menos 3 caracteres.").toUpperCase(),
    discountType: z.enum(['percentage', 'fixed']),
    value: z.preprocess((val) => Number(val), z.number().positive("El valor debe ser positivo.")),
});

const ExpenseFormSchema = z.object({
    date: z.string().min(1, "La fecha es requerida."),
    description: z.string().min(3, "La descripción es requerida."),
    amount: z.preprocess((val) => Number(val), z.number().positive("El monto debe ser un número positivo.")),
});

const SupportTicketSchema = z.object({
    subject: z.string().min(5, "El asunto debe tener al menos 5 caracteres."),
    description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
});

const PasswordChangeSchema = z.object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida."),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Las nuevas contraseñas no coinciden.",
    path: ["confirmPassword"],
});

function DashboardLoading() {
    return (
        <>
            <HeaderWrapper />
            <main className="flex-1 container py-12">
                <div className="mb-8">
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </div>
                <div className="flex items-center gap-4 mb-8">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <Skeleton className="h-96 w-full" />
            </main>
        </>
    );
}

function capitalizeWords(str: string) {
    return str.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function DoctorDashboardClient({ currentTab }: { currentTab: string }) {
    const { user, loading, changePassword, activeWorkspace } = useAuth();
    const searchParams = useSearchParams();
    const ticketIdParam = searchParams.get('ticketId');
    const chatPatientIdParam = searchParams.get('chatPatientId');
    const appointmentIdParam = searchParams.get('appointmentId');
    const isClinicDoctor = user?.role === 'doctor' && (user?.isClinicEmployee || activeWorkspace?.workspaceType === 'clinic' || activeWorkspace?.workspaceType === 'public_hospital' || (activeWorkspace && !activeWorkspace.canManageFinances));

    const { toast } = useToast();


    const { cities, settings } = useSettings();
    const { } = useDoctorNotifications();
    const { updateUnreadChatCount } = useChatNotifications();

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [doctorData, setDoctorData] = useState<Doctor | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
    const [doctorPayments, setDoctorPayments] = useState<DoctorPayment[]>([]);

    // Dialog states
    const [isAppointmentDetailOpen, setIsAppointmentDetailOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
    const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
    const [isBankDetailDialogOpen, setIsBankDetailDialogOpen] = useState(false);
    const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
    const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
    const [isSupportDetailOpen, setIsSupportDetailOpen] = useState(false);
    const [isPaymentReportOpen, setIsPaymentReportOpen] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isWalkInDialogOpen, setIsWalkInDialogOpen] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    // Comprobar si el médico necesita completar su bienvenida/onboarding
    useEffect(() => {
        if (user && user.role === 'doctor') {
            const isWelcomeParam = searchParams.get('welcome') === 'true';
            const isProfileIncomplete = !user.onboardingCompleted && (!user.specialty || user.specialty === 'Pendiente' || !user.medicalLicense);
            if (isWelcomeParam || isProfileIncomplete) {
                setShowWelcomeModal(true);
            }
        }
    }, [user, searchParams]);

    // Entity states for dialogs
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [editingBankDetail, setEditingBankDetail] = useState<BankDetail | null>(null);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [selectedSupportTicket, setSelectedSupportTicket] = useState<AdminSupportTicket | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'expense' | 'service' | 'bank' | 'coupon', id: string } | null>(null);

    // Form states
    const [chatMessage, setChatMessage] = useState("");
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [selectedWalkInOffice, setSelectedWalkInOffice] = useState<string>('');
    const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
    const [isReportingPayment, setIsReportingPayment] = useState(false);
    const [showNewOfficeInput, setShowNewOfficeInput] = useState(false);
    const [newOfficeName, setNewOfficeName] = useState("");

    // Walk-in patient form states
    const [walkInDocType, setWalkInDocType] = useState<DocumentType>('Cédula');
    const [walkInCedulaPrefix, setWalkInCedulaPrefix] = useState<'V' | 'E'>('V');
    const [walkInDocNumber, setWalkInDocNumber] = useState('');
    const [walkInPhoneCountryCode, setWalkInPhoneCountryCode] = useState('+58');
    const [walkInPhoneNumber, setWalkInPhoneNumber] = useState('');

    useEffect(() => {
        if (!isWalkInDialogOpen) {
            setSelectedWalkInOffice('');
            setWalkInDocType('Cédula');
            setWalkInCedulaPrefix('V');
            setWalkInDocNumber('');
            setWalkInPhoneCountryCode('+58');
            setWalkInPhoneNumber('');
        }
    }, [isWalkInDialogOpen]);

    // Referencia para el scroll automático en el chat
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    // Función para recargar los datos principales del dashboard
    const fetchData = useCallback(async () => {
        if (!user || user.role !== 'doctor' || !user.id) return;
        setIsLoadingData(true);
        try {
            const clinicId = activeWorkspace?.clinicId || null;
            const wsType = activeWorkspace?.workspaceType || (user.isClinicEmployee ? 'clinic' : 'private');

            const [doc, apps, tickets, payments] = await Promise.all([
                supabaseService.getDoctor(user.id),
                supabaseService.getDoctorAppointments(user.id, clinicId, wsType),
                supabaseService.getSupportTickets(),
                supabaseService.getDoctorPayments(),
            ]);
            console.log('📋 Doctor data loaded:', doc?.name, 'Workspace:', wsType, 'ClinicId:', clinicId, 'Appointments:', apps.length);
            setDoctorData(doc);
            setAppointments(apps);
            setSupportTickets(tickets.filter(t => t.userId === user.email));
            setDoctorPayments(payments.filter(p => p.doctorId === user.id));
        } finally {
            setIsLoadingData(false);
        }
    }, [user, activeWorkspace]);

    // Cargar datos al montar el componente o cuando cambie el usuario o el espacio de trabajo activo
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-open Support Ticket
    useEffect(() => {
        if (!isLoadingData && supportTickets.length > 0 && ticketIdParam) {
            const ticket = supportTickets.find(t => t.id === ticketIdParam);
            if (ticket) {
                setSelectedSupportTicket(ticket);
                setIsSupportDetailOpen(true);

                // Limpiar param de la URL para evitar re-abrir al refrescar (opcional, pero buena práctica)
                // window.history.replaceState(null, '', window.location.pathname + '?view=support'); 
                // Mejor no manipular historial directamente en React si no es crítico.
            }
        }
    }, [isLoadingData, supportTickets, ticketIdParam]);

    // Auto-open Appointment
    useEffect(() => {
        if (!isLoadingData && appointments.length > 0 && appointmentIdParam) {
            const appt = appointments.find(a => a.id === appointmentIdParam);
            if (appt) {
                setSelectedAppointment(appt);
                setIsAppointmentDetailOpen(true);
            }
        }
    }, [isLoadingData, appointments, appointmentIdParam]);

    // Obtener lista de consultorios registrados del médico (desde módulo Addresses)
    const uniqueOffices = useMemo(() => {
        if (isClinicDoctor) return [];
        if (!doctorData || !doctorData.addresses) return [];
        return doctorData.addresses.map(addr => addr.address);
    }, [doctorData, isClinicDoctor]);

    // Calcular servicios disponibles para Walk-in
    const walkInServices = useMemo(() => {
        if (!selectedWalkInOffice || !doctorData) return doctorData?.services || [];

        const address = doctorData.addresses?.find(addr => addr.address === selectedWalkInOffice);
        if (address && address.services && address.services.length > 0) {
            return address.services;
        }

        return doctorData.services;
    }, [selectedWalkInOffice, doctorData]);

    // Calcular nombre del paciente para chat inicial
    const chatPatientName = useMemo(() => {
        if (!chatPatientIdParam) return null;
        const appt = appointments.find(a => a.patientId === chatPatientIdParam);
        return appt ? appt.patientName : null;
    }, [chatPatientIdParam, appointments]);

    // Mapa de tarifas de suscripción por ciudad
    const cityFeesMap = useMemo(() => new Map(cities.map(c => [c.name, c.subscriptionFee])), [cities]);

    // Función para actualizar una cita y recargar los datos
    const handleUpdateAppointment = async (id: string, data: Partial<Appointment>) => {
        await supabaseService.updateAppointment(id, data);
        await fetchData();
        if (selectedAppointment && selectedAppointment.id === id) {
            setSelectedAppointment(prev => prev ? { ...prev, ...data } : null);
        }
        toast({ title: 'Cita actualizada' });
    };

    const handleOpenAppointmentDialog = (type: 'appointment' | 'chat', appointment: Appointment) => {
        setSelectedAppointment(appointment);
        if (type === 'appointment') setIsAppointmentDetailOpen(true);
        else if (type === 'chat') {
            setIsChatOpen(true);
            // Marcar mensajes como leídos cuando se abre el chat
            if (appointment.messages && appointment.messages.length > 0) {
                const lastMessage = appointment.messages[appointment.messages.length - 1];
                if (lastMessage.sender === 'patient' && !appointment.readByDoctor) {
                    supabaseService.updateAppointment(appointment.id, { readByDoctor: true });
                }
            }
        }
    };

    const handleSendMessage = async () => {
        if (!chatMessage.trim() || !selectedAppointment || !user) return;
        setIsSendingMessage(true);
        try {
            const result = await sendMessageAction(selectedAppointment.id, { sender: 'doctor', text: chatMessage.trim() });

            if (!result.success) throw new Error(result.error);

            setChatMessage("");
            await fetchData();
            const updatedAppointment = appointments.find(a => a.id === selectedAppointment.id);
            if (updatedAppointment) setSelectedAppointment(updatedAppointment);
            // Actualizar contador de chat no leído
            updateUnreadChatCount(appointments);
        } catch (error) {
            console.error('Error sending message:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje.' });
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleSaveEntity = async (type: 'expense' | 'service' | 'bank' | 'coupon', data: unknown) => {
        if (!doctorData) return;
        const listKey = type === 'bank' ? 'bankDetails' : type === 'coupon' ? 'coupons' : `${type}s` as 'expenses' | 'services';
        const list = (doctorData[listKey as keyof Doctor] || []) as unknown[];
        const editingEntity = type === 'expense' ? editingExpense : type === 'service' ? editingService : type === 'bank' ? editingBankDetail : editingCoupon;

        let newList;
        if (editingEntity) {
            newList = list.map(item => (typeof item === 'object' && item && 'id' in item && item.id === editingEntity.id) ? { ...item, ...(data as object) } : item);
        } else {
            newList = [...list, { ...(data as object), id: `${type}-${Date.now()}` }];
        }

        // Logs específicos para cupones
        if (type === 'coupon') {
            console.log('💾 Guardando cupón:', {
                doctorId: doctorData.id,
                cuponData: data,
                cuponesActuales: list.length,
                cuponesNuevos: newList.length,
                nuevoCupon: newList[newList.length - 1]
            });
        }

        await supabaseService.updateDoctor(doctorData.id, { [listKey]: newList });
        await fetchData();
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} guardado.` });

        if (type === 'expense') setIsExpenseDialogOpen(false);
        if (type === 'service') setIsServiceDialogOpen(false);
        if (type === 'bank') setIsBankDetailDialogOpen(false);
        if (type === 'coupon') setIsCouponDialogOpen(false);
    };

    const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            currentPassword: formData.get('currentPassword') as string,
            newPassword: formData.get('newPassword') as string,
            confirmPassword: formData.get('confirmPassword') as string
        };
        const result = PasswordChangeSchema.safeParse(data);
        if (!result.success) {
            toast({ variant: 'destructive', title: 'Error de Validación', description: result.error.errors.map(err => err.message).join(' ') });
            return;
        }
        const { success, message } = await changePassword(result.data.currentPassword, result.data.newPassword);
        if (success) {
            toast({ title: 'Éxito', description: message });
            setIsPasswordDialogOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: message });
        }
    }

    const handleDeleteItem = async () => {
        if (!itemToDelete || !doctorData) return;
        const { type, id } = itemToDelete;
        const listKey = type === 'bank' ? 'bankDetails' : type === 'coupon' ? 'coupons' : `${type}s` as 'expenses' | 'services';
        const list = (doctorData[listKey as keyof Doctor] || []) as unknown[];
        const newList = list.filter(item => (item as { id: string }).id !== id);

        await supabaseService.updateDoctor(doctorData.id, { [listKey]: newList });

        await fetchData();
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} eliminado.` });
    };

    const handleReportPayment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!doctorData) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la información del doctor.' });
            return;
        }

        if (!paymentProofFile) {
            toast({ variant: 'destructive', title: 'Falta el comprobante', description: 'Por favor, sube el archivo del comprobante de pago.' });
            return;
        }

        const formData = new FormData(e.currentTarget);
        const transactionId = formData.get('transactionId') as string;
        const amount = parseFloat(formData.get('amount') as string);
        const selectedAccount = formData.get('selectedAccount') as string;
        const paymentDate = formData.get('paymentDate') as string;
        const paymentMethod = formData.get('paymentMethod') as string;

        // Validaciones
        if (!transactionId.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El ID de transacción es requerido.' });
            return;
        }

        if (!selectedAccount) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar la cuenta bancaria de SUMA.' });
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'El monto debe ser un número válido mayor a 0.' });
            return;
        }

        // Validar tamaño del archivo (máximo 10MB)
        if (paymentProofFile.size > 10 * 1024 * 1024) {
            toast({ variant: 'destructive', title: 'Archivo muy grande', description: 'El archivo debe ser menor a 10MB.' });
            return;
        }

        setIsReportingPayment(true);
        try {
            // Subir archivo a Firebase Storage usando la función específica para comprobantes de pago
            const proofUrl = await supabaseService.uploadPaymentProof(paymentProofFile, `payment-proofs/${doctorData.id}/${Date.now()}_${paymentProofFile.name}`);

            // Extraer información de la cuenta bancaria seleccionada
            const [bankName, accountNumber] = selectedAccount.split('-');

            // Crear descripción detallada para facilitar la verificación del administrador
            const paymentDescription = `Pago de suscripción - ${doctorData.name} (${doctorData.cedula})
Monto: $${amount.toFixed(2)}
Cuenta SUMA: ${bankName} - ${accountNumber}
Método: ${paymentMethod}
Fecha pago: ${paymentDate}
ID Transacción: ${transactionId}`;

            await supabaseService.addDoctorPayment({
                doctorId: doctorData.id,
                doctorName: doctorData.name,
                date: paymentDate || new Date().toISOString().split('T')[0],
                amount: amount,
                status: 'Pending',
                transactionId,
                paymentProofUrl: proofUrl,
                // Agregar información adicional para facilitar verificación
                paymentMethod: paymentMethod,
                targetAccount: selectedAccount,
                paymentDescription: paymentDescription,
            });

            await supabaseService.updateDoctor(doctorData.id, { subscriptionStatus: 'pending_payment' });
            await fetchData();
            setIsPaymentReportOpen(false);
            setPaymentProofFile(null);
            toast({
                title: 'Pago Reportado Exitosamente',
                description: 'Tu pago está en revisión por el equipo de SUMA. Te notificaremos cuando sea aprobado.'
            });
        } catch (error) {
            console.error('Error reporting payment:', error);
            let errorMessage = 'No se pudo procesar tu pago. Inténtalo de nuevo.';
            if (error instanceof Error) {
                if (error.message.includes('FirebaseError')) {
                    errorMessage = 'Error de Firebase. Verifica tu conexión e inténtalo de nuevo.';
                } else if (error.message.includes('storage/unauthorized')) {
                    errorMessage = 'No tienes permisos para subir archivos. Contacta al administrador.';
                } else if (error.message.includes('storage/quota-exceeded')) {
                    errorMessage = 'Se ha excedido la cuota de almacenamiento. Contacta al administrador.';
                } else if (error.message.includes('storage/unauthenticated')) {
                    errorMessage = 'Debes estar autenticado para subir archivos. Inicia sesión nuevamente.';
                } else if (error.message.includes('storage/retry-limit-exceeded')) {
                    errorMessage = 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
                } else if (error.message.includes('El archivo debe ser')) {
                    errorMessage = error.message;
                } else if (error.message.includes('El archivo es demasiado grande')) {
                    errorMessage = error.message;
                } else {
                    errorMessage = `Error: ${error.message}`;
                }
            }
            toast({
                variant: 'destructive',
                title: 'Error al reportar pago',
                description: errorMessage
            });
        } finally {
            setIsReportingPayment(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || user.role !== 'doctor') return;
        const formData = new FormData(e.currentTarget);
        const data = { subject: formData.get('subject') as string, description: formData.get('description') as string };
        const result = SupportTicketSchema.safeParse(data);
        if (!result.success) {
            toast({ variant: 'destructive', title: 'Error de Validación', description: result.error.errors.map(err => err.message).join(' ') });
            return;
        }
        await supabaseService.addSupportTicket({ ...result.data, userId: user.email, userName: user.name, userRole: 'doctor', status: 'abierto', date: new Date().toISOString() });
        fetchData();
        setIsSupportDialogOpen(false);
        toast({ title: 'Ticket Enviado' });
    }

    const handleCreateTestTickets = async () => {
        try {
            await supabaseService.createTestSupportTickets();
            await fetchData();
            toast({ title: 'Tickets de Prueba Creados', description: 'Se han creado 4 tickets de ejemplo para que puedas probar la funcionalidad.' });
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron crear los tickets de prueba.' });
        }
    };

    // Handler for walk-in appointments
    const handleCreateWalkIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!doctorData) return;

        const formData = new FormData(e.currentTarget);
        const patientName = formData.get('patientName') as string;
        const patientEmail = formData.get('patientEmail') as string;
        const selectedServices = formData.getAll('services') as string[];
        const paymentMethod = formData.get('paymentMethod') as 'efectivo' | 'transferencia';
        const totalPrice = parseFloat(formData.get('totalPrice') as string);
        const office = formData.get('office') as string;

        // Validaciones
        if (!patientName || patientName.length < 3) {
            toast({ variant: 'destructive', title: 'Error', description: 'El nombre debe tener al menos 3 caracteres' });
            return;
        }

        if (!patientEmail || !patientEmail.includes('@')) {
            toast({ variant: 'destructive', title: 'Error', description: 'Email inválido' });
            return;
        }

        if (isNaN(totalPrice) || totalPrice <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'El monto debe ser mayor a 0' });
            return;
        }

        // Formatear Cédula / Documento
        const cleanDocNumber = walkInDocNumber.trim();
        const fullCedula = cleanDocNumber
            ? (walkInDocType === 'Cédula' ? `${walkInCedulaPrefix}-${cleanDocNumber}` : cleanDocNumber)
            : undefined;

        // Formatear Teléfono
        const cleanPhone = walkInPhoneNumber.trim();
        const fullPhone = cleanPhone
            ? `${walkInPhoneCountryCode} ${cleanPhone}`
            : undefined;

        try {
            const services = doctorData.services.filter(s => selectedServices.includes(s.name));

            const result = await createWalkInAppointmentAction({
                doctorId: doctorData.id,
                doctorName: doctorData.name,
                patientName,
                patientEmail,
                patientPhone: fullPhone,
                patientDNI: fullCedula,
                services,
                totalPrice,
                consultationFee: doctorData.consultationFee,
                paymentMethod,
                office: office || undefined,
            });

            if (!result.success) {
                throw new Error(result.error || 'Error al crear la cita');
            }

            toast({
                title: result.isNewPatient ? '✅ Paciente y cita creados' : '✅ Cita creada',
                description: result.isNewPatient
                    ? `Se creó la cuenta de ${patientName} con contraseña: Suma..00`
                    : `Cita registrada para ${patientName}`,
            });

            setIsWalkInDialogOpen(false);
            await fetchData();
        } catch (error) {
            console.error('Error creating walk-in:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'No se pudo registrar la cita walk-in',
            });
        }
    };

    const handleOpenWalkIn = () => {
        console.log("Opening walk-in dialog from dashboard");
        setIsWalkInDialogOpen(true);
    };

    useEffect(() => {
        if (isChatOpen && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isChatOpen, selectedAppointment?.messages]);

    if (loading || isLoadingData || !user || !doctorData) {
        return <DashboardLoading />;
    }

    const subscriptionFee = cityFeesMap.get(doctorData?.city) || 0;
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <HeaderWrapper />
            <WorkspaceSelectorModal />
            <main className="flex-1 bg-muted/40">
                <div className="container py-6 md:py-12 px-2 md:px-0">
                    <h1 className="text-lg md:text-3xl font-bold font-headline mb-1 md:mb-2">Panel del Médico</h1>
                    <p className="text-xs md:text-base text-muted-foreground mb-4 md:mb-8">Bienvenido de nuevo, Dr@:&nbsp;{capitalizeWords(user.name)}.</p>
                    <div className="mt-3 md:mt-6">
                        {/* Tabs y contenido */}
                        {currentTab === "appointments" && (
                            <AppointmentsTab
                                appointments={appointments}
                                onOpenDialog={handleOpenAppointmentDialog}
                                onOpenWalkInDialog={!isClinicDoctor ? handleOpenWalkIn : undefined}
                                offices={isClinicDoctor ? [] : uniqueOffices}
                                doctorAddresses={isClinicDoctor ? [] : (doctorData?.addresses || [])}
                            />
                        )}
                        {currentTab === "patients" && (
                            <PatientsTab appointments={appointments} />
                        )}
                        {currentTab === "finances" && (
                            !isClinicDoctor ? (
                                <FinancesTab doctorData={doctorData} appointments={appointments} onOpenExpenseDialog={(exp) => { setEditingExpense(exp); setIsExpenseDialogOpen(true); }} onDeleteItem={(type, id) => { setItemToDelete({ type, id }); setIsDeleteDialogOpen(true); }} />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">Esta sección es gestionada por la clínica.</div>
                            )
                        )}
                        {currentTab === "subscription" && (
                            !isClinicDoctor ? (
                                <SubscriptionTab doctorData={doctorData} doctorPayments={doctorPayments} onOpenPaymentDialog={() => setIsPaymentReportOpen(true)} subscriptionFee={subscriptionFee} />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">Esta sección es gestionada por la clínica.</div>
                            )
                        )}
                        {currentTab === "profile" && (
                            <ProfileTab
                                doctorData={doctorData}
                                onProfileUpdate={fetchData}
                                onOpenPasswordDialog={() => setIsPasswordDialogOpen(true)}
                            />
                        )}

                        {currentTab === "addresses" && (
                            !isClinicDoctor ? (
                                <AddressesTab doctorData={doctorData} onUpdate={fetchData} />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">Esta sección es gestionada por la clínica.</div>
                            )
                        )}
                        {currentTab === "insurances" && (
                            !isClinicDoctor ? (
                                <InsurancesTab />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">Las coberturas y convenios son administrados directamente por la clínica.</div>
                            )
                        )}
                        {currentTab === "bank-details" && (
                            !isClinicDoctor ? (
                                <div className="space-y-6">
                                    {(doctorData.country === 'AR' || doctorData.country === 'Argentina') ? (
                                        <>
                                            <PaymentIntegrationsTab doctorId={user.id} />
                                            <div className="border-t pt-6">
                                                <h3 className="text-lg font-semibold mb-4">Cuentas Bancarias (Para transferencias manuales)</h3>
                                                <BankDetailsTab bankDetails={doctorData.bankDetails || []} onOpenDialog={(bd) => { setEditingBankDetail(bd); setIsBankDetailDialogOpen(true); }} onDeleteItem={(type, id) => { setItemToDelete({ type, id }); setIsDeleteDialogOpen(true); }} />
                                            </div>
                                        </>
                                    ) : (
                                        <BankDetailsTab bankDetails={doctorData.bankDetails || []} onOpenDialog={(bd) => { setEditingBankDetail(bd); setIsBankDetailDialogOpen(true); }} onDeleteItem={(type, id) => { setItemToDelete({ type, id }); setIsDeleteDialogOpen(true); }} />
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">Esta sección es gestionada por la clínica.</div>
                            )
                        )}
                        {currentTab === "coupons" && (
                            !isClinicDoctor ? (
                                <CouponsTab coupons={doctorData.coupons || []} doctorId={doctorData.id} onOpenDialog={(c) => { setEditingCoupon(c); setIsCouponDialogOpen(true); }} onDeleteItem={(type, id) => { setItemToDelete({ type, id }); setIsDeleteDialogOpen(true); }} />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">Esta sección es gestionada por la clínica.</div>
                            )
                        )}
                        {currentTab === "chat" && <ChatTab appointments={appointments} onOpenChat={(appointment) => handleOpenAppointmentDialog('chat', appointment)} initialPatientId={chatPatientIdParam} initialPatientName={chatPatientName} />}
                        {currentTab === "online-consultation" && (
                            !isClinicDoctor ? (
                                <OnlineConsultationTab doctorData={doctorData} onUpdate={fetchData} />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">Esta sección es gestionada por la clínica.</div>
                            )
                        )}
                        {currentTab === "support" && (
                            !isClinicDoctor ? (
                                <SupportTab supportTickets={supportTickets} onViewTicket={(t) => { setSelectedSupportTicket(t); setIsSupportDetailOpen(true); }} onOpenTicketDialog={() => setIsSupportDialogOpen(true)} onCreateTestTickets={handleCreateTestTickets} />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">El soporte técnico institucional es canalizado directamente a través de la administración de la clínica.</div>
                            )
                        )}
                    </div>
                </div>
            </main>

            <AppointmentDetailDialog isOpen={isAppointmentDetailOpen} onOpenChange={setIsAppointmentDetailOpen} appointment={selectedAppointment} doctorServices={(() => {
                // Get services from the specific address if available
                if (selectedAppointment?.addressId && doctorData?.addresses) {
                    const address = doctorData.addresses.find(a => a.id === selectedAppointment.addressId);
                    if (address?.services && address.services.length > 0) {
                        return address.services;
                    }
                }
                // Fallback to doctor's general services
                return doctorData?.services || [];
            })()} onUpdateAppointment={handleUpdateAppointment} onOpenChat={handleOpenAppointmentDialog} />

            <Dialog open={isChatOpen} onOpenChange={(open) => {
                setIsChatOpen(open);
                if (!open) {
                    // Actualizar contador cuando se cierra el chat
                    updateUnreadChatCount(appointments);
                }
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle>Chat con {selectedAppointment?.patientName}</DialogTitle></DialogHeader>
                    <div className="p-4 h-96 flex flex-col gap-4 bg-muted/50 rounded-lg">
                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 relative">
                            {(selectedAppointment?.messages || []).map((msg, idx, arr) => {
                                const isLast = idx === arr.length - 1;
                                return (
                                    <div key={msg.id} ref={isLast ? chatEndRef : undefined} className={cn("flex items-end gap-2", msg.sender === 'doctor' && 'justify-end')}>
                                        {msg.sender === 'patient' && <Avatar className="h-8 w-8"><AvatarFallback>{selectedAppointment?.patientName?.charAt(0)}</AvatarFallback></Avatar>}
                                        <div className={cn("p-3 rounded-lg max-w-xs shadow-sm", msg.sender === 'doctor' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background rounded-bl-none')}>
                                            <p className="text-sm">{msg.text}</p><p className="text-xs text-right mt-1 opacity-70">{formatDistanceToNow(parseISO(msg.timestamp), { locale: es, addSuffix: true })}</p>
                                        </div>
                                        {msg.sender === 'doctor' && <Avatar className="h-8 w-8"><AvatarImage src={doctorData.profileImage || undefined} /><AvatarFallback>{doctorData.name.charAt(0)}</AvatarFallback></Avatar>}
                                    </div>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => {
                                    if (chatEndRef.current) {
                                        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                                className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/80 focus:outline-none"
                                aria-label="Ir al último mensaje"
                            >
                                <ArrowDown className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
                            <Input placeholder="Escribe tu mensaje..." className="flex-1" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} disabled={isSendingMessage} />
                            <Button type="submit" disabled={isSendingMessage || !chatMessage.trim()}>{isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                        </form>
                    </div>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cerrar</Button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent><DialogHeader><DialogTitle>Cambiar Contraseña</DialogTitle></DialogHeader>
                    <form onSubmit={handleChangePassword} className="space-y-4 py-4">
                        <div><Label htmlFor="currentPassword">Contraseña Actual</Label><Input id="currentPassword" name="currentPassword" type="password" required /></div>
                        <div><Label htmlFor="newPassword">Nueva Contraseña</Label><Input id="newPassword" name="newPassword" type="password" required /></div>
                        <div><Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label><Input id="confirmPassword" name="confirmPassword" type="password" required /></div>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit">Actualizar Contraseña</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isPaymentReportOpen} onOpenChange={setIsPaymentReportOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Reportar Pago de Suscripción
                        </DialogTitle>
                        <DialogDescription>
                            Completa la información para que verifiquemos tu pago. Asegúrate de que todos los datos sean correctos.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleReportPayment} className="space-y-6 py-4">
                        {/* Información de pago */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Monto de Suscripción</Label>
                                <Input value={`$${subscriptionFee.toFixed(2)}`} disabled className="bg-muted" />
                            </div>
                            <div>
                                <Label htmlFor="amount">Monto Exacto Pagado</Label>
                                <Input
                                    id="amount"
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    defaultValue={subscriptionFee}
                                    required
                                />
                            </div>
                        </div>

                        {/* Selección de cuenta bancaria */}
                        <div>
                            <Label htmlFor="selectedAccount" className="text-sm font-medium">
                                Cuenta Bancaria de SUMA a la que realizaste el pago *
                            </Label>
                            <Select name="selectedAccount" required>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecciona la cuenta bancaria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {settings?.companyBankDetails?.map((account, index) => (
                                        <SelectItem key={index} value={`${account.bank}-${account.accountNumber}`}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{account.bank}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {account.accountNumber} - {account.accountHolder}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                                Selecciona la cuenta bancaria de SUMA a la que realizaste la transferencia
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="transactionId">ID o Referencia de Transacción</Label>
                            <Input
                                id="transactionId"
                                name="transactionId"
                                placeholder="Ej: TXN123456789"
                                required
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Este es el número de referencia que te dio tu banco o método de pago
                            </p>
                        </div>

                        {/* Información adicional para facilitar verificación */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="paymentDate">Fecha del Pago</Label>
                                <Input
                                    id="paymentDate"
                                    name="paymentDate"
                                    type="date"
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="paymentMethod">Método de Pago</Label>
                                <Select name="paymentMethod" defaultValue="transferencia">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                                        <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                                        <SelectItem value="efectivo">Depósito en Efectivo</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="paymentProofFile">Comprobante de Pago</Label>
                            <Input
                                id="paymentProofFile"
                                type="file"
                                accept="image/*,.pdf"
                                required
                                onChange={(e) => setPaymentProofFile(e.target.files ? e.target.files[0] : null)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Sube una imagen (JPG, PNG, GIF, WebP) o PDF del comprobante de pago.
                                <br />
                                <span className="text-orange-600 font-medium">• Archivos menores a 1MB: Se guardan directamente en la base de datos</span>
                                <br />
                                <span className="text-blue-600 font-medium">• Archivos mayores a 1MB: Se suben a Firebase Storage</span>
                            </p>
                            {paymentProofFile && (
                                <p className="text-xs text-green-600 mt-1">
                                    ✓ Archivo seleccionado: {paymentProofFile.name} ({(paymentProofFile.size / 1024 / 1024).toFixed(2)}MB)
                                </p>
                            )}
                        </div>

                        {/* Nota informativa */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium mb-1">Información importante:</p>
                                    <ul className="space-y-1 text-xs">
                                        <li>• El pago será verificado por el equipo de SUMA en las próximas 24-48 horas</li>
                                        <li>• Asegúrate de que el comprobante sea claro y legible</li>
                                        <li>• El monto debe coincidir exactamente con el valor de la suscripción</li>
                                        <li>• Recibirás una notificación cuando el pago sea aprobado o rechazado</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isReportingPayment}>Cancelar</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isReportingPayment}>
                                {isReportingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isReportingPayment ? 'Subiendo archivo...' : 'Reportar Pago'}
                            </Button>
                            {isReportingPayment && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    ⏳ Subiendo archivo a Firebase Storage. Esto puede tomar unos segundos...
                                </p>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                <DialogContent><DialogHeader><DialogTitle>{editingService ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const data = { name: fd.get('name') as string, price: parseFloat(fd.get('price') as string) }; const result = ServiceFormSchema.safeParse(data); if (result.success) handleSaveEntity('service', result.data); else toast({ variant: 'destructive', title: 'Error', description: result.error.errors.map(e => e.message).join(' ') }) }} className="space-y-4 py-4">
                        <div><Label htmlFor="name">Nombre del Servicio</Label><Input id="name" name="name" defaultValue={editingService?.name || ''} required /></div>
                        <div><Label htmlFor="price">Precio ($)</Label><Input id="price" name="price" type="number" step="0.01" defaultValue={editingService?.price || ''} required /></div>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit">Guardar</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isBankDetailDialogOpen} onOpenChange={setIsBankDetailDialogOpen}>
                <DialogContent><DialogHeader><DialogTitle>{editingBankDetail ? 'Editar Cuenta' : 'Nueva Cuenta'}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const data = { bank: fd.get('bank') as string, accountHolder: fd.get('accountHolder') as string, idNumber: fd.get('idNumber') as string, accountNumber: fd.get('accountNumber') as string, description: fd.get('description') as string }; const result = BankDetailFormSchema.safeParse(data); if (result.success) handleSaveEntity('bank', result.data); else toast({ variant: 'destructive', title: 'Error', description: result.error.errors.map(e => e.message).join(' ') }) }} className="space-y-4 py-4">
                        <div><Label htmlFor="bank">Banco</Label><Input id="bank" name="bank" defaultValue={editingBankDetail?.bank || ''} required /></div>
                        <div><Label htmlFor="accountHolder">Titular</Label><Input id="accountHolder" name="accountHolder" defaultValue={editingBankDetail?.accountHolder || ''} required /></div>
                        <div><Label htmlFor="idNumber">CI/RIF del Titular</Label><Input id="idNumber" name="idNumber" defaultValue={editingBankDetail?.idNumber || ''} required /></div>
                        <div><Label htmlFor="accountNumber">Número de Cuenta</Label><Input id="accountNumber" name="accountNumber" defaultValue={editingBankDetail?.accountNumber || ''} required /></div>
                        <div><Label htmlFor="description">Descripción (Opcional)</Label><Input id="description" name="description" defaultValue={editingBankDetail?.description || ''} /></div>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit">Guardar</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
                <DialogContent><DialogHeader><DialogTitle>{editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const data = { name: fd.get('name') as string, description: fd.get('description') as string, code: fd.get('code') as string, discountType: fd.get('discountType') as 'percentage' | 'fixed', value: parseFloat(fd.get('value') as string) }; const result = CouponFormSchema.safeParse(data); if (result.success) handleSaveEntity('coupon', result.data); else toast({ variant: 'destructive', title: 'Error', description: result.error.errors.map(e => e.message).join(' ') }) }} className="space-y-4 py-4">
                        <div><Label htmlFor="name">Nombre (Opcional)</Label><Input id="name" name="name" defaultValue={editingCoupon?.name || ''} placeholder="Ej: Promo Verano" /></div>
                        <div><Label htmlFor="description">Descripción (Opcional)</Label><Input id="description" name="description" defaultValue={editingCoupon?.description || ''} placeholder="Detalles de condiciones..." /></div>
                        <div><Label htmlFor="code">Código del Cupón</Label><Input id="code" name="code" defaultValue={editingCoupon?.code || ''} required /></div>
                        <div><Label htmlFor="discountType">Tipo</Label><Select name="discountType" defaultValue={editingCoupon?.discountType || 'fixed'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Monto Fijo ($)</SelectItem><SelectItem value="percentage">Porcentaje (%)</SelectItem></SelectContent></Select></div>
                        <div><Label htmlFor="value">Valor</Label><Input id="value" name="value" type="number" step="0.01" defaultValue={editingCoupon?.value || ''} required /></div>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit">Guardar</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => {
                setIsExpenseDialogOpen(open);
                if (!open) {
                    setShowNewOfficeInput(false);
                    setNewOfficeName('');
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
                        <DialogDescription>
                            Registra los gastos de tu consultorio para llevar un control financiero detallado
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const categoryValue = fd.get('category') as string;
                        const officeValue = fd.get('office') as string;

                        // Determinar el valor final del consultorio
                        let finalOffice: string | undefined;
                        if (officeValue === '__new__') {
                            // Si seleccionó "nuevo", usar el nombre ingresado
                            finalOffice = newOfficeName.trim() || undefined;
                        } else if (officeValue === 'none') {
                            finalOffice = undefined;
                        } else {
                            finalOffice = officeValue || undefined;
                        }

                        const data = {
                            date: fd.get('date') as string,
                            description: fd.get('description') as string,
                            amount: parseFloat(fd.get('amount') as string),
                            category: categoryValue === 'none' ? undefined : categoryValue || undefined,
                            office: finalOffice,
                        };
                        const result = ExpenseFormSchema.safeParse(data);
                        if (result.success) {
                            handleSaveEntity('expense', data);
                            setShowNewOfficeInput(false);
                            setNewOfficeName('');
                        } else {
                            toast({
                                variant: 'destructive',
                                title: 'Error',
                                description: result.error.errors.map(e => e.message).join(' ')
                            });
                        }
                    }} className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="date">Fecha</Label>
                            <Input
                                id="date"
                                name="date"
                                type="date"
                                defaultValue={editingExpense?.date || new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Descripción</Label>
                            <Input
                                id="description"
                                name="description"
                                defaultValue={editingExpense?.description || ''}
                                placeholder="Ej: Alquiler de consultorio"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="amount">Monto ($)</Label>
                                <Input
                                    id="amount"
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    defaultValue={editingExpense?.amount || ''}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="category">Categoría (Opcional)</Label>
                                <Select name="category" defaultValue={editingExpense?.category || 'none'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin categoría</SelectItem>
                                        {EXPENSE_CATEGORIES.map(category => (
                                            <SelectItem key={category} value={category}>
                                                {category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="office">Consultorio / Ubicación (Opcional)</Label>
                            <Select
                                name="office"
                                defaultValue={editingExpense?.office || 'none'}

                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar consultorio" />
                                </SelectTrigger>
                                <SelectContent>

                                    {doctorData?.addresses?.map(addr => (
                                        <SelectItem key={addr.address} value={addr.name}>
                                            {addr.name}
                                        </SelectItem>
                                    ))}
                                    {doctorData?.onlineConsultation?.enabled && (
                                        <SelectItem value="Consultas Online">Consultas Online</SelectItem>
                                    )}

                                </SelectContent>
                            </Select>



                            <p className="text-xs text-muted-foreground mt-1">
                                {uniqueOffices.length > 0
                                    ? 'Selecciona un consultorio existente o agrega uno nuevo'
                                    : 'Agrega "Nuevo consultorio" para empezar a separar tus finanzas'
                                }
                            </p>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancelar</Button>
                            </DialogClose>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-blue-600" />
                            Crear Nuevo Ticket de Soporte
                        </DialogTitle>
                        <DialogDescription>
                            Describe tu problema o consulta de manera detallada para que podamos ayudarte mejor.
                            Nuestro equipo de soporte responderá en menos de 24 horas.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTicket} className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject" className="text-sm font-medium">
                                Asunto del Ticket *
                            </Label>
                            <Input
                                id="subject"
                                name="subject"
                                placeholder="Ej: Problema con el sistema de pagos"
                                className="h-10"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Escribe un título claro y descriptivo de tu problema
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-medium">
                                Descripción Detallada *
                            </Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe tu problema o consulta con el mayor detalle posible. Incluye pasos para reproducir el problema, capturas de pantalla si es necesario, y cualquier información adicional que pueda ayudar a resolver tu caso."
                                className="min-h-[120px] resize-none"
                                required
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Mínimo 10 caracteres</span>
                                <span className="text-blue-600 font-medium">
                                    💡 Tip: Mientras más detalles proporciones, más rápido podremos ayudarte
                                </span>
                            </div>
                        </div>

                        {/* Información adicional */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-blue-900">
                                        ¿Qué puedes esperar?
                                    </p>
                                    <ul className="text-xs text-blue-800 space-y-1">
                                        <li>• Respuesta en menos de 24 horas</li>
                                        <li>• Seguimiento personalizado de tu caso</li>
                                        <li>• Soluciones paso a paso</li>
                                        <li>• Notificaciones por email cuando haya actualizaciones</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Enviar Ticket
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isSupportDetailOpen} onOpenChange={setIsSupportDetailOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-blue-600" />
                            Ticket: {selectedSupportTicket?.subject}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedSupportTicket && (
                                <span>Creado: {format(parseISO(selectedSupportTicket.date), "dd MMM yyyy 'a las' HH:mm", { locale: es })}</span>
                            )}
                        </DialogDescription>
                        {selectedSupportTicket && (
                            <div className="flex items-center gap-4 text-sm mt-2">
                                <span>Estado:
                                    <Badge className={cn(
                                        "ml-2",
                                        selectedSupportTicket.status === "abierto"
                                            ? "bg-orange-100 text-orange-800 border-orange-200"
                                            : "bg-green-100 text-green-800 border-green-200"
                                    )}>
                                        {selectedSupportTicket.status}
                                    </Badge>
                                </span>
                            </div>
                        )}
                    </DialogHeader>

                    {selectedSupportTicket && (
                        <div className="space-y-4">
                            {/* Descripción inicial del ticket */}
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-blue-100 text-blue-600">
                                            {doctorData?.name?.charAt(0) || 'D'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">{doctorData?.name || 'Tú'}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(parseISO(selectedSupportTicket.date), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {selectedSupportTicket.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mensajes */}
                            <div className="space-y-4">
                                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4" />
                                    Conversación ({selectedSupportTicket.messages?.length || 0} mensajes)
                                </h4>

                                <div className="max-h-96 overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-lg border">
                                    {selectedSupportTicket.messages && selectedSupportTicket.messages.length > 0 ? (
                                        selectedSupportTicket.messages.map(msg => (
                                            <div key={msg.id} className={cn(
                                                "flex items-end gap-3",
                                                msg.sender === 'user' && 'justify-end'
                                            )}>
                                                {msg.sender === 'admin' && (
                                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                                        <AvatarFallback className="bg-gray-100 text-gray-600">
                                                            A
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}

                                                <div className={cn(
                                                    "p-3 rounded-lg max-w-xs shadow-sm",
                                                    msg.sender === 'user'
                                                        ? 'bg-blue-600 text-white rounded-br-none'
                                                        : 'bg-white border rounded-bl-none'
                                                )}>
                                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                                    <p className="text-xs mt-1 opacity-70 text-right">
                                                        {formatDistanceToNow(parseISO(msg.timestamp), { locale: es, addSuffix: true })}
                                                    </p>
                                                </div>

                                                {msg.sender === 'user' && (
                                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                                        <AvatarFallback className="bg-blue-100 text-blue-600">
                                                            {doctorData?.name?.charAt(0) || 'D'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No hay mensajes aún</p>
                                            <p className="text-xs">El equipo de soporte responderá pronto</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Formulario de respuesta */}
                            {selectedSupportTicket.status === 'abierto' && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium">Responder</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Textarea
                                            value={chatMessage}
                                            onChange={e => setChatMessage(e.target.value)}
                                            placeholder="Escribe tu respuesta..."
                                            className="flex-1 min-h-[80px] resize-none"
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    if (chatMessage.trim() && selectedSupportTicket) {
                                                        const messageText = chatMessage.trim();
                                                        setChatMessage('');
                                                        // Optimistic update - agregar mensaje localmente
                                                        const newMessage = {
                                                            id: `msg-${Date.now()}`,
                                                            sender: 'user' as const,
                                                            text: messageText,
                                                            timestamp: new Date().toISOString()
                                                        };
                                                        setSelectedSupportTicket({
                                                            ...selectedSupportTicket,
                                                            messages: [...(selectedSupportTicket.messages || []), newMessage]
                                                        });
                                                        // Enviar al servidor
                                                        try {
                                                            await supabaseService.addMessageToSupportTicket(selectedSupportTicket.id, {
                                                                sender: 'user',
                                                                text: messageText
                                                            });
                                                            await fetchData();
                                                        } catch (error) {
                                                            console.error('Error sending message:', error);
                                                            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje' });
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            onClick={async () => {
                                                if (chatMessage.trim() && selectedSupportTicket) {
                                                    const messageText = chatMessage.trim();
                                                    setChatMessage('');
                                                    // Optimistic update - agregar mensaje localmente
                                                    const newMessage = {
                                                        id: `msg-${Date.now()}`,
                                                        sender: 'user' as const,
                                                        text: messageText,
                                                        timestamp: new Date().toISOString()
                                                    };
                                                    setSelectedSupportTicket({
                                                        ...selectedSupportTicket,
                                                        messages: [...(selectedSupportTicket.messages || []), newMessage]
                                                    });
                                                    // Enviar al servidor
                                                    try {
                                                        await supabaseService.addMessageToSupportTicket(selectedSupportTicket.id, {
                                                            sender: 'user',
                                                            text: messageText
                                                        });
                                                        await fetchData();
                                                    } catch (error) {
                                                        console.error('Error sending message:', error);
                                                        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje' });
                                                    }
                                                }
                                            }}
                                            disabled={!chatMessage.trim()}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Presiona Enter para enviar, Shift+Enter para nueva línea
                                    </p>
                                </div>
                            )}

                            {/* Información de estado */}
                            {selectedSupportTicket.status === 'cerrado' && (
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2 text-green-800">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-medium">Ticket cerrado</span>
                                    </div>
                                    <p className="text-sm text-green-700 mt-1">
                                        Este ticket ha sido resuelto y cerrado por el equipo de soporte.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            {/* Diálogo Walk-in */}
            <Dialog open={isWalkInDialogOpen} onOpenChange={setIsWalkInDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-green-600" />
                            Registrar Paciente Walk-in
                        </DialogTitle>
                        <DialogDescription>
                            Registra un paciente que llegó sin cita previa. Se creará su cuenta automáticamente.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateWalkIn} className="space-y-6 py-4">
                        {/* Datos del Paciente */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Datos del Paciente</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="patientName">Nombre Completo *</Label>
                                    <Input
                                        id="patientName"
                                        name="patientName"
                                        placeholder="Juan Pérez"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="patientEmail">Email *</Label>
                                    <Input
                                        id="patientEmail"
                                        name="patientEmail"
                                        type="email"
                                        placeholder="juan@email.com"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="walkInDocNumber">Documento de Identidad (Opcional)</Label>
                                    <div className="flex gap-2">
                                        <Select
                                            value={walkInDocType}
                                            onValueChange={(val) => setWalkInDocType(val as DocumentType)}
                                        >
                                            <SelectTrigger className="w-[105px] shrink-0 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DOCUMENT_TYPES.map(t => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {walkInDocType === 'Cédula' && (
                                            <Select
                                                value={walkInCedulaPrefix}
                                                onValueChange={(val: any) => setWalkInCedulaPrefix(val)}
                                            >
                                                <SelectTrigger className="w-[65px] shrink-0 text-xs font-semibold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="V">V-</SelectItem>
                                                    <SelectItem value="E">E-</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}

                                        <Input
                                            id="walkInDocNumber"
                                            value={walkInDocNumber}
                                            onChange={(e) => {
                                                const val = walkInDocType === 'Cédula'
                                                    ? e.target.value.replace(/[^0-9]/g, '').slice(0, 9)
                                                    : e.target.value;
                                                setWalkInDocNumber(val);
                                            }}
                                            placeholder={
                                                walkInDocType === 'Pasaporte' ? 'Ej: PAS123456' :
                                                walkInDocType === 'Cédula' ? 'Ej: 12345678' :
                                                'Número de documento'
                                            }
                                            className="flex-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="walkInPhoneNumber">Teléfono</Label>
                                    <div className="flex gap-2">
                                        <CountryCodeSelect
                                            value={walkInPhoneCountryCode}
                                            onChange={setWalkInPhoneCountryCode}
                                            className="w-[125px] shrink-0 text-xs"
                                        />
                                        <Input
                                            id="walkInPhoneNumber"
                                            type="tel"
                                            value={walkInPhoneNumber}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.startsWith('0')) val = val.slice(1);
                                                setWalkInPhoneNumber(val);
                                            }}
                                            placeholder="Ej: 412 123 4567"
                                            className="flex-1 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Consultorio */}
                        {(doctorData?.addresses?.length || 0) > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="office">Consultorio</Label>
                                <Select name="office" value={selectedWalkInOffice} onValueChange={setSelectedWalkInOffice}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar consultorio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {doctorData?.addresses?.map(addr => (
                                            <SelectItem key={addr.address} value={addr.address}>
                                                {addr.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Servicios */}
                        <div className="space-y-2">
                            <Label>Servicios Realizados</Label>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                                {walkInServices.length > 0 ? (
                                    walkInServices.map(service => (
                                        <label key={service.name} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="services"
                                                value={service.name}
                                                className="rounded"
                                            />
                                            <span className="text-sm">{service.name} - ${service.price}</span>
                                        </label>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No hay servicios disponibles para este consultorio.</p>
                                )}
                            </div>
                        </div>

                        {/* Pago */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="totalPrice">Monto Pagado *</Label>
                                <Input
                                    id="totalPrice"
                                    name="totalPrice"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="paymentMethod">Método de Pago *</Label>
                                <Select name="paymentMethod" defaultValue="efectivo" required>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="efectivo">Efectivo</SelectItem>
                                        <SelectItem value="transferencia">Transferencia</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Información */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium mb-1">Se creará automáticamente:</p>
                                    <ul className="space-y-1 text-xs">
                                        <li>• Cuenta del paciente (si no existe)</li>
                                        <li>• Contraseña predeterminada: <code className="bg-blue-100 px-1 rounded">Suma..00</code></li>
                                        <li>• Cita marcada como "Atendido"</li>
                                        <li>• El paciente podrá cambiar su contraseña después</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancelar</Button>
                            </DialogClose>
                            <Button type="submit" className="bg-green-600 hover:bg-green-700">
                                Registrar Paciente
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle><AlertDialogDescription>Esta acción es permanente y no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteItem} className={cn(buttonVariants({ variant: 'destructive' }))}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>

            {/* Modal de Bienvenida para Médicos */}
            {showWelcomeModal && (
                <DoctorWelcomeModal
                    isOpen={showWelcomeModal}
                    onClose={() => setShowWelcomeModal(false)}
                />
            )}
        </div>
    );
}

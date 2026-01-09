"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Appointment, Doctor, Service, ClinicService, ClinicPatientMessage } from '@/lib/types';
import { getClinicAppointments, getClinicDoctors, updateAppointment, getClinicService, getClinicChatMessages, sendClinicChatMessage, markClinicChatAsRead } from '@/lib/supabaseService';
import { createWalkInAppointmentAction } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
    Loader2, CalendarDays, Clock, User, CheckCircle, XCircle, AlertCircle, RefreshCw,
    Eye, MessageSquare, Phone, Send, ChevronLeft, ChevronRight, Search, FileText,
    History, Calendar, CalendarCheck, CalendarClock, MoreHorizontal, Stethoscope, UserPlus, Plus, Trash2, Save
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isBefore, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

const getStatusBadge = (appointment: Appointment) => {
    const { attendance, patientConfirmationStatus } = appointment;

    if (attendance === 'Atendido') {
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Atendido</Badge>;
    }
    if (attendance === 'No Asistió') {
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />No Asistió</Badge>;
    }
    if (patientConfirmationStatus === 'Cancelada') {
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>;
    }
    if (patientConfirmationStatus === 'Confirmada') {
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Confirmada</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>;
};

const getPaymentBadge = (status: string) => {
    if (status === 'Pagado') {
        return <Badge className="bg-green-100 text-green-700">Pagado</Badge>;
    }
    return <Badge variant="outline" className="text-amber-600 border-amber-300">Pendiente</Badge>;
};

const toCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map((v: any) => toCamelCase(v));
    if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce(
            (result, key) => ({
                ...result,
                [key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())]: toCamelCase(obj[key]),
            }),
            {} as any,
        );
    }
    return obj;
};

const ITEMS_PER_PAGE = 20;

export function AgendaTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    // Pagination for history
    const [historyPage, setHistoryPage] = useState(1);

    // Selected appointment for details modal
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Editable services for the selected appointment
    const [editableServices, setEditableServices] = useState<Service[]>([]);
    const [savingServices, setSavingServices] = useState(false);
    const [availableAddonServices, setAvailableAddonServices] = useState<Service[]>([]);

    // Patient history modal
    const [patientHistoryOpen, setPatientHistoryOpen] = useState(false);
    const [patientHistoryLoading, setPatientHistoryLoading] = useState(false);
    const [patientHistory, setPatientHistory] = useState<{
        patient: { id: string; name: string; phone?: string; email?: string } | null;
        appointments: Appointment[];
        medicalRecords: any[];
    }>({ patient: null, appointments: [], medicalRecords: [] });

    // Walk-in modal
    const [walkInOpen, setWalkInOpen] = useState(false);
    const [walkInLoading, setWalkInLoading] = useState(false);
    const [walkInType, setWalkInType] = useState<'doctor' | 'service'>('doctor');
    const [clinicServices, setClinicServices] = useState<ClinicService[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [selectedWalkInDoctor, setSelectedWalkInDoctor] = useState<string>('');

    // Chat Modal State
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ClinicPatientMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [sendingChat, setSendingChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Initial Data Load
    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id]);

    const loadData = async () => {
        if (!user) return;
        const targetClinicId = user.role === 'secretary' ? (user as any).clinicId : user.id;

        if (!targetClinicId) {
            console.error("No clinic ID found for user", user);
            return;
        }

        try {
            setLoading(true);
            const [appointmentsData, doctorsData, servicesData] = await Promise.all([
                getClinicAppointments(targetClinicId),
                getClinicDoctors(targetClinicId),
                supabase.from('clinic_services').select('*').eq('clinic_id', targetClinicId).eq('is_active', true)
            ]);
            setAllAppointments(appointmentsData);
            setDoctors(doctorsData);
            if (servicesData.data) setClinicServices(servicesData.data as any[]);
        } catch (error) {
            console.error('Error loading data:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las citas.' });
        } finally {
            setLoading(false);
        }
    };

    const getDoctorName = (doctorId?: string, fallbackName?: string) => {
        if (!doctorId) return fallbackName || 'Sin médico asignado';
        const doctor = doctors.find(d => d.id === doctorId);
        return doctor?.name || fallbackName || 'Médico desconocido';
    };

    // Load patient history from all clinic doctors
    const loadPatientHistory = async (patientId: string, patientName: string, patientPhone?: string) => {
        try {
            setPatientHistoryLoading(true);
            setPatientHistoryOpen(true);

            // Get all appointments for this patient across all clinic doctors/services
            const patientAppointments = allAppointments.filter(apt => apt.patientId === patientId);

            // Get medical records (if any)
            let medicalRecords: any[] = [];
            try {
                const res = await fetch(`/api/medical-records?patient_id=${patientId}`);
                if (res.ok) {
                    medicalRecords = await res.json();
                }
            } catch (e) {
                console.warn('Could not load medical records:', e);
            }

            setPatientHistory({
                patient: { id: patientId, name: patientName, phone: patientPhone },
                appointments: patientAppointments.sort((a, b) => b.date.localeCompare(a.date)),
                medicalRecords
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el historial del paciente.' });
        } finally {
            setPatientHistoryLoading(false);
        }
    };

    // Handle walk-in appointment creation
    const handleCreateWalkIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user?.id) return;

        const formData = new FormData(e.currentTarget);
        const patientName = formData.get('patientName') as string;
        const patientEmail = formData.get('patientEmail') as string;
        const patientPhone = (formData.get('patientPhone') as string) || undefined;
        const patientDNI = (formData.get('patientDNI') as string) || undefined;
        const doctorId = formData.get('doctorId') as string;
        const paymentMethod = formData.get('paymentMethod') as string;
        const totalPrice = parseFloat(formData.get('totalPrice') as string) || 0;

        // Validations
        if (!patientName || patientName.length < 2) {
            toast({ variant: 'destructive', title: 'Error', description: 'El nombre debe tener al menos 2 caracteres.' });
            return;
        }
        if (!patientEmail || !patientEmail.includes('@')) {
            toast({ variant: 'destructive', title: 'Error', description: 'Email inválido.' });
            return;
        }

        if (walkInType === 'doctor' && !doctorId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un médico.' });
            return;
        }

        if (walkInType === 'service' && !selectedServiceId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un servicio.' });
            return;
        }

        setWalkInLoading(true);
        try {
            const doctor = walkInType === 'doctor' ? doctors.find(d => d.id === doctorId) : null;
            const service = walkInType === 'service' ? clinicServices.find(s => s.id === selectedServiceId) : null;

            // Prepare services array if Service Walk-in
            const servicesData: any[] = [];
            if (service) {
                servicesData.push({
                    id: service.id,
                    name: service.name,
                    price: service.price
                });
            }

            const result = await createWalkInAppointmentAction({
                doctorId: walkInType === 'doctor' ? doctorId : undefined,
                clinicServiceId: walkInType === 'service' ? selectedServiceId : undefined,
                doctorName: walkInType === 'doctor' ? (doctor?.name || 'Médico') : 'Servicio General',
                patientName,
                patientEmail,
                patientPhone,
                patientDNI,
                services: servicesData,
                totalPrice,
                consultationFee: totalPrice,
                paymentMethod: paymentMethod as any,
                office: 'Clínica'
            });

            if (!result.success) {
                throw new Error(result.error || 'Error al crear la cita');
            }

            toast({
                title: result.isNewPatient ? '✅ Paciente y Cita Creados' : '✅ Cita Creada',
                description: result.isNewPatient
                    ? `Se creó cuenta para ${patientName} y se registró la cita.`
                    : `Se registró la cita para ${patientName} con ${doctor?.name}.`
            });
            setWalkInOpen(false);
            loadData();
        } catch (error: any) {
            console.error('Error creating walk-in:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo crear la cita.'
            });
        } finally {
            setWalkInLoading(false);
        }
    };

    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    // Categorize appointments
    const categorizedAppointments = useMemo(() => {
        const todayAppts: Appointment[] = [];
        const tomorrowAppts: Appointment[] = [];
        const upcomingAppts: Appointment[] = [];
        const historyAppts: Appointment[] = [];

        allAppointments.forEach(apt => {
            const aptDate = parseISO(apt.date);
            const isAttended = apt.attendance === 'Atendido' || apt.attendance === 'No Asistió';

            if (isAttended) {
                historyAppts.push(apt);
            } else if (isToday(aptDate)) {
                todayAppts.push(apt);
            } else if (isTomorrow(aptDate)) {
                tomorrowAppts.push(apt);
            } else if (isBefore(today, aptDate)) {
                upcomingAppts.push(apt);
            } else {
                // Past but not attended -> also history
                historyAppts.push(apt);
            }
        });

        // Sort by date/time
        const sortByDateTime = (a: Appointment, b: Appointment) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.time.localeCompare(b.time);
        };

        todayAppts.sort(sortByDateTime);
        tomorrowAppts.sort(sortByDateTime);
        upcomingAppts.sort(sortByDateTime);
        historyAppts.sort((a, b) => -sortByDateTime(a, b)); // Descending for history

        return { todayAppts, tomorrowAppts, upcomingAppts, historyAppts };
    }, [allAppointments, today, tomorrow]);

    // Apply filters
    const applyFilters = (appointments: Appointment[]) => {
        return appointments.filter(apt => {
            const matchesSearch = searchQuery === '' ||
                apt.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                getDoctorName(apt.doctorId, apt.doctorName).toLowerCase().includes(searchQuery.toLowerCase());

            const matchesDoctor = selectedDoctor === 'all' || apt.doctorId === selectedDoctor;

            const matchesStatus = selectedStatus === 'all' ||
                (selectedStatus === 'confirmed' && apt.patientConfirmationStatus === 'Confirmada') ||
                (selectedStatus === 'pending' && apt.patientConfirmationStatus === 'Pendiente') ||
                (selectedStatus === 'attended' && apt.attendance === 'Atendido') ||
                (selectedStatus === 'noshow' && apt.attendance === 'No Asistió');

            return matchesSearch && matchesDoctor && matchesStatus;
        });
    };

    const filteredToday = applyFilters(categorizedAppointments.todayAppts);
    const filteredTomorrow = applyFilters(categorizedAppointments.tomorrowAppts);
    const filteredUpcoming = applyFilters(categorizedAppointments.upcomingAppts);
    const filteredHistory = applyFilters(categorizedAppointments.historyAppts);

    // Pagination for history
    const totalHistoryPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = filteredHistory.slice(
        (historyPage - 1) * ITEMS_PER_PAGE,
        historyPage * ITEMS_PER_PAGE
    );

    const sendWhatsApp = (apt: Appointment) => {
        const phone = apt.patientPhone?.replace(/\D/g, '') || '';
        if (!phone) {
            toast({ variant: 'destructive', title: 'Error', description: 'No hay teléfono registrado para este paciente.' });
            return;
        }
        const message = encodeURIComponent(
            `Hola ${apt.patientName}! 🏥\n\n` +
            `Te recordamos tu cita:\n` +
            `📅 Fecha: ${format(parseISO(apt.date), "EEEE d 'de' MMMM", { locale: es })}\n` +
            `🕐 Hora: ${apt.time}\n` +
            `👨‍⚕️ Médico/Clínica: ${getDoctorName(apt.doctorId, apt.doctorName)}\n` +
            `💰 Total: $${apt.totalPrice}\n\n` +
            `¡Te esperamos!`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    const markAsAttended = async (apt: Appointment, status: 'Atendido' | 'No Asistió') => {
        try {
            await updateAppointment(apt.id, { attendance: status });
            toast({ title: 'Actualizado', description: `Cita marcada como ${status}.` });
            loadData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la cita.' });
        }
    };

    // Chat Logic
    const openChat = async (apt: Appointment) => {
        setSelectedAppointment(apt);
        setChatOpen(true);
        loadChatMessages(apt.patientId);
    };

    const loadChatMessages = async (patientId: string) => {
        if (!user?.id) return;
        setChatLoading(true);
        try {
            const msgs = await getClinicChatMessages(user.id, patientId);
            setChatMessages(msgs);
            await markClinicChatAsRead(user.id, patientId, 'clinic');
        } catch (e) {
            console.error('Error loading chat:', e);
        } finally {
            setChatLoading(false);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim() || !selectedAppointment || !user?.id) return;
        setSendingChat(true);
        try {
            const newMsg = await sendClinicChatMessage(user.id, selectedAppointment.patientId, 'clinic', chatInput);
            setChatMessages(prev => [...prev, newMsg]);
            setChatInput('');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje.' });
        } finally {
            setSendingChat(false);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (chatOpen && selectedAppointment && user?.id) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            interval = setInterval(async () => {
                // Silent refresh
                const msgs = await getClinicChatMessages(user.id, selectedAppointment.patientId);
                setChatMessages(msgs);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [chatOpen, selectedAppointment, user?.id]);

    useEffect(() => {
        if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, chatOpen]);

    // Initialize editable services when appointment is selected
    const openDetailsModal = async (apt: Appointment) => {
        // Fetch fresh data to ensure we have services and latest status
        let fullApt = apt;
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', apt.id)
                .single();

            if (data && !error) {
                fullApt = toCamelCase(data) as Appointment;
            }
        } catch (e) {
            console.error('Error fetching full appointment:', e);
        }

        setSelectedAppointment(fullApt);
        setEditableServices(fullApt.services || []);
        setDetailsOpen(true);
        setAvailableAddonServices([]);

        if (fullApt.clinicServiceId) {
            try {
                const service = await getClinicService(fullApt.clinicServiceId);
                if (service && service.items) {
                    // Map items to Service format
                    const itemsAsServices: Service[] = service.items.map((item, idx) => ({
                        id: `${service.id}-item-${idx}`,
                        name: item.name,
                        price: item.price,
                        duration: 0
                    }));
                    setAvailableAddonServices(itemsAsServices);
                }
            } catch (e) {
                console.error("Error loading clinic service items", e);
            }
        }
    };

    // Add a service to the appointment (from doctor's services)
    const addServiceToAppointment = (service: Service) => {
        // Check if already added
        if (editableServices.find(s => s.name === service.name)) {
            toast({ title: 'Ya añadido', description: 'Este servicio ya está en la lista.' });
            return;
        }
        setEditableServices([...editableServices, { id: service.id, name: service.name, price: service.price }]);
    };

    // Get available services for the selected appointment (from doctor or clinic service)
    const getAvailableServicesToAdd = (): Service[] => {
        if (availableAddonServices.length > 0) return availableAddonServices;
        if (!selectedAppointment?.doctorId) return [];
        const doctor = doctors.find(d => d.id === selectedAppointment.doctorId);
        return doctor?.services || [];
    };

    // Remove a service from the appointment
    const removeServiceFromAppointment = (serviceId: string) => {
        setEditableServices(editableServices.filter(s => s.id !== serviceId));
    };

    // Calculate new total with robust typing
    const calculateNewTotal = () => {
        const consultationFee = Number(selectedAppointment?.consultationFee) || 0;
        const servicesTotal = editableServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
        const discountAmount = Number(selectedAppointment?.discountAmount) || 0;
        return consultationFee + servicesTotal - discountAmount;
    };

    // Save services changes
    const saveServicesChanges = async () => {
        if (!selectedAppointment) return;
        setSavingServices(true);
        try {
            const newTotal = calculateNewTotal();
            console.log('💾 Saving services:', { services: editableServices, newTotal, oldTotal: selectedAppointment.totalPrice });

            await updateAppointment(selectedAppointment.id, {
                services: editableServices,
                totalPrice: newTotal
            });

            toast({ title: '✅ Servicios actualizados', description: 'Los servicios y el precio total se guardaron correctamente.' });
            setDetailsOpen(false);
            loadData();
        } catch (error: any) {
            console.error('❌ Error saving services:', error);
            toast({
                variant: 'destructive',
                title: 'Error al Guardar',
                description: error.message || 'No se pudieron guardar los cambios. Intente nuevamente.'
            });
        } finally {
            setSavingServices(false);
        }
    };

    // Appointment Card Component
    const AppointmentCard = ({ appointment, showDate = false }: { appointment: Appointment; showDate?: boolean }) => (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Time and Patient Info */}
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-3 min-w-[70px]">
                            <Clock className="h-4 w-4 text-primary mb-1" />
                            <span className="text-lg font-bold">{appointment.time}</span>
                            {showDate && (
                                <span className="text-xs text-muted-foreground">
                                    {format(parseISO(appointment.date), 'dd/MM', { locale: es })}
                                </span>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-lg">{appointment.patientName || 'Paciente'}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> {getDoctorName(appointment.doctorId, appointment.doctorName)}
                            </p>
                            {appointment.serviceName && (
                                <p className="text-sm text-primary">{appointment.serviceName}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {getStatusBadge(appointment)}
                                {getPaymentBadge(appointment.paymentStatus)}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* View Details */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailsModal(appointment)}
                        >
                            <Eye className="h-4 w-4 mr-1" /> Ver
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                            onClick={() => openChat(appointment)}
                        >
                            <MessageSquare className="h-4 w-4 mr-1" /> Chat
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => sendWhatsApp(appointment)}
                        >
                            <Phone className="h-4 w-4 mr-1" /> WhatsApp
                        </Button>

                        {/* Historia Clínica */}
                        {appointment.patientId && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                onClick={() => router.push(`/clinic/patients/${appointment.patientId}`)}
                            >
                                <Stethoscope className="h-4 w-4 mr-1" /> Historia
                            </Button>
                        )}

                        {/* Mark Attendance (only for today's pending) */}
                        {isToday(parseISO(appointment.date)) && appointment.attendance === 'Pendiente' && (
                            <>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => markAsAttended(appointment, 'Atendido')}
                                >
                                    <CheckCircle className="h-4 w-4 mr-1" /> Atendido
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => markAsAttended(appointment, 'No Asistió')}
                                >
                                    <XCircle className="h-4 w-4 mr-1" /> No Asistió
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    // Empty State Component
    const EmptyState = ({ message }: { message: string }) => (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <CalendarDays className="h-12 w-12 mb-4 opacity-50" />
                <p>{message}</p>
            </CardContent>
        </Card>
    );

    // Tab Count Badge
    const TabBadge = ({ count }: { count: number }) => (
        count > 0 ? (
            <span className="ml-1.5 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {count}
            </span>
        ) : null
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Agenda de Citas</h2>
                    <p className="text-muted-foreground">Gestiona todas las citas de tu clínica.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar paciente o médico..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                        <SelectTrigger className="w-full md:w-[200px]">
                            <SelectValue placeholder="Médico" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los médicos</SelectItem>
                            {doctors.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="confirmed">Confirmada</SelectItem>
                            <SelectItem value="attended">Atendido</SelectItem>
                            <SelectItem value="noshow">No Asistió</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Tabs */}
            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
                <Tabs defaultValue="today" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="today" className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span className="hidden sm:inline">Hoy</span>
                            <TabBadge count={filteredToday.length} />
                        </TabsTrigger>
                        <TabsTrigger value="tomorrow" className="flex items-center gap-1">
                            <CalendarClock className="h-4 w-4" />
                            <span className="hidden sm:inline">Mañana</span>
                            <TabBadge count={filteredTomorrow.length} />
                        </TabsTrigger>
                        <TabsTrigger value="upcoming" className="flex items-center gap-1">
                            <CalendarCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">Próximas</span>
                            <TabBadge count={filteredUpcoming.length} />
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-1">
                            <History className="h-4 w-4" />
                            <span className="hidden sm:inline">Historial</span>
                            <TabBadge count={filteredHistory.length} />
                        </TabsTrigger>
                    </TabsList>

                    {/* Today */}
                    <TabsContent value="today" className="space-y-3 mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                                <Calendar className="h-5 w-5" />
                                Hoy, {format(today, "EEEE d 'de' MMMM", { locale: es })}
                            </div>
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => setWalkInOpen(true)}
                            >
                                <UserPlus className="h-4 w-4 mr-1" /> Paciente sin cita
                            </Button>
                        </div>
                        {filteredToday.length === 0 ? (
                            <EmptyState message="No hay citas para hoy." />
                        ) : (
                            <div className="space-y-3">
                                {filteredToday.map(apt => (
                                    <AppointmentCard key={apt.id} appointment={apt} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Tomorrow */}
                    <TabsContent value="tomorrow" className="space-y-3 mt-4">
                        <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                            <CalendarClock className="h-5 w-5" />
                            Mañana, {format(tomorrow, "EEEE d 'de' MMMM", { locale: es })}
                        </div>
                        {filteredTomorrow.length === 0 ? (
                            <EmptyState message="No hay citas para mañana." />
                        ) : (
                            <div className="space-y-3">
                                {filteredTomorrow.map(apt => (
                                    <AppointmentCard key={apt.id} appointment={apt} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Upcoming */}
                    <TabsContent value="upcoming" className="space-y-3 mt-4">
                        <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                            <CalendarCheck className="h-5 w-5" />
                            Próximas Citas
                        </div>
                        {filteredUpcoming.length === 0 ? (
                            <EmptyState message="No hay citas próximas programadas." />
                        ) : (
                            <div className="space-y-3">
                                {filteredUpcoming.map(apt => (
                                    <AppointmentCard key={apt.id} appointment={apt} showDate />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* History */}
                    <TabsContent value="history" className="space-y-3 mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                                <History className="h-5 w-5" />
                                Historial de Citas ({filteredHistory.length})
                            </div>
                        </div>
                        {filteredHistory.length === 0 ? (
                            <EmptyState message="No hay citas en el historial." />
                        ) : (
                            <>
                                <div className="space-y-3">
                                    {paginatedHistory.map(apt => (
                                        <AppointmentCard key={apt.id} appointment={apt} showDate />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalHistoryPages > 1 && (
                                    <div className="flex items-center justify-center gap-4 pt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                            disabled={historyPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" /> Anterior
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Página {historyPage} de {totalHistoryPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                                            disabled={historyPage === totalHistoryPages}
                                        >
                                            Siguiente <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            )}

            {/* Appointment Details Modal */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalles de la Cita</DialogTitle>
                        <DialogDescription>Información completa de la cita</DialogDescription>
                    </DialogHeader>
                    {selectedAppointment && (
                        <div className="space-y-4">
                            {/* Patient Info */}
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                <Avatar className="h-14 w-14">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                                        {selectedAppointment.patientName?.[0] || 'P'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-lg">{selectedAppointment.patientName}</p>
                                    {selectedAppointment.patientPhone && (
                                        <p className="text-sm text-muted-foreground">📞 {selectedAppointment.patientPhone}</p>
                                    )}
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="px-0 h-auto text-primary"
                                        onClick={() => {
                                            if (selectedAppointment.patientId) {
                                                loadPatientHistory(
                                                    selectedAppointment.patientId,
                                                    selectedAppointment.patientName || 'Paciente',
                                                    selectedAppointment.patientPhone
                                                );
                                            } else {
                                                toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el ID del paciente.' });
                                            }
                                        }}
                                    >
                                        <FileText className="h-3 w-3 mr-1" /> Ver historial del paciente
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            {/* Appointment Details */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Fecha</p>
                                    <p className="font-medium">{format(parseISO(selectedAppointment.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Hora</p>
                                    <p className="font-medium">{selectedAppointment.time}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Médico</p>
                                    <p className="font-medium">{getDoctorName(selectedAppointment.doctorId, selectedAppointment.doctorName)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Servicio</p>
                                    <p className="font-medium">{selectedAppointment.serviceName || 'Consulta general'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Estado</p>
                                    {getStatusBadge(selectedAppointment)}
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Pago</p>
                                    <div className="flex items-center gap-2">
                                        {getPaymentBadge(selectedAppointment.paymentStatus)}
                                        <span className="text-xs text-muted-foreground">
                                            ({selectedAppointment.paymentMethod})
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Services Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Servicios de la Cita</p>
                                    {selectedAppointment.attendance === 'Pendiente' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={savingServices}
                                            onClick={saveServicesChanges}
                                        >
                                            {savingServices ? (
                                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4 mr-1" />
                                            )}
                                            Guardar
                                        </Button>
                                    )}
                                </div>

                                {/* Consultation Fee */}
                                <div className="bg-slate-50 p-2 rounded flex justify-between items-center">
                                    <span className="font-medium">Consulta Base</span>
                                    <span className="font-mono">${selectedAppointment.consultationFee || 0}</span>
                                </div>

                                {/* Current Services */}
                                {editableServices.length > 0 ? (
                                    <div className="space-y-2">
                                        {editableServices.map(service => (
                                            <div key={service.id} className="flex justify-between items-center p-2 border rounded">
                                                <span>{service.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono">${service.price}</span>
                                                    {selectedAppointment.attendance === 'Pendiente' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                            onClick={() => removeServiceFromAppointment(service.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2">Sin servicios adicionales</p>
                                )}

                                {/* Add Service (only if pending and doctor has services) */}
                                {selectedAppointment.attendance === 'Pendiente' && getAvailableServicesToAdd().length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">Agregar servicio adicional:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {getAvailableServicesToAdd().filter(ds => !editableServices.find(es => es.name === ds.name)).slice(0, 6).map(service => (
                                                <Button
                                                    key={service.id}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs h-7"
                                                    onClick={() => addServiceToAppointment(service)}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> {service.name} (${service.price})
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Discount if any */}
                                {selectedAppointment.discountAmount && selectedAppointment.discountAmount > 0 && (
                                    <div className="flex justify-between items-center text-green-600 text-sm">
                                        <span>Descuento {selectedAppointment.appliedCoupon && `(${selectedAppointment.appliedCoupon})`}</span>
                                        <span className="font-mono">-${selectedAppointment.discountAmount}</span>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Totals */}
                            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-green-800">Total</span>
                                    <span className="text-2xl font-bold text-green-700">${calculateNewTotal()}</span>
                                </div>
                                {calculateNewTotal() !== selectedAppointment.totalPrice && (
                                    <p className="text-xs text-orange-600 mt-1 text-right">
                                        (Original: ${selectedAppointment.totalPrice}) - Guarda para aplicar cambios
                                    </p>
                                )}
                            </div>

                            {/* Payment Confirmation */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Gestión de Pago</p>

                                {/* Ver comprobante si es transferencia */}
                                {selectedAppointment.paymentMethod === 'transferencia' && selectedAppointment.paymentProof && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                            window.open(selectedAppointment.paymentProof!, '_blank');
                                        }}
                                    >
                                        <Eye className="h-4 w-4 mr-1" /> Ver Comprobante de Transferencia
                                    </Button>
                                )}

                                {/* Botón para confirmar pago si está pendiente */}
                                {selectedAppointment.paymentStatus === 'Pendiente' && (
                                    <Button
                                        size="sm"
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        onClick={async () => {
                                            try {
                                                await updateAppointment(selectedAppointment.id, { paymentStatus: 'Pagado' });
                                                toast({ title: '✅ Pago Confirmado', description: 'El pago ha sido registrado correctamente.' });
                                                setDetailsOpen(false);
                                                loadData();
                                            } catch (error) {
                                                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo confirmar el pago.' });
                                            }
                                        }}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        {selectedAppointment.paymentMethod === 'efectivo' ? 'Confirmar Pago en Efectivo' : 'Aprobar Pago'}
                                    </Button>
                                )}

                                {selectedAppointment.paymentStatus === 'Pagado' && (
                                    <div className="flex items-center justify-center gap-2 text-green-600 text-sm p-2 bg-green-50 rounded">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>Pago confirmado</span>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {selectedAppointment.clinicalNotes && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Notas Clínicas</p>
                                    <p className="bg-slate-50 p-3 rounded text-sm">{selectedAppointment.clinicalNotes}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => sendWhatsApp(selectedAppointment)}
                                >
                                    <Phone className="h-4 w-4 mr-1" /> Enviar WhatsApp
                                </Button>
                                {/* Historia Clínica */}
                                {selectedAppointment.patientId && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => {
                                            setDetailsOpen(false);
                                            router.push(`/clinic/patients/${selectedAppointment.patientId}`);
                                        }}
                                    >
                                        <Stethoscope className="h-4 w-4 mr-1" /> Historia Clínica
                                    </Button>
                                )}
                                {/* Chat button - placeholder */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                    onClick={() => openChat(selectedAppointment)}
                                >
                                    <MessageSquare className="h-4 w-4 mr-1" /> Chat
                                </Button>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cerrar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Patient History Modal */}
            <Dialog open={patientHistoryOpen} onOpenChange={setPatientHistoryOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Historial del Paciente</DialogTitle>
                        <DialogDescription>
                            {patientHistory.patient?.name} - Historial completo en esta clínica
                        </DialogDescription>
                    </DialogHeader>

                    {patientHistoryLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-6">
                                {/* Patient Info Header */}
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                    <Avatar className="h-16 w-16">
                                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                                            {patientHistory.patient?.name?.[0] || 'P'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-xl">{patientHistory.patient?.name}</p>
                                        {patientHistory.patient?.phone && (
                                            <p className="text-sm text-muted-foreground">📞 {patientHistory.patient.phone}</p>
                                        )}
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {patientHistory.appointments.length} cita(s) registrada(s)
                                        </p>
                                    </div>
                                </div>

                                {/* Appointments Timeline */}
                                <div>
                                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                        <CalendarDays className="h-5 w-5" /> Citas en la Clínica
                                    </h3>
                                    {patientHistory.appointments.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-6">No hay citas registradas.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {patientHistory.appointments.map(apt => (
                                                <Card key={apt.id} className="relative overflow-hidden">
                                                    <div className={`absolute top-0 left-0 w-1 h-full ${apt.attendance === 'Atendido' ? 'bg-green-500' :
                                                        apt.attendance === 'No Asistió' ? 'bg-red-500' : 'bg-blue-500'
                                                        }`} />
                                                    <CardContent className="p-4 pl-5">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {format(parseISO(apt.date), "d 'de' MMMM, yyyy", { locale: es })} - {apt.time}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {getDoctorName(apt.doctorId, apt.doctorName)}
                                                                    {apt.serviceName && ` • ${apt.serviceName}`}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                {getStatusBadge(apt)}
                                                                <span className="text-sm font-semibold">${apt.totalPrice}</span>
                                                            </div>
                                                        </div>
                                                        {apt.clinicalNotes && (
                                                            <p className="text-sm mt-2 bg-slate-50 p-2 rounded italic">
                                                                "{apt.clinicalNotes}"
                                                            </p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Medical Records */}
                                {patientHistory.medicalRecords.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                            <FileText className="h-5 w-5" /> Registros Médicos
                                        </h3>
                                        <div className="space-y-3">
                                            {patientHistory.medicalRecords.map((record: any) => (
                                                <Card key={record.id}>
                                                    <CardContent className="p-4">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {format(parseISO(record.visit_date), "d 'de' MMMM, yyyy", { locale: es })}
                                                                </p>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {record.record_type?.replace('_', ' ') || 'Consulta'}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Dr. {record.doctors?.name}
                                                            </p>
                                                        </div>
                                                        {record.diagnosis && (
                                                            <div className="mt-2">
                                                                <p className="text-xs text-muted-foreground">Diagnóstico:</p>
                                                                <p className="text-sm">{record.diagnosis}</p>
                                                            </div>
                                                        )}
                                                        {record.treatment_plan && (
                                                            <div className="mt-2">
                                                                <p className="text-xs text-muted-foreground">Tratamiento:</p>
                                                                <p className="text-sm">{record.treatment_plan}</p>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}

                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            className="text-green-600"
                            onClick={() => {
                                if (patientHistory.patient?.phone) {
                                    const phone = patientHistory.patient.phone.replace(/\D/g, '');
                                    window.open(`https://wa.me/${phone}`, '_blank');
                                } else {
                                    toast({ variant: 'destructive', title: 'Error', description: 'No hay teléfono registrado.' });
                                }
                            }}
                        >
                            <Phone className="h-4 w-4 mr-1" /> WhatsApp
                        </Button>
                        <DialogClose asChild>
                            <Button variant="outline">Cerrar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Chat Modal */}
            <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Chat con {selectedAppointment?.patientName}
                        </DialogTitle>
                    </DialogHeader>

                    <ScrollArea className="flex-1 p-4 bg-slate-50">
                        {chatLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : chatMessages.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-full text-muted-foreground opacity-50">
                                <MessageSquare className="h-10 w-10 mb-2" />
                                <p>No hay mensajes aún.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {chatMessages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.senderType === 'clinic' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.senderType === 'clinic' ? 'bg-primary text-primary-foreground' : 'bg-white border shadow-sm'}`}>
                                            <p className="text-sm">{msg.message}</p>
                                            <p className={`text-[10px] mt-1 text-right ${msg.senderType === 'clinic' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                {format(parseISO(msg.createdAt), 'HH:mm', { locale: es })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                        )}
                    </ScrollArea>

                    <div className="p-4 border-t bg-white">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendChat();
                            }}
                            className="flex gap-2"
                        >
                            <Input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Escribe un mensaje..."
                                disabled={sendingChat}
                            />
                            <Button type="submit" size="icon" disabled={sendingChat || !chatInput.trim()}>
                                {sendingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                    </div>
                </DialogContent>
            </Dialog >

            {/* Walk-in Modal */}
            < Dialog open={walkInOpen} onOpenChange={setWalkInOpen} >
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-green-600" />
                            Paciente sin Cita
                        </DialogTitle>
                        <DialogDescription>
                            Registra una cita para un paciente que llegó sin reserva previa.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={walkInType} onValueChange={(val: any) => setWalkInType(val)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="doctor">Atención Médica</TabsTrigger>
                            <TabsTrigger value="service">Servicio Clínico</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <form onSubmit={handleCreateWalkIn} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="patientName">Nombre del Paciente *</Label>
                                <Input id="patientName" name="patientName" placeholder="Juan Pérez" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="patientDNI">DNI (Opcional)</Label>
                                <Input id="patientDNI" name="patientDNI" placeholder="12345678" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="patientEmail">Email *</Label>
                            <Input id="patientEmail" name="patientEmail" type="email" placeholder="email@ejemplo.com" required />
                            <p className="text-xs text-muted-foreground">Si el paciente ya existe, se usará su cuenta.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="patientPhone">Teléfono</Label>
                            <Input id="patientPhone" name="patientPhone" placeholder="+54 9 11 ..." />
                        </div>

                        {walkInType === 'doctor' ? (
                            <div className="space-y-2">
                                <Label htmlFor="doctorId">Médico *</Label>
                                <Select name="doctorId">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar médico" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {doctors.map(doctor => (
                                            <SelectItem key={doctor.id} value={doctor.id}>
                                                {doctor.name} ({doctor.specialty})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="serviceId">Servicio de la Clínica *</Label>
                                <Select value={selectedServiceId} onValueChange={(val) => {
                                    setSelectedServiceId(val);
                                    const s = clinicServices.find(cs => cs.id === val);
                                    if (s) {
                                        // Optional: Auto-fill price in form? Or let user input?
                                        // The form expects totalPrice input below.
                                    }
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar servicio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clinicServices.map(service => (
                                            <SelectItem key={service.id} value={service.id}>
                                                {service.name} (${service.price})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="paymentMethod">Método de Pago</Label>
                                <Select name="paymentMethod" defaultValue="efectivo">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="efectivo">Efectivo</SelectItem>
                                        <SelectItem value="transferencia">Transferencia</SelectItem>
                                        <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="totalPrice">Total a Pagar ($)</Label>
                                <Input id="totalPrice" name="totalPrice" type="number" step="0.01" required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (Opcional)</Label>
                            <Textarea id="notes" name="notes" placeholder="Notas adicionales..." />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setWalkInOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={walkInLoading}>
                                {walkInLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creando Cita...
                                    </>
                                ) : (
                                    'Crear Cita'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >
        </div >
    );
}

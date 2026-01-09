
"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarPlus, ClipboardList, User, Edit, CalendarDays, Clock, ThumbsUp, CalendarX, CheckCircle, XCircle, MessageSquare, Send, Loader2, FileText, MapPin, Star, Stethoscope, RefreshCw, Search, Filter, ArrowDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import type { Patient } from '@/lib/types';
import { useAppointments } from '@/lib/appointments';
import { useNotifications } from '@/lib/notifications';
import { useChatNotifications } from '@/lib/chat-notifications';
import * as supabaseService from '@/lib/supabaseService';
import { supabase } from '@/lib/supabase';
import type { Appointment, Doctor, ChatMessage, FamilyMember } from '@/lib/types';
import { HeaderWrapper, BottomNav } from '@/components/header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { WelcomeModal } from '@/components/welcome-modal';


function AppointmentCard({
  appointment,
  doctor,
  isPast = false,
  onUpdateConfirmation,
  onOpenChat,
  onOpenRecord,
}: {
  appointment: Appointment,
  doctor: Doctor | undefined,
  isPast?: boolean,
  onUpdateConfirmation?: (id: string, status: 'Confirmada' | 'Cancelada') => void,
  onOpenChat: (appointment: Appointment) => void,
  onOpenRecord?: (appointment: Appointment) => void,
}) {
  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow relative",
      isPast && appointment.attendance === 'Atendido' && "border-green-200 bg-green-50/30",
      isPast && appointment.attendance === 'No Asistió' && "border-red-200 bg-red-50/30"
    )}>
      {/* Indicador de estado para citas pasadas */}
      {isPast && (
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 rounded-t-lg",
          appointment.attendance === 'Atendido' ? "bg-green-500" : "bg-red-500"
        )} />
      )}
      <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            {/* Indicador de cita para familiar */}
            {appointment.familyMemberId && (
              <div className="flex items-center gap-1.5 mb-1">
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                  <Users className="h-3 w-3 mr-1" />
                  Para: {appointment.patientName}
                </Badge>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <p className="font-bold text-base sm:text-lg">{appointment.doctorName}</p>
              {doctor && (
                <Badge variant="outline" className="text-xs w-fit">
                  {doctor.specialty}
                </Badge>
              )}
            </div>
            {doctor && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{doctor.city}</span>
                </div>
                <div className="hidden sm:block">•</div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{doctor.rating} ({doctor.reviewCount} reseñas)</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Servicios:</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {appointment.services.map(s => (
                <Badge key={s.id} variant="secondary" className="text-xs">
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm gap-2 sm:gap-4 pt-1 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {new Date(appointment.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {appointment.time}
            </span>
          </div>
        </div>
        <Separator orientation="vertical" className="h-auto hidden sm:block mx-2" />
        <Separator orientation="horizontal" className="w-full block sm:hidden my-2" />
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2">
          <div className="text-right">
            <p className="font-bold text-base sm:text-lg text-primary">${appointment.totalPrice.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {appointment.paymentMethod === 'efectivo' ? 'Pago en efectivo' : 'Transferencia bancaria'}
            </p>
          </div>
          {isPast ? (
            <Badge variant={appointment.attendance === 'Atendido' ? 'default' : 'destructive'} className={appointment.attendance === 'Atendido' ? 'bg-green-600 text-white' : ''}>
              {appointment.attendance === 'Atendido' ? '✅ Atendido' : '❌ No Asistió'}
            </Badge>
          ) : (
            <Badge variant={appointment.paymentStatus === 'Pagado' ? 'default' : 'secondary'} className={appointment.paymentStatus === 'Pagado' ? 'bg-green-600 text-white' : ''}>
              {appointment.paymentStatus === 'Pagado' ? '✅ Pagado' : '⏳ Pendiente'}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-3 sm:p-4 pt-0 border-t mt-4">
        <div className="w-full space-y-3">
          {/* Estado de confirmación */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {onUpdateConfirmation && appointment.patientConfirmationStatus === 'Pendiente' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <p className="text-sm text-muted-foreground">¿Asistirás a esta cita?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onUpdateConfirmation(appointment.id, 'Cancelada')}>
                    <CalendarX className="mr-2 h-4 w-4" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={() => onUpdateConfirmation(appointment.id, 'Confirmada')}>
                    <ThumbsUp className="mr-2 h-4 w-4" /> Confirmar
                  </Button>
                </div>
              </div>
            )}
            {appointment.patientConfirmationStatus === 'Confirmada' && !isPast && (
              <Badge variant="default" className="bg-green-600 text-white">
                <CheckCircle className="mr-2 h-4 w-4" /> Asistencia Confirmada
              </Badge>
            )}
            {appointment.patientConfirmationStatus === 'Cancelada' && (
              <Badge variant="destructive">
                <XCircle className="mr-2 h-4 w-4" /> Cita Cancelada por ti
              </Badge>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex gap-2">
              {isPast && appointment.attendance === 'Atendido' && onOpenRecord && (
                <Button variant="secondary" size="sm" onClick={() => onOpenRecord(appointment)}>
                  <ClipboardList className="mr-2 h-4 w-4" /> Ver Resumen Clínico
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {(doctor || appointment.clinicServiceId) && (
                <Button size="sm" variant="outline" onClick={() => onOpenChat(appointment)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {(doctor?.clinicId || appointment.clinicServiceId) ? 'Contactar Clínica' : 'Contactar Doctor'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { appointments, updateAppointmentConfirmation, refreshAppointments } = useAppointments();
  const { checkAndSetNotifications } = useNotifications();
  const { updateUnreadChatCount } = useChatNotifications();
  const router = useRouter();
  const { toast } = useToast();

  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(true);

  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [selectedChatAppointment, setSelectedChatAppointment] = useState<Appointment | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isClinicChat, setIsClinicChat] = useState(false);
  const [clinicChatMessages, setClinicChatMessages] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);

  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [selectedRecordAppointment, setSelectedRecordAppointment] = useState<Appointment | null>(null);
  const [medicalRecord, setMedicalRecord] = useState<any>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);

  // Estados para paginación y filtros del historial
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [isFilterActive, setIsFilterActive] = useState(false);
  const itemsPerPage = 10;

  // Estado para filtro por familiar
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyFilter, setFamilyFilter] = useState<string>('all'); // 'all', 'myself', o familyMemberId

  // Estado para el modal de bienvenida
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Eliminar el useEffect de refresco de usuario para restaurar el flujo básico

  useEffect(() => {
    if (isChatDialogOpen && chatEndRef.current) {
      setTimeout(() => {
        if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'auto' });
          console.log('Scroll ejecutado', chatEndRef.current);
        }
      }, 200);
    }
  }, [isChatDialogOpen, selectedChatAppointment?.messages?.length]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) {
      if (!user) router.push('/auth/login');
      else if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'doctor') router.push('/doctor/dashboard');
      else if (user.role === 'seller') router.push('/seller/dashboard');
      else if (user.role === 'clinic' || user.role === 'secretary') router.push('/clinic/dashboard');
    }
  }, [user, authLoading, router]);

  // Mostrar modal de bienvenida si profileCompleted es false o undefined
  useEffect(() => {
    if (!authLoading && user?.role === 'patient') {
      const patient = user as unknown as Patient;
      if (patient.profileCompleted === false || patient.profileCompleted === undefined) {
        setShowWelcomeModal(true);
      } else {
        setShowWelcomeModal(false);
      }
    } else if (!authLoading) {
      setShowWelcomeModal(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    const fetchDoctors = async () => {
      setIsDoctorsLoading(true);
      try {
        const doctorsData = await supabaseService.getDoctors();
        setAllDoctors(doctorsData);
      } catch {
        console.error("Failed to fetch doctors for dashboard, possibly offline.");
        toast({
          variant: "destructive",
          title: "Error de red",
          description: "No se pudieron cargar los datos de los médicos.",
        });
      } finally {
        setIsDoctorsLoading(false);
      }
    };
    fetchDoctors();
  }, [toast]);

  // Cargar familiares para el filtro de historial
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (user?.id && user?.role === 'patient') {
        try {
          const members = await supabaseService.getFamilyMembers(user.id);
          setFamilyMembers(members);
        } catch (error) {
          console.error('Error loading family members:', error);
        }
      }
    };
    fetchFamilyMembers();
  }, [user?.id, user?.role]);

  const { upcomingAppointments } = useMemo(() => {
    if (!user?.email) return {
      upcomingAppointments: [],
      totalPages: 0
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming: Appointment[] = [];

    appointments.forEach(appt => {
      const apptDate = new Date(appt.date + 'T00:00:00');
      // An appointment moves to past if the date has passed OR if attendance has been marked.
      if (apptDate < today || appt.attendance !== 'Pendiente') {
        // This appointment is in the past or attendance is marked, so it's not upcoming.
      } else {
        upcoming.push(appt);
      }
    });

    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calcular paginación
    const totalPages = Math.ceil(upcoming.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUpcoming = upcoming.slice(startIndex, endIndex);

    return {
      upcomingAppointments: paginatedUpcoming,
      totalPages
    };
  }, [user, appointments, currentPage, itemsPerPage]);

  // Filtrar citas del historial por familiar
  const filteredHistoryAppointments = useMemo(() => {
    if (familyFilter === 'myself') {
      return appointments.filter(appt => !appt.familyMemberId);
    } else if (familyFilter !== 'all') {
      return appointments.filter(appt => appt.familyMemberId === familyFilter);
    }
    return appointments;
  }, [appointments, familyFilter]);

  useEffect(() => {
    if (user?.role === 'patient' && appointments.length > 0) {
      checkAndSetNotifications(appointments);
      updateUnreadChatCount(appointments);
    }
  }, [user, appointments, checkAndSetNotifications, updateUnreadChatCount]);

  const handleOpenChat = async (appointment: Appointment) => {
    const doctor = allDoctors.find(d => d.id === appointment.doctorId);

    let clinicId = doctor?.clinicId;

    // Si no hay médico (o no tiene clínica) pero es un servicio de clínica, buscar la clínica
    if (!clinicId && appointment.clinicServiceId) {
      try {
        // Nota: Podríamos optimizar esto si tuviéramos clinicId en la cita
        const service = await supabaseService.getClinicService(appointment.clinicServiceId);
        if (service) {
          clinicId = service.clinicId;
        }
      } catch (e) {
        console.error('Error fetching service for chat:', e);
      }
    }

    if (clinicId) {
      // Doctor belongs to a clinic - open clinic chat
      setIsClinicChat(true);
      setSelectedChatAppointment(appointment);
      setIsChatDialogOpen(true);

      try {
        // Get clinic info
        const clinic = await supabaseService.getClinic(clinicId);
        setSelectedClinic(clinic);

        // Get clinic chat messages
        const messages = await supabaseService.getClinicChatMessages(clinicId, user!.id);
        setClinicChatMessages(messages);

        // Mark as read
        await supabaseService.markClinicChatAsRead(clinicId, user!.id, 'patient');
      } catch (error) {
        console.error('Error loading clinic chat:', error);
      }
    } else {
      // Independent doctor - use existing doctor chat
      setIsClinicChat(false);
      setSelectedChatAppointment(appointment);
      setIsChatDialogOpen(true);

      // Mark messages as read when opening chat
      if (appointment.messages && appointment.messages.length > 0) {
        const lastMessage = appointment.messages[appointment.messages.length - 1];
        if (lastMessage.sender === 'doctor' && !appointment.readByPatient) {
          supabaseService.updateAppointment(appointment.id, { readByPatient: true });
        }
      }
    }
  };

  const handleOpenRecord = async (appointment: Appointment) => {
    setSelectedRecordAppointment(appointment);
    setIsRecordDialogOpen(true);

    setIsLoadingRecord(true);
    setMedicalRecord(null);

    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('appointment_id', appointment.id)
        .maybeSingle();

      if (error) throw error;
      setMedicalRecord(data);
    } catch (err) {
      console.error("Error fetching record:", err);
      setMedicalRecord(null);
    } finally {
      setIsLoadingRecord(false);
    }
  };

  const handleRefreshAppointments = async () => {
    try {
      await refreshAppointments();
      toast({ title: 'Datos actualizados', description: 'Se han refrescado las citas.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron actualizar los datos.' });
    }
  };

  const handleDateFilter = (date: string) => {
    setDateFilter(date);
    setIsFilterActive(date !== '');
    setCurrentPage(1); // Resetear a la primera página
  };

  const clearFilter = () => {
    setDateFilter('');
    setIsFilterActive(false);
    setCurrentPage(1);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedChatAppointment || !user) return;
    setIsSendingMessage(true);

    try {
      if (isClinicChat && selectedClinic) {
        // Send to clinic chat
        const newMessage = await supabaseService.sendClinicChatMessage(
          selectedClinic.id,
          user.id,
          'patient',
          chatMessage.trim()
        );
        setClinicChatMessages(prev => [...prev, newMessage]);
        setChatMessage("");
      } else {
        // Send to doctor chat (existing logic)
        const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
          sender: 'patient',
          text: chatMessage.trim(),
        };

        await supabaseService.addMessageToAppointment(selectedChatAppointment.id, newMessage as { sender: 'patient' | 'doctor', text: string });

        // Optimistically update UI
        const fullMessage: ChatMessage = { ...newMessage, id: `msg-${Date.now()}`, timestamp: new Date().toISOString() };
        const updatedAppointment = {
          ...selectedChatAppointment,
          messages: [...(selectedChatAppointment.messages || []), fullMessage]
        };
        setSelectedChatAppointment(updatedAppointment);

        await refreshAppointments();
        setChatMessage("");
        // Update unread chat count
        updateUnreadChatCount(appointments);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje.' });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleScrollToEnd = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };


  // Manejo explícito de carga y redirecciones
  if (authLoading || (user && user.role !== 'patient')) {
    if (user && (user.role === 'clinic' || user.role === 'secretary')) {
      if (typeof window !== 'undefined') {
        setTimeout(() => window.location.href = '/clinic/dashboard', 100);
      }
      return (
        <div className="flex flex-col min-h-screen bg-background items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Redireccionando...</p>
        </div>
      );
    }

    // Si no hay usuario aún (cargando) o es otro rol redirigiendo
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <HeaderWrapper />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-xs">
              Cargando... {authLoading ? '(Init)' : ''} {user ? `(Rol: ${user.role})` : ''}
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (isDoctorsLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <HeaderWrapper />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const selectedChatDoctor = allDoctors.find(d => d.id === selectedChatAppointment?.doctorId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderWrapper />
      <main className="flex-1 bg-muted/40 pb-20 md:pb-0">
        <div className="container py-4 md:py-12">
          <div className="flex justify-between items-start mb-3 md:mb-8">
            <div>
              <h1 className="text-lg md:text-3xl font-bold font-headline mb-1 md:mb-2">¡Bienvenido de nuevo, {user.name}!</h1>
              <p className="text-xs md:text-base text-muted-foreground">Este es tu panel médico personal.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAppointments}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden md:inline">Actualizar</span>
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-3 md:gap-8 items-start">
            <div className="md:col-span-2 grid gap-3 md:gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-xl">Próximas Citas</CardTitle>
                  {upcomingAppointments.length === 0 && (
                    <CardDescription className="text-xs md:text-sm">No tienes próximas citas agendadas.</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {upcomingAppointments.length > 0 ? (
                    <div className="space-y-2 md:space-y-4">
                      {upcomingAppointments.map(appt => (
                        <AppointmentCard
                          key={appt.id}
                          appointment={appt}
                          doctor={allDoctors.find(d => d.id === appt.doctorId)}
                          onUpdateConfirmation={updateAppointmentConfirmation}
                          onOpenChat={handleOpenChat}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 md:py-12 text-muted-foreground flex flex-col items-center gap-2 md:gap-4">
                      <CalendarPlus className="h-8 w-8 md:h-12 md:w-12" />
                      <p className="text-xs md:text-base">¿Listo para tu próxima consulta?</p>
                      <Button asChild size="sm" className="text-xs md:text-base">
                        <Link href="/find-a-doctor">Reservar una Cita</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
                    <div>
                      <CardTitle className="text-base md:text-xl">Historial Médico</CardTitle>
                      <CardDescription className="text-xs md:text-sm">Un resumen de tus consultas pasadas.</CardDescription>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                      {/* Filtro por familiar */}
                      {familyMembers.length > 0 && (
                        <Select value={familyFilter} onValueChange={setFamilyFilter}>
                          <SelectTrigger className="w-[130px] md:w-[180px] text-xs md:text-sm h-8 md:h-10">
                            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas las citas</SelectItem>
                            <SelectItem value="myself">Solo mías</SelectItem>
                            {familyMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.firstName} {member.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="date"
                          placeholder="Filtrar por fecha..."
                          value={dateFilter}
                          onChange={(e) => handleDateFilter(e.target.value)}
                          className="pl-10 w-full sm:w-[140px] md:w-[200px] text-xs md:text-sm h-8 md:h-10"
                        />
                      </div>
                      {(isFilterActive || familyFilter !== 'all') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { clearFilter(); setFamilyFilter('all'); }}
                          className="flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                        >
                          <Filter className="h-4 w-4" />
                          Limpiar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredHistoryAppointments.length > 0 ? (
                    <div className="space-y-2 md:space-y-4">
                      {filteredHistoryAppointments.map(appt => (
                        <AppointmentCard
                          key={appt.id}
                          appointment={appt}
                          doctor={allDoctors.find(d => d.id === appt.doctorId)}
                          isPast
                          onOpenChat={handleOpenChat}
                          onOpenRecord={handleOpenRecord}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 md:py-12 text-muted-foreground flex flex-col items-center gap-2 md:gap-4">
                      <ClipboardList className="h-8 w-8 md:h-12 md:w-12" />
                      <p className="text-xs md:text-base">
                        {isFilterActive || familyFilter !== 'all'
                          ? 'No se encontraron citas con los filtros seleccionados.'
                          : 'Tu historial médico aparecerá aquí después de tu primera cita.'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
                {/* Pagination removed as it's not directly tied to filteredPastAppointments */}
              </Card>
            </div>

            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-xl"><User /> Mi Perfil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 md:space-y-4">
                  {/* Foto de perfil */}
                  <div className="flex justify-center">
                    <Avatar className="h-16 w-16 md:h-20 md:w-20">
                      <AvatarImage src={(user as any).profileImage ?? undefined} alt={user.name} />
                      <AvatarFallback className="text-base md:text-lg">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                    <div>
                      <p className="font-semibold">Nombre</p>
                      <p className="text-muted-foreground">{user.name}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Correo Electrónico</p>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Edad</p>
                      <p className="text-muted-foreground">{(user as any).age || 'No especificada'}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Sexo</p>
                      <p className="text-muted-foreground capitalize">{(user as any).gender || 'No especificado'}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full text-xs md:text-base">
                    <Link href="/profile">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar Perfil
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Núcleo Familiar Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Núcleo Familiar
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Gestiona a tus familiares y agenda citas para ellos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 md:space-y-4">
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Agrega a tus hijos, padres u otros familiares para poder agendar citas médicas en su nombre.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full text-xs md:text-base">
                    <Link href="/dashboard/family">
                      Ver Núcleo Familiar
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />

      {/* Chat Dialog */}
      <Dialog open={isChatDialogOpen} onOpenChange={(open) => {
        setIsChatDialogOpen(open);
        if (!open) {
          updateUnreadChatCount(appointments);
          setIsClinicChat(false);
          setSelectedClinic(null);
          setClinicChatMessages([]);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar>
                {isClinicChat && selectedClinic ? (
                  <>
                    <AvatarImage src={selectedClinic.logoUrl} alt={selectedClinic.name} />
                    <AvatarFallback>{selectedClinic.name?.charAt(0)}</AvatarFallback>
                  </>
                ) : (
                  <>
                    <AvatarImage src={selectedChatDoctor?.profileImage} alt={selectedChatDoctor?.name} />
                    <AvatarFallback>{selectedChatDoctor?.name?.charAt(0)}</AvatarFallback>
                  </>
                )}
              </Avatar>
              {isClinicChat && selectedClinic ? `Chat con ${selectedClinic.name}` : `Chat con Dr. ${selectedChatDoctor?.name}`}
            </DialogTitle>
            <DialogDescription>
              {isClinicChat && selectedClinic
                ? `Comunicación directa con la clínica.`
                : `Conversación sobre la cita del ${selectedChatAppointment && format(new Date(selectedChatAppointment.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 h-96 flex flex-col gap-4 bg-muted/50 rounded-lg">
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 relative">
              {isClinicChat ? (
                // Clinic Chat Messages
                clinicChatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Inicia la conversación con la clínica</p>
                  </div>
                ) : (
                  clinicChatMessages.map((msg, idx, arr) => {
                    const isLast = idx === arr.length - 1;
                    return (
                      <div
                        key={msg.id}
                        ref={isLast ? chatEndRef : undefined}
                        className={cn("flex items-end gap-2", msg.senderType === 'patient' && 'justify-end')}
                      >
                        {msg.senderType === 'clinic' && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={selectedClinic?.logoUrl} />
                            <AvatarFallback>{selectedClinic?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("p-3 rounded-lg max-w-xs shadow-sm", msg.senderType === 'patient' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background rounded-bl-none')}>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs text-right mt-1 opacity-70">{formatDistanceToNow(new Date(msg.createdAt), { locale: es, addSuffix: true })}</p>
                        </div>
                        {msg.senderType === 'patient' && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={(user as any).profileImage ?? undefined} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                // Doctor Chat Messages (existing)
                (selectedChatAppointment?.messages || []).map((msg, idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  return (
                    <div
                      key={msg.id}
                      ref={isLast ? chatEndRef : undefined}
                      className={cn("flex items-end gap-2", msg.sender === 'patient' && 'justify-end')}
                    >
                      {msg.sender === 'doctor' && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedChatDoctor?.profileImage} />
                          <AvatarFallback>{selectedChatDoctor?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn("p-3 rounded-lg max-w-xs shadow-sm", msg.sender === 'patient' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background rounded-bl-none')}>
                        <p className="text-sm">{msg.text}</p>
                        <p className="text-xs text-right mt-1 opacity-70">{formatDistanceToNow(new Date(msg.timestamp), { locale: es, addSuffix: true })}</p>
                      </div>
                      {msg.sender === 'patient' && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={(user as any).profileImage ?? undefined} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })
              )}
              <button
                type="button"
                onClick={handleScrollToEnd}
                className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/80 focus:outline-none"
                aria-label="Ir al último mensaje"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
              <Input
                placeholder="Escribe tu mensaje..."
                className="flex-1"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                disabled={isSendingMessage}
              />
              <Button type="submit" disabled={isSendingMessage || !chatMessage.trim()}>
                {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cerrar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clinical Record Dialog */}
      <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resumen de Cita</DialogTitle>
            <DialogDescription>
              Resumen de tu cita con {selectedRecordAppointment?.doctorName} el {selectedRecordAppointment && format(new Date(selectedRecordAppointment.date + 'T00:00:00'), "d 'de' LLLL, yyyy", { locale: es })}.
            </DialogDescription>
          </DialogHeader>

          {isLoadingRecord ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : medicalRecord ? (
            <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-4">
              {/* Diagnóstico */}
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2 text-primary">
                  <Stethoscope className="h-5 w-5" /> Diagnóstico / Evaluación
                </h4>
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <p className="font-medium text-foreground">
                    {medicalRecord.diagnosis || "Sin diagnóstico registrado."}
                  </p>
                </div>
              </div>

              {/* Tratamiento / Plan */}
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2 text-primary">
                  <FileText className="h-5 w-5" /> Plan de Tratamiento
                </h4>
                <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 whitespace-pre-wrap text-sm">
                  {medicalRecord.treatment_plan || "Sin indicaciones registradas."}
                </div>
              </div>

              {/* Motivo de Visita (si existe) */}
              {medicalRecord.reason_for_visit && (
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-muted-foreground">Motivo de consulta</h4>
                  <p className="text-sm">{medicalRecord.reason_for_visit}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mx-auto">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Aún no hay registros</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                El profesional aún no ha cargado la evolución clínica de esta consulta. Por favor revisa más tarde.
              </p>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cerrar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Welcome Modal para pacientes nuevos */}
      {showWelcomeModal && (
        <WelcomeModal
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}

    </div>
  );
}


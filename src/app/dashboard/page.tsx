
"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarPlus, ClipboardList, User, Edit, CalendarDays, Clock, ThumbsUp, CalendarX, CheckCircle, XCircle, MessageSquare, Send, Loader2, FileText, MapPin, Star, Stethoscope, RefreshCw, Search, Filter, ArrowDown, Users, Video, Pill, Printer, Sparkles, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, Bot, BedDouble, Store, Ticket, HeartHandshake, QrCode, ExternalLink, Building2 } from 'lucide-react';
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
import type { Appointment, Doctor, ChatMessage, FamilyMember, MedicalRecord } from '@/lib/types';
import { HeaderWrapper, BottomNav } from '@/components/header';
import { MedicalPrescriptionModal } from '@/components/medical/medical-prescription-modal';
import { MedicalReportModal } from '@/components/medical/medical-report-modal';
import { SendToPharmacyModal } from '@/components/pharmacy/send-to-pharmacy-modal';
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
import { DoctorPatientChat } from '@/components/chat/DoctorPatientChat';
import { useSettings } from '@/lib/settings';
import { resolveAppointmentFinancials, getExchangeRate } from '@/lib/currency-utils';


function AppointmentCard({
  appointment,
  doctor,
  isPast = false,
  onUpdateConfirmation,
  onOpenChat,
  onOpenRecord,
  onOpenPrescription,
}: {
  appointment: Appointment,
  doctor: Doctor | undefined,
  isPast?: boolean,
  onUpdateConfirmation?: (id: string, status: 'Confirmada' | 'Cancelada') => void,
  onOpenChat: (appointment: Appointment) => void,
  onOpenRecord?: (appointment: Appointment) => void,
  onOpenPrescription?: (appointment: Appointment) => void,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { settings } = useSettings();
  const currentRate = getExchangeRate(settings, 'VES');
  const financials = appointment ? resolveAppointmentFinancials(appointment, currentRate) : null;

  return (
    <Card className={cn(
      "hover:shadow-md transition-all border rounded-2xl overflow-hidden bg-white shadow-xs",
      isPast && appointment.attendance === 'Atendido' && "border-green-200 bg-green-50/20",
      isPast && appointment.attendance === 'No Asistió' && "border-red-200 bg-red-50/20"
    )}>
      {/* Indicador superior de estado para citas pasadas */}
      {isPast && (
        <div className={cn(
          "h-1 w-full",
          appointment.attendance === 'Atendido' ? "bg-green-500" : "bg-red-500"
        )} />
      )}

      <CardContent className="p-3.5 sm:p-4 space-y-2.5">
        {/* Cabecera Principal Compacta */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
          <div className="space-y-1 min-w-0">
            {/* Badges de Familiar y Online */}
            <div className="flex flex-wrap gap-1.5 mb-1">
              {appointment.familyMemberId && (
                <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-medium">
                  <Users className="h-2.5 w-2.5 mr-1" />
                  Para: {appointment.patientName}
                </Badge>
              )}
              {appointment.consultationType === 'online' && (
                <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">
                  <Video className="h-2.5 w-2.5 mr-1" />
                  Consulta Online
                </Badge>
              )}
            </div>

            {/* Nombre del Doctor y Especialidad */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                {appointment.doctorName}
              </p>
              {doctor && (
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200 font-medium">
                  {doctor.specialty}
                </Badge>
              )}
            </div>

            {/* Fecha y Hora */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                {new Date(appointment.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {appointment.time}
              </span>
            </div>
          </div>

          {/* Precio y Estado */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="flex flex-col items-start sm:items-end">
              <span className={cn("font-bold text-sm sm:text-base font-mono", appointment.paymentStatus === 'Reembolsado' ? "line-through text-slate-400" : "text-slate-900")}>
                ${appointment.totalPrice.toFixed(2)} USD
              </span>
              {financials && financials.paymentCurrency === 'VES' && (
                <span className="text-[11px] font-mono text-muted-foreground font-medium">
                  {financials.formattedLocal}
                  {financials.isHistorical ? ' 🔒' : ' (tasa hoy)'}
                </span>
              )}
            </div>
            {isPast ? (
              <div className="flex flex-col sm:items-end gap-1">
                <Badge variant={appointment.attendance === 'Atendido' ? 'default' : 'destructive'} className={cn("text-[10px] px-2 py-0.5", appointment.attendance === 'Atendido' ? 'bg-green-600 text-white' : '')}>
                  {appointment.attendance === 'Atendido' ? '✅ Atendido' : '❌ No Asistió'}
                </Badge>
                {appointment.paymentStatus === 'Reembolsado' && (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 font-semibold">
                    💸 Reembolsado
                  </Badge>
                )}
                {appointment.noShowResolution === 'retained' && (
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-300">
                    🔒 Cobrado (Inasistencia)
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:items-end gap-1">
                <Badge variant={appointment.paymentStatus === 'Pagado' ? 'default' : 'secondary'} className={cn("text-[10px] px-2 py-0.5", appointment.paymentStatus === 'Pagado' ? 'bg-green-600 text-white' : '')}>
                  {appointment.paymentStatus === 'Pagado' ? '✅ Pagado' : '⏳ Pendiente'}
                </Badge>
                {appointment.rescheduledFromDate && (
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                    🗓️ Reprogramada
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* DETALLES DESPLEGABLES (Colapsable) */}
        {isExpanded && (
          <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs animate-in fade-in-50 duration-200">
            {/* Banner de Resolución de Inasistencia / Reembolso */}
            {appointment.paymentStatus === 'Reembolsado' && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <span className="text-base">💸</span>
                <div>
                  <p className="font-bold">Reembolso Procesado</p>
                  <p className="text-[11px] text-amber-800">
                    {appointment.refundReason || 'Se ha efectuado la devolución del dinero por inasistencia a la consulta.'}
                  </p>
                </div>
              </div>
            )}

            {appointment.rescheduledFromDate && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                <span className="text-base">🗓️</span>
                <div>
                  <p className="font-bold">Cita Reprogramada</p>
                  <p className="text-[11px] text-blue-800">
                    Esta cita fue trasladada desde su fecha original ({appointment.rescheduledFromDate}). Tu pago se mantiene aplicado.
                  </p>
                </div>
              </div>
            )}
            {/* Ubicación / Consultorio */}
            {doctor && (
              <div className="flex items-start gap-1.5 text-muted-foreground bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <MapPin className="h-3.5 w-3.5 text-slate-500 mt-0.5 shrink-0" />
                <span className="leading-snug">
                  {appointment.consultationType === 'online'
                    ? 'Sala Virtual de Telemedicina'
                    : (appointment.doctorAddress || appointment.office || doctor.address || doctor.city || 'Consultorio Médico')}
                </span>
              </div>
            )}

            {/* Servicios */}
            {appointment.services && appointment.services.length > 0 && (
              <div className="space-y-1">
                <p className="font-semibold text-slate-700 flex items-center gap-1">
                  <Stethoscope className="h-3.5 w-3.5 text-primary" /> Servicios Incluidos:
                </p>
                <div className="flex flex-wrap gap-1">
                  {appointment.services.map(s => (
                    <Badge key={s.id} variant="secondary" className="text-[10px]">
                      {s.name} {s.price ? `($${s.price.toFixed(2)})` : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Desglose de Precios y Pagos */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Consulta Médica:</span>
                <span className="font-mono">${(appointment.consultationFee || 0).toFixed(2)}</span>
              </div>
              {appointment.services && appointment.services.length > 0 && (
                <div className="flex justify-between">
                  <span>Servicios:</span>
                  <span className="font-mono">${appointment.services.reduce((sum, s) => sum + (s.price || 0), 0).toFixed(2)}</span>
                </div>
              )}
              {appointment.discountAmount && appointment.discountAmount > 0 && (
                <div className="flex justify-between text-green-700 font-medium">
                  <span>Descuento {appointment.appliedCoupon ? `(${appointment.appliedCoupon})` : ''}:</span>
                  <span className="font-mono">-${appointment.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200/60 font-semibold text-slate-800">
                <span>Método de Pago:</span>
                <span>{appointment.paymentMethod === 'efectivo' ? '💵 Efectivo en Consultorio' : '💳 Transferencia / Pago Móvil'}</span>
              </div>
              {financials && financials.paymentCurrency === 'VES' && (
                <div className="p-2 bg-blue-50/70 rounded-lg border border-blue-100 space-y-1 text-[11px] text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Total en Bolívares:</span>
                    <span className="font-mono font-bold text-blue-800">{financials.formattedLocal}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Tasa oficial de cambio:</span>
                    <span className="font-mono">Bs. {financials.exchangeRate.toFixed(2)} / $1 USD</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1 border-t border-blue-200/50 leading-relaxed">
                    {financials.isHistorical
                      ? '🔒 Pago confirmado. La tasa y monto en Bolívares quedaron congelados.'
                      : '⏳ Cita en efectivo: El monto en Bolívares se calcula a la tasa del día en que asistas y pagues en la consulta.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acciones Rápidas */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5 flex-wrap items-center">
            {/* Botón para unirse a consulta online */}
            {!isPast && appointment.consultationType === 'online' && appointment.meetingLink && (
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8" asChild>
                <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer">
                  <Video className="mr-1.5 h-3.5 w-3.5" />
                  Unirse
                </a>
              </Button>
            )}

            {/* Botón Ver Récipe si es pasada y atendida */}
            {isPast && appointment.attendance === 'Atendido' && (
              <>
                {onOpenPrescription && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white shadow-xs text-xs h-8 font-medium"
                    onClick={() => onOpenPrescription(appointment)}
                  >
                    <Pill className="mr-1.5 h-3.5 w-3.5" /> Ver Récipe
                  </Button>
                )}
                {onOpenRecord && (
                  <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => onOpenRecord(appointment)}>
                    <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Resumen
                  </Button>
                )}
              </>
            )}

            {/* Botón Confirmar Asistencia si está pendiente */}
            {onUpdateConfirmation && appointment.patientConfirmationStatus === 'Pendiente' && !isPast && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="text-xs h-8 text-red-600 hover:bg-red-50" onClick={() => onUpdateConfirmation(appointment.id, 'Cancelada')}>
                  <CalendarX className="mr-1 h-3.5 w-3.5" /> Cancelar
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-8" onClick={() => onUpdateConfirmation(appointment.id, 'Confirmada')}>
                  <ThumbsUp className="mr-1 h-3.5 w-3.5" /> Confirmar
                </Button>
              </div>
            )}

            {appointment.patientConfirmationStatus === 'Confirmada' && !isPast && (
              <Badge variant="outline" className="text-xs text-green-700 bg-green-50 border-green-200 h-7 px-2 font-medium">
                <CheckCircle className="mr-1 h-3 w-3" /> Asistencia Confirmada
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {(doctor || appointment.clinicServiceId) && (
              <Button size="sm" variant="ghost" className="text-xs h-8 text-slate-600 hover:text-slate-900" onClick={() => onOpenChat(appointment)}>
                <MessageSquare className="mr-1 h-3.5 w-3.5" />
                Chat
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs h-8 text-slate-500 hover:text-slate-900 px-2"
            >
              {isExpanded ? 'Menos' : 'Detalles'}
              <ChevronDown className={cn("ml-1 h-3.5 w-3.5 transition-transform duration-200", isExpanded && "rotate-180")} />
            </Button>
          </div>
        </div>
      </CardContent>
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

  // Estados para el Récipe Médico Oficial
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedPrescriptionRecord, setSelectedPrescriptionRecord] = useState<MedicalRecord | null>(null);
  const [selectedPrescriptionDoctor, setSelectedPrescriptionDoctor] = useState<Doctor | null>(null);
  const [selectedPrescriptionAppointment, setSelectedPrescriptionAppointment] = useState<Appointment | null>(null);
  const [isSendToPharmacyOpen, setIsSendToPharmacyOpen] = useState(false);

  // Estados para Informes Médicos y Constancias de Reposo
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportRecord, setSelectedReportRecord] = useState<MedicalRecord | any | null>(null);
  const [selectedReportDoctor, setSelectedReportDoctor] = useState<Doctor | null>(null);
  const [selectedReportAppointment, setSelectedReportAppointment] = useState<Appointment | null>(null);

  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [patientCampaignRegistrations, setPatientCampaignRegistrations] = useState<any[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [selectedCampaignTicket, setSelectedCampaignTicket] = useState<any | null>(null);
  const [activePatientTab, setActivePatientTab] = useState<'upcoming' | 'recipes' | 'reports' | 'history' | 'campaigns'>('upcoming');
  const [readPrescriptionIds, setReadPrescriptionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'campaigns' || tabParam === 'recipes' || tabParam === 'reports' || tabParam === 'history' || tabParam === 'upcoming') {
        setActivePatientTab(tabParam);
      }
    }
  }, []);

  // Estados para paginación y filtros del historial
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [isFilterActive, setIsFilterActive] = useState(false);
  const itemsPerPage = 10;

  // Cargar IDs de récipes leídos desde localStorage
  useEffect(() => {
    if (user?.id) {
      try {
        const stored = localStorage.getItem(`read_prescriptions_${user.id}`);
        if (stored) {
          setReadPrescriptionIds(new Set(JSON.parse(stored)));
        }
      } catch (e) {
        console.error('Error loading read prescriptions:', e);
      }
    }
  }, [user?.id]);

  const markPrescriptionAsRead = (recordId: string) => {
    if (!recordId || recordId === 'temp') return;
    setReadPrescriptionIds(prev => {
      if (prev.has(recordId)) return prev;
      const next = new Set(prev);
      next.add(recordId);
      if (user?.id) {
        try {
          localStorage.setItem(`read_prescriptions_${user.id}`, JSON.stringify(Array.from(next)));
        } catch (e) {
          console.error('Error saving read prescriptions:', e);
        }
      }
      return next;
    });
  };

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
      else if (user.role === 'clinic' || (user.role === 'secretary' && !user.laboratoryId)) router.push('/clinic/dashboard');
      else if (user.role === 'pharmacy') router.push('/pharmacy/dashboard');
      else if (user.role === 'laboratory' || (user.role === 'secretary' && user.laboratoryId)) router.push('/laboratory/dashboard');
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

  const upcomingAppointments = useMemo(() => {
    if (!user?.email) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return appointments
      .filter(appt => {
        const apptDate = new Date(appt.date + 'T00:00:00');
        return apptDate >= today && appt.attendance === 'Pendiente' && appt.patientConfirmationStatus !== 'Cancelada';
      })
      .sort((a, b) => new Date(a.date + 'T00:00:00').getTime() - new Date(b.date + 'T00:00:00').getTime());
  }, [user, appointments]);

  // Filtrar citas del historial (solo citas pasadas o atendidas/canceladas)
  const filteredHistoryAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return appointments
      .filter(appt => {
        const apptDate = new Date(appt.date + 'T00:00:00');
        const isPast = apptDate < today || appt.attendance !== 'Pendiente' || appt.patientConfirmationStatus === 'Cancelada';
        if (!isPast) return false;

        // Filtro por familiar
        if (familyFilter === 'myself' && appt.familyMemberId) return false;
        if (familyFilter !== 'all' && familyFilter !== 'myself' && appt.familyMemberId !== familyFilter) return false;

        // Filtro por fecha
        if (dateFilter && appt.date !== dateFilter) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime());
  }, [appointments, familyFilter, dateFilter]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredHistoryAppointments.length / itemsPerPage));
  const paginatedHistoryAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHistoryAppointments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHistoryAppointments, currentPage, itemsPerPage]);

  const unreadRecipesCount = useMemo(() => {
    return patientRecords.filter(r => (r.prescription || r.treatment_plan) && !readPrescriptionIds.has(r.id)).length;
  }, [patientRecords, readPrescriptionIds]);

  const totalRecipesCount = useMemo(() => {
    return patientRecords.filter(r => r.prescription || r.treatment_plan).length;
  }, [patientRecords]);

  // Informes y Reposos Médicos
  const patientReports = useMemo(() => {
    return patientRecords.filter(r => r.medical_report || r.requires_rest || (r.rest_days && r.rest_days > 0));
  }, [patientRecords]);

  const activeRestCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return patientReports.filter(r => {
      const hasRest = Boolean(r.requires_rest || (r.rest_days && r.rest_days > 0));
      if (!hasRest) return false;
      if (!r.rest_end_date) return true;
      return r.rest_end_date >= today;
    }).length;
  }, [patientReports]);

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

  const fetchPatientRecords = async () => {
    if (!user?.id || user.role !== 'patient') return;
    try {
      setIsLoadingRecords(true);
      const res = await fetch(`/api/medical-records?patient_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setPatientRecords(data || []);
      }
    } catch (e) {
      console.error('Error loading patient medical records:', e);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const fetchPatientCampaigns = async () => {
    if (!user?.id || user.role !== 'patient') return;
    try {
      setIsLoadingCampaigns(true);
      const cedulaParam = encodeURIComponent((user as any).cedula || '');
      const emailParam = encodeURIComponent(user.email || '');
      const res = await fetch(
        `/api/health-campaigns/register?myRegistrations=true&patientId=${encodeURIComponent(user.id)}&cedula=${cedulaParam}&email=${emailParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setPatientCampaignRegistrations(Array.isArray(data.registrations) ? data.registrations : []);
      }
    } catch (e) {
      console.error('Error loading patient campaigns:', e);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    if (user?.id && user.role === 'patient') {
      fetchPatientRecords();
      fetchPatientCampaigns();
    }
  }, [user?.id, user?.role]);

  const handleOpenPrescription = async (appointmentOrRecord: Appointment | MedicalRecord | any) => {
    // Caso 1: Se pasó un MedicalRecord directamente
    if (appointmentOrRecord && ('diagnosis' in appointmentOrRecord || 'prescription' in appointmentOrRecord || 'treatment_plan' in appointmentOrRecord)) {
      const record = appointmentOrRecord as MedicalRecord;
      if (record.id) markPrescriptionAsRead(record.id);
      setSelectedPrescriptionRecord(record);
      const doc = allDoctors.find(d => d.id === record.doctor_id) || record.doctors || null;
      setSelectedPrescriptionDoctor(doc);
      setSelectedPrescriptionAppointment(null);
      setIsPrescriptionModalOpen(true);
      return;
    }

    // Caso 2: Se pasó una Appointment
    const appointment = appointmentOrRecord as Appointment;
    setSelectedPrescriptionAppointment(appointment);
    const doctor = allDoctors.find(d => d.id === appointment.doctorId) || null;
    setSelectedPrescriptionDoctor(doctor);
    setIsPrescriptionModalOpen(true);

    try {
      // 1. Buscar en registros ya cargados en memoria
      let foundRecord = patientRecords.find(r => 
        (appointment.id && r.appointment_id === appointment.id) ||
        (appointment.doctorId && r.doctor_id === appointment.doctorId)
      );

      // 2. Si no se encuentra, consultar el endpoint backend
      if (!foundRecord && user?.id) {
        const res = await fetch(`/api/medical-records?patient_id=${user.id}`);
        if (res.ok) {
          const list = await res.json();
          setPatientRecords(list || []);
          foundRecord = (list || []).find((r: MedicalRecord) => 
            (appointment.id && r.appointment_id === appointment.id) ||
            (appointment.doctorId && r.doctor_id === appointment.doctorId)
          );
        }
      }

      if (foundRecord?.id) {
        markPrescriptionAsRead(foundRecord.id);
      }

      setSelectedPrescriptionRecord(foundRecord || {
        id: 'temp',
        patient_id: user?.id || '',
        doctor_id: appointment.doctorId || '',
        visit_date: appointment.date,
        diagnosis: 'Consulta Médica',
        treatment_plan: 'Plan de tratamiento indicado en consulta.',
        prescription: 'Medicamentos indicados por el profesional en la consulta.',
        doctors: doctor || undefined
      });
    } catch (err) {
      console.error('Error fetching prescription record:', err);
    }
  };

  const handleOpenReport = async (appointmentOrRecord: Appointment | MedicalRecord | any) => {
    if (!appointmentOrRecord) return;

    // Caso 1: Se pasó un MedicalRecord directamente
    if (appointmentOrRecord && ('diagnosis' in appointmentOrRecord || 'medical_report' in appointmentOrRecord || 'prescription' in appointmentOrRecord)) {
      const record = appointmentOrRecord as MedicalRecord;
      setSelectedReportRecord(record);
      const doc = allDoctors.find(d => d.id === record.doctor_id) || record.doctors || null;
      setSelectedReportDoctor(doc);
      setSelectedReportAppointment(null);
      setIsReportModalOpen(true);
      return;
    }

    // Caso 2: Se pasó una Appointment
    const appointment = appointmentOrRecord as Appointment;
    setSelectedReportAppointment(appointment);
    const doctor = allDoctors.find(d => d.id === appointment.doctorId) || null;
    setSelectedReportDoctor(doctor);
    setIsReportModalOpen(true);

    try {
      let foundRecord = patientRecords.find(r => 
        (appointment.id && r.appointment_id === appointment.id) ||
        (appointment.doctorId && r.doctor_id === appointment.doctorId)
      );

      if (!foundRecord && user?.id) {
        const res = await fetch(`/api/medical-records?patient_id=${user.id}`);
        if (res.ok) {
          const list = await res.json();
          setPatientRecords(list || []);
          foundRecord = (list || []).find((r: MedicalRecord) => 
            (appointment.id && r.appointment_id === appointment.id) ||
            (appointment.doctorId && r.doctor_id === appointment.doctorId)
          );
        }
      }

      setSelectedReportRecord(foundRecord || {
        id: 'temp',
        patient_id: user?.id || '',
        doctor_id: appointment.doctorId || '',
        visit_date: appointment.date,
        diagnosis: appointment.reason || 'Consulta Médica',
        treatment_plan: 'Plan de tratamiento indicado en consulta.',
        medical_report: appointment.reason || 'Paciente evaluado en consulta médica.',
        requires_rest: false,
        rest_days: 0,
        doctors: doctor || undefined
      });
    } catch (err) {
      console.error('Error fetching report record:', err);
    }
  };

  const handleRefreshAppointments = async () => {
    try {
      await Promise.all([refreshAppointments(), fetchPatientRecords(), fetchPatientCampaigns()]);
      toast({ title: 'Datos actualizados', description: 'Se han refrescado tus citas, récipes y jornadas.' });
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
    if (user && (user.role === 'clinic' || (user.role === 'secretary' && !user.laboratoryId))) {
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

    if (user && (user.role === 'laboratory' || (user.role === 'secretary' && user.laboratoryId))) {
      if (typeof window !== 'undefined') {
        setTimeout(() => window.location.href = '/laboratory/dashboard', 100);
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

  if (!user) {
    return null;
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
      <main className="flex-1 bg-slate-50/60 pb-20 md:pb-8">
        <div className="container py-4 md:py-8 max-w-5xl">
          
          {/* Header Greeting */}
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold font-headline tracking-tight text-slate-900">
                ¡Hola, {user.name.split(' ')[0]}! 👋
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Panel médico y control de consultas.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAppointments}
              className="flex items-center gap-1.5 text-xs h-8.5 rounded-xl border-slate-200 hover:bg-white shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>

          {/* ========================================================================= */}
          {/* 6 CUADRITOS DE ACCESO RÁPIDO INTERACTIVOS (HUB MÓVIL Y DESKTOP)            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 mb-6">
            
            {/* Cuadrito 1: Próximas Citas */}
            <button
              type="button"
              onClick={() => setActivePatientTab('upcoming')}
              className={cn(
                "p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer",
                activePatientTab === 'upcoming'
                  ? "bg-gradient-to-br from-indigo-500/10 via-white to-blue-50/50 border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                  : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className={cn(
                  "h-8.5 w-8.5 rounded-xl flex items-center justify-center transition-colors shadow-xs",
                  activePatientTab === 'upcoming'
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                )}>
                  <CalendarDays className="h-4 w-4" />
                </div>
                {upcomingAppointments.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                    {upcomingAppointments.length}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">Próximas Citas</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {upcomingAppointments.length > 0 ? `${upcomingAppointments.length} agendada${upcomingAppointments.length === 1 ? '' : 's'}` : 'Sin citas'}
                </p>
              </div>
              {activePatientTab === 'upcoming' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-b-2xl" />
              )}
            </button>

            {/* Cuadrito 2: Mis Récipes Médicos */}
            <button
              type="button"
              onClick={() => setActivePatientTab('recipes')}
              className={cn(
                "p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer",
                activePatientTab === 'recipes'
                  ? "bg-gradient-to-br from-teal-500/10 via-white to-emerald-50/50 border-teal-600 shadow-md ring-2 ring-teal-500/20"
                  : "bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className={cn(
                  "h-8.5 w-8.5 rounded-xl flex items-center justify-center transition-colors shadow-xs",
                  activePatientTab === 'recipes'
                    ? "bg-teal-600 text-white"
                    : "bg-teal-50 text-teal-600 group-hover:bg-teal-100"
                )}>
                  <Pill className="h-4 w-4" />
                </div>
                {totalRecipesCount > 0 && (
                  <span className={cn(
                    "text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs",
                    unreadRecipesCount > 0 ? "bg-teal-600 text-white animate-pulse" : "bg-slate-100 text-slate-600"
                  )}>
                    {unreadRecipesCount > 0 ? `${unreadRecipesCount} Nuevo${unreadRecipesCount === 1 ? '' : 's'}` : `${totalRecipesCount}`}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">Mis Récipes</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {unreadRecipesCount > 0 
                    ? `${unreadRecipesCount} por revisar` 
                    : totalRecipesCount > 0 
                      ? `${totalRecipesCount} disponible${totalRecipesCount === 1 ? '' : 's'}` 
                      : 'Sin récipes'}
                </p>
              </div>
              {activePatientTab === 'recipes' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600 rounded-b-2xl" />
              )}
            </button>

            {/* Cuadrito 3: Informes & Reposos Médicos */}
            <button
              type="button"
              onClick={() => setActivePatientTab('reports')}
              className={cn(
                "p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer",
                activePatientTab === 'reports'
                  ? "bg-gradient-to-br from-blue-500/10 via-white to-sky-50/50 border-blue-600 shadow-md ring-2 ring-blue-500/20"
                  : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className={cn(
                  "h-8.5 w-8.5 rounded-xl flex items-center justify-center transition-colors shadow-xs",
                  activePatientTab === 'reports'
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                )}>
                  <FileText className="h-4 w-4" />
                </div>
                {patientReports.length > 0 && (
                  <span className={cn(
                    "text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs",
                    activeRestCount > 0 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                  )}>
                    {activeRestCount > 0 ? `${activeRestCount} Reposo` : `${patientReports.length}`}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">Informes & Reposos</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeRestCount > 0 
                    ? `🟢 ${activeRestCount} Reposo Activo` 
                    : patientReports.length > 0 
                      ? `${patientReports.length} emitido${patientReports.length === 1 ? '' : 's'}` 
                      : 'Sin informes'}
                </p>
              </div>
              {activePatientTab === 'reports' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-b-2xl" />
              )}
            </button>

            {/* Cuadrito 4: Historial Médico */}
            <button
              type="button"
              onClick={() => setActivePatientTab('history')}
              className={cn(
                "p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer",
                activePatientTab === 'history'
                  ? "bg-gradient-to-br from-purple-500/10 via-white to-violet-50/50 border-purple-600 shadow-md ring-2 ring-purple-500/20"
                  : "bg-white border-slate-200 hover:border-purple-300 hover:shadow-xs"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className={cn(
                  "h-8.5 w-8.5 rounded-xl flex items-center justify-center transition-colors shadow-xs",
                  activePatientTab === 'history'
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 text-purple-600 group-hover:bg-purple-100"
                )}>
                  <ClipboardList className="h-4 w-4" />
                </div>
                {filteredHistoryAppointments.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white shadow-xs">
                    {filteredHistoryAppointments.length}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">Historial</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {filteredHistoryAppointments.length > 0 ? `${filteredHistoryAppointments.length} consulta${filteredHistoryAppointments.length === 1 ? '' : 's'}` : 'Sin consultas'}
                </p>
              </div>
              {activePatientTab === 'history' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-b-2xl" />
              )}
            </button>

            {/* Cuadrito 5: Mis Jornadas / Eventos de Salud */}
            <button
              type="button"
              onClick={() => setActivePatientTab('campaigns')}
              className={cn(
                "p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer",
                activePatientTab === 'campaigns'
                  ? "bg-gradient-to-br from-emerald-500/10 via-white to-teal-50/60 border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                  : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className={cn(
                  "h-8.5 w-8.5 rounded-xl flex items-center justify-center transition-colors shadow-xs",
                  activePatientTab === 'campaigns'
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                )}>
                  <Ticket className="h-4 w-4" />
                </div>
                {patientCampaignRegistrations.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                    {patientCampaignRegistrations.length}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">Mis Jornadas</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {patientCampaignRegistrations.length > 0
                    ? `${patientCampaignRegistrations.length} evento${patientCampaignRegistrations.length === 1 ? '' : 's'} suscrito${patientCampaignRegistrations.length === 1 ? '' : 's'}`
                    : 'Tickets y eventos'}
                </p>
              </div>
              {activePatientTab === 'campaigns' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-b-2xl" />
              )}
            </button>

            {/* Cuadrito 6: Agendar Cita con Asistente / IA */}
            <Link
              href="/ai-assistant"
              className="p-3.5 sm:p-4 rounded-2xl border border-teal-400/80 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className="h-8.5 w-8.5 rounded-xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white uppercase tracking-wider">
                  Asistente
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-white leading-tight flex items-center gap-1">
                  Agendar Cita
                </p>
                <p className="text-[11px] text-teal-100 mt-0.5">
                  Con Inteligencia Artificial
                </p>
              </div>
            </Link>

          </div>

          {/* ========================================================================= */}
          {/* VISTA DINÁMICA SEGÚN PESTAÑA / CUADRO SELECCIONADO                         */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            
            {/* 1. SECCIÓN: PRÓXIMAS CITAS */}
            {activePatientTab === 'upcoming' && (
              <Card className="border-indigo-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50/60 to-white pb-3 border-b border-indigo-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base md:text-xl font-bold text-slate-900 flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-indigo-600" />
                        Próximas Citas Agendadas
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        Citas confirmadas y pendientes de atención médica.
                      </CardDescription>
                    </div>
                    {upcomingAppointments.length > 0 && (
                      <Button asChild size="sm" variant="outline" className="text-xs h-8">
                        <Link href="/find-a-doctor">Nueva Cita</Link>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {upcomingAppointments.length > 0 ? (
                    <div className="space-y-3 md:space-y-4">
                      {upcomingAppointments.map(appt => (
                        <AppointmentCard
                          key={appt.id}
                          appointment={appt}
                          doctor={allDoctors.find(d => d.id === appt.doctorId)}
                          onUpdateConfirmation={updateAppointmentConfirmation}
                          onOpenChat={handleOpenChat}
                          onOpenPrescription={handleOpenPrescription}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 md:py-14 text-muted-foreground flex flex-col items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-1">
                        <CalendarPlus className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm md:text-base">No tienes próximas citas agendadas</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Reserva una consulta presencial u online con nuestros especialistas.</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                          <Link href="/find-a-doctor">Buscar Especialistas</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="text-xs">
                          <Link href="/ai-assistant">Hablar con Asistente</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 2. SECCIÓN: MIS RÉCIPES MÉDICOS */}
            {activePatientTab === 'recipes' && (
              <Card className="border-teal-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-teal-50/60 to-white pb-3 border-b border-teal-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base md:text-xl font-bold text-teal-950 flex items-center gap-2">
                        <Pill className="h-5 w-5 text-teal-600" />
                        Mis Récipes Médicos Oficiales
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        Prescripciones e indicaciones en formato oficial horizontal firmadas por tus médicos.
                      </CardDescription>
                    </div>
                    {unreadRecipesCount > 0 && (
                      <Badge className="bg-teal-600 text-white text-xs font-medium animate-pulse">
                        {unreadRecipesCount} Nuevo{unreadRecipesCount === 1 ? '' : 's'} sin abrir
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {isLoadingRecords ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
                    </div>
                  ) : patientRecords.filter(r => r.prescription || r.treatment_plan).length > 0 ? (
                    <div className="space-y-3">
                      {patientRecords.filter(r => r.prescription || r.treatment_plan).map((record) => {
                        const recDoctor = allDoctors.find(d => d.id === record.doctor_id) || record.doctors;
                        const isUnread = !readPrescriptionIds.has(record.id);

                        return (
                          <div
                            key={record.id}
                            className={cn(
                              "border rounded-2xl p-4 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                              isUnread 
                                ? "bg-teal-50/20 border-teal-300 ring-1 ring-teal-400/30" 
                                : "bg-white border-slate-200 hover:border-teal-200"
                            )}
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-900">
                                  Dr(a). {recDoctor?.name || 'Médico Tratante'}
                                </span>
                                <Badge variant="outline" className="text-[10px] text-teal-700 bg-teal-50 border-teal-200">
                                  {recDoctor?.specialty || 'Consulta'}
                                </Badge>
                                {isUnread ? (
                                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                                    ● Nuevo sin abrir
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                                    Leído
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {format(parseISO(record.visit_date || record.created_at || new Date().toISOString()), "dd 'de' MMMM, yyyy", { locale: es })}
                              </p>
                              <div className="text-xs text-slate-700 font-medium line-clamp-2 bg-teal-50/40 p-2.5 rounded-xl mt-1 border border-teal-100/80">
                                <span className="text-teal-800 font-bold">℞: </span>
                                {record.prescription || record.treatment_plan}
                              </div>
                            </div>

                            <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-teal-600 hover:bg-teal-700 text-white text-xs w-full sm:w-auto shadow-xs font-medium"
                                onClick={() => handleOpenPrescription(record)}
                              >
                                <Printer className="h-3.5 w-3.5 mr-1.5" /> Ver Récipe Oficial
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs w-full sm:w-auto font-medium"
                                onClick={() => {
                                  setSelectedPrescriptionRecord(record);
                                  const doc = allDoctors.find(d => d.id === record.doctor_id) || record.doctors || null;
                                  setSelectedPrescriptionDoctor(doc);
                                  setIsSendToPharmacyOpen(true);
                                }}
                              >
                                <Store className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Enviar a Farmacia
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 md:py-14 text-muted-foreground space-y-2">
                      <div className="h-14 w-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mx-auto mb-1">
                        <Pill className="h-7 w-7" />
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">Aún no tienes récipes médicos emitidos</p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Cuando un doctor te recete medicamentos en tu consulta, tu récipe oficial con firma digital aparecerá aquí para imprimir o llevar a la farmacia.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 3. SECCIÓN: MIS INFORMES MÉDICOS Y CONSTANCIAS DE REPOSO */}
            {activePatientTab === 'reports' && (
              <Card className="border-blue-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50/60 to-white pb-3 border-b border-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base md:text-xl font-bold text-blue-950 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Mis Informes Médicos y Constancias de Reposo
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        Documentos clínicos oficiales con firma digital y código QR válidos para RRHH y empresas.
                      </CardDescription>
                    </div>
                    {activeRestCount > 0 && (
                      <Badge className="bg-emerald-600 text-white text-xs font-medium animate-pulse flex items-center gap-1">
                        <BedDouble className="h-3.5 w-3.5" />
                        {activeRestCount} Reposo Activo
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {isLoadingRecords ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    </div>
                  ) : patientReports.length > 0 ? (
                    <div className="space-y-3">
                      {patientReports.map((record) => {
                        const recDoctor = allDoctors.find(d => d.id === record.doctor_id) || record.doctors;
                        const hasRest = Boolean(record.requires_rest || (record.rest_days && record.rest_days > 0));
                        const today = new Date().toISOString().split('T')[0];
                        const isRestActive = hasRest && (!record.rest_end_date || record.rest_end_date >= today);

                        let formattedDate = 'Fecha no disponible';
                        try {
                          if (record.visit_date || record.created_at) {
                            formattedDate = format(parseISO(record.visit_date || record.created_at || ''), "dd 'de' MMMM, yyyy", { locale: es });
                          }
                        } catch {
                          formattedDate = 'Consulta médica';
                        }

                        return (
                          <div
                            key={record.id}
                            className={cn(
                              "border rounded-2xl p-4 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                              isRestActive 
                                ? "bg-blue-50/30 border-blue-300 ring-1 ring-blue-400/30" 
                                : "bg-white border-slate-200 hover:border-blue-200"
                            )}
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-900">
                                  Dr(a). {recDoctor?.name || 'Médico Tratante'}
                                </span>
                                <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200">
                                  {recDoctor?.specialty || 'Consulta'}
                                </Badge>
                                {hasRest && (
                                  <Badge className={cn(
                                    "text-[10px] font-bold shadow-xs flex items-center gap-1",
                                    isRestActive 
                                      ? "bg-emerald-600 hover:bg-emerald-600 text-white" 
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  )}>
                                    <BedDouble className="h-3 w-3" />
                                    {isRestActive ? `Reposo Activo (${record.rest_days}d)` : `Reposo ${record.rest_days}d Finalizado`}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {formattedDate}
                              </p>
                              
                              {/* Detalle del Reposo / Diagnóstico */}
                              <div className="text-xs text-slate-700 font-medium bg-blue-50/40 p-2.5 rounded-xl mt-1 border border-blue-100/80 space-y-1">
                                {record.diagnosis && (
                                  <div>
                                    <span className="text-blue-900 font-bold">Diagnóstico: </span>
                                    <span>{record.diagnosis}</span>
                                  </div>
                                )}
                                {hasRest && (
                                  <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2">
                                    <span className="font-semibold text-blue-800">
                                      Tipo: {record.rest_type || 'Absoluto'}
                                    </span>
                                    {record.rest_start_date && (
                                      <span>
                                        • Desde: {format(parseISO(record.rest_start_date), 'dd/MM/yyyy')}
                                      </span>
                                    )}
                                    {record.rest_end_date && (
                                      <span>
                                        • Hasta: {format(parseISO(record.rest_end_date), 'dd/MM/yyyy')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs w-full sm:w-auto shadow-xs font-medium"
                                onClick={() => handleOpenReport(record)}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1.5" /> Ver Informe y Reposo
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 md:py-14 text-muted-foreground space-y-2">
                      <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-1">
                        <FileText className="h-7 w-7" />
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">Aún no tienes informes médicos o constancias de reposo</p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Cuando un doctor emita un informe clínico o constancia de reposo laboral, aparecerá aquí con código QR oficial para Recursos Humanos.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 4. SECCIÓN: HISTORIAL MÉDICO CON PAGINACIÓN */}
            {activePatientTab === 'history' && (
              <Card className="border-purple-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50/60 to-white pb-3 border-b border-purple-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
                    <div>
                      <CardTitle className="text-base md:text-xl font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-purple-600" />
                        Historial Médico y Consultas
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        Registro cronológico de tus consultas y atenciones previas ({filteredHistoryAppointments.length} consulta{filteredHistoryAppointments.length === 1 ? '' : 's'}).
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Filtro por familiar */}
                      {familyMembers.length > 0 && (
                        <Select value={familyFilter} onValueChange={(val) => { setFamilyFilter(val); setCurrentPage(1); }}>
                          <SelectTrigger className="w-[125px] md:w-[160px] text-xs h-8 rounded-lg">
                            <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
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
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="date"
                          placeholder="Filtrar fecha..."
                          value={dateFilter}
                          onChange={(e) => { handleDateFilter(e.target.value); setCurrentPage(1); }}
                          className="pl-8 w-full sm:w-[130px] md:w-[170px] text-xs h-8 rounded-lg"
                        />
                      </div>
                      {(isFilterActive || familyFilter !== 'all') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { clearFilter(); setFamilyFilter('all'); setCurrentPage(1); }}
                          className="flex items-center gap-1 text-xs h-8"
                        >
                          <Filter className="h-3.5 w-3.5" />
                          Limpiar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {filteredHistoryAppointments.length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-3 md:space-y-4">
                        {paginatedHistoryAppointments.map(appt => (
                          <AppointmentCard
                            key={appt.id}
                            appointment={appt}
                            doctor={allDoctors.find(d => d.id === appt.doctorId)}
                            isPast
                            onOpenChat={handleOpenChat}
                            onOpenRecord={handleOpenRecord}
                            onOpenPrescription={handleOpenPrescription}
                          />
                        ))}
                      </div>

                      {/* Controles de Paginación para Historial */}
                      {filteredHistoryAppointments.length > itemsPerPage && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                          <p className="text-xs text-muted-foreground text-center sm:text-left">
                            Mostrando <span className="font-semibold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredHistoryAppointments.length)}</span> de <span className="font-semibold text-slate-900">{filteredHistoryAppointments.length}</span> consultas
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className="text-xs h-8 px-2.5"
                            >
                              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map((pageNum) => (
                                <Button
                                  key={pageNum}
                                  size="sm"
                                  variant={currentPage === pageNum ? 'default' : 'outline'}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={cn(
                                    "text-xs h-8 w-8 p-0 font-medium",
                                    currentPage === pageNum ? "bg-purple-600 hover:bg-purple-700 text-white" : "hover:bg-purple-50"
                                  )}
                                >
                                  {pageNum}
                                </Button>
                              ))}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPage === historyTotalPages}
                              onClick={() => setCurrentPage(p => Math.min(historyTotalPages, p + 1))}
                              className="text-xs h-8 px-2.5"
                            >
                              Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 md:py-14 text-muted-foreground flex flex-col items-center gap-2">
                      <div className="h-14 w-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 mb-1">
                        <ClipboardList className="h-7 w-7" />
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {isFilterActive || familyFilter !== 'all'
                          ? 'No se encontraron consultas con los filtros seleccionados.'
                          : 'Tu historial médico aparecerá aquí después de tu primera consulta atendida.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 5. SECCIÓN: MIS JORNADAS Y EVENTOS DE SALUD SUSCRITOS */}
            {activePatientTab === 'campaigns' && (
              <Card className="border-emerald-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white pb-3 border-b border-emerald-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base md:text-xl font-bold text-emerald-950 flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-emerald-600" />
                        Mis Jornadas y Eventos de Salud Suscritos
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        Aquí aparecen todos los eventos y jornadas de salud en los que tienes cupo reservado. Haz clic en cualquier tarjeta para abrir tu Ficha de Ticket de Entrada con código QR.
                      </CardDescription>
                    </div>
                    <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shrink-0">
                      <Link href="/jornadas">
                        <HeartHandshake className="h-3.5 w-3.5 mr-1.5" />
                        Explorar Más Jornadas
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {isLoadingCampaigns ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                    </div>
                  ) : patientCampaignRegistrations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {patientCampaignRegistrations.map((reg) => {
                        const camp = reg.campaign;
                        const isExpired = Boolean(camp?.isExpired);
                        const isAttended = reg.status === 'attended' || (reg.attendances && reg.attendances.length > 0);
                        const firstAttendance = reg.attendances?.[0] || null;

                        return (
                          <div
                            key={reg.id}
                            onClick={() => setSelectedCampaignTicket(reg)}
                            className={cn(
                              "cursor-pointer rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 group",
                              isExpired
                                ? "bg-slate-100/85 border-slate-200/90 opacity-85 hover:opacity-100"
                                : "bg-white border-emerald-200 hover:border-teal-500 hover:shadow-md"
                            )}
                          >
                            <div className="space-y-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge className="bg-teal-700 text-white font-mono text-[11px] font-bold">
                                    🎟️ Cupo #{String(reg.spotNumber || 1).padStart(3, '0')}
                                  </Badge>
                                  {isAttended ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                                      ✅ Atendido en Jornada
                                    </Badge>
                                  ) : isExpired ? (
                                    <Badge className="bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-bold">
                                      🏁 Evento Culminado
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                                      🟢 Evento Vigente
                                    </Badge>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-bold",
                                    camp?.campaignType === 'free'
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                                  )}
                                >
                                  {camp?.campaignType === 'free' ? 'Gratuita' : 'Privada'}
                                </Badge>
                              </div>

                              <div>
                                <h4 className={cn(
                                  "font-extrabold text-sm sm:text-base line-clamp-2 group-hover:text-teal-700 transition-colors",
                                  isExpired ? "text-slate-700" : "text-slate-900"
                                )}>
                                  {camp?.title || 'Jornada de Salud SUMA'}
                                </h4>
                                <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                                  <Building2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                  <span className="truncate">
                                    Organiza: <strong>{camp?.organizerName || 'SUMA Salud'}</strong>
                                  </span>
                                </p>
                              </div>

                              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1 text-xs text-slate-700">
                                <p className="flex items-center gap-1.5 font-medium">
                                  <CalendarDays className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                  <span>
                                    {camp?.startDate}
                                    {camp?.endDate && camp.endDate !== camp.startDate ? ` al ${camp.endDate}` : ''} ({camp?.startTime} a {camp?.endTime})
                                  </span>
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                  <span className="truncate">
                                    {[camp?.city, camp?.state, camp?.address].filter(Boolean).join(', ') || 'Ubicación del evento'}
                                  </span>
                                </p>
                                <div className="pt-1 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                  <span>
                                    👤 Paciente: <strong>{reg.name}</strong> ({reg.cedula})
                                  </span>
                                  {reg.interestSpecialty && (
                                    <span className="font-semibold text-teal-800">
                                      🩺 {reg.interestSpecialty}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {firstAttendance && (
                                <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-bold truncate">
                                      Atendido por Dr(a). {firstAttendance.doctorName} ({firstAttendance.specialty})
                                    </p>
                                    {firstAttendance.diagnosis && (
                                      <p className="text-[11px] text-emerald-800 truncate">
                                        Diagnóstico: {firstAttendance.diagnosis}
                                      </p>
                                    )}
                                  </div>
                                  {firstAttendance.medicalRecordId && (
                                    <Button
                                      asChild
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[11px] bg-white border-emerald-300 text-emerald-800 shrink-0"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <Link href={`/ver-recipe/${firstAttendance.medicalRecordId}`} target="_blank">
                                        <Pill className="h-3 w-3 mr-1" />
                                        Récipe
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <span className="text-[11px] font-mono font-bold text-slate-500">
                                {reg.ticketCode}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold"
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedCampaignTicket(reg);
                                }}
                              >
                                <QrCode className="h-3.5 w-3.5 mr-1.5" />
                                Ver Ticket de Entrada
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 md:py-14 text-muted-foreground space-y-3">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-1">
                        <Ticket className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800 text-sm md:text-base">
                          Aún no estás suscrito a ninguna Jornada de Salud
                        </p>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Cuando reserves tu cupo en una jornada médica gratuita o privada de SUMA, tu tarjeta y tu Ticket QR de entrada aparecerán aquí automáticamente.
                        </p>
                      </div>
                      <div className="pt-1">
                        <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold">
                          <Link href="/jornadas">Ver Jornadas de Salud Disponibles</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
        <DialogContent className={isClinicChat ? "sm:max-w-[425px]" : "sm:max-w-[500px] h-[80vh] flex flex-col p-0"}>
          {isClinicChat ? (
            // Clinic Chat - Keep existing implementation
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedClinic?.logoUrl} alt={selectedClinic?.name} />
                    <AvatarFallback>{selectedClinic?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  Chat con {selectedClinic?.name}
                </DialogTitle>
                <DialogDescription>
                  Comunicación directa con la clínica.
                </DialogDescription>
              </DialogHeader>
              <div className="p-4 h-96 flex flex-col gap-4 bg-muted/50 rounded-lg">
                <div className="flex-1 space-y-4 overflow-y-auto pr-2 relative">
                  {clinicChatMessages.length === 0 ? (
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
            </>
          ) : (
            // Doctor Chat - Use new continuous chat system
            <>
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedChatDoctor?.profileImage} alt={selectedChatDoctor?.name} />
                    <AvatarFallback>{selectedChatDoctor?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span>Chat con Dr. {selectedChatDoctor?.name}</span>
                    {selectedChatDoctor?.specialty && (
                      <p className="text-xs font-normal text-muted-foreground">
                        {selectedChatDoctor.specialty}
                      </p>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>

              {selectedChatAppointment?.doctorId && user?.id && (
                <DoctorPatientChat
                  doctorId={selectedChatAppointment.doctorId}
                  patientId={user.id}
                  currentUserType="patient"
                  otherPartyName={selectedChatDoctor?.name || 'Doctor'}
                  otherPartyImage={selectedChatDoctor?.profileImage}
                  currentUserName={user.name}
                  currentUserImage={(user as any).profileImage}
                  className="flex-1"
                />
              )}
            </>
          )}
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

              {/* Récipe Médico (si existe) */}
              {medicalRecord.prescription && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-lg flex items-center gap-2 text-teal-800">
                    <Pill className="h-5 w-5 text-teal-600" /> Récipe Médico (Farmacia)
                  </h4>
                  <div className="bg-teal-50/60 p-4 rounded-lg border border-teal-200 whitespace-pre-wrap text-sm text-slate-800">
                    {medicalRecord.prescription}
                  </div>
                </div>
              )}

              {/* Tratamiento / Plan */}
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2 text-primary">
                  <FileText className="h-5 w-5" /> Plan de Tratamiento / Indicaciones
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

          <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between items-center w-full">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {selectedRecordAppointment && (
                <>
                  <Button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-xs"
                    onClick={() => {
                      setIsRecordDialogOpen(false);
                      handleOpenReport(selectedRecordAppointment);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1.5" /> Ver Informe / Reposo
                  </Button>

                  <Button
                    type="button"
                    className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto text-xs"
                    onClick={() => {
                      setIsRecordDialogOpen(false);
                      handleOpenPrescription(selectedRecordAppointment);
                    }}
                  >
                    <Pill className="h-4 w-4 mr-1.5" /> Ver Récipe Oficial
                  </Button>
                </>
              )}
            </div>
            <DialogClose asChild><Button variant="outline" className="w-full sm:w-auto">Cerrar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medical Prescription Official Modal */}
      <MedicalPrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        record={selectedPrescriptionRecord}
        doctor={selectedPrescriptionDoctor}
        patientName={selectedPrescriptionAppointment?.patientName || user.name}
        patientCedula={(user as any)?.cedula}
        patientAge={(user as any)?.age}
      />

      {/* Medical Report & Rest Certificate Official Modal */}
      <MedicalReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        record={selectedReportRecord}
        doctor={selectedReportDoctor}
        patientName={selectedReportAppointment?.patientName || user.name}
        patientCedula={(user as any)?.cedula}
        patientAge={(user as any)?.age}
      />

      {/* Welcome Modal para pacientes nuevos */}
      {showWelcomeModal && (
        <WelcomeModal
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}

      {/* Modal para Enviar Récipe a Farmacia Aliada */}
      <SendToPharmacyModal
        isOpen={isSendToPharmacyOpen}
        onClose={() => setIsSendToPharmacyOpen(false)}
        recipeCode={(selectedPrescriptionRecord as any)?.recipe_code || `SUMA-REC-${(selectedPrescriptionRecord?.id || '00000000').slice(0, 8).toUpperCase()}`}
        patientName={selectedPrescriptionAppointment?.patientName || user?.name}
        patientCedula={(user as any)?.cedula}
        doctorName={selectedPrescriptionDoctor?.name}
        doctorSpecialty={selectedPrescriptionDoctor?.specialty}
        prescriptionText={selectedPrescriptionRecord?.prescription || selectedPrescriptionRecord?.treatment_plan || ''}
        recipeUrl={typeof window !== 'undefined' && selectedPrescriptionRecord?.id ? `${window.location.origin}/ver-recipe/${selectedPrescriptionRecord.id}` : ''}
        defaultCity={(user as any)?.city || undefined}
      />

      {/* Modal de Ficha Oficial del Ticket de Entrada a la Jornada de Salud */}
      <Dialog
        open={Boolean(selectedCampaignTicket)}
        onOpenChange={(open) => {
          if (!open) setSelectedCampaignTicket(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto p-0 rounded-2xl overflow-hidden">
          {selectedCampaignTicket && (() => {
            const camp = selectedCampaignTicket.campaign;
            const spotStr = String(selectedCampaignTicket.spotNumber || 1).padStart(3, '0');
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
              `SUMA-JORNADA:${selectedCampaignTicket.campaignId}|TICKET:${selectedCampaignTicket.ticketCode}|CUPO:${spotStr}|CEDULA:${selectedCampaignTicket.cedula}`
            )}`;

            return (
              <div className="space-y-0">
                <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-800 text-white p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-teal-200 flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5" />
                      Ticket Oficial de Entrada • SUMA Salud
                    </span>
                    <Badge className="bg-white/20 text-white border-white/30 text-[10px]">
                      {camp?.campaignType === 'free' ? 'Jornada Gratuita' : 'Jornada Privada'}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-extrabold leading-snug">
                    {camp?.title || 'Jornada de Salud SUMA'}
                  </h3>
                  <p className="text-xs text-teal-100">
                    Organizado por: <strong>{camp?.organizerName || 'SUMA Salud'}</strong>
                  </p>
                </div>

                <div className="p-5 space-y-4 bg-white">
                  {/* Cupo + QR */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-teal-50/70 border-2 border-dashed border-teal-300">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">
                        Número de Cupo Reservado
                      </span>
                      <p className="text-4xl font-black text-teal-900 font-mono">
                        #{spotStr}
                      </p>
                      <p className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded border border-teal-200 inline-block">
                        {selectedCampaignTicket.ticketCode}
                      </p>
                      <div className="pt-1">
                        {selectedCampaignTicket.status === 'attended' ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            ✅ Paciente Atendido
                          </Badge>
                        ) : camp?.isExpired ? (
                          <Badge className="bg-slate-600 text-white text-[10px]">
                            🏁 Evento Culminado
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px]">
                            🟢 Entrada Confirmada
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs shrink-0 text-center">
                      <img
                        src={qrUrl}
                        alt="QR Ticket Jornada"
                        className="h-28 w-28 mx-auto"
                      />
                      <span className="text-[9px] text-slate-400 font-medium block mt-1">
                        Presentar al llegar
                      </span>
                    </div>
                  </div>

                  {/* Ficha de Datos del Paciente y del Evento */}
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                    <div className="p-3 flex items-center justify-between gap-2">
                      <span className="text-slate-500">Paciente / Asistente:</span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedCampaignTicket.name} ({selectedCampaignTicket.cedula})
                      </span>
                    </div>
                    {selectedCampaignTicket.interestSpecialty && (
                      <div className="p-3 flex items-center justify-between gap-2">
                        <span className="text-slate-500">Especialidad solicitada:</span>
                        <Badge variant="secondary" className="bg-teal-50 text-teal-800 text-xs font-bold">
                          {selectedCampaignTicket.interestSpecialty}
                        </Badge>
                      </div>
                    )}
                    <div className="p-3 flex items-center justify-between gap-2">
                      <span className="text-slate-500">Fecha y Horario:</span>
                      <span className="font-semibold text-slate-800 text-right">
                        📅 {camp?.startDate}
                        {camp?.endDate && camp.endDate !== camp.startDate ? ` al ${camp.endDate}` : ''} • {camp?.startTime} a {camp?.endTime}
                      </span>
                    </div>
                    <div className="p-3 flex items-start justify-between gap-2">
                      <span className="text-slate-500 shrink-0">Ubicación:</span>
                      <span className="font-medium text-slate-800 text-right">
                        📍 {[camp?.address, camp?.sector, camp?.city, camp?.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                    {camp?.campaignType === 'paid' && (
                      <div className="p-3 flex items-center justify-between gap-2 bg-amber-50/50">
                        <span className="text-amber-900 font-medium">Aporte / Pago reportado:</span>
                        <span className="font-bold text-amber-900">
                          ${Number(selectedCampaignTicket.amountPaid || camp?.priceAmount || 0).toFixed(2)} USD
                          {selectedCampaignTicket.paymentMethod ? ` (${selectedCampaignTicket.paymentMethod})` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Si ya fue atendido, mostrar acceso directo a su récipe */}
                  {selectedCampaignTicket.attendances && selectedCampaignTicket.attendances.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <p className="text-xs font-extrabold text-emerald-950">
                        🩺 Atención Médica Registrada en esta Jornada:
                      </p>
                      {selectedCampaignTicket.attendances.map((att: any) => (
                        <div key={att.id} className="flex items-center justify-between gap-2 text-xs bg-white p-2.5 rounded-lg border border-emerald-100">
                          <div>
                            <p className="font-bold text-slate-900">
                              Dr(a). {att.doctorName} ({att.specialty})
                            </p>
                            {att.diagnosis && (
                              <p className="text-[11px] text-slate-600">{att.diagnosis}</p>
                            )}
                          </div>
                          {att.medicalRecordId && (
                            <Button asChild size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white">
                              <Link href={`/ver-recipe/${att.medicalRecordId}`} target="_blank">
                                <Pill className="h-3.5 w-3.5 mr-1" />
                                Ver Récipe
                              </Link>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => window.print()}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1.5" />
                        Imprimir / Guardar PDF
                      </Button>
                      <Button asChild size="sm" variant="secondary" className="text-xs">
                        <Link href={`/jornadas/${selectedCampaignTicket.campaignId}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Página del Evento
                        </Link>
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => setSelectedCampaignTicket(null)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}


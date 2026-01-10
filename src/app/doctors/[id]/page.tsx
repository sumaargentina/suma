"use client";
export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Star,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Banknote,
  Landmark,
  Loader2,
  AlertCircle,
  ClipboardCheck,
  Video,
  Building2,
  ShieldCheck
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import * as supabaseService from "@/lib/supabaseService";
// import { notificationService } from '@/lib/notifications/notification-service';
import { Doctor, Appointment, Service, BankDetail, Clinic, PaymentSettings, FamilyMember, FamilyRelationship } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { HeaderWrapper, BottomNav } from "@/components/header";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { DoctorReviews } from "@/components/doctor-reviews";
import { CalendarNotification } from "@/components/calendar-notification";

// Definido localmente para evitar problemas de importación
const FAMILY_RELATIONSHIP_LABELS: Record<FamilyRelationship, string> = {
  hijo: 'Hijo',
  hija: 'Hija',
  padre: 'Padre',
  madre: 'Madre',
  abuelo: 'Abuelo',
  abuela: 'Abuela',
  nieto: 'Nieto',
  nieta: 'Nieta',
  conyuge: 'Cónyuge',
  hermano: 'Hermano',
  hermana: 'Hermana',
  otro: 'Otro',
};

// Utility functions
const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, l => l.toUpperCase());
};

const getScheduleForDay = (schedule: any, dayIndex: number) => {
  if (!schedule) return null;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[dayIndex];
  return schedule[dayName];
};

const generateTimeSlots = (start: string, end: string, duration: number) => {
  const slots = [];
  let current = new Date(`2000-01-01T${start}`);
  const endTime = new Date(`2000-01-01T${end}`);

  while (current < endTime) {
    slots.push(current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    current.setMinutes(current.getMinutes() + duration);
  }
  return slots;
};

export default function DoctorProfile() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<'selectPatient' | 'selectDateTime' | 'selectServices' | 'selectPayment' | 'confirmation'>('selectPatient');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'mercadopago' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBankDetail, setSelectedBankDetail] = useState<BankDetail | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showCalendarNotification, setShowCalendarNotification] = useState(false);
  const [lastCreatedAppointment, setLastCreatedAppointment] = useState<any>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [consultationType, setConsultationType] = useState<'presencial' | 'online'>('presencial');
  const [clinic, setClinic] = useState<Clinic | null>(null); // Clínica asociada al médico (si aplica)

  // Núcleo Familiar - Estado para selección de paciente
  const [bookingFor, setBookingFor] = useState<'myself' | 'family'>('myself');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (id) {
      try {
        const docAppointments = await supabaseService.getDoctorAppointments(id);
        setAppointments(docAppointments);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      // Validar que el ID sea un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        toast({
          variant: "destructive",
          title: "ID inválido",
          description: "El identificador del médico no es válido.",
        });
        router.push('/find-a-doctor');
        return;
      }

      const fetchDoctorAndAppointments = async () => {
        setIsLoading(true);
        try {
          const [docData, docAppointments] = await Promise.all([
            supabaseService.getDoctor(id),
            supabaseService.getDoctorAppointments(id),
          ]);

          if (docData) {
            setDoctor(docData);
            if (docData.addresses && docData.addresses.length > 0) {
              setSelectedAddressId(docData.addresses[0].id);
            }
            setAppointments(docAppointments);

            // Cargar cupones: Plataforma + Clínica (si aplica)
            try {
              const settings = await supabaseService.getSettings();
              let allCoupons = settings?.coupons || [];

              // Si es médico de clínica, agregar cupones de la clínica
              if (docData.clinicId) {
                const clinicData = await supabaseService.getClinic(docData.clinicId);
                if (clinicData && clinicData.coupons) {
                  allCoupons = [...allCoupons, ...clinicData.coupons];
                }
                if (clinicData) setClinic(clinicData); // Ensure clinic is set
              }

              setCoupons(allCoupons.filter(c => c.isActive !== false));
            } catch (couponError) {
              console.error('Error loading coupons:', couponError);
            }
          } else {
            toast({
              variant: "destructive",
              title: "Médico no encontrado",
              description: "No se pudo encontrar el perfil de este médico.",
            });
            router.push('/find-a-doctor');
          }
        } catch {
          toast({
            variant: "destructive",
            title: "Error de Carga",
            description: "No se pudieron cargar los datos del médico.",
          });
        } finally {
          setIsLoading(false);
        }
      }
      fetchDoctorAndAppointments();
    }
  }, [id, router, toast]);

  // Cargar familiares cuando el usuario está autenticado
  useEffect(() => {
    const loadFamilyMembers = async () => {
      if (user && user.role === 'patient') {
        setIsLoadingFamily(true);
        try {
          const members = await supabaseService.getFamilyMembersForBooking(user.id);
          setFamilyMembers(members);
        } catch (error) {
          console.error('Error loading family members:', error);
        } finally {
          setIsLoadingFamily(false);
        }
      }
    };
    loadFamilyMembers();
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'patient' && doctor) {
      const urlParams = new URLSearchParams(window.location.search);
      const shouldRestore = urlParams.get('restoreAppointment') === 'true';

      if (shouldRestore) {
        const pendingAppointmentStr = sessionStorage.getItem('pendingAppointment');
        if (pendingAppointmentStr) {
          try {
            const pendingData = JSON.parse(pendingAppointmentStr);
            if (pendingData.doctorId === id) {
              if (pendingData.selectedDate) setSelectedDate(new Date(pendingData.selectedDate));
              if (pendingData.selectedTime) setSelectedTime(pendingData.selectedTime);
              if (pendingData.selectedServices) setSelectedServices(pendingData.selectedServices);
              if (pendingData.paymentMethod) setPaymentMethod(pendingData.paymentMethod);
              if (pendingData.selectedBankDetail) setSelectedBankDetail(pendingData.selectedBankDetail);
              if (pendingData.appliedCoupon) {
                setAppliedCoupon(pendingData.appliedCoupon);
                setDiscountAmount(pendingData.discountAmount || 0);
              }
              if (pendingData.couponInput) setCouponInput(pendingData.couponInput);
              if (pendingData.selectedAddressId) setSelectedAddressId(pendingData.selectedAddressId);

              if (pendingData.selectedDate && pendingData.selectedTime) {
                setStep('selectServices');
              } else if (pendingData.step) {
                setStep(pendingData.step);
              }

              sessionStorage.removeItem('pendingAppointment');
              window.history.replaceState({}, '', `/doctors/${id}`);
              toast({
                title: "Datos restaurados",
                description: "Hemos restaurado los datos de tu cita. Puedes continuar con el proceso.",
              });
            } else {
              sessionStorage.removeItem('pendingAppointment');
            }
          } catch (error) {
            console.error('❌ Error restaurando datos de cita:', error);
            sessionStorage.removeItem('pendingAppointment');
          }
        }
      }
    }
  }, [user, id, doctor, toast]);

  useEffect(() => {
    if (authLoading) return;
    if ((!user || user.role !== 'patient') && (step === 'selectServices' || step === 'selectPayment')) {
      if (selectedDate && selectedTime) {
        try {
          const pendingAppointmentData = {
            doctorId: id,
            selectedDate: selectedDate.toISOString(),
            selectedTime: selectedTime,
            selectedServices: [],
            paymentMethod: null,
            selectedBankDetail: null,
            appliedCoupon: null,
            discountAmount: 0,
            couponInput: "",
            step: 'selectDateTime',
            selectedAddressId,
          };
          sessionStorage.setItem('pendingAppointment', JSON.stringify(pendingAppointmentData));
        } catch (error) {
          console.error('Error guardando datos pendientes:', error);
        }
      }
      setStep('selectDateTime');
      toast({
        title: "Debes iniciar sesión",
        description: "Necesitas estar registrado o iniciar sesión para continuar con tu cita.",
      });
      router.push(`/auth/login?redirect=/doctors/${id}`);
    }
  }, [user, authLoading, step, id, router, toast, selectedDate, selectedTime, selectedAddressId]);

  const subtotal = useMemo(() => {
    return selectedServices.reduce((total, service) => total + service.price, 0);
  }, [selectedServices]);

  const currentAddress = useMemo(() => {
    if (!doctor) return null;

    // Si es consulta online, retornar configuración online
    if (consultationType === 'online' && doctor.onlineConsultation?.enabled) {
      return {
        id: 'online',
        name: 'Consulta Online',
        address: 'Videollamada',
        city: doctor.city,
        schedule: doctor.onlineConsultation.schedule,
        consultationFee: doctor.onlineConsultation.consultationFee,
        services: doctor.onlineConsultation.services || doctor.services,
        slotDuration: doctor.onlineConsultation.slotDuration || 30
      };
    }

    // Consulta presencial
    if (doctor.addresses && doctor.addresses.length > 0 && selectedAddressId) {
      return doctor.addresses.find(a => a.id === selectedAddressId) || doctor.addresses[0];
    }
    return {
      id: 'legacy',
      name: 'Consultorio Principal',
      address: doctor.address,
      city: doctor.city,
      schedule: doctor.schedule,
      consultationFee: doctor.consultationFee,
      services: doctor.services,
      slotDuration: doctor.slotDuration || 30
    };
  }, [doctor, selectedAddressId, consultationType]);

  const finalPrice = useMemo(() => {
    if (!doctor) return 0;
    const baseFee = (currentAddress && currentAddress.consultationFee !== undefined)
      ? currentAddress.consultationFee
      : (doctor.consultationFee || 0);
    const priceAfterDiscount = baseFee + subtotal - discountAmount;
    return priceAfterDiscount < 0 ? 0 : priceAfterDiscount;
  }, [doctor, subtotal, discountAmount, currentAddress]);

  const availableSlots = useMemo(() => {
    if (!selectedDate || !doctor || !appointments || !currentAddress) {
      return [];
    }
    try {
      const dayIndex = selectedDate.getDay();
      const daySchedule = getScheduleForDay(currentAddress.schedule, dayIndex);

      if (!daySchedule || !daySchedule.active || !Array.isArray(daySchedule.slots)) {
        return [];
      }

      const allSlotsSet = new Set<string>();
      // Usar la duración del consultorio actual, o la del doctor como fallback
      const slotDuration = currentAddress.slotDuration || doctor.slotDuration || 30;

      daySchedule.slots.forEach((slot: any) => {
        const generated = generateTimeSlots(slot.start, slot.end, slotDuration);
        generated.forEach(s => allSlotsSet.add(s));
      });

      const allSlots = Array.from(allSlotsSet).sort();
      const selectedDateString = selectedDate.toISOString().split('T')[0];

      const bookedSlots = appointments
        .filter(appt => {
          if (appt.date !== selectedDateString) return false;
          if (appt.addressId) {
            return appt.addressId === currentAddress.id;
          }
          return true;
        })
        .map(appt => appt.time);

      return allSlots.filter(slot => !bookedSlots.includes(slot));
    } catch (error) {
      console.error('Error calculando availableSlots:', error);
      return [];
    }
  }, [selectedDate, doctor, appointments, currentAddress]);

  const handleServiceToggle = (service: Service) => {
    setSelectedServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  };

  const handleApplyCoupon = () => {
    if (!id || !couponInput || !doctor) return;

    // Filtrar cupones que aplican a este médico
    const applicableCoupons = coupons.filter(c => {
      // Verificar si el cupón está activo
      if (c.isActive === false) return false;

      // Verificar fecha de validez
      const now = new Date();
      if (c.validFrom && new Date(c.validFrom) > now) return false;
      if (c.validTo && new Date(c.validTo) < now) return false;

      // Verificar alcance del cupón
      switch (c.scopeType) {
        case 'all':
          return true;
        case 'specialty':
          return c.scopeSpecialty === doctor.specialty;
        case 'city':
          return c.scopeCity === doctor.city;
        case 'specific':
          return c.scopeDoctors?.includes(doctor.id);
        default:
          // Compatibilidad con formato antiguo
          return c.scope === 'general' || c.scope === id ||
            (c.scope === 'specialty' && c.specialty === doctor.specialty);
      }
    });

    const coupon = applicableCoupons.find(c => c.code.toUpperCase() === couponInput.toUpperCase());

    if (!coupon) {
      toast({
        variant: "destructive",
        title: "Cupón Inválido",
        description: "El código ingresado no es válido o no aplica para este médico.",
      });
      return;
    }

    // Verificar límite de usos
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      toast({
        variant: "destructive",
        title: "Cupón Agotado",
        description: "Este cupón ha alcanzado su límite de usos.",
      });
      return;
    }

    setAppliedCoupon(coupon);

    let discount = 0;
    const basePrice = (currentAddress && currentAddress.consultationFee !== undefined)
      ? currentAddress.consultationFee
      : (doctor.consultationFee || 0);

    // Usar los campos correctos: discountType y discountValue
    if (coupon.discountType === 'percentage') {
      discount = (basePrice * coupon.discountValue) / 100;
      // Aplicar límite máximo de descuento si existe
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    // No permitir descuento mayor al precio base
    if (discount > basePrice) {
      discount = basePrice;
    }

    setDiscountAmount(discount);

    toast({
      title: "Cupón Aplicado",
      description: `Se ha aplicado un descuento de $${discount.toFixed(2)}.`,
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponInput("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handleDateTimeSubmit = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        variant: "destructive",
        title: "Selección incompleta",
        description: "Por favor, selecciona una fecha y hora.",
      });
      return;
    }

    if (!authLoading) {
      if (user && user.role !== 'patient') {
        toast({
          variant: "destructive",
          title: "Acceso Restringido",
          description: `Estás conectado como ${user.role === 'doctor' ? 'Médico' : user.role}. Debes iniciar sesión como Paciente para agendar.`,
        });
        return;
      }

      if (!user) {
        const pendingAppointmentData = {
          doctorId: id,
          selectedDate: selectedDate.toISOString(),
          selectedTime,
          selectedServices: [],
          paymentMethod: null,
          selectedBankDetail: null,
          appliedCoupon: null,
          discountAmount: 0,
          couponInput: "",
          step: 'selectDateTime',
          selectedAddressId,
        };
        sessionStorage.setItem('pendingAppointment', JSON.stringify(pendingAppointmentData));

        toast({
          title: "Debes iniciar sesión",
          description: "Necesitas estar registrado o iniciar sesión para continuar con tu cita.",
        });
        router.push(`/auth/login?redirect=/doctors/${id}`);
        return;
      }
    }
    setStep('selectServices');
  };

  const handlePaymentSubmit = async () => {
    if (!user || !doctor || !selectedDate || !selectedTime || !paymentMethod) return;

    if (paymentMethod === 'transferencia') {
      if (!selectedBankDetail) {
        toast({
          variant: "destructive",
          title: "Cuenta Bancaria Requerida",
          description: "Por favor, selecciona una cuenta bancaria para la transferencia.",
        });
        return;
      }

      if (!paymentProof) {
        toast({
          variant: "destructive",
          title: "Comprobante Requerido",
          description: "Por favor, sube el comprobante de pago.",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let proofUrl: string | null = null;

      if (paymentMethod === 'transferencia' && paymentProof) {
        try {
          setUploadProgress('Subiendo comprobante de pago...');
          const fileName = `payment-proofs/${doctor.id}/${Date.now()}-${paymentProof.name}`;
          proofUrl = await supabaseService.uploadPaymentProof(paymentProof, fileName);
          setUploadProgress('Comprobante subido exitosamente');
        } catch (uploadError) {
          console.error('Error al subir comprobante:', uploadError);
          let errorMessage = "No se pudo subir el comprobante de pago.";
          if (uploadError instanceof Error) {
            errorMessage = uploadError.message;
          }
          toast({
            variant: "destructive",
            title: "Error al Subir Comprobante",
            description: errorMessage,
          });
          setUploadProgress('');
          return;
        }
      }

      setUploadProgress('Creando cita...');

      const appointmentData = {
        patientId: user.id,
        // Si es para un familiar, usar su nombre; si no, usar el del usuario
        patientName: selectedFamilyMember
          ? `${selectedFamilyMember.firstName} ${selectedFamilyMember.lastName}`
          : user.name,
        doctorId: doctor.id,
        doctorName: doctor.name,
        consultationFee: (currentAddress && currentAddress.consultationFee !== undefined) ? currentAddress.consultationFee : (doctor.consultationFee || 0),
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        services: selectedServices,
        totalPrice: finalPrice,
        paymentMethod: paymentMethod,
        paymentStatus: 'Pendiente' as const,
        paymentProof: proofUrl,
        attendance: 'Pendiente' as const,
        patientConfirmationStatus: 'Pendiente' as const,
        discountAmount: discountAmount > 0 ? discountAmount : 0,
        appliedCoupon: appliedCoupon?.code || undefined,
        patientPhone: selectedFamilyMember?.phone || (user.phone ?? undefined),
        doctorAddress: currentAddress?.address || doctor.address,
        addressId: currentAddress?.id,
        consultationType: consultationType,
        // Núcleo Familiar
        familyMemberId: selectedFamilyMember?.id || undefined,
        bookedByPatientId: user.id, // Siempre es quien está haciendo la reserva
      };

      if (appointmentData.appliedCoupon === undefined) {
        delete appointmentData.appliedCoupon;
      }
      const newAppointment = await supabaseService.addAppointment(appointmentData);

      // Si es MercadoPago, redirigir al checkout
      if (paymentMethod === 'mercadopago') {
        const response = await fetch('/api/payments/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: newAppointment.id,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone
            }
          })
        });

        const data = await response.json();

        if (data.initPoint) {
          // Redirigir a MercadoPago
          window.location.href = data.initPoint;
          return;
        } else {
          throw new Error('No se pudo iniciar el pago con MercadoPago');
        }
      }

      // Flujo normal (efectivo/transferencia)
      // Enviar notificaciones
      try {
        // Llamar a API para notificaciones (Bypass Cliente)
        await fetch('/api/notifications/confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: newAppointment.id })
        });
      } catch (notifError) {
        console.error('❌ Error sending confirmation:', notifError);
      }

      sessionStorage.removeItem('pendingAppointment');
      setUploadProgress('Finalizando...');
      await fetchAppointments();

      setLastCreatedAppointment({
        ...appointmentData,
        doctorName: doctor.name,
        doctorAddress: doctor.address,
      });

      toast({
        title: "¡Cita Agendada!",
        description: "Tu cita ha sido confirmada exitosamente.",
      });

      setStep('confirmation');

      setTimeout(() => {
        setShowCalendarNotification(true);
      }, 2000);
    } catch (error) {
      console.error('Error al agendar cita:', error);
      if (error instanceof Error && error.message.includes('Ya existe una cita agendada')) {
        toast({
          variant: "destructive",
          title: "Horario No Disponible",
          description: error.message,
        });
        await fetchAppointments();
        setStep('selectDateTime');
        setSelectedTime(null);
      } else {
        toast({
          variant: "destructive",
          title: "Error al Agendar",
          description: "No se pudo agendar la cita. Intenta de nuevo.",
        });
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const resetBookingFlow = () => {
    setStep('selectPatient');
    setSelectedDate(new Date());
    setSelectedTime(null);
    setSelectedServices([]);
    setPaymentMethod(null);
    setSelectedBankDetail(null);
    setPaymentProof(null);
    handleRemoveCoupon();
    // Reset de Núcleo Familiar
    setBookingFor('myself');
    setSelectedFamilyMember(null);
  };

  const isDayDisabled = (date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
      return true;
    }
    if (!currentAddress?.schedule && !doctor?.schedule) return true;
    const scheduleToUse = currentAddress?.schedule || doctor?.schedule;
    const daySchedule = getScheduleForDay(scheduleToUse, date.getDay());
    return !daySchedule?.active;
  }

  // Verificar si el médico puede recibir citas
  const canAcceptAppointments = useMemo(() => {
    if (!doctor) return { canBook: false, hasPresencial: false, hasOnline: false, message: '' };

    // Verificar si tiene consulta online activa
    const hasOnline = doctor.onlineConsultation?.enabled === true &&
      doctor.onlineConsultation?.schedule !== undefined;

    // Verificar si tiene consultorios con horarios
    const hasPresencial = (() => {
      // Si tiene addresses con schedule
      if (doctor.addresses && doctor.addresses.length > 0) {
        return doctor.addresses.some(addr => addr.schedule !== undefined);
      }
      // O si tiene schedule general
      return doctor.schedule !== undefined;
    })();

    const canBook = hasPresencial || hasOnline;

    let message = '';
    if (!canBook) {
      message = 'Este médico aún no ha configurado sus horarios de atención. Por favor, contacte directamente para consultar disponibilidad.';
    } else if (!hasPresencial && hasOnline) {
      message = 'Este médico solo atiende consultas online.';
    } else if (hasPresencial && !hasOnline) {
      message = 'Este médico solo atiende consultas presenciales.';
    }

    return { canBook, hasPresencial, hasOnline, message };
  }, [doctor]);

  const renderStepContent = () => {
    if (!doctor) return null;
    let currentStep = step;
    // Redirigir a selectPatient si no está autenticado y está en pasos que requieren auth
    if (!authLoading && (step === 'selectServices' || step === 'selectPayment') && (!user || user.role !== 'patient')) {
      currentStep = 'selectPatient';
    }

    switch (currentStep) {
      case 'selectPatient':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-base md:text-2xl">¿Para quién es la cita?</CardTitle>
              <CardDescription className="text-xs md:text-base">Selecciona si la cita es para ti o para un familiar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Opción: Para mí */}
              <div
                onClick={() => {
                  setBookingFor('myself');
                  setSelectedFamilyMember(null);
                }}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${bookingFor === 'myself'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'border-border hover:border-primary/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bookingFor === 'myself' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Para mí</p>
                    <p className="text-sm text-muted-foreground">
                      {user ? user.name : 'Inicia sesión para continuar'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Opción: Para un familiar */}
              {user && familyMembers.length > 0 && (
                <div className="space-y-3">
                  <p className="font-medium text-sm">O selecciona a un familiar:</p>
                  {isLoadingFamily ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {familyMembers.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => {
                            setBookingFor('family');
                            setSelectedFamilyMember(member);
                          }}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedFamilyMember?.id === member.id
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'border-border hover:border-primary/50'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold">{member.firstName} {member.lastName}</p>
                              <p className="text-sm text-muted-foreground">
                                {FAMILY_RELATIONSHIP_LABELS[member.relationship]} • {member.age} años
                              </p>
                            </div>
                            {selectedFamilyMember?.id === member.id && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Link para agregar familiares */}
              {user && familyMembers.length === 0 && !isLoadingFamily && (
                <div className="text-center py-4 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    ¿Tienes familiares que quieras agregar?
                  </p>
                  <Button variant="link" asChild className="text-primary">
                    <Link href="/dashboard/family">Gestionar Núcleo Familiar</Link>
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={() => setStep('selectDateTime')}
                disabled={!user || (bookingFor === 'family' && !selectedFamilyMember)}
              >
                Continuar
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        );

      case 'selectDateTime':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-base md:text-2xl">Paso 1: Selecciona Fecha y Hora</CardTitle>
              <CardDescription className="text-xs md:text-base">
                {selectedFamilyMember
                  ? `Cita para ${selectedFamilyMember.firstName} ${selectedFamilyMember.lastName}`
                  : 'Elige un horario disponible para tu cita.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Si el médico no puede recibir citas, mostrar mensaje */}
              {!canAcceptAppointments.canBook ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No disponible para agendar</h3>
                  <p className="text-muted-foreground max-w-md">
                    {canAcceptAppointments.message}
                  </p>
                  <div className="mt-4 flex gap-2">
                    {doctor.whatsapp && (
                      <Button asChild variant="outline">
                        <a href={`https://wa.me/${doctor.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                          💬 WhatsApp
                        </a>
                      </Button>
                    )}
                    {doctor.email && (
                      <Button asChild variant="outline">
                        <a href={`mailto:${doctor.email}`}>
                          ✉️ Email
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Selector de tipo de consulta */}
                  <div className="mb-6">
                    <Label className="mb-2 block font-medium">Tipo de Consulta:</Label>
                    <div className="flex flex-wrap gap-2">
                      {canAcceptAppointments.hasPresencial && (
                        <Button
                          variant={consultationType === 'presencial' ? "default" : "outline"}
                          onClick={() => {
                            setConsultationType('presencial');
                            setSelectedTime(null);
                            if (doctor.addresses && doctor.addresses.length > 0) {
                              setSelectedAddressId(doctor.addresses[0].id);
                            }
                          }}
                          className="flex-1 min-w-[150px]"
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Presencial
                        </Button>
                      )}
                      {canAcceptAppointments.hasOnline && (
                        <Button
                          variant={consultationType === 'online' ? "default" : "outline"}
                          onClick={() => {
                            setConsultationType('online');
                            setSelectedTime(null);
                          }}
                          className="flex-1 min-w-[150px]"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Online
                        </Button>
                      )}
                    </div>
                    {canAcceptAppointments.message && (
                      <p className="text-xs text-muted-foreground mt-2">
                        ℹ️ {canAcceptAppointments.message}
                      </p>
                    )}
                  </div>

                  {/* Selector de consultorio (solo para presencial) */}
                  {consultationType === 'presencial' && doctor.addresses && doctor.addresses.length > 1 && (
                    <div className="mb-6">
                      <Label className="mb-2 block font-medium">Selecciona el Consultorio:</Label>
                      <div className="flex flex-wrap gap-2">
                        {doctor.addresses.map(addr => (
                          <Button
                            key={addr.id}
                            variant={selectedAddressId === addr.id ? "default" : "outline"}
                            onClick={() => setSelectedAddressId(addr.id)}
                            className="text-sm"
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            {addr.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Información de ubicación o plataforma */}
                  <div className="flex items-start gap-2 text-muted-foreground mt-2 text-sm mb-4">
                    {consultationType === 'online' ? (
                      <>
                        <Video className="h-4 w-4 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">Consulta por Videollamada</p>
                          <p>{doctor.onlineConsultation?.platform || 'Plataforma a confirmar'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{currentAddress?.address || doctor.address}</p>
                          <p>{currentAddress?.city || doctor.city}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 md:gap-8 items-start">
                    <div className="flex flex-col items-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setSelectedTime(null);
                        }}
                        className="rounded-md border bg-card"
                        disabled={isDayDisabled}
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="hidden md:block">
                        {selectedDate ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {availableSlots.length > 0 ? availableSlots.map((time) => (
                              <Button
                                key={time}
                                variant={selectedTime === time ? "default" : "outline"}
                                onClick={() => {
                                  setSelectedTime(time);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Clock className="h-4 w-4" />
                                {time}
                              </Button>
                            )) : <p className="col-span-full text-center text-muted-foreground">No hay horarios disponibles este día.</p>}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center md:text-left mt-4">Por favor, selecciona una fecha primero.</p>
                        )}
                      </div>
                      <div className="block md:hidden">
                        {selectedDate !== undefined ? (
                          <div className="grid grid-cols-2 gap-2">
                            {availableSlots.length > 0 ? availableSlots.map((time) => (
                              <Button
                                key={time}
                                variant={selectedTime === time ? "default" : "outline"}
                                onClick={() => {
                                  setSelectedTime(time);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Clock className="h-4 w-4" />
                                {time}
                              </Button>
                            )) : <p className="col-span-full text-center text-muted-foreground">No hay horarios disponibles este día.</p>}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        onClick={handleDateTimeSubmit}
                        disabled={!selectedDate || !selectedTime || authLoading}
                        className="w-full mt-3 md:mt-8"
                        size="lg"
                      >
                        Continuar al Paso 2
                      </Button>
                      {(() => {
                        const shouldShow = selectedDate && selectedTime && !authLoading && (!user || (user && user.role !== 'patient'));
                        return shouldShow;
                      })() && (
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            * Debes iniciar sesión para continuar
                          </p>
                        )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </>
        );

      case 'selectServices':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-base md:text-2xl">Paso 2: Servicios Adicionales</CardTitle>
              <CardDescription className="text-xs md:text-base">Selecciona los servicios que deseas agregar a tu consulta.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentAddress?.services && currentAddress.services.length > 0 ? (
                  currentAddress.services.map((service: Service) => (
                    <div key={service.id} className="flex items-center space-x-2 border p-4 rounded-lg">
                      <Checkbox
                        id={service.id}
                        checked={selectedServices.some((s) => s.id === service.id)}
                        onCheckedChange={() => handleServiceToggle(service)}
                      />
                      <Label htmlFor={service.id} className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{service.name}</span>
                          <span className="font-bold text-primary">${service.price}</span>
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        )}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No hay servicios adicionales disponibles.</p>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-lg font-bold">Subtotal:</div>
                  <div className="text-2xl font-bold text-primary">
                    ${(currentAddress?.consultationFee || doctor.consultationFee || 0) + subtotal}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep('selectDateTime')} className="w-full">
                    Atrás
                  </Button>
                  <Button onClick={() => setStep('selectPayment')} className="w-full">
                    Continuar al Pago
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        );

      case 'selectPayment':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-base md:text-2xl">Paso 3: Pago y Confirmación</CardTitle>
              <CardDescription className="text-xs md:text-base">Selecciona tu método de pago y confirma la cita.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Consulta Base</span>
                    <span>${currentAddress?.consultationFee || doctor.consultationFee || 0}</span>
                  </div>
                  {selectedServices.map(service => (
                    <div key={service.id} className="flex justify-between text-sm">
                      <span>{service.name}</span>
                      <span>${service.price}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${(currentAddress?.consultationFee || doctor.consultationFee || 0) + subtotal}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cupón de Descuento</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Ingresa tu código"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        disabled={!!appliedCoupon}
                      />
                    </div>
                    {appliedCoupon ? (
                      <Button variant="destructive" onClick={handleRemoveCoupon}>
                        Quitar
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={handleApplyCoupon} disabled={!couponInput}>
                        Aplicar
                      </Button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Cupón aplicado: -${discountAmount}
                    </p>
                  )}
                </div>

                {/* Payment Methods - Solo mostrar los habilitados */}
                {(() => {
                  // Si el médico pertenece a una clínica, usar paymentSettings de la clínica
                  // De lo contrario, usar los del médico (o defaults)
                  const isClinicDoctor = !!doctor.clinicId && !!clinic;
                  const ps = isClinicDoctor
                    ? (clinic!.paymentSettings || { cash: { enabled: true }, transfer: { enabled: false }, mercadopago: { enabled: false } })
                    : (doctor.paymentSettings || { cash: { enabled: true }, transfer: { enabled: false }, mercadopago: { enabled: false } });

                  const showCash = ps.cash?.enabled !== false;
                  const showMercadoPago = ps.mercadopago?.enabled === true;
                  // Para transferencia: si es médico de clínica, usar datos de la clínica; si es independiente, del médico
                  const hasBankDetails = isClinicDoctor
                    ? (ps.transfer?.cbu || ps.transfer?.alias)
                    : (doctor.bankDetails && doctor.bankDetails.length > 0);
                  // Para doctores de clínica, respetar la configuración explícita.
                  // Para independientes, como no tienen UI para configurar 'enabled', asumimos true si tienen cuentas.
                  const transferEnabled = isClinicDoctor ? ps.transfer?.enabled !== false : true;
                  const showTransfer = transferEnabled && hasBankDetails;

                  if (!showCash && !showMercadoPago && !showTransfer) {
                    return (
                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                        Este médico no tiene métodos de pago configurados. Por favor, contactalo directamente.
                      </p>
                    );
                  }

                  return (
                    <RadioGroup value={paymentMethod || ""} onValueChange={(value) => setPaymentMethod(value as any)}>
                      {/* Efectivo */}
                      {showCash && (
                        <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="efectivo" id="efectivo" />
                          <Label htmlFor="efectivo" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Banknote className="h-5 w-5 text-green-600" />
                            <div>
                              <span className="font-medium block">Pago en Efectivo / Consultorio</span>
                              <span className="text-xs text-muted-foreground">Pagas directamente al médico el día de la cita.</span>
                            </div>
                          </Label>
                        </div>
                      )}

                      {/* MercadoPago */}
                      {showMercadoPago && (
                        <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors bg-blue-50/50 border-blue-200">
                          <RadioGroupItem value="mercadopago" id="mercadopago" />
                          <Label htmlFor="mercadopago" className="flex items-center gap-2 cursor-pointer flex-1">
                            <CreditCard className="h-5 w-5 text-blue-500" />
                            <div>
                              <span className="font-medium block">MercadoPago (Tarjetas / Débito)</span>
                              <span className="text-xs text-muted-foreground">Pago online seguro e instantáneo.</span>
                            </div>
                          </Label>
                        </div>
                      )}

                      {/* Transferencia */}
                      {showTransfer && (
                        <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="transferencia" id="transferencia" />
                          <Label htmlFor="transferencia" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Landmark className="h-5 w-5 text-blue-600" />
                            <div>
                              <span className="font-medium block">Transferencia Bancaria</span>
                              <span className="text-xs text-muted-foreground">Debes subir el comprobante ahora.</span>
                            </div>
                          </Label>
                        </div>
                      )}
                    </RadioGroup>
                  );
                })()}

                {paymentMethod === 'transferencia' && (
                  <div className="space-y-4 border-l-2 border-blue-600 pl-4 ml-2 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label>Datos para transferir:</Label>
                      {/* Si es médico de clínica, mostrar datos de la clínica */}
                      {doctor.clinicId && clinic?.paymentSettings?.transfer ? (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-sm space-y-2">
                          <div className="font-medium text-blue-700 mb-2">Cuenta de {clinic.name}</div>
                          {clinic.paymentSettings.transfer.cbu && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">CBU:</span>
                              <span className="font-mono">{clinic.paymentSettings.transfer.cbu}</span>
                            </div>
                          )}
                          {clinic.paymentSettings.transfer.alias && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Alias:</span>
                              <span className="font-mono font-semibold">{clinic.paymentSettings.transfer.alias}</span>
                            </div>
                          )}
                          {clinic.paymentSettings.transfer.bank && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Banco:</span>
                              <span>{clinic.paymentSettings.transfer.bank}</span>
                            </div>
                          )}
                          {clinic.paymentSettings.transfer.holder && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Titular:</span>
                              <span>{clinic.paymentSettings.transfer.holder}</span>
                            </div>
                          )}
                        </div>
                      ) : doctor.bankDetails && doctor.bankDetails.length > 0 ? (
                        <RadioGroup
                          value={selectedBankDetail?.id || ""}
                          onValueChange={(id) => {
                            const bank = doctor.bankDetails.find(b => b.id === id);
                            setSelectedBankDetail(bank || null);
                          }}
                        >
                          {doctor.bankDetails.map((bank) => (
                            <div key={bank.id} className="flex items-start space-x-2 mb-2">
                              <RadioGroupItem value={bank.id} id={bank.id} className="mt-1" />
                              <Label htmlFor={bank.id} className="text-sm cursor-pointer">
                                <div className="font-medium">{bank.bank}</div>
                                <div>CBU/CVU: {bank.accountNumber}</div>
                                <div>Titular: {bank.accountHolder}</div>
                                {bank.alias && <div>Alias: {bank.alias}</div>}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <p className="text-sm text-destructive">No hay cuentas bancarias configuradas.</p>
                      )}
                    </div>

                    {/* Solo mostrar upload de comprobante si NO es médico de clínica (para clínicas se maneja diferente) */}
                    {!doctor.clinicId && (
                      <div className="space-y-2">
                        <Label htmlFor="proof">Subir Comprobante de Pago</Label>
                        <Input id="proof" type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
                        <p className="text-xs text-muted-foreground">Formatos: JPG, PNG, PDF. Máx 5MB.</p>
                      </div>
                    )}

                    {doctor.clinicId && (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                        * Envía el comprobante por WhatsApp a la clínica tras confirmar tu cita.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-lg font-bold">Total a Pagar:</div>
                  <div className="text-2xl font-bold text-primary">${finalPrice}</div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep('selectServices')} className="w-full" disabled={isSubmitting}>
                    Atrás
                  </Button>
                  <Button
                    onClick={handlePaymentSubmit}
                    className="w-full"
                    disabled={isSubmitting || (paymentMethod === 'transferencia' && !doctor.clinicId && (!selectedBankDetail || !paymentProof))}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {uploadProgress || 'Procesando...'}
                      </>
                    ) : (
                      'Confirmar Cita'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        );

      case 'confirmation':
        return (
          <div className="py-6 px-4 space-y-6">
            {/* Success Header */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-700">¡Cita Confirmada!</h2>
              <p className="text-muted-foreground mt-1">Tu reserva ha sido registrada exitosamente</p>

              {/* Indicador de para quién es la cita */}
              {selectedFamilyMember && (
                <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="font-medium">
                    Cita para: {selectedFamilyMember.firstName} {selectedFamilyMember.lastName}
                  </span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-600 text-xs">
                    {FAMILY_RELATIONSHIP_LABELS[selectedFamilyMember.relationship]}
                  </Badge>
                </div>
              )}
            </div>

            {/* Appointment Details Card */}
            <div className="bg-slate-50 border rounded-lg p-5 space-y-4 max-w-md mx-auto">
              <h3 className="font-semibold text-slate-700 border-b pb-2">Detalles de tu Cita</h3>

              {/* Doctor Info */}
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={doctor.profileImage} alt={doctor.name} />
                  <AvatarFallback>{doctor.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{doctor.name}</p>
                  <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                  {doctor.clinicId && clinic && (
                    <Badge variant="outline" className="mt-1 text-xs">{clinic.name}</Badge>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">{selectedDate && format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
                  <p className="text-sm text-muted-foreground">Hora: {selectedTime}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">{currentAddress?.name || 'Consultorio Principal'}</p>
                  <p className="text-sm text-muted-foreground">{currentAddress?.address || doctor.address}</p>
                  <p className="text-xs text-muted-foreground">{currentAddress?.city || doctor.city}</p>
                </div>
              </div>

              {/* Consultation Type */}
              {consultationType === 'online' && (
                <div className="flex items-start gap-3">
                  <Video className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Consulta Online</p>
                    <p className="text-sm text-muted-foreground">Recibirás el link antes de la cita</p>
                  </div>
                </div>
              )}

              {/* Services */}
              {selectedServices.length > 0 && (
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Servicios adicionales:</p>
                    <ul className="text-sm text-muted-foreground">
                      {selectedServices.map(s => (
                        <li key={s.id}>• {s.name} - ${s.price}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="flex items-start gap-3 pt-3 border-t">
                {paymentMethod === 'efectivo' && <Banknote className="h-5 w-5 text-green-600 mt-0.5" />}
                {paymentMethod === 'transferencia' && <Landmark className="h-5 w-5 text-blue-600 mt-0.5" />}
                {paymentMethod === 'mercadopago' && <CreditCard className="h-5 w-5 text-sky-600 mt-0.5" />}
                <div>
                  <p className="font-medium">
                    {paymentMethod === 'efectivo' && 'Pago en Efectivo'}
                    {paymentMethod === 'transferencia' && 'Transferencia Bancaria'}
                    {paymentMethod === 'mercadopago' && 'Mercado Pago'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethod === 'efectivo' && 'Pagarás al momento de la consulta'}
                    {paymentMethod === 'transferencia' && 'Comprobante enviado'}
                    {paymentMethod === 'mercadopago' && 'Pago procesado online'}
                  </p>
                </div>
              </div>

              {/* Coupon if applied */}
              {appliedCoupon && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento aplicado ({appliedCoupon.code}):</span>
                  <span>-${discountAmount}</span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t bg-green-50 -mx-5 -mb-5 px-5 py-4 rounded-b-lg">
                <span className="font-semibold text-green-800">Total a Pagar:</span>
                <span className="text-2xl font-bold text-green-700">${finalPrice}</span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg max-w-md mx-auto text-sm">
              <p className="font-semibold text-amber-800 mb-2">📋 Próximos Pasos:</p>
              <ul className="list-disc pl-5 space-y-1 text-amber-700">
                <li>Recibirás un email con los detalles de tu cita.</li>
                {paymentMethod === 'efectivo' && (
                  <li>Recuerda llevar el monto exacto en efectivo a tu cita.</li>
                )}
                {paymentMethod === 'transferencia' && !doctor.clinicId && (
                  <li>Tu comprobante de pago ha sido enviado para verificación.</li>
                )}
                {paymentMethod === 'transferencia' && doctor.clinicId && (
                  <li><strong>Importante:</strong> Envía tu comprobante por WhatsApp a la clínica.</li>
                )}
                <li>Puedes ver y gestionar tu cita desde tu panel de paciente.</li>
              </ul>
            </div>

            {/* Doctor/Clinic Contact */}
            <div className="text-center text-sm text-muted-foreground">
              <p>¿Alguna consulta?</p>
              <p className="font-medium text-foreground">
                📞 {doctor.whatsapp || 'WhatsApp del médico'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => router.push('/dashboard')}>
                Ir a Mis Citas
              </Button>
              <Button variant="outline" onClick={resetBookingFlow}>
                Agendar Otra Cita
              </Button>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <HeaderWrapper />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Cargando perfil del médico...</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <HeaderWrapper />
        <main className="flex-1 py-8 md:py-12 bg-muted/40 pb-20 md:pb-0">
          <div className="container max-w-4xl mx-auto">
            <Card className="mb-8 overflow-hidden">
              <div className="relative">
                <Image
                  src='https://placehold.co/1200x400.png'
                  alt="Doctor no encontrado"
                  width={1200}
                  height={400}
                  className="w-full h-48 object-cover filter grayscale"
                />
              </div>
              <div className="pt-20 px-8 pb-6 text-center">
                <h2 className="text-2xl font-bold">Médico no encontrado</h2>
              </div>
            </Card>
            <Card>
              <CardContent className="flex justify-center py-8">
                <Button asChild>
                  <Link href="/find-a-doctor">
                    Buscar otros especialistas
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderWrapper />
      <main className="flex-1 py-8 md:py-12 bg-muted/40 pb-20 md:pb-0">
        <div className="container max-w-4xl mx-auto">

          <Card className="mb-8 overflow-hidden">
            <div className="relative">
              <Image
                src={doctor.bannerImage || 'https://placehold.co/1200x400.png'}
                alt={`Consultorio de ${doctor.name}`}
                width={1200}
                height={400}
                className="w-full h-48 object-cover"
                data-ai-hint="medical office"
              />
              <div className="absolute -bottom-16 left-8">
                <Avatar className="h-32 w-32 border-4 border-background bg-muted">
                  <AvatarImage src={doctor.profileImage || undefined} alt={doctor.name} />
                  <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="pt-20 px-8 pb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base md:text-2xl font-bold font-headline">Dr@: {capitalizeWords(doctor.name)}</h2>
                {doctor.verificationStatus === 'verified' && (
                  <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-sm font-semibold">Verificado</span>
                  </div>
                )}
                {doctor.clinicId && (
                  <div className="flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm font-semibold">Clínica</span>
                  </div>
                )}
              </div>
              <p className="text-primary font-medium text-xl">{doctor.specialty}</p>
              <div className="flex items-center gap-1.5 mt-2 text-sm">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold">{doctor.rating}</span>
                <span className="text-muted-foreground">({doctor.reviewCount} reseñas)</span>
              </div>
            </div>
            <Separator />
            <div className="p-8 space-y-4">
              <p className="text-sm text-muted-foreground">{doctor.description}</p>
              <div className="flex items-start gap-2 text-muted-foreground mt-2 text-sm">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{currentAddress?.address || doctor.address}</p>
                  <p>{currentAddress?.city || doctor.city}</p>
                </div>
              </div>

              {doctor.acceptedInsurances && doctor.acceptedInsurances.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Coberturas Médicas Aceptadas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {doctor.acceptedInsurances.map(ins => (
                      <span key={ins} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium border border-green-200 shadow-sm">
                        {ins}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {(!user || user.role === 'patient') ? (
            <Card className="mb-8">
              {renderStepContent()}
            </Card>
          ) : (
            <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900/50">
              <CardContent className="pt-6 text-center">
                <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4 dark:bg-yellow-900/40">
                  <ClipboardCheck className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Modo de Vista Previa</h3>
                <p className="text-muted-foreground mb-4">
                  Estás viendo este perfil como <strong>{capitalizeWords(user.role === 'doctor' ? 'Médico' : user.role)}</strong>.
                  <br />
                  Para agendar una cita, debes cerrar sesión e ingresar como <strong>Paciente</strong>.
                </p>
                {user.role === 'doctor' && user.id === id && (
                  <Button variant="outline" onClick={() => router.push('/doctor/dashboard')}>
                    Ir a mi Panel de Control
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">Valoraciones de Pacientes</CardTitle>
            </CardHeader>
            <CardContent>
              <DoctorReviews
                doctor={doctor}
                onReviewAdded={() => {
                  const fetchDoctorData = async () => {
                    try {
                      const updatedDoctor = await supabaseService.getDoctor(doctor.id);
                      if (updatedDoctor) {
                        setDoctor(updatedDoctor);
                      }
                    } catch (error) {
                      console.error('Error updating doctor data:', error);
                    }
                  };
                  fetchDoctorData();
                }}
              />
            </CardContent>
          </Card>

        </div>
      </main>
      <BottomNav />

      {showCalendarNotification && lastCreatedAppointment && (
        <CalendarNotification
          appointment={lastCreatedAppointment}
          onClose={() => setShowCalendarNotification(false)}
        />
      )}
    </div>
  );
}
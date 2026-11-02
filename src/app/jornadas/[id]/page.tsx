"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  Users,
  Share2,
  Copy,
  CheckCircle2,
  Sparkles,
  HeartHandshake,
  UserCheck,
  Loader2,
  Image as ImageIcon,
  ShieldCheck,
  DollarSign,
  CreditCard,
  Ticket,
  Printer,
  Lock,
  LogIn,
  UserPlus,
  Heart,
  LayoutDashboard,
} from 'lucide-react';
import QRCode from 'qrcode';
import { HeaderWrapper } from '@/components/header';
import { useAuth } from '@/lib/auth';
import * as supabaseService from '@/lib/supabaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { HealthCampaign, FamilyMember } from '@/lib/types';

function isCampaignEnded(camp: HealthCampaign | null): boolean {
  if (!camp) return false;
  if (camp.status === 'completed' || camp.status === 'cancelled') return true;
  const targetDate = (camp.endDate || camp.startDate || '').trim();
  if (!targetDate) return false;
  const rawTime = (camp.endTime || '23:59').trim();
  const normalizedTime = /^\d{2}:\d{2}$/.test(rawTime) ? `${rawTime}:59` : '23:59:59';
  const expiryMs = Date.parse(`${targetDate}T${normalizedTime}-04:00`);
  if (Number.isNaN(expiryMs)) return false;
  return Date.now() > expiryMs;
}

export default function PublicHealthCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;
  const { toast } = useToast();
  const { user, switchToPatientMode } = useAuth();

  const [campaign, setCampaign] = useState<HealthCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Modo de autenticación en la tarjeta de cupo (cuando el visitante aún no ha iniciado sesión)
  const [guestAuthTab, setGuestAuthTab] = useState<'register' | 'login'>('register');
  const [password, setPassword] = useState('');

  // Selección de titular o familiar cuando ya inició sesión como paciente
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>('myself');

  // Formulario de confirmación de asistencia y Ticket de Cupo
  const [cedula, setCedula] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'mujer' | 'hombre' | 'nino'>('mujer');
  const [interestSpecialty, setInterestSpecialty] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [spotNumber, setSpotNumber] = useState<number | null>(null);
  const [ticketQrUrl, setTicketQrUrl] = useState<string>('');
  const [isDoctorSubscribing, setIsDoctorSubscribing] = useState(false);

  const handleDoctorSubscribe = async () => {
    if (!user || user.role !== 'doctor' || !campaign) return;
    try {
      setIsDoctorSubscribing(true);
      const res = await fetch('/api/health-campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe_doctor',
          campaignId: campaign.id,
          doctorId: user.id,
          doctorName: user.name,
          doctorEmail: user.email,
          doctorSpecialty: user.specialty || 'Medicina General',
          doctorProfileImage: user.profileImage || null,
          status: 'accepted',
        }),
      });
      if (!res.ok) throw new Error('No se pudo procesar tu suscripción a la jornada');
      toast({
        title: '🩺 ¡Te has suscrito a la Jornada de Salud!',
        description: 'Ya puedes pasar tu consulta independiente con tu usuario en esta jornada.',
      });
      await fetchCampaign();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Ocurrió un problema al suscribirte a la jornada.',
      });
    } finally {
      setIsDoctorSubscribing(false);
    }
  };

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/health-campaigns?id=${campaignId}`);
      if (!res.ok) throw new Error('No se encontró la jornada de salud');
      const data: HealthCampaign = await res.json();
      setCampaign(data);
      const firstPhoto = data.coverImage || data.galleryImages?.[0] || null;
      setSelectedImage(firstPhoto);
      if (data.specialties?.length > 0) {
        setInterestSpecialty(data.specialties[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  // Si el usuario ya inició sesión como Paciente en SUMA, autocompletar sus datos y cargar su núcleo familiar
  useEffect(() => {
    if (user && user.role === 'patient') {
      if (selectedBeneficiary === 'myself') {
        if (user.name) setName(user.name);
        if (user.cedula) setCedula(user.cedula);
        if (user.email) setEmail(user.email);
        if (user.phone) setPhone(user.phone);
        if (user.age) setAge(String(user.age));
      }
      supabaseService
        .getFamilyMembers(user.id)
        .then(members => setFamilyMembers(members || []))
        .catch(() => {});
    }
  }, [user, selectedBeneficiary]);

  const handleSelectBeneficiary = (val: string) => {
    setSelectedBeneficiary(val);
    if (!user) return;
    if (val === 'myself') {
      setName(user.name || '');
      setCedula(user.cedula || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAge(user.age ? String(user.age) : '');
      setGender(user.gender === 'masculino' ? 'hombre' : 'mujer');
    } else {
      const fam = familyMembers.find(m => m.id === val);
      if (fam) {
        setName(`${fam.firstName} ${fam.lastName}`.trim());
        setCedula(fam.cedula || user.cedula || '');
        setEmail(fam.email || user.email || '');
        setPhone(fam.phone || user.phone || '');
        setAge(fam.age !== undefined ? String(fam.age) : '');
        if (fam.age !== undefined && fam.age < 18) {
          setGender('nino');
        } else if (fam.gender === 'masculino') {
          setGender('hombre');
        } else {
          setGender('mujer');
        }
      }
    }
  };

  // Generar QR cuando se asigna un ticketCode
  useEffect(() => {
    if (!ticketCode) {
      setTicketQrUrl('');
      return;
    }
    QRCode.toDataURL(`${ticketCode}|${cedula}|${campaignId}`, {
      width: 180,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(url => setTicketQrUrl(url))
      .catch(() => {});
  }, [ticketCode, cedula, campaignId]);

  const handleCedulaBlur = async () => {
    const clean = cedula.trim();
    if (clean.length < 5 || user) return;
    try {
      setIsLookingUp(true);
      const res = await fetch(
        `/api/health-campaigns/register?cedula=${encodeURIComponent(clean)}&campaignId=${campaignId}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.found && data.patient) {
        if (data.patient.name && !name) setName(data.patient.name);
        if (data.patient.phone && !phone) setPhone(data.patient.phone);
        if (data.patient.email && !email) setEmail(data.patient.email);
        if (data.patient.age !== null && data.patient.age !== undefined && !age) {
          setAge(String(data.patient.age));
        }
        if (data.patient.demographicGroup) {
          setGender(data.patient.demographicGroup);
        }
        if (data.isRegisteredInSuma && data.patient.email) {
          setEmail(data.patient.email);
          setGuestAuthTab('login');
          toast({
            title: '✨ ¡Ya tienes cuenta en SUMA!',
            description: `Detectamos tu cuenta (${data.patient.email}). Ingresa tu contraseña para tomar tu cupo al instante.`,
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isExistingSession = Boolean(user && user.role === 'patient');
    const currentAuthMode = isExistingSession ? 'existing_session' : guestAuthTab;

    if (currentAuthMode === 'login') {
      if (!email.trim() || !password) {
        toast({
          variant: 'destructive',
          title: 'Credenciales requeridas',
          description: 'Ingresa tu correo y contraseña de SUMA para iniciar sesión y sacar tu cupo.',
        });
        return;
      }
    } else if (currentAuthMode === 'register') {
      if (!name.trim() || !cedula.trim() || !email.trim() || !phone.trim() || password.length < 6) {
        toast({
          variant: 'destructive',
          title: 'Completa tu registro en SUMA',
          description:
            'Ingresa tu cédula, nombre, teléfono, correo y crea una contraseña de al menos 6 caracteres.',
        });
        return;
      }
    } else {
      if (!name.trim() || !cedula.trim()) {
        toast({
          variant: 'destructive',
          title: 'Campos requeridos',
          description: 'Por favor verifica el nombre completo y el número de cédula.',
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/health-campaigns/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          authMode: currentAuthMode,
          patientId: isExistingSession ? user?.id : undefined,
          password: currentAuthMode !== 'existing_session' ? password : undefined,
          name: name.trim(),
          cedula: cedula.trim(),
          phone: phone.trim(),
          email: email.trim(),
          age: age ? Number(age) : null,
          gender,
          interestSpecialty: interestSpecialty || (campaign?.specialties?.[0] ?? 'Medicina General'),
          paymentReference: paymentReference.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.accountExists) {
          if (data.existingEmail) setEmail(data.existingEmail);
          setGuestAuthTab('login');
          toast({
            title: 'Ya tienes cuenta en SUMA',
            description: data.error,
          });
          return;
        }
        throw new Error(data.error || 'No se pudo registrar tu participación');
      }

      // Si el visitante acaba de crear su cuenta o iniciar sesión en SUMA, activar su sesión en el navegador
      if (!isExistingSession && data.patientAccount) {
        localStorage.setItem('user', JSON.stringify(data.patientAccount));
        if (data.patientAccount.isDoctorAccount) {
          localStorage.setItem('suma_doctor_active_mode', 'patient');
        }
        await fetch('/api/auth/set-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.patientAccount.id,
            email: data.patientAccount.email,
            role: 'patient',
            name: data.patientAccount.name,
          }),
        }).catch(() => {});
      }

      if (data.patientName) setName(data.patientName);
      if (data.patientCedula) setCedula(data.patientCedula);

      setRegistrationComplete(true);
      setTicketCode(data.ticketCode || null);
      setSpotNumber(data.spotNumber || null);
      toast({
        title: '🎟️ ¡Cuenta SUMA Activa y Ticket Generado!',
        description:
          data.message || 'Tu ticket de entrada para la jornada ha sido generado exitosamente.',
      });
      fetchCampaign();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Ocurrió un problema al confirmar tu asistencia.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'Enlace copiado',
      description: 'Ya puedes pegarlo y compartirlo en tus redes o grupos.',
    });
  };

  const handleShareWhatsApp = () => {
    if (typeof window === 'undefined' || !campaign) return;
    const text = `🩺 *${campaign.title}*\nOrganiza: ${campaign.organizerName}\n📅 Fecha: ${campaign.startDate} (${campaign.startTime} a ${campaign.endTime})\n📍 Lugar: ${[campaign.city, campaign.address].filter(Boolean).join(' - ')}\n✨ Modalidad: ${campaign.campaignType === 'free' ? 'Jornada Gratuita' : `Jornada Privada ${campaign.priceInfo ? `(${campaign.priceInfo})` : ''}`}\n\n¡Regístrate en SUMA y saca tu cupo aquí! 👇\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <HeaderWrapper />
        <div className="flex-1 flex items-center justify-center p-12">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <HeaderWrapper />
        <div className="flex-1 container max-w-3xl py-16 text-center space-y-4">
          <HeartHandshake className="h-16 w-16 text-slate-400 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Jornada de Salud no encontrada</h1>
          <p className="text-slate-600">El enlace puede haber cambiado o el evento ya no está disponible.</p>
          <Button asChild>
            <Link href="/jornadas">Ver todas las Jornadas</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isExpired = isCampaignEnded(campaign);

  const allPhotos = Array.from(
    new Set([campaign.coverImage, ...(campaign.galleryImages || [])].filter(Boolean) as string[])
  );

  const visibleDoctors = (campaign.doctors || []).filter(d => d.status !== 'declined');
  const reservedCount = campaign.registrations?.length || 0;
  const isLimitedCapacity =
    campaign.capacityMode === 'limited' && Boolean(campaign.maxCapacity && campaign.maxCapacity > 0);
  const maxSpots = isLimitedCapacity ? Number(campaign.maxCapacity) : null;
  const remainingSpots = isLimitedCapacity && maxSpots ? Math.max(0, maxSpots - reservedCount) : null;
  const isSoldOut = isLimitedCapacity && remainingSpots === 0;

  const organizerRoleLabel: Record<string, string> = {
    pharmacy: 'Farmacia Aliada SUMA',
    laboratory: 'Laboratorio Clínico SUMA',
    clinic: 'Clínica / Centro Médico SUMA',
    doctor: 'Especialista SUMA',
    admin: 'SUMA Salud Oficial',
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderWrapper />

      <main className="flex-1 pb-16">
        {/* Hero Banner de la Jornada */}
        <div
          className={`text-white py-10 px-4 border-b ${
            isExpired
              ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 border-slate-600'
              : 'bg-gradient-to-br from-teal-900 via-teal-800 to-sky-900 border-teal-700'
          }`}
        >
          <div className="container max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                {isExpired ? (
                  <Badge className="bg-slate-900 text-slate-100 border border-slate-400 text-xs px-3 py-1 font-bold">
                    🏁 Evento Culminado (Finalizó el {campaign.endDate || campaign.startDate})
                  </Badge>
                ) : (
                  <Badge
                    className={
                      campaign.campaignType === 'free'
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 text-xs px-3 py-1'
                        : 'bg-amber-500 text-white hover:bg-amber-600 text-xs px-3 py-1'
                    }
                  >
                    {campaign.campaignType === 'free'
                      ? '✨ Jornada de Salud Gratuita'
                      : campaign.pricingMode === 'per_specialist'
                      ? `🏷️ Jornada Privada • $${campaign.priceAmount || 0} USD por cada especialista`
                      : `🏷️ Jornada Privada • $${campaign.priceAmount || 0} USD (Participación en todo el evento)`}
                  </Badge>
                )}
                <Badge variant="outline" className="border-teal-300 text-teal-100 text-xs">
                  {organizerRoleLabel[campaign.organizerRole] || 'Organizador SUMA'}
                </Badge>
                {!isExpired && (
                  <Badge variant="outline" className="border-sky-300 text-sky-100 text-xs">
                    {isLimitedCapacity
                      ? `🎟️ Cupos disponibles: ${remainingSpots} de ${maxSpots}`
                      : `🎟️ Cupos Ilimitados • ${(campaign.registrations?.length || 0) + (campaign.attendances?.length || 0)} personas sumadas`}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/20"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copiar Link
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                  onClick={handleShareWhatsApp}
                >
                  <Share2 className="h-4 w-4 mr-1.5" />
                  Compartir por WhatsApp
                </Button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
              {campaign.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl px-4 py-3 w-fit">
              <Avatar className="h-11 w-11 border-2 border-teal-300 bg-white">
                <AvatarImage src={campaign.organizerLogo || undefined} alt={campaign.organizerName} />
                <AvatarFallback className="bg-teal-700 text-white font-bold text-sm">
                  {(campaign.organizerName || 'SU').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase tracking-wider text-teal-200 font-semibold">
                    Evento Organizado por:
                  </span>
                  <Badge className="bg-teal-500/30 text-teal-100 border border-teal-300/40 text-[11px] py-0">
                    {organizerRoleLabel[campaign.organizerRole] || 'Organizador SUMA'}
                  </Badge>
                </div>
                <p className="text-white font-extrabold text-base sm:text-lg leading-tight mt-0.5">
                  {campaign.organizerName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/10 backdrop-blur-xs rounded-xl p-4 border border-white/15">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-teal-500/30">
                  <Calendar className="h-5 w-5 text-teal-200" />
                </div>
                <div>
                  <p className="text-xs text-teal-200">Fecha del Evento</p>
                  <p className="font-bold text-sm sm:text-base">
                    {campaign.startDate}
                    {campaign.endDate && campaign.endDate !== campaign.startDate
                      ? ` al ${campaign.endDate}`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-sky-500/30">
                  <Clock className="h-5 w-5 text-sky-200" />
                </div>
                <div>
                  <p className="text-xs text-sky-200">Horario de Atención</p>
                  <p className="font-bold text-sm sm:text-base">
                    Desde las {campaign.startTime} hasta las {campaign.endTime}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/30">
                  <MapPin className="h-5 w-5 text-emerald-200" />
                </div>
                <div>
                  <p className="text-xs text-emerald-200">Ubicación</p>
                  <p className="font-bold text-sm sm:text-base line-clamp-2">
                    {[campaign.city, campaign.state, campaign.sector, campaign.address]
                      .filter(Boolean)
                      .join(', ') || 'Consultar con el organizador'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Banner de Acceso Médico Independiente (si el usuario conectado es Médico y el evento no ha culminado) */}
        {user?.role === 'doctor' && !isExpired && (
          <div className="container max-w-6xl mx-auto px-4 mt-6">
            <div className="rounded-2xl border-2 border-teal-500 bg-gradient-to-r from-teal-50 via-white to-emerald-50 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-teal-600 text-white shrink-0">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      Acceso para Especialistas SUMA: Dr(a). {user.name}
                    </h3>
                    {campaign.organizerId === user.id ||
                    campaign.doctors?.some(d => d.doctorId === user.id && d.status === 'accepted') ? (
                      <Badge className="bg-emerald-600 text-white text-xs">
                        ✓ Suscrito en esta Jornada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-teal-400 text-teal-800 text-xs">
                        Suscripción Abierta para Médicos
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    {campaign.organizerId === user.id ||
                    campaign.doctors?.some(d => d.doctorId === user.id && d.status === 'accepted')
                      ? 'Ya estás suscrito a esta jornada. Puedes entrar directamente a tu consola médica para pasar tu consulta independiente con tu usuario.'
                      : '¿Vas a atender pacientes en esta jornada médica? Suscríbete con un clic para aparecer en el equipo médico y habilitar tu consola de consulta.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {campaign.organizerId === user.id ||
                campaign.doctors?.some(d => d.doctorId === user.id && d.status === 'accepted') ? (
                  <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs">
                    <Link href={`/doctor/dashboard?view=health-campaigns&campaignId=${campaign.id}`}>
                      <Stethoscope className="h-4 w-4 mr-2" />
                      Pasar Consulta en esta Jornada
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isDoctorSubscribing}
                    onClick={handleDoctorSubscribe}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                  >
                    {isDoctorSubscribing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    Suscribirme como Médico y Pasar Consulta
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contenido Principal */}
        <div className="container max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda (2/3): Galería de Fotos, Descripción, Especialidades y Médicos */}
          <div className="lg:col-span-2 space-y-6">
            {allPhotos.length > 0 && (
              <Card className="overflow-hidden border-slate-200 shadow-xs">
                <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                  <img
                    src={selectedImage || allPhotos[0]}
                    alt={campaign.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {allPhotos.length > 1 && (
                  <div className="p-3 bg-slate-50 border-t flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1 shrink-0 mr-1">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Fotos ({allPhotos.length}):
                    </span>
                    {allPhotos.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImage(imgUrl)}
                        className={`relative h-16 w-24 rounded-md overflow-hidden border-2 shrink-0 transition-all ${
                          (selectedImage || allPhotos[0]) === imgUrl
                            ? 'border-teal-600 ring-2 ring-teal-500/30 scale-105'
                            : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Descripción General y Especialidades */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
                  <Sparkles className="h-5 w-5 text-teal-600" />
                  Acerca de esta Jornada de Salud
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-slate-700 whitespace-pre-line leading-relaxed text-sm sm:text-base">
                  {campaign.description ||
                    'Jornada especial de atención médica comunitaria y preventiva respaldada por especialistas de SUMA Salud.'}
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4 text-teal-600" />
                    Especialidades Disponibles en la Jornada
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {campaign.specialties && campaign.specialties.length > 0 ? (
                      campaign.specialties.map((spec, idx) => {
                        const specPrice =
                          campaign.campaignType === 'paid' && campaign.pricingMode === 'per_specialist'
                            ? campaign.specialtyPrices && campaign.specialtyPrices[spec] !== undefined
                              ? campaign.specialtyPrices[spec]
                              : campaign.priceAmount
                            : null;
                        return (
                          <Badge
                            key={idx}
                            className="bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 px-3 py-1 text-xs sm:text-sm font-semibold"
                          >
                            🩺 {spec}
                            {specPrice ? ` • $${specPrice} USD` : ''}
                          </Badge>
                        );
                      })
                    ) : (
                      <Badge className="bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 text-sm">
                        🩺 Medicina General e Integral
                      </Badge>
                    )}
                  </div>
                </div>

                {campaign.campaignType === 'paid' && (
                  <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-amber-600" />
                        <h4 className="font-bold text-amber-950 text-sm sm:text-base">
                          Información de Pago para Participar en la Jornada
                        </h4>
                      </div>
                      <Badge className="bg-amber-500 text-white text-xs font-bold">
                        {campaign.pricingMode === 'per_specialist'
                          ? `$${campaign.priceAmount || 0} USD por cada especialista`
                          : `$${campaign.priceAmount || 0} USD por todo el evento`}
                      </Badge>
                    </div>

                    <p className="text-xs text-amber-900">
                      {campaign.pricingMode === 'per_specialist'
                        ? 'En esta jornada el aporte se realiza por cada especialista que te atienda durante el evento.'
                        : 'En esta jornada realizas un único pago general para participar en todo el evento.'}
                      {campaign.priceInfo ? ` (${campaign.priceInfo})` : ''}
                    </p>

                    {campaign.paymentDetails?.bank && (
                      <div className="bg-white rounded-xl border border-amber-200 p-3.5 text-xs space-y-1.5">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4 text-teal-600" />
                          Cuenta Destino Oficial (
                          {campaign.paymentAccountSource === 'organizer'
                            ? `Cuenta de ${campaign.organizerName}`
                            : 'Cuenta habilitada para el evento'}
                          ):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-700">
                          <p>
                            <strong>Banco / Método:</strong> {campaign.paymentDetails.bank}{' '}
                            {campaign.paymentDetails.accountType
                              ? `(${campaign.paymentDetails.accountType})`
                              : ''}
                          </p>
                          {campaign.paymentDetails.accountHolder && (
                            <p>
                              <strong>Titular:</strong> {campaign.paymentDetails.accountHolder}
                            </p>
                          )}
                          {campaign.paymentDetails.idNumber && (
                            <p>
                              <strong>Cédula / RIF:</strong> {campaign.paymentDetails.idNumber}
                            </p>
                          )}
                          {campaign.paymentDetails.accountNumber && (
                            <p>
                              <strong>Cuenta / Teléfono / Correo:</strong>{' '}
                              <span className="font-mono font-bold text-teal-800">
                                {campaign.paymentDetails.accountNumber}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Médicos Participantes */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
                  <Users className="h-5 w-5 text-teal-600" />
                  Especialistas de SUMA en esta Jornada ({visibleDoctors.length})
                </CardTitle>
                <CardDescription>
                  Conoce a los médicos y profesionales de la salud que brindan atención durante el evento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {visibleDoctors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {visibleDoctors.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors shadow-2xs"
                      >
                        <Avatar className="h-14 w-14 border-2 border-teal-100">
                          <AvatarImage src={doc.doctorProfileImage || undefined} alt={doc.doctorName} />
                          <AvatarFallback className="bg-teal-50 text-teal-700 font-bold">
                            {doc.doctorName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900 text-sm truncate">
                              Dr(a). {doc.doctorName}
                            </p>
                            {doc.status === 'accepted' && (
                              <span title="Participación confirmada" className="shrink-0">
                                <ShieldCheck className="h-4 w-4 text-teal-600" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-teal-700 font-medium truncate">
                            {doc.doctorSpecialty || 'Especialista SUMA'}
                          </p>
                          <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                            {doc.status === 'accepted' ? 'Confirmado en el evento' : 'Invitado al evento'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-4">
                    El listado de médicos participantes se está actualizando para esta jornada.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha (1/3): Sacar Cupo / Ticket de Entrada */}
          <div className="space-y-6">
            <Card
              className={`border-2 shadow-md sticky top-20 ${
                isExpired ? 'border-slate-300 bg-slate-100/80' : 'border-teal-500'
              }`}
            >
              <CardHeader
                className={`text-white rounded-t-lg ${
                  isExpired
                    ? 'bg-gradient-to-r from-slate-700 to-slate-600'
                    : 'bg-gradient-to-r from-teal-600 to-sky-600'
                }`}
              >
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  {isExpired ? '🏁 Evento Culminado' : '¡Regístrate en SUMA y Saca tu Cupo!'}
                </CardTitle>
                <CardDescription className="text-teal-50 text-xs">
                  {isExpired
                    ? `Esta jornada de salud finalizó el ${campaign.endDate || campaign.startDate} a las ${campaign.endTime}.`
                    : 'Para asistir a la jornada debes tener tu cuenta SUMA activa. Tus récipes e informes digitales llegarán directo a tu cuenta.'}
                </CardDescription>
                {!isExpired && (
                  <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                    <span className="font-semibold text-teal-100">Disponibilidad:</span>
                    {isLimitedCapacity ? (
                      <Badge
                        className={
                          isSoldOut
                            ? 'bg-red-500 text-white'
                            : 'bg-emerald-400 text-slate-950 font-extrabold'
                        }
                      >
                        {isSoldOut
                          ? '🚫 Cupos Agotados'
                          : `Quedan ${remainingSpots} de ${maxSpots} cupos`}
                      </Badge>
                    ) : (
                      <Badge className="bg-white/20 text-white border border-white/30">
                        ♾️ Cupos Ilimitados ({reservedCount} reservados)
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-5">
                {isExpired ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="h-14 w-14 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center mx-auto font-bold text-2xl">
                      🏁
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-base">
                        Esta Jornada de Salud ya Culminó
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        El período de inscripción y atención para este evento cerró el{' '}
                        <strong>{campaign.endDate || campaign.startDate}</strong> a las{' '}
                        <strong>{campaign.endTime}</strong>.
                      </p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/jornadas">Ver Próximas Jornadas Vigentes</Link>
                    </Button>
                  </div>
                ) : registrationComplete ? (
                  <div className="space-y-4">
                    {/* DISEÑO DE TICKET DIGITAL DE ENTRADA */}
                    <div className="rounded-2xl border-2 border-dashed border-teal-600 bg-gradient-to-b from-teal-50/80 via-white to-sky-50/60 p-4 text-center shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-teal-200 pb-2 text-left">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                            Pase Oficial de Entrada • SUMA
                          </p>
                          <p className="text-xs font-extrabold text-slate-900 line-clamp-1">
                            {campaign.title}
                          </p>
                        </div>
                        <Badge className="bg-emerald-600 text-white text-[10px]">Confirmado ✓</Badge>
                      </div>

                      <div className="py-1">
                        <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                          Tu Número de Cupo
                        </p>
                        <p className="text-3xl font-black text-teal-800 tracking-tight">
                          CUPO #{String(spotNumber || 1).padStart(3, '0')}
                        </p>
                        {ticketCode && (
                          <span className="inline-block mt-1 px-3 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold tracking-wider">
                            {ticketCode}
                          </span>
                        )}
                      </div>

                      {ticketQrUrl && (
                        <div className="flex justify-center">
                          <img
                            src={ticketQrUrl}
                            alt="QR Ticket de Entrada"
                            className="h-32 w-32 rounded-xl border border-slate-200 p-1.5 bg-white shadow-2xs"
                          />
                        </div>
                      )}

                      <div className="bg-white rounded-xl border border-slate-200 p-3 text-left text-xs space-y-1 text-slate-700">
                        <p>
                          <strong>Paciente SUMA:</strong> {name}
                        </p>
                        <p>
                          <strong>Cédula:</strong> {cedula}
                        </p>
                        <p>
                          <strong>Especialidad:</strong> {interestSpecialty || 'General'}
                        </p>
                        <p>
                          <strong>Fecha y Hora:</strong> {campaign.startDate} ({campaign.startTime} -{' '}
                          {campaign.endTime})
                        </p>
                        <p>
                          <strong>Organiza:</strong> {campaign.organizerName}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full border-teal-300 text-teal-800 hover:bg-teal-50 text-xs font-bold"
                        onClick={() => window.print()}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1.5" />
                        Imprimir / Guardar mi Ticket (PDF)
                      </Button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-left space-y-2">
                      <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        Tu cuenta en SUMA Salud está activa
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        Este ticket quedó guardado en tu apartado de <strong>Mis Jornadas</strong> dentro de tu Panel de Paciente SUMA, junto con tus récipes e informes médicos.
                      </p>
                      <Button asChild size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold">
                        <Link href="/dashboard?tab=campaigns">
                          <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                          Ver Mis Jornadas y Tickets en Mi Panel SUMA
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : isSoldOut ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto font-bold text-xl">
                      🚫
                    </div>
                    <h4 className="font-bold text-slate-900 text-base">
                      Cupos Agotados ({maxSpots}/{maxSpots})
                    </h4>
                    <p className="text-xs text-slate-600">
                      Se ha alcanzado el límite máximo de cupos configurado por el organizador para esta jornada de salud.
                    </p>
                  </div>
                ) : user && user.role === 'doctor' ? (
                  <div className="space-y-3.5 text-center py-3">
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-left space-y-2">
                      <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <Heart className="h-4 w-4 text-rose-600 shrink-0" />
                        ¿Deseas tomar un cupo como Paciente para ti o un familiar?
                      </p>
                      <p className="text-[11px] text-rose-800">
                        Estás en Modo Médico. Cambia con un clic a tu <strong>Modo Paciente</strong> para reservar tu cupo personal o familiar en esta jornada.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => switchToPatientMode(`/jornadas/${campaign.id}`)}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold"
                      >
                        <Heart className="h-3.5 w-3.5 mr-1.5" />
                        Cambiar a Modo Paciente y Sacar Cupo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    {user && user.role === 'patient' ? (
                      <div className="space-y-2.5">
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>
                            Conectado en <strong>SUMA</strong> como <strong>{user.name}</strong>. Confirma para quién es el cupo y saca tu ticket en 1 clic.
                          </span>
                        </div>

                        {familyMembers.length > 0 && (
                          <div>
                            <Label className="text-xs font-semibold">¿Para quién es el cupo?</Label>
                            <Select value={selectedBeneficiary} onValueChange={handleSelectBeneficiary}>
                              <SelectTrigger className="h-9 text-xs mt-1 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="myself">👤 Para mí ({user.name})</SelectItem>
                                {familyMembers.map(fam => (
                                  <SelectItem key={fam.id} value={fam.id}>
                                    👨‍👩‍👧 Para mi familiar: {fam.firstName} {fam.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Visitante sin sesión iniciada: Pestañas de Registro Directo en SUMA o Login en SUMA */
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setGuestAuthTab('register')}
                            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              guestAuthTab === 'register'
                                ? 'bg-teal-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Crear Cuenta SUMA
                          </button>
                          <button
                            type="button"
                            onClick={() => setGuestAuthTab('login')}
                            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              guestAuthTab === 'login'
                                ? 'bg-teal-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            Ya tengo cuenta
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-600 bg-sky-50/80 border border-sky-200 rounded-lg px-2.5 py-1.5">
                          {guestAuthTab === 'register'
                            ? '✨ Al llenar estos datos quedas registrado oficialmente en SUMA Salud y recibes tu Ticket de la Jornada de inmediato.'
                            : '🔐 Ingresa el correo y contraseña de tu cuenta SUMA para sacar tu Ticket de la Jornada en un solo paso.'}
                        </p>
                      </div>
                    )}

                    {/* Si eligió "Ya tengo cuenta en SUMA" (login directo) */}
                    {!user && guestAuthTab === 'login' ? (
                      <>
                        <div>
                          <Label htmlFor="login-email" className="text-xs font-semibold">
                            Correo Electrónico de tu cuenta SUMA *
                          </Label>
                          <Input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="tucorreo@ejemplo.com"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="login-pass" className="text-xs font-semibold">
                            Contraseña de SUMA *
                          </Label>
                          <Input
                            id="login-pass"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Tu contraseña de SUMA"
                            required
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">
                            Especialidad a consultar en la Jornada *
                          </Label>
                          <Select value={interestSpecialty} onValueChange={setInterestSpecialty}>
                            <SelectTrigger className="h-9 text-xs mt-1">
                              <SelectValue placeholder="Seleccionar especialidad" />
                            </SelectTrigger>
                            <SelectContent>
                              {(campaign.specialties?.length > 0
                                ? campaign.specialties
                                : ['Medicina General']
                              ).map((s, idx) => (
                                <SelectItem key={idx} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      /* Si ya está logueado o está creando su cuenta SUMA por primera vez */
                      <>
                        <div>
                          <Label htmlFor="reg-cedula" className="text-xs font-semibold">
                            Cédula / Documento de Identidad *
                          </Label>
                          <div className="relative">
                            <Input
                              id="reg-cedula"
                              value={cedula}
                              onChange={e => setCedula(e.target.value)}
                              onBlur={handleCedulaBlur}
                              placeholder="Ej: V-12345678"
                              required
                            />
                            {isLookingUp && (
                              <Loader2 className="h-4 w-4 animate-spin text-teal-600 absolute right-3 top-2.5" />
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="reg-name" className="text-xs font-semibold">
                            Nombre y Apellido *
                          </Label>
                          <Input
                            id="reg-name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ej: María Pérez"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <Label htmlFor="reg-phone" className="text-xs font-semibold">
                              Teléfono / WhatsApp *
                            </Label>
                            <Input
                              id="reg-phone"
                              value={phone}
                              onChange={e => setPhone(e.target.value)}
                              placeholder="+58 412..."
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="reg-age" className="text-xs font-semibold">
                              Edad
                            </Label>
                            <Input
                              id="reg-age"
                              type="number"
                              min="0"
                              max="120"
                              value={age}
                              onChange={e => {
                                setAge(e.target.value);
                                const num = Number(e.target.value);
                                if (!Number.isNaN(num) && e.target.value !== '' && num < 18) {
                                  setGender('nino');
                                }
                              }}
                              placeholder="Ej: 34"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="reg-email" className="text-xs font-semibold">
                            Correo Electrónico (Tu usuario en SUMA) *
                          </Label>
                          <Input
                            id="reg-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="tucorreo@ejemplo.com"
                            required
                          />
                        </div>

                        {!user && (
                          <div>
                            <Label htmlFor="reg-pass" className="text-xs font-semibold flex items-center gap-1">
                              <Lock className="h-3.5 w-3.5 text-teal-600" />
                              Crea tu Contraseña para SUMA (Mín. 6 caracteres) *
                            </Label>
                            <Input
                              id="reg-pass"
                              type="password"
                              minLength={6}
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="Mínimo 6 caracteres"
                              required
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <Label className="text-xs font-semibold">Grupo</Label>
                            <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mujer">Mujer</SelectItem>
                                <SelectItem value="hombre">Hombre</SelectItem>
                                <SelectItem value="nino">Niño / Niña</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs font-semibold">Especialidad</Label>
                            <Select value={interestSpecialty} onValueChange={setInterestSpecialty}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {(campaign.specialties?.length > 0
                                  ? campaign.specialties
                                  : ['Medicina General']
                                ).map((s, idx) => (
                                  <SelectItem key={idx} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}

                    {campaign.campaignType === 'paid' && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                        <p className="text-[11px] font-bold text-amber-900">
                          💳 Aporte del Evento:{' '}
                          {campaign.pricingMode === 'per_specialist'
                            ? `$${
                                (campaign.specialtyPrices &&
                                interestSpecialty &&
                                campaign.specialtyPrices[interestSpecialty] !== undefined
                                  ? campaign.specialtyPrices[interestSpecialty]
                                  : campaign.priceAmount) || 0
                              } USD por especialista`
                            : `$${campaign.priceAmount || 0} USD (Pase por todo el evento)`}
                        </p>
                        <div>
                          <Label htmlFor="reg-pay-ref" className="text-[11px] text-amber-900">
                            Referencia de Pago (Opcional si pagas antes del evento)
                          </Label>
                          <Input
                            id="reg-pay-ref"
                            value={paymentReference}
                            onChange={e => setPaymentReference(e.target.value)}
                            placeholder="Ej: Ref #123456 o Pagaré en el sitio"
                            className="h-8 text-xs bg-white mt-1"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold mt-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {user
                            ? 'Generando tu Ticket de Cupo...'
                            : guestAuthTab === 'register'
                            ? 'Registrando en SUMA y Generando Ticket...'
                            : 'Iniciando Sesión y Generando Ticket...'}
                        </>
                      ) : (
                        <>
                          <Ticket className="h-4 w-4 mr-2" />
                          {user
                            ? 'Confirmar mi Cupo y Generar Ticket'
                            : guestAuthTab === 'register'
                            ? 'Registrarme en SUMA y Sacar mi Cupo'
                            : 'Iniciar Sesión y Sacar mi Cupo'}
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

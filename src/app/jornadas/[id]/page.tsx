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
  Building2,
  Phone,
  Mail,
  UserCheck,
  Loader2,
  Image as ImageIcon,
  ArrowLeft,
  ShieldCheck,
  DollarSign,
  CreditCard,
  Ticket,
  Printer,
} from 'lucide-react';
import QRCode from 'qrcode';
import { HeaderWrapper } from '@/components/header';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { HealthCampaign } from '@/lib/types';

export default function PublicHealthCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;
  const { toast } = useToast();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<HealthCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
  const [isRegisteredInSuma, setIsRegisteredInSuma] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [spotNumber, setSpotNumber] = useState<number | null>(null);
  const [ticketQrUrl, setTicketQrUrl] = useState<string>('');

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

  // Si el usuario ya inició sesión en SUMA, autocompletar sus datos para que saque su cupo con 1 clic
  useEffect(() => {
    if (user && user.role === 'patient') {
      if (user.name && !name) setName(user.name);
      if (user.cedula && !cedula) setCedula(user.cedula);
      if (user.email && !email) setEmail(user.email);
      if (user.phone && !phone) setPhone(user.phone);
      if (user.age && !age) setAge(String(user.age));
      setIsRegisteredInSuma(true);
    }
  }, [user]);

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
    if (clean.length < 5) return;
    try {
      setIsLookingUp(true);
      const res = await fetch(`/api/health-campaigns/register?cedula=${encodeURIComponent(clean)}&campaignId=${campaignId}`);
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
        setIsRegisteredInSuma(Boolean(data.isRegisteredInSuma));
      }
    } catch {
      // ignore
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cedula.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos',
        description: 'Por favor ingresa tu nombre completo y tu número de cédula.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/health-campaigns/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
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
        throw new Error(data.error || 'No se pudo registrar tu participación');
      }

      setRegistrationComplete(true);
      setTicketCode(data.ticketCode || null);
      setSpotNumber(data.spotNumber || null);
      setIsRegisteredInSuma(Boolean(data.isRegisteredInSuma));
      toast({
        title: '🎟️ ¡Cupo y Ticket Generados!',
        description: data.message || 'Tu ticket de entrada para la jornada ha sido generado exitosamente.',
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
    const text = `🩺 *${campaign.title}*\nOrganiza: ${campaign.organizerName}\n📅 Fecha: ${campaign.startDate} (${campaign.startTime} a ${campaign.endTime})\n📍 Lugar: ${[campaign.city, campaign.address].filter(Boolean).join(' - ')}\n✨ Modalidad: ${campaign.campaignType === 'free' ? 'Jornada Gratuita' : `Jornada Privada ${campaign.priceInfo ? `(${campaign.priceInfo})` : ''}`}\n\n¡Anótate y participa aquí! 👇\n${window.location.href}`;
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
            <Link href="/">Volver al inicio de SUMA</Link>
          </Button>
        </div>
      </div>
    );
  }

  const allPhotos = Array.from(
    new Set([campaign.coverImage, ...(campaign.galleryImages || [])].filter(Boolean) as string[])
  );

  // Mostrar médicos confirmados e invitados para dar visibilidad al equipo médico del evento
  const visibleDoctors = (campaign.doctors || []).filter(d => d.status !== 'declined');
  const reservedCount = campaign.registrations?.length || 0;
  const isLimitedCapacity = campaign.capacityMode === 'limited' && Boolean(campaign.maxCapacity && campaign.maxCapacity > 0);
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
        <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-sky-900 text-white py-10 px-4 border-b border-teal-700">
          <div className="container max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={campaign.campaignType === 'free' ? 'bg-emerald-500 text-white hover:bg-emerald-600 text-xs px-3 py-1' : 'bg-amber-500 text-white hover:bg-amber-600 text-xs px-3 py-1'}>
                  {campaign.campaignType === 'free'
                    ? '✨ Jornada de Salud Gratuita'
                    : campaign.pricingMode === 'per_specialist'
                    ? `🏷️ Jornada Privada • $${campaign.priceAmount || 0} USD por cada especialista`
                    : `🏷️ Jornada Privada • $${campaign.priceAmount || 0} USD (Participación en todo el evento)`}
                </Badge>
                <Badge variant="outline" className="border-teal-300 text-teal-100 text-xs">
                  {organizerRoleLabel[campaign.organizerRole] || 'Organizador SUMA'}
                </Badge>
                <Badge variant="outline" className="border-sky-300 text-sky-100 text-xs">
                  {isLimitedCapacity
                    ? `🎟️ Cupos disponibles: ${remainingSpots} de ${maxSpots}`
                    : `🎟️ Cupos Ilimitados • ${(campaign.registrations?.length || 0) + (campaign.attendances?.length || 0)} personas sumadas`}
                </Badge>
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
                    {campaign.endDate && campaign.endDate !== campaign.startDate ? ` al ${campaign.endDate}` : ''}
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
                    {[campaign.city, campaign.state, campaign.sector, campaign.address].filter(Boolean).join(', ') || 'Consultar con el organizador'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="container max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda (2/3): Galería de Fotos, Descripción, Especialidades y Médicos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Galería de Fotos del Evento */}
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
                  {campaign.description || 'Jornada especial de atención médica comunitaria y preventiva respaldada por especialistas de SUMA Salud.'}
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
                          Cuenta Destino Oficial ({campaign.paymentAccountSource === 'organizer' ? `Cuenta de ${campaign.organizerName}` : 'Cuenta habilitada para el evento'}):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-700">
                          <p>
                            <strong>Banco / Método:</strong> {campaign.paymentDetails.bank}{' '}
                            {campaign.paymentDetails.accountType ? `(${campaign.paymentDetails.accountType})` : ''}
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
                  Conoce a los médicos y profesionales de la salud que estarán brindando atención durante el evento.
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
                            <p className="font-bold text-slate-900 text-sm truncate">Dr(a). {doc.doctorName}</p>
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
            <Card className="border-2 border-teal-500 shadow-md sticky top-20">
              <CardHeader className="bg-gradient-to-r from-teal-600 to-sky-600 text-white rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  ¡Saca tu Cupo / Ticket de Entrada!
                </CardTitle>
                <CardDescription className="text-teal-50 text-xs">
                  Reserva tu cupo numerado para asistir a la jornada. Al ser atendido recibirás tu récipe digital en tu correo y plataforma SUMA.
                </CardDescription>
                {/* Indicador de Cupos en Vivo */}
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
              </CardHeader>
              <CardContent className="pt-5">
                {registrationComplete ? (
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
                          <strong>Paciente:</strong> {name}
                        </p>
                        <p>
                          <strong>Cédula:</strong> {cedula}
                        </p>
                        <p>
                          <strong>Especialidad:</strong> {interestSpecialty || 'General'}
                        </p>
                        <p>
                          <strong>Fecha y Hora:</strong> {campaign.startDate} ({campaign.startTime} - {campaign.endTime})
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

                    {!isRegisteredInSuma && (
                      <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-left space-y-2">
                        <p className="text-xs font-bold text-sky-900">
                          🌟 ¿Aún no tienes cuenta en SUMA?
                        </p>
                        <p className="text-[11px] text-sky-800">
                          Crea tu cuenta gratis ahora para que todos tus récipes e informes de esta jornada queden guardados automáticamente en tu plataforma.
                        </p>
                        <Button asChild size="sm" className="w-full bg-sky-600 hover:bg-sky-700 text-white">
                          <Link
                            href={`/auth/register?name=${encodeURIComponent(name)}&cedula=${encodeURIComponent(cedula)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`}
                          >
                            Registrarme Gratis en SUMA
                          </Link>
                        </Button>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setRegistrationComplete(false);
                        setTicketCode(null);
                        setSpotNumber(null);
                        setCedula('');
                        setName('');
                        setPhone('');
                        setEmail('');
                        setAge('');
                      }}
                    >
                      Sacar cupo para otro familiar o acompañante
                    </Button>
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
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    {user && user.role === 'patient' && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          Conectado en <strong>SUMA</strong> como <strong>{user.name}</strong>. Verifica tus datos y saca tu ticket de entrada.
                        </span>
                      </div>
                    )}
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
                      {isRegisteredInSuma && (
                        <p className="text-[11px] text-emerald-600 font-medium mt-1">
                          ✓ Usuario registrado en SUMA detectado.
                        </p>
                      )}
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
                        Correo Electrónico (Para recibir tu Récipe) *
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

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-xs font-semibold">Paciente</Label>
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
                          Generando tu Ticket de Cupo...
                        </>
                      ) : (
                        <>
                          <Ticket className="h-4 w-4 mr-2" />
                          Sacar mi Cupo y Ticket de Entrada
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

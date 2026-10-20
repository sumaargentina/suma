"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Doctor, DoctorPharmacySponsorship } from '@/lib/types';
import { PharmacyShowcaseModal } from '@/components/pharmacy/pharmacy-showcase-modal';
import {
  Handshake,
  Store,
  MapPin,
  Search,
  MessageSquare,
  Send,
  CheckCircle2,
  Eye,
  Loader2,
  PlayCircle,
  PauseCircle,
  Ticket,
  MousePointerClick,
  ShoppingBag
} from 'lucide-react';

interface DoctorPharmacyAlliancesTabProps {
  doctor: Doctor;
  onDoctorUpdated?: () => void;
}

export function DoctorPharmacyAlliancesTab({
  doctor,
  onDoctorUpdated
}: DoctorPharmacyAlliancesTabProps) {
  const { toast } = useToast();

  const [subTab, setSubTab] = useState<'alliances' | 'directory'>('alliances');

  // Configuración del médico para patrocinios
  const [acceptsSponsorships, setAcceptsSponsorships] = useState<boolean>(
    Boolean(doctor.acceptsPharmacySponsorships || (doctor as any).accepts_pharmacy_sponsorships)
  );
  const [sponsorshipConditions, setSponsorshipConditions] = useState<string>(
    doctor.sponsorshipConditions || (doctor as any).sponsorship_conditions || ''
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Directorio de Farmacias y Mis Alianzas
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [sponsorships, setSponsorships] = useState<DoctorPharmacySponsorship[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros de Farmacias
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'chain' | 'independent'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Solicitar Alianza a Farmacia
  const [requestPharmacyModal, setRequestPharmacyModal] = useState<any | null>(null);
  const [requestScope, setRequestScope] = useState<'city' | 'national'>('city');
  const [requestCity, setRequestCity] = useState(doctor.city || '');
  const [requestChain, setRequestChain] = useState('');
  const [requestAgreementType, setRequestAgreementType] = useState<'monthly_fixed' | 'per_recipe_percentage' | 'patient_discount' | 'custom'>('monthly_fixed');
  const [requestAgreementValue, setRequestAgreementValue] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Modal Sala de Negociación y Chat (Match + Módulo 4 Cupones)
  const [activeNegotiation, setActiveNegotiation] = useState<DoctorPharmacySponsorship | null>(null);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [updatingTerms, setUpdatingTerms] = useState(false);
  const [termsForm, setTermsForm] = useState({
    scopeType: 'city' as 'city' | 'national',
    targetCity: '',
    chainName: '',
    agreementType: 'monthly_fixed' as 'monthly_fixed' | 'per_recipe_percentage' | 'patient_discount' | 'custom',
    agreementValue: '',
    agreementNotes: '',
    hasPatientCoupon: false,
    couponCode: '',
    couponDiscountPercent: '10',
    couponDescription: ''
  });

  // Modal Ver Tarjeta de Farmacia y Catálogo Excel
  const [showcasePharmacy, setShowcasePharmacy] = useState<any | null>(null);

  const loadData = async () => {
    if (!doctor?.id) return;
    try {
      setLoading(true);
      const dirParams = new URLSearchParams({ mode: 'directory', doctorId: doctor.id });
      if (doctor.country) dirParams.set('country', doctor.country);
      const [dirRes, sponRes] = await Promise.all([
        fetch(`/api/pharmacy/sponsorships?${dirParams.toString()}`),
        fetch(`/api/pharmacy/sponsorships?doctorId=${doctor.id}`)
      ]);

      if (dirRes.ok) {
        const dirData = await dirRes.json();
        setPharmacies(dirData.pharmacies || []);
        const me = (dirData.doctors || []).find((d: any) => d.id === doctor.id);
        if (me) {
          setAcceptsSponsorships(true);
          if (me.sponsorshipConditions) setSponsorshipConditions(me.sponsorshipConditions);
        }
      }

      if (sponRes.ok) {
        const sponData = await sponRes.json();
        setSponsorships(Array.isArray(sponData) ? sponData : []);
      }
    } catch (e) {
      console.error('Error cargando alianzas de farmacias:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [doctor?.id]);

  const handleSaveDoctorSponsorshipSettings = async (nextAccepts?: boolean) => {
    const valToSave = nextAccepts !== undefined ? nextAccepts : acceptsSponsorships;
    try {
      setSavingSettings(true);
      const res = await fetch('/api/pharmacy/sponsorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_doctor_sponsorship',
          doctorId: doctor.id,
          acceptsPharmacySponsorships: valToSave,
          sponsorshipConditions: sponsorshipConditions.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la configuración');

      setAcceptsSponsorships(valToSave);
      toast({
        title: valToSave
          ? '✅ Módulo de Patrocinio con Farmacias Habilitado'
          : 'Módulo de Patrocinio Deshabilitado',
        description: valToSave
          ? 'Ahora eres visible para las farmacias suscritas y puedes hacer Match para recomendar farmacias en tus récipes.'
          : 'No aparecerás en el buscador de patrocinios de las farmacias.'
      });
      if (onDoctorUpdated) onDoctorUpdated();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendDoctorRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestPharmacyModal) return;

    try {
      setSendingRequest(true);
      const res = await fetch('/api/pharmacy/sponsorships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.id,
          pharmacyId: requestPharmacyModal.id,
          initiatedBy: 'doctor',
          scopeType: requestScope,
          targetCity: requestScope === 'city' ? (requestCity || requestPharmacyModal.city || doctor.city) : null,
          chainName: requestScope === 'national' ? (requestChain || requestPharmacyModal.chainName || requestPharmacyModal.name) : null,
          agreementType: requestAgreementType,
          agreementValue: requestAgreementValue.trim() || null,
          initialMessage:
            requestMessage.trim() ||
            `Hola ${requestPharmacyModal.chainName || requestPharmacyModal.name}, soy Dr(a). ${doctor.name} (${doctor.specialty}) en ${doctor.city}. Me interesa establecer una alianza de recomendación en mis récipes médicos.`,
          senderName: `Dr(a). ${doctor.name}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud');

      toast({
        title: data.status === 'matched' ? '🎉 ¡Match Instantáneo!' : 'Solicitud Enviada a la Farmacia',
        description:
          data.status === 'matched'
            ? 'Ambos tenían interés mutuo. Ya puedes negociar el acuerdo en el chat.'
            : `Se envió tu invitación a ${requestPharmacyModal.chainName || requestPharmacyModal.name}.`
      });

      setRequestPharmacyModal(null);
      await loadData();
      setSubTab('alliances');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSponsorshipAction = async (
    sponsorshipId: string,
    action: 'accept_match' | 'activate_alliance' | 'pause_alliance' | 'reject',
    extraPayload: Record<string, any> = {}
  ) => {
    try {
      const res = await fetch('/api/pharmacy/sponsorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sponsorshipId,
          action,
          actorRole: 'doctor',
          senderName: `Dr(a). ${doctor.name}`,
          ...extraPayload
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar alianza');

      setSponsorships(prev => prev.map(s => (s.id === sponsorshipId ? data : s)));
      if (activeNegotiation?.id === sponsorshipId) {
        setActiveNegotiation(data);
      }

      if (action === 'accept_match') {
        toast({
          title: '🤝 ¡Match Confirmado!',
          description: 'Ahora puedes negociar con la farmacia y definir si llevan cupón en la ventana de comunicación privada.'
        });
        openNegotiationModal(data);
      } else if (action === 'activate_alliance') {
        toast({
          title: '🚀 ¡Alianza y Recomendación Activadas!',
          description: 'Cada vez que emitas un récipe médico, tus pacientes verán esta farmacia recomendada con su tarjeta, semáforo de stock y promociones.'
        });
      } else if (action === 'pause_alliance') {
        toast({ title: 'Recomendación en pausa', description: 'La alianza volvió a estado de negociación.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const generateDefaultCouponCode = (pct?: string | number) => {
    const cleanDoc = (doctor.name || 'MED')
      .split(' ')
      .filter(Boolean)
      .slice(-1)[0]
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
    return `DR-${cleanDoc || 'SUMA'}-${pct || 10}`;
  };

  const openNegotiationModal = (spon: DoctorPharmacySponsorship) => {
    setActiveNegotiation(spon);
    setTermsForm({
      scopeType: spon.scopeType === 'national' ? 'national' : 'city',
      targetCity: spon.targetCity || spon.pharmacy?.city || doctor.city || '',
      chainName: spon.chainName || spon.pharmacy?.chainName || spon.pharmacy?.name || '',
      agreementType: (spon.agreementType as any) || 'monthly_fixed',
      agreementValue: spon.agreementValue || '',
      agreementNotes: spon.agreementNotes || '',
      hasPatientCoupon: Boolean(spon.hasPatientCoupon),
      couponCode: spon.couponCode || generateDefaultCouponCode(spon.couponDiscountPercent || 10),
      couponDiscountPercent: String(spon.couponDiscountPercent || 10),
      couponDescription: spon.couponDescription || 'Descuento exclusivo para mis pacientes presentando este récipe'
    });
    fetch('/api/pharmacy/sponsorships', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: spon.id, action: 'mark_read', actorRole: 'doctor' })
    }).catch(() => {});
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNegotiation || !chatText.trim()) return;
    try {
      setSendingChat(true);
      const res = await fetch('/api/pharmacy/sponsorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeNegotiation.id,
          action: 'send_message',
          actorRole: 'doctor',
          senderName: `Dr(a). ${doctor.name}`,
          messageText: chatText.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar mensaje');
      setActiveNegotiation(data);
      setSponsorships(prev => prev.map(s => (s.id === data.id ? data : s)));
      setChatText('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSendingChat(false);
    }
  };

  const handleSaveTerms = async () => {
    if (!activeNegotiation) return;
    try {
      setUpdatingTerms(true);
      const res = await fetch('/api/pharmacy/sponsorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeNegotiation.id,
          action: 'update_terms',
          actorRole: 'doctor',
          senderName: `Dr(a). ${doctor.name}`,
          ...termsForm,
          couponDiscountPercent: Number(termsForm.couponDiscountPercent) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar propuesta');
      setActiveNegotiation(data);
      setSponsorships(prev => prev.map(s => (s.id === data.id ? data : s)));
      toast({ title: 'Términos y cupón actualizados en la negociación' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setUpdatingTerms(false);
    }
  };

  const pharmacyCities = Array.from(new Set(pharmacies.map(p => p.city).filter(Boolean))).sort();

  const filteredPharmacies = pharmacies.filter(p => {
    if (cityFilter !== 'all' && p.city?.toLowerCase() !== cityFilter.toLowerCase()) return false;
    if (typeFilter === 'chain' && !p.chainName && !p.isChain) return false;
    if (typeFilter === 'independent' && (p.chainName || p.isChain)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.chainName?.toLowerCase().includes(q) ||
      p.branchName?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q)
    );
  });

  const getExistingSponsorshipWithPharmacy = (pharmId: string) =>
    sponsorships.find(s => s.pharmacyId === pharmId);

  // Totales ROI del Médico (Módulo 2)
  const totalImpressions = sponsorships.reduce((acc, s) => acc + (s.impressionsCount || 0), 0);
  const totalCardClicks = sponsorships.reduce((acc, s) => acc + (s.cardClicksCount || 0), 0);
  const totalOrdersCount = sponsorships.reduce((acc, s) => acc + (s.ordersCount || 0), 0);
  const totalDispensedCount = sponsorships.reduce((acc, s) => acc + (s.dispensedRecipesCount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Cabecera e Interruptor de Visibilidad B2B para Patrocinios */}
      <Card className="border-teal-200 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl overflow-hidden shadow-md">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <Badge className="bg-teal-400 text-slate-950 font-extrabold text-[11px] px-2.5 py-0.5 border-0">
                <Handshake className="h-3.5 w-3.5 mr-1 text-slate-950" />
                PATROCINIOS, CUPONES Y ALIANZAS CON FARMACIAS
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Farmacias Recomendadas en tus Récipes Médicos
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                Habilita este módulo para hacer <strong>Match</strong> con farmacias de tu ciudad o cadenas nacionales. En la sala de negociación pueden definir el patrocinio, decidir si la alianza lleva un <strong>Cupón de Descuento para tus pacientes</strong> y medir en tiempo real cuántos récipes fueron cotizados y dispensados.
              </p>
            </div>

            {/* Switch Habilitar / Deshabilitar Patrocinios */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-4 flex flex-col gap-3 min-w-[280px]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-extrabold text-white block">
                    Recibir Propuestas de Farmacias
                  </span>
                  <span className="text-[11px] text-teal-200">
                    {acceptsSponsorships ? 'Visible en el directorio B2B' : 'Oculto para las farmacias'}
                  </span>
                </div>
                <Switch
                  checked={acceptsSponsorships}
                  onCheckedChange={checked => handleSaveDoctorSponsorshipSettings(checked)}
                  disabled={savingSettings}
                />
              </div>

              {acceptsSponsorships && (
                <div className="space-y-2 pt-2 border-t border-white/15">
                  <Input
                    value={sponsorshipConditions}
                    onChange={e => setSponsorshipConditions(e.target.value)}
                    placeholder="Nota para farmacias (ej: Recetas de Cardiología en Maturín)..."
                    className="h-8 text-xs bg-white/95 text-slate-900 rounded-lg border-0"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingSettings}
                    onClick={() => handleSaveDoctorSponsorshipSettings()}
                    className="w-full h-7 text-[11px] bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg"
                  >
                    {savingSettings ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Guardar Nota de Patrocinio
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-white/10">
            <Button
              type="button"
              size="sm"
              onClick={() => setSubTab('alliances')}
              className={`rounded-xl text-xs font-bold ${
                subTab === 'alliances'
                  ? 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Handshake className="h-3.5 w-3.5 mr-1.5" />
              Mis Alianzas, Cupones y Métricas ROI ({sponsorships.length})
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setSubTab('directory')}
              className={`rounded-xl text-xs font-bold ${
                subTab === 'directory'
                  ? 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Store className="h-3.5 w-3.5 mr-1.5" />
              Explorar Farmacias por Ciudad y Franquicias ({pharmacies.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================================
          SUB-TAB 1: MIS ALIANZAS, SOLICITUDES, CUPONES Y MÉTRICAS ROI
         ===================================================================== */}
      {subTab === 'alliances' && (
        <div className="space-y-5">
          {/* Panel de Métricas ROI para el Médico (Módulo 2) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-teal-600" /> Vistas en tus Récipes
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalImpressions}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <MousePointerClick className="h-3.5 w-3.5 text-blue-600" /> Clics de Pacientes
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalCardClicks}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white rounded-2xl">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5 text-amber-600" /> Reservas 1-Clic
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalOrdersCount}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50/50 rounded-2xl">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Récipes Dispensados
                </span>
                <p className="text-2xl font-black text-emerald-900 mt-1">{totalDispensedCount}</p>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-7 w-7 animate-spin text-teal-600 mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Cargando tus alianzas con farmacias...</p>
            </div>
          ) : sponsorships.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 bg-white/80 rounded-2xl">
              <CardContent className="py-12 text-center space-y-3">
                <Handshake className="h-10 w-10 text-slate-400 mx-auto" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Aún no tienes alianzas activas con farmacias
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Explora las farmacias de tu ciudad o cadenas nacionales y envía una solicitud de patrocinio para recomendarlas en tus récipes médicos.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setSubTab('directory')}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs"
                >
                  <Store className="h-3.5 w-3.5 mr-1.5" />
                  Explorar Farmacias por Ciudad
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sponsorships.map(spon => (
                <Card key={spon.id} className="border-slate-200 bg-white rounded-2xl shadow-xs">
                  <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center overflow-hidden shrink-0">
                        {spon.pharmacy?.logoUrl ? (
                          <img src={spon.pharmacy.logoUrl} alt={spon.pharmacy.name} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="h-6 w-6 text-teal-700" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {spon.pharmacy?.chainName || spon.pharmacy?.name || 'Farmacia Aliada'}
                            {spon.pharmacy?.branchName ? ` - Sucursal ${spon.pharmacy.branchName}` : ''}
                          </h4>
                          <Badge
                            className={`text-[10px] font-bold ${
                              spon.status === 'active'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : spon.status === 'matched'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : spon.status === 'pending_doctor'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {spon.status === 'active'
                              ? '🚀 Recomendada Activamente en tus Récipes'
                              : spon.status === 'matched'
                              ? '🤝 Match Confirmado (En Negociación)'
                              : spon.status === 'pending_doctor'
                              ? '🔔 Nueva Propuesta de Patrocinio Recibida'
                              : spon.status === 'pending_pharmacy'
                              ? '⏳ Solicitud Enviada a la Farmacia'
                              : 'Rechazada'}
                          </Badge>

                          {spon.hasPatientCoupon && spon.couponCode && (
                            <Badge className="bg-amber-400/20 text-amber-950 border-amber-400 text-[10px] font-extrabold">
                              <Ticket className="h-3 w-3 mr-1 text-amber-700" />
                              Cupón Pacientes: {spon.couponCode} ({spon.couponDiscountPercent}% OFF)
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-teal-600" />
                          {spon.pharmacy?.city || 'Venezuela'} • {spon.pharmacy?.address}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            Alcance:{' '}
                            <strong className="text-slate-800">
                              {spon.scopeType === 'national'
                                ? `🇻🇪 Nacional (${spon.chainName || spon.pharmacy?.chainName || spon.pharmacy?.name})`
                                : `📍 Ciudad (${spon.targetCity || spon.pharmacy?.city})`}
                            </strong>
                          </span>
                          {spon.agreementValue && (
                            <span>
                              • Acuerdo Comercial: <strong className="text-emerald-700">{spon.agreementValue}</strong>
                            </span>
                          )}
                        </div>

                        {/* Métricas ROI por Farmacia (Módulo 2) */}
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                            👁️ {spon.impressionsCount || 0} vistas en récipes
                          </span>
                          <span className="text-[10px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-md">
                            👆 {spon.cardClicksCount || 0} clics tarjeta
                          </span>
                          <span className="text-[10px] bg-amber-50 text-amber-900 font-semibold px-2 py-0.5 rounded-md">
                            🛵 {spon.ordersCount || 0} reservas 1-clic
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-900 font-bold px-2 py-0.5 rounded-md">
                            ✅ {spon.dispensedRecipesCount || 0} récipes dispensados
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowcasePharmacy(spon.pharmacy)}
                        className="rounded-xl text-xs h-8"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Ver Tarjeta
                      </Button>

                      {spon.status === 'pending_doctor' && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSponsorshipAction(spon.id, 'accept_match')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8"
                          >
                            <Handshake className="h-3.5 w-3.5 mr-1.5" />
                            Aceptar y Hacer Match
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSponsorshipAction(spon.id, 'reject')}
                            className="text-xs rounded-xl text-rose-600 border-rose-200 h-8"
                          >
                            Rechazar
                          </Button>
                        </>
                      )}

                      {(spon.status === 'matched' || spon.status === 'active' || spon.status === 'pending_pharmacy') && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openNegotiationModal(spon)}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs h-8"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                          Negociar / Cupón / Chat ({spon.messages?.length || 0})
                        </Button>
                      )}

                      {spon.status === 'matched' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSponsorshipAction(spon.id, 'activate_alliance')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8"
                        >
                          <PlayCircle className="h-3.5 w-3.5 mr-1" />
                          Activar en mis Récipes
                        </Button>
                      )}

                      {spon.status === 'active' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSponsorshipAction(spon.id, 'pause_alliance')}
                          className="rounded-xl text-xs border-amber-300 text-amber-800 h-8"
                        >
                          <PauseCircle className="h-3.5 w-3.5 mr-1" />
                          Pausar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: EXPLORAR FARMACIAS POR CIUDAD Y FRANQUICIAS NACIONALES
         ===================================================================== */}
      {subTab === 'directory' && (
        <div className="space-y-5">
          <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar farmacia o cadena (ej: Farmatodo)..."
                  className="pl-9 h-10 text-xs rounded-xl"
                />
              </div>

              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
              >
                <option value="all">📍 Todas las Ciudades ({pharmacies.length})</option>
                {pharmacyCities.map(c => (
                  <option key={c} value={c}>
                    📍 {c}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
              >
                <option value="all">🏢 Todas (Franquicias y Locales)</option>
                <option value="chain">🇻🇪 Cadenas / Franquicias Nacionales</option>
                <option value="independent">🏪 Farmacias de Ciudad</option>
              </select>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPharmacies.map(pharm => {
              const existing = getExistingSponsorshipWithPharmacy(pharm.id);
              return (
                <Card key={pharm.id} className="border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all">
                  <div className="relative h-24 w-full bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900">
                    {pharm.bannerUrl && (
                      <img src={pharm.bannerUrl} alt={pharm.name} className="w-full h-full object-cover opacity-90" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      {pharm.chainName && (
                        <Badge className="bg-amber-400 text-slate-950 font-extrabold text-[10px] border-0">
                          Franquicia: {pharm.chainName}
                        </Badge>
                      )}
                      {pharm.is24Hours && (
                        <Badge className="bg-emerald-500 text-white font-bold text-[10px] border-0">
                          24H
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4 pt-0">
                    <div className="flex items-end gap-3 -mt-6 relative z-10 mb-3">
                      <div className="h-14 w-14 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
                        {pharm.logoUrl ? (
                          <img src={pharm.logoUrl} alt={pharm.name} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="h-6 w-6 text-teal-700" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-6">
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">
                          {pharm.chainName || pharm.name}
                          {pharm.branchName ? ` - ${pharm.branchName}` : ''}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-teal-600 shrink-0" />
                          {pharm.city} • {pharm.address}
                        </p>
                      </div>
                    </div>

                    {pharm.promotionalTagline && (
                      <p className="text-[11px] text-teal-800 bg-teal-50/80 border border-teal-200/70 rounded-xl px-3 py-1.5 mb-3 font-medium">
                        ✨ {pharm.promotionalTagline}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowcasePharmacy(pharm)}
                        className="rounded-xl text-xs h-8"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver Tarjeta y Catálogo
                      </Button>

                      {existing ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSubTab('alliances');
                            if (existing.status === 'matched' || existing.status === 'active') {
                              openNegotiationModal(existing);
                            }
                          }}
                          className="rounded-xl text-xs font-bold border-teal-300 text-teal-800 bg-teal-50 h-8"
                        >
                          {existing.status === 'active'
                            ? '✅ Recomendada en mis Récipes'
                            : existing.status === 'matched'
                            ? '🤝 ¡Match! Negociar'
                            : '⏳ Ver Solicitud'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setRequestPharmacyModal(pharm);
                            setRequestCity(pharm.city || doctor.city || '');
                            setRequestChain(pharm.chainName || '');
                            setRequestScope(pharm.chainName ? 'national' : 'city');
                          }}
                          className="rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold h-8"
                        >
                          <Handshake className="h-3.5 w-3.5 mr-1.5" />
                          Conectar / Recomendar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL ENVIAR SOLICITUD DE ALIANZA A UNA FARMACIA
         ===================================================================== */}
      <Dialog open={Boolean(requestPharmacyModal)} onOpenChange={open => !open && setRequestPharmacyModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Handshake className="h-5 w-5 text-teal-600" />
              Proponer Alianza a {requestPharmacyModal?.chainName || requestPharmacyModal?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Puedes recomendar esta farmacia por ciudad (ej. en {requestPharmacyModal?.city || doctor.city}) o a nivel nacional si tiene sucursales en todo el país.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendDoctorRequest} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alcance de tu Recomendación</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestScope('city')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold ${
                    requestScope === 'city'
                      ? 'border-teal-600 bg-teal-50 text-teal-900'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  📍 En Ciudad ({requestCity || requestPharmacyModal?.city})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestScope('national')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold ${
                    requestScope === 'national'
                      ? 'border-teal-600 bg-teal-50 text-teal-900'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  🇻🇪 Nacional (Todas las sucursales)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Modalidad de Patrocinio</Label>
                <select
                  value={requestAgreementType}
                  onChange={e => setRequestAgreementType(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs"
                >
                  <option value="monthly_fixed">Monto Fijo Mensual ($)</option>
                  <option value="per_recipe_percentage">Porcentaje por Récipe (%)</option>
                  <option value="patient_discount">Descuento a mis Pacientes</option>
                  <option value="custom">Acuerdo Personalizado</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Propuesta (Opcional)</Label>
                <Input
                  value={requestAgreementValue}
                  onChange={e => setRequestAgreementValue(e.target.value)}
                  placeholder="Ej: $100/mes o 10%"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Mensaje Inicial</Label>
              <Textarea
                rows={3}
                value={requestMessage}
                onChange={e => setRequestMessage(e.target.value)}
                placeholder="Escribe tu propuesta para la farmacia..."
                className="text-xs rounded-xl"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestPharmacyModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={sendingRequest} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                {sendingRequest && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Enviar Solicitud
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL SALA DE NEGOCIACIÓN, CUPÓN NEGOCIABLE (MÓDULO 4) Y CHAT PRIVADO
         ===================================================================== */}
      <Dialog open={Boolean(activeNegotiation)} onOpenChange={open => !open && setActiveNegotiation(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Handshake className="h-5 w-5 text-teal-600" />
              Negociación de Recomendación: {activeNegotiation?.pharmacy?.chainName || activeNegotiation?.pharmacy?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Conversa con la farmacia, definan el porcentaje o acuerdo económico, decidan si el récipe llevará un <strong>Cupón de Descuento para el paciente</strong> y activen la recomendación.
            </DialogDescription>
          </DialogHeader>

          {activeNegotiation && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Términos de la Recomendación y Cupón
                  </span>
                  <Badge
                    className={
                      activeNegotiation.status === 'active'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-100 text-amber-900'
                    }
                  >
                    {activeNegotiation.status === 'active' ? 'ACTIVA EN TUS RÉCIPES' : 'EN NEGOCIACIÓN'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Alcance</Label>
                    <select
                      value={termsForm.scopeType}
                      onChange={e => setTermsForm({ ...termsForm, scopeType: e.target.value as any })}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium"
                    >
                      <option value="city">📍 Ciudad ({termsForm.targetCity || doctor.city})</option>
                      <option value="national">🇻🇪 Franquicia Nacional</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Modalidad</Label>
                    <select
                      value={termsForm.agreementType}
                      onChange={e => setTermsForm({ ...termsForm, agreementType: e.target.value as any })}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium"
                    >
                      <option value="monthly_fixed">Monto Fijo Mensual ($)</option>
                      <option value="per_recipe_percentage">Porcentaje por Récipe (%)</option>
                      <option value="patient_discount">Descuento a Pacientes</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Valor / Comisión</Label>
                    <Input
                      value={termsForm.agreementValue}
                      onChange={e => setTermsForm({ ...termsForm, agreementValue: e.target.value })}
                      placeholder="Ej: $100/mes o 10%"
                      className="h-9 text-xs bg-white rounded-xl"
                    />
                  </div>
                </div>

                {/* MÓDULO 4: Decidir entre Médico y Farmacia si lleva Cupón de Descuento */}
                <div className="pt-3 border-t border-slate-200/80 space-y-3">
                  <label className="flex items-center gap-2 text-xs font-extrabold text-amber-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsForm.hasPatientCoupon}
                      onChange={e =>
                        setTermsForm({
                          ...termsForm,
                          hasPatientCoupon: e.target.checked,
                          couponCode: termsForm.couponCode || generateDefaultCouponCode(termsForm.couponDiscountPercent)
                        })
                      }
                      className="rounded text-amber-600 h-4 w-4"
                    />
                    <Ticket className="h-4 w-4 text-amber-600" />
                    ¿Incluir Cupón de Descuento para mis Pacientes en el Récipe? (Acuerdo Médico-Farmacia)
                  </label>

                  {termsForm.hasPatientCoupon && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                      <div>
                        <Label className="text-[11px] font-bold text-amber-950">% Descuento al Paciente</Label>
                        <Input
                          type="number"
                          min="1"
                          max="90"
                          value={termsForm.couponDiscountPercent}
                          onChange={e => setTermsForm({ ...termsForm, couponDiscountPercent: e.target.value })}
                          placeholder="Ej: 10"
                          className="h-8 text-xs bg-white rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-amber-950">Código del Cupón</Label>
                        <Input
                          value={termsForm.couponCode}
                          onChange={e => setTermsForm({ ...termsForm, couponCode: e.target.value.toUpperCase() })}
                          placeholder="Ej: DR-PEREZ-10"
                          className="h-8 text-xs bg-white rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-amber-950">Nota en el Cupón</Label>
                        <Input
                          value={termsForm.couponDescription}
                          onChange={e => setTermsForm({ ...termsForm, couponDescription: e.target.value })}
                          placeholder="Ej: Descuento en todo el récipe"
                          className="h-8 text-xs bg-white rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updatingTerms}
                    onClick={handleSaveTerms}
                    className="rounded-xl text-xs h-8"
                  >
                    {updatingTerms && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Guardar Términos y Cupón
                  </Button>

                  {activeNegotiation.status !== 'active' ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        handleSponsorshipAction(activeNegotiation.id, 'activate_alliance', {
                          ...termsForm,
                          couponDiscountPercent: Number(termsForm.couponDiscountPercent) || 0
                        })
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Activar Negociación y Recomendar en mis Récipes
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSponsorshipAction(activeNegotiation.id, 'pause_alliance')}
                      className="border-amber-300 text-amber-900 rounded-xl text-xs h-8"
                    >
                      Pausar Recomendación
                    </Button>
                  )}
                </div>
              </div>

              {/* Chat entre Médico y Farmacia */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-teal-400" />
                    Chat de Negociación Directa
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {activeNegotiation.pharmacy?.chainName || activeNegotiation.pharmacy?.name}
                  </span>
                </div>

                <div className="h-56 overflow-y-auto p-4 space-y-2.5 bg-slate-50/60">
                  {(activeNegotiation.messages || []).map((msg: any) => {
                    const isMe = msg.senderRole === 'doctor';
                    const isSystem = msg.senderRole === 'system';
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center my-2">
                          <span className="inline-block bg-teal-50 text-teal-900 border border-teal-200 rounded-full px-3 py-1 text-[11px] font-semibold">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                            isMe
                              ? 'bg-teal-600 text-white rounded-br-xs'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                          }`}
                        >
                          <span className={`block text-[10px] font-bold mb-0.5 ${isMe ? 'text-teal-100' : 'text-teal-700'}`}>
                            {msg.senderName}
                          </span>
                          <p className="leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-200 flex items-center gap-2 bg-white">
                  <Input
                    value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    placeholder="Escribe un mensaje a la farmacia..."
                    className="h-9 text-xs rounded-xl"
                  />
                  <Button type="submit" size="sm" disabled={sendingChat} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-9 px-4">
                    {sendingChat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Tarjeta de Farmacia y Catálogo */}
      <PharmacyShowcaseModal
        isOpen={Boolean(showcasePharmacy)}
        onClose={() => setShowcasePharmacy(null)}
        pharmacy={showcasePharmacy}
        isDoctorRecommended={true}
        recommendingDoctorName={doctor.name}
      />
    </div>
  );
}

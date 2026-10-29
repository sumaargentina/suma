"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Share2,
  Copy,
  Users,
  Stethoscope,
  FileText,
  Pill,
  BarChart3,
  CheckCircle2,
  XCircle,
  UserPlus,
  Search,
  Sparkles,
  Image as ImageIcon,
  Trash2,
  Edit,
  ExternalLink,
  Trophy,
  HeartHandshake,
  Loader2,
  Send,
  Upload,
  Eye,
  Baby,
  User,
  Check,
  ClipboardList,
  Building2,
  DollarSign,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LocationSelector, type LocationData } from '@/components/ui/location-selector';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/lib/settings';
import * as supabaseService from '@/lib/supabaseService';
import type {
  HealthCampaign,
  HealthCampaignOrganizerRole,
  HealthCampaignPaymentDetails,
  Doctor,
} from '@/lib/types';

const DEFAULT_SPECIALTIES = [
  'Medicina General',
  'Pediatría',
  'Cirugía General',
  'Ginecología y Obstetricia',
  'Cardiología',
  'Medicina Interna',
  'Traumatología y Ortopedia',
  'Oftalmología',
  'Odontología',
  'Dermatología',
  'Otorrinolaringología',
  'Urología',
  'Nutrición y Dietética',
  'Psicología',
  'Fisioterapia',
  'Laboratorio Clínico',
];

interface HealthCampaignsManagerProps {
  organizerId: string;
  organizerRole: HealthCampaignOrganizerRole;
  organizerName: string;
  organizerLogo?: string | null;
  defaultDoctorSpecialty?: string;
  initialCampaignId?: string | null;
}

export function HealthCampaignsManager({
  organizerId,
  organizerRole,
  organizerName,
  organizerLogo,
  defaultDoctorSpecialty,
  initialCampaignId,
}: HealthCampaignsManagerProps) {
  const { toast } = useToast();
  const { specialties: settingsSpecialties } = useSettings();

  const [campaigns, setCampaigns] = useState<HealthCampaign[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Jornada seleccionada para ver Detalle / Atender en Vivo / Estadísticas
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(initialCampaignId || null);
  const [detailTab, setDetailTab] = useState<'attend' | 'stats' | 'doctors' | 'registrations'>('attend');
  const [attendanceDoctorFilter, setAttendanceDoctorFilter] = useState<'all' | 'mine'>(
    organizerRole === 'doctor' ? 'mine' : 'all'
  );
  const [isSubscribingDoctor, setIsSubscribingDoctor] = useState(false);

  // Modal Crear / Editar Jornada
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<HealthCampaign | null>(null);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  // Campos del formulario de Jornada
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [campaignType, setCampaignType] = useState<'free' | 'paid'>('free');
  const [pricingMode, setPricingMode] = useState<'per_event' | 'per_specialist'>('per_event');
  const [priceAmount, setPriceAmount] = useState('');
  const [specialtyPrices, setSpecialtyPrices] = useState<Record<string, string>>({});
  const [priceInfo, setPriceInfo] = useState('');
  const [paymentAccountSource, setPaymentAccountSource] = useState<'organizer' | 'manual'>('organizer');
  const [organizerAccounts, setOrganizerAccounts] = useState<HealthCampaignPaymentDetails[]>([]);
  const [selectedOrgAccountIdx, setSelectedOrgAccountIdx] = useState(0);
  const [manualPaymentDetails, setManualPaymentDetails] = useState<HealthCampaignPaymentDetails>({
    currency: 'VES',
    accountType: 'Pago Móvil / Transferencia',
    bank: '',
    accountHolder: organizerName || '',
    idNumber: '',
    accountNumber: '',
    phone: '',
    notes: '',
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [capacityMode, setCapacityMode] = useState<'unlimited' | 'limited'>('unlimited');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [campaignStatus, setCampaignStatus] = useState<'upcoming' | 'active' | 'completed' | 'cancelled'>('upcoming');
  const [locationData, setLocationData] = useState<LocationData>({
    country: 'VE',
    state: 'Monagas',
    city: 'Maturín',
    sector: '',
    address: '',
  });
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['Medicina General']);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [invitedDoctorsList, setInvitedDoctorsList] = useState<
    {
      doctorId: string;
      doctorName: string;
      doctorEmail?: string;
      doctorSpecialty?: string;
      doctorProfileImage?: string;
    }[]
  >([]);

  // Estado de Atención en Vivo (Día del Evento)
  const [attCedula, setAttCedula] = useState('');
  const [attName, setAttName] = useState('');
  const [attPhone, setAttPhone] = useState('');
  const [attEmail, setAttEmail] = useState('');
  const [attAge, setAttAge] = useState('');
  const [attDemographic, setAttDemographic] = useState<'mujer' | 'hombre' | 'nino'>('mujer');
  const [attSpecialty, setAttSpecialty] = useState('');
  const [attDoctorId, setAttDoctorId] = useState('');
  const [attEvaluation, setAttEvaluation] = useState('');
  const [attDiagnosis, setAttDiagnosis] = useState('');
  const [attPrescription, setAttPrescription] = useState('');
  const [attTreatmentPlan, setAttTreatmentPlan] = useState('');
  const [attRequestedStudies, setAttRequestedStudies] = useState('');
  const [attAmountPaid, setAttAmountPaid] = useState('');
  const [attPaymentMethod, setAttPaymentMethod] = useState('Pago Móvil / Transferencia');
  const [attPaymentReference, setAttPaymentReference] = useState('');
  const [isLookingUpPatient, setIsLookingUpPatient] = useState(false);
  const [patientLookupStatus, setPatientLookupStatus] = useState<'idle' | 'registered' | 'guest'>('idle');
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [lastAttendanceResult, setLastAttendanceResult] = useState<{
    patientName: string;
    patientPhone?: string;
    patientEmail?: string;
    isRegisteredPatient: boolean;
    emailSent: boolean;
    recipeUrl?: string | null;
    reportUrl?: string | null;
  } | null>(null);
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');

  const availableSpecialties = useMemo(() => {
    const merged = new Set<string>([...DEFAULT_SPECIALTIES, ...(settingsSpecialties || [])]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [settingsSpecialties]);

  const fetchCampaignsAndDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const queryParam =
        organizerRole === 'admin'
          ? ''
          : organizerRole === 'doctor'
            ? `?doctorId=${encodeURIComponent(organizerId)}`
            : `?organizerId=${encodeURIComponent(organizerId)}`;

      const [campRes, docsData, orgAccRes] = await Promise.all([
        fetch(`/api/health-campaigns${queryParam}`),
        supabaseService.getDoctors(),
        fetch(
          `/api/health-campaigns?organizerAccounts=true&organizerId=${encodeURIComponent(
            organizerId
          )}&organizerRole=${encodeURIComponent(organizerRole)}`
        ),
      ]);

      if (campRes.ok) {
        const data: HealthCampaign[] = await campRes.json();
        setCampaigns(Array.isArray(data) ? data : []);
        if (data.length > 0 && !selectedCampaignId) {
          setSelectedCampaignId(data[0].id);
        }
      }
      if (orgAccRes.ok) {
        const accJson = await orgAccRes.json();
        if (Array.isArray(accJson.accounts)) {
          setOrganizerAccounts(accJson.accounts);
        }
      }
      setAllDoctors(docsData || []);
    } catch (err) {
      console.error('Error loading health campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [organizerId, organizerRole, selectedCampaignId]);

  useEffect(() => {
    fetchCampaignsAndDoctors();
  }, [fetchCampaignsAndDoctors]);

  const selectedCampaign = useMemo(
    () => campaigns.find(c => c.id === selectedCampaignId) || campaigns[0] || null,
    [campaigns, selectedCampaignId]
  );

  // Configurar valores por defecto de médico y especialidad en la consola de atención cuando cambia la jornada
  useEffect(() => {
    if (!selectedCampaign) return;
    let initialSpec = selectedCampaign.specialties?.[0] || 'Medicina General';
    if (organizerRole === 'doctor') {
      setAttDoctorId(organizerId);
      initialSpec = defaultDoctorSpecialty || selectedCampaign.specialties?.[0] || 'Medicina General';
      setAttSpecialty(initialSpec);
    } else {
      const firstAccepted =
        selectedCampaign.doctors?.find(d => d.status === 'accepted') ||
        selectedCampaign.doctors?.[0];
      if (firstAccepted) {
        setAttDoctorId(firstAccepted.doctorId);
        initialSpec = firstAccepted.doctorSpecialty || selectedCampaign.specialties?.[0] || 'Medicina General';
        setAttSpecialty(initialSpec);
      } else {
        setAttSpecialty(initialSpec);
      }
    }
    if (selectedCampaign.campaignType === 'paid') {
      const customSpecPrice =
        selectedCampaign.pricingMode === 'per_specialist' &&
        selectedCampaign.specialtyPrices &&
        selectedCampaign.specialtyPrices[initialSpec] !== undefined
          ? selectedCampaign.specialtyPrices[initialSpec]
          : selectedCampaign.priceAmount || 0;
      setAttAmountPaid(String(customSpecPrice || 0));
    } else {
      setAttAmountPaid('0');
    }
  }, [selectedCampaign, organizerRole, organizerId, defaultDoctorSpecialty]);

  // Invitaciones pendientes para este médico
  const myPendingInvitations = useMemo(() => {
    if (organizerRole !== 'doctor') return [];
    return campaigns.filter(c =>
      c.doctors?.some(d => d.doctorId === organizerId && d.status === 'pending')
    );
  }, [campaigns, organizerRole, organizerId]);

  const handleOpenCreateModal = () => {
    setEditingCampaign(null);
    setTitle('');
    setDescription('');
    setCampaignType('free');
    setPricingMode('per_event');
    setPriceAmount('');
    setSpecialtyPrices({});
    setPriceInfo('');
    setPaymentAccountSource(organizerAccounts.length > 0 ? 'organizer' : 'manual');
    setSelectedOrgAccountIdx(0);
    setManualPaymentDetails({
      currency: 'VES',
      accountType: 'Pago Móvil / Transferencia',
      bank: '',
      accountHolder: organizerName || '',
      idNumber: '',
      accountNumber: '',
      phone: '',
      notes: '',
    });
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setStartTime('08:00');
    setEndTime('16:00');
    setCapacityMode('unlimited');
    setMaxCapacity('');
    setCampaignStatus('upcoming');
    setSelectedSpecialties(
      defaultDoctorSpecialty ? [defaultDoctorSpecialty] : ['Medicina General']
    );
    setGalleryImages([]);
    if (organizerRole === 'doctor') {
      const me = allDoctors.find(d => d.id === organizerId);
      setInvitedDoctorsList(
        me
          ? [
              {
                doctorId: me.id,
                doctorName: me.name,
                doctorEmail: me.email,
                doctorSpecialty: me.specialty,
                doctorProfileImage: me.profileImage,
              },
            ]
          : []
      );
    } else {
      setInvitedDoctorsList([]);
    }
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (camp: HealthCampaign) => {
    setEditingCampaign(camp);
    setTitle(camp.title);
    setDescription(camp.description || '');
    setCampaignType(camp.campaignType || 'free');
    setPricingMode(camp.pricingMode || 'per_event');
    setPriceAmount(camp.priceAmount ? String(camp.priceAmount) : '');
    const spMap: Record<string, string> = {};
    if (camp.specialtyPrices && typeof camp.specialtyPrices === 'object') {
      Object.entries(camp.specialtyPrices).forEach(([k, v]) => {
        spMap[k] = String(v);
      });
    }
    setSpecialtyPrices(spMap);
    setPriceInfo(camp.priceInfo || '');
    setPaymentAccountSource(camp.paymentAccountSource || (organizerAccounts.length > 0 ? 'organizer' : 'manual'));
    setSelectedOrgAccountIdx(0);
    setManualPaymentDetails({
      currency: camp.paymentDetails?.currency || 'VES',
      accountType: camp.paymentDetails?.accountType || 'Pago Móvil / Transferencia',
      bank: camp.paymentDetails?.bank || '',
      accountHolder: camp.paymentDetails?.accountHolder || organizerName || '',
      idNumber: camp.paymentDetails?.idNumber || '',
      accountNumber: camp.paymentDetails?.accountNumber || '',
      phone: camp.paymentDetails?.phone || '',
      notes: camp.paymentDetails?.notes || '',
    });
    setStartDate(camp.startDate);
    setEndDate(camp.endDate || camp.startDate);
    setStartTime(camp.startTime || '08:00');
    setEndTime(camp.endTime || '16:00');
    setCapacityMode(camp.capacityMode || 'unlimited');
    setMaxCapacity(camp.maxCapacity ? String(camp.maxCapacity) : '');
    setCampaignStatus(camp.status || 'upcoming');
    setLocationData({
      country: camp.country || 'VE',
      state: camp.state || '',
      city: camp.city || '',
      sector: camp.sector || '',
      address: camp.address || '',
    });
    setSelectedSpecialties(camp.specialties?.length > 0 ? camp.specialties : ['Medicina General']);
    const photos = Array.from(
      new Set([camp.coverImage, ...(camp.galleryImages || [])].filter(Boolean) as string[])
    );
    setGalleryImages(photos);
    setInvitedDoctorsList(
      (camp.doctors || []).map(d => ({
        doctorId: d.doctorId,
        doctorName: d.doctorName,
        doctorEmail: d.doctorEmail || undefined,
        doctorSpecialty: d.doctorSpecialty || undefined,
        doctorProfileImage: d.doctorProfileImage || undefined,
      }))
    );
    setIsFormOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await supabaseService.uploadPublicImage(
          file,
          'profile-images',
          `campaigns/${organizerId}_${Date.now()}_${i}`
        );
        if (url) uploadedUrls.push(url);
      }
      setGalleryImages(prev => [...prev, ...uploadedUrls]);
      toast({
        title: 'Fotos cargadas',
        description: `Se añadieron ${uploadedUrls.length} foto(s) a la galería de la jornada.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al subir imagen',
        description: err.message || 'No se pudo subir la foto.',
      });
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleToggleSpecialty = (spec: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleAddCustomSpecialty = () => {
    const clean = customSpecialtyInput.trim();
    if (!clean) return;
    if (!selectedSpecialties.includes(clean)) {
      setSelectedSpecialties(prev => [...prev, clean]);
    }
    setCustomSpecialtyInput('');
  };

  const handleAddDoctorToInviteList = (doc: Doctor) => {
    if (invitedDoctorsList.some(d => d.doctorId === doc.id)) return;
    setInvitedDoctorsList(prev => [
      ...prev,
      {
        doctorId: doc.id,
        doctorName: doc.name,
        doctorEmail: doc.email,
        doctorSpecialty: doc.specialty,
        doctorProfileImage: doc.profileImage,
      },
    ]);
    if (doc.specialty && !selectedSpecialties.includes(doc.specialty)) {
      setSelectedSpecialties(prev => [...prev, doc.specialty]);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !locationData.city?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Datos incompletos',
        description: 'Por favor indica el nombre de la jornada, la fecha del evento y selecciona la ciudad donde se realizará.',
      });
      return;
    }

    if (campaignType === 'paid') {
      const numericPrice = Number(priceAmount);
      if (Number.isNaN(numericPrice) || numericPrice <= 0) {
        toast({
          variant: 'destructive',
          title: 'Precio requerido',
          description:
            pricingMode === 'per_event'
              ? 'Indica el monto en $ por participar en todo el evento.'
              : 'Indica el monto base en $ por cada especialista que atienda al paciente.',
        });
        return;
      }
      if (paymentAccountSource === 'manual' && (!manualPaymentDetails.bank?.trim() || !manualPaymentDetails.accountNumber?.trim())) {
        toast({
          variant: 'destructive',
          title: 'Cuenta destino incompleta',
          description: 'Indica el banco/método de pago y el número de cuenta o teléfono destino.',
        });
        return;
      }
    }

    setIsSavingCampaign(true);
    try {
      const numericSpecPrices: Record<string, number> = {};
      if (campaignType === 'paid' && pricingMode === 'per_specialist') {
        Object.entries(specialtyPrices).forEach(([specName, val]) => {
          const num = Number(val);
          if (!Number.isNaN(num) && num >= 0 && val.trim() !== '') {
            numericSpecPrices[specName] = num;
          }
        });
      }

      const chosenPaymentDetails =
        campaignType === 'paid'
          ? paymentAccountSource === 'organizer' && organizerAccounts[selectedOrgAccountIdx]
            ? organizerAccounts[selectedOrgAccountIdx]
            : manualPaymentDetails
          : null;

      const autoPriceSummary =
        campaignType === 'paid'
          ? pricingMode === 'per_event'
            ? `$${Number(priceAmount).toFixed(2)} USD (Pase por todo el evento)${priceInfo.trim() ? ` • ${priceInfo.trim()}` : ''}`
            : `$${Number(priceAmount).toFixed(2)} USD por especialista${priceInfo.trim() ? ` • ${priceInfo.trim()}` : ''}`
          : 'Gratuita';

      const payload = {
        id: editingCampaign?.id,
        title: title.trim(),
        description: description.trim(),
        organizerId,
        organizerRole,
        organizerName,
        organizerLogo: organizerLogo || null,
        campaignType,
        pricingMode: campaignType === 'paid' ? pricingMode : 'per_event',
        priceAmount: campaignType === 'paid' ? Number(priceAmount) || 0 : 0,
        specialtyPrices: campaignType === 'paid' ? numericSpecPrices : {},
        priceInfo: priceInfo.trim() || autoPriceSummary,
        paymentAccountSource: campaignType === 'paid' ? paymentAccountSource : 'organizer',
        paymentDetails: chosenPaymentDetails,
        capacityMode,
        maxCapacity: capacityMode === 'limited' && Number(maxCapacity) > 0 ? Number(maxCapacity) : null,
        specialties: selectedSpecialties.length > 0 ? selectedSpecialties : ['Medicina General'],
        startDate,
        endDate: endDate || startDate,
        startTime,
        endTime,
        country: locationData.country,
        state: locationData.state,
        city: locationData.city,
        sector: locationData.sector,
        address: locationData.address,
        coverImage: galleryImages[0] || null,
        galleryImages,
        status: campaignStatus,
        invitedDoctors: invitedDoctorsList,
      };

      const res = await fetch('/api/health-campaigns', {
        method: editingCampaign ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la jornada de salud');
      }

      toast({
        title: editingCampaign ? 'Jornada Actualizada' : '¡Jornada de Salud Creada!',
        description: editingCampaign
          ? 'Los cambios y médicos invitados han sido actualizados.'
          : 'Se ha creado el evento y se notificó a los médicos invitados.',
      });

      setIsFormOpen(false);
      await fetchCampaignsAndDoctors();
      if (!editingCampaign && data.id) {
        setSelectedCampaignId(data.id);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Ocurrió un error al guardar la jornada.',
      });
    } finally {
      setIsSavingCampaign(false);
    }
  };

  const handleRespondInvitation = async (campaignId: string, status: 'accepted' | 'declined') => {
    try {
      setIsSubscribingDoctor(true);
      const res = await fetch('/api/health-campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_invitation',
          campaignId,
          doctorId: organizerId,
          doctorName: organizerName,
          doctorSpecialty: defaultDoctorSpecialty || 'Medicina General',
          doctorProfileImage: organizerLogo || null,
          status,
        }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar tu respuesta');
      toast({
        title: status === 'accepted' ? '¡Suscripción Confirmada en la Jornada! 🩺' : 'Invitación Rechazada',
        description:
          status === 'accepted'
            ? 'Ya tienes acceso habilitado con tu usuario independiente para pasar consulta en esta jornada médica.'
            : 'Has declinado participar en esta jornada.',
      });
      setSelectedCampaignId(campaignId);
      if (status === 'accepted') {
        setDetailTab('attend');
      }
      await fetchCampaignsAndDoctors();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSubscribingDoctor(false);
    }
  };

  const handleSubscribeAsDoctor = async (campaignId: string) => {
    await handleRespondInvitation(campaignId, 'accepted');
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta jornada de salud y sus registros?')) return;
    try {
      const res = await fetch(`/api/health-campaigns?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo eliminar');
      toast({ title: 'Jornada eliminada', description: 'El evento fue eliminado correctamente.' });
      if (selectedCampaignId === id) setSelectedCampaignId(null);
      await fetchCampaignsAndDoctors();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  // Autocompletado de paciente por Cédula en el Día del Evento
  const handleAttendanceCedulaLookup = async (cedulaValue?: string) => {
    const queryCedula = (cedulaValue ?? attCedula).trim();
    if (queryCedula.length < 4 || !selectedCampaign) return;

    try {
      setIsLookingUpPatient(true);
      const res = await fetch(
        `/api/health-campaigns/register?cedula=${encodeURIComponent(queryCedula)}&campaignId=${selectedCampaign.id}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.found && data.patient) {
        setAttName(data.patient.name || '');
        setAttPhone(data.patient.phone || '');
        setAttEmail(data.patient.email || '');
        setAttAge(
          data.patient.age !== null && data.patient.age !== undefined ? String(data.patient.age) : ''
        );
        if (data.patient.demographicGroup) {
          setAttDemographic(data.patient.demographicGroup);
        }
        if (data.patient.interestSpecialty && selectedCampaign.specialties?.includes(data.patient.interestSpecialty)) {
          setAttSpecialty(data.patient.interestSpecialty);
        }
        setPatientLookupStatus(data.isRegisteredInSuma ? 'registered' : 'guest');
      } else {
        setPatientLookupStatus('guest');
      }
    } catch {
      // ignore
    } finally {
      setIsLookingUpPatient(false);
    }
  };

  // Guardar atención del paciente en la jornada
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    if (!attCedula.trim() || !attName.trim() || !attEmail.trim()) {
      toast({
        variant: 'destructive',
        title: 'Datos primordiales requeridos',
        description: 'La cédula, el nombre y el correo electrónico del paciente son obligatorios para enviarle su participación y récipe.',
      });
      return;
    }

    const activeDoc =
      allDoctors.find(d => d.id === attDoctorId) ||
      (organizerRole === 'doctor' ? { id: organizerId, name: organizerName, specialty: attSpecialty } : null);

    const resolvedDoctorId = activeDoc?.id || selectedCampaign.doctors?.[0]?.doctorId || organizerId;
    const resolvedDoctorName = activeDoc?.name || selectedCampaign.doctors?.[0]?.doctorName || organizerName;

    setIsSubmittingAttendance(true);
    try {
      const res = await fetch('/api/health-campaigns/attend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          doctorId: resolvedDoctorId,
          doctorName: resolvedDoctorName,
          specialty: attSpecialty || 'Medicina General',
          patientCedula: attCedula.trim(),
          patientName: attName.trim(),
          patientPhone: attPhone.trim(),
          patientEmail: attEmail.trim(),
          patientAge: attAge ? Number(attAge) : null,
          patientGender: attDemographic === 'hombre' ? 'hombre' : 'mujer',
          demographicGroup: attDemographic,
          evaluation: attEvaluation.trim(),
          diagnosis: attDiagnosis.trim(),
          prescription: attPrescription.trim(),
          treatmentPlan: attTreatmentPlan.trim(),
          requestedStudies: attRequestedStudies.trim(),
          amountPaid: selectedCampaign.campaignType === 'paid' ? Number(attAmountPaid) || 0 : 0,
          paymentStatus: selectedCampaign.campaignType === 'paid' ? 'paid' : 'free',
          paymentMethod: selectedCampaign.campaignType === 'paid' ? attPaymentMethod : null,
          paymentReference: selectedCampaign.campaignType === 'paid' ? attPaymentReference.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo registrar la atención del paciente');
      }

      setLastAttendanceResult({
        patientName: attName.trim(),
        patientPhone: attPhone.trim(),
        patientEmail: attEmail.trim(),
        isRegisteredPatient: Boolean(data.isRegisteredPatient),
        emailSent: Boolean(data.emailSent),
        recipeUrl: data.recipeUrl,
        reportUrl: data.reportUrl,
      });

      toast({
        title: '✅ Paciente Atendido Exitosamente',
        description: data.isRegisteredPatient
          ? `Se guardó en el historial SUMA de ${attName} y se envió su récipe por correo.`
          : `Se envió el correo a ${attName} con su récipe digital y el botón para registrarse en SUMA.`,
      });

      await fetchCampaignsAndDoctors();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar atención',
        description: err.message,
      });
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const resetAttendanceForm = () => {
    setAttCedula('');
    setAttName('');
    setAttPhone('');
    setAttEmail('');
    setAttAge('');
    setAttDemographic('mujer');
    setAttEvaluation('');
    setAttDiagnosis('');
    setAttPrescription('');
    setAttTreatmentPlan('');
    setAttRequestedStudies('');
    setAttPaymentReference('');
    setPatientLookupStatus('idle');
    setLastAttendanceResult(null);
  };

  const handleCopyPublicLink = (campId: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/jornadas/${campId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Enlace del evento copiado',
      description: 'Compártelo para que los pacientes vean las especialidades, médicos y se sumen al evento.',
    });
  };

  const handleShareCampaignWhatsApp = (camp: HealthCampaign) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/jornadas/${camp.id}`;
    const text = `🩺 *Jornada de Salud: ${camp.title}*\nOrganiza: ${camp.organizerName}\n📅 Fecha: ${camp.startDate} (${camp.startTime} a ${camp.endTime})\n📍 Lugar: ${[camp.city, camp.address].filter(Boolean).join(' - ')}\n✨ Especialidades: ${(camp.specialties || []).join(', ')}\n\nConoce los médicos participantes y anótate aquí 👇\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredDoctorsForSearch = useMemo(() => {
    const q = doctorSearchQuery.toLowerCase().trim();
    return allDoctors
      .filter(d => {
        if (invitedDoctorsList.some(inv => inv.doctorId === d.id)) return false;
        if (!q) return true;
        return (
          d.name.toLowerCase().includes(q) ||
          (d.specialty || '').toLowerCase().includes(q) ||
          (d.city || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [allDoctors, doctorSearchQuery, invitedDoctorsList]);

  const filteredAttendances = useMemo(() => {
    let list = selectedCampaign?.attendances || [];
    if (organizerRole === 'doctor' && attendanceDoctorFilter === 'mine') {
      list = list.filter(a => a.doctorId === organizerId);
    }
    const q = attendanceSearchTerm.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      a =>
        a.patientName.toLowerCase().includes(q) ||
        a.patientCedula.toLowerCase().includes(q) ||
        a.specialty.toLowerCase().includes(q) ||
        a.doctorName.toLowerCase().includes(q)
    );
  }, [selectedCampaign, attendanceSearchTerm, organizerRole, attendanceDoctorFilter, organizerId]);

  const myAttendedInSelectedCampaign = useMemo(() => {
    if (!selectedCampaign) return 0;
    return (selectedCampaign.attendances || []).filter(a => a.doctorId === organizerId).length;
  }, [selectedCampaign, organizerId]);

  const isDoctorSubscribedToSelected = useMemo(() => {
    if (!selectedCampaign || organizerRole !== 'doctor') return true;
    return (
      selectedCampaign.organizerId === organizerId ||
      Boolean(selectedCampaign.doctors?.some(d => d.doctorId === organizerId && d.status === 'accepted'))
    );
  }, [selectedCampaign, organizerRole, organizerId]);

  return (
    <div className="space-y-6">
      {/* Cabecera Principal del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-900 via-teal-800 to-sky-900 text-white p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-200">
            <HeartHandshake className="h-4 w-4" />
            Módulo de Eventos y Atención Comunitaria SUMA
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Jornadas de Salud</h2>
          <p className="text-xs sm:text-sm text-teal-100 max-w-2xl">
            Crea jornadas gratuitas o privadas con múltiples especialidades, invita a médicos del ecosistema SUMA, comparte el link del evento, atiende pacientes sin cita previa emitiendo récipes digitales y consulta estadísticas detalladas.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Jornada de Salud
        </Button>
      </div>

      {/* Banner de Invitaciones Pendientes (Solo para Médicos invitados) */}
      {myPendingInvitations.length > 0 && (
        <Card className="border-2 border-amber-400 bg-amber-50/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              Tienes {myPendingInvitations.length}{' '}
              {myPendingInvitations.length === 1
                ? 'invitación pendiente a una Jornada de Salud'
                : 'invitaciones pendientes a Jornadas de Salud'}
            </CardTitle>
            <CardDescription className="text-amber-800 text-xs">
              Confirma tu participación para aparecer en la página oficial del evento y habilitar tu consola de atención el día de la jornada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myPendingInvitations.map(camp => (
              <div
                key={camp.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-amber-200"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">{camp.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {camp.campaignType === 'free' ? 'Gratuita' : 'Privada'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Organiza: <strong>{camp.organizerName}</strong> • 📅 {camp.startDate} ({camp.startTime} - {camp.endTime}) • 📍{' '}
                    {[camp.city, camp.address].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleRespondInvitation(camp.id, 'accepted')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Aceptar Participar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleRespondInvitation(camp.id, 'declined')}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed border-2 py-12 text-center">
          <CardContent className="space-y-4">
            <HeartHandshake className="h-14 w-14 text-teal-600/60 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Aún no hay Jornadas de Salud registradas</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Crea tu primera jornada de salud gratuita o privada, invita a médicos de SUMA, comparte el link con la comunidad y lleva las estadísticas completas en vivo.
              </p>
            </div>
            <Button onClick={handleOpenCreateModal} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Jornada de Salud
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda (4/12): Lista de Jornadas */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 px-1">
              {organizerRole === 'doctor'
                ? `Jornadas Suscritas y Disponibles (${campaigns.length})`
                : `Mis Jornadas de Salud (${campaigns.length})`}
            </h3>
            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {campaigns.map(camp => {
                const isSelected = selectedCampaign?.id === camp.id;
                const isCreator = camp.organizerId === organizerId || organizerRole === 'admin';
                const myDocEntry = camp.doctors?.find(d => d.doctorId === organizerId);
                const isSubscribed =
                  camp.organizerId === organizerId || myDocEntry?.status === 'accepted';
                const isPendingInvite = myDocEntry?.status === 'pending';
                const myAttCount = (camp.attendances || []).filter(a => a.doctorId === organizerId).length;
                return (
                  <Card
                    key={camp.id}
                    onClick={() => setSelectedCampaignId(camp.id)}
                    className={`cursor-pointer transition-all overflow-hidden ${
                      isSelected
                        ? 'border-2 border-teal-600 ring-2 ring-teal-500/20 shadow-md'
                        : 'border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {camp.coverImage && (
                      <div className="h-28 w-full bg-slate-100 overflow-hidden relative">
                        <img src={camp.coverImage} alt={camp.title} className="w-full h-full object-cover" />
                        <Badge
                          className={`absolute top-2 right-2 text-[10px] ${
                            camp.campaignType === 'free'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {camp.campaignType === 'free' ? 'Gratuita' : 'Privada'}
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-900 text-sm line-clamp-2">{camp.title}</h4>
                        {!camp.coverImage && (
                          <Badge
                            className={`shrink-0 text-[10px] ${
                              camp.campaignType === 'free'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            {camp.campaignType === 'free' ? 'Gratuita' : 'Privada'}
                          </Badge>
                        )}
                      </div>

                      {organizerRole === 'doctor' && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isSubscribed ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                              ✅ Suscrito • Pasar Consulta ({myAttCount} atendidos por mí)
                            </Badge>
                          ) : isPendingInvite ? (
                            <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                              ⏳ Invitación Pendiente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200 text-[10px] font-semibold">
                              🩺 Jornada Disponible para Suscribirte
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Building2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">
                            Organiza: <strong>{camp.organizerName}</strong>{' '}
                            <span className="text-[11px] text-teal-700">
                              ({camp.organizerRole === 'pharmacy'
                                ? 'Farmacia'
                                : camp.organizerRole === 'laboratory'
                                ? 'Laboratorio'
                                : camp.organizerRole === 'clinic'
                                ? 'Clínica'
                                : camp.organizerRole === 'doctor'
                                ? 'Médico'
                                : 'SUMA'})
                            </span>
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span>
                            {camp.startDate} ({camp.startTime} - {camp.endTime})
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">
                            {[camp.city, camp.state, camp.address].filter(Boolean).join(', ') || 'Sin dirección'}
                          </span>
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t text-center">
                        <div className="bg-slate-50 rounded p-1.5">
                          <p className="text-xs font-extrabold text-teal-700">
                            {camp.stats?.totalAttended || 0}
                          </p>
                          <p className="text-[10px] text-slate-500">Atendidos</p>
                        </div>
                        <div className="bg-slate-50 rounded p-1.5">
                          <p className="text-xs font-extrabold text-blue-700">
                            {camp.stats?.totalWithPrescription || 0}
                          </p>
                          <p className="text-[10px] text-slate-500">Con Récipe</p>
                        </div>
                        <div className="bg-slate-50 rounded p-1.5">
                          <p className="text-xs font-extrabold text-emerald-700">
                            {camp.doctors?.filter(d => d.status === 'accepted').length || 0}/
                            {camp.doctors?.length || 0}
                          </p>
                          <p className="text-[10px] text-slate-500">Médicos</p>
                        </div>
                      </div>

                      {organizerRole === 'doctor' && !isSubscribed && (
                        <div className="pt-1" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            disabled={isSubscribingDoctor}
                            className="w-full h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold"
                            onClick={() => handleSubscribeAsDoctor(camp.id)}
                          >
                            <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                            Suscribirme y Pasar Consulta
                          </Button>
                        </div>
                      )}

                      {isCreator && (
                        <div className="flex items-center justify-end gap-1 pt-1" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => handleOpenEditModal(camp)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteCampaign(camp.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha (8/12): Panel Operativo y Estadístico de la Jornada Seleccionada */}
          {selectedCampaign && (
            <div className="lg:col-span-8 space-y-6">
              {/* Barra Superior del Evento Seleccionado con Link para Compartir */}
              <Card className="border-slate-200 shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-extrabold text-slate-900">
                          {selectedCampaign.title}
                        </h3>
                        <Badge
                          className={
                            selectedCampaign.campaignType === 'free'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }
                        >
                          {selectedCampaign.campaignType === 'free'
                            ? 'Jornada Gratuita'
                            : `Jornada Privada ${selectedCampaign.priceInfo ? `(${selectedCampaign.priceInfo})` : ''}`}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <Badge variant="outline" className="bg-teal-50/80 text-teal-900 border-teal-200 text-xs font-semibold">
                          🏛️ Organizado por: {selectedCampaign.organizerName} (
                          {selectedCampaign.organizerRole === 'pharmacy'
                            ? 'Farmacia'
                            : selectedCampaign.organizerRole === 'laboratory'
                            ? 'Laboratorio'
                            : selectedCampaign.organizerRole === 'clinic'
                            ? 'Clínica'
                            : selectedCampaign.organizerRole === 'doctor'
                            ? 'Médico'
                            : 'SUMA'}
                          )
                        </Badge>
                        <span className="text-xs text-slate-500">
                          📅 <strong>{selectedCampaign.startDate}</strong> ({selectedCampaign.startTime} a{' '}
                          {selectedCampaign.endTime})
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-sky-50 text-sky-900 border-sky-200 font-semibold"
                        >
                          🎟️{' '}
                          {selectedCampaign.capacityMode === 'limited' && selectedCampaign.maxCapacity
                            ? `Cupos: ${selectedCampaign.registrations?.length || 0} / ${selectedCampaign.maxCapacity} reservados`
                            : `Cupos Ilimitados (${selectedCampaign.registrations?.length || 0} con ticket)`}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyPublicLink(selectedCampaign.id)}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copiar Link Público
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleShareCampaignWhatsApp(selectedCampaign)}
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1.5" />
                        WhatsApp
                      </Button>
                      <Button size="sm" variant="secondary" asChild>
                        <Link href={`/jornadas/${selectedCampaign.id}`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Ver Página del Evento
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Especialidades del Evento */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Especialidades:</span>
                    {(selectedCampaign.specialties || []).map((s, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs bg-teal-50 text-teal-800">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pestañas Operativas: 1) Día del Evento (Atender Pacientes) | 2) Estadísticas e Historial | 3) Médicos | 4) Pre-Anotados */}
              <Tabs value={detailTab} onValueChange={(v: any) => setDetailTab(v)}>
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto gap-1 bg-slate-200/70 p-1">
                  <TabsTrigger value="attend" className="text-xs font-bold py-2">
                    <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                    Día del Evento: Atender
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="text-xs font-bold py-2">
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                    Estadísticas ({selectedCampaign.stats?.totalAttended || 0})
                  </TabsTrigger>
                  <TabsTrigger value="doctors" className="text-xs font-bold py-2">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    Médicos ({selectedCampaign.doctors?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="registrations" className="text-xs font-bold py-2">
                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                    Anotados ({selectedCampaign.registrations?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: CONSOLA DE ATENCIÓN EN VIVO (DÍA DEL EVENTO - SIN CITAS) */}
                <TabsContent value="attend" className="mt-4 space-y-4">
                  {organizerRole === 'doctor' && !isDoctorSubscribedToSelected && (
                    <div className="p-4 rounded-2xl border-2 border-teal-500 bg-teal-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-extrabold text-teal-950 flex items-center gap-1.5">
                          <Stethoscope className="h-4 w-4 text-teal-600" />
                          ¿Participarás como médico en esta Jornada de Salud?
                        </p>
                        <p className="text-xs text-teal-800">
                          Suscríbete con un clic para aparecer en el equipo médico oficial del evento y pasar tu consulta independiente con tu propio usuario (<strong>Dr(a). {organizerName}</strong>).
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={isSubscribingDoctor}
                        onClick={() => handleSubscribeAsDoctor(selectedCampaign.id)}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold shrink-0"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Suscribirme a esta Jornada
                      </Button>
                    </div>
                  )}

                  {organizerRole === 'doctor' && isDoctorSubscribedToSelected && (
                    <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Consulta Independiente Activa:</strong> Estás pasando consulta con tu usuario{' '}
                          <strong>Dr(a). {organizerName}</strong>. Cada paciente que atiendas aquí se guardará directamente en la jornada{' '}
                          <strong>«{selectedCampaign.title}»</strong>.
                        </span>
                      </div>
                      <Badge className="bg-emerald-600 text-white shrink-0 w-fit">
                        Mis consultas en esta jornada: {myAttendedInSelectedCampaign}
                      </Badge>
                    </div>
                  )}

                  {organizerRole !== 'doctor' && (
                    <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/80 flex items-start gap-2.5 text-xs text-sky-950">
                      <Stethoscope className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Acceso Independiente para Cada Médico:</strong> Todos los médicos suscritos a esta jornada tienen acceso directo desde su propio Panel Médico (pestaña <strong>Jornadas</strong>) para pasar su consulta independiente con su propio usuario, y cada atención que registren se guarda automáticamente en esta jornada. También puedes registrar atenciones desde aquí seleccionando al médico tratante.
                      </div>
                    </div>
                  )}

                  <Card className="border-2 border-teal-500/80 shadow-sm">
                    <CardHeader className="bg-teal-50/70 border-b pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg text-teal-950 flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-teal-600" />
                            Consola de Atención de Pacientes en la Jornada (Sin Cita Previa)
                          </CardTitle>
                          <CardDescription className="text-xs text-teal-800">
                            Ingresa la cédula del paciente que se sienta a consulta. Si ya es usuario SUMA se guarda en su historial; si no, recibe todo su récipe por correo con invitación para registrarse en SUMA.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-5">
                      {lastAttendanceResult ? (
                        <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-4">
                          <div className="h-14 w-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                            <CheckCircle2 className="h-8 w-8" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-xl font-extrabold text-emerald-950">
                              ¡Atención de {lastAttendanceResult.patientName} Registrada!
                            </h3>
                            <p className="text-sm text-emerald-800 max-w-lg mx-auto">
                              {lastAttendanceResult.isRegisteredPatient
                                ? '✅ El paciente YA es usuario registrado de SUMA: su evaluación y récipe digital quedaron guardados directamente en su plataforma SUMA y se enviaron a su correo.'
                                : '📩 El paciente recibió en su correo electrónico el resumen completo de su participación en la jornada, su récipe digital y el botón directo para registrarse en SUMA.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                            {lastAttendanceResult.recipeUrl && (
                              <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                                <Link href={lastAttendanceResult.recipeUrl} target="_blank">
                                  <Pill className="h-4 w-4 mr-2" />
                                  Ver / Imprimir Récipe Digital (con QR)
                                </Link>
                              </Button>
                            )}
                            {lastAttendanceResult.reportUrl && (
                              <Button asChild variant="outline">
                                <Link href={lastAttendanceResult.reportUrl} target="_blank">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Ver Informe Médico
                                </Link>
                              </Button>
                            )}
                            {lastAttendanceResult.patientPhone && lastAttendanceResult.recipeUrl && (
                              <Button
                                type="button"
                                variant="outline"
                                className="border-emerald-600 text-emerald-700 hover:bg-emerald-100"
                                onClick={() => {
                                  const fullUrl = `${window.location.origin}${lastAttendanceResult.recipeUrl}`;
                                  const cleanPhone = (lastAttendanceResult.patientPhone || '').replace(/\D/g, '');
                                  const msg = `Hola ${lastAttendanceResult.patientName}, aquí tienes tu Récipe Médico Digital de la Jornada "${selectedCampaign.title}" en SUMA Salud:\n${fullUrl}`;
                                  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Enviar Récipe por WhatsApp
                              </Button>
                            )}
                          </div>

                          <div className="pt-4 border-t border-emerald-200">
                            <Button
                              onClick={resetAttendanceForm}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Atender Siguiente Paciente
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleSaveAttendance} className="space-y-5">
                          {/* Selector rápido si hay pacientes pre-anotados esperando */}
                          {selectedCampaign.registrations &&
                            selectedCampaign.registrations.filter(r => r.status === 'registered').length > 0 && (
                              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-sky-900">
                                  💡 Hay{' '}
                                  {selectedCampaign.registrations.filter(r => r.status === 'registered').length}{' '}
                                  persona(s) pre-anotadas desde el link del evento:
                                </span>
                                <Select
                                  onValueChange={regId => {
                                    const reg = selectedCampaign.registrations?.find(r => r.id === regId);
                                    if (reg) {
                                      setAttCedula(reg.cedula);
                                      setAttName(reg.name);
                                      setAttPhone(reg.phone || '');
                                      setAttEmail(reg.email || '');
                                      setAttAge(reg.age ? String(reg.age) : '');
                                      if (reg.gender === 'hombre' || reg.gender === 'mujer' || reg.gender === 'nino') {
                                        setAttDemographic(reg.gender);
                                      }
                                      if (reg.interestSpecialty) {
                                        setAttSpecialty(reg.interestSpecialty);
                                      }
                                      setPatientLookupStatus(reg.patientId ? 'registered' : 'guest');
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full sm:w-72 h-8 text-xs bg-white">
                                    <SelectValue placeholder="Cargar paciente pre-anotado..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedCampaign.registrations
                                      .filter(r => r.status === 'registered')
                                      .map(r => (
                                        <SelectItem key={r.id} value={r.id}>
                                          {r.name} ({r.cedula}) {r.interestSpecialty ? `• ${r.interestSpecialty}` : ''}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                          {/* Fila 1: Médico y Especialidad */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                              <Label className="text-xs font-bold text-slate-700">
                                Médico Tratante en la Jornada *
                              </Label>
                              {organizerRole === 'doctor' ? (
                                <Input value={`Dr(a). ${organizerName}`} disabled className="bg-white mt-1 h-9 text-xs font-semibold" />
                              ) : (
                                <Select
                                  value={attDoctorId}
                                  onValueChange={val => {
                                    setAttDoctorId(val);
                                    const docObj =
                                      selectedCampaign.doctors?.find(d => d.doctorId === val) ||
                                      allDoctors.find(d => d.id === val);
                                    if (docObj) {
                                      const sp = (docObj as any).doctorSpecialty || (docObj as any).specialty;
                                      if (sp) setAttSpecialty(sp);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="bg-white mt-1 h-9 text-xs">
                                    <SelectValue placeholder="Seleccionar médico de la jornada" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(selectedCampaign.doctors && selectedCampaign.doctors.length > 0
                                      ? selectedCampaign.doctors.map(d => ({
                                          id: d.doctorId,
                                          name: d.doctorName,
                                          specialty: d.doctorSpecialty || 'Medicina General',
                                        }))
                                      : allDoctors.map(d => ({
                                          id: d.id,
                                          name: d.name,
                                          specialty: d.specialty,
                                        }))
                                    ).map(doc => (
                                      <SelectItem key={doc.id} value={doc.id}>
                                        Dr(a). {doc.name} ({doc.specialty})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>

                            <div>
                              <Label className="text-xs font-bold text-slate-700">
                                Especialidad de esta Atención *
                              </Label>
                              <Select
                                value={attSpecialty}
                                onValueChange={val => {
                                  setAttSpecialty(val);
                                  if (
                                    selectedCampaign.campaignType === 'paid' &&
                                    selectedCampaign.pricingMode === 'per_specialist'
                                  ) {
                                    const specPrice =
                                      selectedCampaign.specialtyPrices &&
                                      selectedCampaign.specialtyPrices[val] !== undefined
                                        ? selectedCampaign.specialtyPrices[val]
                                        : selectedCampaign.priceAmount || 0;
                                    setAttAmountPaid(String(specPrice));
                                  }
                                }}
                              >
                                <SelectTrigger className="bg-white mt-1 h-9 text-xs">
                                  <SelectValue placeholder="Seleccionar especialidad" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from(
                                    new Set([
                                      ...(selectedCampaign.specialties || []),
                                      ...(defaultDoctorSpecialty ? [defaultDoctorSpecialty] : []),
                                      'Medicina General',
                                    ])
                                  ).map((spec, idx) => (
                                    <SelectItem key={idx} value={spec}>
                                      {spec}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Fila 2: Datos Primordiales del Paciente */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                1. Datos Primordiales del Paciente
                              </h4>
                              {patientLookupStatus === 'registered' && (
                                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs">
                                  ✅ Paciente Registrado en SUMA (Se guardará en su Historial y Correo)
                                </Badge>
                              )}
                              {patientLookupStatus === 'guest' && (
                                <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-xs">
                                  📨 Visitante (Recibirá su Récipe por Correo + Botón para Registrarse en SUMA)
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <Label htmlFor="att-cedula" className="text-xs font-semibold">
                                  Cédula o Código de Ticket (SUMA-TCK-...) *
                                </Label>
                                <div className="relative flex gap-1.5 mt-1">
                                  <Input
                                    id="att-cedula"
                                    value={attCedula}
                                    onChange={e => setAttCedula(e.target.value)}
                                    onBlur={() => handleAttendanceCedulaLookup()}
                                    placeholder="Ej: V-15432890 o SUMA-TCK-001"
                                    required
                                  />
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="shrink-0"
                                    title="Buscar cédula en SUMA"
                                    onClick={() => handleAttendanceCedulaLookup()}
                                  >
                                    {isLookingUpPatient ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Search className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>

                              <div className="sm:col-span-2">
                                <Label htmlFor="att-name" className="text-xs font-semibold">
                                  Nombre y Apellido del Paciente *
                                </Label>
                                <Input
                                  id="att-name"
                                  className="mt-1"
                                  value={attName}
                                  onChange={e => setAttName(e.target.value)}
                                  placeholder="Ej: Carlos Rodríguez"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              <div className="sm:col-span-2">
                                <Label htmlFor="att-email" className="text-xs font-semibold">
                                  Correo Electrónico (Recibirá Récipe e Informe) *
                                </Label>
                                <Input
                                  id="att-email"
                                  type="email"
                                  className="mt-1"
                                  value={attEmail}
                                  onChange={e => setAttEmail(e.target.value)}
                                  placeholder="paciente@correo.com"
                                  required
                                />
                              </div>

                              <div>
                                <Label htmlFor="att-phone" className="text-xs font-semibold">
                                  Teléfono / WhatsApp *
                                </Label>
                                <Input
                                  id="att-phone"
                                  className="mt-1"
                                  value={attPhone}
                                  onChange={e => setAttPhone(e.target.value)}
                                  placeholder="+58 412..."
                                  required
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label htmlFor="att-age" className="text-xs font-semibold">
                                    Edad
                                  </Label>
                                  <Input
                                    id="att-age"
                                    type="number"
                                    min="0"
                                    max="120"
                                    className="mt-1"
                                    value={attAge}
                                    onChange={e => {
                                      setAttAge(e.target.value);
                                      const n = Number(e.target.value);
                                      if (!Number.isNaN(n) && e.target.value !== '' && n < 18) {
                                        setAttDemographic('nino');
                                      }
                                    }}
                                    placeholder="Edad"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs font-semibold">Grupo *</Label>
                                  <Select
                                    value={attDemographic}
                                    onValueChange={(v: any) => setAttDemographic(v)}
                                  >
                                    <SelectTrigger className="mt-1 px-2 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="mujer">Mujer</SelectItem>
                                      <SelectItem value="hombre">Hombre</SelectItem>
                                      <SelectItem value="nino">Niño/a</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {selectedCampaign.campaignType === 'paid' && (
                              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                    <Wallet className="h-4 w-4 text-amber-600" />
                                    Cobro de Jornada Privada ({selectedCampaign.pricingMode === 'per_specialist' ? 'Por cada especialista que atiende' : 'Monto único por participar en todo el evento'})
                                  </span>
                                  {selectedCampaign.paymentDetails?.bank && (
                                    <Badge variant="outline" className="bg-white text-[11px] text-amber-900 border-amber-300">
                                      Cuenta destino ({selectedCampaign.paymentAccountSource === 'organizer' ? 'Organizador' : 'Manual'}): {selectedCampaign.paymentDetails.bank} • {selectedCampaign.paymentDetails.accountNumber}
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <Label className="text-xs font-semibold text-amber-900">Monto Abonado ($ USD)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="mt-1 bg-white h-8 text-xs font-bold"
                                      value={attAmountPaid}
                                      onChange={e => setAttAmountPaid(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-semibold text-amber-900">Método de Pago</Label>
                                    <Select value={attPaymentMethod} onValueChange={setAttPaymentMethod}>
                                      <SelectTrigger className="mt-1 bg-white h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Pago Móvil / Transferencia">Pago Móvil / Transferencia</SelectItem>
                                        <SelectItem value="Efectivo Divisas ($)">Efectivo Divisas ($)</SelectItem>
                                        <SelectItem value="Zelle">Zelle</SelectItem>
                                        <SelectItem value="Punto de Venta">Punto de Venta</SelectItem>
                                        <SelectItem value="Ya pagó al registrarse">Ya pagó al registrarse (Pase General)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs font-semibold text-amber-900">Referencia / Comprobante</Label>
                                    <Input
                                      className="mt-1 bg-white h-8 text-xs"
                                      value={attPaymentReference}
                                      onChange={e => setAttPaymentReference(e.target.value)}
                                      placeholder="Opcional: # Ref o Nota"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Fila 3: Evaluación Médica y Récipe */}
                          <div className="space-y-3 pt-2 border-t">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              2. Evaluación Clínica y Récipe de la Jornada
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="att-eval" className="text-xs font-semibold">
                                  Hallazgos / Evaluación Clínica
                                </Label>
                                <Textarea
                                  id="att-eval"
                                  rows={3}
                                  className="mt-1 text-xs"
                                  value={attEvaluation}
                                  onChange={e => setAttEvaluation(e.target.value)}
                                  placeholder="Signos vitales, motivo de consulta, hallazgos físicos..."
                                />
                              </div>

                              <div>
                                <Label htmlFor="att-diag" className="text-xs font-semibold">
                                  Diagnóstico / Impresión Diagnóstica *
                                </Label>
                                <Textarea
                                  id="att-diag"
                                  rows={3}
                                  className="mt-1 text-xs"
                                  value={attDiagnosis}
                                  onChange={e => setAttDiagnosis(e.target.value)}
                                  placeholder="Diagnóstico principal..."
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="att-rx" className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                                  <Pill className="h-3.5 w-3.5" />
                                  Récipe Médico (Medicamentos)
                                </Label>
                                <Textarea
                                  id="att-rx"
                                  rows={4}
                                  className="mt-1 text-xs border-blue-200 focus-visible:ring-blue-500"
                                  value={attPrescription}
                                  onChange={e => setAttPrescription(e.target.value)}
                                  placeholder="1. Amoxicilina 500mg - 1 cápsula cada 8 horas por 7 días..."
                                />
                              </div>

                              <div className="space-y-2">
                                <div>
                                  <Label htmlFor="att-plan" className="text-xs font-semibold">
                                    Indicaciones / Recomendaciones
                                  </Label>
                                  <Textarea
                                    id="att-plan"
                                    rows={2}
                                    className="mt-1 text-xs"
                                    value={attTreatmentPlan}
                                    onChange={e => setAttTreatmentPlan(e.target.value)}
                                    placeholder="Cuidados generales, dieta, control..."
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="att-studies" className="text-xs font-semibold">
                                    Estudios / Laboratorios Solicitados
                                  </Label>
                                  <Input
                                    id="att-studies"
                                    className="mt-1 text-xs h-8"
                                    value={attRequestedStudies}
                                    onChange={e => setAttRequestedStudies(e.target.value)}
                                    placeholder="Ej: Hematología completa, Glicemia, Eco abdominal..."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button
                              type="submit"
                              disabled={isSubmittingAttendance}
                              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6"
                            >
                              {isSubmittingAttendance ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Guardando y enviando Récipe...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Guardar Atención y Enviar Récipe al Correo
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB 2: ESTADÍSTICAS E HISTORIAL DE LA JORNADA */}
                <TabsContent value="stats" className="mt-4 space-y-6">
                  {/* KPIs principales */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <Card className="border-teal-200 bg-teal-50/50">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-extrabold text-teal-800">
                          {selectedCampaign.stats?.totalAttended || 0}
                        </p>
                        <p className="text-xs font-semibold text-teal-700">Pacientes Atendidos</p>
                      </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50/50">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-extrabold text-blue-800">
                          {selectedCampaign.stats?.totalWithPrescription || 0}
                        </p>
                        <p className="text-xs font-semibold text-blue-700">Con Récipe Generado</p>
                      </CardContent>
                    </Card>

                    <Card className="border-indigo-200 bg-indigo-50/50">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-extrabold text-indigo-800">
                          {selectedCampaign.stats?.demographics.hombres || 0}
                        </p>
                        <p className="text-xs font-semibold text-indigo-700">Hombres</p>
                      </CardContent>
                    </Card>

                    <Card className="border-pink-200 bg-pink-50/50">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-extrabold text-pink-800">
                          {selectedCampaign.stats?.demographics.mujeres || 0}
                        </p>
                        <p className="text-xs font-semibold text-pink-700">Mujeres</p>
                      </CardContent>
                    </Card>

                    <Card className="border-amber-200 bg-amber-50/50 col-span-2 sm:col-span-1">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-extrabold text-amber-800">
                          {selectedCampaign.stats?.demographics.ninos || 0}
                        </p>
                        <p className="text-xs font-semibold text-amber-700">Niños / Niñas</p>
                      </CardContent>
                    </Card>
                  </div>

                  {selectedCampaign.campaignType === 'paid' && (
                    <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50">
                      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                            <DollarSign className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                              Recaudación Registrada en esta Jornada Privada
                            </p>
                            <p className="text-xs text-slate-600">
                              Modalidad: <strong>{selectedCampaign.pricingMode === 'per_specialist' ? 'Cobro por cada especialista ($' + (selectedCampaign.priceAmount || 0) + ' base)' : 'Cobro único por participar en todo el evento ($' + (selectedCampaign.priceAmount || 0) + ')'}</strong>
                              {selectedCampaign.paymentDetails?.bank ? ` • Cuenta destino: ${selectedCampaign.paymentDetails.bank} (${selectedCampaign.paymentAccountSource === 'organizer' ? 'Cuenta del Organizador' : 'Cuenta Manual'})` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-emerald-800">
                            ${(selectedCampaign.stats?.totalRevenue || 0).toFixed(2)} USD
                          </p>
                          <p className="text-[11px] text-emerald-700 font-medium">Total acumulado en atenciones</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Médico que más atendió + Desglose por Especialidad y por Médico */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Ranking de Médicos */}
                    <Card className="border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-amber-500" />
                          Atenciones por Médico
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Ranking de especialistas con mayor número de pacientes atendidos en esta jornada.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedCampaign.stats?.topDoctor && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                            <div>
                              <p className="text-[11px] font-bold uppercase text-amber-700">
                                🏆 Médico que más atendió
                              </p>
                              <p className="font-bold text-sm text-slate-900">
                                Dr(a). {selectedCampaign.stats.topDoctor.doctorName}
                              </p>
                              <p className="text-xs text-slate-600">
                                {selectedCampaign.stats.topDoctor.specialty}
                              </p>
                            </div>
                            <Badge className="bg-amber-500 text-white font-bold text-sm px-3 py-1">
                              {selectedCampaign.stats.topDoctor.attendedCount} pacientes
                            </Badge>
                          </div>
                        )}

                        {selectedCampaign.stats?.byDoctor && selectedCampaign.stats.byDoctor.length > 0 ? (
                          <div className="space-y-2">
                            {selectedCampaign.stats.byDoctor.map((d, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border"
                              >
                                <div>
                                  <p className="font-bold text-slate-900">
                                    #{idx + 1} Dr(a). {d.doctorName}
                                  </p>
                                  <p className="text-[11px] text-slate-500">{d.specialty}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-teal-700">{d.attendedCount} atendidos</p>
                                  <p className="text-[10px] text-blue-600">{d.prescriptionCount} récipes</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 py-4 text-center">
                            Aún no se registran atenciones en esta jornada.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Atenciones por Especialidad */}
                    <Card className="border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Stethoscope className="h-5 w-5 text-teal-600" />
                          Pacientes por Especialidad
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Distribución de consultas y récipes emitidos según la especialidad médica.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedCampaign.stats?.bySpecialty &&
                        selectedCampaign.stats.bySpecialty.length > 0 ? (
                          selectedCampaign.stats.bySpecialty.map((item, idx) => {
                            const total = selectedCampaign.stats?.totalAttended || 1;
                            const pct = Math.round((item.count / total) * 100);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-800">{item.specialty}</span>
                                  <span className="text-slate-600">
                                    <strong>{item.count}</strong> pacientes ({item.withPrescription} con récipe) •{' '}
                                    {pct}%
                                  </span>
                                </div>
                                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full bg-teal-600 rounded-full"
                                    style={{ width: `${Math.max(pct, 6)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-500 py-4 text-center">
                            Sin datos por especialidad todavía.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Historial Detallado de Pacientes Atendidos en la Jornada */}
                  <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">
                            Historial de Pacientes Atendidos ({filteredAttendances.length})
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Registro completo de pacientes atendidos, diagnóstico, médico tratante y acceso a su récipe digital.
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {organizerRole === 'doctor' && (
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border">
                              <Button
                                type="button"
                                size="sm"
                                variant={attendanceDoctorFilter === 'mine' ? 'default' : 'ghost'}
                                className="h-7 text-xs px-2.5"
                                onClick={() => setAttendanceDoctorFilter('mine')}
                              >
                                Mis Consultas ({myAttendedInSelectedCampaign})
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={attendanceDoctorFilter === 'all' ? 'default' : 'ghost'}
                                className="h-7 text-xs px-2.5"
                                onClick={() => setAttendanceDoctorFilter('all')}
                              >
                                Todas en la Jornada ({selectedCampaign.attendances?.length || 0})
                              </Button>
                            </div>
                          )}
                          <div className="relative w-full sm:w-64">
                            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                            <Input
                              value={attendanceSearchTerm}
                              onChange={e => setAttendanceSearchTerm(e.target.value)}
                              placeholder="Buscar paciente, cédula o médico..."
                              className="pl-9 h-9 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {filteredAttendances.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Paciente</TableHead>
                                <TableHead className="text-xs">Grupo</TableHead>
                                <TableHead className="text-xs">Especialidad / Médico</TableHead>
                                <TableHead className="text-xs">Diagnóstico</TableHead>
                                <TableHead className="text-xs">Usuario SUMA</TableHead>
                                <TableHead className="text-xs text-right">Récipe / Informe</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredAttendances.map(att => (
                                <TableRow key={att.id}>
                                  <TableCell className="text-xs">
                                    <p className="font-bold text-slate-900">{att.patientName}</p>
                                    <p className="text-[11px] text-slate-500">
                                      Doc: {att.patientCedula} {att.patientAge ? `• ${att.patientAge} años` : ''}
                                    </p>
                                  </TableCell>
                                  <TableCell className="text-xs capitalize">
                                    <Badge variant="outline" className="text-[10px]">
                                      {att.demographicGroup === 'nino'
                                        ? 'Niño/a'
                                        : att.demographicGroup === 'hombre'
                                          ? 'Hombre'
                                          : 'Mujer'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    <p className="font-semibold text-teal-800">{att.specialty}</p>
                                    <p className="text-[11px] text-slate-500">Dr(a). {att.doctorName}</p>
                                  </TableCell>
                                  <TableCell className="text-xs max-w-[200px] truncate">
                                    {att.diagnosis || att.evaluation || '—'}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {att.isRegisteredPatient ? (
                                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                                        Registrado SUMA
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-[10px]">
                                        Visitante (Invitado)
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {att.medicalRecordId && (
                                        <>
                                          <Button asChild size="sm" variant="outline" className="h-7 text-[11px] px-2">
                                            <Link href={`/ver-recipe/${att.medicalRecordId}`} target="_blank">
                                              <Pill className="h-3 w-3 mr-1 text-teal-600" />
                                              Récipe
                                            </Link>
                                          </Button>
                                          <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] px-2">
                                            <Link href={`/ver-informe/${att.medicalRecordId}`} target="_blank">
                                              <FileText className="h-3 w-3" />
                                            </Link>
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-8 text-center">
                          No hay pacientes atendidos que coincidan con el filtro.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB 3: MÉDICOS INVITADOS / PARTICIPANTES */}
                <TabsContent value="doctors" className="mt-4">
                  <Card className="border-slate-200">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Médicos del Ecosistema SUMA en esta Jornada
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Estado de confirmación de los médicos invitados al evento.
                        </CardDescription>
                      </div>
                      {(selectedCampaign.organizerId === organizerId || organizerRole === 'admin') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(selectedCampaign)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                          Invitar Más Médicos
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {selectedCampaign.doctors && selectedCampaign.doctors.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedCampaign.doctors.map(doc => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-slate-50/60"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={doc.doctorProfileImage || undefined} />
                                  <AvatarFallback className="bg-teal-100 text-teal-800 text-xs font-bold">
                                    {doc.doctorName.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-slate-900 truncate">
                                    Dr(a). {doc.doctorName}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {doc.doctorSpecialty || 'Medicina General'}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                className={
                                  doc.status === 'accepted'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px]'
                                    : doc.status === 'declined'
                                      ? 'bg-red-100 text-red-800 border border-red-300 text-[10px]'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300 text-[10px]'
                                }
                              >
                                {doc.status === 'accepted'
                                  ? 'Confirmado ✓'
                                  : doc.status === 'declined'
                                    ? 'Rechazó'
                                    : 'Pendiente'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-6 text-center">
                          No se han añadido médicos todavía. Haz clic en "Invitar Más Médicos" para agregarlos.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB 4: PERSONAS PRE-ANOTADAS DESDE EL LINK PÚBLICO */}
                <TabsContent value="registrations" className="mt-4">
                  <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Personas Anotadas desde el Link Compartido ({selectedCampaign.registrations?.length || 0})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Pacientes que indicaron que asistirán a la jornada desde la página pública del evento. Puedes cargarlos con un clic para atenderlos.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedCampaign.registrations && selectedCampaign.registrations.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Cupo / Ticket</TableHead>
                              <TableHead className="text-xs">Nombre</TableHead>
                              <TableHead className="text-xs">Cédula</TableHead>
                              <TableHead className="text-xs">Contacto</TableHead>
                              <TableHead className="text-xs">Especialidad de Interés</TableHead>
                              <TableHead className="text-xs">Estado</TableHead>
                              <TableHead className="text-xs text-right">Acción</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedCampaign.registrations.map((reg, idx) => (
                              <TableRow key={reg.id}>
                                <TableCell className="text-xs">
                                  <Badge className="bg-teal-700 text-white font-mono text-[11px]">
                                    #{String(reg.spotNumber || idx + 1).padStart(3, '0')}
                                  </Badge>
                                  {reg.ticketCode && (
                                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                      {reg.ticketCode}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs font-bold">{reg.name}</TableCell>
                                <TableCell className="text-xs">{reg.cedula}</TableCell>
                                <TableCell className="text-xs">
                                  <p>{reg.phone || '—'}</p>
                                  <p className="text-[10px] text-slate-500">{reg.email || ''}</p>
                                </TableCell>
                                <TableCell className="text-xs">{reg.interestSpecialty || 'General'}</TableCell>
                                <TableCell className="text-xs">
                                  {reg.status === 'attended' ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                      Atendido ✓
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px]">
                                      En espera
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {reg.status !== 'attended' && (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                                      onClick={() => {
                                        setAttCedula(reg.cedula);
                                        setAttName(reg.name);
                                        setAttPhone(reg.phone || '');
                                        setAttEmail(reg.email || '');
                                        setAttAge(reg.age ? String(reg.age) : '');
                                        if (reg.gender === 'hombre' || reg.gender === 'mujer' || reg.gender === 'nino') {
                                          setAttDemographic(reg.gender);
                                        }
                                        if (reg.interestSpecialty) {
                                          setAttSpecialty(reg.interestSpecialty);
                                        }
                                        setPatientLookupStatus(reg.patientId ? 'registered' : 'guest');
                                        setDetailTab('attend');
                                      }}
                                    >
                                      Pasar a Consulta
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-xs text-slate-500 py-8 text-center">
                          Aún no hay personas pre-anotadas. ¡Comparte el link público de la jornada por WhatsApp o redes sociales!
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR / EDITAR JORNADA DE SALUD */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Editar Jornada de Salud' : 'Crear Nueva Jornada de Salud'}
            </DialogTitle>
            <DialogDescription>
              Configura los detalles del evento, sube varias fotos, elige las especialidades e invita a los médicos de SUMA que participarán.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCampaign} className="space-y-5 py-2">
            {/* Datos principales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="camp-title">Nombre de la Jornada de Salud *</Label>
                <Input
                  id="camp-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Gran Jornada de Pediatría, Cardiología y Medicina General"
                  required
                />
              </div>

              <div>
                <Label>Modalidad de la Jornada *</Label>
                <Select value={campaignType} onValueChange={(v: 'free' | 'paid') => setCampaignType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Gratuita (Sin costo)</SelectItem>
                    <SelectItem value="paid">Privada / Con aporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {campaignType === 'paid' && (
              <div className="space-y-4 rounded-2xl border-2 border-amber-300 bg-amber-50/50 p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-950">
                      Configuración de Cobro y Cuenta Destino de la Jornada
                    </h4>
                    <p className="text-xs text-amber-800">
                      Define cómo pagan los pacientes (por todo el evento o por cada especialista) y a qué cuenta llegará el dinero.
                    </p>
                  </div>
                </div>

                {/* 1. Esquema de Cobro y Precio */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-amber-200">
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-bold text-slate-800">
                      ¿Cómo se cobra a los pacientes en esta jornada? *
                    </Label>
                    <Select
                      value={pricingMode}
                      onValueChange={(v: 'per_event' | 'per_specialist') => setPricingMode(v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_event">
                          🎟️ Monto único por participar en todo el evento (Pase General)
                        </SelectItem>
                        <SelectItem value="per_specialist">
                          👨‍⚕️ Monto por cada especialista que atienda al paciente
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="camp-price-amount" className="text-xs font-bold text-slate-800">
                      {pricingMode === 'per_event'
                        ? 'Precio por Todo el Evento ($ USD) *'
                        : 'Precio por Especialista ($ USD) *'}
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">$</span>
                      <Input
                        id="camp-price-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={priceAmount}
                        onChange={e => setPriceAmount(e.target.value)}
                        placeholder="Ej: 15.00"
                        className="pl-7 font-bold"
                        required={campaignType === 'paid'}
                      />
                    </div>
                  </div>
                </div>

                {/* Precios personalizados por especialidad si es cobro por especialista */}
                {pricingMode === 'per_specialist' && selectedSpecialties.length > 0 && (
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2">
                    <Label className="text-xs font-bold text-slate-800">
                      Precios por Especialidad (Opcional: déjalo vacío para usar el precio base de ${priceAmount || '0'} USD)
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {selectedSpecialties.map(spec => (
                        <div key={spec} className="flex items-center gap-2 border rounded-lg px-2.5 py-1.5 bg-slate-50">
                          <span className="text-xs font-medium text-slate-700 truncate flex-1" title={spec}>
                            {spec}
                          </span>
                          <div className="relative w-24 shrink-0">
                            <span className="absolute left-2 top-1.5 text-xs text-slate-400">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={specialtyPrices[spec] || ''}
                              onChange={e =>
                                setSpecialtyPrices(prev => ({
                                  ...prev,
                                  [spec]: e.target.value,
                                }))
                              }
                              placeholder={priceAmount || '0.00'}
                              className="h-7 pl-5 text-xs bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="camp-price" className="text-xs font-semibold text-slate-700">
                    Nota adicional sobre el pago o beneficios incluidos (Opcional)
                  </Label>
                  <Input
                    id="camp-price"
                    value={priceInfo}
                    onChange={e => setPriceInfo(e.target.value)}
                    placeholder="Ej: Incluye evaluación, electrocardiograma y récipe digital"
                    className="mt-1 bg-white text-xs"
                  />
                </div>

                {/* 2. Cuenta Destino para Recibir el Dinero */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-teal-600" />
                        ¿A qué cuenta destino ingresará el dinero del evento? *
                      </Label>
                      <p className="text-[11px] text-slate-500">
                        Elige si usarás la cuenta registrada de tu perfil de organizador o si ingresarás otra cuenta manualmente para esta jornada.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentAccountSource('organizer')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        paymentAccountSource === 'organizer'
                          ? 'border-2 border-teal-600 bg-teal-50/70 text-teal-950 font-semibold'
                          : 'border-slate-200 hover:border-teal-300 text-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">🏦 Cuenta Registrada del Organizador</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Usar los datos bancarios / Pago Móvil guardados en mi perfil ({organizerName}).
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentAccountSource('manual')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        paymentAccountSource === 'manual'
                          ? 'border-2 border-teal-600 bg-teal-50/70 text-teal-950 font-semibold'
                          : 'border-slate-200 hover:border-teal-300 text-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">✍️ Colocar Cuenta Manualmente</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Especificar manualmente los datos bancarios o Pago Móvil exclusivos para este evento.
                      </p>
                    </button>
                  </div>

                  {paymentAccountSource === 'organizer' ? (
                    organizerAccounts.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <Label className="text-xs font-semibold">
                          Selecciona cuál de tus cuentas registradas se mostrará en la jornada:
                        </Label>
                        <Select
                          value={String(selectedOrgAccountIdx)}
                          onValueChange={v => setSelectedOrgAccountIdx(Number(v))}
                        >
                          <SelectTrigger className="bg-slate-50 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {organizerAccounts.map((acc, idx) => (
                              <SelectItem key={idx} value={String(idx)}>
                                {acc.bank} ({acc.accountType || acc.currency}) — {acc.accountNumber} • Titular: {acc.accountHolder}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                        <span>
                          No encontramos cuentas bancarias pre-registradas en tu perfil. Puedes colocar los datos de la cuenta manualmente aquí mismo:
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-7 text-xs border-amber-400"
                          onClick={() => setPaymentAccountSource('manual')}
                        >
                          Colocar Manualmente
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <Label className="text-xs">Método / Tipo de Cuenta *</Label>
                        <Select
                          value={manualPaymentDetails.accountType || 'Pago Móvil / Transferencia'}
                          onValueChange={v =>
                            setManualPaymentDetails(prev => ({ ...prev, accountType: v }))
                          }
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pago Móvil / Transferencia">Pago Móvil / Transferencia</SelectItem>
                            <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                            <SelectItem value="Transferencia Bancaria">Transferencia Bancaria</SelectItem>
                            <SelectItem value="Zelle (USD)">Zelle (USD)</SelectItem>
                            <SelectItem value="Alias / CBU">Alias / CBU</SelectItem>
                            <SelectItem value="Efectivo en Taquilla del Evento">Efectivo en Taquilla del Evento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Banco o Plataforma *</Label>
                        <Input
                          className="mt-1 h-8 text-xs"
                          value={manualPaymentDetails.bank || ''}
                          onChange={e =>
                            setManualPaymentDetails(prev => ({ ...prev, bank: e.target.value }))
                          }
                          placeholder="Ej: Banesco, Mercantil, Zelle..."
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Moneda</Label>
                        <Select
                          value={manualPaymentDetails.currency || 'VES'}
                          onValueChange={v =>
                            setManualPaymentDetails(prev => ({ ...prev, currency: v }))
                          }
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VES">Bolívares (VES / Tasa BCV)</SelectItem>
                            <SelectItem value="USD">Dólares (USD)</SelectItem>
                            <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Nombre del Titular *</Label>
                        <Input
                          className="mt-1 h-8 text-xs"
                          value={manualPaymentDetails.accountHolder || ''}
                          onChange={e =>
                            setManualPaymentDetails(prev => ({
                              ...prev,
                              accountHolder: e.target.value,
                            }))
                          }
                          placeholder="Nombre o Razón Social"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Cédula / RIF / CUIT *</Label>
                        <Input
                          className="mt-1 h-8 text-xs"
                          value={manualPaymentDetails.idNumber || ''}
                          onChange={e =>
                            setManualPaymentDetails(prev => ({
                              ...prev,
                              idNumber: e.target.value,
                            }))
                          }
                          placeholder="Ej: J-12345678-9 ó V-12345678"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">N° Cuenta / Teléfono Pago Móvil / Correo *</Label>
                        <Input
                          className="mt-1 h-8 text-xs"
                          value={manualPaymentDetails.accountNumber || ''}
                          onChange={e =>
                            setManualPaymentDetails(prev => ({
                              ...prev,
                              accountNumber: e.target.value,
                            }))
                          }
                          placeholder="0414-XXXXXXX / 0134-XXXX / correo"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="camp-desc">Descripción General del Evento</Label>
              <Textarea
                id="camp-desc"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe de qué trata la jornada, requisitos para los pacientes, beneficios incluidos..."
              />
            </div>

            {/* Fechas y Horario */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border">
              <div>
                <Label htmlFor="camp-start-date" className="text-xs">
                  Fecha Inicio *
                </Label>
                <Input
                  id="camp-start-date"
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="camp-end-date" className="text-xs">
                  Fecha Fin
                </Label>
                <Input
                  id="camp-end-date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="camp-start-time" className="text-xs">
                  Desde qué hora *
                </Label>
                <Input
                  id="camp-start-time"
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="camp-end-time" className="text-xs">
                  Hasta qué hora *
                </Label>
                <Input
                  id="camp-end-time"
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Control de Cupos / Capacidad de Personas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-sky-50/60 p-3.5 rounded-xl border border-sky-200">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold text-slate-800">
                  🎟️ Cupos y Capacidad del Evento (Tickets de Entrada) *
                </Label>
                <Select
                  value={capacityMode}
                  onValueChange={(v: 'unlimited' | 'limited') => setCapacityMode(v)}
                >
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">
                      ♾️ Cupos Ilimitados (Abierto por orden de llegada + Ticket de cupo)
                    </SelectItem>
                    <SelectItem value="limited">
                      🔢 Con Límite de Personas / Cupos (Se cierra al llegar al tope)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {capacityMode === 'limited' ? (
                <div>
                  <Label htmlFor="camp-max-cap" className="text-xs font-bold text-slate-800">
                    Cantidad Máxima de Cupos *
                  </Label>
                  <Input
                    id="camp-max-cap"
                    type="number"
                    min="1"
                    value={maxCapacity}
                    onChange={e => setMaxCapacity(e.target.value)}
                    placeholder="Ej: 100"
                    className="mt-1 bg-white font-bold"
                    required={capacityMode === 'limited'}
                  />
                </div>
              ) : (
                <div className="flex items-center text-[11px] text-sky-900 bg-white/80 rounded-lg px-3 py-2 border border-sky-100">
                  Cada paciente que confirme su asistencia recibirá su Ticket Digital numerado (#001, #002...) sin tope máximo.
                </div>
              )}
            </div>

            {/* Galería de Fotos (Subir varias imágenes) */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold">Fotos y Flyers de la Jornada (Puedes subir varias)</Label>
                  <p className="text-xs text-slate-500">
                    La primera foto será la portada principal y todas se verán en la galería pública del evento.
                  </p>
                </div>
                <Label
                  htmlFor="camp-photos-upload"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 text-xs font-bold"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Subir Fotos
                  <input
                    id="camp-photos-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                </Label>
              </div>

              {galleryImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-2">
                  {galleryImages.map((img, idx) => (
                    <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border bg-slate-100">
                      <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Portada
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-85 hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Especialidades de la Jornada */}
            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-bold">
                Especialidades que se atenderán en la Jornada ({selectedSpecialties.length})
              </Label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl border bg-slate-50">
                {availableSpecialties.map(spec => {
                  const active = selectedSpecialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => handleToggleSpecialty(spec)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? 'bg-teal-600 text-white border-teal-600 font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {spec}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customSpecialtyInput}
                  onChange={e => setCustomSpecialtyInput(e.target.value)}
                  placeholder="¿Otra especialidad o servicio específico? Escríbelo aquí..."
                  className="h-8 text-xs"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddCustomSpecialty}>
                  Añadir
                </Button>
              </div>
            </div>

            {/* Invitar Médicos del ecosistema SUMA */}
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label className="text-sm font-bold">
                  Médicos de SUMA Invitados a la Jornada ({invitedDoctorsList.length})
                </Label>
                <p className="text-xs text-slate-500">
                  Busca y añade a los médicos registrados en SUMA. Recibirán una notificación en su portal y por correo para aceptar participar.
                </p>
              </div>

              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  value={doctorSearchQuery}
                  onChange={e => setDoctorSearchQuery(e.target.value)}
                  placeholder="Buscar médico en SUMA por nombre, especialidad o ciudad..."
                  className="pl-9 text-xs"
                />
              </div>

              {filteredDoctorsForSearch.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 border">
                  {filteredDoctorsForSearch.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border text-xs"
                    >
                      <div className="truncate">
                        <p className="font-bold text-slate-900 truncate">Dr(a). {doc.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {doc.specialty} {doc.city ? `• ${doc.city}` : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0 border-teal-300 text-teal-700 hover:bg-teal-50"
                        onClick={() => handleAddDoctorToInviteList(doc)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Invitar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {invitedDoctorsList.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {invitedDoctorsList.map(doc => (
                    <Badge
                      key={doc.doctorId}
                      variant="secondary"
                      className="px-3 py-1 text-xs flex items-center gap-1.5 bg-teal-50 text-teal-900 border border-teal-200"
                    >
                      <span>
                        Dr(a). {doc.doctorName} ({doc.doctorSpecialty || 'General'})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setInvitedDoctorsList(prev => prev.filter(d => d.doctorId !== doc.doctorId))
                        }
                        className="text-slate-400 hover:text-red-600 ml-1"
                      >
                        ✕
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Ubicación Geográfica */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-bold mb-2 text-slate-800">Ubicación de la Jornada</h4>
              <LocationSelector
                country={locationData.country}
                state={locationData.state}
                city={locationData.city}
                sector={locationData.sector}
                address={locationData.address}
                onLocationChange={setLocationData}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSavingCampaign}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingCampaign} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                {isSavingCampaign && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCampaign ? 'Guardar Cambios' : 'Crear Jornada y Notificar Médicos'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

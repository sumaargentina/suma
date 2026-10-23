"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import {
  Stethoscope,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  DollarSign,
  FileBadge,
  Loader2,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDynamicData } from '@/hooks/use-dynamic-data';
import { CountryCodeSelect } from '@/components/ui/country-code-select';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';
import { ProfessionSpecialtySelector } from '@/components/ui/profession-specialty-selector';
import { DOCUMENT_TYPES, DocumentType } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { roundPrice } from '@/lib/validation-utils';

interface DoctorWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (updatedData: Record<string, any>) => void;
}

export function DoctorWelcomeModal({ isOpen, onClose, onComplete }: DoctorWelcomeModalProps) {
  const { user, updateUser } = useAuth();
  const { loading: loadingSpecialties } = useDynamicData();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [profession, setProfession] = useState('Médico');
  const [specialty, setSpecialty] = useState('');
  const [hasMedicalRecord, setHasMedicalRecord] = useState<boolean | undefined>(true);
  const [hasPrescription, setHasPrescription] = useState<boolean | undefined>(true);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [medicalLicense, setMedicalLicense] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('Cédula');
  const [dni, setDni] = useState('');
  const [countryCode, setCountryCode] = useState('+58');
  const [phone, setPhone] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(30);

  // Real-time uniqueness validation states
  const [cedulaError, setCedulaError] = useState('');
  const [isCheckingCedula, setIsCheckingCedula] = useState(false);
  const [licenseError, setLicenseError] = useState('');
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  const [locationData, setLocationData] = useState<LocationData>({
    country: 'VE',
    state: 'Monagas',
    city: 'Maturín',
    sector: '',
    address: ''
  });

  // Prepopulate if user has partial data
  useEffect(() => {
    if (user && user.role === 'doctor') {
      if (user.profession) setProfession(user.profession);
      if (user.specialty && user.specialty !== 'Pendiente') setSpecialty(user.specialty);
      if (user.medicalLicense) setMedicalLicense(user.medicalLicense);
      if (user.cedula) setDni(user.cedula);
      const userCountry = user.country || 'VE';
      if (user.documentType && user.documentType !== 'DNI') {
        setDocumentType(user.documentType as DocumentType);
      } else if (userCountry === 'VE') {
        setDocumentType('Cédula');
      } else {
        setDocumentType((user.documentType as DocumentType) || 'Cédula');
      }
      if (user.city) {
        setLocationData(prev => ({
          ...prev,
          city: user.city || 'Maturín',
          state: user.state || 'Monagas',
          sector: user.sector || '',
          address: user.address && user.address !== 'Consultorio' ? user.address : ''
        }));
      }
      if (user.phone) {
        const parts = user.phone.split(' ');
        if (parts.length > 1) {
          setCountryCode(parts[0]);
          setPhone(parts.slice(1).join(' '));
        } else {
          setPhone(user.phone);
        }
      }
    }
  }, [user]);

  // Real-time validation for Cédula/DNI
  useEffect(() => {
    const clean = dni.replace(/\D/g, '');
    if (!clean || clean.length < 5) {
      setCedulaError('');
      setIsCheckingCedula(false);
      return;
    }

    let cancelled = false;
    setIsCheckingCedula(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cedula',
            value: dni.trim(),
            excludeId: user?.id
          })
        });
        const data = await res.json();
        if (!cancelled) {
          setCedulaError(data.isUnique === false ? (data.message || 'Esta cédula ya está siendo usada.') : '');
        }
      } catch {
        // Ignore network glitch
      } finally {
        if (!cancelled) setIsCheckingCedula(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dni, user?.id]);

  // Real-time validation for Medical License
  useEffect(() => {
    const clean = medicalLicense.trim();
    if (!clean || clean.length < 3) {
      setLicenseError('');
      setIsCheckingLicense(false);
      return;
    }

    let cancelled = false;
    setIsCheckingLicense(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'doctor_medical_license',
            value: clean,
            excludeId: user?.id
          })
        });
        const data = await res.json();
        if (!cancelled) {
          setLicenseError(data.isUnique === false ? (data.message || 'Esta matrícula médica ya está registrada.') : '');
        }
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setIsCheckingLicense(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [medicalLicense, user?.id]);

  // Real-time validation for Phone
  useEffect(() => {
    const clean = phone.replace(/\D/g, '');
    if (!clean || clean.length < 7) {
      setPhoneError('');
      setIsCheckingPhone(false);
      return;
    }

    let cancelled = false;
    setIsCheckingPhone(true);
    const timer = setTimeout(async () => {
      try {
        const fullPhone = `${countryCode} ${phone.trim()}`.trim();
        const res = await fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'phone',
            value: fullPhone,
            excludeId: user?.id
          })
        });
        const data = await res.json();
        if (!cancelled) {
          setPhoneError(data.isUnique === false ? (data.message || 'Este número telefónico ya está siendo usado.') : '');
        }
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setIsCheckingPhone(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, countryCode, user?.id]);

  const activeSpecialty = specialty === 'other' ? customSpecialty.trim() : specialty;

  const handleNext = () => {
    if (currentStep === 0) {
      if (!activeSpecialty) {
        toast({
          variant: 'destructive',
          title: 'Especialidad requerida',
          description: 'Por favor selecciona o ingresa tu especialidad médica.'
        });
        return;
      }
      if (!medicalLicense.trim()) {
        toast({
          variant: 'destructive',
          title: 'Matrícula requerida',
          description: 'Ingresa tu número de matrícula o registro médico (MPPS / Colegio).'
        });
        return;
      }
      if (licenseError) {
        toast({
          variant: 'destructive',
          title: 'Matrícula duplicada',
          description: licenseError
        });
        return;
      }
      if (!dni.trim()) {
        toast({
          variant: 'destructive',
          title: 'Documento requerido',
          description: 'Ingresa tu número de documento de identidad.'
        });
        return;
      }
      if (cedulaError) {
        toast({
          variant: 'destructive',
          title: 'Cédula duplicada',
          description: cedulaError
        });
        return;
      }
    }

    if (currentStep === 1) {
      if (!phone.trim()) {
        toast({
          variant: 'destructive',
          title: 'Teléfono requerido',
          description: 'Ingresa un número de contacto para tus pacientes.'
        });
        return;
      }
      if (phoneError) {
        toast({
          variant: 'destructive',
          title: 'Teléfono duplicado',
          description: phoneError
        });
        return;
      }
      if (!locationData.city) {
        toast({
          variant: 'destructive',
          title: 'Ciudad requerida',
          description: 'Por favor selecciona la ciudad donde atiendes.'
        });
        return;
      }
      if (!locationData.address?.trim()) {
        toast({
          variant: 'destructive',
          title: 'Dirección requerida',
          description: 'Indica la dirección o nombre de tu consultorio/centro médico.'
        });
        return;
      }
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleSave = async () => {
    if (!user || user.role !== 'doctor') return;
    if (cedulaError || licenseError || phoneError) {
      toast({
        variant: 'destructive',
        title: 'Datos duplicados',
        description: cedulaError || licenseError || phoneError,
      });
      return;
    }

    setIsSaving(true);
    try {
      const fullPhone = `${countryCode} ${phone.trim()}`.trim();
      const fee = roundPrice(Number(consultationFee) || 0);
      const defaultSchedule = {
        monday: { active: true, slots: [{ start: '08:00', end: '17:00' }] },
        tuesday: { active: true, slots: [{ start: '08:00', end: '17:00' }] },
        wednesday: { active: true, slots: [{ start: '08:00', end: '17:00' }] },
        thursday: { active: true, slots: [{ start: '08:00', end: '17:00' }] },
        friday: { active: true, slots: [{ start: '08:00', end: '17:00' }] },
        saturday: { active: false, slots: [] },
        sunday: { active: false, slots: [] },
      };

      const defaultAddressEntry = {
        id: 'addr-principal',
        name: 'Consultorio Principal',
        address: locationData.address || 'Consultorio Médico',
        city: locationData.city || 'Maturín',
        sector: locationData.sector || '',
        consultationFee: fee,
        slotDuration: 30,
        schedule: defaultSchedule,
        services: [],
      };

      const updatePayload: Record<string, any> = {
        profession,
        specialty: activeSpecialty,
        hasMedicalRecord,
        hasPrescription,
        medicalLicense: medicalLicense.trim(),
        documentType,
        cedula: dni.trim(),
        phone: fullPhone,
        whatsapp: fullPhone,
        country: locationData.country || 'VE',
        state: locationData.state || 'Monagas',
        city: locationData.city || 'Maturín',
        sector: locationData.sector || '',
        address: locationData.address || 'Consultorio Médico',
        consultationFee: fee,
        schedule: defaultSchedule,
        addresses: [defaultAddressEntry],
        onboardingCompleted: true,
        verificationStatus: user?.verificationStatus === 'verified' ? 'verified' : 'pending',
      };

      // 1. Guardar en API server-side (usa supabaseAdmin para persistir en BD sin bloqueo RLS)
      const response = await fetch(`/api/doctors?id=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al actualizar el perfil médico');
      }

      // 2. Actualizar contexto de sesión y localStorage
      await updateUser({
        ...updatePayload,
      });

      toast({
        title: '¡Perfil completado con éxito!',
        description: 'Tus datos fueron guardados. Tu cuenta se encuentra pendiente de verificación por el equipo de SUMA.',
      });

      if (onComplete) {
        onComplete(updatePayload);
      }
      onClose();
    } catch (err: any) {
      console.error('Error guardando bienvenida de médico:', err);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: err.message || 'No se pudieron guardar los datos.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { title: 'Especialidad y Matrícula', icon: Stethoscope },
    { title: 'Consultorio y Contacto', icon: MapPin },
    { title: '¡Todo Listo!', icon: CheckCircle2 }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-white">
        {/* Header compacto fijo arriba */}
        <div className="shrink-0 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 px-5 py-4 text-white relative">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-teal-200" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                ¡Bienvenido a SUMA, {user?.name ? user.name.split(' ')[0] : 'Doctor'}!
              </DialogTitle>
              <DialogDescription className="text-teal-100 text-xs line-clamp-1">
                Completa tus datos profesionales para activar tu consultorio digital.
              </DialogDescription>
            </div>
          </div>

          {/* Stepper horizontal compacto */}
          <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-white/15">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.title} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                      isCompleted && "bg-emerald-400 text-teal-950 font-extrabold",
                      isCurrent && "bg-white text-teal-700 shadow-md ring-2 ring-white/30",
                      !isCompleted && !isCurrent && "bg-white/20 text-white/70"
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-xs font-medium hidden sm:inline",
                    isCurrent ? "text-white font-semibold" : "text-white/70"
                  )}>
                    {step.title}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className="w-6 md:w-10 h-0.5 bg-white/20 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contenido central con scroll controlado */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {/* PASO 1: Especialidad y Matrícula */}
          {currentStep === 0 && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-300">
              <div className="bg-teal-50/70 border border-teal-200/60 rounded-xl p-3 flex items-start gap-2.5">
                <FileBadge className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-xs text-teal-900 leading-relaxed">
                  <span className="font-semibold">Credenciales profesionales:</span> Tu especialidad y matrícula serán visibles para los pacientes y en tus récipes digitales.
                </div>
              </div>

              {/* Profesión y Especialidad en 2 Niveles + Buscador */}
              <div className="space-y-1">
                <ProfessionSpecialtySelector
                  profession={profession}
                  specialty={specialty}
                  disabled={loadingSpecialties}
                  onChange={({ profession: prof, specialty: spec, hasMedicalRecord: hmr, hasPrescription: hp }) => {
                    setProfession(prof);
                    setSpecialty(spec);
                    setHasMedicalRecord(hmr);
                    setHasPrescription(hp);
                  }}
                />
              </div>

              {/* Matrícula Médica */}
              <div className="space-y-1">
                <Label htmlFor="medicalLicense" className="text-xs font-semibold text-slate-700">
                  N° de Matrícula / Registro Médico <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="medicalLicense"
                    placeholder="Ej. MPPS 12345 / Col. Médicos 6789"
                    value={medicalLicense}
                    onChange={(e) => setMedicalLicense(e.target.value)}
                    className={cn(
                      "h-9 text-sm",
                      licenseError && "border-red-500 focus-visible:ring-red-500 bg-red-50/30"
                    )}
                  />
                  {isCheckingLicense && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-2.5" />
                  )}
                </div>
                {licenseError ? (
                  <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {licenseError}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Matrícula del Colegio de Médicos, MPPS o Registro Sanitario Nacional.
                  </p>
                )}
              </div>

              {/* Documento de Identidad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Documento</Label>
                  <Select
                    value={documentType || 'Cédula'}
                    onValueChange={(val) => setDocumentType(val as DocumentType)}
                  >
                    <SelectTrigger className="h-9 text-sm border-slate-200">
                      <SelectValue placeholder="Cédula" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="dni" className="text-xs font-semibold text-slate-700">
                    Número de Documento / Cédula <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="dni"
                      placeholder="Ej. 18234567"
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      className={cn(
                        "h-9 text-sm",
                        cedulaError && "border-red-500 focus-visible:ring-red-500 bg-red-50/30"
                      )}
                    />
                    {isCheckingCedula && (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-2.5" />
                    )}
                  </div>
                  {cedulaError && (
                    <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {cedulaError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Consultorio y Contacto */}
          {currentStep === 1 && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-300">
              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3 flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <span className="font-semibold">Ubicación de atención:</span> Tus pacientes te encontrarán en el buscador según tu ciudad y consultorio.
                </div>
              </div>

              {/* Teléfono / WhatsApp */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Teléfono / WhatsApp de Consultas <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2 relative">
                  <CountryCodeSelect
                    value={countryCode}
                    onChange={(val) => setCountryCode(val)}
                  />
                  <div className="relative flex-1">
                    <Input
                      type="tel"
                      placeholder="4121234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={cn(
                        "h-9 text-sm w-full",
                        phoneError && "border-red-500 focus-visible:ring-red-500 bg-red-50/30"
                      )}
                    />
                    {isCheckingPhone && (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-2.5" />
                    )}
                  </div>
                </div>
                {phoneError ? (
                  <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {phoneError}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Número único personal para recibir notificaciones de citas.
                  </p>
                )}
              </div>

              {/* Ubicación Geográfica */}
              <div className="pt-1">
                <LocationSelector
                  country={locationData.country}
                  state={locationData.state}
                  city={locationData.city}
                  sector={locationData.sector}
                  address={locationData.address}
                  onLocationChange={(val) => setLocationData(val)}
                  showAddressFields={true}
                />
              </div>

              {/* Precio Base de Consulta */}
              <div className="space-y-1 pt-1">
                <Label htmlFor="fee" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-teal-600" />
                  Precio Base de Consulta (USD $) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-semibold text-sm">$</span>
                  <Input
                    id="fee"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="30"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(Number(e.target.value))}
                    className="h-9 text-sm pl-7"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Puedes modificar o crear servicios adicionales con distintos precios más adelante.
                </p>
              </div>
            </div>
          )}

          {/* PASO 3: Confirmación y Resumen */}
          {currentStep === 2 && (
            <div className="space-y-4 text-center animate-in fade-in-50 duration-300 py-1">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <UserCheck className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-800">¡Tu consultorio digital está casi listo!</h3>
                <p className="text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
                  Revisa tus datos antes de guardar. Nuestro equipo administrativo verificará tu matrícula y te notificará por correo electrónico.
                </p>
              </div>

              {/* Tarjeta de Resumen */}
              <Card className="p-3.5 bg-slate-50/80 border-slate-200 text-left space-y-2.5 rounded-xl shadow-xs">
                <div className="flex items-center gap-3 border-b border-slate-200/80 pb-2.5">
                  <Avatar className="h-11 w-11 border-2 border-teal-500">
                    <AvatarImage src={user?.profileImage || undefined} />
                    <AvatarFallback className="bg-teal-700 text-white font-bold">
                      {user?.name ? user.name.charAt(0) : 'D'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{user?.name}</h4>
                    <p className="text-xs text-teal-700 font-medium">{activeSpecialty}</p>
                    <p className="text-[11px] text-slate-500">
                      {documentType}: {dni} • Matrícula: {medicalLicense}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-0.5">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Ubicación:</span>
                    <span className="font-semibold text-slate-800">{locationData.city}, {locationData.state}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Contacto:</span>
                    <span className="font-semibold text-slate-800">{countryCode} {phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-400 block">Consultorio:</span>
                    <span className="font-semibold text-slate-800">{locationData.address}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Precio de Consulta:</span>
                    <span className="font-bold text-teal-700 text-sm">${consultationFee} USD</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer fijo abajo con botones siempre visibles */}
        <div className="shrink-0 px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {currentStep > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={isSaving}
              className="gap-1.5 text-xs font-semibold h-9"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Atrás
            </Button>
          ) : (
            <div />
          )}

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              disabled={
                (currentStep === 0 && (!!cedulaError || !!licenseError || isCheckingCedula || isCheckingLicense)) ||
                (currentStep === 1 && (!!phoneError || isCheckingPhone))
              }
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs font-semibold px-5 h-9 shadow-xs"
            >
              Siguiente
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !!cedulaError || !!licenseError || !!phoneError}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold px-6 h-9 shadow-md"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activando perfil...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  ¡Comenzar a recibir citas!
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

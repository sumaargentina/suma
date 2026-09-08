"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
  Phone,
  FileBadge,
  Loader2,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDynamicData } from '@/hooks/use-dynamic-data';
import { CountryCodeSelect } from '@/components/ui/country-code-select';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';
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
}

export function DoctorWelcomeModal({ isOpen, onClose }: DoctorWelcomeModalProps) {
  const { user, updateUser } = useAuth();
  const { specialties, loading: loadingSpecialties } = useDynamicData();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [specialty, setSpecialty] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [medicalLicense, setMedicalLicense] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('Cédula');
  const [dni, setDni] = useState('');
  const [countryCode, setCountryCode] = useState('+58');
  const [phone, setPhone] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(30);

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
          address: user.address || ''
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
      if (!dni.trim()) {
        toast({
          variant: 'destructive',
          title: 'Documento requerido',
          description: 'Ingresa tu número de documento de identidad.'
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
      if (!locationData.city) {
        toast({
          variant: 'destructive',
          title: 'Ciudad requerida',
          description: 'Por favor selecciona la ciudad donde atiendes.'
        });
        return;
      }
      if (!locationData.address.trim()) {
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

    setIsSaving(true);
    try {
      const fullPhone = `${countryCode} ${phone.trim()}`.trim();
      const fee = roundPrice(Number(consultationFee) || 0);

      const updatePayload = {
        specialty: activeSpecialty,
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
        onboardingCompleted: true,
        verificationStatus: 'verified',
      };

      // 1. Guardar en API server-side
      const response = await fetch(`/api/doctors?id=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al actualizar el perfil médico');
      }

      // 2. Actualizar contexto de sesión
      updateUser({
        ...updatePayload,
      });

      toast({
        title: '¡Perfil completado con éxito!',
        description: 'Tu cuenta de especialista en SUMA está lista para recibir citas.',
      });

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
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-white">
        {/* Header con gradiente médico */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 p-6 text-white relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-teal-200" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                ¡Bienvenido a SUMA, {user?.name ? user.name.split(' ')[0] : 'Doctor'}!
              </DialogTitle>
              <DialogDescription className="text-teal-100 text-xs">
                Completa unos sencillos datos profesionales para activar tu consultorio digital.
              </DialogDescription>
            </div>
          </div>

          {/* Stepper horizontal */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/15">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.title} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      isCompleted && "bg-emerald-400 text-teal-950 font-extrabold",
                      isCurrent && "bg-white text-teal-700 shadow-md ring-4 ring-white/20",
                      !isCompleted && !isCurrent && "bg-white/20 text-white/70"
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-xs font-medium hidden sm:inline",
                    isCurrent ? "text-white font-semibold" : "text-white/70"
                  )}>
                    {step.title}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className="w-8 md:w-12 h-0.5 bg-white/20 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contenido del paso */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* PASO 1: Especialidad y Matrícula */}
          {currentStep === 0 && (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              <div className="bg-teal-50/70 border border-teal-200/60 rounded-xl p-3.5 flex items-start gap-3">
                <FileBadge className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-xs text-teal-900 leading-relaxed">
                  <span className="font-semibold">Credenciales profesionales:</span> Tu especialidad y número de matrícula serán visibles para los pacientes en la plataforma y tus récipes médicos digitales.
                </div>
              </div>

              {/* Especialidad */}
              <div className="space-y-1.5">
                <Label htmlFor="specialty" className="text-xs font-semibold text-slate-700">
                  Especialidad Médica Principal <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={specialty}
                  onValueChange={(val) => setSpecialty(val)}
                  disabled={loadingSpecialties}
                >
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder={loadingSpecialties ? "Cargando especialidades..." : "Selecciona tu especialidad"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {specialties.map((specName, specIdx) => {
                      const nameStr = typeof specName === 'string' ? specName : (specName as any)?.name || '';
                      return (
                        <SelectItem key={`${nameStr}-${specIdx}`} value={nameStr}>
                          {nameStr}
                        </SelectItem>
                      );
                    })}
                    <SelectItem value="other">Otra especialidad (especificar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {specialty === 'other' && (
                <div className="space-y-1.5 animate-in fade-in-50">
                  <Label htmlFor="customSpecialty" className="text-xs font-semibold text-slate-700">
                    Escribe tu especialidad médica <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customSpecialty"
                    placeholder="Ej. Medicina Interna, Neurología, etc."
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                    className="h-10"
                  />
                </div>
              )}

              {/* Matrícula Médica */}
              <div className="space-y-1.5">
                <Label htmlFor="medicalLicense" className="text-xs font-semibold text-slate-700">
                  N° de Matrícula / Registro Médico <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="medicalLicense"
                  placeholder="Ej. MPPS 12345 / Col. Médicos 6789"
                  value={medicalLicense}
                  onChange={(e) => setMedicalLicense(e.target.value)}
                  className="h-10"
                />
                <p className="text-[11px] text-slate-500">
                  Matrícula del Colegio de Médicos, MPPS o Registro Sanitario Nacional.
                </p>
              </div>

              {/* Documento de Identidad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Documento</Label>
                  <Select
                    value={documentType || 'Cédula'}
                    onValueChange={(val) => setDocumentType(val as DocumentType)}
                  >
                    <SelectTrigger className="h-10 border-slate-200">
                      <SelectValue placeholder="Cédula" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="dni" className="text-xs font-semibold text-slate-700">
                    Número de Documento / Cédula <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dni"
                    placeholder="Ej. 18234567"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Consultorio y Contacto */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3.5 flex items-start gap-3">
                <MapPin className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <span className="font-semibold">Ubicación de atención:</span> Tus pacientes te encontrarán en el mapa y en el buscador según tu ciudad y consultorio.
                </div>
              </div>

              {/* Teléfono / WhatsApp */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Teléfono / WhatsApp de Consultas <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <CountryCodeSelect
                    value={countryCode}
                    onChange={(val) => setCountryCode(val)}
                  />
                  <Input
                    type="tel"
                    placeholder="4121234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 flex-1"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Los pacientes podrán comunicarse contigo o recibir notificaciones de citas.
                </p>
              </div>

              {/* Ubicación Geográfica */}
              <div className="pt-2">
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
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="fee" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-teal-600" />
                  Precio Base de Consulta (USD $) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-semibold text-sm">$</span>
                  <Input
                    id="fee"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="30"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(Number(e.target.value))}
                    className="h-10 pl-7"
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
            <div className="space-y-5 text-center animate-in fade-in-50 duration-300 py-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <UserCheck className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-800">¡Tu consultorio digital está listo!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Revisa los datos principales antes de activar tu perfil para empezar a recibir citas y pacientes.
                </p>
              </div>

              {/* Tarjeta de Resumen */}
              <Card className="p-4 bg-slate-50/80 border-slate-200 text-left space-y-3 rounded-xl shadow-xs">
                <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3">
                  <Avatar className="h-12 w-12 border-2 border-teal-500">
                    <AvatarImage src={user?.profileImage || undefined} />
                    <AvatarFallback className="bg-teal-700 text-white font-bold">
                      {user?.name ? user.name.charAt(0) : 'D'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{user?.name}</h4>
                    <p className="text-xs text-teal-700 font-medium">{activeSpecialty}</p>
                    <p className="text-[11px] text-slate-500">Matrícula: {medicalLicense}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
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

        {/* Footer con botones de navegación */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {currentStep > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={isSaving}
              className="gap-1.5 text-xs font-semibold"
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
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs font-semibold px-5 shadow-xs"
            >
              Siguiente
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold px-6 shadow-md"
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

"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { useAuth } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Stethoscope, Loader2, Eye, EyeOff, MapPin, X, AlertCircle } from "lucide-react";
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/lib/settings';
import { useDynamicData } from '@/hooks/use-dynamic-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { validateEmail, validatePassword, validateName, validateSpecialty, validateCity, validateAddress } from '@/lib/validation-utils';
import { DOCUMENT_TYPES, COUNTRY_CODES, DocumentType } from '@/lib/types';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';
import { ProfessionSpecialtySelector } from '@/components/ui/profession-specialty-selector';
import { getSellers } from '@/lib/supabaseService';
import { normalizeCountryCode } from '@/lib/geo-data';

const DoctorRegistrationSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Por favor, ingresa un correo electrónico válido."),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula.")
    .regex(/[a-z]/, "Debe contener al menos una minúscula.")
    .regex(/[0-9]/, "Debe contener al menos un número."),
  confirmPassword: z.string(),
  specialty: z.string().min(1, "Debes seleccionar una especialidad."),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().min(1, "Debes seleccionar una ciudad."),
  documentType: z.enum(['Cédula', 'Pasaporte', 'DNI', 'Otro']),
  dni: z.string().min(5, "El documento debe tener al menos 5 caracteres.").max(15, "El documento no puede tener más de 15 caracteres."),
  medicalLicense: z.string().min(4, "La matrícula médica es requerida."),
  phone: z.string().min(7, "El número de teléfono es requerido."),
  address: z.string().min(3, "La dirección es requerida."),
  sector: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

export default function RegisterDoctorPage() {
  const { registerDoctor, loginWithGoogle } = useAuth();
  const { logoUrl } = useSettings();
  const { specialties, loading: dynamicLoading } = useDynamicData();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referredBySellerId, setReferredBySellerId] = useState<string | null>(null);
  const [referredBySellerName, setReferredBySellerName] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    profession: 'Médico',
    specialty: '',
    hasMedicalRecord: true as boolean | undefined,
    hasPrescription: true as boolean | undefined,
    country: 'VE',
    state: 'Monagas',
    city: 'Maturín',
    documentType: 'Cédula' as DocumentType,
    dni: '',
    medicalLicense: '',
    address: '',
    sector: '',
    countryCode: '+58',
    phone: '',
  });

  // Real-time duplicate validation states
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [dniError, setDniError] = useState('');
  const [isCheckingDni, setIsCheckingDni] = useState(false);
  const [licenseError, setLicenseError] = useState('');
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  useEffect(() => {
    const clean = formData.email.trim();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setEmailError('');
      setIsCheckingEmail(false);
      return;
    }
    let cancelled = false;
    setIsCheckingEmail(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', value: clean })
        });
        const data = await res.json();
        if (!cancelled) {
          setEmailError(data.isUnique === false ? (data.message || 'Este correo ya está siendo usado.') : '');
        }
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setIsCheckingEmail(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.email]);

  useEffect(() => {
    const clean = formData.dni.replace(/\D/g, '');
    if (!clean || clean.length < 5) {
      setDniError('');
      setIsCheckingDni(false);
      return;
    }
    let cancelled = false;
    setIsCheckingDni(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'cedula', value: formData.dni.trim() })
        });
        const data = await res.json();
        if (!cancelled) {
          setDniError(data.isUnique === false ? (data.message || 'Esta cédula ya está siendo usada.') : '');
        }
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setIsCheckingDni(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.dni]);

  useEffect(() => {
    const clean = formData.medicalLicense.trim();
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
          body: JSON.stringify({ type: 'doctor_medical_license', value: clean })
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
  }, [formData.medicalLicense]);

  useEffect(() => {
    const clean = formData.phone.replace(/\D/g, '');
    if (!clean || clean.length < 7) {
      setPhoneError('');
      setIsCheckingPhone(false);
      return;
    }
    let cancelled = false;
    setIsCheckingPhone(true);
    const timer = setTimeout(async () => {
      try {
        const fullPhone = `${formData.countryCode} ${formData.phone.trim()}`.trim();
        const res = await fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'phone', value: fullPhone })
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
  }, [formData.phone, formData.countryCode]);

  // Si viene con enlace de vendedora (?ref=CODIGO), vincular sellerId y preconfigurar País/Estado/Ciudad de la vendedora
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (!refCode) return;

    getSellers().then(sellers => {
      const matchedSeller = sellers.find(s => s.referralCode?.toLowerCase() === refCode.trim().toLowerCase());
      if (matchedSeller) {
        setReferredBySellerId(matchedSeller.id);
        setReferredBySellerName(matchedSeller.name);
        const sCountry = normalizeCountryCode(matchedSeller.country || 'VE');
        setFormData(prev => ({
          ...prev,
          country: sCountry,
          state: matchedSeller.state || prev.state,
          city: matchedSeller.city || prev.city,
          countryCode: sCountry === 'AR' ? '+54' : sCountry === 'CO' ? '+57' : '+58',
        }));
      }
    }).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Sanitizar y validar antes de zod
    const nameSan = validateName(formData.name);
    const emailSan = validateEmail(formData.email);
    const passSan = validatePassword(formData.password);
    const specialtySan = validateSpecialty(formData.specialty);
    const citySan = validateCity(formData.city);
    const addressSan = validateAddress(formData.address);
    const sectorSan = validateAddress(formData.sector); // Reusamos validación de dirección para sector por ahora

    // Debug: mostrar qué validaciones están fallando
    console.log('Validaciones:', {
      name: { isValid: nameSan.isValid, value: formData.name, sanitized: nameSan.sanitized },
      email: { isValid: emailSan.isValid, value: formData.email, sanitized: emailSan.sanitized },
      password: { isValid: passSan.isValid, value: formData.password, sanitized: passSan.sanitized },
      specialty: { isValid: specialtySan.isValid, value: formData.specialty, sanitized: specialtySan.sanitized },
      city: { isValid: citySan.isValid, value: formData.city, sanitized: citySan.sanitized },

    });

    if (!nameSan.isValid || !emailSan.isValid || !passSan.isValid || !specialtySan.isValid || !citySan.isValid) {
      const failedValidations = [];
      if (!nameSan.isValid) failedValidations.push('Nombre');
      if (!emailSan.isValid) failedValidations.push('Email');
      if (!passSan.isValid) failedValidations.push('Contraseña');
      if (!specialtySan.isValid) failedValidations.push('Especialidad');
      if (!citySan.isValid) failedValidations.push('Ciudad');
      if (!addressSan.isValid) failedValidations.push('Dirección');
      if (!sectorSan.isValid) failedValidations.push('Sector');

      toast({
        variant: 'destructive',
        title: 'Error de Registro',
        description: `Campos inválidos: ${failedValidations.join(', ')}`
      });
      setIsLoading(false);
      return;
    }

    const dataToValidate = {
      ...formData,
      name: nameSan.sanitized,
      email: emailSan.sanitized,
      password: passSan.sanitized,
      specialty: specialtySan.sanitized,
      city: citySan.sanitized,
      address: addressSan.sanitized,
      sector: sectorSan.sanitized,
      phone: `${formData.countryCode} ${formData.phone}`.trim(),
    };

    const result = DoctorRegistrationSchema.safeParse(dataToValidate);

    if (!result.success) {
      const errorMessage = result.error.errors.map(err => err.message).join(' ');
      toast({ variant: 'destructive', title: 'Error de Registro', description: errorMessage });
      setIsLoading(false);
      return;
    }

    try {
      // Validar campos únicos antes de registrar
      const uniqueValidationResponse = await fetch('/api/validate-unique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', value: result.data.email })
      });
      const emailCheck = await uniqueValidationResponse.json();

      if (!emailCheck.isUnique) {
        toast({ variant: 'destructive', title: 'Email ya registrado', description: emailCheck.message });
        setIsLoading(false);
        return;
      }

      // Validar DNI único
      const dniResponse = await fetch('/api/validate-unique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'doctor_cedula', value: result.data.dni })
      });
      const dniCheck = await dniResponse.json();

      if (!dniCheck.isUnique) {
        toast({ variant: 'destructive', title: 'DNI ya registrado', description: dniCheck.message });
        setIsLoading(false);
        return;
      }

      // Validar matrícula médica única
      const licenseResponse = await fetch('/api/validate-unique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'doctor_medical_license', value: result.data.medicalLicense })
      });
      const licenseCheck = await licenseResponse.json();

      if (!licenseCheck.isUnique) {
        toast({ variant: 'destructive', title: 'Matrícula ya registrada', description: licenseCheck.message });
        setIsLoading(false);
        return;
      }

      // Validar teléfono único
      const phoneResponse = await fetch('/api/validate-unique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'phone', value: result.data.phone })
      });
      const phoneCheck = await phoneResponse.json();

      if (!phoneCheck.isUnique) {
        setPhoneError(phoneCheck.message || 'Este número telefónico ya está siendo usado.');
        toast({ variant: 'destructive', title: 'Teléfono ya registrado', description: phoneCheck.message });
        setIsLoading(false);
        return;
      }

      await registerDoctor({
        ...result.data,
        profession: formData.profession,
        hasMedicalRecord: formData.hasMedicalRecord,
        hasPrescription: formData.hasPrescription,
        sellerId: referredBySellerId,
      });
    } catch (error) {
      console.error('Error al registrar médico:', error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado durante el registro.";
      toast({ variant: 'destructive', title: 'Error de Registro', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <Image
              src="/images/logo_suma.png"
              alt="SUMA Logo"
              width={200}
              height={80}
              className="h-16 w-auto object-contain"
              priority
              data-ai-hint="logo"
            />
          </div>
          <CardTitle className="text-2xl font-headline">
            Registro para Médicos
          </CardTitle>
          <CardDescription>
            Únete a nuestra plataforma y empieza a recibir pacientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 h-11 shadow-xs transition-all duration-200"
              onClick={async () => {
                try {
                  setIsGoogleLoading(true);
                  await loginWithGoogle('/doctor/dashboard?welcome=true', 'doctor');
                } catch (err) {
                  setIsGoogleLoading(false);
                }
              }}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Registrarme con Google</span>
            </Button>

            <div className="relative flex items-center justify-center">
              <Separator className="w-full" />
              <span className="absolute bg-card px-3 text-xs text-muted-foreground font-medium uppercase">
                O regístrate con tu correo
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" name="name" placeholder="Dr. Juan Perez" required value={formData.name} onChange={handleChange} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={cn(emailError && "border-red-500 focus-visible:ring-red-500 bg-red-50/30")}
                  />
                  {isCheckingEmail && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-3" />
                  )}
                </div>
                {emailError && (
                  <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {emailError}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">8+ caracteres, con mayúsculas, minúsculas y números.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <ProfessionSpecialtySelector
                profession={formData.profession}
                specialty={formData.specialty}
                disabled={isLoading || dynamicLoading}
                onChange={({ profession, specialty, hasMedicalRecord, hasPrescription }) =>
                  setFormData(prev => ({
                    ...prev,
                    profession,
                    specialty,
                    hasMedicalRecord,
                    hasPrescription,
                  }))
                }
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Ubicación y Dirección del Consultorio</h4>
              <LocationSelector
                country={formData.country}
                state={formData.state}
                city={formData.city}
                sector={formData.sector}
                address={formData.address}
                disabled={isLoading}
                onLocationChange={(loc) => setFormData(prev => ({
                  ...prev,
                  country: loc.country,
                  state: loc.state,
                  city: loc.city,
                  sector: loc.sector || '',
                  address: loc.address || '',
                }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dni">Cédula de Identidad</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.documentType}
                    onValueChange={(v) => handleSelectChange('documentType', v)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Input
                      id="dni"
                      name="dni"
                      placeholder="Número de Cédula"
                      required
                      value={formData.dni}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={cn(
                        "w-full",
                        dniError && "border-red-500 focus-visible:ring-red-500 bg-red-50/30"
                      )}
                      maxLength={15}
                    />
                    {isCheckingDni && (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-3" />
                    )}
                  </div>
                </div>
                {dniError && (
                  <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {dniError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicalLicense">Número de Matrícula / Colegio Médico</Label>
                <div className="relative">
                  <Input
                    id="medicalLicense"
                    name="medicalLicense"
                    placeholder="Ej: 123456"
                    required
                    value={formData.medicalLicense}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={cn(licenseError && "border-red-500 focus-visible:ring-red-500 bg-red-50/30")}
                  />
                  {isCheckingLicense && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-3" />
                  )}
                </div>
                {licenseError && (
                  <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {licenseError}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono Móvil</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.countryCode}
                  onValueChange={(v) => handleSelectChange('countryCode', v)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="País" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map(item => (
                      <SelectItem key={item.code} value={item.code}>
                        <span className="flex items-center gap-2">
                          <span>{item.flag}</span>
                          <span>{item.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="412 123 4567"
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={cn(
                      "w-full",
                      phoneError && "border-red-500 focus-visible:ring-red-500 bg-red-50/30"
                    )}
                  />
                  {isCheckingPhone && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-3" />
                  )}
                </div>
              </div>
              {phoneError && (
                <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {phoneError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !!emailError || !!dniError || !!licenseError || !!phoneError}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Cuenta de Médico
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/auth/login" className="underline">
              Inicia sesión
            </Link>
          </div>
          <Separator className="my-4" />
          <Button variant="ghost" asChild className="w-full text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la página de inicio
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

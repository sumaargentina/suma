"use client";

import { useState } from 'react';
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
import { ArrowLeft, Stethoscope, Loader2, Eye, EyeOff } from "lucide-react";
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/lib/settings';
import { useDynamicData } from '@/hooks/use-dynamic-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { validateEmail, validatePassword, validateName, validateSpecialty, validateCity, validateAddress } from '@/lib/validation-utils';
import { DOCUMENT_TYPES, COUNTRY_CODES, DocumentType } from '@/lib/types';

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
  city: z.string().min(1, "Debes seleccionar una ciudad."),
  documentType: z.enum(['DNI', 'Pasaporte', 'Otro']),
  dni: z.string().min(5, "El documento debe tener al menos 5 caracteres.").max(12, "El documento no puede tener más de 12 caracteres."),
  medicalLicense: z.string().min(4, "La matrícula médica es requerida."),
  phone: z.string().min(8, "El número de teléfono es requerido."),
  address: z.string().min(5, "La dirección es requerida."),
  sector: z.string().min(3, "El sector es requerido."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

export default function RegisterDoctorPage() {
  const { registerDoctor } = useAuth();
  const { logoUrl } = useSettings();
  const { specialties, cities, loading: dynamicLoading } = useDynamicData();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    city: '',
    documentType: 'DNI' as DocumentType,
    dni: '',
    medicalLicense: '',
    address: '',
    sector: '',
    countryCode: '+54',
    phone: ''
  });

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

      await registerDoctor(result.data);
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" name="name" placeholder="Dr. Juan Perez" required value={formData.name} onChange={handleChange} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" name="email" type="email" placeholder="m@example.com" required value={formData.email} onChange={handleChange} disabled={isLoading} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidad</Label>
                <Select name="specialty" value={formData.specialty} onValueChange={(v) => handleSelectChange('specialty', v)} disabled={dynamicLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={dynamicLoading ? "Cargando..." : "Selecciona una especialidad"} />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.length > 0 ? (
                      specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                    ) : (
                      <SelectItem value="no-specialties" disabled>
                        {dynamicLoading ? "Cargando especialidades..." : "No hay especialidades disponibles"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Select name="city" value={formData.city} onValueChange={(v) => handleSelectChange('city', v)} disabled={dynamicLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={dynamicLoading ? "Cargando..." : "Selecciona una ciudad"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.length > 0 ? (
                      cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                    ) : (
                      <SelectItem value="no-cities" disabled>
                        {dynamicLoading ? "Cargando ciudades..." : "No hay ciudades disponibles"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección del Consultorio</Label>
                <Input id="address" name="address" placeholder="Av. Corrientes 1234" required value={formData.address} onChange={handleChange} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Sector / Barrio</Label>
                <Input id="sector" name="sector" placeholder="Centro" required value={formData.sector} onChange={handleChange} disabled={isLoading} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dni">Documento de Identidad</Label>
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
                  <Input
                    id="dni"
                    name="dni"
                    placeholder="Número"
                    required
                    value={formData.dni}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="flex-1"
                    maxLength={12}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicalLicense">Número de Matrícula Médica</Label>
                <Input id="medicalLicense" name="medicalLicense" placeholder="Ej: MN 123456" required value={formData.medicalLicense} onChange={handleChange} disabled={isLoading} />
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
                <Input
                  id="phone"
                  name="phone"
                  placeholder="11 1234 5678"
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="flex-1"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
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

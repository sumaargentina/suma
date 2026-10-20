"use client";

import { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { } from "@/components/ui/textarea";
import { Save, Upload, X, HelpCircle, CheckCircle, AlertCircle, Image as ImageIcon, Loader2, Settings, MapPin, CreditCard, Stethoscope, Shield, AlertTriangle, Calendar, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { AppSettings } from '@/lib/types';
import * as supabaseService from '@/lib/supabaseService';

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface GeneralSettingsCardProps {
  logoUrl?: string;
  heroImageUrl?: string;
  currency?: string;
  timezone?: string;
  beautySpecialties?: string[];
  allSpecialties?: string[];
  billingCycleStartDay?: number;
  billingCycleEndDay?: number;
  bcvRate?: number;
  bcvLastUpdated?: string;
  onSave: (key: keyof AppSettings, value: unknown) => Promise<void>;
  onAddBeautySpecialty?: (specialty: string) => Promise<void>;
  onRemoveBeautySpecialty?: (specialty: string) => Promise<void>;
}

const CURRENCIES = [
  { code: 'ARS', name: 'Peso Argentino ($)', symbol: '$' },
  { code: 'USD', name: 'Dólar Estadounidense (US$)', symbol: 'US$' },
  { code: 'VES', name: 'Bolívar Soberano (Bs)', symbol: 'Bs' },
];

const TIMEZONES = [
  { value: 'America/Argentina/Buenos_Aires', name: 'Buenos Aires, Argentina (GMT-3)' },
  { value: 'America/Caracas', name: 'Caracas (GMT-4)' },
  { value: 'America/Santo_Domingo', name: 'Santo Domingo (GMT-4)' },
  { value: 'America/New_York', name: 'Nueva York (GMT-5/-4)' },
  { value: 'America/Mexico_City', name: 'Ciudad de México (GMT-6/-5)' },
  { value: 'America/Bogota', name: 'Bogotá (GMT-5)' },
  { value: 'America/Lima', name: 'Lima (GMT-5)' },
  { value: 'America/Santiago', name: 'Santiago (GMT-3/-4)' },
  { value: 'America/Sao_Paulo', name: 'São Paulo (GMT-3/-2)' },
  { value: 'Europe/Madrid', name: 'Madrid (GMT+1/+2)' },
];

export function GeneralSettingsCard({
  logoUrl,
  heroImageUrl,
  currency = 'USD',
  timezone = 'America/Santo_Domingo',
  beautySpecialties = [],
  allSpecialties = [],
  billingCycleStartDay = 1,
  billingCycleEndDay = 31,
  bcvRate = 65.50,
  bcvLastUpdated,
  onSave,
  onAddBeautySpecialty,
  onRemoveBeautySpecialty
}: GeneralSettingsCardProps): JSX.Element {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState(logoUrl || '');
  const [heroUrlInput, setHeroUrlInput] = useState(heroImageUrl || '');
  const [logoValidation, setLogoValidation] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [heroValidation, setHeroValidation] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  // Función para comprimir imagen
  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();

      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo proporción
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Dibujar imagen comprimida
        ctx?.drawImage(img, 0, 0, width, height);

        // Convertir a blob con calidad reducida
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Función para comprimir imagen con múltiples intentos
  const compressImageWithRetry = async (file: File, type: 'logo' | 'hero'): Promise<File> => {
    const attempts = [
      { width: type === 'logo' ? 300 : 600, quality: 0.6 },
      { width: type === 'logo' ? 200 : 400, quality: 0.5 },
      { width: type === 'logo' ? 150 : 300, quality: 0.4 },
    ];

    for (let i = 0; i < attempts.length; i++) {
      const { width, quality } = attempts[i];
      try {
        const compressedFile = await compressImage(file, width, quality);

        // Verificar que el archivo comprimido no sea demasiado grande
        if (compressedFile.size <= 500 * 1024) {
          console.log(`Compresión exitosa en intento ${i + 1}:`, {
            width,
            quality,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            reduction: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
          });
          return compressedFile;
        }
      } catch (error) {
        console.warn(`Intento ${i + 1} falló:`, error);
      }
    }

    throw new Error('No se pudo comprimir la imagen lo suficiente. Intenta con una imagen más pequeña.');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'hero') => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se seleccionó ningún archivo.' });
      return;
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Error', description: `Por favor selecciona un archivo de imagen válido. Tipo actual: ${file.type}` });
      return;
    }

    setIsUploading(true);
    try {
      console.log('Iniciando subida de imagen:', { type, fileName: file.name, fileSize: file.size });

      if (type === 'hero') {
        // Para imagen hero: usar alta calidad (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          toast({ variant: 'destructive', title: 'Error', description: `La imagen hero no puede ser mayor a 10MB. Tamaño actual: ${sizeMB}MB` });
          return;
        }

        console.log('🎨 Subiendo imagen hero con alta calidad...');
        // Usar función uploadImage directamente con path y maxSizeMB
        const path = `main-page/hero-${Date.now()}.${file.name.split('.').pop()}`;
        const imageUrl = await supabaseService.uploadImage(file, path, 10);

        await onSave('heroImageUrl', imageUrl);
        setHeroUrlInput(imageUrl);
        setHeroValidation('valid');

        toast({
          title: 'Imagen Hero Guardada',
          description: 'La imagen principal ha sido guardada exitosamente.'
        });
      } else {
        // Para logo: mantener la compresión original (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          toast({ variant: 'destructive', title: 'Error', description: `La imagen del logo no puede ser mayor a 5MB. Tamaño actual: ${sizeMB}MB` });
          return;
        }

        // Comprimir imagen antes de convertir a base64 (como estaba antes)
        const compressedFile = await compressImageWithRetry(file, type);
        console.log('Imagen comprimida:', {
          originalSize: file.size,
          compressedSize: compressedFile.size,
          reduction: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
        });

        // Verificar que el archivo comprimido no sea demasiado grande (máximo 500KB para base64)
        if (compressedFile.size > 500 * 1024) {
          throw new Error('La imagen es demasiado grande. Intenta con una imagen más pequeña o de menor resolución.');
        }

        // Convertir imagen comprimida a base64
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target?.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(compressedFile);
        });

        // Verificar que el base64 no exceda el límite de Firestore (1MB)
        if (base64Image.length > 1000000) {
          throw new Error('La imagen es demasiado grande incluso después de la compresión. Intenta con una imagen más pequeña.');
        }

        console.log('Imagen convertida a base64 exitosamente');

        await onSave('logoUrl', base64Image);
        setLogoUrlInput(base64Image);
        setLogoValidation('valid');

        toast({ title: 'Logo Subido', description: 'El logo ha sido comprimido y actualizado exitosamente.' });
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      const errorMessage = 'No se pudo procesar la imagen. Intenta de nuevo.';

      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
      setIsUploading(false);
      // Limpiar el input de archivo
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const validateImageUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      return contentType?.startsWith('image/') || false;
    } catch {
      return false;
    }
  };

  const handleLogoUrlChange = async (url: string) => {
    setLogoUrlInput(url);
    if (!url.trim()) {
      setLogoValidation('idle');
      return;
    }

    setLogoValidation('validating');
    const isValid = await validateImageUrl(url);
    setLogoValidation(isValid ? 'valid' : 'invalid');
  };

  const handleHeroUrlChange = async (url: string) => {
    setHeroUrlInput(url);
    if (!url.trim()) {
      setHeroValidation('idle');
      return;
    }

    setHeroValidation('validating');
    const isValid = await validateImageUrl(url);
    setHeroValidation(isValid ? 'valid' : 'invalid');
  };

  const handleSaveGeneral = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData(e.currentTarget);

      const rawBcv = formData.get('bcvRate');
      const bcvVal = rawBcv ? Number(rawBcv) : undefined;

      const updates: Record<string, unknown> = {
        logoUrl: logoUrlInput,
        heroImageUrl: heroUrlInput,
        currency: formData.get('currency') as string,
        timezone: formData.get('timezone') as string,
        billingCycleStartDay: Number(formData.get('billingCycleStartDay')),
        billingCycleEndDay: Number(formData.get('billingCycleEndDay')),
      };

      if (bcvVal && bcvVal > 0) {
        updates.bcvRate = bcvVal;
        updates.bcvLastUpdated = new Date().toISOString();
        updates.exchangeRates = { VES: bcvVal, USD: 1.0 };
      }

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null) {
          await onSave(key as keyof AppSettings, value);
        }
      }

      toast({ title: 'Configuración Guardada', description: 'Los ajustes generales han sido actualizados.' });
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la configuración.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBeautySpecialty = async (specialty: string) => {
    if (!onAddBeautySpecialty) return;

    try {
      await onAddBeautySpecialty(specialty);
      toast({ title: 'Especialidad Añadida', description: `La especialidad "${specialty}" ha sido añadida.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo añadir la especialidad.' });
    }
  };

  const handleRemoveBeautySpecialty = async (specialty: string) => {
    if (!onRemoveBeautySpecialty) return;

    try {
      await onRemoveBeautySpecialty(specialty);
      toast({ title: 'Especialidad Eliminada', description: `La especialidad "${specialty}" ha sido eliminada.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la especialidad.' });
    }
  };

  const getValidationIcon = (status: 'idle' | 'validating' | 'valid' | 'invalid') => {
    switch (status) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="border-primary/10">
      <form onSubmit={handleSaveGeneral}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-6 w-6 text-primary" />
            Configuración General
          </CardTitle>
          <CardDescription className="text-base">
            Ajustes globales de la plataforma, incluyendo apariencia, moneda, zona horaria y ciclo de facturación.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Imágenes - Mejorado para móvil */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Imágenes de la Plataforma</h3>
            </div>

            <Alert className="border-blue-200 bg-blue-50/30">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Configuración de Imágenes:</strong> El logo se comprime para optimizar almacenamiento (máx. 5MB). La imagen principal (hero) mantiene alta calidad (máx. 10MB). Formatos: JPG, PNG, GIF, WebP.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-6">
              {/* Logo */}
              <div className="space-y-4 p-4 bg-secondary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="logoUrl" className="text-base font-medium">Logo de la Plataforma</Label>
                  {getValidationIcon(logoValidation)}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="logoUrl"
                      name="logoUrl"
                      value={logoUrlInput}
                      onChange={(e) => handleLogoUrlChange(e.target.value)}
                      placeholder="URL de la imagen o sube un archivo"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoFileInputRef.current?.click()}
                      disabled={isUploading}
                      className="shrink-0"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Subir
                        </>
                      )}
                    </Button>
                  </div>

                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'logo')}
                  />

                  {logoUrl && (
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                      <Image src={logoUrl} alt="Logo actual" width={64} height={32} className="h-8 w-auto" unoptimized />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Logo actual</p>
                        <p className="text-xs text-muted-foreground">Vista previa</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hero Image */}
              <div className="space-y-4 p-4 bg-secondary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="heroImageUrl" className="text-base font-medium">Imagen Principal (Hero)</Label>
                  {getValidationIcon(heroValidation)}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="heroImageUrl"
                      name="heroImageUrl"
                      value={heroUrlInput}
                      onChange={(e) => handleHeroUrlChange(e.target.value)}
                      placeholder="URL de la imagen o sube un archivo"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => heroFileInputRef.current?.click()}
                      disabled={isUploading}
                      className="shrink-0"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Subir
                        </>
                      )}
                    </Button>
                  </div>

                  <input
                    ref={heroFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'hero')}
                  />

                  {heroImageUrl && (
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                      <Image src={heroImageUrl} alt="Imagen principal actual" width={192} height={48} className="h-12 w-auto rounded" unoptimized />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Imagen principal actual</p>
                        <p className="text-xs text-muted-foreground">Vista previa</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuración Regional - Mejorado para móvil */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Configuración Regional
            </h3>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <Label htmlFor="currency" className="text-base font-medium">Moneda de la Plataforma</Label>
                <Select name="currency" defaultValue={currency}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecciona una moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{currency.symbol}</span>
                          <span>{currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="timezone" className="text-base font-medium">Zona Horaria</Label>
                <Select name="timezone" defaultValue={timezone}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecciona una zona horaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 p-4 bg-teal-50/50 border border-teal-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <Label htmlFor="bcvRate" className="text-base font-semibold text-teal-950 flex items-center gap-2">
                    🇻🇪 Tasa Oficial de Cambio (Bs. por $1 USD)
                  </Label>
                  {bcvLastUpdated && (
                    <span className="text-[11px] text-teal-700">
                      Última actualización: {new Date(bcvLastUpdated).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Input
                  id="bcvRate"
                  name="bcvRate"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={bcvRate}
                  className="h-12 text-lg font-mono font-bold bg-white"
                  required
                />
                <p className="text-xs text-teal-800">
                  Esta tasa se utiliza para calcular automáticamente el monto en Bolívares (Bs.) que pagarán los pacientes cuando elijan métodos de pago locales (Pago Móvil o Transferencia). <strong>Las citas ya pagadas no se modificarán al cambiar esta tasa</strong> (histórico contable y financiero protegido).
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ciclo de Facturación - Mejorado para móvil */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Ciclo de Facturación
            </h3>
            <p className="text-sm text-muted-foreground">
              Define los días del mes en que se procesan los pagos de suscripción de los médicos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="billingCycleStartDay" className="text-base font-medium">Día de Inicio del Ciclo</Label>
                <Select name="billingCycleStartDay" defaultValue={billingCycleStartDay.toString()}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecciona el día" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="billingCycleEndDay" className="text-base font-medium">Día de Fin del Ciclo</Label>
                <Select name="billingCycleEndDay" defaultValue={billingCycleEndDay.toString()}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecciona el día" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Especialidades de Belleza - Mejorado para móvil */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Especialidades de Belleza
            </h3>
            <p className="text-sm text-muted-foreground">
              Selecciona las especialidades médicas que aparecerán como &quot;Especialidades de Belleza&quot; en la búsqueda de médicos.
            </p>

            <div className="space-y-4">
              {/* Especialidades disponibles para seleccionar */}
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Especialidades Disponibles ({allSpecialties.length})
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {allSpecialties.map((specialty) => {
                    const isSelected = beautySpecialties.includes(specialty);
                    return (
                      <div
                        key={specialty}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                          isSelected
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-secondary/50 border-border hover:bg-secondary"
                        )}
                        onClick={() => {
                          if (isSelected) {
                            handleRemoveBeautySpecialty(specialty);
                          } else {
                            handleAddBeautySpecialty(specialty);
                          }
                        }}
                      >
                        <span className="text-sm font-medium truncate">{specialty}</span>
                        <div className="flex items-center gap-2 ml-2">
                          {isSelected ? (
                            <Badge variant="default" className="text-xs shrink-0">
                              Seleccionada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs shrink-0">
                              Disponible
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {allSpecialties.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Stethoscope className="h-8 w-8 mx-auto mb-2" />
                    <p>No hay especialidades médicas disponibles</p>
                    <p className="text-sm">Primero crea especialidades en la pestaña &quot;Especialidades&quot;</p>
                  </div>
                )}
              </div>

              {/* Especialidades seleccionadas */}
              {beautySpecialties.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Especialidades de Belleza Seleccionadas ({beautySpecialties.length})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {beautySpecialties.map((specialty, index) => (
                      <Badge key={index} variant="default" className="flex items-center gap-1 px-3 py-1">
                        <span className="truncate max-w-32">{specialty}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBeautySpecialty(specialty)}
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground ml-1 shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gestión de Suscripciones - Mejorado para móvil */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Gestión de Suscripciones</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Verificar Suscripciones Vencidas
                  </CardTitle>
                  <CardDescription className="text-amber-700 text-xs">
                    Marca como inactivos a los médicos con pagos vencidos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => { }}
                    disabled={false}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
                  >
                    <Shield className="mr-2 h-3 w-3" />
                    Verificar Ahora
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-800 text-sm">
                    <Calendar className="h-4 w-4" />
                    Actualizar Fechas de Pago
                  </CardTitle>
                  <CardDescription className="text-blue-700 text-xs">
                    Actualiza las fechas de próximo pago para médicos activos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => { }}
                    disabled={false}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    <Calendar className="mr-2 h-3 w-3" />
                    Actualizar Fechas
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">💡 Información sobre el ciclo de facturación:</p>
              <ul className="space-y-1">
                <li>• Los médicos deben pagar su suscripción antes de la fecha de vencimiento</li>
                <li>• Si no pagan, se marcan automáticamente como inactivos</li>
                <li>• Los médicos inactivos no aparecen en la búsqueda de pacientes</li>
                <li>• Al aprobar un pago, el médico vuelve a estar activo por un mes</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Migración de Contraseñas - Nueva sección */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Seguridad de Contraseñas</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-purple-800 text-sm">
                    <Lock className="h-4 w-4" />
                    Migración de Contraseñas
                  </CardTitle>
                  <CardDescription className="text-purple-700 text-xs">
                    Encripta contraseñas existentes en texto plano
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => window.open('/admin/password-migration', '_blank')}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
                  >
                    <Lock className="mr-2 h-3 w-3" />
                    Ir a Migración
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-800 text-sm">
                    <Shield className="h-4 w-4" />
                    Estado de Seguridad
                  </CardTitle>
                  <CardDescription className="text-green-700 text-xs">
                    Verifica el estado de encriptación
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => window.open('/admin/password-migration', '_blank')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  >
                    <Shield className="mr-2 h-3 w-3" />
                    Verificar Estado
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">🔒 Información sobre seguridad de contraseñas:</p>
              <ul className="space-y-1">
                <li>• Las contraseñas se encriptan usando bcrypt con factor de costo 10</li>
                <li>• Cada contraseña tiene un salt único para mayor seguridad</li>
                <li>• La migración es irreversible pero segura</li>
                <li>• Se recomienda ejecutar la migración una sola vez</li>
              </ul>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Los cambios se guardan automáticamente al hacer clic en &quot;Guardar Cambios&quot;
          </div>
          <Button type="submit" disabled={isSaving || isUploading} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

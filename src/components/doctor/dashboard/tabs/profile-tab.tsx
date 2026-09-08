
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import * as supabaseService from '@/lib/supabaseService';
import type { Doctor } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import { DOCUMENT_TYPES, COUNTRY_CODES, DocumentType } from '@/lib/types';
import { uploadPublicImage } from '@/lib/supabaseService';
import { CountryCodeSelect } from '@/components/ui/country-code-select';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';
import { resolveLocation } from '@/lib/geo-data';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { DigitalSignaturePad } from '@/components/doctor/digital-signature-pad';
import { ImageCropModal } from '@/components/ui/image-crop-modal';

const DoctorProfileSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  cedula: z.string().min(1, "El documento es requerido.").max(20, "El documento es muy largo."),
  documentType: z.enum(['Cédula', 'Pasaporte', 'DNI', 'Otro']).optional(),
  medicalLicense: z.string().min(4, "La matrícula médica debe tener al menos 4 caracteres."),
  whatsapp: z.string().max(20, "El número es muy largo.").optional(),
  city: z.string().optional(),
  address: z.string().min(3, "La dirección debe tener al menos 3 caracteres."),
  sector: z.string().optional(),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
});

interface ProfileTabProps {
  doctorData: Doctor;
  onProfileUpdate: () => void;
  // onPasswordChange eliminado porque no se usa
  onOpenPasswordDialog: () => void;
}

export function ProfileTab({ doctorData, onProfileUpdate, onOpenPasswordDialog }: ProfileTabProps) {
  const { toast } = useToast();
  const { loginWithGoogle } = useAuth();
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [cropModal, setCropModal] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
    type: 'profile' | 'banner';
    title: string;
    description: string;
    cropShape: 'round' | 'rect';
    aspectRatio: number;
    fileName: string;
  }>({
    isOpen: false,
    imageSrc: null,
    type: 'profile',
    title: 'Ajustar Foto',
    description: '',
    cropShape: 'round',
    aspectRatio: 1,
    fileName: 'doctor-image',
  });
  const isClinicEmployee = doctorData.isClinicEmployee;

  const [documentType, setDocumentType] = useState<DocumentType>(doctorData.documentType || 'Cédula');
  
  const initialLoc = resolveLocation(doctorData.country || 'VE', doctorData.state, doctorData.city);
  const [locationData, setLocationData] = useState<LocationData>({
    country: initialLoc.country,
    state: initialLoc.state,
    city: initialLoc.city,
    sector: doctorData.sector || '',
    address: doctorData.address || '',
    lat: doctorData.lat || initialLoc.lat,
    lng: doctorData.lng || initialLoc.lng,
  });

  // Logic for phone parsing - ordenar códigos por longitud descendente para evitar conflictos
  const getInitialPhoneData = (fullPhone: string | undefined | null): { code: string; number: string } => {
    if (!fullPhone) return { code: '+58', number: '' };

    if (fullPhone.startsWith('+')) {
      // Ordenar códigos por longitud descendente para evitar que +5 coincida antes que +58
      const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

      for (const c of sortedCodes) {
        if (fullPhone.startsWith(c.code)) {
          // Limpiar espacios y caracteres no numéricos del número
          const numberPart = fullPhone.slice(c.code.length).replace(/\D/g, '');
          return { code: c.code, number: numberPart };
        }
      }

      // Fallback: tomar los primeros caracteres como código
      const possibleCode = fullPhone.substring(0, 3);
      if (possibleCode.match(/^\+\d{1,2}$/)) {
        return { code: possibleCode, number: fullPhone.slice(3).replace(/\D/g, '') };
      }
    }

    // Si no comienza con +, es solo el número
    return { code: '+58', number: fullPhone.replace(/\D/g, '') };
  };

  const initialPhone = getInitialPhoneData(doctorData.whatsapp);
  const [countryCode, setCountryCode] = useState(initialPhone.code);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone.number);

  useEffect(() => {
    if (doctorData) {
      const loc = resolveLocation(doctorData.country || 'VE', doctorData.state, doctorData.city);
      setLocationData({
        country: loc.country,
        state: loc.state,
        city: loc.city,
        sector: doctorData.sector || '',
        address: doctorData.address || '',
        lat: doctorData.lat || loc.lat,
        lng: doctorData.lng || loc.lng,
      });
    }
  }, [doctorData]);



  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!doctorData) return;

    try {
      const formData = new FormData(e.currentTarget);
      const dataToValidate = {
        name: formData.get('name') as string,
        cedula: doctorData.cedula || (formData.get('cedula') as string),
        documentType: doctorData.documentType || documentType,
        medicalLicense: formData.get('medicalLicense') as string,
        whatsapp: phoneNumber ? `${countryCode}${phoneNumber}` : '',
        city: locationData.city || doctorData.city || '',
        address: locationData.address || '',
        sector: locationData.sector || '',
        description: formData.get('description') as string,
      };

      const result = DoctorProfileSchema.safeParse(dataToValidate);
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Error de Validación',
          description: result.error.errors[0]?.message || 'Por favor revisa los campos requeridos.'
        });
        return;
      }

      let profileImageUrl = doctorData.profileImage;
      let bannerImageUrl = doctorData.bannerImage;

      if (profileImageFile) {
        profileImageUrl = await uploadPublicImage(profileImageFile, 'images', `doctors/${doctorData.id}/profile`);
      }

      if (bannerImageFile) {
        bannerImageUrl = await uploadPublicImage(bannerImageFile, 'images', `doctors/${doctorData.id}/banner`);
      }

      await supabaseService.updateDoctor(doctorData.id, {
        name: result.data.name,
        // Cédula y DocumentType preservados por seguridad
        cedula: doctorData.cedula || result.data.cedula,
        documentType: doctorData.documentType || result.data.documentType,
        medicalLicense: result.data.medicalLicense,
        whatsapp: result.data.whatsapp,
        country: locationData.country,
        state: locationData.state,
        city: locationData.city,
        address: locationData.address,
        sector: locationData.sector,
        lat: locationData.lat || doctorData.lat,
        lng: locationData.lng || doctorData.lng,
        description: result.data.description,
        profileImage: profileImageUrl,
        bannerImage: bannerImageUrl
      });
      toast({ title: 'Perfil Actualizado con éxito' });
      onProfileUpdate();
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      // Si el error es por tamaño del documento, intentar limpiar datos
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : '';
      const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: string }).code : '';
      if ((typeof message === 'string' && message.includes('size')) || code === 'resource-exhausted') {
        toast({
          variant: 'destructive',
          title: 'Error de Tamaño',
          description: 'El documento es muy grande. Se intentará limpiar datos antiguos automáticamente.'
        });

        try {
          await supabaseService.cleanupDoctorData(doctorData.id);
          toast({ title: 'Datos Limpiados', description: 'Se han limpiado datos antiguos. Intenta guardar nuevamente.' });
          onProfileUpdate(); // Refrescar datos
        } catch {
          toast({
            variant: 'destructive',
            title: 'Error Crítico',
            description: 'No se pudo limpiar el documento. Contacta al administrador.'
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo actualizar el perfil. Intenta nuevamente.'
        });
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-2xl">Perfil Profesional</CardTitle>
          <CardDescription className="text-xs md:text-base">Esta información será visible para los pacientes.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveProfile}>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1 md:space-y-2"><Label htmlFor="name" className="text-xs md:text-sm">Nombre Completo</Label><Input id="name" name="name" defaultValue={doctorData.name} className="h-9 md:h-10 text-xs md:text-sm" readOnly={isClinicEmployee} /></div>
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="cedula" className="text-xs md:text-sm">Cédula de Identidad</Label>
                <div className="flex gap-2">
                  <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)} disabled={!!doctorData.cedula || isClinicEmployee}>
                    <SelectTrigger className="w-[110px] h-9 md:h-10 text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    id="cedula"
                    name="cedula"
                    defaultValue={doctorData.cedula}
                    className="h-9 md:h-10 text-xs md:text-sm flex-1 bg-slate-50 dark:bg-slate-900 cursor-not-allowed"
                    disabled={!!doctorData.cedula}
                    readOnly={!!doctorData.cedula || isClinicEmployee}
                    maxLength={15}
                  />
                </div>
                {doctorData.cedula && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    🔒 La Cédula no puede ser modificada por seguridad. Para correcciones, contacta a soporte.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="medicalLicense" className="text-xs md:text-sm">Número de Matrícula / Colegio Médico</Label>
              <Input
                id="medicalLicense"
                name="medicalLicense"
                defaultValue={doctorData.medicalLicense || ''}
                placeholder="Ej: 123456"
                className="h-9 md:h-10 text-xs md:text-sm"
                readOnly={isClinicEmployee}
              />
              <p className="text-xs text-muted-foreground">Este número será verificado por el administrador</p>
            </div>
            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="whatsapp" className="text-xs md:text-sm">Nro. WhatsApp</Label>
              <div className="flex gap-2">
                <CountryCodeSelect
                  value={countryCode}
                  onChange={setCountryCode}
                  className="w-[120px] h-9 md:h-10"
                />
                <Input
                  id="whatsapp"
                  name="whatsapp-number"
                  value={phoneNumber}
                  onChange={(e) => {
                    // Solo números, sin ceros iniciales
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.startsWith('0')) val = val.slice(1);
                    setPhoneNumber(val);
                  }}
                  placeholder="123456789"
                  className="h-9 md:h-10 text-xs md:text-sm flex-1"
                  maxLength={15}
                />
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="text-xs md:text-sm font-semibold mb-3">Ubicación y Sede Principal</h4>
              <LocationSelector
                country={locationData.country}
                state={locationData.state}
                city={locationData.city}
                sector={locationData.sector}
                address={locationData.address}
                onLocationChange={setLocationData}
              />
            </div>

            {/* Firma Digital para Récipes */}
            <div className="border-t pt-4">
              <h4 className="text-xs md:text-sm font-semibold mb-1">Firma Digital y Sello Oficial</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Tu firma se estampará de forma automática en los récipes médicos e informes de consulta que emitas a tus pacientes.
              </p>
              <DigitalSignaturePad
                initialSignature={doctorData.signature_url}
                onSaveSignature={async (sigUrl) => {
                  await supabaseService.updateDoctor(doctorData.id, {
                    signature_url: sigUrl
                  });
                  doctorData.signature_url = sigUrl;
                  onProfileUpdate();
                }}
                onDeleteSignature={async () => {
                  await supabaseService.updateDoctor(doctorData.id, {
                    signature_url: undefined
                  });
                  doctorData.signature_url = undefined;
                  onProfileUpdate();
                }}
              />
            </div>

            <div className="space-y-1 md:space-y-2"><Label htmlFor="description" className="text-xs md:text-sm">Descripción Profesional</Label><Textarea id="description" name="description" defaultValue={doctorData.description} rows={4} className="text-xs md:text-sm" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs md:text-sm">Foto de Perfil</Label>
                <Image
                  src={profileImageFile ? URL.createObjectURL(profileImageFile) : (doctorData.profileImage || 'https://placehold.co/400x400.png')}
                  alt="Perfil"
                  width={80}
                  height={80}
                  className="rounded-full border w-20 h-20 md:w-[100px] md:h-[100px] object-cover"
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCropModal({
                        isOpen: true,
                        imageSrc: reader.result as string,
                        type: 'profile',
                        title: 'Ajustar Foto de Perfil del Médico',
                        description: 'Arrastra para encuadrar tu rostro y ajusta el zoom.',
                        cropShape: 'round',
                        aspectRatio: 1,
                        fileName: `${doctorData.name || 'doctor'}-perfil`,
                      });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                  className="text-xs md:text-sm"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs md:text-sm">Imagen de Portada / Banner</Label>
                <Image
                  src={bannerImageFile ? URL.createObjectURL(bannerImageFile) : (doctorData.bannerImage || 'https://placehold.co/1200x400.png')}
                  alt="Banner"
                  width={200}
                  height={60}
                  className="rounded-md border aspect-video object-cover w-full max-w-xs md:max-w-full"
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCropModal({
                        isOpen: true,
                        imageSrc: reader.result as string,
                        type: 'banner',
                        title: 'Ajustar Banner de Portada del Médico',
                        description: 'Arrastra y encuadra la zona visible del banner panorámico.',
                        cropShape: 'rect',
                        aspectRatio: 3 / 1,
                        fileName: `${doctorData.name || 'doctor'}-banner`,
                      });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                  className="text-xs md:text-sm"
                />
              </div>
            </div>

          </CardContent>
          <CardFooter><Button type="submit" className="w-full md:w-auto">Guardar Perfil</Button></CardFooter>
        </form>
      </Card>
      {!isClinicEmployee && (
        <>
          {/* Seguridad y Acceso */}
          {doctorData.password === 'OAUTH_GOOGLE_USER' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-xl">
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
                  Seguridad y Acceso con Google
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Tu cuenta está autenticada y protegida directamente con tu cuenta de Google ({doctorData.email}).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-800 text-xs sm:text-sm">
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold shrink-0">
                    🟢 Google Activo
                  </Badge>
                  <span>Tu sesión se gestiona con Google OAuth. No necesitas recordar contraseñas tradicionales.</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Sincronización con Google */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-xl">
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
                    Acceso con Cuenta de Google
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Puedes vincular tu cuenta de Google para iniciar sesión rápidamente ({doctorData.email}).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-slate-50">
                    <div className="flex items-center gap-2.5">
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                        ⚪ No vinculado
                      </Badge>
                      <span className="text-xs text-slate-600 font-mono">{doctorData.email}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => loginWithGoogle('/doctor/dashboard?view=profile')}
                    >
                      Vincular con Google
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Seguridad: Cambiar contraseña */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-2xl">Seguridad</CardTitle>
                  <CardDescription className="text-xs md:text-base">Cambia tu contraseña de acceso.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={onOpenPasswordDialog} className="w-full md:w-auto">Cambiar Contraseña</Button>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      <ImageCropModal
        isOpen={cropModal.isOpen}
        onClose={() => setCropModal((prev) => ({ ...prev, isOpen: false }))}
        imageSrc={cropModal.imageSrc}
        cropShape={cropModal.cropShape}
        aspectRatio={cropModal.aspectRatio}
        title={cropModal.title}
        description={cropModal.description}
        originalFileName={cropModal.fileName}
        onCropComplete={({ file }) => {
          if (cropModal.type === 'profile') {
            setProfileImageFile(file);
            toast({
              title: 'Foto de perfil lista ⚡',
              description: 'Encuadre aplicado y optimizado a WebP. Haz clic en "Guardar Perfil".',
            });
          } else {
            setBannerImageFile(file);
            toast({
              title: 'Banner de portada listo ⚡',
              description: 'Encuadre aplicado y optimizado a WebP. Haz clic en "Guardar Perfil".',
            });
          }
          setCropModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}

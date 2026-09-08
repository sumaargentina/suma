
"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import * as supabaseService from '@/lib/supabaseService';
import { supabase } from '@/lib/supabase';
import { HeaderWrapper, BottomNav } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, Save, Lock, Camera, Upload, X } from 'lucide-react';
import { z } from 'zod';
import { useSettings } from '@/lib/settings';
import Image from 'next/image';
import { NotificationSettings } from '@/components/notification-settings';
import { validateName, validatePhone, validateCedula, validateCity, validateAge } from '@/lib/validation-utils';
import { CountryCodeSelect } from '@/components/ui/country-code-select';
import { compressImageToWebP } from '@/lib/image-compression';
import { ImageCropModal } from '@/components/ui/image-crop-modal';

const PatientProfileSchema = z.object({
  fullName: z.string().min(3, "El nombre completo es requerido."),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(['masculino', 'femenino', '']).optional().nullable(),
  cedula: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
});

const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida."),
  newPassword: z.string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres.")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula.")
    .regex(/[a-z]/, "Debe contener al menos una minúscula.")
    .regex(/[0-9]/, "Debe contener al menos un número."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las nuevas contraseñas no coinciden.",
  path: ["confirmPassword"],
});

import { DOCUMENT_TYPES, COUNTRY_CODES, DocumentType } from '@/lib/types';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';

export default function ProfilePage() {
  const { user, updateUser, changePassword, loginWithGoogle } = useAuth();
  const { cities } = useSettings();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for profile info
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [gender, setGender] = useState<'masculino' | 'femenino' | ''>('');
  const [cedula, setCedula] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('Cédula');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+58');
  const [locationData, setLocationData] = useState<LocationData>({
    country: user?.country || 'VE',
    state: user?.state || '',
    city: user?.city || '',
    sector: user?.sector || '',
    address: user?.address || '',
  });
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);

  // ... (Password state and profileImage state remain unchanged)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      router.push('/auth/login');
      return;
    }

    // Actualizar campos iniciales desde la sesión
    setFullName(user.name ?? '');
    setBirthDate(user.birthDate ?? '');
    setGender(user.gender ?? '');
    setCedula(user.cedula ?? '');
    setDocumentType((user as { documentType?: DocumentType }).documentType ?? 'Cédula');
    setLocationData({
      country: user.country || 'VE',
      state: user.state || '',
      city: user.city || '',
      sector: user.sector || '',
      address: user.address || '',
    });
    setProfileImage(user.profileImage ?? null);

    if (user.password === 'OAUTH_GOOGLE_USER') {
      setIsGoogleLinked(true);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.app_metadata?.provider === 'google') {
          setIsGoogleLinked(true);
        }
      }).catch(() => {});
    }

    // Refrescar directamente desde la base de datos para cargar datos completos y actualizados
    if (user.email) {
      supabaseService.findUserByEmail(user.email).then((fresh) => {
        if (fresh) {
          setFullName(fresh.name ?? '');
          setBirthDate(fresh.birthDate ?? '');
          setGender(fresh.gender ?? '');
          setCedula(fresh.cedula ?? '');
          setDocumentType(fresh.documentType ?? 'Cédula');
          setLocationData({
            country: fresh.country || 'VE',
            state: fresh.state || '',
            city: fresh.city || '',
            sector: fresh.sector || '',
            address: fresh.address || '',
          });
          if (fresh.profileImage) {
            setProfileImage(fresh.profileImage);
          }
        }
      }).catch((err) => console.error("Error fetching fresh profile in page:", err));
    }
  }, [user?.email, router]);

  // Efecto separado para parsear el teléfono - solo cuando user.phone cambie
  const lastParsedPhone = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;

    if (!user.phone) {
      // Sin teléfono, solo resetear si es la primera vez
      if (lastParsedPhone.current !== 'NO_PHONE') {
        setCountryCode('+58');
        setPhone('');
        lastParsedPhone.current = 'NO_PHONE';
      }
      return;
    }

    // Evitar re-parsear el mismo teléfono
    if (lastParsedPhone.current === user.phone) {
      return;
    }
    lastParsedPhone.current = user.phone;

    if (user.phone.startsWith('+')) {
      // Intentar coincidir con códigos de país conocidos (ordenados por longitud descendente)
      const knownCodes = COUNTRY_CODES.map(c => c.code).sort((a, b) => b.length - a.length);
      let foundKnownCode = false;

      for (const code of knownCodes) {
        if (user.phone.startsWith(code)) {
          setCountryCode(code);
          const numberPart = user.phone.slice(code.length).replace(/\D/g, '');
          setPhone(numberPart);
          foundKnownCode = true;
          break;
        }
      }

      if (!foundKnownCode) {
        // Fallback: tomar los primeros 3 caracteres como código
        const possibleCode = user.phone.substring(0, 3);
        if (possibleCode.match(/^\+\d{1,2}$/)) {
          setCountryCode(possibleCode);
          setPhone(user.phone.slice(3).replace(/\D/g, ''));
        } else {
          setCountryCode('+58');
          setPhone(user.phone.replace(/[^\d]/g, ''));
        }
      }
    } else {
      // Teléfono sin código de país
      setCountryCode('+58');
      let cleanPhone = user.phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
      setPhone(cleanPhone);
    }
  }, [user?.phone]);

  // ... (handleImageUpload, handleImageSave, removeProfileImage remain unchanged)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|gif|heic)$/i)) {
      toast({
        variant: 'destructive',
        title: 'Tipo de archivo no válido',
        description: 'Por favor selecciona una imagen (JPG, PNG, WEBP, etc.)',
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Archivo demasiado grande',
        description: 'La imagen debe ser menor a 20MB',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input para permitir volver a elegir el mismo archivo si se desea
    event.target.value = '';
  };

  const handleCropComplete = async ({ dataUrl }: { file: File; dataUrl: string }) => {
    setProfileImage(dataUrl);
    setIsCropModalOpen(false);
    toast({
      title: 'Encuadre aplicado ⚡',
      description: 'Imagen optimizada a WebP. Haz clic en "Guardar Foto" para actualizar tu perfil.',
    });
  };

  const handleImageSave = async () => {
    if (!profileImage || !user) return;

    setIsUploading(true);
    try {
      await updateUser({ profileImage });
      toast({
        title: 'Foto de perfil actualizada',
        description: 'Tu foto de perfil ha sido guardada correctamente.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la foto de perfil.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Sanitizar y validar antes de zod
    const nameSan = validateName(fullName);
    // Eliminar cero inicial si existe
    const phoneSanitized = phone && phone.startsWith('0') ? phone.slice(1) : phone;
    const fullPhone = phoneSanitized ? `${countryCode}${phoneSanitized}` : '';
    const phoneSan = validatePhone(fullPhone);
    const cedulaSan = validateCedula(cedula, documentType);
    const citySan = validateCity(locationData.city);
    //const ageSan = validateAge(age); // Ya no validamos edad manual, se calcula

    if (!nameSan.isValid || (cedula && !cedulaSan.isValid) || (phone && !phoneSan.isValid) || (locationData.city && !citySan.isValid)) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: 'Datos inválidos o peligrosos.' });
      return;
    }

    const result = PatientProfileSchema.safeParse({
      fullName: nameSan.sanitized,
      birthDate: birthDate, // Pasamos birthDate
      gender,
      cedula: cedulaSan.sanitized,
      phone: phoneSan.sanitized,
      city: citySan.sanitized,
    });

    if (!result.success) {
      const errorMessage = result.error.errors.map(err => err.message).join(' ');
      toast({ variant: 'destructive', title: 'Error de Validación', description: errorMessage });
      return;
    }

    // No permitir cambiar la cédula si ya existe
    const finalCedula = user.cedula || result.data.cedula;

    // Validar cédula única si se está estableciendo por primera vez
    if (!user.cedula && result.data.cedula) {
      try {
        const cedulaResponse = await fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'patient_cedula', value: result.data.cedula, excludeId: user.id })
        });
        const cedulaCheck = await cedulaResponse.json();

        if (!cedulaCheck.isUnique) {
          toast({ variant: 'destructive', title: 'DNI/Cédula ya registrado', description: cedulaCheck.message });
          return;
        }
      } catch (error) {
        console.error('Error validating cedula:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo validar el documento' });
        return;
      }
    }

    // Calcular edad
    let calculatedAge = null;
    if (result.data.birthDate) {
      const today = new Date();
      const birth = new Date(result.data.birthDate);
      calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
    }

    await updateUser({
      name: result.data.fullName,
      age: calculatedAge,
      birthDate: result.data.birthDate,
      gender: result.data.gender === '' ? null : result.data.gender,
      cedula: finalCedula, // Mantener la cédula original si ya existe
      documentType: documentType,
      phone: fullPhone,
      country: locationData.country,
      state: locationData.state,
      city: locationData.city,
      sector: locationData.sector,
      address: locationData.address,
    });

    // Refrescar usuario desde la base de datos y actualizar estado global y localStorage
    const freshUser = await supabaseService.findUserByEmail(user.email);
    if (freshUser) {
      // Preservar los datos que acabamos de guardar (el phone correcto)
      const updatedUserWithLocalData = {
        ...freshUser,
        birthDate: result.data.birthDate,
        phone: fullPhone // Usar el teléfono que acabamos de guardar
      };
      await updateUser(updatedUserWithLocalData); // Actualiza el contexto
      localStorage.setItem('user', JSON.stringify(updatedUserWithLocalData));
    }

    toast({
      title: "¡Perfil Actualizado!",
      description: "Tu información personal ha sido guardada correctamente.",
    });
  };

  // ... (JSX continues)


  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = PasswordChangeSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      const errorMessage = result.error.errors.map(err => err.message).join(' ');
      toast({ variant: 'destructive', title: 'Error de Validación', description: errorMessage });
      return;
    }

    const { success, message } = await changePassword(
      result.data.currentPassword,
      result.data.newPassword
    );

    if (success) {
      toast({ title: 'Éxito', description: message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast({ variant: 'destructive', title: 'Error', description: message });
    }
  };


  if (!user) {
    // You can return a loading skeleton here
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <HeaderWrapper />
        <main className="flex-1 flex items-center justify-center">
          <p>Cargando...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderWrapper />
      <main className="flex-1 flex items-center justify-center py-12 bg-muted/40 pb-20 md:pb-12">
        <div className="container max-w-2xl space-y-8">
          {/* Foto de Perfil */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                <Camera /> Foto de Perfil
              </CardTitle>
              <CardDescription>
                Personaliza tu foto de perfil para que los médicos te reconozcan mejor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-6">
                {/* Preview de la imagen */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 bg-muted">
                    {profileImage ? (
                      <Image
                        src={profileImage}
                        alt="Foto de perfil"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <User className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Botón para remover imagen */}
                  {profileImage && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full"
                      onClick={removeProfileImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Controles de subida */}
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Elegir Foto
                  </Button>

                  {profileImage && (
                    <Button
                      onClick={handleImageSave}
                      disabled={isUploading}
                      className="flex-1"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Input oculto para subir archivo */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Información de ayuda */}
                <div className="text-center text-sm text-muted-foreground">
                  <p>Formatos soportados: JPG, PNG, GIF</p>
                  <p>Tamaño máximo: 5MB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                <User /> Mi Perfil
              </CardTitle>
              <CardDescription>
                Actualiza tu información personal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" type="email" value={user.email} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Tipo de Documento</Label>
                    <Select
                      value={documentType}
                      onValueChange={(value) => setDocumentType(value as DocumentType)}
                      disabled={!!user?.cedula} // Deshabilitar si ya tiene documento
                    >
                      <SelectTrigger id="documentType">
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cedula">{documentType === 'Pasaporte' ? 'Número de Pasaporte' : 'Cédula de Identidad'}</Label>
                    <Input
                      id="cedula"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      placeholder={documentType === 'Pasaporte' ? 'ej., ABC123456' : 'ej., 12345678'}
                      disabled={!!user?.cedula} // Deshabilitar si ya tiene documento
                      className={user?.cedula ? "bg-slate-50 dark:bg-slate-900 cursor-not-allowed" : ""}
                    />
                    {user?.cedula && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        🔒 La Cédula no se puede modificar después del registro por seguridad.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <div className="flex gap-2">
                      <CountryCodeSelect
                        value={countryCode}
                        onChange={setCountryCode}
                        className="w-[130px]"
                      />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          // Eliminar 0 inicial si el usuario lo escribe, ya que el código de país lo reemplaza
                          if (val.startsWith('0')) val = val.slice(1);
                          setPhone(val);
                        }}
                        placeholder="Ej: 412 123 4567"
                        className="flex-1"
                        maxLength={15}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecciona el código de país e ingresa el número (ej: 412 123 4567).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {birthDate && (
                      <p className="text-sm text-green-600 font-medium">
                        Edad: {new Date().getFullYear() - new Date(birthDate).getFullYear() - (new Date().getMonth() < new Date(birthDate).getMonth() || (new Date().getMonth() === new Date(birthDate).getMonth() && new Date().getDate() < new Date(birthDate).getDate()) ? 1 : 0)} años
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Sexo</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'masculino' | 'femenino' | '')}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled>Selecciona tu sexo</option>
                      <option value="masculino">Hombre (Masculino)</option>
                      <option value="femenino">Mujer (Femenino)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Ubicación y Dirección de Residencia</h4>
                  <LocationSelector
                    country={locationData.country}
                    state={locationData.state}
                    city={locationData.city}
                    sector={locationData.sector}
                    address={locationData.address}
                    onLocationChange={setLocationData}
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Seguridad / Contraseña */}
          {isGoogleLinked || user?.password === 'OAUTH_GOOGLE_USER' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-headline text-emerald-800">
                  <Lock className="h-5 w-5 text-emerald-600" />
                  Seguridad y Acceso
                </CardTitle>
                <CardDescription>
                  Tu cuenta está autenticada mediante tu cuenta de Google.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                  <div className="p-1.5 bg-emerald-100 rounded-full mt-0.5">
                    <Lock className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-emerald-950">Acceso Protegido por Google OAuth</p>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Inicias sesión con un solo clic utilizando tu cuenta de Google (<strong>{user?.email}</strong>). Al estar gestionado por Google, no requieres administrar ni cambiar contraseñas locales.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                  <Lock /> Seguridad
                </CardTitle>
                <CardDescription>
                  Cambia tu contraseña de acceso local.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, con mayúsculas, minúsculas y números.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Cambiar Contraseña
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Cuentas Vinculadas y Acceso Rápido */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-headline">
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
                Cuentas Vinculadas y Acceso Rápido
              </CardTitle>
              <CardDescription>
                {isGoogleLinked || user?.password === 'OAUTH_GOOGLE_USER'
                  ? "Tu cuenta está vinculada con Google para iniciar sesión rápidamente."
                  : "Conecta tu cuenta de Google para iniciar sesión con un solo clic de forma rápida y segura."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white border rounded-xl shadow-2xs">
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
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
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">Google</p>
                    <p className="text-xs text-slate-600 font-mono">{user?.email || 'Sin correo asociado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isGoogleLinked || user?.password === 'OAUTH_GOOGLE_USER' ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium px-3 py-1 text-xs">
                      🟢 Cuenta vinculada
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-xs">
                        No vinculada
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithGoogle('/profile')}
                      >
                        Sincronizar con Google
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Notificaciones */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notificaciones</h3>
            <NotificationSettings
              userId={user?.id || ''}
            />
          </div>

        </div>
      </main>

      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageSrc={cropImageSrc}
        cropShape="round"
        aspectRatio={1}
        title="Ajustar Foto de Perfil"
        description="Arrastra la foto para encuadrar tu rostro y usa el zoom para acercar o alejar."
        originalFileName={user?.name ? `${user.name}-perfil` : 'foto-perfil'}
        onCropComplete={handleCropComplete}
      />

      <BottomNav />
    </div>
  );
}


"use client";

import { useState } from 'react';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import * as supabaseService from '@/lib/supabaseService';
import type { Doctor } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DOCUMENT_TYPES, COUNTRY_CODES, DocumentType } from '@/lib/types';
import { uploadPublicImage } from '@/lib/supabaseService';

const DoctorProfileSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  cedula: z.string().min(1, "El documento es requerido.").max(20, "El documento es muy largo."),
  documentType: z.enum(['DNI', 'Pasaporte', 'Otro']),
  medicalLicense: z.string().min(4, "La matrícula médica debe tener al menos 4 caracteres."),
  whatsapp: z.string().max(20, "El número es muy largo.").optional(),
  address: z.string().min(5, "La dirección debe tener al menos 5 caracteres."),
  sector: z.string().min(1, "El sector es requerido."),
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
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const isClinicEmployee = doctorData.isClinicEmployee;

  const [documentType, setDocumentType] = useState<DocumentType>(doctorData.documentType || 'DNI');

  // Logic for phone parsing
  const getInitialPhoneData = (fullPhone: string) => {
    if (!fullPhone) return { code: '+54', number: '' };
    const found = COUNTRY_CODES.find(c => fullPhone.startsWith(c.code));
    if (found) {
      return { code: found.code, number: fullPhone.replace(found.code, '').trim() };
    }
    return { code: '+54', number: fullPhone };
  };

  const initialPhone = getInitialPhoneData(doctorData.whatsapp);
  const [countryCode, setCountryCode] = useState(initialPhone.code);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone.number);



  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!doctorData) return;

    try {
      const formData = new FormData(e.currentTarget);
      const dataToValidate = {
        name: formData.get('name') as string,
        cedula: formData.get('cedula') as string,
        documentType: documentType,
        medicalLicense: formData.get('medicalLicense') as string,
        whatsapp: `${countryCode} ${phoneNumber}`.trim(),
        address: formData.get('address') as string,
        sector: formData.get('sector') as string,
        description: formData.get('description') as string,
      };

      const result = DoctorProfileSchema.safeParse(dataToValidate);
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Error de Validación', description: result.error.errors.map(err => err.message).join(' ') });
        return;
      }

      let profileImageUrl = doctorData.profileImage;
      if (profileImageFile) {
        try {
          profileImageUrl = await uploadPublicImage(profileImageFile, 'images', `doctors/${doctorData.id}/profile`);
        } catch (error) {
          console.error("Error uploading profile image:", error);
          toast({ variant: "destructive", title: "Error", description: "No se pudo subir la imagen de perfil." });
          return;
        }
      }

      let bannerImageUrl = doctorData.bannerImage;
      if (bannerImageFile) {
        try {
          bannerImageUrl = await uploadPublicImage(bannerImageFile, 'images', `doctors/${doctorData.id}/banner`);
        } catch (error) {
          console.error("Error uploading banner image:", error);
          toast({ variant: "destructive", title: "Error", description: "No se pudo subir la imagen de portada." });
          return;
        }
      }

      await supabaseService.updateDoctor(doctorData.id, {
        ...result.data,
        profileImage: profileImageUrl,
        bannerImage: bannerImageUrl
      });
      toast({ title: 'Perfil Actualizado' });
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
          <CardTitle className="text-base md:text-2xl">Perfil Público</CardTitle>
          <CardDescription className="text-xs md:text-base">Esta información será visible para los pacientes.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveProfile}>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1 md:space-y-2"><Label htmlFor="name" className="text-xs md:text-sm">Nombre Completo</Label><Input id="name" name="name" defaultValue={doctorData.name} className="h-9 md:h-10 text-xs md:text-sm" readOnly={isClinicEmployee} /></div>
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="cedula" className="text-xs md:text-sm">Documento de Identidad</Label>
                <div className="flex gap-2">
                  <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)} disabled={isClinicEmployee}>
                    <SelectTrigger className="w-[100px] h-9 md:h-10 text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input id="cedula" name="cedula" defaultValue={doctorData.cedula} className="h-9 md:h-10 text-xs md:text-sm flex-1" readOnly={isClinicEmployee} maxLength={15} />
                </div>
              </div>
            </div>
            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="medicalLicense" className="text-xs md:text-sm">Número de Matrícula Médica</Label>
              <Input
                id="medicalLicense"
                name="medicalLicense"
                defaultValue={doctorData.medicalLicense || ''}
                placeholder="Ej: MN 123456"
                className="h-9 md:h-10 text-xs md:text-sm"
                readOnly={isClinicEmployee}
              />
              <p className="text-xs text-muted-foreground">Este número será verificado por el administrador</p>
            </div>
            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="whatsapp" className="text-xs md:text-sm">Nro. WhatsApp</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[100px] h-9 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="País" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-1"><span>{c.flag}</span> <span>{c.code}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="whatsapp"
                  name="whatsapp-number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-9 md:h-10 text-xs md:text-sm flex-1"
                  maxLength={15}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1 md:space-y-2"><Label htmlFor="address" className="text-xs md:text-sm">Dirección</Label><Input id="address" name="address" defaultValue={doctorData.address} className="h-9 md:h-10 text-xs md:text-sm" /></div>
              <div className="space-y-1 md:space-y-2"><Label htmlFor="sector" className="text-xs md:text-sm">Sector</Label><Input id="sector" name="sector" defaultValue={doctorData.sector} className="h-9 md:h-10 text-xs md:text-sm" /></div>
            </div>

            <div className="space-y-1 md:space-y-2"><Label htmlFor="description" className="text-xs md:text-sm">Descripción Profesional</Label><Textarea id="description" name="description" defaultValue={doctorData.description} rows={4} className="text-xs md:text-sm" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-1 md:space-y-2"><Label className="text-xs md:text-sm">Foto de Perfil</Label><Image src={profileImageFile ? URL.createObjectURL(profileImageFile) : (doctorData.profileImage || 'https://placehold.co/400x400.png')} alt="Perfil" width={80} height={80} className="rounded-full border w-20 h-20 md:w-[100px] md:h-[100px] object-cover" /><Input type="file" onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)} className="text-xs md:text-sm" /></div>
              <div className="space-y-1 md:space-y-2"><Label className="text-xs md:text-sm">Imagen de Banner</Label><Image src={bannerImageFile ? URL.createObjectURL(bannerImageFile) : (doctorData.bannerImage || 'https://placehold.co/1200x400.png')} alt="Banner" width={200} height={60} className="rounded-md border aspect-video object-cover w-full max-w-xs md:max-w-full" /><Input type="file" onChange={(e) => setBannerImageFile(e.target.files?.[0] || null)} className="text-xs md:text-sm" /></div>
            </div>

          </CardContent>
          <CardFooter><Button type="submit" className="w-full md:w-auto">Guardar Perfil</Button></CardFooter>
        </form>
      </Card>
      {!isClinicEmployee && (
        <Card>
          <CardHeader><CardTitle className="text-base md:text-2xl">Seguridad</CardTitle><CardDescription className="text-xs md:text-base">Cambia tu contraseña.</CardDescription></CardHeader>
          <CardContent>
            <Button onClick={onOpenPasswordDialog} className="w-full md:w-auto">Cambiar Contraseña</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

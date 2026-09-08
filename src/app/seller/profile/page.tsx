"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HeaderWrapper } from "@/components/header";
import { z } from 'zod';
import { validateName, validatePhone } from '@/lib/validation-utils';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';
import { Seller } from '@/lib/types';

const SellerProfileSchema = z.object({
  fullName: z.string().min(3, "El nombre completo es requerido."),
  phone: z.string().optional(),
  profileImage: z.string().nullable().optional(),
});

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function SellerProfilePage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [locationData, setLocationData] = useState<LocationData>({
    country: 'VE',
    state: 'Monagas',
    city: 'Maturín',
    sector: '',
    address: '',
  });

  useEffect(() => {
    if (user === undefined) return;
    if (user === null || user.role !== 'seller') {
      router.push('/auth/login');
    } else {
      setFullName(user.name);
      setPhone(user.phone || '');
      setProfileImage(user.profileImage || null);
      const s = user as unknown as Seller;
      setLocationData({
        country: s.country || 'VE',
        state: s.state || '',
        city: s.city || '',
        sector: s.sector || '',
        address: s.address || '',
      });
    }
  }, [user, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImageFile(file);
      setProfileImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    let imageUri = profileImage;
    if (newImageFile) {
        imageUri = await fileToDataUri(newImageFile);
    }

    const nameSan = validateName(fullName);
    const phoneSan = validatePhone(phone);
    if (!nameSan.isValid || (phone && !phoneSan.isValid)) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: 'Datos inválidos o peligrosos.' });
      return;
    }

    const result = SellerProfileSchema.safeParse({ 
        fullName: nameSan.sanitized, 
        phone: phoneSan.sanitized, 
        profileImage: imageUri 
    });

    if (!result.success) {
      const errorMessage = result.error.errors.map(err => err.message).join(' ');
      toast({ variant: 'destructive', title: 'Error de Validación', description: errorMessage });
      return;
    }

    await updateUser({
      name: result.data.fullName,
      phone: result.data.phone,
      profileImage: result.data.profileImage,
      country: locationData.country,
      state: locationData.state,
      city: locationData.city,
      sector: locationData.sector,
      address: locationData.address,
    });
    
    toast({
        title: "¡Perfil Actualizado!",
        description: "Tu información personal y de ubicación ha sido guardada correctamente.",
    });
  };

  if (!user) {
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
        <div className="container max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                <User /> Mi Perfil de Vendedora
              </CardTitle>
              <CardDescription>
                Actualiza tu información personal y de contacto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                        {profileImage && <AvatarImage src={profileImage} alt={fullName} />}
                        <AvatarFallback className="text-3xl">
                            {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                        <Label htmlFor="picture">Foto de Perfil</Label>
                        <Input id="picture" type="file" accept="image/*" onChange={handleImageChange} className="file:text-primary file:font-semibold"/>
                        <p className="text-xs text-muted-foreground">Sube una foto para que los médicos te reconozcan.</p>
                    </div>
                </div>

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
                
                 <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="ej., 0412-1234567"
                    />
                  </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3 text-slate-800">Ubicación y Dirección de Residencia</h4>
                  <LocationSelector
                    country={locationData.country}
                    state={locationData.state}
                    city={locationData.city}
                    sector={locationData.sector}
                    address={locationData.address}
                    onLocationChange={(newLoc) => setLocationData(newLoc)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

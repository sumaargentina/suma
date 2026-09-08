"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Clinic, PaymentSettings, ClinicSpecialty, COUNTRY_CODES, City } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateClinic, getClinic, getClinicSpecialties, addClinicSpecialty, deleteClinicSpecialty } from '@/lib/supabaseService';
import { useSettings } from '@/lib/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Save, Building2, CreditCard, Trash2, Plus, Upload, MapPin, X } from 'lucide-react';
import Image from 'next/image';
import { uploadPublicImage } from '@/lib/supabaseService';
import { ImageCropModal } from '@/components/ui/image-crop-modal';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(
    () => import('@/components/location-picker').then(mod => ({ default: mod.LocationPicker })),
    { ssr: false, loading: () => <div className="h-10 bg-slate-100 rounded-lg animate-pulse" /> }
);

export function SettingsTab() {
    const { user, loginWithGoogle } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+58');
    const [description, setDescription] = useState('');
    const [locationData, setLocationData] = useState<LocationData>({
        country: 'VE',
        state: 'Monagas',
        city: 'Maturín',
        sector: '',
        address: '',
        lat: 0,
        lng: 0,
    });
    const [logoUrl, setLogoUrl] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bannerUrl, setBannerUrl] = useState('');
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [slug, setSlug] = useState('');

    const [cropModal, setCropModal] = useState<{
        isOpen: boolean;
        imageSrc: string | null;
        type: 'logo' | 'banner';
        title: string;
        description: string;
        cropShape: 'round' | 'rect';
        aspectRatio: number;
        fileName: string;
    }>({
        isOpen: false,
        imageSrc: null,
        type: 'logo',
        title: 'Ajustar Logo',
        description: '',
        cropShape: 'round',
        aspectRatio: 1,
        fileName: 'clinic-logo',
    });

    // Specialties State
    const [specialties, setSpecialties] = useState<ClinicSpecialty[]>([]);
    const [newSpecialty, setNewSpecialty] = useState('');

    useEffect(() => {
        const loadClinicData = async () => {
            if (user?.id) {
                // Initialize basic info from user session
                setName(user.name || '');
                if (user.phone) {
                    const found = COUNTRY_CODES.find(c => user.phone?.startsWith(c.code));
                    if (found) {
                        setCountryCode(found.code);
                        setPhone(user.phone.replace(found.code, '').trim());
                    } else {
                        setPhone(user.phone);
                    }
                }

                // Fetch full settings including payment config
                try {
                    const clinicData = await getClinic(user.id);
                    if (clinicData) {
                        setDescription(clinicData.description || '');
                        setLocationData({
                            country: clinicData.country || 'VE',
                            state: clinicData.state || '',
                            city: clinicData.city || '',
                            sector: clinicData.sector || '',
                            address: clinicData.address || '',
                            lat: Number(clinicData.lat) || 0,
                            lng: Number(clinicData.lng) || 0,
                        });
                        setLogoUrl(clinicData.logoUrl || '');
                        setBannerUrl(clinicData.bannerImage || '');
                    }
                } catch (error) {
                    console.error("Error loading clinic specifics", error);
                }
            }
        };

        const loadSpecialties = async () => {
            if (user?.id) {
                const data = await getClinicSpecialties(user.id);
                setSpecialties(data);
            }
        };

        loadClinicData();
        loadSpecialties();
    }, [user]);

    const handleSave = async () => {
        if (!user?.id) return;

        setSaving(true);
        try {
            let finalLogoUrl = logoUrl;
            if (logoFile) {
                finalLogoUrl = await uploadPublicImage(logoFile, 'images', `clinics/${user.id}/logo`);
            }

            let finalBannerUrl = bannerUrl;
            if (bannerFile) {
                finalBannerUrl = await uploadPublicImage(bannerFile, 'images', `clinics/${user.id}/banner`);
            }

            await updateClinic(user.id, {
                name,
                phone: `${countryCode} ${phone}`.trim(),
                description,
                country: locationData.country,
                state: locationData.state,
                city: locationData.city,
                sector: locationData.sector,
                address: locationData.address,
                logoUrl: finalLogoUrl || undefined,
                bannerImage: finalBannerUrl || undefined,
                lat: locationData.lat != null ? locationData.lat : undefined,
                lng: locationData.lng != null ? locationData.lng : undefined,
            } as any);

            toast({ title: 'Guardado', description: 'Los cambios se guardaron correctamente.' });
        } catch (error) {
            console.error('Error saving clinic:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar los cambios.' });
        } finally {
            setSaving(false);
        }
    };


    const handleAddSpecialty = async () => {
        if (!newSpecialty.trim() || !user?.id) return;
        try {
            const added = await addClinicSpecialty({ clinicId: user.id, name: newSpecialty.trim() });
            setSpecialties([...specialties, added]);
            setNewSpecialty('');
            toast({ title: 'Especialidad agregada' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo agregar.' });
        }
    };

    const handleDeleteSpecialty = async (id: string) => {
        try {
            await deleteClinicSpecialty(id);
            setSpecialties(specialties.filter(s => s.id !== id));
            toast({ title: 'Especialidad eliminada' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
                <p className="text-muted-foreground">Administra la información de tu clínica.</p>
            </div>

            {/* Profile Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Información de la Clínica
                    </CardTitle>
                    <CardDescription>Estos datos se mostrarán en tu perfil público.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la Clínica</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Clínica Salud Total"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono de Contacto</Label>
                            <div className="flex gap-2">
                                <Select value={countryCode} onValueChange={setCountryCode} disabled={saving}>
                                    <SelectTrigger className="w-[100px]">
                                        <SelectValue />
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
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="11 1234 5678"
                                    disabled={saving}
                                    className="flex-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Selector Geográfico Completo: País -> Estado -> Ciudad -> Sector -> Dirección */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3 text-slate-800">Ubicación y Dirección Principal</h4>
                        <LocationSelector
                            country={locationData.country}
                            state={locationData.state}
                            city={locationData.city}
                            sector={locationData.sector}
                            address={locationData.address}
                            disabled={saving}
                            onLocationChange={(newLoc) => setLocationData(newLoc)}
                        />
                    </div>

                    {/* Location Picker */}
                    <div className="space-y-2">
                        <Label>Ubicación en el Mapa</Label>
                        <LocationPicker
                            lat={locationData.lat || 0}
                            lng={locationData.lng || 0}
                            city={locationData.city}
                            disabled={saving}
                            onLocationChange={(newLat, newLng) => {
                                setLocationData(prev => ({ ...prev, lat: newLat, lng: newLng }));
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe tu clínica, servicios especializados, etc."
                            rows={4}
                            disabled={saving}
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Logo de la Clínica</Label>
                            <div className="flex flex-col items-center gap-4 border p-4 rounded-md">
                                <div className="relative w-40 h-40 rounded-lg overflow-hidden border bg-white shadow-sm">
                                    <Image
                                        src={logoFile ? URL.createObjectURL(logoFile) : (logoUrl || 'https://placehold.co/200x200?text=Logo')}
                                        alt="Logo Preview"
                                        fill
                                        className="object-contain p-2"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full">
                                    <Input
                                        id="logo-upload"
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
                                                    type: 'logo',
                                                    title: 'Ajustar Logo de la Clínica',
                                                    description: 'Encuadra el logo centrado o con margen.',
                                                    cropShape: 'round',
                                                    aspectRatio: 1,
                                                    fileName: `${name || 'clinica'}-logo`,
                                                });
                                            };
                                            reader.readAsDataURL(file);
                                            e.target.value = '';
                                        }}
                                        disabled={saving}
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Portada (Banner)</Label>
                            <div className="flex flex-col items-center gap-4 border p-4 rounded-md h-full">
                                <div className="relative w-full h-32 rounded-md overflow-hidden border bg-slate-50">
                                    <Image
                                        src={bannerFile ? URL.createObjectURL(bannerFile) : (bannerUrl || 'https://placehold.co/800x200?text=Banner')}
                                        alt="Banner Preview"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full">
                                    <Input
                                        id="banner-upload"
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
                                                    title: 'Ajustar Banner de la Clínica',
                                                    description: 'Arrastra y encuadra la zona visible del banner panorámico.',
                                                    cropShape: 'rect',
                                                    aspectRatio: 16 / 9,
                                                    fileName: `${name || 'clinica'}-banner`,
                                                });
                                            };
                                            reader.readAsDataURL(file);
                                            e.target.value = '';
                                        }}
                                        disabled={saving}
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>


            {/* Specialties Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Especialidades</CardTitle>
                    <CardDescription>
                        Define las especialidades médicas que ofrece tu clínica. Estas aparecerán al registrar médicos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nueva especialidad (ej. Cardiología)"
                            value={newSpecialty}
                            onChange={(e) => setNewSpecialty(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSpecialty()}
                        />
                        <Button onClick={handleAddSpecialty}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {specialties.map(specialty => (
                            <div key={specialty.id} className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full text-sm">
                                <span>{specialty.name}</span>
                                <button onClick={() => handleDeleteSpecialty(specialty.id)} className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                        {specialties.length === 0 && <span className="text-muted-foreground text-sm italic">No hay especialidades cargadas.</span>}
                    </div>
                </CardContent>
            </Card>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end gap-4 md:static md:bg-transparent md:border-0 md:p-0">
                <Button onClick={handleSave} disabled={saving} size="lg" className="w-full md:w-auto">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar Configuración Completa
                </Button>
            </div>

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
                        Puedes acceder a tu panel de clínica directamente iniciando sesión con la cuenta de Google ({user?.email}).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-slate-50">
                        <div className="flex items-center gap-2.5">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                🟢 Compatible con Google
                            </Badge>
                            <span className="text-xs text-slate-600 font-mono">{user?.email}</span>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => loginWithGoogle('/clinic/dashboard?tab=settings')}
                        >
                            Sincronizar Acceso
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Public Profile Link - Read Only */}
            <Card>
                <CardHeader>
                    <CardTitle>Perfil Público</CardTitle>
                    <CardDescription>Comparte este enlace con tus pacientes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Input
                            value={user?.id ? `/clinica/${user.id.slice(0, 8)}` : ''}
                            readOnly
                            className="bg-muted"
                        />
                        <Button
                            variant="outline"
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/clinica/${user?.id?.slice(0, 8) || ''}`);
                                toast({ title: 'Copiado', description: 'Enlace copiado al portapapeles.' });
                            }}
                        >
                            Copiar
                        </Button>
                    </div>
                </CardContent>
            </Card>

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
                    if (cropModal.type === 'logo') {
                        setLogoFile(file);
                        toast({
                            title: 'Logo listo ⚡',
                            description: 'Encuadre aplicado y optimizado a WebP. Haz clic en "Guardar Cambios".',
                        });
                    } else {
                        setBannerFile(file);
                        toast({
                            title: 'Banner de portada listo ⚡',
                            description: 'Encuadre aplicado y optimizado a WebP. Haz clic en "Guardar Cambios".',
                        });
                    }
                    setCropModal((prev) => ({ ...prev, isOpen: false }));
                }}
            />
        </div>
    );
}


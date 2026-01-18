"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Clinic, PaymentSettings, ClinicSpecialty, COUNTRY_CODES, City } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateClinic, getClinic, getClinicSpecialties, addClinicSpecialty, deleteClinicSpecialty, getSettings } from '@/lib/supabaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Save, Building2, CreditCard, Trash2, Plus, Upload } from 'lucide-react';
import Image from 'next/image';
import { uploadPublicImage } from '@/lib/supabaseService';

export function SettingsTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+54');
    const [description, setDescription] = useState('');
    const [city, setCity] = useState('');
    const [sector, setSector] = useState('');
    const [address, setAddress] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bannerUrl, setBannerUrl] = useState('');
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [slug, setSlug] = useState('');


    // Specialties State
    const [specialties, setSpecialties] = useState<ClinicSpecialty[]>([]);
    const [newSpecialty, setNewSpecialty] = useState('');
    const [availableCities, setAvailableCities] = useState<City[]>([]);

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
                        setCity(clinicData.city || '');
                        setSector(clinicData.sector || '');
                        setAddress(clinicData.address || '');
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

        const loadCities = async () => {
            const settings = await getSettings();
            if (settings?.cities) {
                setAvailableCities(settings.cities);
            }
        };

        loadClinicData();
        loadSpecialties();
        loadCities();
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
                city,
                sector,
                address,
                logoUrl: finalLogoUrl || undefined,
                bannerImage: finalBannerUrl || undefined,
            });

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

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="city">Ciudad</Label>
                            <Select value={city} onValueChange={setCity} disabled={saving}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar ciudad" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCities.map(c => (
                                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sector">Sector / Barrio</Label>
                            <Input
                                id="sector"
                                value={sector}
                                onChange={(e) => setSector(e.target.value)}
                                placeholder="Ej: Palermo"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Dirección Exacta</Label>
                            <Input
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Calle 123, Piso 1"
                                disabled={saving}
                            />
                        </div>
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
                                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
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
                                        onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
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
        </div >
    );
}


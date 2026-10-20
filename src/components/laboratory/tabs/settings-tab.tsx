"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import type { Laboratory } from '@/lib/types';
import { getLaboratory, updateLaboratory } from '@/lib/supabaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    Save, 
    FlaskConical, 
    MapPin, 
    Phone, 
    Mail, 
    Globe, 
    Image as ImageIcon,
    CheckCircle,
    Copy,
    Building2,
    Eye
} from 'lucide-react';

export function LaboratorySettingsTab() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        adminEmail: '',
        phone: '',
        whatsapp: '',
        website: '',
        city: '',
        state: '',
        address: '',
        description: '',
        logoUrl: '',
        bannerImage: '',
        slug: '',
    });

    useEffect(() => {
        if (!user?.id) return;

        const loadData = async () => {
            try {
                setLoading(true);
                const lab = await getLaboratory(user.id);
                if (lab) {
                    setFormData({
                        name: lab.name || '',
                        adminEmail: lab.adminEmail || lab.email || '',
                        phone: lab.phone || '',
                        whatsapp: lab.whatsapp || lab.phone || '',
                        website: lab.website || '',
                        city: lab.city || '',
                        state: lab.state || '',
                        address: lab.address || '',
                        description: lab.description || '',
                        logoUrl: lab.logoUrl || '',
                        bannerImage: lab.bannerImage || '',
                        slug: lab.slug || '',
                    });
                }
            } catch (err) {
                console.error('Error loading laboratory profile:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user?.id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        try {
            setSaving(true);
            await updateLaboratory(user.id, {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                whatsapp: formData.whatsapp.trim(),
                website: formData.website.trim(),
                city: formData.city.trim(),
                state: formData.state.trim(),
                address: formData.address.trim(),
                description: formData.description.trim(),
                logoUrl: formData.logoUrl.trim() || undefined,
                bannerImage: formData.bannerImage.trim() || undefined,
            });

            toast({
                title: 'Perfil Actualizado',
                description: 'La información de tu laboratorio ha sido guardada correctamente.'
            });
        } catch (err: any) {
            console.error('Error saving profile:', err);
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: err.message || 'No se pudo actualizar el perfil.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCopySlug = () => {
        if (!formData.slug) return;
        const url = `${window.location.origin}/laboratorio/${formData.slug}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: 'Enlace Copiado', description: 'Enlace de tu laboratorio copiado al portapapeles.' });
    };

    if (loading) {
        return (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                <p>Cargando información del laboratorio...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <FlaskConical className="h-6 w-6 text-teal-600" />
                    Configuración y Perfil del Laboratorio
                </h2>
                <p className="text-muted-foreground text-sm">
                    Personaliza los datos públicos de tu laboratorio, datos de contacto, ubicación y presencia visual.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Banner & Logo Preview */}
                <Card className="overflow-hidden">
                    <div className="relative h-36 sm:h-44 w-full bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900">
                        {formData.bannerImage && (
                            <img 
                                src={formData.bannerImage} 
                                alt="Banner" 
                                className="w-full h-full object-cover" 
                            />
                        )}
                        <div className="absolute -bottom-8 left-6">
                            <div className="h-20 w-20 rounded-2xl bg-white p-1 shadow-lg border-2 border-white overflow-hidden">
                                {formData.logoUrl ? (
                                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full h-full bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center">
                                        <FlaskConical className="h-8 w-8" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <CardContent className="pt-12 pb-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="logo-url">URL del Logotipo</Label>
                                <Input
                                    id="logo-url"
                                    placeholder="https://ejemplo.com/logo.png"
                                    value={formData.logoUrl}
                                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="banner-url">URL del Banner de Cabecera</Label>
                                <Input
                                    id="banner-url"
                                    placeholder="https://ejemplo.com/banner.jpg"
                                    value={formData.bannerImage}
                                    onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Información General</CardTitle>
                        <CardDescription>Datos principales de identificación del laboratorio.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="lab-name">Nombre Comercial / Oficial *</Label>
                                <Input
                                    id="lab-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="admin-email">Correo Administrador</Label>
                                <Input
                                    id="admin-email"
                                    type="email"
                                    value={formData.adminEmail}
                                    disabled
                                    className="bg-slate-50 text-slate-500"
                                />
                                <p className="text-[11px] text-muted-foreground">El correo de acceso no puede cambiarse desde aquí.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-slug">Identificador Web (Slug)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="lab-slug"
                                        value={formData.slug}
                                        disabled
                                        className="bg-slate-50 text-slate-500 font-mono text-xs"
                                    />
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleCopySlug}
                                        className="shrink-0 gap-1"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        {copied ? 'Copiado' : 'Copiar Link'}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-phone">Teléfono de Atención</Label>
                                <Input
                                    id="lab-phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+58 414 1234567"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-whatsapp">WhatsApp para Pacientes</Label>
                                <Input
                                    id="lab-whatsapp"
                                    value={formData.whatsapp}
                                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                    placeholder="+58 424 1234567"
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="lab-website">Sitio Web (Opcional)</Label>
                                <Input
                                    id="lab-website"
                                    placeholder="https://tulaboratorio.com"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="lab-description">Descripción del Laboratorio</Label>
                                <Textarea
                                    id="lab-description"
                                    rows={3}
                                    placeholder="Describe las áreas de especialización de tu laboratorio, tecnología utilizada, etc..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Location */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Ubicación Física</CardTitle>
                        <CardDescription>Para que los pacientes puedan encontrarte en el directorio y agendar muestras.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="lab-city">Ciudad</Label>
                                <Input
                                    id="lab-city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Maturín"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lab-state">Estado</Label>
                                <Input
                                    id="lab-state"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    placeholder="Monagas"
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="lab-address">Dirección Completa</Label>
                                <Input
                                    id="lab-address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Av. Principal, Edificio Médico, Nivel PB, Consultorio 1"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Save button */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button 
                        type="submit" 
                        className="bg-teal-600 hover:bg-teal-700 text-white gap-2 px-6 shadow-md"
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar Perfil
                    </Button>
                </div>
            </form>
        </div>
    );
}

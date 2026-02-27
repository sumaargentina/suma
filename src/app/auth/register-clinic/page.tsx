"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from "next/link";
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Building2, CheckCircle2, MapPin, Eye, EyeOff, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(
    () => import('@/components/location-picker').then(mod => ({ default: mod.LocationPicker })),
    { ssr: false, loading: () => <div className="h-10 bg-slate-100 rounded-lg animate-pulse" /> }
);

function RegisterClinicContent() {
    const { registerClinic } = useAuth();
    const { cities } = useSettings();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const initialMonths = parseInt(searchParams.get('months') || '12'); // Default to 12

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [sector, setSector] = useState('');
    const [address, setAddress] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [billingMonths, setBillingMonths] = useState(initialMonths);
    const [isLoading, setIsLoading] = useState(false);
    const [lat, setLat] = useState(0);
    const [lng, setLng] = useState(0);
    const [citySearch, setCitySearch] = useState('');
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);


    const basePrice = 29000;

    const calculateTotal = () => {
        let total = basePrice * billingMonths;
        let discount = 0;

        if (billingMonths === 3) discount = 0.05;
        if (billingMonths === 6) discount = 0.08;
        if (billingMonths === 12) discount = 0.15;

        total = total * (1 - discount);
        return {
            total,
            discount
        };
    };

    const { total: totalToPay, discount } = calculateTotal();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (password !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Error', description: 'Las contraseñas no coinciden.' });
            setIsLoading(false);
            return;
        }

        if (password.length < 8) {
            toast({ variant: 'destructive', title: 'Error', description: 'La contraseña debe tener al menos 8 caracteres.' });
            setIsLoading(false);
            return;
        }

        try {
            await registerClinic({
                name,
                email,
                password,
                phone,
                city,
                sector,
                address,
                billingCycle: billingMonths === 12 ? 'annual' : 'monthly',
                lat: lat || undefined,
                lng: lng || undefined,
            });

            toast({
                title: "¡Cuenta Creada!",
                description: `Registro exitoso. Se ha generado una orden de pago por $${totalToPay.toLocaleString('es-AR')}.`,
            });

        } catch (error: any) {
            console.error("Registration error:", error);
            toast({
                variant: 'destructive',
                title: 'Error de Registro',
                description: error.message || "Ocurrió un error al registrar la clínica."
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">

            {/* Sidebar / Info Section */}
            <div className="hidden md:flex flex-col w-1/3 bg-slate-900 text-white p-12 justify-between">
                <div>
                    <Link href="/" className="flex items-center gap-2 mb-8">
                        <Building2 className="h-8 w-8 text-green-500" />
                        <span className="font-bold text-2xl">Suma Clínica</span>
                    </Link>
                    <h2 className="text-3xl font-bold mb-6">Estás a un paso de transformar tu gestión</h2>
                    <p className="text-slate-300 mb-8">
                        Unete a las más de 500 clínicas que confían en nosotros.
                    </p>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-lg font-bold mb-4 text-green-400">Resumen de tu Plan</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span>Plan Integral</span>
                                <span className="font-mono">$29.000/mes</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Duración</span>
                                <span>{billingMonths} Meses</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-green-400 font-bold">
                                    <span>Descuento Aplicado</span>
                                    <span>-{Math.round(discount * 100)}%</span>
                                </div>
                            )}
                            <Separator className="bg-slate-600 my-2" />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total a Pagar</span>
                                <span>${totalToPay.toLocaleString('es-AR')}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-sm text-slate-500">
                    © 2024 Suma Salud. Cancelación flexible.
                </div>
            </div>

            {/* Form Section */}
            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="mx-auto max-w-md w-full shadow-lg border-none">
                    <CardHeader>
                        <div className="flex justify-between items-center mb-2">
                            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded uppercase">Plan Integral</span>
                        </div>
                        <CardTitle className="text-2xl font-bold">Configura tu Cuenta</CardTitle>
                        <CardDescription>
                            Completa los datos de la institución para finalizar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la Clínica / Institución</Label>
                                <Input
                                    id="name"
                                    placeholder="Clínica Central..."
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Administrativo</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@clinica.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono de Contacto</Label>
                                <div className="flex">
                                    <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-slate-100 text-slate-600 text-sm font-medium">
                                        🇦🇷 +54
                                    </div>
                                    <Input
                                        id="phone"
                                        placeholder="11 1234-5678"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        disabled={isLoading}
                                        className="rounded-l-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="city">Ciudad</Label>
                                {city ? (
                                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-teal-50 border-teal-200">
                                        <MapPin className="h-4 w-4 text-teal-600 shrink-0" />
                                        <span className="text-sm font-medium text-teal-800 flex-1">{city}</span>
                                        <button
                                            type="button"
                                            onClick={() => { setCity(''); setCitySearch(''); setCityDropdownOpen(true); }}
                                            className="text-teal-500 hover:text-teal-700"
                                            disabled={isLoading}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : !cityDropdownOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => setCityDropdownOpen(true)}
                                        disabled={isLoading}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-300 rounded-md text-sm text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer"
                                    >
                                        <MapPin className="h-4 w-4" />
                                        Elegir ciudad
                                    </button>
                                ) : (
                                    <div>
                                        <Input
                                            placeholder="Filtrar ciudades..."
                                            value={citySearch}
                                            onChange={(e) => setCitySearch(e.target.value)}
                                            autoComplete="off"
                                            autoFocus
                                            className="mb-2"
                                            disabled={isLoading}
                                        />
                                        <div className="border rounded-lg max-h-32 overflow-y-auto bg-white">
                                            {cities.length > 0 ? (
                                                cities
                                                    .filter(c => !citySearch || c.name.toLowerCase().includes(citySearch.toLowerCase()))
                                                    .length > 0 ? (
                                                    cities
                                                        .filter(c => !citySearch || c.name.toLowerCase().includes(citySearch.toLowerCase()))
                                                        .map((cityOption) => (
                                                            <button
                                                                type="button"
                                                                key={cityOption.name}
                                                                onClick={() => { setCity(cityOption.name); setCitySearch(''); setCityDropdownOpen(false); }}
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 transition-colors border-b last:border-b-0 cursor-pointer"
                                                            >
                                                                {cityOption.name}
                                                            </button>
                                                        ))
                                                ) : (
                                                    <p className="px-3 py-2 text-sm text-muted-foreground">No se encontraron ciudades</p>
                                                )
                                            ) : (
                                                <p className="px-3 py-2 text-sm text-muted-foreground">Cargando ciudades...</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sector">Sector / Barrio</Label>
                                <Input
                                    id="sector"
                                    placeholder="Ej: Palermo"
                                    required
                                    value={sector}
                                    onChange={(e) => setSector(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Dirección Exacta</Label>
                                <Input
                                    id="address"
                                    placeholder="Calle 123, Piso 1"
                                    required
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Location Picker */}
                            <div className="space-y-2">
                                <Label>Ubicación en el Mapa <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                                <LocationPicker
                                    lat={lat}
                                    lng={lng}
                                    city={city}
                                    disabled={isLoading}
                                    onLocationChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
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
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
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

                            <div className="space-y-3 pt-4">
                                <Label>Ciclo de Facturación Seleccionado</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 3, 6, 12].map((m) => (
                                        <div
                                            key={m}
                                            className={`cursor-pointer border rounded-md py-2 text-center text-sm font-medium transition-all ${billingMonths === m ? 'border-green-500 bg-green-50 ring-1 ring-green-500 text-green-900' : 'border-slate-200 hover:border-slate-300'}`}
                                            onClick={() => setBillingMonths(m)}
                                        >
                                            {m === 12 ? '1 Año' : `${m} Mes`}
                                            {m === 3 && <div className="text-[10px] text-blue-600 font-bold">-5%</div>}
                                            {m === 6 && <div className="text-[10px] text-purple-600 font-bold">-8%</div>}
                                            {m === 12 && <div className="text-[10px] text-green-600 font-bold">-15%</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg mt-6" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                Pagar ${totalToPay.toLocaleString('es-AR')} y Crear Cuenta
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center text-sm">
                        <Separator />
                        <div>
                            ¿Ya tienes cuenta? <Link href="/auth/login" className="text-green-600 font-medium hover:underline">Iniciar Sesión</Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export default function RegisterClinicPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <RegisterClinicContent />
        </Suspense>
    );
}

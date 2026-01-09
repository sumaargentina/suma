"use client";

import { useState } from 'react';
import Link from "next/link";
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
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
import { ArrowLeft, Loader2, Building2, CheckCircle2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function RegisterClinicPage() {
    const { registerClinic } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const initialMonths = parseInt(searchParams.get('months') || '12'); // Default to 12

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [billingMonths, setBillingMonths] = useState(initialMonths);
    const [isLoading, setIsLoading] = useState(false);

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
                billingCycle: billingMonths === 12 ? 'annual' : 'monthly'
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
                                <Input
                                    id="phone"
                                    placeholder="+54 11 ..."
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
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

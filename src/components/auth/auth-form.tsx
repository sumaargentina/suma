"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';

interface AuthFormProps {
    defaultView?: 'login' | 'register';
    showSocial?: boolean;
}

export function AuthForm({ defaultView = 'login', showSocial = false }: AuthFormProps) {
    const router = useRouter();
    const { login, register, loginWithGoogle, loading: authLoading } = useAuth();

    const [view, setView] = useState<'login' | 'register'>(defaultView);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleGoogleAuth = async () => {
        setIsGoogleLoading(true);
        setError(null);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(err?.message || 'Error al conectar con Google');
            setIsGoogleLoading(false);
        }
    };

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');

    // Handle Login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await login(email, password);
            // El login ya redirige automáticamente según el rol
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Register
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        // Validar que las contraseñas coincidan
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            setIsLoading(false);
            return;
        }

        try {
            await register(name, email, password);
            setSuccessMessage('¡Cuenta creada exitosamente! Redirigiendo...');
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Error al crear la cuenta');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
                {/* Logo de SUMA */}
                <div className="mx-auto mb-6 flex items-center justify-center">
                    <Image
                        src="/images/logo_suma.png"
                        alt="SUMA Logo"
                        width={200}
                        height={80}
                        className="h-16 w-auto object-contain"
                        priority
                        data-ai-hint="logo"
                    />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    {view === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta SUMA'}
                </h1>
                <p className="text-sm text-gray-500">
                    {view === 'login'
                        ? 'Ingresa tus credenciales para acceder a tu panel.'
                        : 'Únete a la red de salud más avanzada de Argentina.'}
                </p>
            </div>

            <Tabs value={view} onValueChange={(v) => setView(v as 'login' | 'register')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                    <TabsTrigger value="register">Registrarse</TabsTrigger>
                </TabsList>

                <div className="space-y-4">
                    {/* Error & Success Messages */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {successMessage && (
                        <Alert className="bg-green-50 text-green-700 border-green-200">
                            <AlertDescription>{successMessage}</AlertDescription>
                        </Alert>
                    )}

                    {/* Botón de Google OAuth */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 h-11 shadow-xs"
                        onClick={handleGoogleAuth}
                        disabled={isGoogleLoading || isLoading}
                    >
                        {isGoogleLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                        )}
                        {view === 'login' ? 'Continuar con Google' : 'Registrarse con Google'}
                    </Button>

                    <div className="relative flex items-center justify-center my-2">
                        <div className="border-t border-slate-200 w-full" />
                        <span className="absolute bg-background px-2 text-xs text-muted-foreground font-medium uppercase">
                            O con correo
                        </span>
                    </div>

                    {/* LOGIN FORM */}
                    <TabsContent value="login">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="nombre@ejemplo.com"
                                        className="pl-10"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-200"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Ingresar
                            </Button>
                        </form>
                    </TabsContent>

                    {/* REGISTER FORM */}
                    <TabsContent value="register">
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre Completo</Label>
                                <Input
                                    id="name"
                                    placeholder="Juan Pérez"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="register-email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="register-email"
                                        type="email"
                                        placeholder="nombre@ejemplo.com"
                                        className="pl-10"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="register-password">Contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="register-password"
                                        type="password"
                                        className="pl-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Mínimo 8 caracteres</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        className="pl-10"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={8}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Crear Cuenta
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </form>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

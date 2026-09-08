"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
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
import { ArrowLeft, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";

const LoginSchema = z.object({
  email: z.string().email("Correo electrónico inválido."),
  password: z.string().min(1, "La contraseña es requerida."),
});

function LoginForm() {
  const { login, loginWithGoogle, sendPasswordReset } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const logoUrl = "/images/logo_suma.png";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = LoginSchema.safeParse({ email, password });

    if (!result.success) {
      const errorMessage = result.error.errors.map(err => err.message).join(' ');
      toast({ variant: 'destructive', title: 'Error de Validación', description: errorMessage });
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: "Ocurrió un error inesperado." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast({ variant: 'destructive', title: 'Correo Requerido', description: 'Por favor, ingresa tu correo electrónico.' });
      return;
    }
    const emailValidation = z.string().email("Correo electrónico inválido.").safeParse(resetEmail);
    if (!emailValidation.success) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: 'Por favor, ingresa un correo electrónico válido.' });
      return;
    }

    setIsResetLoading(true);
    await sendPasswordReset(resetEmail);
    setIsResetLoading(false);
    setIsResetDialogOpen(false);
    setResetEmail("");
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <Image
              src={logoUrl}
              alt="SUMA Logo"
              width={200}
              height={80}
              className="h-16 w-auto object-contain"
              priority
              data-ai-hint="logo"
            />
          </div>
          <CardTitle className="text-2xl font-headline">Bienvenido de Nuevo</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorParam === 'secretary_no_google' && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Acceso con Contraseña Requerido</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Las cuentas de secretaria deben iniciar sesión ingresando su correo y contraseña asignados por la clínica.
                </p>
              </div>
            </div>
          )}

          {errorParam === 'auth_callback_error' && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error de Autenticación</p>
                <p className="text-[11px] text-red-800 mt-0.5">
                  No se pudo completar el inicio de sesión con Google. Intenta nuevamente o usa tu correo y contraseña.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {/* Botón de Google OAuth */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 h-10 shadow-xs"
              onClick={handleGoogleLogin}
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
              Continuar con Google
            </Button>

            <div className="relative flex items-center justify-center my-1">
              <Separator className="w-full" />
              <span className="absolute bg-background px-2 text-xs text-muted-foreground font-medium uppercase">
                O con correo
              </span>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Contraseña</Label>
                  <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link" type="button" className="ml-auto inline-block text-sm underline h-auto p-0">
                        ¿Olvidaste tu contraseña?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Restablecer Contraseña</DialogTitle>
                        <DialogDescription>
                          Ingresa tu correo electrónico y te enviaremos un enlace para que puedas restablecer tu contraseña.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Correo Electrónico</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="m@example.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            disabled={isResetLoading}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                        <Button type="button" onClick={handleResetPassword} disabled={isResetLoading}>
                          {isResetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Enviar Correo
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
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
                    <span className="sr-only">
                      {showPassword ? "Ocultar" : "Mostrar"} contraseña
                    </span>
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Sesión
              </Button>
            </form>
          </div>

          <div className="mt-4 text-center text-sm">
            ¿No tienes una cuenta?{" "}
            <Link href="/auth/register" className="underline">
              Regístrate
            </Link>
          </div>
          <Separator className="my-4" />
          <Button variant="ghost" asChild className="w-full text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la página de inicio
            </Link>
          </Button>
        </CardContent >
      </Card >
    </div >
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

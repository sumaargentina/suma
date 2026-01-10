
"use client";

import { useState } from "react";
import Link from "next/link";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
    const { sendPasswordReset } = useAuth();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const emailValidation = z.string().email("Correo electrónico inválido.").safeParse(email);
        if (!emailValidation.success) {
            toast({ variant: 'destructive', title: 'Error de Validación', description: 'Por favor, ingresa un correo electrónico válido.' });
            return;
        }

        setIsLoading(true);
        await sendPasswordReset(email);
        setIsLoading(false);
        setIsSuccess(true);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="mx-auto max-w-sm w-full">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Recuperar Contraseña</CardTitle>
                    <CardDescription>
                        {isSuccess
                            ? "¡Correo enviado! Revisa tu bandeja de entrada."
                            : "Ingresa tu correo electrónico para recibir un enlace de recuperación."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!isSuccess ? (
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
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar Enlace
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Hemos enviado un enlace a <strong>{email}</strong> con las instrucciones para restablecer tu contraseña.
                            </p>
                            <Button asChild className="w-full">
                                <Link href="/auth/login">Volver al Inicio de Sesión</Link>
                            </Button>
                        </div>
                    )}

                    <div className="mt-4 text-center text-sm">
                        <Link href="/auth/login" className="flex items-center justify-center text-muted-foreground hover:text-primary">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

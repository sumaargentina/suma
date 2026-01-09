"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link'; // New import
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, ExternalLink, BarChart3 } from "lucide-react"; // BarChart3 added
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';

interface PaymentIntegrationsTabProps {
    doctorId: string;
}

export function PaymentIntegrationsTab({ doctorId }: PaymentIntegrationsTabProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [integration, setIntegration] = useState<any>(null);
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        fetchIntegrationStatus();

        // Check for callback status
        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (success === 'mp_connected') {
            toast({
                title: '¡Conexión Exitosa!',
                description: 'Tu cuenta de MercadoPago se ha conectado correctamente. Ahora recibirás los pagos de tus citas automáticamente.',
                className: 'bg-green-50 border-green-200 text-green-800'
            });
            // Remove params to avoid double toasts on refresh
            router.replace('/doctor/dashboard?view=bank-details');
        } else if (error) {
            let msg = 'No se pudo conectar tu cuenta.';
            if (error === 'mp_connection_failed') msg = 'Error en la autorización con MercadoPago.';

            toast({
                variant: 'destructive',
                title: 'Error de Conexión',
                description: msg
            });
        }
    }, [doctorId, searchParams, router, toast]);

    const fetchIntegrationStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('doctor_integrations')
                .select('*')
                .eq('doctor_id', doctorId)
                .eq('provider', 'mercadopago')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                console.error('Error fetching integration:', error);
            }

            setIntegration(data);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = () => {
        // Redirigir al endpoint de autenticación
        window.location.href = `/api/integrations/mercadopago/auth?doctor_id=${doctorId}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Integraciones y Finanzas</h2>
                    <p className="text-muted-foreground">Gestiona tus cobros, cuentas bancarias y visualiza tus ingresos.</p>
                </div>
                {/* Nuevo Botón de Estadísticas */}
                <Link href="/doctor/dashboard/analytics">
                    <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary">
                        <BarChart3 className="h-4 w-4" />
                        Ver Estadísticas
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* MercadoPago Card */}
                <Card className="relative overflow-hidden border-2 transition-all hover:border-blue-500/50">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                {/* MP Logo placeholder */}
                                <span className="text-blue-600 font-bold text-xl">MP</span>
                            </div>
                            {integration?.is_active ? (
                                <Badge className="bg-green-500 hover:bg-green-600">Conectado</Badge>
                            ) : (
                                <Badge variant="outline">No conectado</Badge>
                            )}
                        </div>
                        <CardTitle className="mt-4">MercadoPago</CardTitle>
                        <CardDescription>
                            Recibe pagos con tarjetas, efectivo y dinero en cuenta.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                        {integration?.is_active ? (
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center text-green-600 gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Cuenta vinculada correctamente</span>
                                </div>
                                <div className="text-muted-foreground text-xs">
                                    ID Usuario MP: {integration.mp_user_id}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Cobros automáticos 24/7</li>
                                    <li>Dinero al instante en tu cuenta</li>
                                    <li>Todas las tarjetas aceptadas</li>
                                </ul>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="pt-4">
                        {isLoading ? (
                            <Button disabled className="w-full">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
                            </Button>
                        ) : integration?.is_active ? (
                            <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => toast({ title: "Contacta a soporte para desconectar", description: "Por seguridad, contacta a soporte para desvincular cuentas." })}>
                                Desconectar
                            </Button>
                        ) : (
                            <Button className="w-full bg-[#009EE3] hover:bg-[#008ED6] text-white" onClick={handleConnect}>
                                Conectar MercadoPago Connect
                                <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>

            {/* Info Alert */}
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Información Importante</AlertTitle>
                <AlertDescription>
                    Al conectar tu cuenta, aceptas que SUMA procese los cobros de tus citas.
                    El dinero ingresará directamente a tu cuenta de MercadoPago (menos la comisión de servicio).
                </AlertDescription>
            </Alert>
        </div>
    );
}

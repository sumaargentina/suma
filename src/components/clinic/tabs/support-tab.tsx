"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LifeBuoy, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SupportTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor completa todos los campos.' });
            return;
        }

        setLoading(true);
        try {
            // Placeholder - integrate with existing support ticket system
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast({ title: 'Ticket Enviado', description: 'Nuestro equipo te contactará pronto.' });
            setSubject('');
            setMessage('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el ticket.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Soporte</h2>
                <p className="text-muted-foreground">¿Necesitas ayuda? Envíanos un mensaje.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LifeBuoy className="h-5 w-5" />
                        Nuevo Ticket de Soporte
                    </CardTitle>
                    <CardDescription>Describe tu problema y te responderemos lo antes posible.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Asunto</Label>
                            <Input
                                id="subject"
                                placeholder="Ej: Problema con agenda de citas"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Mensaje</Label>
                            <Textarea
                                id="message"
                                placeholder="Describe el problema en detalle..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={loading}
                                rows={5}
                            />
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                            Enviar Ticket
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

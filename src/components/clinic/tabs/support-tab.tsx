"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
    createClinicSupportTicket,
    getClinicSupportTickets,
    addMessageToSupportTicket
} from '@/lib/supabaseService';
import { AdminSupportTicket, ChatMessage } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    LifeBuoy,
    Send,
    Loader2,
    Plus,
    MessageCircle,
    Clock,
    CheckCircle,
    Search,
    RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function SupportTab() {
    const { user } = useAuth();
    const { toast } = useToast();

    // Estados principales
    const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para crear ticket
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', description: '' });

    // Estados para detalle/chat
    const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const loadTickets = useCallback(async () => {
        if (!user?.id) return;
        try {
            const data = await getClinicSupportTickets(user.id);
            setTickets(data);
        } catch (error) {
            console.error('Error loading tickets:', error);
            // No mostramos toast error aquí para no saturar si falla algo menor
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id || !newTicket.subject.trim() || !newTicket.description.trim()) return;

        setIsCreating(true);
        try {
            await createClinicSupportTicket({
                clinicId: user.id,
                clinicName: user.name || 'Clínica',
                subject: newTicket.subject,
                description: newTicket.description
            });

            toast({ title: 'Ticket creado', description: 'Tu solicitud ha sido enviada a soporte.' });
            setIsCreateDialogOpen(false);
            setNewTicket({ subject: '', description: '' });
            loadTickets();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo crear el ticket.'
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedTicket || !replyMessage.trim()) return;

        const messageText = replyMessage.trim();
        setReplyMessage('');
        setIsSending(true);

        // Optimistic update
        const newMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            sender: 'user', // 'user' será convertido a 'clinic' en el backend o renderizado correctamente
            text: messageText,
            timestamp: new Date().toISOString()
        };

        const updatedTicket = {
            ...selectedTicket,
            messages: [...(selectedTicket.messages || []), newMessage]
        };
        setSelectedTicket(updatedTicket);

        try {
            await addMessageToSupportTicket(selectedTicket.id, {
                sender: 'clinic',
                text: messageText
            });
            // Recargar para obtener timestamps reales y estado
            loadTickets();
            // Podríamos actualizar selectedTicket con la respuesta real si la API la devolviera
        } catch (error) {
            console.error('Error sending message:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje.' });
        } finally {
            setIsSending(false);
        }
    };

    const handleViewTicket = (ticket: AdminSupportTicket) => {
        setSelectedTicket(ticket);
        setIsDetailDialogOpen(true);
        // Marcar como leído localmente si implementamos esa lógica
    };

    const filteredTickets = tickets.filter(t =>
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Soporte Técnico</h2>
                    <p className="text-muted-foreground">Comunícate con el administrador para resolver cualquier duda.</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Ticket
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <LifeBuoy className="h-5 w-5" /> Mis Tickets
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Buscar..."
                                    className="pl-8 h-9 w-[150px] sm:w-[250px]"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="ghost" size="icon" onClick={loadTickets}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Asunto</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Mensajes</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No tienes tickets de soporte registrados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTickets.map((ticket) => (
                                        <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewTicket(ticket)}>
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {format(parseISO(ticket.createdAt || ticket.date), 'dd MMM yyyy', { locale: es })}
                                            </TableCell>
                                            <TableCell className="font-medium">{ticket.subject}</TableCell>
                                            <TableCell>
                                                <Badge variant={ticket.status === 'abierto' ? 'default' : 'secondary'} className={cn(
                                                    ticket.status === 'abierto' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-gray-100 text-gray-800'
                                                )}>
                                                    {ticket.status === 'abierto' ? 'Abierto' : 'Cerrado'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1 text-muted-foreground">
                                                    <MessageCircle className="h-4 w-4" />
                                                    {ticket.messages?.length || 0}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewTicket(ticket); }}>
                                                    Ver
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {filteredTickets.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">No tienes tickets.</p>
                        ) : (
                            filteredTickets.map((ticket) => (
                                <div key={ticket.id} className="border rounded-lg p-4 space-y-2 active:bg-muted/50" onClick={() => handleViewTicket(ticket)}>
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold line-clamp-1">{ticket.subject}</h4>
                                        <Badge variant={ticket.status === 'abierto' ? 'default' : 'secondary'}>
                                            {ticket.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
                                        <span>{format(parseISO(ticket.createdAt || ticket.date), 'dd MMM yyyy', { locale: es })}</span>
                                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {ticket.messages?.length || 0}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Modal Crear Ticket */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo Ticket de Soporte</DialogTitle>
                        <DialogDescription>Describe tu problema detalladamente para poder ayudarte.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTicket} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Asunto</Label>
                            <Input
                                placeholder="Ej: Problema al cargar pacientes"
                                value={newTicket.subject}
                                onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Textarea
                                placeholder="Explica qué sucedió..."
                                rows={5}
                                value={newTicket.description}
                                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar Ticket
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Detalle Ticket / Chat */}
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="truncate">{selectedTicket?.subject}</span>
                            {selectedTicket && (
                                <Badge variant={selectedTicket.status === 'abierto' ? 'default' : 'secondary'}>
                                    {selectedTicket.status}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription className="line-clamp-1">
                            {selectedTicket?.description}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 border rounded-md bg-muted/10">
                        {/* Mensaje original como primer "mensaje" */}
                        {selectedTicket && (
                            <div className="flex flex-col gap-1 items-end">
                                <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none max-w-[85%]">
                                    <p className="text-sm">{selectedTicket.description}</p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {format(parseISO(selectedTicket.createdAt || selectedTicket.date), 'HH:mm', { locale: es })}
                                </span>
                            </div>
                        )}

                        {selectedTicket?.messages?.map((msg, idx) => {
                            const isMe = msg.sender === 'user' || msg.sender === 'clinic';
                            return (
                                <div key={msg.id || idx} className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                                    <div className={cn(
                                        "p-3 rounded-lg max-w-[85%] text-sm",
                                        isMe
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-background border rounded-tl-none shadow-sm"
                                    )}>
                                        <p>{msg.text}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {msg.timestamp ? formatDistanceToNow(parseISO(msg.timestamp), { locale: es, addSuffix: true }) : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-2">
                        {selectedTicket?.status === 'abierto' ? (
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Escribe un mensaje..."
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button size="icon" onClick={handleSendMessage} disabled={isSending || !replyMessage.trim()}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        ) : (
                            <div className="bg-muted p-3 text-center rounded-md text-sm text-muted-foreground">
                                <CheckCircle className="inline-block h-4 w-4 mr-2" />
                                Este ticket está cerrado.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}


"use client";

import { useState, useMemo } from 'react';
import type { AdminSupportTicket, Seller, ChatMessage } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/lib/auth';
import { useToast } from "@/hooks/use-toast";
import * as supabaseService from '@/lib/supabaseService';
import { MessageSquarePlus, Loader2, Send, Eye, Clock, CheckCircle } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const SupportTicketSchema = z.object({
  subject: z.string().min(5, "El asunto debe tener al menos 5 caracteres."),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
});

interface SupportTabProps {
  supportTickets: AdminSupportTicket[];
  sellerData: Seller;
  onUpdate: () => void;
}

export function SupportTab({ supportTickets, sellerData, onUpdate }: SupportTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [isSupportDetailDialogOpen, setIsSupportDetailDialogOpen] = useState(false);
  const [selectedSupportTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'abierto' | 'cerrado'>('all');

  // Ordenar tickets: más recientes primero y abiertos primero
  const sortedTickets = useMemo(() => {
    return [...supportTickets].sort((a, b) => {
      // Primero por estado (abiertos primero)
      if (a.status === 'abierto' && b.status !== 'abierto') return -1;
      if (a.status !== 'abierto' && b.status === 'abierto') return 1;

      // Luego por fecha (más recientes primero)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [supportTickets]);

  // Filtrar por estado
  const filteredTickets = useMemo(() => {
    if (statusFilter === 'all') return sortedTickets;
    return sortedTickets.filter(ticket => ticket.status === statusFilter);
  }, [sortedTickets, statusFilter]);

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || user.role !== 'seller') return;
    setIsSubmittingTicket(true);

    const formData = new FormData(e.currentTarget);
    const dataToValidate = {
      subject: formData.get('subject') as string,
      description: formData.get('description') as string,
    };

    const result = SupportTicketSchema.safeParse(dataToValidate);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: result.error.errors.map(err => err.message).join(' ') });
      setIsSubmittingTicket(false);
      return;
    }

    const newTicket: Omit<AdminSupportTicket, 'id' | 'messages'> = {
      userId: user.email, userName: user.name, userRole: 'seller', status: 'abierto',
      date: new Date().toISOString(), subject: result.data.subject, description: result.data.description,
    };

    try {
      await supabaseService.addSupportTicket(newTicket);
      onUpdate();
      setIsSupportDialogOpen(false);
      (e.target as HTMLFormElement).reset();
      toast({ title: "Ticket Enviado", description: "Tu solicitud ha sido enviada al equipo de soporte de SUMA." });
    } catch {
      toast({ variant: 'destructive', title: "Error", description: "No se pudo enviar el ticket." });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleViewTicket = (ticket: AdminSupportTicket) => {
    setSelectedTicket(ticket);
    setIsSupportDetailDialogOpen(true);
  };

  const handleSendSellerReply = async () => {
    if (!selectedSupportTicket || !replyMessage.trim() || !user) return;

    const messageText = replyMessage.trim();
    setReplyMessage("");

    // Optimistic update - mostrar mensaje inmediatamente
    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user' as const,
      text: messageText,
      timestamp: new Date().toISOString()
    };
    setSelectedTicket({
      ...selectedSupportTicket,
      messages: [...(selectedSupportTicket.messages || []), newMessage]
    });

    // Enviar al servidor
    try {
      await supabaseService.addMessageToSupportTicket(selectedSupportTicket.id, {
        sender: 'user',
        text: messageText
      });
      onUpdate();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje' });
    }
  };

  const openTicketsCount = sortedTickets.filter(t => t.status === 'abierto').length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Soporte Técnico
                {openTicketsCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {openTicketsCount} {openTicketsCount === 1 ? 'pendiente' : 'pendientes'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Gestiona tus tickets de soporte con el equipo de SUMA.</CardDescription>
            </div>
            <Button onClick={() => setIsSupportDialogOpen(true)} className="w-full sm:w-auto">
              <MessageSquarePlus className="mr-2 h-4 w-4" /> Crear Nuevo Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtro de estado */}
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={(value: 'all' | 'abierto' | 'cerrado') => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tickets</SelectItem>
                <SelectItem value="abierto">Abiertos</SelectItem>
                <SelectItem value="cerrado">Cerrados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vista de escritorio */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
                  <TableRow
                    key={ticket.id}
                    className={cn(
                      ticket.status === 'abierto' && "bg-blue-50 border-l-4 border-l-blue-500",
                      "hover:bg-muted/50 transition-colors"
                    )}
                  >
                    <TableCell className="font-medium">
                      {format(parseISO(ticket.createdAt || ticket.date), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{ticket.subject}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        ticket.status === 'abierto' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600',
                        'text-white capitalize'
                      )}>
                        {ticket.status === 'abierto' ? (
                          <>
                            <Clock className="mr-1 h-3 w-3" />
                            Abierto
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Cerrado
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewTicket(ticket)}>
                        <Eye className="mr-2 h-4 w-4" /> Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      {statusFilter === 'all' ? 'No tienes tickets de soporte.' : `No hay tickets ${statusFilter === 'abierto' ? 'abiertos' : 'cerrados'}.`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Vista móvil */}
          <div className="space-y-3 md:hidden">
            {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                className={cn(
                  "p-4 border rounded-lg space-y-3 transition-colors",
                  ticket.status === 'abierto' && "bg-blue-50 border-l-4 border-l-blue-500",
                  "hover:bg-muted/50"
                )}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{ticket.subject}</h3>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(ticket.createdAt || ticket.date), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Badge className={cn(
                    ticket.status === 'abierto' ? 'bg-blue-600' : 'bg-gray-500',
                    'text-white capitalize text-xs'
                  )}>
                    {ticket.status === 'abierto' ? (
                      <>
                        <Clock className="mr-1 h-3 w-3" />
                        Abierto
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Cerrado
                      </>
                    )}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleViewTicket(ticket)}
                >
                  <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                </Button>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                {statusFilter === 'all' ? 'No tienes tickets de soporte.' : `No hay tickets ${statusFilter === 'abierto' ? 'abiertos' : 'cerrados'}.`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Abrir un Ticket de Soporte</DialogTitle>
            <DialogDescription>Describe tu problema y el equipo de SUMA se pondrá en contacto contigo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subject" className="text-right">Asunto</Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="ej., Problema con un referido"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detalla tu inconveniente aquí..."
                  className="col-span-3"
                  rows={5}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmittingTicket}>
                {isSubmittingTicket && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupportDetailDialogOpen} onOpenChange={setIsSupportDetailDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ticket: {selectedSupportTicket?.subject}</DialogTitle>
            {selectedSupportTicket && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge className={cn(
                  selectedSupportTicket.status === 'abierto' ? 'bg-blue-600' : 'bg-gray-500',
                  'text-white capitalize'
                )}>
                  {selectedSupportTicket.status}
                </Badge>
                <span>•</span>
                <span>{format(parseISO(selectedSupportTicket.createdAt || selectedSupportTicket.date), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}</span>
              </div>
            )}
          </DialogHeader>
          {selectedSupportTicket && (
            <>
              <div className="flex-1 space-y-4 py-4 max-h-[50vh] overflow-y-auto pr-4">
                {(selectedSupportTicket.messages || []).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((msg) => (
                  <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'user' && 'justify-end')}>
                    {msg.sender === 'admin' && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">A</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn(
                      "p-3 rounded-lg max-w-xs shadow-sm",
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted rounded-bl-none'
                    )}>
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs text-right mt-1 opacity-70">
                        {formatDistanceToNow(parseISO(msg.timestamp), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                    {msg.sender === 'user' && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={sellerData?.profileImage} />
                        <AvatarFallback>{(selectedSupportTicket.userName || 'U').charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
              {selectedSupportTicket.status === 'abierto' && (
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder="Escribe tu respuesta..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={2}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendSellerReply();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendSellerReply}
                      disabled={!replyMessage.trim()}
                      size="icon"
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Presiona Enter para enviar, Shift+Enter para nueva línea
                  </p>
                </div>
              )}
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setIsSupportDetailDialogOpen(false)}>
                  Cerrar Ventana
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import type { AdminSupportTicket, ChatMessage } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import * as supabaseService from '@/lib/supabaseService';
import { Mail, Briefcase, User, Send, Check, Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

export function SupportTab() {
  const { toast } = useToast();

  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'abierto' | 'cerrado'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'doctor' | 'seller'>('all');

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await supabaseService.getSupportTickets();
      setTickets(data);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los tickets de soporte.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ordenar tickets: abiertos primero, luego por fecha (más recientes primero)
  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      // Primero por estado (abiertos primero)
      if (a.status === 'abierto' && b.status !== 'abierto') return -1;
      if (a.status !== 'abierto' && b.status === 'abierto') return 1;

      // Luego por fecha (más recientes primero)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [tickets]);

  // Filtrar tickets
  const filteredTickets = useMemo(() => {
    let filtered = sortedTickets;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.userRole === roleFilter);
    }

    return filtered;
  }, [sortedTickets, statusFilter, roleFilter]);

  const openTicketsCount = sortedTickets.filter(t => t.status === 'abierto').length;
  const doctorTicketsCount = sortedTickets.filter(t => t.userRole === 'doctor' && t.status === 'abierto').length;
  const sellerTicketsCount = sortedTickets.filter(t => t.userRole === 'seller' && t.status === 'abierto').length;

  const handleViewTicket = (ticket: AdminSupportTicket) => {
    setSelectedTicket(ticket);
    setIsDetailDialogOpen(true);
  };

  const handleSendAdminReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    const messageText = replyMessage.trim();
    setReplyMessage("");

    // Optimistic update - mostrar mensaje inmediatamente
    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: 'admin' as const,
      text: messageText,
      timestamp: new Date().toISOString()
    };
    setSelectedTicket({
      ...selectedTicket,
      messages: [...(selectedTicket.messages || []), newMessage]
    });

    // Enviar al servidor
    try {
      await supabaseService.addMessageToSupportTicket(selectedTicket.id, {
        sender: 'admin',
        text: messageText
      });
      fetchData();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje' });
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    await supabaseService.updateSupportTicket(selectedTicket.id, { status: 'cerrado' });
    setIsDetailDialogOpen(false);
    fetchData();
    toast({ title: 'Ticket Cerrado', description: `El ticket de ${selectedTicket.userName} ha sido cerrado.` });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Bandeja de Soporte Técnico
                {openTicketsCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {openTicketsCount} {openTicketsCount === 1 ? 'pendiente' : 'pendientes'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Gestiona las solicitudes de soporte de médicos y vendedoras.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select value={statusFilter} onValueChange={(value: 'all' | 'abierto' | 'cerrado') => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="abierto">Abiertos</SelectItem>
                <SelectItem value="cerrado">Cerrados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={(value: 'all' | 'doctor' | 'seller') => setRoleFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="doctor">Médicos</SelectItem>
                <SelectItem value="seller">Vendedoras</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estadísticas rápidas */}
          {openTicketsCount > 0 && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total Pendientes</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{openTicketsCount}</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Médicos</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{doctorTicketsCount}</p>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Vendedoras</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{sellerTicketsCount}</p>
              </div>
            </div>
          )}

          {/* Vista de escritorio */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className={cn(
                      ticket.status === 'abierto' && "bg-blue-50 border-l-4 border-l-blue-500",
                      "hover:bg-muted/50 transition-colors"
                    )}
                  >
                    <TableCell className="font-medium">
                      {format(parseISO(ticket.createdAt || ticket.date), 'dd MMM yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{ticket.userName}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.userRole === 'doctor' ? 'default' : 'secondary'} className="capitalize">
                        {ticket.userRole === 'doctor' ? 'Médico' : 'Vendedora'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
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
                        Ver Ticket
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      {statusFilter === 'all' && roleFilter === 'all'
                        ? 'No hay tickets de soporte.'
                        : `No hay tickets ${statusFilter !== 'all' ? statusFilter === 'abierto' ? 'abiertos' : 'cerrados' : ''} ${roleFilter !== 'all' ? `de ${roleFilter === 'doctor' ? 'médicos' : 'vendedoras'}` : ''}.`
                      }
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
                    <p className="text-xs text-muted-foreground">{ticket.userName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={ticket.userRole === 'doctor' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {ticket.userRole === 'doctor' ? 'Médico' : 'Vendedora'}
                    </Badge>
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
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(ticket.createdAt || ticket.date), 'dd MMM yyyy HH:mm', { locale: es })}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTicket(ticket)}
                  >
                    Ver Ticket
                  </Button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                {statusFilter === 'all' && roleFilter === 'all'
                  ? 'No hay tickets de soporte.'
                  : `No hay tickets ${statusFilter !== 'all' ? statusFilter === 'abierto' ? 'abiertos' : 'cerrados' : ''} ${roleFilter !== 'all' ? `de ${roleFilter === 'doctor' ? 'médicos' : 'vendedoras'}` : ''}.`
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ticket: {selectedTicket?.subject}</DialogTitle>
            {selectedTicket && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
                <DialogDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" /> {selectedTicket.userName}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" /> {selectedTicket.userId}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    <span className="capitalize">{selectedTicket.userRole === 'doctor' ? 'Médico' : 'Vendedora'}</span>
                  </span>
                </DialogDescription>
                <Badge className={cn(
                  selectedTicket.status === 'abierto' ? 'bg-blue-600' : 'bg-gray-500',
                  'text-white capitalize'
                )}>
                  {selectedTicket.status}
                </Badge>
              </div>
            )}
          </DialogHeader>
          {selectedTicket && (
            <>
              <div className="flex-1 space-y-4 py-4 max-h-[50vh] overflow-y-auto pr-4">
                {(selectedTicket.messages || []).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((msg) => (
                  <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'admin' && 'justify-end')}>
                    {msg.sender !== 'admin' && (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                        {(selectedTicket.userName || 'U').charAt(0)}
                      </div>
                    )}
                    <div className={cn(
                      "p-3 rounded-lg max-w-sm shadow-sm",
                      msg.sender === 'admin'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-background rounded-bl-none'
                    )}>
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs text-right mt-1 opacity-70">
                        {formatDistanceToNow(new Date(msg.timestamp), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                    {msg.sender === 'admin' && (
                      <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm">
                        A
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {selectedTicket.status === 'abierto' && (
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-end gap-2">
                    <Input
                      placeholder="Escribe tu respuesta..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendAdminReply();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendAdminReply}
                      disabled={!replyMessage.trim()}
                      size="icon"
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Presiona Enter para enviar
                  </p>
                </div>
              )}
            </>
          )}
          <DialogFooter className="pt-4">
            <Button variant="secondary" onClick={() => setIsDetailDialogOpen(false)}>
              Cerrar Ventana
            </Button>
            {selectedTicket?.status === 'abierto' && (
              <Button onClick={handleCloseTicket}>
                <Check className="mr-2 h-4 w-4" /> Marcar como Resuelto
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

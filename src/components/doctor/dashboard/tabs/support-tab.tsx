
"use client";

import { useState, useMemo } from "react";
import type { AdminSupportTicket } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Eye, Search, Filter, MessageCircle, Clock, CheckCircle, AlertCircle, Info, Calendar } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface SupportTabProps {
  supportTickets: AdminSupportTicket[];
  onOpenTicketDialog: () => void;
  onViewTicket: (ticket: AdminSupportTicket) => void;
  onCreateTestTickets?: () => void;
}

export function SupportTab({ supportTickets, onOpenTicketDialog, onViewTicket, onCreateTestTickets }: SupportTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "status" | "subject">("date");

  // Filtrar y ordenar tickets
  const filteredAndSortedTickets = useMemo(() => {
    const filtered = supportTickets.filter(ticket => {
      const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Ordenar tickets
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === "status") {
        // Priorizar tickets abiertos
        if (a.status === "abierto" && b.status !== "abierto") return -1;
        if (a.status !== "abierto" && b.status === "abierto") return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return a.subject.localeCompare(b.subject);
      }
    });

    return filtered;
  }, [supportTickets, searchTerm, statusFilter, sortBy]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = supportTickets.length;
    const open = supportTickets.filter(t => t.status === "abierto").length;
    const closed = total - open;
    return { total, open, closed };
  }, [supportTickets]);

  const getStatusIcon = (status: string) => {
    if (status === "abierto") return <AlertCircle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "abierto") return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageCircle className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Abiertos</p>
                <p className="text-lg md:text-2xl font-bold text-orange-600">{stats.open}</p>
              </div>
              <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Cerrados</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">{stats.closed}</p>
              </div>
              <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Tiempo Prom.</p>
                <p className="text-lg md:text-2xl font-bold">24h</p>
              </div>
              <Clock className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de filtro y búsqueda */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            Tickets de Soporte
          </CardTitle>
          <Button onClick={onOpenTicketDialog} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Ticket
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="abierto">Abiertos</SelectItem>
                  <SelectItem value="cerrado">Cerrados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: "date" | "status" | "subject") => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Por Fecha</SelectItem>
                  <SelectItem value="status">Por Estado</SelectItem>
                  <SelectItem value="subject">Por Asunto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vista móvil con cards */}
          <div className="block md:hidden space-y-3">
            {filteredAndSortedTickets.length > 0 ? (
              filteredAndSortedTickets.map(ticket => (
                <Card
                  key={ticket.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    ticket.status === "abierto" && "border-orange-200 bg-orange-50/30"
                  )}
                  onClick={() => onViewTicket(ticket)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate mb-1">{ticket.subject}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {ticket.description}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 ml-2 flex-shrink-0",
                          getStatusColor(ticket.status)
                        )}
                      >
                        {getStatusIcon(ticket.status)}
                        <span className="capitalize text-xs">{ticket.status}</span>
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(parseISO(ticket.createdAt || ticket.date), "dd MMM", { locale: es })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{ticket.messages ? ticket.messages.length : 0}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewTicket(ticket);
                        }}
                        className="h-7 px-2 text-xs hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <MessageCircle className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium text-muted-foreground">
                    {searchTerm || statusFilter !== "all"
                      ? "No se encontraron tickets"
                      : "No tienes tickets de soporte"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    {searchTerm || statusFilter !== "all"
                      ? "Intenta ajustar los filtros de búsqueda"
                      : "Crea tu primer ticket cuando necesites ayuda"
                    }
                  </p>
                  {!searchTerm && statusFilter === "all" && (
                    <Button onClick={onOpenTicketDialog} className="mt-2">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Crear Primer Ticket
                    </Button>
                  )}
                  {!searchTerm && statusFilter === "all" && onCreateTestTickets && (
                    <Button onClick={onCreateTestTickets} variant="outline" className="mt-2">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Crear Tickets de Prueba
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Vista de escritorio con tabla */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Asunto</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold">Mensajes</TableHead>
                  <TableHead className="font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTickets.length > 0 ? (
                  filteredAndSortedTickets.map(ticket => (
                    <TableRow
                      key={ticket.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors cursor-pointer",
                        ticket.status === "abierto" && "bg-orange-50/50"
                      )}
                      onClick={() => onViewTicket(ticket)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{format(parseISO(ticket.createdAt || ticket.date), "dd MMM", { locale: es })}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(ticket.createdAt || ticket.date), "HH:mm", { locale: es })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium truncate">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {ticket.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "flex items-center gap-1 px-2 py-1",
                            getStatusColor(ticket.status)
                          )}
                        >
                          {getStatusIcon(ticket.status)}
                          <span className="capitalize">{ticket.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {ticket.messages ? ticket.messages.length : 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewTicket(ticket);
                          }}
                          className="hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <MessageCircle className="h-12 w-12 text-muted-foreground" />
                        <p className="text-lg font-medium text-muted-foreground">
                          {searchTerm || statusFilter !== "all"
                            ? "No se encontraron tickets"
                            : "No tienes tickets de soporte"
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm || statusFilter !== "all"
                            ? "Intenta ajustar los filtros de búsqueda"
                            : "Crea tu primer ticket cuando necesites ayuda"
                          }
                        </p>
                        {!searchTerm && statusFilter === "all" && (
                          <Button onClick={onOpenTicketDialog} className="mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Primer Ticket
                          </Button>
                        )}
                        {!searchTerm && statusFilter === "all" && onCreateTestTickets && (
                          <Button onClick={onCreateTestTickets} variant="outline" className="mt-2">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Crear Tickets de Prueba
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Información adicional */}
          {filteredAndSortedTickets.length > 0 && (
            <div className="mt-4 p-3 md:p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Info className="h-4 w-4" />
                <span className="text-xs md:text-sm">
                  Mostrando {filteredAndSortedTickets.length} de {supportTickets.length} tickets
                  {searchTerm && ` para "${searchTerm}"`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

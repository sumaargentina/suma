
"use client";
import { useMemo, useState } from "react";
import type { Appointment, DoctorAddress } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { DoctorAppointmentCard } from "@/components/doctor/appointment-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Filter, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';

export function AppointmentsTab({
  appointments,
  onOpenDialog,
  onOpenWalkInDialog,
  offices = [],
  doctorAddresses = []
}: {
  appointments: Appointment[];
  onOpenDialog: (type: 'appointment' | 'chat', appointment: Appointment) => void;
  onOpenWalkInDialog?: () => void;
  offices?: string[];
  doctorAddresses?: DoctorAddress[];
}) {
  const [pendingMonthFilter, setPendingMonthFilter] = useState('all');
  const [selectedOffice, setSelectedOffice] = useState('all');

  // Estados para paginación y filtros del historial
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [isFilterActive, setIsFilterActive] = useState(false);
  const itemsPerPage = 15;

  const { todayAppointments, tomorrowAppointments, upcomingAppointments, filteredPastAppointments, totalPages } = useMemo(() => {
    // Filtrar citas por consultorio
    const filteredAppointments = selectedOffice === 'all'
      ? appointments
      : appointments.filter(appt => appt.doctorAddress === selectedOffice);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, 'yyyy-MM-dd');

    const tomorrow = addDays(today, 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    const todayAppts: Appointment[] = [];
    const tomorrowAppts: Appointment[] = [];
    const upcomingAppts: Appointment[] = [];
    const pastAppts: Appointment[] = [];

    filteredAppointments.forEach(appt => {
      // Usar la fecha como string para comparaciones más precisas
      const apptDateStr = appt.date;

      // Comparar fechas como strings para evitar problemas de zona horaria
      const isPast = appt.attendance !== 'Pendiente' || apptDateStr < todayStr;
      const isToday = apptDateStr === todayStr;
      const isTomorrow = apptDateStr === tomorrowStr;
      const isUpcoming = apptDateStr > tomorrowStr;

      if (isPast) {
        pastAppts.push(appt);
      } else if (isToday) {
        todayAppts.push(appt);
      } else if (isTomorrow) {
        tomorrowAppts.push(appt);
      } else if (isUpcoming) {
        upcomingAppts.push(appt);
      } else {
        // Si no se categoriza, por defecto va a próximas
        upcomingAppts.push(appt);
      }
    });

    const sortByTime = (a: Appointment, b: Appointment) => a.time.localeCompare(b.time);
    todayAppts.sort(sortByTime);
    tomorrowAppts.sort(sortByTime);
    upcomingAppts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time));
    pastAppts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time));

    // Aplicar filtro por fecha si está activo
    let filteredPast = pastAppts;
    if (isFilterActive && dateFilter) {
      filteredPast = pastAppts.filter(appt => appt.date === dateFilter);
    }

    // Calcular paginación
    const totalPages = Math.ceil(filteredPast.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPast = filteredPast.slice(startIndex, endIndex);

    return {
      todayAppointments: todayAppts,
      tomorrowAppointments: tomorrowAppts,
      upcomingAppointments: upcomingAppts,
      filteredPastAppointments: paginatedPast,
      totalPages
    };
  }, [appointments, dateFilter, isFilterActive, currentPage, itemsPerPage, selectedOffice]);

  const pendingMonthsForFilter = useMemo(() => {
    const months = new Set<string>();
    upcomingAppointments.forEach(appt => {
      months.add(format(new Date(appt.date + 'T00:00:00'), 'yyyy-MM'));
    });
    return Array.from(months).sort((a, b) => a.localeCompare(b));
  }, [upcomingAppointments]);

  const filteredPendingAppointments = useMemo(() => {
    if (pendingMonthFilter === 'all') {
      return upcomingAppointments;
    }

    return upcomingAppointments.filter(appt => appt.date.startsWith(pendingMonthFilter));
  }, [upcomingAppointments, pendingMonthFilter]);

  const handleDateFilter = (date: string) => {
    setDateFilter(date);
    setIsFilterActive(date !== '');
    setCurrentPage(1); // Resetear a la primera página
  };

  const clearFilter = () => {
    setDateFilter('');
    setIsFilterActive(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getOfficeName = (address?: string) => {
    if (!address) return undefined;
    const found = doctorAddresses.find(a => a.address === address);
    return found ? found.name : undefined;
  };

  return (
    <div className="space-y-8">
      {/* Filtro de Consultorio */}
      {offices.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={selectedOffice === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedOffice('all')}
            size="sm"
            className="rounded-full"
          >
            Todos
          </Button>
          {offices.map(office => (
            <Button
              key={office}
              variant={selectedOffice === office ? 'default' : 'outline'}
              onClick={() => setSelectedOffice(office)}
              size="sm"
              className="rounded-full"
            >
              {office}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-xl">Citas de Hoy ({todayAppointments.length})</CardTitle>
              {onOpenWalkInDialog && (
                <Button
                  onClick={onOpenWalkInDialog}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Paciente Sin Cita
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
            {todayAppointments.length > 0 ? (
              todayAppointments.map(appt => <DoctorAppointmentCard key={appt.id} appointment={appt} onOpenDialog={onOpenDialog} officeName={getOfficeName(appt.doctorAddress)} />)
            ) : (
              <p className="text-center text-muted-foreground py-10">No hay citas para hoy.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-xl">Citas de Mañana ({tomorrowAppointments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
            {tomorrowAppointments.length > 0 ? (
              tomorrowAppointments.map(appt => (
                <div key={appt.id}>
                  <DoctorAppointmentCard appointment={appt} onOpenDialog={onOpenDialog} officeName={getOfficeName(appt.doctorAddress)} />
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-10">No hay citas para mañana.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base md:text-xl">Próximas Citas Pendientes</CardTitle>
              <CardDescription>Citas a partir de pasado mañana.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={pendingMonthFilter} onValueChange={setPendingMonthFilter}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Filtrar por mes..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  <Separator />
                  {pendingMonthsForFilter.map(month => (
                    <SelectItem key={month} value={month}>
                      {format(new Date(month + '-02'), "LLLL yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredPendingAppointments.length > 0 ? (
            filteredPendingAppointments.map(appt => <DoctorAppointmentCard key={appt.id} appointment={appt} onOpenDialog={onOpenDialog} officeName={getOfficeName(appt.doctorAddress)} />)
          ) : (
            <p className="text-center text-muted-foreground py-10">
              No hay más citas pendientes.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Separador visual para Historial */}
      <div className="relative py-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-dashed" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground font-medium">
            Historial y Citas Finalizadas
          </span>
        </div>
      </div>

      <Card className="bg-muted/10 border-muted">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base md:text-xl">Historial de Citas</CardTitle>
                <CardDescription>Citas pasadas y atendidas.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Filtrar por fecha..."
                    value={dateFilter}
                    onChange={(e) => handleDateFilter(e.target.value)}
                    className="pl-10 w-full sm:w-[200px]"
                  />
                </div>
                {isFilterActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilter}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {/* Filtro de Consultorio en Historial */}
            {offices.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground self-center mr-2">Consultorio:</span>
                <Button
                  variant={selectedOffice === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedOffice('all')}
                  size="sm"
                  className="rounded-full h-7 text-xs"
                >
                  Todos
                </Button>
                {offices.map(office => (
                  <Button
                    key={office}
                    variant={selectedOffice === office ? 'default' : 'outline'}
                    onClick={() => setSelectedOffice(office)}
                    size="sm"
                    className="rounded-full h-7 text-xs"
                  >
                    {office}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredPastAppointments.length > 0 ? (
            filteredPastAppointments.map(appt => <DoctorAppointmentCard key={appt.id} appointment={appt} onOpenDialog={onOpenDialog} isPast officeName={getOfficeName(appt.doctorAddress)} />)
          ) : (
            <p className="text-center text-muted-foreground py-10">
              {isFilterActive
                ? 'No se encontraron citas para la fecha seleccionada.'
                : 'No hay citas en el historial.'
              }
            </p>
          )}
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex justify-center">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

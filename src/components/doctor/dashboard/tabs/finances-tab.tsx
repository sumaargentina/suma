
"use client";

import { useMemo, useState } from "react";
import type { Appointment, Expense, Doctor } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wallet,
  PlusCircle,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  PieChart,
  Building2,
  Filter,
  Video
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { FinancialCharts } from '../financial-charts';

const timeRangeLabels: Record<string, string> = {
  today: 'Hoy',
  week: 'Esta Semana',
  month: 'Este Mes',
  year: 'Este Año',
  all: 'Global',
};

interface FinancesTabProps {
  doctorData: Doctor;
  appointments: Appointment[];
  onOpenExpenseDialog: (expense: Expense | null) => void;
  onDeleteItem: (type: 'expense', id: string) => void;
}

interface IncomeData {
  date: string;
  amount: number;
  appointments: number;
  patients: string[];
}

interface OfficeStats {
  office: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  appointments: number;
  paidAppointments: number;
  uniquePatients: number;
}

export function FinancesTab({ doctorData, appointments, onOpenExpenseDialog, onDeleteItem }: FinancesTabProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');

  // Obtener lista de consultorios registrados del médico (desde módulo Addresses)
  const offices = useMemo(() => {
    // Usar los consultorios registrados en el módulo de direcciones
    const officeNames = (doctorData.addresses || []).map(addr => addr.name);

    // Agregar "Consultas Online" si está habilitado
    if (doctorData.onlineConsultation?.enabled) {
      officeNames.push('Consultas Online');
    }

    return officeNames.sort();
  }, [doctorData.addresses, doctorData.onlineConsultation]);

  // Calcular estadísticas financieras por consultorio
  const officeStats = useMemo((): OfficeStats[] => {
    let filteredAppointments = appointments;
    let filteredExpenses = doctorData.expenses || [];

    // Filtrar por rango de tiempo
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date, endDate: Date;
      switch (timeRange) {
        case 'today':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now, { locale: es });
          endDate = endOfWeek(now, { locale: es });
          break;
        case 'year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        case 'month':
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
      }

      filteredAppointments = appointments.filter(a => {
        const apptDate = parseISO(a.date);
        return apptDate >= startDate && apptDate <= endDate;
      });
      filteredExpenses = (doctorData.expenses || []).filter(e => {
        const expenseDate = parseISO(e.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    }

    // Agrupar por consultorio
    const statsMap = new Map<string, OfficeStats>();

    // Procesar citas
    filteredAppointments.forEach(apt => {
      // Determinar el consultorio: si es online, usar "Consultas Online", sino usar el campo office
      const office = apt.consultationType === 'online'
        ? 'Consultas Online'
        : (apt.office || 'Sin consultorio');

      const existing = statsMap.get(office) || {
        office,
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        appointments: 0,
        paidAppointments: 0,
        uniquePatients: 0,
      };

      existing.appointments++;
      if (apt.paymentStatus === 'Pagado') {
        existing.totalRevenue += apt.totalPrice;
        existing.paidAppointments++;
      }

      statsMap.set(office, existing);
    });

    // Procesar gastos
    filteredExpenses.forEach(exp => {
      const office = exp.office || 'Sin consultorio';
      const existing = statsMap.get(office) || {
        office,
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        appointments: 0,
        paidAppointments: 0,
        uniquePatients: 0,
      };

      existing.totalExpenses += exp.amount;
      statsMap.set(office, existing);
    });

    // Calcular pacientes únicos y beneficio neto
    statsMap.forEach((stats, office) => {
      const officeAppointments = filteredAppointments.filter(a => {
        const apptOffice = a.consultationType === 'online'
          ? 'Consultas Online'
          : (a.office || 'Sin consultorio');
        return apptOffice === office;
      });
      stats.uniquePatients = new Set(officeAppointments.map(a => a.patientId)).size;
      stats.netProfit = stats.totalRevenue - stats.totalExpenses;
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [doctorData, appointments, timeRange]);

  // Estadísticas totales (todos los consultorios)
  const totalStats = useMemo(() => {
    return officeStats.reduce((acc, stats) => ({
      totalRevenue: acc.totalRevenue + stats.totalRevenue,
      totalExpenses: acc.totalExpenses + stats.totalExpenses,
      netProfit: acc.netProfit + stats.netProfit,
      appointments: acc.appointments + stats.appointments,
      paidAppointments: acc.paidAppointments + stats.paidAppointments,
      uniquePatients: acc.uniquePatients + stats.uniquePatients,
      pendingPayments: 0, // Se calculará después
    }), {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      appointments: 0,
      paidAppointments: 0,
      uniquePatients: 0,
      pendingPayments: 0,
    });
  }, [officeStats]);

  // Estadísticas del consultorio seleccionado
  const selectedStats = useMemo(() => {
    if (selectedOffice === 'all') {
      return totalStats;
    }
    return officeStats.find(s => s.office === selectedOffice) || {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      appointments: 0,
      paidAppointments: 0,
      uniquePatients: 0,
    };
  }, [selectedOffice, officeStats, totalStats]);

  // Filtrar gastos por consultorio seleccionado
  const filteredExpenses = useMemo(() => {
    let expenses = doctorData.expenses || [];

    // Filtrar por consultorio
    if (selectedOffice !== 'all') {
      expenses = expenses.filter(e => (e.office || 'Sin consultorio') === selectedOffice);
    }

    // Filtrar por tiempo
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date, endDate: Date;
      switch (timeRange) {
        case 'today': startDate = startOfDay(now); endDate = endOfDay(now); break;
        case 'week': startDate = startOfWeek(now, { locale: es }); endDate = endOfWeek(now, { locale: es }); break;
        case 'year': startDate = startOfYear(now); endDate = endOfYear(now); break;
        case 'month': default: startDate = startOfMonth(now); endDate = endOfMonth(now); break;
      }

      expenses = expenses.filter(e => {
        const expenseDate = parseISO(e.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    }

    return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [doctorData.expenses, timeRange, selectedOffice]);

  return (
    <div className="space-y-6">
      {/* Filtros de tiempo y consultorio */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                <BarChart3 className="h-5 w-5" />
                Panel Financiero
              </CardTitle>
              <CardDescription>
                Análisis detallado de ingresos, gastos y rentabilidad por consultorio
              </CardDescription>
            </div>

            <Button
              onClick={() => onOpenExpenseDialog(null)}
              className="bg-red-600 hover:bg-red-700 shadow-md font-semibold text-white animate-pulse-slow"
              size="default"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              REGISTRAR GASTO
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtro de tiempo */}
          <div className="flex w-full justify-between gap-1 md:gap-2">
            <Button
              variant={timeRange === 'today' ? 'default' : 'outline'}
              onClick={() => setTimeRange('today')}
              size="sm"
              className="flex-1 px-1 py-1 text-xs md:text-sm min-w-0"
            >
              Hoy
            </Button>
            <Button
              variant={timeRange === 'week' ? 'default' : 'outline'}
              onClick={() => setTimeRange('week')}
              size="sm"
              className="flex-1 px-1 py-1 text-xs md:text-sm min-w-0"
            >
              Semana
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'outline'}
              onClick={() => setTimeRange('month')}
              size="sm"
              className="flex-1 px-1 py-1 text-xs md:text-sm min-w-0"
            >
              Mes
            </Button>
            <Button
              variant={timeRange === 'year' ? 'default' : 'outline'}
              onClick={() => setTimeRange('year')}
              size="sm"
              className="flex-1 px-1 py-1 text-xs md:text-sm min-w-0"
            >
              Año
            </Button>
            <Button
              variant={timeRange === 'all' ? 'default' : 'outline'}
              onClick={() => setTimeRange('all')}
              size="sm"
              className="flex-1 px-1 py-1 text-xs md:text-sm min-w-0"
            >
              Global
            </Button>
          </div>

          {/* Filtro de consultorio - Siempre visible */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue placeholder="Seleccionar consultorio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Todos los consultorios
                    </div>
                  </SelectItem>
                  {offices.map(office => (
                    <SelectItem key={office} value={office}>
                      <div className="flex items-center gap-2">
                        {office === 'Consultas Online' ? (
                          <Video className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                        {office}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="Sin consultorio">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Sin consultorio asignado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {offices.length === 0 && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <span className="text-blue-600">ℹ️</span>
                <span>
                  Para separar finanzas por consultorio, agrega el campo "Consultorio" al crear gastos.
                  Ejemplo: "Consultorio Centro", "Consultorio Norte", etc.
                </span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen por consultorios (solo si hay más de uno) */}
      {offices.length > 1 && selectedOffice === 'all' && (
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Building2 className="h-5 w-5" />
              Resumen por Consultorio
            </CardTitle>
            <CardDescription className="text-blue-700">
              Comparativa de rendimiento entre tus diferentes ubicaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {officeStats.map((stats, index) => (
                <Card key={stats.office} className="border-l-4" style={{ borderLeftColor: index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : '#8b5cf6' }}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {stats.office === 'Consultas Online' ? (
                            <Video className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Building2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{stats.office}</h4>
                          <p className="text-sm text-muted-foreground">
                            {stats.appointments} citas • {stats.uniquePatients} pacientes
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Ingresos</p>
                          <p className="font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Gastos</p>
                          <p className="font-bold text-red-600">${stats.totalExpenses.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Beneficio</p>
                          <p className={`font-bold ${stats.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            ${stats.netProfit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${selectedStats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedStats.paidAppointments} citas pagadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${selectedStats.totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} gastos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio Neto</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${selectedStats.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              ${selectedStats.netProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedStats.netProfit >= 0 ? 'Ganancia' : 'Pérdida'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Únicos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {selectedStats.uniquePatients}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedStats.appointments} citas totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes vistas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="statistics">Estadísticas</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
        </TabsList>

        {/* Tab de Resumen */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Resumen de Pagos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Citas Pagadas:</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {selectedStats.paidAppointments}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Citas:</span>
                  <Badge variant="outline">
                    {selectedStats.appointments}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribución
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ingresos</span>
                    <span className="font-medium">${selectedStats.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${selectedStats.totalRevenue > 0 ? 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Gastos</span>
                    <span className="font-medium">${selectedStats.totalExpenses.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${selectedStats.totalRevenue > 0 ? (selectedStats.totalExpenses / selectedStats.totalRevenue) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Estadísticas */}
        <TabsContent value="statistics" className="space-y-4">
          <FinancialCharts
            appointments={appointments}
            expenses={doctorData.expenses || []}
            timeRange={timeRange}
            selectedOffice={selectedOffice}
          />
        </TabsContent>

        {/* Tab de Gastos */}
        <TabsContent value="expenses" className="space-y-4">
          <Card className="border-2 border-red-200 bg-red-50/30">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <TrendingDown className="h-6 w-6" />
                  Registro de Gastos
                  {selectedOffice !== 'all' && (
                    <Badge variant="outline" className="ml-2">
                      {selectedOffice}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-red-700">
                  Administra tus gastos operativos y de consultorio
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => onOpenExpenseDialog(null)} className="bg-red-600 hover:bg-red-700">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Agregar Gasto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Vista móvil con cards */}
              <div className="block sm:hidden space-y-3">
                {filteredExpenses.length > 0 ? filteredExpenses.map(expense => (
                  <Card key={expense.id} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{expense.description}</h4>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(expense.date), 'dd/MM/yyyy', { locale: es })}
                          </p>
                          {expense.office && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {expense.office}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-600 text-lg">
                            ${expense.amount.toFixed(2)}
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">
                            {expense.category || 'Sin categoría'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenExpenseDialog(expense)}
                          className="flex-1"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteItem('expense', expense.id)}
                          className="flex-1"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="text-center py-8">
                    <TrendingDown className="h-12 w-12 mx-auto mb-4 text-red-400" />
                    <p className="text-muted-foreground mb-4">No hay gastos registrados.</p>
                    <Button
                      onClick={() => onOpenExpenseDialog(null)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Agregar primer gasto
                    </Button>
                  </div>
                )}
              </div>

              {/* Vista desktop con tabla */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Consultorio</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="w-[120px] text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length > 0 ? filteredExpenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {format(parseISO(expense.date), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>
                          {expense.office ? (
                            <Badge variant="secondary" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {expense.office}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {expense.category || 'Sin categoría'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600 font-bold">
                          ${expense.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => onOpenExpenseDialog(expense)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => onDeleteItem('expense', expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          <div className="flex flex-col items-center gap-2">
                            <TrendingDown className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No hay gastos registrados.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenExpenseDialog(null)}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Agregar primer gasto
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

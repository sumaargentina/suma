"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { getClinicAppointments, getClinicExpenses, addClinicExpense, deleteClinicExpense } from '@/lib/supabaseService';
import { Appointment, ClinicExpense, EXPENSE_CATEGORIES } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign, TrendingUp, TrendingDown, PiggyBank, RefreshCw, CalendarDays, Plus, Trash2, Filter, ArrowUpRight, ArrowDownRight, Download, FileDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function FinancesTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
    const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [expenses, setExpenses] = useState<ClinicExpense[]>([]);
    const [activeTab, setActiveTab] = useState("overview");

    // Expense Form State
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Otros', date: format(new Date(), 'yyyy-MM-dd') });
    const [submittingExpense, setSubmittingExpense] = useState(false);

    // Pending Details State
    const [isPendingDetailsOpen, setIsPendingDetailsOpen] = useState(false);
    const [isExpensesDetailsOpen, setIsExpensesDetailsOpen] = useState(false);

    // Transaction History State
    const [txnFilterType, setTxnFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [txnFilterStatus, setTxnFilterStatus] = useState<'all' | 'Pagado' | 'Pendiente'>('all');
    const [txnPage, setTxnPage] = useState(1);
    const TXN_PAGE_SIZE = 20;

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id, startDate, endDate]);

    // Apply date filter presets
    const applyDatePreset = (preset: 'today' | 'week' | 'month' | 'year') => {
        const now = new Date();
        setDateFilter(preset);
        switch (preset) {
            case 'today':
                setStartDate(format(now, 'yyyy-MM-dd'));
                setEndDate(format(now, 'yyyy-MM-dd'));
                break;
            case 'week':
                setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
                setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
                break;
            case 'month':
                setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
                break;
            case 'year':
                setStartDate(format(startOfYear(now), 'yyyy-MM-dd'));
                setEndDate(format(endOfYear(now), 'yyyy-MM-dd'));
                break;
        }
    };

    const loadData = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const [appointmentsData, expensesData] = await Promise.all([
                getClinicAppointments(user.id),
                getClinicExpenses(user.id)
            ]);

            // Filter by date range
            const start = parseISO(startDate);
            const end = parseISO(endDate);

            const filteredAppointments = appointmentsData.filter(app => {
                const appDate = parseISO(app.date);
                return isWithinInterval(appDate, { start, end });
            });

            const filteredExpenses = expensesData.filter(exp => {
                const expDate = parseISO(exp.date);
                return isWithinInterval(expDate, { start, end });
            });

            setAppointments(filteredAppointments);
            setExpenses(filteredExpenses);

        } catch (error) {
            console.error('Error loading finances:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos financieros.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        try {
            setSubmittingExpense(true);
            await addClinicExpense({
                clinicId: user.id,
                description: newExpense.description,
                amount: parseFloat(newExpense.amount),
                category: newExpense.category,
                date: newExpense.date
            });

            toast({ title: 'Gasto registrado', description: 'El gasto se ha guardado correctamente.' });
            setIsExpenseDialogOpen(false);
            setNewExpense({ description: '', amount: '', category: 'Otros', date: format(new Date(), 'yyyy-MM-dd') });
            loadData();
        } catch (error) {
            console.error('Error adding expense:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el gasto.' });
        } finally {
            setSubmittingExpense(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;
        try {
            await deleteClinicExpense(id);
            toast({ title: 'Gasto eliminado' });
            loadData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el gasto.' });
        }
    };

    // Calculations
    const stats = useMemo(() => {
        // Only count as income if: Paid AND (Attended OR Pending attendance)
        // No-shows with payment should NOT count (refund pending)
        const totalIncome = appointments
            .filter(app => app.paymentStatus === 'Pagado' && app.attendance !== 'No Asistió')
            .reduce((sum, app) => sum + (app.totalPrice || 0), 0);

        const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        const netIncome = totalIncome - totalExpenses;

        // Pending = not paid yet (and not no-show)
        const pendingIncome = appointments
            .filter(app => app.paymentStatus === 'Pendiente' && app.attendance !== 'No Asistió')
            .reduce((sum, app) => sum + (app.totalPrice || 0), 0);

        // Refunds pending = Paid but no-show
        const refundsPending = appointments
            .filter(app => app.paymentStatus === 'Pagado' && app.attendance === 'No Asistió')
            .reduce((sum, app) => sum + (app.totalPrice || 0), 0);

        return { totalIncome, totalExpenses, netIncome, pendingIncome, refundsPending };
    }, [appointments, expenses]);

    // Chart Data
    const chartData = useMemo(() => {
        const dailyData: Record<string, { date: string, income: number, expense: number }> = {};

        // Generate all days in the selected range
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        let current = start;

        while (current <= end) {
            const dateStr = format(current, 'yyyy-MM-dd');
            const label = format(current, 'dd/MM');
            dailyData[dateStr] = { date: label, income: 0, expense: 0 };
            current = new Date(current.getTime() + 24 * 60 * 60 * 1000); // Add one day
        }

        appointments.forEach(app => {
            if (app.paymentStatus === 'Pagado' && dailyData[app.date]) {
                dailyData[app.date].income += (app.totalPrice || 0);
            }
        });

        expenses.forEach(exp => {
            if (dailyData[exp.date]) {
                dailyData[exp.date].expense += Number(exp.amount);
            }
        });

        return Object.values(dailyData);
    }, [appointments, expenses, startDate, endDate]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading && !stats.totalIncome) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Finanzas</h2>
                    <p className="text-muted-foreground">Gestiona los ingresos y egresos de tu clínica.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center border rounded-md overflow-hidden">
                        <Button
                            variant={dateFilter === 'today' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => applyDatePreset('today')}
                            className="rounded-none"
                        >
                            Hoy
                        </Button>
                        <Button
                            variant={dateFilter === 'week' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => applyDatePreset('week')}
                            className="rounded-none"
                        >
                            Semana
                        </Button>
                        <Button
                            variant={dateFilter === 'month' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => applyDatePreset('month')}
                            className="rounded-none"
                        >
                            Mes
                        </Button>
                        <Button
                            variant={dateFilter === 'year' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => applyDatePreset('year')}
                            className="rounded-none"
                        >
                            Año
                        </Button>
                    </div>
                    <div className="flex items-center gap-1">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setDateFilter('custom'); setStartDate(e.target.value); }}
                            className="w-[140px] h-9"
                        />
                        <span className="text-muted-foreground">a</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setDateFilter('custom'); setEndDate(e.target.value); }}
                            className="w-[140px] h-9"
                        />
                    </div>

                    <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="gap-2">
                                <Plus className="h-4 w-4" /> Registrar Gasto
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
                                <DialogDescription>Ingresa los detalles del gasto de la clínica.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddExpense} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="desc">Descripción</Label>
                                    <Input id="desc" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} required placeholder="Ej: Pago de alquiler" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Monto</Label>
                                        <Input id="amount" type="number" min="0" step="0.01" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} required placeholder="0.00" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Fecha</Label>
                                        <Input id="date" type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cat">Categoría</Label>
                                    <Select value={newExpense.category} onValueChange={val => setNewExpense({ ...newExpense, category: val })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EXPENSE_CATEGORIES.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={submittingExpense}>{submittingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isPendingDetailsOpen} onOpenChange={setIsPendingDetailsOpen}>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Pendientes de Cobro</DialogTitle>
                                <DialogDescription>Citas con estado de pago "Pendiente" en el periodo seleccionado.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Paciente</TableHead>
                                            <TableHead>Médico/Servicio</TableHead>
                                            <TableHead>Asistencia</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {appointments.filter(app => app.paymentStatus === 'Pendiente' && app.attendance !== 'No Asistió').length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No hay cobros pendientes.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            appointments
                                                .filter(app => app.paymentStatus === 'Pendiente' && app.attendance !== 'No Asistió')
                                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                .map(app => {
                                                    const appDate = parseISO(app.date);
                                                    const isPast = appDate < new Date(new Date().setHours(0, 0, 0, 0));
                                                    return (
                                                        <TableRow key={app.id} className={isPast ? "bg-red-50 hover:bg-red-100" : ""}>
                                                            <TableCell>
                                                                <div className={cn("font-medium", isPast && "text-red-700")}>
                                                                    {format(appDate, 'dd/MM/yyyy')}
                                                                </div>
                                                                <div className={cn("text-xs", isPast ? "text-red-500" : "text-muted-foreground")}>
                                                                    {app.time}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="font-medium">{app.patientName}</TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">{app.doctorName || app.serviceName || '-'}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={cn(
                                                                    app.attendance === 'Atendido' && "border-green-500 text-green-600",
                                                                    app.attendance === 'Pendiente' && "border-slate-400 text-slate-500"
                                                                )}>
                                                                    {app.attendance || 'Pendiente'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-yellow-600">
                                                                {formatCurrency(app.totalPrice || 0)}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => setIsPendingDetailsOpen(false)}>Cerrar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isExpensesDetailsOpen} onOpenChange={setIsExpensesDetailsOpen}>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Detalle de Gastos</DialogTitle>
                                <DialogDescription>Listado de gastos registrados en el periodo seleccionado.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expenses.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No hay gastos registrados.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            expenses.map(exp => (
                                                <TableRow key={exp.id}>
                                                    <TableCell>{format(parseISO(exp.date), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell>{exp.description}</TableCell>
                                                    <TableCell><Badge variant="outline">{exp.category}</Badge></TableCell>
                                                    <TableCell className="text-right font-medium text-red-600">
                                                        -{formatCurrency(Number(exp.amount))}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90" onClick={() => handleDeleteExpense(exp.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => setIsExpensesDetailsOpen(false)}>Cerrar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" size="icon" onClick={() => {
                        // Export to CSV
                        const headers = ["Fecha", "Tipo", "Descripción", "Monto", "Método/Categoría", "Estado"];
                        const rows = [
                            ...appointments.filter(a => a.paymentStatus === 'Pagado').map(a => [a.date, 'Ingreso', `Cita: ${a.patientName} (${a.doctorName || a.serviceName || 'Servicio'})`, a.totalPrice, a.paymentMethod, 'Pagado']),
                            ...expenses.map(e => [e.date, 'Gasto', e.description, `-${e.amount}`, e.category, 'Confirmado'])
                        ].sort((a, b) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());

                        const csvContent = "data:text/csv;charset=utf-8,"
                            + headers.join(",") + "\n"
                            + rows.map(e => e.join(",")).join("\n");

                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `reporte_finanzas_${startDate}_a_${endDate}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }} title="Exportar Reporte">
                        <FileDown className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={loadData} disabled={loading} title="Actualizar">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div >

            {/* Stats Cards */}
            < div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" >
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalIncome)}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <ArrowUpRight className="h-3 w-3 text-green-500" />
                            Facturado este mes
                        </p>
                    </CardContent>
                </Card>
                <Card
                    className="border-l-4 border-l-red-500 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setIsExpensesDetailsOpen(true)}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Totales</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <ArrowDownRight className="h-3 w-3 text-red-500" />
                            Gastos operativos (Click para ver)
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ingreso Neto</CardTitle>
                        <PiggyBank className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", stats.netIncome >= 0 ? "text-blue-600" : "text-red-600")}>
                            {formatCurrency(stats.netIncome)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ganancia real
                        </p>
                    </CardContent>
                </Card>
                <Card
                    className="border-l-4 border-l-yellow-500 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setIsPendingDetailsOpen(true)}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente de Cobro</CardTitle>
                        <CalendarDays className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.pendingIncome)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Citas sin pago confirmado (Click para ver)
                        </p>
                    </CardContent>
                </Card>
            </div >

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Resumen General</TabsTrigger>
                    <TabsTrigger value="expenses">Gastos</TabsTrigger>
                    <TabsTrigger value="transactions">Transacciones</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Flujo de Caja</CardTitle>
                            <CardDescription>Del {format(parseISO(startDate), 'dd/MM/yyyy')} al {format(parseISO(endDate), 'dd/MM/yyyy')}</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        labelFormatter={(label) => `Día ${label}`}
                                    />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey="income"
                                        name="Ingresos"
                                        stroke="#22c55e"
                                        fillOpacity={1}
                                        fill="url(#colorIncome)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="expense"
                                        name="Egresos"
                                        stroke="#ef4444"
                                        fillOpacity={1}
                                        fill="url(#colorExpense)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Métodos de Pago</CardTitle>
                                <CardDescription>Distribución de ingresos por medio de cobro.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(appointments.reduce((acc, app) => {
                                                if (app.paymentStatus === 'Pagado') {
                                                    const method = app.paymentMethod ? (app.paymentMethod.charAt(0).toUpperCase() + app.paymentMethod.slice(1)) : 'Otros';
                                                    acc[method] = (acc[method] || 0) + (app.totalPrice || 0);
                                                }
                                                return acc;
                                            }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {
                                                Object.keys(appointments.reduce((acc, app) => {
                                                    if (app.paymentStatus === 'Pagado') {
                                                        const method = app.paymentMethod || 'Otros';
                                                        acc[method] = 1;
                                                    }
                                                    return acc;
                                                }, {} as any)).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7'][index % 5]} />
                                                ))
                                            }
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Gastos por Categoría</CardTitle>
                                <CardDescription>Desglose de egresos operativos.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(expenses.reduce((acc, exp) => {
                                                acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
                                                return acc;
                                            }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#82ca9d"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {
                                                Object.keys(expenses.reduce((acc, exp) => {
                                                    acc[exp.category] = 1;
                                                    return acc;
                                                }, {} as any)).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#FF8042', '#FFBB28', '#00C49F', '#0088FE', '#d84d88', '#82ca9d', '#a855f7'][index % 7]} />
                                                ))
                                            }
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Médicos</CardTitle>
                                <CardDescription>Profesionales con mayor facturación este mes.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(appointments.reduce((acc, app) => {
                                        if (app.paymentStatus === 'Pagado' && app.doctorName && !app.clinicServiceId) {
                                            acc[app.doctorName] = (acc[app.doctorName] || 0) + (app.totalPrice || 0);
                                        }
                                        return acc;
                                    }, {} as Record<string, number>))
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([name, amount], index) => (
                                            <div key={name} className="flex items-center">
                                                <div className="ml-4 space-y-1">
                                                    <p className="text-sm font-medium leading-none">{index + 1}. Dr. {name}</p>
                                                </div>
                                                <div className="ml-auto font-medium text-green-600">
                                                    +{formatCurrency(amount)}
                                                </div>
                                            </div>
                                        ))}
                                    {Object.keys(appointments.reduce((acc, app) => {
                                        if (app.paymentStatus === 'Pagado' && app.doctorName && !app.clinicServiceId) {
                                            acc[app.doctorName] = 1;
                                        }
                                        return acc;
                                    }, {} as Record<string, number>)).length === 0 && (
                                            <p className="text-center text-muted-foreground py-4">Sin datos de facturación.</p>
                                        )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top Servicios</CardTitle>
                                <CardDescription>Servicios más solicitados y rentables.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(appointments.reduce((acc, app) => {
                                        if (app.paymentStatus === 'Pagado' && app.clinicServiceId) {
                                            const name = app.serviceName || "Servicio General";
                                            acc[name] = (acc[name] || 0) + (app.totalPrice || 0);
                                        }
                                        return acc;
                                    }, {} as Record<string, number>))
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([name, amount], index) => (
                                            <div key={name} className="flex items-center">
                                                <div className="ml-4 space-y-1">
                                                    <p className="text-sm font-medium leading-none">{index + 1}. {name}</p>
                                                </div>
                                                <div className="ml-auto font-medium text-blue-600">
                                                    +{formatCurrency(amount)}
                                                </div>
                                            </div>
                                        ))}
                                    {Object.keys(appointments.reduce((acc, app) => {
                                        if (app.paymentStatus === 'Pagado' && app.clinicServiceId) {
                                            const name = app.serviceName || "Servicio General";
                                            acc[name] = 1;
                                        }
                                        return acc;
                                    }, {} as Record<string, number>)).length === 0 && (
                                            <p className="text-center text-muted-foreground py-4">Sin datos de facturación.</p>
                                        )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="expenses">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Gastos Registrados</CardTitle>
                                <CardDescription>Listado de todos los gastos del mes seleccionado.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No hay gastos registrados este mes.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        expenses.map(exp => (
                                            <TableRow key={exp.id}>
                                                <TableCell>{format(parseISO(exp.date), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>{exp.description}</TableCell>
                                                <TableCell><Badge variant="outline">{exp.category}</Badge></TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(Number(exp.amount))}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90" onClick={() => handleDeleteExpense(exp.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transactions">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle>Historial de Transacciones</CardTitle>
                                    <CardDescription>Flujo detallado de ingresos y egresos.</CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Select value={txnFilterType} onValueChange={(v) => { setTxnFilterType(v as any); setTxnPage(1); }}>
                                        <SelectTrigger className="w-[130px] h-9">
                                            <SelectValue placeholder="Tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="income">Ingresos</SelectItem>
                                            <SelectItem value="expense">Gastos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={txnFilterStatus} onValueChange={(v) => { setTxnFilterStatus(v as any); setTxnPage(1); }}>
                                        <SelectTrigger className="w-[130px] h-9">
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="Pagado">Pagado</SelectItem>
                                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                // Build and filter transactions
                                const allTransactions = [
                                    ...appointments.map(a => ({ ...a, _type: 'income' as const })),
                                    ...expenses.map(e => ({ ...e, _type: 'expense' as const, paymentStatus: 'Pagado' as const }))
                                ]
                                    .filter(item => {
                                        if (txnFilterType === 'income' && item._type !== 'income') return false;
                                        if (txnFilterType === 'expense' && item._type !== 'expense') return false;
                                        if (txnFilterStatus !== 'all' && (item as any).paymentStatus !== txnFilterStatus) return false;
                                        return true;
                                    })
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                const totalPages = Math.ceil(allTransactions.length / TXN_PAGE_SIZE);
                                const paginatedItems = allTransactions.slice((txnPage - 1) * TXN_PAGE_SIZE, txnPage * TXN_PAGE_SIZE);

                                return (
                                    <>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead>Detalle</TableHead>
                                                    <TableHead>Asistencia</TableHead>
                                                    <TableHead>Estado Pago</TableHead>
                                                    <TableHead className="text-right">Monto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginatedItems.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                            No hay transacciones que coincidan con los filtros.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    paginatedItems.map((item: any) => {
                                                        const isExpense = item._type === 'expense';
                                                        const isNoShow = !isExpense && item.attendance === 'No Asistió';
                                                        const isPaidNoShow = isNoShow && item.paymentStatus === 'Pagado';
                                                        const isUnpaidNoShow = isNoShow && item.paymentStatus !== 'Pagado';

                                                        // Color logic for amount:
                                                        // - Expense: red
                                                        // - No-show + not paid: red (lost revenue)
                                                        // - No-show + paid: yellow (refund pending)
                                                        // - Normal paid: green
                                                        let amountColor = 'text-green-600';
                                                        if (isExpense) amountColor = 'text-red-600';
                                                        else if (isUnpaidNoShow) amountColor = 'text-red-600';
                                                        else if (isPaidNoShow) amountColor = 'text-yellow-600';

                                                        return (
                                                            <TableRow key={item.id} className={isNoShow ? 'bg-gray-50' : ''}>
                                                                <TableCell>{format(parseISO(item.date), 'dd/MM/yyyy')}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={isExpense ? "destructive" : "default"} className={cn(isExpense ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200")}>
                                                                        {isExpense ? 'Gasto' : 'Ingreso'}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {isExpense ? item.description : (
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">{item.patientName}</span>
                                                                            <span className="text-xs text-muted-foreground">Dr. {item.doctorName || item.serviceName || 'Servicio'}</span>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {isExpense ? (
                                                                        <span className="text-muted-foreground">-</span>
                                                                    ) : (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={cn(
                                                                                item.attendance === 'Atendido' && 'border-green-500 text-green-600',
                                                                                item.attendance === 'No Asistió' && 'border-red-500 text-red-600 bg-red-50',
                                                                                item.attendance === 'Pendiente' && 'border-gray-400 text-gray-500'
                                                                            )}
                                                                        >
                                                                            {item.attendance || 'Pendiente'}
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn(
                                                                            item.paymentStatus === 'Pagado' && !isPaidNoShow && 'border-green-500 text-green-600',
                                                                            item.paymentStatus === 'Pagado' && isPaidNoShow && 'border-yellow-500 text-yellow-600 bg-yellow-50',
                                                                            item.paymentStatus === 'Pendiente' && 'border-yellow-500 text-yellow-600'
                                                                        )}
                                                                    >
                                                                        {isPaidNoShow ? 'Reembolso Pend.' : item.paymentStatus}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className={cn("text-right font-medium", amountColor)}>
                                                                    {isExpense ? '-' : (isNoShow ? '' : '+')}{formatCurrency(Number(isExpense ? item.amount : item.totalPrice))}
                                                                    {isPaidNoShow && <span className="block text-xs text-yellow-600">(Devolver)</span>}
                                                                    {isUnpaidNoShow && <span className="block text-xs text-red-500">(No cobrado)</span>}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                                <p className="text-sm text-muted-foreground">
                                                    Mostrando {((txnPage - 1) * TXN_PAGE_SIZE) + 1} - {Math.min(txnPage * TXN_PAGE_SIZE, allTransactions.length)} de {allTransactions.length}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setTxnPage(p => Math.max(1, p - 1))}
                                                        disabled={txnPage === 1}
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <span className="text-sm">Página {txnPage} de {totalPages}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setTxnPage(p => Math.min(totalPages, p + 1))}
                                                        disabled={txnPage === totalPages}
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
}

"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Calendar, Coins } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Appointment, Expense } from '@/lib/types';
import { formatCurrency } from '@/lib/currency-utils';

interface FinancialChartsProps {
    appointments: Appointment[];
    expenses: Expense[];
    timeRange: 'today' | 'week' | 'month' | 'year' | 'all';
    selectedOffice: string;
    bcvRate?: number;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

export function FinancialCharts({ appointments, expenses, timeRange, selectedOffice, bcvRate = 65.50 }: FinancialChartsProps) {
    const [chartCurrency, setChartCurrency] = useState<'USD' | 'VES'>('USD');
    const effectiveRate = bcvRate > 0 ? bcvRate : 65.50;

    // Filtrar datos por consultorio
    const filteredAppointments = useMemo(() => {
        return appointments.filter(apt => {
            if (selectedOffice === 'all') return true;
            const apptOffice = apt.consultationType === 'online'
                ? 'Consultas Online'
                : (apt.office || 'Sin consultorio');
            return apptOffice === selectedOffice;
        });
    }, [appointments, selectedOffice]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            if (selectedOffice === 'all') return true;
            return (exp.office || 'Sin consultorio') === selectedOffice;
        });
    }, [expenses, selectedOffice]);

    // Datos para gráfico de tendencia de ingresos (por mes en el último año)
    const monthlyTrendData = useMemo(() => {
        const now = new Date();
        const yearStart = startOfYear(now);
        const months = eachMonthOfInterval({ start: yearStart, end: now });

        return months.map(month => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);

            const monthAppointments = filteredAppointments.filter(apt => {
                const aptDate = parseISO(apt.date);
                return aptDate >= monthStart && aptDate <= monthEnd && apt.paymentStatus === 'Pagado';
            });

            const monthExpenses = filteredExpenses.filter(exp => {
                const expDate = parseISO(exp.date);
                return expDate >= monthStart && expDate <= monthEnd;
            });

            const revenueUSD = monthAppointments.reduce((sum, apt) => sum + (apt.totalPrice || 0), 0);
            const costsUSD = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
            const multiplier = chartCurrency === 'VES' ? effectiveRate : 1;

            return {
                month: format(month, 'MMM', { locale: es }),
                ingresos: Math.round(revenueUSD * multiplier * 100) / 100,
                gastos: Math.round(costsUSD * multiplier * 100) / 100,
                beneficio: Math.round((revenueUSD - costsUSD) * multiplier * 100) / 100,
                revenueUSD,
                costsUSD,
            };
        });
    }, [filteredAppointments, filteredExpenses, chartCurrency, effectiveRate]);

    // Datos para gráfico de distribución de gastos por categoría
    const expensesByCategoryData = useMemo(() => {
        const categoryMap = new Map<string, number>();

        filteredExpenses.forEach(exp => {
            const category = exp.category || 'Sin categoría';
            const multiplier = chartCurrency === 'VES' ? effectiveRate : 1;
            const amount = (exp.amount || 0) * multiplier;
            categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
        });

        return Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
            .sort((a, b) => b.value - a.value);
    }, [filteredExpenses, chartCurrency, effectiveRate]);

    // Datos para gráfico de ingresos por tipo de pago
    const paymentMethodData = useMemo(() => {
        const methodMap = new Map<string, number>();

        filteredAppointments
            .filter(apt => apt.paymentStatus === 'Pagado')
            .forEach(apt => {
                const method = apt.paymentMethod || 'No especificado';
                const multiplier = chartCurrency === 'VES' ? effectiveRate : 1;
                const amount = (apt.totalPrice || 0) * multiplier;
                methodMap.set(method, (methodMap.get(method) || 0) + amount);
            });

        return Array.from(methodMap.entries())
            .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, chartCurrency, effectiveRate]);

    // Estadísticas de comparación
    const comparisonStats = useMemo(() => {
        const totalRevenue = filteredAppointments
            .filter(apt => apt.paymentStatus === 'Pagado')
            .reduce((sum, apt) => sum + (apt.totalPrice || 0), 0);

        const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        const avgAppointmentValueUSD = filteredAppointments.filter(apt => apt.paymentStatus === 'Pagado').length > 0
            ? totalRevenue / filteredAppointments.filter(apt => apt.paymentStatus === 'Pagado').length
            : 0;

        return {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            avgAppointmentValueUSD,
            avgAppointmentValueVES: avgAppointmentValueUSD * effectiveRate,
            profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
        };
    }, [filteredAppointments, filteredExpenses, effectiveRate]);

    const formatChartTooltip = (value: number) => {
        if (chartCurrency === 'USD') {
            const vesVal = value * effectiveRate;
            return [
                `$${value.toFixed(2)} USD / ${formatCurrency(vesVal, 'VES')}`,
                ''
            ];
        } else {
            const usdVal = effectiveRate > 0 ? value / effectiveRate : 0;
            return [
                `${formatCurrency(value, 'VES')} / $${usdVal.toFixed(2)} USD`,
                ''
            ];
        }
    };

    return (
        <div className="space-y-6">
            {/* Barra superior con selector de moneda para las gráficas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700">
                <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-emerald-600" />
                    <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Moneda de Visualización de Gráficos:
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                            (Tasa oficial BCV: Bs. {effectiveRate.toFixed(2)})
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border shadow-sm">
                    <Button
                        size="sm"
                        variant={chartCurrency === 'USD' ? 'default' : 'ghost'}
                        onClick={() => setChartCurrency('USD')}
                        className="h-8 text-xs font-semibold px-3"
                    >
                        Dólares ($ USD)
                    </Button>
                    <Button
                        size="sm"
                        variant={chartCurrency === 'VES' ? 'default' : 'ghost'}
                        onClick={() => setChartCurrency('VES')}
                        className="h-8 text-xs font-semibold px-3"
                    >
                        Bolívares (Bs.)
                    </Button>
                </div>
            </div>

            {/* KPIs Destacados */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Valor Promedio por Cita</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ${comparisonStats.avgAppointmentValueUSD.toFixed(2)} USD
                        </div>
                        <p className="text-xs text-emerald-700 font-mono font-medium mt-0.5">
                            {formatCurrency(comparisonStats.avgAppointmentValueVES, 'VES')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ingreso medio por consulta cobrada
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Margen de Beneficio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${comparisonStats.profitMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {comparisonStats.profitMargin.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Rentabilidad sobre ingresos totales
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Conversión</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {filteredAppointments.length > 0
                                ? ((filteredAppointments.filter(a => a.paymentStatus === 'Pagado').length / filteredAppointments.length) * 100).toFixed(1)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Citas cobradas vs agendadas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico de Tendencia Mensual */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Tendencia de Ingresos y Gastos ({chartCurrency === 'USD' ? 'USD' : 'Bs.'})
                            </CardTitle>
                            <CardDescription>
                                Evolución mensual de tus finanzas en el último año
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={monthlyTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(val) => chartCurrency === 'USD' ? `$${val}` : `Bs. ${val}`} />
                            <Tooltip
                                formatter={(value: number) => formatChartTooltip(value)[0]}
                                labelStyle={{ color: '#000' }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="ingresos"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                name={`Ingresos (${chartCurrency === 'USD' ? '$' : 'Bs.'})`}
                            />
                            <Line
                                type="monotone"
                                dataKey="gastos"
                                stroke="#ef4444"
                                strokeWidth={2.5}
                                name={`Gastos (${chartCurrency === 'USD' ? '$' : 'Bs.'})`}
                            />
                            <Line
                                type="monotone"
                                dataKey="beneficio"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                name={`Beneficio (${chartCurrency === 'USD' ? '$' : 'Bs.'})`}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Gráficos de Distribución */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Distribución de Gastos por Categoría */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-red-600" />
                            Gastos por Categoría ({chartCurrency === 'USD' ? 'USD' : 'Bs.'})
                        </CardTitle>
                        <CardDescription>
                            Distribución de tus gastos operativos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {expensesByCategoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={expensesByCategoryData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={85}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {expensesByCategoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatChartTooltip(value)[0]} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                                No hay gastos registrados
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Ingresos por Método de Pago */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-green-600" />
                            Ingresos por Método de Pago ({chartCurrency === 'USD' ? 'USD' : 'Bs.'})
                        </CardTitle>
                        <CardDescription>
                            Distribución de cobros recibidos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {paymentMethodData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={paymentMethodData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(val) => chartCurrency === 'USD' ? `$${val}` : `Bs. ${val}`} />
                                    <Tooltip formatter={(value: number) => formatChartTooltip(value)[0]} />
                                    <Bar dataKey="value" fill="#10b981" name={`Ingresos (${chartCurrency === 'USD' ? '$' : 'Bs.'})`}>
                                        {paymentMethodData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                                No hay ingresos registrados
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

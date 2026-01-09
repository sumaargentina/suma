"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Appointment, Expense } from '@/lib/types';

interface FinancialChartsProps {
    appointments: Appointment[];
    expenses: Expense[];
    timeRange: 'today' | 'week' | 'month' | 'year' | 'all';
    selectedOffice: string;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

export function FinancialCharts({ appointments, expenses, timeRange, selectedOffice }: FinancialChartsProps) {

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

            const revenue = monthAppointments.reduce((sum, apt) => sum + apt.totalPrice, 0);
            const costs = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

            return {
                month: format(month, 'MMM', { locale: es }),
                ingresos: revenue,
                gastos: costs,
                beneficio: revenue - costs,
            };
        });
    }, [filteredAppointments, filteredExpenses]);

    // Datos para gráfico de distribución de gastos por categoría
    const expensesByCategoryData = useMemo(() => {
        const categoryMap = new Map<string, number>();

        filteredExpenses.forEach(exp => {
            const category = exp.category || 'Sin categoría';
            categoryMap.set(category, (categoryMap.get(category) || 0) + exp.amount);
        });

        return Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredExpenses]);

    // Datos para gráfico de ingresos por tipo de pago
    const paymentMethodData = useMemo(() => {
        const methodMap = new Map<string, number>();

        filteredAppointments
            .filter(apt => apt.paymentStatus === 'Pagado')
            .forEach(apt => {
                const method = apt.paymentMethod || 'No especificado';
                methodMap.set(method, (methodMap.get(method) || 0) + apt.totalPrice);
            });

        return Array.from(methodMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments]);

    // Estadísticas de comparación
    const comparisonStats = useMemo(() => {
        const totalRevenue = filteredAppointments
            .filter(apt => apt.paymentStatus === 'Pagado')
            .reduce((sum, apt) => sum + apt.totalPrice, 0);

        const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        const avgAppointmentValue = filteredAppointments.length > 0
            ? totalRevenue / filteredAppointments.filter(apt => apt.paymentStatus === 'Pagado').length
            : 0;

        return {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            avgAppointmentValue,
            profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
        };
    }, [filteredAppointments, filteredExpenses]);

    return (
        <div className="space-y-6">
            {/* KPIs Destacados */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Valor Promedio por Cita</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ${comparisonStats.avgAppointmentValue.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ingreso promedio por consulta
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Margen de Beneficio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${comparisonStats.profitMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {comparisonStats.profitMargin.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Rentabilidad sobre ingresos
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
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
                            Citas pagadas vs totales
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico de Tendencia Mensual */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Tendencia de Ingresos y Gastos
                    </CardTitle>
                    <CardDescription>
                        Evolución mensual de tus finanzas en el último año
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip
                                formatter={(value: number) => `$${value.toFixed(2)}`}
                                labelStyle={{ color: '#000' }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="ingresos"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Ingresos"
                            />
                            <Line
                                type="monotone"
                                dataKey="gastos"
                                stroke="#ef4444"
                                strokeWidth={2}
                                name="Gastos"
                            />
                            <Line
                                type="monotone"
                                dataKey="beneficio"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Beneficio"
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
                            Gastos por Categoría
                        </CardTitle>
                        <CardDescription>
                            Distribución de tus gastos operativos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {expensesByCategoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={expensesByCategoryData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {expensesByCategoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
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
                            Ingresos por Método de Pago
                        </CardTitle>
                        <CardDescription>
                            Distribución de pagos recibidos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {paymentMethodData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={paymentMethodData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                                    <Bar dataKey="value" fill="#10b981" name="Ingresos">
                                        {paymentMethodData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                                No hay ingresos registrados
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

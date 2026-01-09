
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Stethoscope, UserCheck, BarChart as BarChartIcon, Loader2 } from 'lucide-react';
import * as supabaseService from '@/lib/supabaseService';
import { useToast } from '@/hooks/use-toast';
import type { Doctor } from '@/lib/types';
import type { DoctorPayment, SellerPayment } from '@/lib/types';

export function OverviewTab() {
  const [stats, setStats] = useState({
    totalDoctors: 0,
    activeDoctors: 0,
    totalSellers: 0,
    totalPatients: 0,
    netProfit: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        // Obtener datos reales de la base de datos
        const [doctors, sellers, patients, doctorPayments, sellerPayments] = await Promise.all([
          supabaseService.getDoctors(),
          supabaseService.getSellers(),
          supabaseService.getPatients(),
          supabaseService.getDoctorPayments(),
          supabaseService.getSellerPayments(),
        ]);

        // Calcular estadísticas reales
        const totalDoctors = doctors.length;
        const activeDoctors = doctors.filter((d: Doctor) => d.status === 'active').length;
        const totalSellers = sellers.length;
        const totalPatients = patients.length;

        // Calcular beneficio neto
        const totalDoctorPayments = doctorPayments
          .filter((p: DoctorPayment) => p.status === 'Paid')
          .reduce((sum: number, p: DoctorPayment) => sum + p.amount, 0);
        
        const totalSellerPayments = sellerPayments
          .filter((p: SellerPayment) => p.status === 'paid')
          .reduce((sum: number, p: SellerPayment) => sum + p.amount, 0);
        
        // Por ahora no tenemos gastos de empresa, así que solo sumamos ingresos
        const netProfit = totalDoctorPayments + totalSellerPayments;

        setStats({
          totalDoctors,
          activeDoctors,
          totalSellers,
          totalPatients,
          netProfit,
        });
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar las estadísticas del dashboard.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Médicos</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDoctors}</div>
            <p className="text-xs text-muted-foreground">{stats.activeDoctors} activos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendedoras</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSellers}</div>
            <p className="text-xs text-muted-foreground">Gestionando referidos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">Registrados en la plataforma</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio Neto</CardTitle>
            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Ingresos - Egresos (Global)</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6 text-center py-20 text-muted-foreground flex flex-col items-center gap-4 border-2 border-dashed rounded-lg">
        <BarChartIcon className="h-12 w-12" />
        <h3 className="text-xl font-semibold">Gráficos y Analíticas</h3>
        <p>Más analíticas detalladas sobre el crecimiento y uso de la plataforma estarán disponibles aquí.</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import * as supabaseService from '@/lib/supabaseService';
import { HeaderWrapper } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Plus, FileText, Activity, Image as ImageIcon } from 'lucide-react';
import { PatientProfileHeader } from '@/components/doctor/patient-history/patient-profile-header';
import { MedicalRecordTimeline } from '@/components/doctor/patient-history/medical-record-timeline';
import { NewRecordForm } from '@/components/doctor/patient-history/new-record-form';
import { useToast } from '@/hooks/use-toast';

export default function PatientHistoryPage() {
    const { id: patientId } = useParams();
    const searchParams = useSearchParams();
    const familyMemberId = searchParams.get('familyMemberId');
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [patient, setPatient] = useState<any>(null);
    const [familyMember, setFamilyMember] = useState<any>(null);
    const [isLoadingPatient, setIsLoadingPatient] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');
    const [lastRecord, setLastRecord] = useState<any>(null);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'doctor')) {
            router.push('/');
            return;
        }

        if (patientId) {
            fetchPatientData();
            fetchLastRecord();
        }
    }, [patientId, user, loading]);

    // Fetch separate family member data if viewing a dependent's profile context
    useEffect(() => {
        if (familyMemberId) {
            supabaseService.getFamilyMember(familyMemberId).then(setFamilyMember);
        }
    }, [familyMemberId]);

    const fetchLastRecord = async () => {
        try {
            const res = await fetch(`/api/medical-records?patient_id=${patientId}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    setLastRecord(data[0]); // El endpoint ya devuelve ordenado por fecha desc
                }
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const fetchPatientData = async () => {
        try {
            setIsLoadingPatient(true);
            const res = await fetch(`/api/patients/get?id=${patientId}`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch patient');
            }
            const data = await res.json();
            setPatient(data);
        } catch (error) {
            console.error('Error fetching patient:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el paciente.' });
        } finally {
            setIsLoadingPatient(false);
        }
    };

    if (loading || isLoadingPatient) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!patient) {
        return <div className="p-8 text-center">Paciente no encontrado</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <HeaderWrapper />

            <main className="container py-6 space-y-6">
                {/* Back Button */}
                <Button variant="ghost" className="pl-0 gap-2" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
                </Button>

                {/* Patient Profile Header */}
                <PatientProfileHeader patient={patient} familyMember={familyMember} />

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                        <TabsTrigger value="summary">Resumen</TabsTrigger>
                        <TabsTrigger value="history">Historial</TabsTrigger>
                        <TabsTrigger value="new-evolution">Nueva Evolución</TabsTrigger>
                        <TabsTrigger value="files">Archivos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                            {/* ÚLTIMA EVOLUCIÓN (Real Data) */}
                            <div className="rounded-xl border bg-card text-card-foreground shadow p-6 col-span-2">
                                <h3 className="font-semibold flex items-center gap-2 mb-4 text-primary">
                                    <FileText className="h-5 w-5" />
                                    Última Evolución
                                </h3>
                                {lastRecord ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start border-b pb-2">
                                            <div>
                                                <p className="font-medium text-lg capitalize">{lastRecord.record_type.replace('_', ' ')}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(lastRecord.visit_date).toLocaleDateString()} - Dr. {lastRecord.doctors?.name || 'Desconocido'}
                                                </p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setActiveTab('history')}>
                                                Ver Completo
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-3 rounded-lg">
                                                <span className="text-xs font-bold text-slate-500 uppercase">Diagnóstico</span>
                                                <p className="text-sm mt-1">{lastRecord.diagnosis || 'Sin diagnóstico'}</p>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-lg">
                                                <span className="text-xs font-bold text-slate-500 uppercase">Tratamiento</span>
                                                <p className="text-sm mt-1">{lastRecord.treatment_plan || 'Sin tratamiento'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground space-y-2">
                                        <p>No hay registros recientes.</p>
                                        <Button variant="link" onClick={() => setActiveTab('new-evolution')}>
                                            Crear primera evolución
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Widgets de Resumen: Alergias */}
                            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                                <h3 className="font-semibold flex items-center gap-2 mb-4">
                                    <Activity className="h-5 w-5 text-blue-500" />
                                    Condiciones Activas
                                </h3>
                                <p className="text-muted-foreground text-sm">Sin condiciones registradas.</p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history">
                        <MedicalRecordTimeline patientId={patientId as string} familyMemberId={familyMemberId || undefined} />
                    </TabsContent>

                    <TabsContent value="new-evolution">
                        <NewRecordForm
                            patientId={patientId as string}
                            familyMemberId={familyMemberId || undefined}
                            doctorId={user!.id}
                            onSuccess={() => setActiveTab('history')}
                        />
                    </TabsContent>

                    <TabsContent value="files">
                        <div className="p-8 text-center border-2 border-dashed rounded-xl">
                            <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                            <h3 className="text-lg font-medium">Galería de Archivos</h3>
                            <p className="text-muted-foreground">Próximamente: Radiografías, Laboratorios y Fotos.</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

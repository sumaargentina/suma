"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { resolveDoctorCapabilities } from '@/lib/professions-catalog';
import { supabase } from '@/lib/supabase';
import * as supabaseService from '@/lib/supabaseService';
import { HeaderWrapper } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Plus, FileText, Activity, Image as ImageIcon } from 'lucide-react';
import { PatientProfileHeader } from '@/components/doctor/patient-history/patient-profile-header';
import { MedicalRecordTimeline } from '@/components/doctor/patient-history/medical-record-timeline';
import { NewRecordForm } from '@/components/doctor/patient-history/new-record-form';
import { PatientFilesGallery } from '@/components/doctor/patient-history/patient-files-gallery';
import { useToast } from '@/hooks/use-toast';

export default function PatientHistoryPage() {
    const { id: patientId } = useParams();
    const searchParams = useSearchParams();
    const familyMemberId = searchParams.get('familyMemberId');
    const appointmentId = searchParams.get('appointmentId');
    const tabParam = searchParams.get('tab');
    const { user, loading } = useAuth();
    const { professionsCatalog } = useSettings();
    const capabilities = resolveDoctorCapabilities(user, professionsCatalog);
    const router = useRouter();
    const { toast } = useToast();

    const [patient, setPatient] = useState<any>(null);
    const [familyMember, setFamilyMember] = useState<any>(null);
    const [isLoadingPatient, setIsLoadingPatient] = useState(true);
    const [activeTab, setActiveTab] = useState(
        tabParam && ['summary', 'history', 'new-evolution', 'files'].includes(tabParam) ? tabParam : 'summary'
    );
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
    }, [patientId, familyMemberId, user, loading]);

    // Fetch separate family member data if viewing a dependent's profile context
    useEffect(() => {
        const fetchFamilyMember = async () => {
            if (familyMemberId) {
                try {
                    const res = await fetch(`/api/family-members/get?id=${familyMemberId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setFamilyMember(data);
                    }
                } catch (error) {
                    console.error("Error loading family member:", error);
                }
            }
        };
        fetchFamilyMember();
    }, [familyMemberId]);

    const fetchLastRecord = async () => {
        try {
            let url = `/api/medical-records?patient_id=${patientId}`;
            if (familyMemberId) {
                url += `&family_member_id=${familyMemberId}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    setLastRecord(data[0]);
                } else {
                    setLastRecord(null); // Limpiar si no hay registros para el familiar
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

    if (loading || isLoadingPatient || !user) {
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
                <PatientProfileHeader patient={patient} familyMember={familyMember} onUpdated={fetchPatientData} />

                {/* Main Content Tabs */}
                {!capabilities.hasMedicalRecord ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-6 text-center space-y-2">
                        <FileText className="h-8 w-8 text-amber-600 mx-auto" />
                        <h3 className="font-bold text-amber-950 text-base">
                            Módulo de Historia Clínica no requerido para tu especialidad ({user?.specialty})
                        </h3>
                        <p className="text-xs text-amber-800 max-w-md mx-auto">
                            Tu categoría profesional está configurada para gestión de citas sin historia médica clínica. Si necesitas habilitar este módulo, solicítalo al administrador de SUMA.
                        </p>
                    </div>
                ) : (
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            <div className="bg-blue-50 p-3 rounded-lg">
                                                <span className="text-xs font-bold text-blue-700 uppercase">Diagnóstico</span>
                                                <p className="text-sm mt-1 line-clamp-2">{lastRecord.diagnosis || 'Sin diagnóstico'}</p>
                                            </div>
                                            {lastRecord.evaluation && (
                                                <div className="bg-purple-50 p-3 rounded-lg">
                                                    <span className="text-xs font-bold text-purple-700 uppercase">Evaluación</span>
                                                    <p className="text-sm mt-1 line-clamp-2">{lastRecord.evaluation}</p>
                                                </div>
                                            )}
                                            <div className="bg-green-50 p-3 rounded-lg">
                                                <span className="text-xs font-bold text-green-700 uppercase">Tratamiento</span>
                                                <p className="text-sm mt-1 line-clamp-2">{lastRecord.treatment_plan || 'Sin tratamiento'}</p>
                                            </div>
                                            {lastRecord.requested_studies && (
                                                <div className="bg-amber-50 p-3 rounded-lg">
                                                    <span className="text-xs font-bold text-amber-700 uppercase">Estudios Solicitados</span>
                                                    <p className="text-sm mt-1 line-clamp-2">{lastRecord.requested_studies}</p>
                                                </div>
                                            )}
                                        </div>
                                        {(lastRecord.blood_pressure || lastRecord.weight || lastRecord.height || lastRecord.temperature || lastRecord.heart_rate || lastRecord.oxygen_saturation) && (
                                            <div className="pt-2 border-t flex flex-wrap gap-2 text-xs">
                                                {lastRecord.blood_pressure && <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-semibold">TA: {lastRecord.blood_pressure} mmHg</span>}
                                                {lastRecord.weight && <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-semibold">Peso: {lastRecord.weight} kg</span>}
                                                {lastRecord.height && <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold">Talla: {lastRecord.height} cm</span>}
                                                {lastRecord.temperature && <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold">Temp: {lastRecord.temperature} °C</span>}
                                                {lastRecord.heart_rate && <span className="px-2.5 py-1 rounded-md bg-red-50 text-red-800 border border-red-200 font-semibold">FC: {lastRecord.heart_rate} lpm</span>}
                                                {lastRecord.oxygen_saturation && <span className="px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold">SpO2: {lastRecord.oxygen_saturation}%</span>}
                                            </div>
                                        )}
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

                            {/* Widgets de Resumen: Alergias y Condiciones Activas */}
                            <div className="rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-blue-500" />
                                    Alergias y Condiciones Activas
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/80">
                                        <span className="text-xs font-bold text-amber-800 uppercase block">Alergias Reportadas</span>
                                        <p className="mt-1 font-medium text-amber-950">
                                            {patient.allergies || 'Sin alergias registradas.'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200/80">
                                        <span className="text-xs font-bold text-blue-800 uppercase block">Condiciones / Antecedentes</span>
                                        <p className="mt-1 font-medium text-blue-950">
                                            {patient.chronic_conditions || patient.chronicConditions || lastRecord?.diagnosis || 'Sin condiciones registradas.'}
                                        </p>
                                    </div>
                                </div>
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
                            appointmentId={appointmentId || undefined}
                            onSuccess={() => {
                                setActiveTab('history');
                                fetchLastRecord();
                                fetchPatientData();
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="files">
                        <PatientFilesGallery patientId={patientId as string} />
                    </TabsContent>
                </Tabs>
                )}
            </main>
        </div>
    );
}

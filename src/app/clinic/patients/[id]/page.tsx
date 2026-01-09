"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { HeaderWrapper } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Plus, FileText, Activity, Image as ImageIcon, Calendar, Clock, User, Phone } from 'lucide-react';
import { PatientProfileHeader } from '@/components/doctor/patient-history/patient-profile-header';
import { MedicalRecordTimeline } from '@/components/doctor/patient-history/medical-record-timeline';
import { NewRecordForm } from '@/components/doctor/patient-history/new-record-form';
import { useToast } from '@/hooks/use-toast';
import { getClinicAppointments, getClinicDoctors } from '@/lib/supabaseService';
import { Appointment, Doctor } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClinicPatientHistoryPage() {
    const { id: patientId } = useParams();
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [patient, setPatient] = useState<any>(null);
    const [isLoadingPatient, setIsLoadingPatient] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');
    const [lastRecord, setLastRecord] = useState<any>(null);
    const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
    const [clinicDoctors, setClinicDoctors] = useState<Doctor[]>([]);
    const [selectedDoctorForRecord, setSelectedDoctorForRecord] = useState<string>('');

    useEffect(() => {
        if (!loading && (!user || user.role !== 'clinic')) {
            router.push('/');
            return;
        }

        if (patientId && user?.id) {
            fetchPatientData();
            fetchLastRecord();
            fetchPatientAppointments();
            fetchDoctors();
        }
    }, [patientId, user, loading]);

    const fetchDoctors = async () => {
        if (!user?.id) return;
        try {
            const doctors = await getClinicDoctors(user.id);
            setClinicDoctors(doctors);
            if (doctors.length > 0) {
                setSelectedDoctorForRecord(doctors[0].id);
            }
        } catch (error) {
            console.error('Error fetching doctors:', error);
        }
    };

    const fetchPatientAppointments = async () => {
        if (!user?.id) return;
        try {
            const allAppointments = await getClinicAppointments(user.id);
            const filtered = allAppointments.filter(apt => apt.patientId === patientId);
            setPatientAppointments(filtered.sort((a, b) => b.date.localeCompare(a.date)));
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
    };

    const fetchLastRecord = async () => {
        try {
            const res = await fetch(`/api/medical-records?patient_id=${patientId}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    setLastRecord(data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const fetchPatientData = async () => {
        try {
            setIsLoadingPatient(true);
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .single();

            if (error) throw error;
            setPatient(data);
        } catch (error) {
            console.error('Error fetching patient:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el paciente.' });
        } finally {
            setIsLoadingPatient(false);
        }
    };

    const getDoctorName = (doctorId?: string) => {
        if (!doctorId) return 'Sin médico';
        const doctor = clinicDoctors.find(d => d.id === doctorId);
        return doctor?.name || 'Médico desconocido';
    };

    const getAttendanceBadge = (attendance: string) => {
        switch (attendance) {
            case 'Atendido':
                return <Badge className="bg-green-100 text-green-800">Atendido</Badge>;
            case 'No Asistió':
                return <Badge className="bg-red-100 text-red-800">No Asistió</Badge>;
            default:
                return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
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
                <PatientProfileHeader patient={patient} />

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4 lg:w-[700px]">
                        <TabsTrigger value="summary">Resumen</TabsTrigger>
                        <TabsTrigger value="appointments">Citas ({patientAppointments.length})</TabsTrigger>
                        <TabsTrigger value="history">Historial Médico</TabsTrigger>
                        <TabsTrigger value="new-evolution">Nueva Evolución</TabsTrigger>
                    </TabsList>

                    {/* Summary Tab */}
                    <TabsContent value="summary" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {/* Stats */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Citas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{patientAppointments.length}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {patientAppointments.filter(a => a.attendance === 'Atendido').length} atendidas
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Última Cita</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {patientAppointments.length > 0 ? (
                                        <>
                                            <div className="text-lg font-bold">
                                                {format(parseISO(patientAppointments[0].date), "d MMM yyyy", { locale: es })}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {getDoctorName(patientAppointments[0].doctorId)}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-muted-foreground">Sin citas</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-green-600">
                                        ${patientAppointments.reduce((acc, a) => acc + (a.totalPrice || 0), 0).toLocaleString()}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ÚLTIMA EVOLUCIÓN */}
                            <Card className="col-span-full lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Última Evolución
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {lastRecord ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start border-b pb-2">
                                                <div>
                                                    <p className="font-medium text-lg capitalize">{lastRecord.record_type?.replace('_', ' ')}</p>
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
                                </CardContent>
                            </Card>

                            {/* Condiciones */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-blue-500" />
                                        Condiciones
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm">Sin condiciones registradas.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Appointments Tab */}
                    <TabsContent value="appointments" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Calendar className="h-5 w-5" /> Historial de Citas en la Clínica
                            </h3>
                        </div>

                        {patientAppointments.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="p-8 text-center text-muted-foreground">
                                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Este paciente no tiene citas registradas en la clínica.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {patientAppointments.map(apt => (
                                    <Card key={apt.id} className="relative overflow-hidden">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${apt.attendance === 'Atendido' ? 'bg-green-500' :
                                                apt.attendance === 'No Asistió' ? 'bg-red-500' : 'bg-blue-500'
                                            }`} />
                                        <CardContent className="p-4 pl-5">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-primary" />
                                                        <span className="font-medium">
                                                            {format(parseISO(apt.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                                                        </span>
                                                        <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                                                        <span>{apt.time}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <User className="h-4 w-4" />
                                                        {getDoctorName(apt.doctorId)}
                                                        {apt.serviceName && <span>• {apt.serviceName}</span>}
                                                    </div>
                                                    {apt.clinicalNotes && (
                                                        <p className="text-sm bg-slate-50 p-2 rounded mt-2 italic">
                                                            "{apt.clinicalNotes}"
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {getAttendanceBadge(apt.attendance)}
                                                    <span className="text-lg font-bold text-green-600">${apt.totalPrice}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {apt.paymentStatus} • {apt.paymentMethod}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Medical History Tab */}
                    <TabsContent value="history">
                        <MedicalRecordTimeline patientId={patientId as string} />
                    </TabsContent>

                    {/* New Evolution Tab */}
                    <TabsContent value="new-evolution" className="space-y-4">
                        {clinicDoctors.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="p-8 text-center text-muted-foreground">
                                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No hay médicos asociados a esta clínica.</p>
                                    <p className="text-sm">Debes tener al menos un médico para crear evoluciones.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {/* Doctor Selection */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Selecciona el Médico</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2">
                                            {clinicDoctors.map(doctor => (
                                                <Button
                                                    key={doctor.id}
                                                    variant={selectedDoctorForRecord === doctor.id ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setSelectedDoctorForRecord(doctor.id)}
                                                    className="gap-2"
                                                >
                                                    <User className="h-4 w-4" />
                                                    {doctor.name}
                                                </Button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {selectedDoctorForRecord && (
                                    <NewRecordForm
                                        patientId={patientId as string}
                                        doctorId={selectedDoctorForRecord}
                                        onSuccess={() => {
                                            setActiveTab('history');
                                            fetchLastRecord();
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

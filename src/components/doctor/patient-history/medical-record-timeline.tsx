
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Stethoscope, AlertTriangle, Pill, Printer, BedDouble } from 'lucide-react';
import { MedicalPrescriptionModal } from '@/components/medical/medical-prescription-modal';
import { MedicalReportModal } from '@/components/medical/medical-report-modal';

interface MedicalRecordTimelineProps {
    patientId: string;
    familyMemberId?: string;
    patientName?: string;
}

export function MedicalRecordTimeline({ patientId, familyMemberId, patientName }: MedicalRecordTimelineProps) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRecordForPrescription, setSelectedRecordForPrescription] = useState<any | null>(null);
    const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
    const [selectedRecordForReport, setSelectedRecordForReport] = useState<any | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    useEffect(() => {
        fetchRecords();
    }, [patientId, familyMemberId]);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            let url = `/api/medical-records?patient_id=${patientId}`;
            if (familyMemberId) {
                url += `&family_member_id=${familyMemberId}`;
            }
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error fetching records');
            }

            const data = await response.json();
            setRecords(data || []);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching records:', err);
            setError('No se pudieron cargar los registros históricos.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (error) {
        return (
            <div className="p-8 text-center border rounded-lg bg-orange-50 text-orange-800">
                <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                <p>{error}</p>
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay registros médicos para este paciente.</p>
                <p className="text-sm">Inicia una nueva evolución para comenzar el historial.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {records.map((record) => (
                <Card key={record.id} className="relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${record.record_type === 'wellness_session' ? 'bg-green-500' :
                        record.record_type === 'aesthetic_procedure' ? 'bg-purple-500' : 'bg-blue-500'
                        }`} />

                    <CardHeader className="pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                    {format(parseISO(record.visit_date), "dd 'de' MMMM, yyyy", { locale: es })}
                                    <Badge variant="outline" className="capitalize font-normal text-xs">
                                        {record.record_type?.replace('_', ' ') || 'Consulta'}
                                    </Badge>
                                    {(record.requires_rest || record.rest_days > 0) && (
                                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-xs font-semibold">
                                            <BedDouble className="h-3 w-3 mr-1" /> Reposo {record.rest_days}d
                                        </Badge>
                                    )}
                                </CardTitle>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Dr. {record.doctors?.name} - {record.doctors?.specialty}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs text-blue-700 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                                    onClick={() => {
                                        setSelectedRecordForReport(record);
                                        setIsReportModalOpen(true);
                                    }}
                                >
                                    <FileText className="h-3.5 w-3.5 mr-1 text-blue-600" /> Informe / Reposo
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs text-teal-700 hover:text-teal-800 border-teal-200 hover:bg-teal-50"
                                    onClick={() => {
                                        setSelectedRecordForPrescription(record);
                                        setIsPrescriptionModalOpen(true);
                                    }}
                                >
                                    <Pill className="h-3.5 w-3.5 mr-1 text-teal-600" /> Ver Récipe
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(record.requires_rest || record.rest_days > 0) && (
                            <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 text-xs text-blue-950 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BedDouble className="h-4 w-4 text-blue-600" />
                                    <span><strong>Reposo Médico Indicado:</strong> {record.rest_days} días ({record.rest_type || 'Absoluto'})</span>
                                </div>
                                <span className="font-semibold text-blue-800">
                                    {record.rest_start_date ? `Del ${format(parseISO(record.rest_start_date), 'dd/MM/yyyy')}` : ''}
                                    {record.rest_end_date ? ` al ${format(parseISO(record.rest_end_date), 'dd/MM/yyyy')}` : ''}
                                </span>
                            </div>
                        )}
                        {record.diagnosis && (
                            <div>
                                <h4 className="font-semibold text-sm text-blue-800">Diagnóstico</h4>
                                <p className="text-sm mt-1">{record.diagnosis}</p>
                            </div>
                        )}
                        {record.prescription && (
                            <div className="bg-teal-50/60 p-3 rounded-lg border border-teal-200">
                                <h4 className="font-semibold text-sm text-teal-900 flex items-center gap-1.5">
                                    <Pill className="h-4 w-4 text-teal-600" /> Récipe Médico (Farmacia)
                                </h4>
                                <p className="text-sm mt-1 whitespace-pre-wrap text-slate-800">{record.prescription}</p>
                            </div>
                        )}
                        {record.medical_report && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-blue-600" /> Informe Médico
                                </h4>
                                <p className="text-sm mt-1 whitespace-pre-wrap text-slate-700">{record.medical_report}</p>
                            </div>
                        )}
                        {record.treatment_plan && (
                            <div>
                                <h4 className="font-semibold text-sm text-green-800">Plan de Tratamiento / Indicaciones</h4>
                                <p className="text-sm mt-1 whitespace-pre-wrap">{record.treatment_plan}</p>
                            </div>
                        )}
                        {record.evaluation && (
                            <div>
                                <h4 className="font-semibold text-sm text-purple-800">Evaluación Clínica</h4>
                                <p className="text-sm mt-1">{record.evaluation}</p>
                            </div>
                        )}
                        {record.requested_studies && (
                            <div>
                                <h4 className="font-semibold text-sm text-amber-800">Estudios Solicitados</h4>
                                <p className="text-sm mt-1">{record.requested_studies}</p>
                            </div>
                        )}
                        {(record.evolution || record.notes) && (
                            <div className="bg-slate-50 p-3 rounded-md">
                                <h4 className="font-semibold text-sm text-slate-700 mb-1">Evolución / Historia de la Enfermedad</h4>
                                <p className="text-sm">{record.evolution || record.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}

            {/* Prescription Viewer Modal */}
            <MedicalPrescriptionModal
                isOpen={isPrescriptionModalOpen}
                onClose={() => setIsPrescriptionModalOpen(false)}
                record={selectedRecordForPrescription}
                doctor={selectedRecordForPrescription?.doctors}
                patientName={patientName}
            />

            {/* Medical Report & Rest Viewer Modal */}
            <MedicalReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                record={selectedRecordForReport}
                doctor={selectedRecordForReport?.doctors}
                patientName={patientName}
            />
        </div>
    );
}

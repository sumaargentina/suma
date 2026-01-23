
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Stethoscope, AlertTriangle } from 'lucide-react';

interface MedicalRecordTimelineProps {
    patientId: string;
    familyMemberId?: string;
}

export function MedicalRecordTimeline({ patientId, familyMemberId }: MedicalRecordTimelineProps) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            console.log("Timeline fetching URL:", url); // Debug
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
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    {format(parseISO(record.visit_date), "dd 'de' MMMM, yyyy", { locale: es })}
                                    <Badge variant="outline" className="capitalize font-normal text-xs">
                                        {record.record_type?.replace('_', ' ') || 'Consulta'}
                                    </Badge>
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Dr. {record.doctors?.name} - {record.doctors?.specialty}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {record.diagnosis && (
                            <div>
                                <h4 className="font-semibold text-sm text-blue-800">Diagnóstico</h4>
                                <p className="text-sm mt-1">{record.diagnosis}</p>
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
                        {record.treatment_plan && (
                            <div>
                                <h4 className="font-semibold text-sm text-green-800">Plan de Tratamiento</h4>
                                <p className="text-sm mt-1">{record.treatment_plan}</p>
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
        </div>
    );
}

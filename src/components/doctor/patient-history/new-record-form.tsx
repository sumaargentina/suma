import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Loader2,
    Save,
    Sparkles,
    Wand2,
    Mic,
    FileText,
    Calendar,
    Check,
    Trash2,
    Plus,
    Pill,
    Lock,
    CheckCircle2,
    Edit3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { resolveDoctorCapabilities } from '@/lib/professions-catalog';
import { format, addDays, parseISO } from 'date-fns';

interface NewRecordFormProps {
    patientId: string;
    familyMemberId?: string;
    doctorId: string;
    onSuccess: () => void;
}

interface MedicationItem {
    id: string;
    text: string;
    approved: boolean;
    controlledOnly: boolean;
    fromAi?: boolean;
}

/**
 * Limpia cantidades de empaque ("1 caja", "2 cajas", etc.) por si se pegan o dictan
 */
function cleanMedicationText(raw: string): string {
    return raw
        .replace(/^(\d+[\.\)\-]\s*|[\-\•\*]\s*)/, '')
        .replace(/\(\s*(caja|frasco|bl[ií]ster|envase|paquete)[^)]*\)/gi, '')
        .replace(/[\-\–\—\,\:]?\s*\b(comprar\s+)?\d+\s*(cajas?|frascos?|bl[ií]sters?|envases?|paquetes?)\b.*$/gi, '')
        .replace(/\s*\[SOLO CON R[EÉ]CIPE\s*\-\s*ENTREGA [UÚ]NICA\]/gi, '')
        .trim();
}

function buildPrescriptionString(items: MedicationItem[]): string {
    return items
        .map((item, idx) => {
            const clean = item.text.trim();
            if (!clean) return '';
            const suffix = item.controlledOnly ? ' [SOLO CON RÉCIPE - ENTREGA ÚNICA]' : '';
            return `${idx + 1}. ${clean}${suffix}`;
        })
        .filter(Boolean)
        .join('\n');
}

export function NewRecordForm({ patientId, familyMemberId, doctorId: initialDoctorId, onSuccess }: NewRecordFormProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const { professionsCatalog } = useSettings();
    const capabilities = resolveDoctorCapabilities(user, professionsCatalog);
    const [loading, setLoading] = useState(false);

    // AI States
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasAiGenerated, setHasAiGenerated] = useState(false);

    // Medications structured list (one by one with Approve / Delete / Edit)
    const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([]);
    const [newMedInput, setNewMedInput] = useState('');
    const [showRawPrescription, setShowRawPrescription] = useState(false);

    // WHISPER-BASED VOICE RECORDING
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            console.log('🎙️ Solicitando acceso al micrófono...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('⏹️ Grabación detenida. Procesando audio...');

                stream.getTracks().forEach(track => track.stop());

                const audioBlob = new Blob(audioChunksRef.current, {
                    type: mediaRecorder.mimeType
                });

                if (audioBlob.size < 1000) {
                    toast({
                        variant: 'destructive',
                        title: 'Grabación muy corta',
                        description: 'Por favor, habla un poco más tiempo.'
                    });
                    return;
                }

                await transcribeAudio(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);

            toast({
                title: '🎙️ Grabando...',
                description: 'Habla ahora. Presiona el botón nuevamente para detener.',
            });

        } catch (error: any) {
            console.error('❌ Error accessing microphone:', error);

            if (error.name === 'NotAllowedError') {
                toast({
                    variant: 'destructive',
                    title: 'Micrófono Bloqueado',
                    description: 'Permite el acceso al micrófono en el navegador.'
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error de Audio',
                    description: 'No se pudo acceder al micrófono.'
                });
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const transcribeAudio = async (audioBlob: Blob) => {
        setIsTranscribing(true);

        try {
            const formData = new FormData();
            const audioFile = new File([audioBlob], 'recording.webm', {
                type: audioBlob.type
            });
            formData.append('audio', audioFile);

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Transcription failed');
            }

            const data = await response.json();

            if (data.text) {
                setAiPrompt(prev => {
                    const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
                    return prev + spacer + data.text;
                });

                toast({
                    title: '✅ Texto transcrito',
                    description: data.text.substring(0, 60) + (data.text.length > 60 ? '...' : ''),
                    className: 'bg-green-50 border-green-200'
                });
            }

        } catch (error: any) {
            console.error('❌ Transcription error:', error);
            toast({
                variant: 'destructive',
                title: 'Error de Transcripción',
                description: error.message || 'No se pudo transcribir el audio.'
            });
        } finally {
            setIsTranscribing(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    // Por defecto requires_rest es FALSE y rest_days es 0 (SOLO se activa si el médico indica reposo)
    const [formData, setFormData] = useState({
        record_type: 'consultation',
        reason_for_visit: '',
        diagnosis: '',
        evaluation: '',
        requested_studies: '',
        prescription: '',
        prescription_expires_at: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        treatment_plan: '',
        evolution: '',
        medical_report: '',
        requires_rest: false,
        rest_days: 0,
        rest_start_date: format(new Date(), 'yyyy-MM-dd'),
        rest_end_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        rest_type: 'Absoluto',
        rest_justification: 'Por presentar cuadro clínico descrito amerita reposo de salud para su recuperación.'
    });

    // Sincronizar formData.prescription cada vez que cambian los medicationItems
    const syncMedicationItemsToPrescription = (items: MedicationItem[]) => {
        setMedicationItems(items);
        const formatted = buildPrescriptionString(items);
        setFormData(prev => ({
            ...prev,
            prescription: formatted
        }));
    };

    const handleAddMedicationItem = (textToAdd?: string) => {
        const raw = (textToAdd !== undefined ? textToAdd : newMedInput).trim();
        if (!raw) return;
        const clean = cleanMedicationText(raw);
        if (!clean) return;

        const nextItems: MedicationItem[] = [
            ...medicationItems,
            {
                id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                text: clean,
                approved: true,
                controlledOnly: true,
                fromAi: false
            }
        ];
        syncMedicationItemsToPrescription(nextItems);
        if (textToAdd === undefined) {
            setNewMedInput('');
        }
    };

    const handleUpdateMedicationItemText = (id: string, newText: string) => {
        const nextItems = medicationItems.map(item =>
            item.id === id ? { ...item, text: newText } : item
        );
        syncMedicationItemsToPrescription(nextItems);
    };

    const handleApproveMedicationItem = (id: string) => {
        const nextItems = medicationItems.map(item =>
            item.id === id ? { ...item, approved: true } : item
        );
        syncMedicationItemsToPrescription(nextItems);
        toast({
            title: '✅ Medicamento Aprobado',
            description: 'El medicamento ha sido confirmado en el récipe.'
        });
    };

    const handleApproveAllMedications = () => {
        const nextItems = medicationItems.map(item => ({ ...item, approved: true }));
        syncMedicationItemsToPrescription(nextItems);
        toast({
            title: '✅ Todos los medicamentos aprobados',
            description: 'Puedes seguir editando cualquier detalle antes de guardar.'
        });
    };

    const handleDeleteMedicationItem = (id: string) => {
        const removed = medicationItems.find(i => i.id === id);
        const nextItems = medicationItems.filter(item => item.id !== id);
        syncMedicationItemsToPrescription(nextItems);
        toast({
            title: '🗑️ Medicamento Eliminado',
            description: removed ? `Se quitó "${removed.text}" del récipe.` : 'Medicamento eliminado del récipe.'
        });
    };

    const handleToggleControlledMedication = (id: string) => {
        const nextItems = medicationItems.map(item =>
            item.id === id ? { ...item, controlledOnly: !item.controlledOnly } : item
        );
        syncMedicationItemsToPrescription(nextItems);
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) {
            toast({ title: 'Escribe algo primero', description: 'Por favor dicta o escribe tus notas rápidas para procesarlas.', variant: 'default' });
            return;
        }

        try {
            setIsGenerating(true);
            const response = await fetch('/api/ai/generate-record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: aiPrompt,
                    context: 'Paciente ID: ' + patientId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en IA');
            }

            const data = await response.json();

            // Extraer medicamentos individuales sin cantidades de cajas
            let rawMedsList: string[] = [];
            if (Array.isArray(data.medications) && data.medications.length > 0) {
                rawMedsList = data.medications;
            } else if (typeof data.prescription === 'string' && data.prescription.trim()) {
                rawMedsList = data.prescription.split(/\r?\n/);
            }

            const aiMedItems: MedicationItem[] = rawMedsList
                .map((line: string) => cleanMedicationText(String(line || '')))
                .filter(Boolean)
                .map((cleanLine: string, idx: number) => ({
                    id: `ai-med-${Date.now()}-${idx}`,
                    text: cleanLine,
                    approved: false, // Queda listo para que el médico lo apruebe o elimine
                    controlledOnly: true,
                    fromAi: true
                }));

            setMedicationItems(aiMedItems);
            const formattedPrescription = buildPrescriptionString(aiMedItems);

            // Reposo SOLA Y EXCLUSIVAMENTE si el médico lo indicó explícitamente
            const aiRequiresRest = Boolean(data.requires_rest === true);
            const aiRestDays = aiRequiresRest ? (Number(data.rest_days) > 0 ? Number(data.rest_days) : 3) : 0;
            const startDateStr = format(new Date(), 'yyyy-MM-dd');
            const endDateStr = aiRequiresRest
                ? format(addDays(new Date(), Math.max(0, aiRestDays - 1)), 'yyyy-MM-dd')
                : startDateStr;

            setFormData(prev => ({
                ...prev,
                reason_for_visit: data.reason || prev.reason_for_visit,
                diagnosis: data.diagnosis || prev.diagnosis,
                evaluation: data.evaluation || prev.evaluation,
                requested_studies: data.requested_studies !== undefined ? data.requested_studies : prev.requested_studies,
                prescription: formattedPrescription,
                treatment_plan: data.treatment || prev.treatment_plan,
                evolution: data.evolution || prev.evolution,
                medical_report: data.medical_report || prev.medical_report,
                requires_rest: aiRequiresRest,
                rest_days: aiRestDays,
                rest_start_date: startDateStr,
                rest_end_date: endDateStr,
                rest_justification: aiRequiresRest && data.rest_justification
                    ? data.rest_justification
                    : prev.rest_justification
            }));

            setHasAiGenerated(true);

            toast({
                title: '✨ ¡Historia generada por IA!',
                description: 'Revisa, edita, aprueba o elimina los medicamentos y demás campos antes de guardar.',
                className: 'bg-indigo-50 border-indigo-200 text-indigo-800'
            });

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error de IA', description: error.message || 'No pudimos procesar el texto. Inténtalo de nuevo.' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const effectiveDiagnosis = formData.diagnosis.trim() || formData.reason_for_visit.trim() || formData.evaluation.trim();
        const effectivePrescription = medicationItems.length > 0
            ? buildPrescriptionString(medicationItems)
            : formData.prescription.trim();
        const effectiveTreatment = formData.treatment_plan.trim() || effectivePrescription;

        if (!effectiveDiagnosis || !effectiveTreatment) {
            toast({
                variant: 'destructive',
                title: 'Faltan datos',
                description: 'Por favor completa el diagnóstico (o evaluación) y el plan de tratamiento (o récipe).'
            });
            return;
        }

        try {
            setLoading(true);
            const validDoctorId = initialDoctorId || user?.id;

            if (!validDoctorId && !user?.email) {
                throw new Error('No se pudo identificar tu usuario como profesional.');
            }

            // Garantizar que si el médico NO marcó reposo, jamás se guarde reposo en la base de datos
            const strictlyRequiresRest = Boolean(formData.requires_rest);
            const strictlyRestDays = strictlyRequiresRest ? Math.max(1, Number(formData.rest_days) || 3) : 0;

            const payload = {
                patient_id: patientId,
                family_member_id: familyMemberId || null,
                doctor_id: validDoctorId,
                doctor_email: user?.email,
                visit_date: new Date().toISOString(),
                ...formData,
                prescription: effectivePrescription,
                diagnosis: effectiveDiagnosis,
                treatment_plan: effectiveTreatment,
                requires_rest: strictlyRequiresRest,
                rest_days: strictlyRestDays,
                rest_start_date: strictlyRequiresRest ? formData.rest_start_date : null,
                rest_end_date: strictlyRequiresRest ? formData.rest_end_date : null,
                rest_type: strictlyRequiresRest ? formData.rest_type : null,
                rest_justification: strictlyRequiresRest ? formData.rest_justification : null,
            };

            if (user) {
                await fetch('/api/auth/set-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: validDoctorId,
                        email: user.email,
                        role: user.role,
                        name: user.name,
                        clinicId: user.activeWorkspace?.clinicId || user.clinicId
                    })
                }).catch(() => {});
            }

            let response = await fetch('/api/medical-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 && user) {
                await fetch('/api/auth/set-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: validDoctorId,
                        email: user.email,
                        role: user.role,
                        name: user.name,
                        clinicId: user.activeWorkspace?.clinicId || user.clinicId
                    })
                }).catch(() => {});

                response = await fetch('/api/medical-records', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error del servidor');
            }

            toast({ title: 'Registro Guardado', description: 'La evolución, récipe y órdenes se han guardado correctamente.' });
            onSuccess();
        } catch (error: any) {
            console.error('❌ Error saving record:', error);
            toast({
                variant: 'destructive',
                title: 'Error al Guardar',
                description: error.message || 'No se pudo guardar. Intenta de nuevo.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-1 space-y-8">

            {/* AI MAGIC BOX */}
            <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-100 shadow-sm">
                <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                            <Sparkles className="h-5 w-5 fill-indigo-200" />
                            <h3>Escriba Médico Inteligente (AI)</h3>
                        </div>
                        {/* MIC BUTTON - WHISPER BASED */}
                        <Button
                            size="sm"
                            variant={isRecording ? "destructive" : "secondary"}
                            onClick={toggleRecording}
                            disabled={isTranscribing}
                            className={`gap-2 ${isRecording ? 'animate-pulse' : 'bg-white text-indigo-700 hover:bg-indigo-100'}`}
                            type="button"
                        >
                            {isTranscribing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : isRecording ? (
                                <>
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    Detener
                                </>
                            ) : (
                                <>
                                    <Mic className="h-4 w-4" />
                                    Dictar
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Textarea
                            placeholder="Presiona 'Dictar', habla sobre la consulta, medicamentos (ej: Acetaminofén de 800mg por 3 días), exámenes de laboratorio o reposo si aplica, y presiona 'Detener'..."
                            className={`bg-white/80 border-indigo-200 focus:border-indigo-400 min-h-[80px] transition-colors ${isRecording ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                        />
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-muted-foreground">
                            <span>* La IA transcribe fielmente lo que indiques sin inventar medicamentos ni agregar cajas.</span>
                            <Button
                                size="sm"
                                onClick={handleAiGenerate}
                                disabled={isGenerating || !aiPrompt}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shrink-0"
                                type="button"
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                Autocompletar Campos
                            </Button>
                        </div>
                    </div>

                    {hasAiGenerated && (
                        <div className="bg-white/90 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-950 flex items-start gap-2.5 shadow-2xs">
                            <Edit3 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block text-indigo-900">
                                    Control Total del Médico sobre la Historia
                                </span>
                                <span className="text-slate-600">
                                    Revisa lo que estructuró la IA: puedes <strong>aprobar, editar o eliminar cada medicamento</strong> individualmente, modificar el diagnóstico, los exámenes de laboratorio, el tratamiento o el reposo antes de guardar.
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Revisa, Edita o Llena Manualmente</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tipo de Registro</Label>
                        <Select
                            value={formData.record_type}
                            onValueChange={(val) => setFormData({ ...formData, record_type: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="consultation">Consulta Médica</SelectItem>
                                <SelectItem value="wellness_session">Sesión de Bienestar</SelectItem>
                                <SelectItem value="aesthetic_procedure">Procedimiento Estético</SelectItem>
                                <SelectItem value="checkup">Control / Chequeo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Motivo (Breve)</Label>
                        <Input
                            placeholder="Ej: Dolor de espalda / Fiebre"
                            value={formData.reason_for_visit}
                            onChange={(e) => setFormData({ ...formData, reason_for_visit: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-blue-900 font-medium">Diagnóstico</Label>
                        <Textarea
                            placeholder="Diagnóstico presuntivo o definitivo..."
                            className="min-h-[80px] border-blue-100 focus:border-blue-300"
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-purple-900 font-medium">Evaluación Clínica</Label>
                        <Textarea
                            placeholder="Examen físico, signos vitales, hallazgos..."
                            className="min-h-[80px] border-purple-100 focus:border-purple-300"
                            value={formData.evaluation}
                            onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-amber-900 font-semibold">
                            🔬 Estudios de Laboratorio / Imágenes Solicitados
                        </Label>
                        {formData.requested_studies.trim() && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setFormData({ ...formData, requested_studies: '' })}
                                className="h-6 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                                <Trash2 className="h-3 w-3 mr-1" /> Limpiar estudios
                            </Button>
                        )}
                    </div>
                    <Textarea
                        placeholder="Ej: Hematología completa, Glicemia en ayunas, Examen de orina (Puedes editar o borrar libremente)..."
                        className="min-h-[65px] border-amber-200 focus:border-amber-400 bg-amber-50/20"
                        value={formData.requested_studies}
                        onChange={(e) => setFormData({ ...formData, requested_studies: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                        Si indicas exámenes aquí, cualquier Laboratorio Aliado SUMA podrá verlos automáticamente cuando el paciente llegue y dicte su cédula (incluso sin cita).
                    </p>
                </div>

                {/* ========================================================================= */}
                {/* SECCIÓN DE MEDICAMENTOS UNO POR UNO (APROBAR / EDITAR / ELIMINAR)         */}
                {/* ========================================================================= */}
                <div className="space-y-4">
                    {capabilities.hasPrescription && (
                        <Card className="border-2 border-teal-200 bg-gradient-to-b from-teal-50/40 via-white to-teal-50/20 shadow-xs overflow-hidden">
                            <CardContent className="p-4 sm:p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-100 pb-3">
                                    <div>
                                        <Label className="text-teal-950 font-bold text-sm flex items-center gap-1.5">
                                            <Pill className="h-4 w-4 text-teal-600" />
                                            💊 Récipe Médico (Medicamentos Uno por Uno)
                                        </Label>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Cada medicamento queda separado individualmente (sin colocar cantidad de cajas). Puedes editarlo, aprobarlo o eliminarlo.
                                        </p>
                                    </div>

                                    {medicationItems.some(m => !m.approved) && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleApproveAllMedications}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 shrink-0"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Aprobar Todos ({medicationItems.filter(m => !m.approved).length})
                                        </Button>
                                    )}
                                </div>

                                {/* Lista de Medicamentos Individuales */}
                                {medicationItems.length === 0 ? (
                                    <div className="text-center py-5 px-3 rounded-xl border border-dashed border-teal-200 bg-white/70 text-xs text-slate-500">
                                        No hay medicamentos agregados aún. Dicta con la IA o agrega un medicamento abajo.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {medicationItems.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                                                    item.approved
                                                        ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs'
                                                        : 'bg-amber-50/40 border-amber-300 shadow-xs'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-6 w-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                                        item.approved
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-amber-500 text-white'
                                                    }`}>
                                                        {idx + 1}
                                                    </span>

                                                    <Input
                                                        value={item.text}
                                                        onChange={(e) => handleUpdateMedicationItemText(item.id, e.target.value)}
                                                        placeholder="Ej: Acetaminofén de 800 g por 3 días"
                                                        className="h-9 text-xs font-medium bg-white border-slate-200 flex-1"
                                                    />

                                                    {/* Botón Aprobar */}
                                                    {item.approved ? (
                                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px] px-2.5 py-1 flex items-center gap-1 shrink-0">
                                                            <Check className="h-3 w-3 text-emerald-600" />
                                                            Aprobado
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => handleApproveMedicationItem(item.id)}
                                                            className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1 shrink-0"
                                                            title="Aprobar este medicamento"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                            Aprobar
                                                        </Button>
                                                    )}

                                                    {/* Botón Eliminar */}
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDeleteMedicationItem(item.id)}
                                                        className="h-8 px-2.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold gap-1 shrink-0"
                                                        title="Eliminar este medicamento"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">Eliminar</span>
                                                    </Button>
                                                </div>

                                                {/* Control de Medicamento Delicado (Solo por Récipe) */}
                                                <div className="flex items-center justify-between pl-8 text-[11px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleControlledMedication(item.id)}
                                                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold transition-colors ${
                                                            item.controlledOnly
                                                                ? 'bg-teal-100/80 text-teal-900 border-teal-300'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}
                                                    >
                                                        <Lock className="h-3 w-3 text-teal-700" />
                                                        {item.controlledOnly
                                                            ? 'Medicamento controlado por Récipe (Se bloquea en farmacia tras entregarse)'
                                                            : 'Venta libre / Sin bloqueo estricto'}
                                                    </button>
                                                    {item.fromAi && !item.approved && (
                                                        <span className="text-[10px] font-semibold text-amber-700">
                                                            Sugerido por tu dictado • Confirma o edita
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Agregar nuevo medicamento manualmente */}
                                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                    <Input
                                        placeholder="Agregar medicamento (ej: Acetaminofén de 800 g por 3 días)..."
                                        value={newMedInput}
                                        onChange={(e) => setNewMedInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddMedicationItem();
                                            }
                                        }}
                                        className="h-9 text-xs bg-white border-teal-200 flex-1"
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAddMedicationItem()}
                                        className="h-9 border-teal-300 text-teal-800 hover:bg-teal-100/60 text-xs font-semibold gap-1.5 shrink-0"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Agregar Medicamento
                                    </Button>
                                </div>

                                {/* Opción para ver/editar texto plano del récipe */}
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowRawPrescription(!showRawPrescription)}
                                        className="text-[11px] text-teal-700 hover:underline font-medium"
                                    >
                                        {showRawPrescription ? 'Ocultar vista de texto completo del récipe' : 'Ver / editar texto completo del récipe'}
                                    </button>
                                    {showRawPrescription && (
                                        <Textarea
                                            placeholder={`Listado de medicamentos:\n1. Acetaminofén de 800 g por 3 días\n2. Ibuprofeno 600 mg por 5 días`}
                                            className="mt-2 min-h-[90px] border-teal-200 focus:border-teal-400 bg-white text-xs"
                                            value={formData.prescription}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, prescription: val });
                                                const lines = val
                                                    .split(/\r?\n/)
                                                    .map(l => cleanMedicationText(l))
                                                    .filter(Boolean);
                                                setMedicationItems(lines.map((t, i) => ({
                                                    id: `manual-${i}-${Date.now()}`,
                                                    text: t,
                                                    approved: true,
                                                    controlledOnly: true
                                                })));
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Control de Vigencia / Expiración del Récipe */}
                                <div className="p-3 rounded-lg border border-teal-200/80 bg-teal-50/40 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-medium text-teal-900">
                                        <span className="flex items-center gap-1.5 font-semibold">
                                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                            Vigencia del Récipe:
                                        </span>
                                        <span className="text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded font-medium">
                                            Vence el {formData.prescription_expires_at ? format(parseISO(formData.prescription_expires_at), 'dd/MM/yyyy') : 'N/A'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {[
                                            { label: '7 días', days: 7 },
                                            { label: '15 días', days: 15 },
                                            { label: '30 días', days: 30 },
                                            { label: '60 días', days: 60 },
                                            { label: '90 días', days: 90 },
                                        ].map((preset) => {
                                            const presetDate = format(addDays(new Date(), preset.days), 'yyyy-MM-dd');
                                            const isSelected = formData.prescription_expires_at === presetDate;
                                            return (
                                                <button
                                                    type="button"
                                                    key={preset.days}
                                                    onClick={() => setFormData({ ...formData, prescription_expires_at: presetDate })}
                                                    className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-medium border ${
                                                        isSelected
                                                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                                            : 'bg-white text-teal-800 border-teal-200 hover:bg-teal-100/50'
                                                    }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}

                                        <div className="flex items-center gap-1 ml-auto">
                                            <span className="text-[11px] text-teal-700">Manual:</span>
                                            <Input
                                                type="date"
                                                min={format(new Date(), 'yyyy-MM-dd')}
                                                value={formData.prescription_expires_at || ''}
                                                onChange={(e) => setFormData({ ...formData, prescription_expires_at: e.target.value })}
                                                className="h-7 w-[125px] text-[11px] px-1.5 py-0 bg-white border-teal-200 text-teal-900"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-teal-700/90 leading-tight">
                                        🔒 Una vez que una farmacia entregue estos medicamentos delicados bajo récipe, el récipe quedará bloqueado con el nombre de la farmacia y médico tratante para impedir doble entrega.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-2">
                        <Label className="text-green-900 font-semibold flex items-center gap-1.5">
                            📋 Plan de Tratamiento / Indicaciones para el Paciente
                        </Label>
                        <Textarea
                            placeholder={`Indicaciones de toma para el paciente:\n- Acetaminofén 800mg: Tomar cada 8 horas por 3 días.\n- Hidratación abundante.`}
                            className="min-h-[110px] border-green-200 focus:border-green-400 bg-green-50/20"
                            value={formData.treatment_plan}
                            onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                            required
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Instrucciones claras de horarios y duración para el paciente (puedes editar libremente lo generado por la IA).
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Evolución (Historia Actual de la Enfermedad)</Label>
                    <Textarea
                        placeholder="Antecedentes relevantes, evolución del cuadro, observaciones..."
                        className="min-h-[80px]"
                        value={formData.evolution}
                        onChange={(e) => setFormData({ ...formData, evolution: e.target.value })}
                    />
                </div>

                {/* ========================================================================= */}
                {/* SECCIÓN DE INFORME MÉDICO Y CONSTANCIA DE REPOSO                          */}
                {/* ========================================================================= */}
                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 overflow-hidden shadow-xs">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        Informe Médico & Constancia de Reposo
                                        {formData.requires_rest && (
                                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">
                                                {formData.rest_days} días de reposo
                                            </span>
                                        )}
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        El reposo se emite <strong>sola y exclusivamente</strong> si activas esta opción o lo indicas explícitamente.
                                    </p>
                                </div>
                            </div>

                            {/* Switch Reposo */}
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                <Label htmlFor="requires-rest-switch" className="text-xs font-semibold text-slate-700 cursor-pointer">
                                    ¿Lleva Reposo?
                                </Label>
                                <Switch
                                    id="requires-rest-switch"
                                    checked={formData.requires_rest}
                                    onCheckedChange={(checked) => {
                                        const defaultDays = checked ? (formData.rest_days > 0 ? formData.rest_days : 3) : 0;
                                        const startDate = formData.rest_start_date ? parseISO(formData.rest_start_date) : new Date();
                                        const endDate = addDays(startDate, Math.max(0, defaultDays - 1));
                                        setFormData({
                                            ...formData,
                                            requires_rest: checked,
                                            rest_days: defaultDays,
                                            rest_end_date: format(endDate, 'yyyy-MM-dd')
                                        });
                                    }}
                                    className="data-[state=checked]:bg-blue-600"
                                />
                            </div>
                        </div>

                        {/* Campos de Reposo Médico (SOLO si está habilitado explícitamente) */}
                        {formData.requires_rest && (
                            <div className="pt-2 border-t border-blue-100 space-y-3 animate-in fade-in-50 duration-200">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700 block mb-1.5">
                                        Duración del Reposo:
                                    </Label>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {[1, 2, 3, 5, 7, 10, 15, 21, 30].map((d) => (
                                            <Button
                                                key={d}
                                                type="button"
                                                size="sm"
                                                variant={formData.rest_days === d ? "default" : "outline"}
                                                className={`h-7 px-2.5 text-xs font-semibold rounded-lg ${
                                                    formData.rest_days === d 
                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                                }`}
                                                onClick={() => {
                                                    const startDate = formData.rest_start_date ? parseISO(formData.rest_start_date) : new Date();
                                                    const endDate = addDays(startDate, Math.max(0, d - 1));
                                                    setFormData({
                                                        ...formData,
                                                        rest_days: d,
                                                        rest_end_date: format(endDate, 'yyyy-MM-dd')
                                                    });
                                                }}
                                            >
                                                {d} {d === 1 ? 'día' : 'días'}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-600">Fecha Inicio:</Label>
                                        <Input
                                            type="date"
                                            value={formData.rest_start_date}
                                            onChange={(e) => {
                                                const newStart = e.target.value;
                                                const parsed = newStart ? parseISO(newStart) : new Date();
                                                const newEnd = addDays(parsed, Math.max(0, (formData.rest_days || 1) - 1));
                                                setFormData({
                                                    ...formData,
                                                    rest_start_date: newStart,
                                                    rest_end_date: format(newEnd, 'yyyy-MM-dd')
                                                });
                                            }}
                                            className="h-9 text-xs bg-white border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-600">Fecha Fin (Reincorporación):</Label>
                                        <Input
                                            type="date"
                                            value={formData.rest_end_date}
                                            onChange={(e) => setFormData({ ...formData, rest_end_date: e.target.value })}
                                            className="h-9 text-xs bg-white border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-600">Tipo de Reposo:</Label>
                                        <Select
                                            value={formData.rest_type}
                                            onValueChange={(val) => setFormData({ ...formData, rest_type: val })}
                                        >
                                            <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Absoluto">Absoluto (En cama / Hogar)</SelectItem>
                                                <SelectItem value="Relativo">Relativo (Sin esfuerzo)</SelectItem>
                                                <SelectItem value="Limitación de Esfuerzo">Limitación de Esfuerzos Físicos</SelectItem>
                                                <SelectItem value="Reposo de Voz">Reposo de Voz</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-slate-600">Motivo / Justificación Médica:</Label>
                                    <Input
                                        placeholder="Ej: Por presentar cuadro clínico descrito amerita reposo de salud para su recuperación."
                                        value={formData.rest_justification}
                                        onChange={(e) => setFormData({ ...formData, rest_justification: e.target.value })}
                                        className="h-9 text-xs bg-white border-slate-200"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Texto adicional del Informe Médico */}
                        <div className="space-y-1 pt-1">
                            <Label className="text-xs font-semibold text-slate-700">
                                Resumen Clínico para el Informe Oficial (Opcional):
                            </Label>
                            <Textarea
                                placeholder="Escribe observaciones específicas para el informe que se entregará al paciente (si se deja vacío, se utilizará la evolución y diagnóstico)..."
                                className="min-h-[70px] text-xs bg-white border-slate-200"
                                value={formData.medical_report}
                                onChange={(e) => setFormData({ ...formData, medical_report: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="submit" disabled={loading} className="w-full md:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Evolución
                    </Button>
                </div>
            </form>
        </div>
    );
}

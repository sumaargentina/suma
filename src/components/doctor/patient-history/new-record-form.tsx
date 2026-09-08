import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Sparkles, Wand2, Mic, MicOff, FileText, BedDouble, Calendar, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { format, addDays, parseISO } from 'date-fns';

interface NewRecordFormProps {
    patientId: string;
    familyMemberId?: string;
    doctorId: string;
    onSuccess: () => void;
}

export function NewRecordForm({ patientId, familyMemberId, doctorId: initialDoctorId, onSuccess }: NewRecordFormProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // AI States
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

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

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // Create audio blob
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: mediaRecorder.mimeType
                });

                console.log('📦 Audio blob creado:', audioBlob.size, 'bytes');

                if (audioBlob.size < 1000) {
                    toast({
                        variant: 'destructive',
                        title: 'Grabación muy corta',
                        description: 'Por favor, habla un poco más tiempo.'
                    });
                    return;
                }

                // Send to Whisper API
                await transcribeAudio(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);

            toast({
                title: '🎙️ Grabando...',
                description: 'Habla ahora. Presiona el botón nuevamente para detener.',
            });

            console.log('🔴 Grabación iniciada');

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
            console.log('⏹️ Deteniendo grabación...');
        }
    };

    const transcribeAudio = async (audioBlob: Blob) => {
        setIsTranscribing(true);

        try {
            console.log('🚀 Enviando audio a Whisper API...');

            const formData = new FormData();
            // Whisper needs a file with proper extension
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
            console.log('✅ Transcripción recibida:', data.text);

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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const [formData, setFormData] = useState({
        record_type: 'consultation',
        reason_for_visit: '',
        diagnosis: '',
        evaluation: '',
        requested_studies: '',
        prescription: '',
        treatment_plan: '',
        evolution: '',
        medical_report: '',
        requires_rest: false,
        rest_days: 3,
        rest_start_date: format(new Date(), 'yyyy-MM-dd'),
        rest_end_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        rest_type: 'Absoluto',
        rest_justification: 'Por presentar cuadro clínico descrito amerita reposo de salud para su recuperación.'
    });

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

            // Auto-fill form
            setFormData(prev => ({
                ...prev,
                reason_for_visit: data.reason || prev.reason_for_visit,
                diagnosis: data.diagnosis || prev.diagnosis,
                evaluation: data.evaluation || prev.evaluation,
                requested_studies: data.requested_studies || prev.requested_studies,
                prescription: data.prescription || prev.prescription,
                treatment_plan: data.treatment || prev.treatment_plan,
                evolution: data.evolution || prev.evolution,
                medical_report: data.medical_report || prev.medical_report,
                requires_rest: Boolean(data.requires_rest ?? prev.requires_rest),
                rest_days: data.rest_days || prev.rest_days
            }));

            toast({
                title: '✨ ¡Datos Estructurados!',
                description: 'La IA ha completado el formulario por ti. Revisa y guarda.',
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
        if (!formData.diagnosis || !formData.treatment_plan) {
            toast({ variant: 'destructive', title: 'Faltan datos', description: 'Por favor completa el diagnóstico y el tratamiento.' });
            return;
        }

        try {
            setLoading(true);
            let validDoctorId = initialDoctorId;

            const { data: checkId } = await supabase.from('doctors').select('id').eq('id', initialDoctorId).maybeSingle();

            if (!checkId) {
                console.log('⚠️ ID de doctor no coincide. Buscando por email...');
                if (user?.email) {
                    const { data: checkEmail } = await supabase.from('doctors').select('id').eq('email', user.email).maybeSingle();
                    if (checkEmail) {
                        validDoctorId = checkEmail.id;
                    }
                }
            }

            if (!validDoctorId) {
                throw new Error('No se pudo identificar tu usuario como doctor.');
            }

            const payload = {
                patient_id: patientId,
                family_member_id: familyMemberId,
                doctor_id: validDoctorId,
                visit_date: new Date().toISOString(),
                ...formData
            };

            console.log('🚀 Enviando a API Backend:', payload);

            const response = await fetch('/api/medical-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error del servidor');
            }

            const data = await response.json();
            console.log('✅ Guardado exitoso:', data);

            toast({ title: 'Registro Guardado', description: 'La evolución se ha guardado correctamente.' });
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
                            placeholder="Presiona 'Dictar', habla, y presiona 'Detener' cuando termines..."
                            className={`bg-white/80 border-indigo-200 focus:border-indigo-400 min-h-[80px] transition-colors ${isRecording ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                        />
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>* La IA estructurará esto en los campos de abajo automáticamente.</span>
                            <Button
                                size="sm"
                                onClick={handleAiGenerate}
                                disabled={isGenerating || !aiPrompt}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                                type="button"
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                Autocompletar Campos
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">O llena manualmente</span>
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
                            placeholder="Ej: Dolor de espalda / Limpieza Facial"
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
                    <Label className="text-amber-900 font-medium">Estudios Solicitados</Label>
                    <Textarea
                        placeholder="Laboratorios, imágenes, interconsultas solicitadas..."
                        className="min-h-[60px] border-amber-100 focus:border-amber-300"
                        value={formData.requested_studies}
                        onChange={(e) => setFormData({ ...formData, requested_studies: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-teal-900 font-semibold flex items-center gap-1.5">
                            💊 Récipe Médico (Prescripción para Farmacia)
                        </Label>
                        <Textarea
                            placeholder={`Listado de medicamentos a comprar:\n1. Amoxicilina 875mg (Caja x 14 comp) - 1 caja\n2. Ibuprofeno 600mg (Caja x 20 comp) - 1 caja`}
                            className="min-h-[110px] border-teal-200 focus:border-teal-400 bg-teal-50/20"
                            value={formData.prescription}
                            onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Este récipe se estampará con tu firma y podrá ser presentado o impreso por el paciente.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-green-900 font-semibold flex items-center gap-1.5">
                            📋 Plan de Tratamiento / Indicaciones
                        </Label>
                        <Textarea
                            placeholder={`Indicaciones de toma para el paciente:\n- Amoxicilina: Tomar 1 comprimido cada 12 horas con comida por 7 días.\n- Ibuprofeno: Tomar 1 comprimido cada 8 horas si hay dolor o fiebre.\n- Reposo por 48 horas.`}
                            className="min-h-[110px] border-green-200 focus:border-green-400 bg-green-50/20"
                            value={formData.treatment_plan}
                            onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                            required
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Instrucciones claras de horarios, duración y recomendaciones de reposo.
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
                                        Genera un informe oficial con validez legal y código QR para Recursos Humanos / Empresas.
                                    </p>
                                </div>
                            </div>

                            {/* Switch Reposo */}
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                <Label htmlFor="requires-rest-switch" className="text-xs font-semibold text-slate-700 cursor-pointer">
                                    ¿Emitir Reposo?
                                </Label>
                                <Switch
                                    id="requires-rest-switch"
                                    checked={formData.requires_rest}
                                    onCheckedChange={(checked) => setFormData({ ...formData, requires_rest: checked })}
                                    className="data-[state=checked]:bg-blue-600"
                                />
                            </div>
                        </div>

                        {/* Campos de Reposo Médico (si está habilitado) */}
                        {formData.requires_rest && (
                            <div className="pt-2 border-t border-blue-100 space-y-3 animate-in fade-in-50 duration-200">
                                
                                {/* Chips de Días Rápidos */}
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
                                placeholder="Escribe observaciones específicas para el informe o constancia que se entregará al paciente/empresa (si se deja vacío, se utilizará la evolución y diagnóstico)..."
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

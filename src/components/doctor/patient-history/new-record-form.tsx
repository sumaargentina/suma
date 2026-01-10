
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Sparkles, Wand2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

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
    const [isListening, setIsListening] = useState(false);

    // ... (rest of voice code is fine) ...

    const startListening = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-AR'; // Español Argentina
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = () => setIsListening(true);

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                // Construir el texto final
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                const current = Array.from(event.results)
                    .map((result: any) => result[0].transcript)
                    .join('');
                setAiPrompt(current);
            };

            recognition.onerror = (event: any) => {
                const errorType = String(event.error).toLowerCase();
                // Ignorar errores comunes de interrupción o silencio
                if (['aborted', 'no-speech', 'network', 'audio-capture'].includes(errorType)) {
                    setIsListening(false);
                    return;
                }
                console.error('Speech recognition error:', errorType);
                setIsListening(false);
                toast({ variant: 'destructive', title: 'Error de micrófono', description: 'Por favor verifica los permisos del micrófono.' });
            };

            recognition.onend = () => setIsListening(false);

            recognition.start();
            (window as any).recognitionInstance = recognition;
        } else {
            toast({ variant: 'destructive', title: 'Navegador no soportado', description: 'Tu navegador no soporta dictado por voz. Usa Chrome o Edge.' });
        }
    };

    const stopListening = () => {
        if ((window as any).recognitionInstance) {
            (window as any).recognitionInstance.stop();
            setIsListening(false);
        }
    };

    const toggleMic = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const [formData, setFormData] = useState({
        record_type: 'consultation',
        reason_for_visit: '',
        diagnosis: '',
        treatment_plan: '',
        notes: ''
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
                treatment_plan: data.treatment || prev.treatment_plan,
                notes: data.notes || prev.notes
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

            // 1. Verificar ID Doctor (Cliente - Lectura permitida)
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
                throw new Error('No se pudo identificar tu usuario como doctor. Revisa tu conexión o perfil.');
            }

            const payload = {
                patient_id: patientId,
                family_member_id: familyMemberId,
                doctor_id: validDoctorId,
                visit_date: new Date().toISOString(),
                ...formData
            };

            console.log('🚀 Enviando a API Backend:', payload);

            // USAR API SERVER-SIDE (BYPASS RLS)
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
                        {/* MIC BUTTON */}
                        <Button
                            size="sm"
                            variant={isListening ? "destructive" : "secondary"}
                            onClick={toggleMic}
                            className={`gap-2 ${isListening ? 'animate-pulse' : 'bg-white text-indigo-700 hover:bg-indigo-100'}`}
                            type="button" // Prevent submitting form
                        >
                            {isListening ? (
                                <>
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    Escuchando...
                                </>
                            ) : (
                                <>
                                    <span className="text-xl">🎙️</span> Dictar
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Textarea
                            placeholder="Presiona 'Dictar' y habla naturalmente..."
                            className={`bg-white/80 border-indigo-200 focus:border-indigo-400 min-h-[80px] transition-colors ${isListening ? 'border-red-400 ring-2 ring-red-100' : ''}`}
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

                <div className="space-y-2">
                    <Label className="text-blue-900 font-medium">Diagnóstico / Evaluación</Label>
                    <Textarea
                        placeholder="Descripción clínica..."
                        className="min-h-[100px] border-blue-100 focus:border-blue-300"
                        value={formData.diagnosis}
                        onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-green-900 font-medium">Plan de Tratamiento</Label>
                    <Textarea
                        placeholder="Indicaciones y recetas..."
                        className="min-h-[100px] border-green-100 focus:border-green-300"
                        value={formData.treatment_plan}
                        onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label>Notas Internas (Opcional)</Label>
                    <Textarea
                        placeholder="Notas privadas..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

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

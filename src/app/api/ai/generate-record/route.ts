import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Configuración dinámica: Soporta DeepSeek (Prioridad) u OpenAI
// Si existe DEEPSEEK_API_KEY, configura la baseURL para DeepSeek.
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com' : undefined;
const modelName = process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4o-mini';

const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
});

export async function POST(req: Request) {
    try {
        const { text, context } = await req.json();

        if (!text) {
            return NextResponse.json(
                { error: 'Se requiere texto para procesar' },
                { status: 400 }
            );
        }

        if (!apiKey) {
            // Fallback simulado si no hay ninguna API Key activada
            console.warn('Falta API KEY (DeepSeek u OpenAI). Usando modo simulación.');
            return NextResponse.json({
                reason: "Simulación: Dolor abdominal agudo",
                diagnosis: "Simulación: Gastritis probable",
                treatment: "Simulación: Buscapina compositum 10mg cada 8 horas.",
                notes: "Simulación: Paciente refiere dolor 8/10. Abdomen blando, depresible (No se detectó API Key)."
            });
        }

        // Prompt de Sistema para Médico Experto
        // DeepSeek responde muy bien a instrucciones estrictas de formato JSON
        const systemPrompt = `
      Eres un asistente médico experto encargado de estructurar notas clínicas.
      Tu única tarea es convertir el texto de entrada en un objeto JSON válido.
      NO escribas nada más que el JSON puro. Evita bloques de código markdown si es posible.

      Formato JSON requerido:
      {
        "reason": "Motivo de consulta técnico (breve, 1-2 frases)",
        "diagnosis": "Diagnóstico presuntivo o definitivo (CIE-10 si aplica)",
        "evaluation": "Evaluación clínica: examen físico, signos vitales, hallazgos",
        "requested_studies": "Estudios solicitados: laboratorios, imágenes, interconsultas (separados por coma)",
        "treatment": "Plan de tratamiento detallado (medicación, dosis, indicaciones)",
        "evolution": "Historia actual de la enfermedad: evolución, antecedentes relevantes, observaciones"
      }

      Contexto del paciente: ${context || 'General'}
      Usa terminología médica estándar en español (Argentina).
      Si no hay información para algún campo, deja una cadena vacía.
    `;

        const completion = await openai.chat.completions.create({
            model: modelName,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("Respuesta vacía de la IA");

        // Limpieza de seguridad por si el modelo envuelve en ```json ... ```
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

        let result;
        try {
            result = JSON.parse(cleanContent);
        } catch (e) {
            console.error("Error parseando JSON de IA:", cleanContent);
            throw new Error("La IA no devolvió un JSON válido.");
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Error en AI Service:', error);
        return NextResponse.json(
            { error: `Error procesando la solicitud de IA: ${error.message || JSON.stringify(error)}` },
            { status: 500 }
        );
    }
}

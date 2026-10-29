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

/**
 * Limpia cualquier referencia a cantidades de cajas, frascos o envases a comprar
 * que el modelo de lenguaje pudiera haber incluido por error.
 * Ej: "Acetaminofén 800mg por 3 días - 1 caja" -> "Acetaminofén 800mg por 3 días"
 */
function sanitizeMedicationLine(line: string): string {
    if (!line) return '';
    let cleaned = line.trim();

    // Quitar numeración inicial tipo "1)", "1.", "- ", "• "
    cleaned = cleaned.replace(/^(\d+[\.\)\-]\s*|[\-\•\*]\s*)/, '').trim();

    // Quitar paréntesis que hablen de cajas, frascos, blísters o cantidad de comprimidos por caja
    cleaned = cleaned.replace(/\(\s*(caja|frasco|bl[ií]ster|envase|paquete|sobre|tubo)[^)]*\)/gi, '').trim();

    // Quitar sufijos tipo "- 1 caja", "— 2 cajas", ", 1 frasco", "comprar 1 caja", etc.
    cleaned = cleaned.replace(/[\-\–\—\,\:]?\s*\b(comprar\s+)?\d+\s*(cajas?|frascos?|bl[ií]sters?|envases?|paquetes?|unidades?|tubos?|ampollas?)\b.*$/gi, '').trim();

    // Quitar frases sueltas como "(1 caja)" o "[1 caja]"
    cleaned = cleaned.replace(/[\(\[]\s*\d+\s*(cajas?|frascos?|bl[ií]sters?|envases?)\s*[\)\]]/gi, '').trim();

    // Limpiar guiones o espacios sobrantes al final
    cleaned = cleaned.replace(/[\-\–\—\,\:\;]+$/, '').replace(/\s{2,}/g, ' ').trim();

    return cleaned;
}

export async function POST(req: Request) {
    try {
        const { text, context } = await req.json();

        if (!text) {
            return NextResponse.json(
                { error: 'Se requiere texto para procesar' },
                { status: 400 }
            );
        }

        // Detectar si el texto del médico menciona explícitamente la palabra "reposo"
        const doctorMentionedRest = /\b(reposo|incapacidad|descanso m[eé]dico|baja laboral)\b/i.test(text);

        if (!apiKey) {
            // Fallback simulado si no hay ninguna API Key activada
            console.warn('Falta API KEY (DeepSeek u OpenAI). Usando modo simulación.');
            const fallbackMeds = ["Acetaminofén 800mg por 3 días"];
            return NextResponse.json({
                reason: "Simulación: Consulta general",
                diagnosis: "Simulación: Cuadro clínico en evaluación",
                evaluation: "Simulación: Paciente evaluado en consulta.",
                requested_studies: "",
                medications: fallbackMeds,
                prescription: fallbackMeds.join('\n'),
                treatment: "Simulación: Acetaminofén 800mg por 3 días según indicación médica.",
                evolution: "Simulación: Paciente refiere sintomatología descrita (No se detectó API Key).",
                requires_rest: doctorMentionedRest,
                rest_days: doctorMentionedRest ? 3 : 0
            });
        }

        // Prompt de Sistema para Médico Experto con reglas estrictas
        const systemPrompt = `
Eres un asistente médico transcriptor encargado de estructurar únicamente lo que el médico dictó o escribió en un objeto JSON válido.
NO escribas nada más que el JSON puro.

REGLAS ESTRICTAS E INQUEBRANTABLES:
1. NO INVENTES MEDICAMENTOS: En "medications" y "prescription" incluye ÚNICA Y EXCLUSIVAMENTE los medicamentos que el médico mencionó explícitamente en el texto. Está PROHIBIDO agregar, sugerir o inventar medicamentos adicionales que el médico no haya nombrado. Si el médico no nombró medicamentos, devuelve "medications": [] y "prescription": "".
2. NUNCA COLOQUES CANTIDAD DE CAJAS NI ENVASES: En los medicamentos NUNCA escribas "1 caja", "2 cajas", "un frasco", "caja x 14 comp" ni cuántas cajas o envases debe comprar. Escribe únicamente el nombre del medicamento, su dosis/gramaje y los días o frecuencia que dijo el médico.
   - Ejemplo CORRECTO: "Acetaminofén de 800 g por 3 días" o "Ibuprofeno 600 mg cada 8 horas por 5 días".
   - Ejemplo PROHIBIDO: "Acetaminofén 800mg - 1 caja" (NUNCA pongas la caja ni la cantidad).
3. MEDICAMENTOS SEPARADOS UNO POR UNO: El campo "medications" debe ser un arreglo JSON de strings donde cada elemento es un medicamento individual tal cual lo pidió el médico (ej: ["Acetaminofén de 800 g por 3 días", "Loratadina 10 mg por 5 días"]).
4. REPOSO MÉDICO SOLA Y EXCLUSIVAMENTE SI EL MÉDICO LO INDICA:
   - El campo "requires_rest" debe ser true ÚNICAMENTE si el médico dijo explícitamente que el paciente lleva reposo.
   - Si el médico NO mencionó reposo, "requires_rest" DEBE ser false, "rest_days" DEBE ser 0, y NO debes escribir la palabra reposo en "treatment" ni en ningún otro campo.
5. NO INVENTES ESTUDIOS DE LABORATORIO: En "requested_studies" coloca únicamente los exámenes de laboratorio o estudios que el médico pidió explícitamente. Si no pidió ninguno, déjalo vacío "".

Formato JSON requerido:
{
  "reason": "Motivo de consulta técnico basado en lo dicho por el médico (breve, 1-2 frases)",
  "diagnosis": "Diagnóstico mencionado por el médico (CIE-10 si aplica)",
  "evaluation": "Evaluación clínica: examen físico, signos vitales, hallazgos mencionados",
  "requested_studies": "Estudios solicitados: laboratorios, imágenes, interconsultas mencionados por el médico (separados por coma)",
  "medications": [
    "Medicamento 1 con su gramaje y días indicados (SIN colocar cajas ni cantidades)",
    "Medicamento 2 con su gramaje y días indicados (SIN colocar cajas ni cantidades)"
  ],
  "prescription": "Lista de los mismos medicamentos (uno por línea, SIN colocar cajas ni cantidades)",
  "treatment": "Plan de tratamiento e indicaciones de toma para el paciente según lo dicho por el médico (horarios, duración). NO incluir reposo a menos que el médico lo haya indicado explícitamente",
  "evolution": "Historia actual de la enfermedad: evolución, antecedentes relevantes, observaciones mencionadas",
  "requires_rest": false,
  "rest_days": 0,
  "rest_justification": "Justificación del reposo solo si requires_rest es true, de lo contrario cadena vacía"
}

Contexto del paciente: ${context || 'General'}
Usa terminología médica estándar en español respetando fielmente lo indicado por el médico.
Si no hay información para algún campo, deja una cadena vacía (o arreglo vacío para "medications").
`;

        const completion = await openai.chat.completions.create({
            model: modelName,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("Respuesta vacía de la IA");

        // Limpieza de seguridad por si el modelo envuelve en ```json ... ```
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

        let result: any;
        try {
            result = JSON.parse(cleanContent);
        } catch (e) {
            console.error("Error parseando JSON de IA:", cleanContent);
            throw new Error("La IA no devolvió un JSON válido.");
        }

        // Post-procesamiento estricto de medicamentos:
        // 1. Extraer lista de medicamentos desde result.medications o result.prescription
        let rawMeds: string[] = [];
        if (Array.isArray(result.medications) && result.medications.length > 0) {
            rawMeds = result.medications.map((m: any) => String(m || ''));
        } else if (typeof result.prescription === 'string' && result.prescription.trim()) {
            rawMeds = result.prescription
                .split(/\r?\n/)
                .map((l: string) => l.trim())
                .filter(Boolean);
        }

        const sanitizedMeds = rawMeds
            .map(sanitizeMedicationLine)
            .filter(Boolean);

        result.medications = sanitizedMeds;
        result.prescription = sanitizedMeds.join('\n');

        // 2. Post-procesamiento estricto de reposo:
        // Sola y exclusivamente si el médico mencionó reposo en su texto Y la IA lo detectó
        const finalRequiresRest = Boolean(doctorMentionedRest && result.requires_rest);
        result.requires_rest = finalRequiresRest;
        if (!finalRequiresRest) {
            result.rest_days = 0;
            result.rest_justification = '';
            // Si la IA coló "Reposo..." en treatment sin que el médico lo dijera, limpiarlo
            if (typeof result.treatment === 'string') {
                result.treatment = result.treatment
                    .split(/\r?\n/)
                    .filter((line: string) => !/^\s*[\-\•\*]?\s*reposo\b/i.test(line.trim()))
                    .join('\n')
                    .trim();
            }
        } else {
            result.rest_days = Number(result.rest_days) > 0 ? Number(result.rest_days) : 3;
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

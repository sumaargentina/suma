
'use server';

/**
 * @fileOverview AI assistant that answers patient questions, recommends specialists, and helps manage bookings.
 *
 * - whatsappAssistant - A function that handles the assistant process.
 * - WhatsAppAssistantInput - The input type for the whatsappAssistant function.
 * - WhatsAppAssistantOutput - The return type for the whatsappAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as supabaseService from '@/lib/supabaseService';

// Tool to find doctors
const findDoctorsTool = ai.defineTool(
  {
    name: 'findDoctors',
    description: 'Obtiene una lista de doctores, opcionalmente filtrando por especialidad y/o ciudad.',
    inputSchema: z.object({
      specialty: z.string().optional().describe('La especialidad por la que filtrar, ej., Cardiología'),
      location: z.string().optional().describe('La ciudad por la que filtrar, ej., Caracas'),
    }),
    outputSchema: z.array(z.object({
        name: z.string(),
        specialty: z.string(),
        city: z.string(),
        rating: z.number(),
    })),
  },
  async ({ specialty, location }) => {
    const doctors = await supabaseService.getDoctors();
    let filteredDoctors = doctors.filter(doc => doc.status === 'active');
    
    if (specialty) {
      filteredDoctors = filteredDoctors.filter(
        (doc) => doc.specialty.toLowerCase() === specialty.toLowerCase()
      );
    }
    if (location) {
      filteredDoctors = filteredDoctors.filter(
        (doc) => doc.city.toLowerCase() === location.toLowerCase()
      );
    }
    return filteredDoctors.map(({ name, specialty, city, rating }) => ({ name, specialty, city, rating }));
  }
);

const HistoryMessageSchema = z.object({
    sender: z.enum(['user', 'assistant']),
    text: z.string(),
});

const WhatsAppAssistantInputSchema = z.object({
  query: z.string().min(1, 'La consulta no puede estar vacía.').max(500, 'La consulta es demasiado larga.').describe('La consulta actual del usuario.'),
  history: z.array(HistoryMessageSchema).optional().describe('El historial de la conversación.')
});
export type WhatsAppAssistantInput = z.infer<typeof WhatsAppAssistantInputSchema>;

const WhatsAppAssistantOutputSchema = z.object({
  response: z.string().describe('La respuesta del asistente de IA.'),
});
export type WhatsAppAssistantOutput = z.infer<typeof WhatsAppAssistantOutputSchema>;

export async function whatsappAssistant(input: WhatsAppAssistantInput): Promise<WhatsAppAssistantOutput> {
  return whatsappAssistantFlow(input);
}

const systemPrompt = `Eres "SUMA", un asistente de IA amigable y profesional para una plataforma de citas médicas. Tu objetivo es ayudar a los pacientes a encontrar el especialista adecuado y facilitar la reserva de citas.

**Tu Personalidad:**
*   **Empático y Servicial:** Muestra que entiendes la necesidad del paciente.
*   **Profesional y Claro:** Comunícate de forma concisa y fácil de entender.
*   **Conversacional:** Usa el historial de la conversación para evitar hacer preguntas repetitivas. Si ya tienes un dato (como la ciudad o la especialidad), úsalo.

**Tu Proceso de Ayuda:**

1.  **Entender la Necesidad:** Analiza la consulta actual del usuario y el historial de la conversación para entender qué busca. Puede que te den síntomas ("me duele el pecho") o una especialidad directa ("busco un cardiólogo").
2.  **Reunir Información Clave:** Para encontrar un médico, necesitas dos datos: **la especialidad y la ciudad**.
    *   Si falta alguno de estos datos, pídelo amablemente. Por ejemplo, si te dan la especialidad pero no la ciudad, pregunta: "¡Excelente! ¿Y en qué ciudad te encuentras para buscarte un cardiólogo?".
3.  **Buscar al Especialista:** Una vez que tengas **ambos datos (especialidad y ciudad)**, usa la herramienta \`findDoctors\` para obtener la lista de especialistas.
4.  **Presentar los Resultados:**
    *   Si encuentras doctores, preséntalos en una lista numerada y clara. Incluye el **Nombre (en negrita)**, Especialidad, Ciudad y Calificación (con una estrella ⭐).
    *   Anima al paciente a ver más detalles en la plataforma.
    *   Si no encuentras a nadie, informa al paciente y sugiérele probar con otra ciudad o especialidad.

**Importante:** Si te hacen preguntas de salud generales, ofrece información útil, pero siempre recuerda al paciente que no eres un médico y que debe consultar a un profesional.
`;

const whatsappAssistantFlow = ai.defineFlow(
  {
    name: 'whatsappAssistantFlow',
    inputSchema: WhatsAppAssistantInputSchema,
    outputSchema: WhatsAppAssistantOutputSchema,
  },
  async ({ query, history }) => {
    
    let fullPrompt = systemPrompt + "\n\n---\n\nConversation History:\n";

    (history || []).forEach(message => {
        fullPrompt += `${message.sender === 'user' ? 'Patient' : 'Assistant'}: ${message.text}\n`;
    });

    fullPrompt += `Patient: ${query}\nAssistant:`;

    const response = await ai.generate({
      prompt: fullPrompt,
      tools: [findDoctorsTool],
      config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      },
    });

    const text = response.text;
    if (text) {
        return { response: text };
    }

    throw new Error("El asistente no pudo generar una respuesta.");
  }
);

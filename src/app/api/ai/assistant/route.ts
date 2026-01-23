import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as supabaseService from '@/lib/supabaseService';
import { format, addDays, parseISO, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

// Configuración dinámica: Soporta DeepSeek (Prioridad) u OpenAI
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com' : undefined;
const modelName = process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4o-mini';

const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
});

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ConversationMessage {
    sender: 'user' | 'assistant';
    text: string;
}

// Guía de triaje por síntomas
const TRIAGE_GUIDE = `
**GUÍA DE TRIAJE - Síntomas y Especialidades:**
- Dolor de cabeza, migrañas → Neurología
- Dolor de pecho, palpitaciones, presión alta → Cardiología  
- Tos, dificultad para respirar, gripe → Neumonología o Medicina General
- Dolor de estómago, digestión, reflujo → Gastroenterología
- Dolor de huesos, articulaciones, espalda → Traumatología u Ortopedia
- Problemas de piel, acné, manchas → Dermatología
- Ansiedad, depresión, estrés → Psiquiatría o Psicología
- Problemas de visión → Oftalmología
- Dolor de oído, garganta, nariz → Otorrinolaringología
- Problemas ginecológicos, embarazo → Ginecología
- Problemas urinarios, riñones → Urología o Nefrología
- Niños y adolescentes → Pediatría
- Chequeo general, prevención → Medicina General o Clínica Médica
- Diabetes, tiroides, hormonas → Endocrinología
- Alergias → Alergología

**NIVEL DE URGENCIA:**
🟢 Consulta regular: Puede esperar días
🟡 Pronto: Debería verse en 24-48h
🔴 Urgente: Ir a emergencias inmediatamente (dolor de pecho intenso, dificultad para respirar, ACV)
`;

export async function POST(req: Request) {
    try {
        const { query, history, userName, isLoggedIn, userId } = await req.json();

        if (!query) {
            return NextResponse.json(
                { error: 'Se requiere una consulta' },
                { status: 400 }
            );
        }

        if (!apiKey) {
            console.warn('Falta API KEY (DeepSeek u OpenAI). Usando modo simulación.');
            return NextResponse.json({
                response: "¡Hola! Soy SUMA, tu asistente de salud. 🏥\n\n¿En qué puedo ayudarte hoy? Puedo ayudarte a:\n- Encontrar el especialista adecuado para ti\n- Buscar doctores cerca de tu ubicación\n- Agendar una cita médica\n\nCuéntame, ¿qué molestia o necesidad tienes? (Modo simulación - API no configurada)"
            });
        }

        // Obtener lista de doctores para el contexto
        const doctors = await supabaseService.getDoctors();
        const activeDoctors = doctors.filter(d => d.status === 'active');

        // Obtener especialidades únicas disponibles
        const specialties = [...new Set(activeDoctors.map(d => d.specialty))].join(', ');

        // Obtener ciudades únicas disponibles
        const cities = [...new Set(activeDoctors.map(d => d.city).filter(Boolean))].join(', ');

        // Crear resumen de doctores CON precios para comparar
        const doctorsSummary = activeDoctors.slice(0, 25).map(d => {
            const price = d.consultationFee || 0;
            const priceCategory = price === 0 ? '💰 Consultar' :
                price < 5000 ? '💰 Económico' :
                    price < 10000 ? '💰💰 Moderado' : '💰💰💰 Premium';
            return `- Dr. ${d.name} | ${d.specialty} | ${d.city || 'Sin ubicación'} | ⭐${d.rating || 5} | $${price} (${priceCategory}) | ID: ${d.id} | Link: [Agendar cita](/doctors/${d.id})`;
        }).join('\n');

        // Ordenar por precio para comparaciones
        const doctorsByPrice = [...activeDoctors]
            .filter(d => d.consultationFee && d.consultationFee > 0)
            .sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));

        const cheapestDoctors = doctorsByPrice.slice(0, 5).map(d =>
            `- Dr. ${d.name} (${d.specialty}) - $${d.consultationFee} - ${d.city}`
        ).join('\n');

        // Obtener citas del paciente si está logueado
        let patientAppointmentsInfo = '';
        if (isLoggedIn && userId) {
            try {
                const appointments = await supabaseService.getPatientAppointments(userId);
                const now = new Date();
                const upcomingAppts = appointments
                    .filter(a => isAfter(parseISO(a.date), now) && a.patientConfirmationStatus !== 'Cancelada')
                    .slice(0, 5);

                if (upcomingAppts.length > 0) {
                    patientAppointmentsInfo = `\n**CITAS PENDIENTES DEL PACIENTE:**\n` +
                        upcomingAppts.map(a =>
                            `- ${format(parseISO(a.date), "EEEE d 'de' MMMM", { locale: es })} a las ${a.time} con Dr. ${a.doctorName || 'Asignado'} - Estado: ${a.patientConfirmationStatus}`
                        ).join('\n');
                } else {
                    patientAppointmentsInfo = '\n**CITAS PENDIENTES:** El paciente no tiene citas pendientes.';
                }
            } catch (e) {
                console.error('Error obteniendo citas del paciente:', e);
            }
        }

        // Información de disponibilidad rápida (próximos días)
        const today = new Date();
        const availabilityInfo = `
**DISPONIBILIDAD RÁPIDA:**
- Hoy: ${format(today, "EEEE d 'de' MMMM", { locale: es })}
- Mañana: ${format(addDays(today, 1), "EEEE d 'de' MMMM", { locale: es })}
- Pasado mañana: ${format(addDays(today, 2), "EEEE d 'de' MMMM", { locale: es })}
(Los doctores generalmente tienen agenda disponible. Sugiere al paciente ver el perfil para horarios exactos)
`;

        // Prompt del sistema mejorado con todas las funcionalidades
        const systemPrompt = `Eres "SUMA", un asistente de IA cálido, empático y profesional para una plataforma de citas médicas en Argentina.

**TU PERSONALIDAD:**
- Hablas de manera cercana y cálida, como un amigo que se preocupa por la salud
- Usas emojis ocasionalmente: 😊 🏥 👨‍⚕️ 💪 🩺
- Haces preguntas cortas y directas, una a la vez
- ${isLoggedIn && userName ? `El paciente se llama "${userName}". Llámalo por su nombre.` : 'Si no conoces el nombre, pregúntalo amablemente.'}

**TUS CAPACIDADES:**
1. 🩺 **TRIAJE**: Identificar qué especialista necesita según síntomas
2. 🔍 **BUSCAR DOCTORES**: Por especialidad, ciudad, precio
3. 💰 **COMPARAR PRECIOS**: Mostrar opciones económicas vs premium
4. 📅 **VER CITAS**: Informar sobre citas pendientes del paciente
5. ⏰ **DISPONIBILIDAD**: Sugerir doctores con turnos pronto

${TRIAGE_GUIDE}

**INFORMACIÓN EN TIEMPO REAL:**
- Especialidades disponibles: ${specialties}
- Ciudades con cobertura: ${cities}
${patientAppointmentsInfo}
${availabilityInfo}

**DOCTORES DISPONIBLES (ordenados por rating):**
${doctorsSummary}

**OPCIONES MÁS ECONÓMICAS:**
${cheapestDoctors || 'No hay información de precios disponible'}

**PROCESO DE CONVERSACIÓN:**
1. Saluda ${isLoggedIn && userName ? `a ${userName}` : 'y pregunta el nombre'}
2. Pregunta qué molestia o necesidad tiene
3. Usa el TRIAJE para identificar la especialidad correcta
4. Pregunta en qué ciudad está
5. Pregunta si prefiere: 💰 económico, ⭐ mejor valorado, o ⏰ más pronto
6. Muestra 2-3 doctores que coincidan CON LINKS
7. Invita a agendar

**REGLAS IMPORTANTES:**
- Respuestas CORTAS (máximo 4 líneas)
- Una pregunta a la vez
- Si preguntan por SUS CITAS, usa la información de "CITAS PENDIENTES DEL PACIENTE"
- Si preguntan por PRECIOS, compara opciones económicas vs premium
- Si es URGENTE (🔴), recomienda ir a emergencias
- SIEMPRE incluye links: [Agendar con Dr. X](/doctors/ID)
- Si preguntan "quién tiene turno hoy/mañana", sugiere ver el perfil del doctor
- Nunca diagnostiques, solo orienta hacia el especialista correcto`;

        // Construir historial de mensajes para la API
        const messages: Message[] = [
            { role: 'system', content: systemPrompt }
        ];

        // Agregar historial de conversación
        if (history && Array.isArray(history)) {
            history.forEach((msg: ConversationMessage) => {
                messages.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text
                });
            });
        }

        // Agregar mensaje actual
        messages.push({ role: 'user', content: query });

        const completion = await openai.chat.completions.create({
            model: modelName,
            messages: messages,
            temperature: 0.7,
            max_tokens: 600,
        });

        const responseText = completion.choices[0].message.content;

        if (!responseText) {
            throw new Error("El asistente no pudo generar una respuesta.");
        }

        return NextResponse.json({ response: responseText });

    } catch (error: any) {
        console.error('Error en AI Assistant:', error);
        return NextResponse.json(
            { error: `Error procesando la consulta: ${error.message || 'Error desconocido'}` },
            { status: 500 }
        );
    }
}

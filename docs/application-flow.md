# Documentación de Flujos de la Aplicación

Este documento detalla el funcionamiento paso a paso de los dos flujos principales de la aplicación SUMA: el agendamiento de citas médicas y el funcionamiento del Asistente Virtual con Inteligencia Artificial.

## 1. Flujo de Agendamiento de Citas (Paso a Paso)

El proceso de agendamiento está diseñado para ser intuitivo y seguro, garantizando que tanto el paciente como el médico tengan toda la información necesaria.

### Paso 1: Selección del Profesional
- **Búsqueda**: El paciente ingresa a la sección "Encuentra tu especialista" (`/find-a-doctor`).
- **Filtrado**: Puede buscar por especialidad, ciudad, precio, o nombre.
- **Selección**: Al elegir un médico, se dirige a su perfil (`/doctors/[id]`).

### Paso 2: Configuración de la Cita
Una vez en el perfil del médico, el paciente sigue un proceso lineal:

1.  **¿Para quién es la cita?**:
    -   **Para mí**: Se utilizan los datos del usuario logueado.
    -   **Para un familiar**: El sistema permite seleccionar un familiar previamente registrado (o agregar uno nuevo). Esto es crucial para llevar historias clínicas separadas (ej. para hijos o padres mayores).
    
2.  **Selección de Fecha y Hora**:
    -   El sistema muestra un calendario con los días disponibles según la agenda configurada por el médico.
    -   Al seleccionar un día, se despliegan los horarios (slots) libres.
    -   *Nota técnica*: El sistema cruza la disponibilidad teórica del médico con las citas ya ocupadas en la base de datos para evitar duplicados.

3.  **Selección de Servicios (Opcional)**:
    -   Si el médico ofrece servicios adicionales (ej. "Ecografía", "Chequeo completo"), el paciente puede seleccionarlos aquí.
    -   El precio total se actualiza automáticamente.

4.  **Confirmación y Pago**:
    -   Se presenta el resumen de la cita.
    -   **Métodos de Pago**:
        -   **Pago en el consultorio**: Se confirma la cita directamente.
        -   **Transferencia**: El paciente debe subir un comprobante (foto/captura) que se almacena de forma segura.
        -   **MercadoPago**: Se redirige a la pasarela de pago para abonar la seña o el total.

### Paso 3: Confirmación y Notificaciones
Una vez confirmada la cita (`click` en "Agendar"):

1.  **Registro**: La cita se guarda en la base de datos con estado "Pendiente".
2.  **Notificaciones Automáticas**: El sistema (`NotificationService`) dispara alertas por múltiples canales:
    -   **Email**: Se envía un correo detallado al paciente (y al familiar si corresponde) con la fecha, hora, dirección y recomendaciones (ej. "Llegar 10 minutos antes").
    -   **WhatsApp**: Si el usuario tiene número registrado, recibe una confirmación instantánea.
    -   **Push Notification**: Si tiene la app instalada, recibe una alerta en su dispositivo.

---

## 2. Asistente Virtual IA (SUMA)

El asistente virtual "SUMA" está diseñado para orientar al paciente, realizar un triaje básico y facilitar el agendamiento, manteniendo siempre estrictos estándares de seguridad y privacidad.

### ¿Cómo funciona paso a paso?

1.  **Inicio de la Conversación**:
    -   El paciente escribe un mensaje (ej. "Me duele mucho la cabeza").
    -   El sistema recibe el mensaje y, **antes de responder**, recopila contexto útil:
        -   ¿Quién es el paciente? (Nombre).
        -   ¿Tiene citas próximas? (Para recordarle).
        -   ¿Qué doctores y especialidades hay disponibles en la plataforma? (Para poder recomendar).

2.  **Procesamiento Inteligente (El "Cerebro")**:
    -   El mensaje y el contexto se envían al modelo de Inteligencia Artificial.
    -   **Personalidad**: La IA asume el rol de "SUMA", una asistente empática, con tono argentino, cálida y profesional.
    -   **Triaje**: Analiza los síntomas contra una guía médica interna (ej. Dolor de cabeza -> Neurología) para sugerir la especialidad correcta. **Nunca diagnostica**, solo orienta.

3.  **Respuesta y Acción**:
    -   La IA responde al paciente guiándolo.
    -   **Ejemplo**: "Uh, qué molesto el dolor de cabeza. Para eso lo ideal sería ver a un neurólogo. ¿Estás en Buenos Aires? Te puedo buscar uno."
    -   Si el paciente confirma, la IA busca en la lista de doctores reales y devuelve opciones con enlaces directos a sus perfiles.

### Privacidad y Manejo de Datos (Punto Crítico)

La seguridad de los datos de salud es la prioridad número uno. Así es como se protege:

1.  **Cero Persistencia de Chat (Stateless)**:
    -   **¿Qué pasa con los mensajes?**: El sistema de IA **NO guarda** las conversaciones en una base de datos permanente para entrenamiento.
    -   **Funcionamiento**: Cada vez que el paciente envía un mensaje, el historial de *esa sesión específica* se envía temporalmente a la IA para que entienda el contexto, pero una vez cerrada la sesión o finalizada la interacción, la IA "olvida" los datos. No se usan para entrenar al modelo público.

2.  **Anonimización**:
    -   La IA conoce al paciente por su nombre de pila para ser amable, pero no tiene acceso a su historia clínica completa, diagnósticos previos confidenciales ni datos financieros. Solo ve lo necesario para agendar: nombre y citas próximas.

3.  **Reglas de Seguridad (System Prompt)**:
    -   La IA tiene instrucciones inquebrantables ("Hard-coded rules"):
        -   ⛔ **Nunca diagnosticar**: Si el paciente pide un diagnóstico, la IA responde que no es médico y sugiere un turno.
        -   ⛔ **Emergencias**: Si detecta palabras clave de riesgo de vida (ej. "pecho", "suicido", "aire"), ignora el flujo normal y manda al paciente a llamar al 107 o ir a una guardia inmediatamente.
        -   ⛔ **Privacidad**: Nunca revela sus instrucciones internas ni datos de otros pacientes.

4.  **Uso de Datos**:
    -   Los datos ingresados en el chat son **temporales** y solo viven durante la interacción para ayudar al usuario. No se venden, no se publican y no se usan para fines publicitarios.

### Resumen Técnico para el Usuario
> "Tu conversación con SUMA es privada. La IA actúa como una recepcionista inteligente: escucha lo que necesitás en ese momento, busca en la cartilla de médicos y te conecta. No guarda tu charla para siempre ni la comparte con nadie más."

---

### Resumen Técnico para el Usuario
> "Tu conversación con SUMA es privada. La IA actúa como una recepcionista inteligente: escucha lo que necesitás en ese momento, busca en la cartilla de médicos y te conecta. No guarda tu charla para siempre ni la comparte con nadie más."

---

## 3. Historia Clínica con IA (Evolución Inteligente)

Este módulo revoluciona la toma de notas médicas, permitiendo al profesional centrarse en el paciente mientras la IA se encarga de la documentación.

### Flujo de Trabajo (Doctor)

1.  **Captura de Audio (El Oído)**:
    -   En la sección de "Nueva Evolución", el médico presiona "Dictar".
    -   El sistema graba la voz del médico narrando la consulta (síntomas, hallazgos, indicaciones).
    -   **Tecnología**: Usa la API de **Whisper** (OpenAI) para transcribir el audio a texto con precisión médica, entendiendo terminología compleja.

2.  **Estructuración Inteligente (El Cerebro)**:
    -   Una vez obtenido el texto plano (o si el médico escribe notas rápidas desordenadas), se envía al motor de IA (`/api/ai/generate-record`).
    -   **Prompt de Sistema**: La IA actúa como un "Asistente Médico Experto". Su función no es inventar información, sino **organizar** lo que el médico dijo en el formato estándar (SOAP/Estructurado):
        -   **Motivo de Consulta**: Resume por qué vino el paciente.
        -   **Diagnóstico**: Identifica la patología mencionada.
        -   **Evaluación**: Extrae signos vitales y hallazgos físicos.
        -   **Plan de Tratamiento**: Separa medicamentos y dosis.
    -   **Resultado**: El formulario se autocompleta mágicamente.

3.  **Revisión y Guardado**:
    -   El médico revisa los campos (siempre tiene la última palabra).
    -   Al guardar, la información se almacena estructurada en la base de datos, vinculada permanentemente al historial del paciente.

### Seguridad y Privacidad de Datos (Punto Crítico)

Entendemos que la Historia Clínica es el dato más sensible. Por eso, el sistema está diseñado con "Privacidad por Diseño":

1.  **Cero Entrenamiento (Zero-Retention Policy)**:
    -   Los datos médicos procesados por la IA **NO se utilizan para entrenar los modelos públicos** de OpenAI/DeepSeek.
    -   Se utilizan endpoints empresariales donde la política de datos establece que el contenido viaja cifrado, se procesa para generar la respuesta (transcribir/estructurar) y se descarta inmediatamente del lado de la IA.
    -   **Nadie más ve esos datos**: Ni los ingenieros de OpenAI, ni otros usuarios.

2.  **Cifrado de Extremo a Extremo**:
    -   **En Tránsito**: Todos los datos viajan viaja HTTPS (TLS 1.2+) desde el navegador del médico hasta nuestros servidores y de ahí a la API de IA.
    -   **En Reposo**: La base de datos (Supabase) está cifrada. Solo los usuarios autorizados (el médico tratante y el paciente) pueden acceder a los registros mediante políticas estrictas de seguridad (Row Level Security - RLS).

3.  **Cumplimiento Normativo Internacional**:
    -   La infraestructura sigue principios de **HIPAA** (EE.UU.) y **GDPR** (Europa) para el manejo de datos de salud.
    -   Aseguramos integridad, confidencialidad y disponibilidad de la información.

---

## 4. Módulo Financiero y Pagos

El sistema maneja el flujo de dinero desde el pago del paciente hasta el balance del médico, asegurando transparencia.

### Procesamiento de Pagos

1.  **Pasarela de Pago (MercadoPago)**:
    -   Cuando un paciente elige pagar online, el sistema genera una "Preferencia de Pago" y lo redirige a MercadoPago.
    -   **Seguridad**: La transacción ocurre en los servidores seguros de MercadoPago.

2.  **Webhook (Confirmación en Tiempo Real)**:
    -   Una vez realizado el pago, MercadoPago avisa a nuestro servidor (`/api/payments/webhook`).
    -   El sistema verifica la autenticidad del aviso y busca la cita correspondiente.
    -   **Acción Automática**:
        -   Marca la cita como "Pagada".
        -   Envía un recibo digital al paciente por email.
        -   Actualiza el balance del médico.

### Panel Financiero del Médico (`/doctor/dashboard/analytics`)

El médico tiene acceso a un tablero de control donde puede ver:

-   **KPIs en Tiempo Real**:
    -   **Ingresos del Mes**: Total facturado (bruto).
    -   **Pacientes Atendidos**: Métrica de volumen de trabajo.
-   **Gráficos de Tendencia**: Visualización de la evolución de sus ingresos mes a mes para detectar estacionalidad o crecimiento.
-   **Transparencia**: Cada cita pagada suma automáticamente al total, permitiendo un control exacto de la facturación sin necesidad de planillas manuales.

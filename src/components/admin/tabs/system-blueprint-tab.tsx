"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Download,
  Printer,
  Search,
  Users,
  Stethoscope,
  Building2,
  Pill,
  FlaskConical,
  Briefcase,
  ShieldCheck,
  ArrowRightLeft,
  CheckCircle2,
  Rocket,
  Layers,
  Sparkles,
  FileCode2,
  Compass,
  HeartHandshake,
  DollarSign,
  Ticket,
  Network,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface FunctionItem {
  title: string;
  howItWorks: string;
  interactions: Array<{
    targetDept: string;
    detail: string;
  }>;
  status: "completed" | "enhanced";
}

interface DepartmentBlueprint {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  progress: number;
  color: string;
  summary: string;
  functions: FunctionItem[];
}

const DEPARTMENTS_DATA: DepartmentBlueprint[] = [
  {
    id: "patient",
    name: "1. Departamento y Rol: PACIENTE (Titular y Núcleo Familiar)",
    subtitle: "Experiencia integral de salud, citas, expediente, récipes inteligentes, laboratorios y jornadas",
    badge: "100% Operativo",
    progress: 97,
    color: "teal",
    summary:
      "El Paciente es el centro del ecosistema SUMA. Puede registrarse directamente o ser un Médico operando en su Modo Dual Paciente. Administra su salud y la de toda su familia desde un único panel, interactuando en tiempo real con Médicos, Clínicas, Farmacias (Casa Matriz y Sucursales), Laboratorios y Jornadas de Salud.",
    functions: [
      {
        title: "1.1. Buscador Inteligente de Especialistas, Clínicas, Farmacias y Laboratorios",
        howItWorks:
          "Permite filtrar médicos y centros de salud por país, estado, ciudad, especialidad médica, modalidad (presencial u online), rango de precios y valoración. Muestra perfiles verificados con horarios en vivo, tarifas en USD y conversión automática a moneda local (tasa oficial BCV).",
        interactions: [
          {
            targetDept: "Médicos y Clínicas",
            detail: "Consume la disponibilidad real configurada en la agenda del médico o de la clínica adscrita.",
          },
          {
            targetDept: "Super Administración",
            detail: "Solo muestra profesionales y sedes con estatus Activo/Verificado y aplica la tasa BCV vigente.",
          },
        ],
        status: "completed",
      },
      {
        title: "1.2. Agendamiento de Citas Médicas, Servicios Adicionales y Motor de Cupones",
        howItWorks:
          "El paciente elige si la cita es para sí mismo (Titular) o para un integrante de su Núcleo Familiar, selecciona fecha/hora, añade servicios médicos opcionales (ej. Electrocardiograma, Ecografía), aplica cupones de descuento (en porcentaje % o monto fijo $) y reporta su pago (Pago Móvil, Transferencia, Zelle o Efectivo en consultorio).",
        interactions: [
          {
            targetDept: "Médicos / Clínicas",
            detail: "Crea el registro en `appointments`, bloquea el horario en la agenda del especialista y dispara una notificación sonora y visual inmediata al médico.",
          },
          {
            targetDept: "Marketing / Administración / Médicos",
            detail: "Valida en tiempo real si el cupón ingresado pertenece al Administrador (Global, por Especialidad, por Clínica o por Médico) o si fue creado directamente por ese Médico para su consulta.",
          },
        ],
        status: "completed",
      },
      {
        title: "1.3. Gestión de Núcleo Familiar (`family_members`)",
        howItWorks:
          "Permite al paciente titular registrar a sus hijos menores, padres o cónyuge con su cédula, fecha de nacimiento, parentesco y alergias. Cada familiar conserva su propio historial clínico individualizado bajo la cuenta del titular.",
        interactions: [
          {
            targetDept: "Médico Tratante",
            detail: "Cuando el médico abre la consulta, visualiza claramente los datos biométricos y antecedentes del familiar específico para quien se agendó la cita.",
          },
        ],
        status: "completed",
      },
      {
        title: "1.4. Expediente Clínico Digital e Historial de Consultas",
        howItWorks:
          "Repositorio seguro donde el paciente consulta todas sus atenciones previas: motivo de consulta, signos vitales (tensión arterial, peso, talla, saturación), diagnóstico médico, evolución e informes descargables.",
        interactions: [
          {
            targetDept: "Médicos Especialistas",
            detail: "Se alimenta automáticamente cada vez que un médico finaliza y firma digitalmente una historia clínica en el consultorio.",
          },
        ],
        status: "completed",
      },
      {
        title: "1.5. Récipes Digitales con QR, Semáforo de Stock, Algoritmo de Sucursal Óptima y Reserva en 1 Clic",
        howItWorks:
          "Cada récipe emitido genera un documento oficial con Código Único y QR de verificación. Debajo del récipe, el sistema cruza automáticamente los medicamentos prescritos contra el catálogo de las farmacias aliadas (Semáforo Verde = En Stock / Rojo = Agotado). Si el médico recomienda una cadena con múltiples sucursales, el Algoritmo Inteligente SUMA evalúa la distancia GPS del paciente (fórmula Haversine), su ciudad, el stock del récipe y horario 24h para mostrar 1 sola tarjeta con la Sucursal Óptima sugerida (y un selector para cambiar de sede en 1 clic).",
        interactions: [
          {
            targetDept: "Farmacias (Casa Matriz y Sucursales)",
            detail: "El paciente puede: (A) Cotizar o Apartar el récipe en 1 clic (`pharmacy_orders`) eligiendo retiro en tienda o Delivery; (B) Enviar el récipe por WhatsApp directo al número local de la sucursal seleccionada; (C) Activar recordatorio de Recompra Crónica.",
          },
          {
            targetDept: "Médico Tratante",
            detail: "Aplica automáticamente los cupones exclusivos pactados en la alianza B2B entre el médico y la farmacia.",
          },
        ],
        status: "enhanced",
      },
      {
        title: "1.6. Órdenes de Laboratorio e Imagenología Digitales",
        howItWorks:
          "Permite visualizar y descargar las órdenes de exámenes de sangre o estudios de imagen indicados por el médico, consultar laboratorios aliados en su ciudad, conocer requisitos de preparación (ayuno) y recibir resultados digitales.",
        interactions: [
          {
            targetDept: "Laboratorios Clínicos",
            detail: "El laboratorio valida la orden por cédula o código QR, procesa las muestras y carga los resultados vinculados al expediente del paciente.",
          },
        ],
        status: "completed",
      },
      {
        title: "1.7. Módulo «Mis Jornadas de Salud» y Ticket de Entrada con QR",
        howItWorks:
          "Desde la pestaña «Mis Jornadas» en su panel (o desde el enlace público `/jornadas/[id]`), el paciente se inscribe con 1 clic usando su cuenta SUMA, visualiza todas las campañas médicas en las que está suscrito en tarjetas interactivas y abre su Ficha de Entrada Oficial con Código QR para presentarla el día del evento.",
        interactions: [
          {
            targetDept: "Organizadores (Médicos, Clínicas, Farmacias, Laboratorios y Admin)",
            detail: "El organizador escanea o busca el código del ticket en el modal rápido de asistencia y marca al paciente como Atendido.",
          },
        ],
        status: "enhanced",
      },
      {
        title: "1.8. Chat Médico-Paciente en Tiempo Real, Favoritos y Soporte",
        howItWorks:
          "Canal directo de mensajería con sus médicos tratantes para seguimiento post-consulta, guardado de médicos favoritos para re-agendamiento rápido y apertura de tickets de soporte.",
        interactions: [
          {
            targetDept: "Médicos y Soporte Admin",
            detail: "Sincronización instantánea de mensajes leídos/no leídos y resolución de dudas administrativas.",
          },
        ],
        status: "completed",
      },
    ],
  },
  {
    id: "doctor",
    name: "2. Departamento y Rol: MÉDICO ESPECIALISTA (Consultorio Digital + Modo Dual)",
    subtitle: "Gestión clínica avanzada, emisión de récipes/órdenes, cupones propios, alianzas B2B y doble espacio de trabajo",
    badge: "100% Operativo",
    progress: 96,
    color: "blue",
    summary:
      "El Médico dispone de un consultorio digital completo para administrar sus citas, historias clínicas, ingresos, cupones promocionales, alianzas con farmacias/laboratorios y jornadas de salud. Además, cuenta con Cambio de Espacio de Trabajo en 1 Clic para actuar como Paciente usando su misma cuenta.",
    functions: [
      {
        title: "2.1. Cambio de Espacio de Trabajo en 1 Clic (`Modo Médico ↔ Modo Paciente`)",
        howItWorks:
          "Ubicado en la cabecera del portal médico (`WorkspaceSwitcherHeader`). Permite al especialista alternar instantáneamente entre su Consultorio Médico y su Panel de Paciente sin cerrar sesión ni crear cuentas duplicadas.",
        interactions: [
          {
            targetDept: "Departamento de Pacientes y Otros Médicos",
            detail: "Permite que un médico agende citas con otros colegas especialistas, agregue a sus propios familiares (`family_members`), reciba récipes y se inscriba en jornadas como cualquier paciente.",
          },
        ],
        status: "enhanced",
      },
      {
        title: "2.2. Agenda Médica Multi-Consultorio y Validación de Pagos de Pacientes",
        howItWorks:
          "Configuración de días y bloques horarios de atención, precios de consulta y servicios adicionales. Cuando un paciente agenda, el médico verifica la referencia de pago, aprueba o reprograma la cita y gestiona estados (Pendiente, Confirmada, En Consulta, Completada, Cancelada).",
        interactions: [
          {
            targetDept: "Pacientes y Clínicas",
            detail: "Envía notificación inmediata al paciente al confirmar su cita y sincroniza horarios si el médico pasa consulta dentro de una Clínica afiliada.",
          },
        ],
        status: "completed",
      },
      {
        title: "2.3. Historia Clínica Electrónica (EMR), Emisión de Récipes QR y Órdenes de Laboratorio",
        howItWorks:
          "Durante la atención del paciente, el médico registra anamnesis, signos vitales, examen físico, diagnóstico y tratamiento. Al guardar, genera automáticamente el Récipe Médico Digital (con fecha de vencimiento configurable) y la Orden de Exámenes de Laboratorio.",
        interactions: [
          {
            targetDept: "Pacientes, Farmacias y Laboratorios",
            detail: "El récipe queda disponible al instante en el panel del paciente y en el buscador de mostrador de todas las farmacias aliadas para su dispensación verificada.",
          },
        ],
        status: "completed",
      },
      {
        title: "2.4. Creación de Cupones Independientes del Médico (% o Monto Fijo $)",
        howItWorks:
          "Cada médico puede crear sus propios cupones promocionales desde su panel (ej. `DRPEREZ20` con 20% de descuento o `$10` de descuento fijo en su consulta), definiendo fecha de vencimiento y límite de usos.",
        interactions: [
          {
            targetDept: "Pacientes",
            detail: "El cupón aplica exclusivamente a las citas agendadas con ese médico, descontando el monto antes del pago sin afectar las tarifas de otros especialistas.",
          },
        ],
        status: "enhanced",
      },
      {
        title: "2.5. Alianzas Comerciales B2B con Farmacias y Laboratorios (`Conectar con Farmacias`)",
        howItWorks:
          "El médico recibe solicitudes de patrocinio o recomendación de Farmacias (Independientes o Casas Matrices) y Laboratorios. Puede aceptar convenios éticos que otorgan cupones de descuento en medicamentos a sus pacientes y consultar qué productos tienen en stock las farmacias de su ciudad.",
        interactions: [
          {
            targetDept: "Farmacias (Casa Matriz y Sucursales)",
            detail: "Al aceptar una alianza con una Casa Matriz, todas las sucursales aprobadas de esa cadena quedan habilitadas y el algoritmo recomienda al paciente la sucursal más cercana a su ubicación.",
          },
        ],
        status: "enhanced",
      },
      {
        title: "2.6. Organización de Jornadas de Salud y Modal Rápido de Registro de Pacientes",
        howItWorks:
          "El médico visualiza sus jornadas en formato de tarjetas compactas (sin abrir todo el listado de golpe), crea nuevas campañas comunitarias o de despistaje y utiliza el botón «Registrar / Atender Paciente» que abre una ventana modal directa sin tener que hacer scroll hasta el final.",
        interactions: [
          {
            targetDept: "Pacientes y Super Administración",
            detail: "Controla cupos en tiempo real y bloquea automáticamente nuevos registros una vez alcanzada la fecha de vencimiento (`Evento Culminado`).",
          },
        ],
        status: "enhanced",
      },
      {
        title: "2.7. Finanzas del Médico y Suscripción SUMA",
        howItWorks:
          "Panel de control de ingresos generados por consultas y módulo para reportar el pago de su membresía/suscripción a la plataforma SUMA (con cálculo automático en Bs según tasa BCV).",
        interactions: [
          {
            targetDept: "Finanzas Admin y Ejecutivas de Ventas (Vendedoras)",
            detail: "Cuando Administración aprueba el pago de la suscripción del médico, se activa/renueva su perfil público y se calcula la comisión correspondiente para su vendedora asignada.",
          },
        ],
        status: "completed",
      },
    ],
  },
  {
    id: "pharmacy",
    name: "3. Departamento y Rol: FARMACIAS (Casa Matriz, Sucursales e Independientes)",
    subtitle: "Dispensación de récipes, jerarquía antifraude de franquicias, planes corporativos y algoritmo de enrutamiento",
    badge: "100% Operativo",
    progress: 98,
    color: "emerald",
    summary:
      "Sistema integral para Farmacias Independientes y Grandes Cadenas Nacionales. Resuelve la validación real de franquicias mediante una Casa Matriz (Sede Madre) que administra o aprueba a sus Sucursales Hijas, ofrece planes corporativos escalonados y enruta a cada paciente hacia la sucursal óptima.",
    functions: [
      {
        title: "3.1. Arquitectura Casa Matriz (Sede Madre) ↔ Sucursales con Validación Antifraude",
        howItWorks:
          "La Administración Principal (`is_headquarters = true`) posee un Código Corporativo único (`SUMA-HQ-...`). Desde la pestaña «Casa Matriz y Sucursales», la Sede Madre puede crear directamente los usuarios independientes de sus sucursales o aprobar/rechazar solicitudes de sucursales externas (`branch_approval_status`). Ningún tercero puede hacerse pasar por sucursal de una franquicia sin autorización de la Casa Matriz.",
        interactions: [
          {
            targetDept: "Sucursales Hijas y Super Administración",
            detail: "Cada sucursal aprobada inicia sesión con su propio correo y contraseña para operar su mostrador y WhatsApp local, mientras la Casa Matriz supervisa toda la red.",
          },
        ],
        status: "enhanced",
      },
      {
        title: "3.2. Planes Corporativos Escalonados vs. Plan Independiente (`plan_tier`)",
        howItWorks:
          "Diferencia entre una farmacia de 1 sola sede (`Plan Independiente: $200/mes`) y cadenas multi-sucursal (`Red Regional hasta 5 sedes: $450/mes`, `Red Expansión hasta 15 sedes: $900/mes`, `Corporativo Nacional 16–50+ sedes: $1,600/mes`). Incluye el interruptor `covers_branches_plan` para definir si la Casa Matriz cubre el plan de todas sus sucursales o si cada sucursal paga por separado.",
        interactions: [
          {
            targetDept: "Sucursales y Finanzas Admin",
            detail: "Cuando la Casa Matriz tiene su plan activo y cubre a sus sedes, todas las sucursales aprobadas heredan automáticamente el estatus B2B activo, el catálogo maestro y las alianzas médicas.",
          },
        ],
        status: "enhanced",
      },
      {
        title: "3.3. Algoritmo Inteligente de Recomendación de Sucursal (`¿Cuál sede recomendar y por qué?`)",
        howItWorks:
          "Cuando un médico tiene alianza con una cadena de farmacias, el sistema evalúa todas las sucursales aprobadas y selecciona la Sede Óptima para ese paciente específico puntuando: (1) Convenio directo con sede local (+110 pts), (2) Distancia GPS exacta en km con fórmula Haversine (+300 pts) o coincidencia de Ciudad (+180 pts), (3) Disponibilidad en stock de los medicamentos del récipe (+50 pts c/u), y (4) Servicio 24 Horas (+25 pts) y Delivery (+15 pts).",
        interactions: [
          {
            targetDept: "Pacientes y Médicos",
            detail: "Muestra en el récipe 1 tarjeta limpia por cadena con la sucursal ganadora, una etiqueta que explica por qué fue elegida (ej. 'A 1.5 km • 2 med. en stock') y un selector para cambiar a otra sucursal si el paciente lo desea.",
          },
        ],
        status: "enhanced",
      },
      {
        title: "3.4. Mostrador Digital de Validación y Dispensación de Récipes",
        howItWorks:
          "El farmacéutico busca al paciente por número de Cédula o Código de Récipe, verifica la firma del médico y la vigencia del récipe, marca qué medicamentos fueron despachados y registra sus datos de regencia (`dispensed_by_pharmacy_id`).",
        interactions: [
          {
            targetDept: "Pacientes y Médicos",
            detail: "Actualiza el estatus del récipe a Dispensado en tiempo real, evitando que un récipe controlado sea despachado dos veces por error.",
          },
        ],
        status: "completed",
      },
      {
        title: "3.5. Catálogo de Medicamentos, Pedidos en 1 Clic (`pharmacy_orders`) y Recompra Crónica",
        howItWorks:
          "Permite subir el inventario de productos con precios, ofertas y cantidades en stock. Recibe pedidos de apartado o delivery directamente desde el récipe del paciente y genera alertas automáticas de recompra cuando un paciente con tratamiento crónico está próximo a terminar sus medicamentos.",
        interactions: [
          {
            targetDept: "Pacientes",
            detail: "Alimenta el Semáforo de Disponibilidad del récipe y permite cerrar ventas por WhatsApp o apartado directo.",
          },
        ],
        status: "completed",
      },
    ],
  },
  {
    id: "clinic",
    name: "4. Departamento y Rol: CLÍNICAS, HOSPITALES Y CENTROS MÉDICOS",
    subtitle: "Gestión hospitalaria, directorio de especialistas adscritos, presupuestos quirúrgicos y admisión",
    badge: "95% Operativo",
    progress: 93,
    color: "indigo",
    summary:
      "Permite a Clínicas y Centros de Salud gestionar su infraestructura médica, vincular a su staff de especialistas, recibir citas centralizadas, emitir presupuestos quirúrgicos/hospitalarios y organizar jornadas médicas.",
    functions: [
      {
        title: "4.1. Perfil Institucional, Servicios de Emergencia/UCI y Seguros Aceptados",
        howItWorks:
          "Configuración de especialidades disponibles, servicios 24h (Emergencia, Quirófano, UCI, Hospitalización, Ambulancia, Laboratorio e Imagenología interna) y convenios con aseguradoras.",
        interactions: [
          {
            targetDept: "Pacientes",
            detail: "Aparece destacado en el buscador de Clínicas con acceso rápido a contacto de emergencia y solicitud de presupuestos.",
          },
        ],
        status: "completed",
      },
      {
        title: "4.2. Staff de Médicos Adscritos (`clinic_doctors`) y Citas Institucionales",
        howItWorks:
          "La clínica asocia médicos registrados en SUMA a sus consultorios internos, permitiendo gestionar horarios dentro de la institución y visualizar el flujo de citas agendadas en la sede.",
        interactions: [
          {
            targetDept: "Médicos y Pacientes",
            detail: "Sincroniza la agenda del especialista con la ubicación física de la clínica.",
          },
        ],
        status: "completed",
      },
      {
        title: "4.3. Presupuestos Quirúrgicos (`clinic_quotes`), Cupones de Clínica y Jornadas",
        howItWorks:
          "Recepción de solicitudes de presupuesto para cirugías o procedimientos especiales, aplicación de cupones emitidos para la clínica y creación de jornadas de salud institucionales.",
        interactions: [
          {
            targetDept: "Pacientes y Super Administración",
            detail: "Conecta a pacientes que requieren intervenciones mayores directamente con el departamento de admisión/presupuesto de la clínica.",
          },
        ],
        status: "completed",
      },
    ],
  },
  {
    id: "laboratory",
    name: "5. Departamento y Rol: LABORATORIOS CLÍNICOS E IMAGENOLOGÍA",
    subtitle: "Recepción de órdenes médicas, catálogo de bioanálisis/perfiles, toma a domicilio y entrega de resultados",
    badge: "95% Operativo",
    progress: 92,
    color: "purple",
    summary:
      "Conecta a los Laboratorios Clínicos y Centros de Diagnóstico por Imagen con las órdenes emitidas por los médicos en consulta, permitiendo cotizar perfiles de exámenes y entregar resultados digitales.",
    functions: [
      {
        title: "5.1. Recepción y Validación de Órdenes Médicas de Laboratorio",
        howItWorks:
          "El bioanalista o recepcionista busca las órdenes médicas activas del paciente por cédula o código, visualizando exactamente qué estudios solicitó el especialista y el diagnóstico presuntivo.",
        interactions: [
          {
            targetDept: "Médicos y Pacientes",
            detail: "Elimina errores de lectura de caligrafía médica y agiliza la admisión del paciente en el laboratorio.",
          },
        ],
        status: "completed",
      },
      {
        title: "5.2. Catálogo de Exámenes, Perfiles Preoperatorios y Servicio a Domicilio",
        howItWorks:
          "Administración del listado de pruebas disponibles, precios en USD/Bs, indicaciones de ayuno, tiempos de entrega y disponibilidad de toma de muestra a domicilio.",
        interactions: [
          {
            targetDept: "Pacientes y Médicos",
            detail: "Permite al paciente cotizar su orden médica en segundos y agendar toma de muestra.",
          },
        ],
        status: "completed",
      },
    ],
  },
  {
    id: "seller",
    name: "6. Departamento y Rol: EJECUTIVAS DE VENTAS / VENDEDORAS",
    subtitle: "Captación comercial con código de referido, cartera de afiliados y comisiones recurrentes",
    badge: "100% Operativo",
    progress: 95,
    color: "amber",
    summary:
      "Fuerza comercial de SUMA encargada de afiliar médicos y entidades de salud mediante códigos de referido trazables, con cálculo transparente de comisiones sobre suscripciones pagadas.",
    functions: [
      {
        title: "6.1. Enlace y Código de Referido Único + Cartera de Médicos Captados",
        howItWorks:
          "Cada ejecutiva cuenta con un código único. Cuando un médico se registra con ese código, queda vinculado permanentemente a la cartera de la vendedora, quien puede monitorear si el médico está activo, al día o pendiente de pago.",
        interactions: [
          {
            targetDept: "Médicos y Finanzas Admin",
            detail: "Vincula el crecimiento de afiliados directamente con las métricas de ventas.",
          },
        ],
        status: "completed",
      },
      {
        title: "6.2. Liquidación y Seguimiento de Comisiones",
        howItWorks:
          "Calcula automáticamente el porcentaje de comisión ganado por cada mensualidad pagada por sus médicos referidos, mostrando saldos pendientes por cobrar e historial de pagos liquidados por Administración.",
        interactions: [
          {
            targetDept: "Departamento de Finanzas (Admin)",
            detail: "Administración registra el pago de comisiones con comprobante y referencia, actualizando el balance de la vendedora.",
          },
        ],
        status: "completed",
      },
    ],
  },
  {
    id: "admin",
    name: "7. Departamento y Rol: SUPER ADMINISTRACIÓN, FINANZAS, MARKETING Y AUDITORÍA",
    subtitle: "Gobierno central del ecosistema, aprobaciones sanitarias, motor BCV, cupones globales y jornadas nacionales",
    badge: "100% Operativo",
    progress: 97,
    color: "slate",
    summary:
      "Centro de mando ejecutivo de SUMA Salud. Supervisa y audita todos los departamentos, aprueba registros tras validar credenciales sanitarias (MPPS/SACS/RIF), administra las finanzas multipaís, emite cupones segmentados y coordina las Jornadas Nacionales de Salud.",
    functions: [
      {
        title: "7.1. Verificación y Aprobación Oficial de Médicos, Clínicas, Farmacias y Laboratorios",
        howItWorks:
          "Revisión de matrículas médicas (MPPS/Colegio de Médicos), RIF, Razón Social, Permisos Sanitarios (SACS) y Regentes Farmacéuticos. Permite activar, suspender, asignar descuentos corporativos (%) o meses de cortesía y gestionar la jerarquía de Casas Matrices y Sucursales.",
        interactions: [
          {
            targetDept: "Todos los Departamentos",
            detail: "Garantiza la seguridad jurídica y médica de toda la red antes de que cualquier ente sea visible para los pacientes.",
          },
        ],
        status: "completed",
      },
      {
        title: "7.2. Motor Maestro de Cupones Administrativos Multi-Rubro",
        howItWorks:
          "Desde Marketing/Configuración, el Administrador crea cupones por porcentaje (%) o monto fijo ($) con alcance totalmente configurable: (A) Global para todo SUMA, (B) Para un Médico específico, (C) Para una Especialidad médica específica, o (D) Para una Clínica/Entidad específica, con control de fecha de caducidad y límite de usos.",
        interactions: [
          {
            targetDept: "Pacientes, Médicos y Clínicas",
            detail: "El validador de citas verifica automáticamente el alcance (`scope_type`), vigencia y estado activo del cupón.",
          },
        ],
        status: "enhanced",
      },
      {
        title: "7.3. Gestión Nacional de Jornadas de Salud (`health-campaigns`)",
        howItWorks:
          "Permite crear y supervisar jornadas médicas de médicos, clínicas, laboratorios y farmacias a nivel nacional. Presenta vista limpia por tarjetas seleccionables, aplica bloqueo y estilo visual claro automático cuando la fecha de vencimiento ya pasó (`🏁 Evento Culminado`), exige registro directo del paciente en SUMA y ofrece modal rápido de control de asistencia.",
        interactions: [
          {
            targetDept: "Médicos, Clínicas, Farmacias, Laboratorios y Pacientes",
            detail: "Unifica la promoción y trazabilidad de operativos de salud en todo el país.",
          },
        ],
        status: "enhanced",
      },
      {
        title: "7.4. Finanzas Multipaís, Widget Tasa BCV en Vivo y Auditoría (`audit_logs`)",
        howItWorks:
          "Sincronización automática y manual de la tasa oficial del BCV, configuración de tarifas de suscripción por país (Venezuela, Argentina, Colombia, etc.), conciliación de pagos de médicos/farmacias/clínicas, pago de comisiones a vendedoras y registro inmutable de auditoría de todas las acciones administrativas.",
        interactions: [
          {
            targetDept: "Todo el Ecosistema SUMA",
            detail: "Actualiza instantáneamente los precios en moneda local en todos los portales.",
          },
        ],
        status: "completed",
      },
    ],
  },
];

const CROSS_DEPARTMENT_FLOWS = [
  {
    title: "Flujo 1: Ciclo Clínico-Farmacéutico Inteligente (End-to-End)",
    steps: [
      "1. Paciente agenda cita (aplicando cupón Admin o del Médico) → Médico recibe notificación y confirma.",
      "2. Médico atiende la consulta, llena el Expediente Clínico y emite el Récipe Digital con QR.",
      "3. El Récipe cruza en vivo los medicamentos prescritos con el catálogo de las Farmacias Aliadas (Semáforo Verde/Rojo).",
      "4. Si la farmacia recomendada es una Cadena con múltiples sucursales, el Algoritmo Inteligente SUMA calcula cuál sucursal está más cerca del paciente (GPS/Ciudad) y tiene el medicamento en stock.",
      "5. Paciente aparta sus medicamentos en 1 clic o envía el récipe por WhatsApp a esa sucursal específica.",
      "6. La Sucursal despacha el récipe en mostrador y el sistema programa el recordatorio si es Tratamiento Crónico.",
    ],
  },
  {
    title: "Flujo 2: Ciclo de Jerarquía Corporativa de Farmacias (Casa Matriz ↔ Sucursales)",
    steps: [
      "1. La Administración Principal de la cadena se registra como Casa Matriz (`is_headquarters = true`) y recibe su Código Corporativo (`SUMA-HQ-...`).",
      "2. La Casa Matriz elige un Plan Corporativo (5, 15 o 50+ sedes) y activa la cobertura unificada (`covers_branches_plan = true`).",
      "3. La Casa Matriz crea directamente los usuarios independientes de sus sucursales (o aprueba las que se registren con su código).",
      "4. Si alguien externo intenta registrarse usando el nombre de la cadena sin código, queda bloqueado en `pending_hq` hasta que la Casa Matriz lo autorice.",
      "5. Cuando la Casa Matriz pacta una alianza con un Médico, todas sus sucursales aprobadas heredan el convenio y el catálogo automáticamente.",
    ],
  },
  {
    title: "Flujo 3: Ciclo Dual Médico ↔ Paciente (Misma Cuenta)",
    steps: [
      "1. Un Médico inicia sesión en su consultorio digital (`/doctor/dashboard`).",
      "2. Necesita agendar una cita médica para sí mismo o para su hijo con un colega de otra especialidad.",
      "3. En el encabezado superior, hace clic en «Modo Paciente» y entra inmediatamente a `/dashboard` con su misma cuenta.",
      "4. Agrega a sus familiares, agenda la cita, recibe sus récipes y tickets de jornadas, y vuelve a «Mi Consultorio» en 1 clic.",
    ],
  },
  {
    title: "Flujo 4: Ciclo Nacional de Jornadas de Salud",
    steps: [
      "1. Médico, Clínica, Laboratorio, Farmacia o Admin publica una Jornada de Salud con fecha límite y cupos.",
      "2. El Paciente ingresa al enlace del evento: si ya tiene cuenta SUMA se inscribe en 1 clic; si es nuevo, se registra directamente en SUMA en el mismo paso y recibe su Ticket QR.",
      "3. El Paciente visualiza todos sus eventos suscritos en la pestaña «Mis Jornadas» de su panel y abre su Ticket QR.",
      "4. El día del evento, el organizador abre el Modal Rápido de Pacientes y marca la asistencia.",
      "5. Al cumplirse la fecha de vencimiento, el evento pasa automáticamente a «🏁 Evento Culminado» (tono visual claro y bloqueo de nuevas inscripciones).",
    ],
  },
];

const MISSING_FEATURES_ROADMAP = [
  {
    priority: "Prioridad Alta (Corto Plazo — Próximo Paso hacia el 100%)",
    color: "amber",
    items: [
      {
        title: "1. Pasarela de Pagos Automatizada y Conciliación Bancaria Instantánea (24/7)",
        currentStatus: "Actualmente los pacientes, médicos y farmacias reportan la referencia/comprobante de pago y el médico o administrador lo valida manualmente.",
        whatIsNeeded:
          "Integrar API bancaria de validación automática de Pago Móvil Interbancario (Venezuela) y pasarela internacional (Stripe / MercadoPago) para que las citas y las suscripciones B2B se activen en 1 segundo sin esperar revisión manual.",
        impact: "Ahorra 80% de carga operativa en el departamento de Finanzas y acelera la conversión.",
      },
      {
        title: "2. Automatización de Notificaciones por WhatsApp Business Cloud API y Correo Transaccional",
        currentStatus: "El sistema cuenta con notificaciones internas en tiempo real y botones de WhatsApp directo con mensajes pre-estructurados.",
        whatIsNeeded:
          "Conectar un bot oficial de WhatsApp (Meta Cloud API / Evolution API) y Resend/SendGrid para disparar mensajes automáticos en segundo plano: recordatorio de cita 24h antes, alerta de medicamento crónico por agotarse y bienvenida con credenciales al aprobar una cuenta.",
        impact: "Reduce el ausentismo a consultas médicas en más de un 60% y aumenta la recompra en farmacias.",
      },
      {
        title: "3. Replicar Jerarquía «Casa Matriz ↔ Sucursales» en Laboratorios y Clínicas",
        currentStatus: "El sistema de Casa Matriz, Código Corporativo Antifraude, Planes Multi-Sede y Algoritmo GPS ya está 100% operativo en Farmacias.",
        whatIsNeeded:
          "Extender exactamente la misma arquitectura a Redes de Laboratorios Clínicos (que suelen tener 5 a 20 centros de toma de muestra por ciudad) y Grupos Clínicos.",
        impact: "Permite vender planes corporativos multi-sede también a grandes cadenas de laboratorios.",
      },
    ],
  },
  {
    priority: "Prioridad Media (Escalabilidad Clínica y Comercial)",
    color: "teal",
    items: [
      {
        title: "4. Sala de Videoconsulta Nativa Integrada (Telemedicina WebRTC)",
        currentStatus: "Los médicos pueden ofrecer consultas online y coordinar por el chat interno o WhatsApp.",
        whatIsNeeded:
          "Incrustar videollamada segura (Daily.co / Jitsi / LiveKit) directamente al lado de la Historia Clínica del médico para que pase consulta por video mientras redacta el récipe sin salir de SUMA.",
        impact: "Posiciona a SUMA como plataforma líder de Telemedicina para pacientes dentro y fuera del país (diáspora que agenda para familiares).",
      },
      {
        title: "5. Sincronización Automática de Inventario ERP para Grandes Cadenas de Farmacias",
        currentStatus: "Las farmacias gestionan su catálogo desde el panel B2B o heredan el catálogo de su Casa Matriz.",
        whatIsNeeded:
          "Crear un conector API / Webhook o importador masivo CSV/Excel programado para que las cadenas sincronicen precios y existencias desde su sistema administrativo (Profit Plus, Galac, SAP) automáticamente.",
        impact: "Garantiza precisión milimétrica en el Semáforo de Disponibilidad sin carga manual.",
      },
    ],
  },
  {
    priority: "Prioridad Futura (Innovación y Fidelización)",
    color: "indigo",
    items: [
      {
        title: "6. Aplicación Móvil Instalable (PWA Avanzada con Push Notifications Nativas iOS/Android)",
        currentStatus: "La plataforma web es 100% responsive y adaptable a teléfonos móviles.",
        whatIsNeeded:
          "Habilitar Web Push Notifications en segundo plano y empaquetado Capacitor/PWA para instalación directa en la pantalla de inicio del teléfono.",
        impact: "Fidelización diaria del paciente y respuesta inmediata de médicos y farmacias.",
      },
      {
        title: "7. Asistente Clínico IA para Pacientes y Triaje Pre-Consulta",
        currentStatus: "El buscador permite filtrar por especialidad o síntoma general.",
        whatIsNeeded:
          "Un orientador inteligente que pregunte síntomas básicos al paciente y le sugiera qué especialidad médica agendar en SUMA, preparando un pre-resumen para el médico.",
        impact: "Aumenta la conversión de visitantes en citas agendadas.",
      },
    ],
  },
];

export function SystemBlueprintTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("ALL");
  const printableRef = useRef<HTMLDivElement>(null);

  const globalProgress = useMemo(() => {
    const total = DEPARTMENTS_DATA.reduce((acc, d) => acc + d.progress, 0);
    return Math.round(total / DEPARTMENTS_DATA.length);
  }, []);

  const filteredDepartments = useMemo(() => {
    return DEPARTMENTS_DATA.filter((dept) => {
      if (selectedDeptId !== "ALL" && dept.id !== selectedDeptId) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      if (
        dept.name.toLowerCase().includes(q) ||
        dept.summary.toLowerCase().includes(q)
      ) {
        return true;
      }
      return dept.functions.some(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.howItWorks.toLowerCase().includes(q) ||
          f.interactions.some(
            (i) =>
              i.targetDept.toLowerCase().includes(q) ||
              i.detail.toLowerCase().includes(q)
          )
      );
    });
  }, [selectedDeptId, searchQuery]);

  const handleDownloadStandaloneHtml = () => {
    const dateStr = new Date().toLocaleDateString("es-VE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const htmlString = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Manual Maestro y Arquitectura General — Ecosistema SUMA Salud</title>
  <style>
    :root {
      --teal: #0d9488;
      --teal-dark: #115e59;
      --slate: #0f172a;
      --muted: #475569;
      --bg: #f8fafc;
      --card: #ffffff;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--slate);
      margin: 0;
      padding: 32px 16px;
      line-height: 1.6;
    }
    .container {
      max-width: 1120px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
    }
    .hero {
      background: linear-gradient(135deg, #042f2e 0%, #0f766e 60%, #0f172a 100%);
      color: #fff;
      padding: 36px;
      border-radius: 16px;
      margin-bottom: 32px;
    }
    .hero h1 { margin: 8px 0 12px; font-size: 28px; }
    .hero p { margin: 0; opacity: 0.92; font-size: 15px; }
    .badge {
      display: inline-block;
      background: #fbbf24;
      color: #0f172a;
      font-weight: 800;
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .progress-box {
      margin-top: 20px;
      background: rgba(255,255,255,0.12);
      padding: 16px;
      border-radius: 12px;
    }
    .progress-bar-bg {
      height: 12px;
      background: rgba(255,255,255,0.2);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-bar-fill {
      height: 100%;
      background: #34d399;
      width: ${globalProgress}%;
    }
    h2.section-title {
      font-size: 22px;
      border-bottom: 2px solid var(--teal);
      padding-bottom: 8px;
      margin-top: 40px;
      color: var(--teal-dark);
    }
    .dept-card {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 28px;
      background: #fff;
    }
    .dept-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .dept-header h3 { margin: 0; font-size: 20px; color: #0f172a; }
    .fn-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid var(--teal);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .fn-box h4 { margin: 0 0 8px; font-size: 16px; color: #0f172a; }
    .fn-box p { margin: 0 0 10px; font-size: 14px; color: #334155; }
    .interactions {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
    }
    .interactions ul { margin: 6px 0 0; padding-left: 18px; }
    .flow-card {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 16px;
    }
    .roadmap-group {
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 20px;
      background: #fffbeb;
    }
    .roadmap-item {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      margin-top: 12px;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .container { border: none; box-shadow: none; padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <span class="badge">Documento Maestro Oficial — SUMA Salud (${dateStr})</span>
      <h1>Arquitectura General de Departamentos, Funcionalidades por Usuario, Interacciones y Hoja de Ruta</h1>
      <p>Manual corporativo unificado de todas las capacidades operativas del ecosistema SUMA, flujos interdepartamentales y diagnóstico de evolución tecnológica.</p>
      <div class="progress-box">
        <strong>Nivel de Avance Global del Ecosistema SUMA: ${globalProgress}% Completado y Operativo en Producción</strong>
        <div class="progress-bar-bg"><div class="progress-bar-fill"></div></div>
      </div>
    </div>

    <h2 class="section-title">I. Módulos y Funcionalidades por Departamento y Tipo de Usuario</h2>
    ${DEPARTMENTS_DATA.map(
      (dept) => `
      <div class="dept-card">
        <div class="dept-header">
          <div>
            <h3>${dept.name}</h3>
            <small style="color:#64748b">${dept.subtitle}</small>
          </div>
          <span class="badge">${dept.badge} (${dept.progress}% Avance)</span>
        </div>
        <p><strong>Resumen Ejecutivo del Departamento:</strong> ${dept.summary}</p>
        ${dept.functions
          .map(
            (fn) => `
          <div class="fn-box">
            <h4>${fn.title}</h4>
            <p><strong>¿Cómo funciona?:</strong> ${fn.howItWorks}</p>
            <div class="interactions">
              <strong>🔗 ¿Cómo interactúa con otros departamentos y usuarios?:</strong>
              <ul>
                ${fn.interactions
                  .map(
                    (inter) =>
                      `<li><strong>Con ${inter.targetDept}:</strong> ${inter.detail}</li>`
                  )
                  .join("")}
              </ul>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `
    ).join("")}

    <h2 class="section-title">II. Flujos Maestro de Interacción Cruzada entre Departamentos</h2>
    ${CROSS_DEPARTMENT_FLOWS.map(
      (flow) => `
      <div class="flow-card">
        <h3 style="margin-top:0;color:#0f766e">${flow.title}</h3>
        <ul style="margin:0;padding-left:20px">
          ${flow.steps.map((s) => `<li style="margin-bottom:6px">${s}</li>`).join("")}
        </ul>
      </div>
    `
    ).join("")}

    <h2 class="section-title">III. ¿Qué le falta al Sistema? (Diagnóstico y Hoja de Ruta hacia el 100%)</h2>
    ${MISSING_FEATURES_ROADMAP.map(
      (group) => `
      <div class="roadmap-group">
        <h3 style="margin:0;color:#92400e">${group.priority}</h3>
        ${group.items
          .map(
            (item) => `
          <div class="roadmap-item">
            <h4 style="margin:0 0 6px;color:#0f172a">${item.title}</h4>
            <p style="margin:4px 0;font-size:13.5px"><strong>Estado Actual:</strong> ${item.currentStatus}</p>
            <p style="margin:4px 0;font-size:13.5px"><strong>¿Qué falta implementar?:</strong> ${item.whatIsNeeded}</p>
            <p style="margin:4px 0;font-size:13.5px;color:#0f766e"><strong>Impacto Estratégico:</strong> ${item.impact}</p>
          </div>
        `
          )
          .join("")}
      </div>
    `
    ).join("")}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlString], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Manual_Maestro_Ecosistema_SUMA_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={printableRef} className="space-y-8 pb-12">
      {/* CABECERA EJECUTIVA Y TERMÓMETRO DE AVANCE GLOBAL */}
      <Card className="border-teal-300 bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 text-white rounded-3xl overflow-hidden shadow-xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-amber-400 text-slate-950 font-extrabold text-xs px-3 py-0.5 border-0">
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Archivo General Corporativo — SUMA Salud
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold">
                  7 Departamentos Interconectados
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Manual Maestro de Departamentos, Funciones por Usuario, Interacciones y Hoja de Ruta
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                Documento vivo en formato HTML dentro de la Administración Central que detalla <strong>qué puede hacer cada tipo de usuario</strong>, <strong>cómo funciona cada módulo paso a paso</strong>, <strong>cómo interactúa con los demás departamentos</strong>, el <strong>nivel de avance actual ({globalProgress}%)</strong> y <strong>qué le falta al sistema</strong> para su consolidación total.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 print:hidden">
              <Button
                type="button"
                onClick={handleDownloadStandaloneHtml}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl h-10 px-4 shadow-md"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Descargar Archivo HTML Oficial (.html)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="border-teal-400/50 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl h-10 px-4"
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Imprimir / Guardar en PDF
              </Button>
            </div>
          </div>

          {/* BARRA DE AVANCE GENERAL DEL SISTEMA */}
          <div className="bg-slate-950/60 border border-teal-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Rocket className="h-4 w-4" />
                  Estado de Avance Integral del Sistema SUMA
                </span>
                <p className="text-xs text-teal-100/80 mt-0.5">
                  Cálculo ponderado sobre todos los módulos clínicos, administrativos, financieros, B2B y algoritmos de enrutamiento en producción.
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-emerald-400">{globalProgress}%</span>
                <span className="text-xs text-teal-200 block font-semibold">
                  Completado y Operativo
                </span>
              </div>
            </div>

            <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${globalProgress}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
              {DEPARTMENTS_DATA.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDeptId(selectedDeptId === d.id ? "ALL" : d.id)}
                  className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
                    selectedDeptId === d.id
                      ? "bg-teal-600/40 border-amber-400"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-white">
                    <span className="truncate">{d.name.split(":")[1]?.split("(")[0] || d.name}</span>
                    <span className="text-emerald-300 font-black">{d.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${d.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FILTROS Y BUSCADOR INTERACTIVO DE FUNCIONALIDADES */}
      <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar cualquier función, departamento, algoritmo, cupones, sucursales, récipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-50 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={selectedDeptId === "ALL" ? "default" : "outline"}
            onClick={() => setSelectedDeptId("ALL")}
            className={`h-8 text-xs rounded-xl font-bold ${
              selectedDeptId === "ALL" ? "bg-teal-600 text-white" : ""
            }`}
          >
            Todos los Departamentos (7)
          </Button>
          {[
            { id: "patient", label: "Paciente" },
            { id: "doctor", label: "Médico (Dual)" },
            { id: "pharmacy", label: "Farmacias y Sucursales" },
            { id: "clinic", label: "Clínicas" },
            { id: "laboratory", label: "Laboratorios" },
            { id: "seller", label: "Vendedoras" },
            { id: "admin", label: "Super Admin" },
          ].map((btn) => (
            <Button
              key={btn.id}
              type="button"
              size="sm"
              variant={selectedDeptId === btn.id ? "default" : "outline"}
              onClick={() => setSelectedDeptId(btn.id)}
              className={`h-8 text-xs rounded-xl font-semibold ${
                selectedDeptId === btn.id ? "bg-teal-600 text-white" : ""
              }`}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* SECCIÓN I: TODOS LOS DEPARTAMENTOS, FUNCIONES Y MATRIZ DE INTERACCIÓN */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-teal-600" />
              I. Desglose Completo por Departamento, Funciones por Usuario e Interacciones
            </h3>
            <p className="text-xs text-slate-500">
              Cada tarjeta detalla qué hace la función, cómo opera internamente y cómo se conecta con los otros departamentos de SUMA.
            </p>
          </div>
        </div>

        {filteredDepartments.map((dept) => (
          <Card
            key={dept.id}
            className="border-slate-200 rounded-2xl shadow-sm overflow-hidden bg-white"
          >
            <CardHeader className="bg-slate-50 border-b border-slate-200/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {dept.name}
                  </CardTitle>
                  <CardDescription className="text-xs font-medium text-slate-600 mt-0.5">
                    {dept.subtitle}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-teal-600 text-white font-extrabold text-xs border-0">
                    Avance: {dept.progress}%
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-emerald-800 font-bold text-xs"
                  >
                    {dept.badge}
                  </Badge>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200/80 mt-3 leading-relaxed">
                <strong>Visión General del Rol:</strong> {dept.summary}
              </p>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {dept.functions.map((fn, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5 space-y-3 hover:border-teal-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                        {fn.title}
                      </h4>
                      {fn.status === "enhanced" ? (
                        <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold w-fit">
                          ✨ Optimizado Recientemente
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-bold w-fit">
                          ✔ En Producción
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      <strong className="text-slate-900">¿Cómo funciona?: </strong>
                      {fn.howItWorks}
                    </p>

                    <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-3.5 space-y-2">
                      <span className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                        <ArrowRightLeft className="h-3.5 w-3.5 text-teal-700" />
                        Interacción con otros Departamentos y Usuarios:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {fn.interactions.map((inter, iIdx) => (
                          <div
                            key={iIdx}
                            className="bg-white rounded-lg p-2.5 border border-teal-100 text-xs"
                          >
                            <span className="font-extrabold text-teal-800 block mb-0.5">
                              ➔ Con {inter.targetDept}:
                            </span>
                            <span className="text-slate-600 leading-snug block">
                              {inter.detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SECCIÓN II: MAPA DE FLUJOS INTERDEPARTAMENTALES END-TO-END */}
      <Card className="border-teal-200 rounded-2xl shadow-sm bg-gradient-to-b from-white to-teal-50/30">
        <CardHeader>
          <CardTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Network className="h-5 w-5 text-teal-600" />
            II. Flujos Maestros End-to-End (Cómo se conectan todos los Departamentos)
          </CardTitle>
          <CardDescription className="text-xs">
            Trazabilidad paso a paso de las operaciones clave donde intervienen múltiples usuarios del ecosistema SUMA.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CROSS_DEPARTMENT_FLOWS.map((flow, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3"
            >
              <h4 className="font-extrabold text-sm sm:text-base text-teal-900 border-b border-slate-100 pb-2">
                {flow.title}
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {flow.steps.map((step, sIdx) => (
                  <li key={sIdx} className="flex items-start gap-2 leading-relaxed">
                    <span className="h-5 w-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {sIdx + 1}
                    </span>
                    <span>{step.replace(/^\d+\.\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* SECCIÓN III: MÓDULO ¿QUÉ LE FALTA AL SISTEMA? (HOJA DE RUTA HACIA EL 100%) */}
      <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50/50 via-white to-teal-50/30 rounded-2xl shadow-md">
        <CardHeader className="border-b border-amber-200/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Badge className="bg-amber-400 text-slate-950 font-extrabold text-[11px] border-0 mb-1.5">
                Diagnóstico Estratégico y Evolución
              </Badge>
              <CardTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                III. ¿Qué le falta al Sistema SUMA? (El {100 - globalProgress}% restante hacia la Automatización Total)
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 mt-1">
                Análisis técnico y comercial de las mejoras recomendadas para llevar a SUMA del {globalProgress}% actual al 100% de automatización nacional e internacional.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {MISSING_FEATURES_ROADMAP.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-amber-900 bg-amber-100/80 px-3.5 py-1.5 rounded-xl inline-block">
                {group.priority}
              </h4>

              <div className="grid grid-cols-1 gap-3.5">
                {group.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-2.5"
                  >
                    <h5 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {item.title}
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                        <strong className="text-slate-800 block mb-1">
                          📌 Estado Actual en SUMA:
                        </strong>
                        <span className="text-slate-600 leading-relaxed">
                          {item.currentStatus}
                        </span>
                      </div>
                      <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
                        <strong className="text-amber-950 block mb-1">
                          🛠️ ¿Qué falta agregar?:
                        </strong>
                        <span className="text-amber-900 leading-relaxed">
                          {item.whatIsNeeded}
                        </span>
                      </div>
                      <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80">
                        <strong className="text-emerald-950 block mb-1">
                          🚀 Impacto en el Negocio:
                        </strong>
                        <span className="text-emerald-900 leading-relaxed">
                          {item.impact}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

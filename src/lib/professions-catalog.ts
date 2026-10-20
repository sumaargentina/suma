import type { ProfessionCategory, Doctor } from './types';

export const DEFAULT_PROFESSIONS_CATALOG: ProfessionCategory[] = [
  {
    "id": "medico",
    "name": "Médico",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": true,
    "isWellness": false,
    "specialties": [
      {
        "name": "Medicina general",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Medicina familiar y comunitaria",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Medicina interna",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Pediatría",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Ginecología y obstetricia",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Cardiología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Dermatología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Endocrinología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Gastroenterología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Neurología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Psiquiatría",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Traumatología y ortopedia",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Urología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Neumonología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Nefrología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Oncología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Reumatología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Infectología",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Medicina del deporte",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Medicina del trabajo",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Medicina estética",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Medicina preventiva",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Medicina de urgencias",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Geriatría",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Medicina intensiva",
        "hasMedicalRecord": true,
        "hasPrescription": true
      }
    ]
  },
  {
    "id": "psicologo",
    "name": "Psicólogo",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Psicología clínica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología infantil",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología del adolescente",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología del adulto",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología del adulto mayor",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología educativa",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología organizacional",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología deportiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología forense",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología social",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología de la salud",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología comunitaria",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología neurocognitiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicología positiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia de pareja",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia familiar",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "dentista-odontologo",
    "name": "Dentista (Odontólogo)",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": true,
    "isWellness": false,
    "specialties": [
      {
        "name": "Odontología general",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Ortodoncia",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Implantología oral",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Endodoncia",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Periodoncia",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Odontopediatría",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Cirugía oral",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Cirugía maxilofacial",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Prótesis dental",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Estética dental",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Odontología restauradora",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Odontología preventiva",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Radiología odontológica",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Odontología geriátrica",
        "hasMedicalRecord": true,
        "hasPrescription": true
      },
      {
        "name": "Odontología deportiva",
        "hasMedicalRecord": true,
        "hasPrescription": true
      }
    ]
  },
  {
    "id": "fisioterapeuta",
    "name": "Fisioterapeuta",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Fisioterapia musculoesquelética",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia deportiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia neurológica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia respiratoria",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia pediátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia geriátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia traumatológica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia postquirúrgica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia cardiopulmonar",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia del suelo pélvico",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia vestibular",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fisioterapia para dolor crónico",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación funcional",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación neuromotora",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia manual ortopédica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "nutricionista",
    "name": "Nutricionista",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Nutrición clínica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición deportiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición pediátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición geriátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición para enfermedades metabólicas",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición para diabetes",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición para obesidad y sobrepeso",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición hospitalaria",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición comunitaria",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición preventiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición oncológica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición vegetariana y vegana",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición digestiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Nutrición funcional",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Educación nutricional",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "fonoaudiologo",
    "name": "Fonoaudiólogo",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Fonoaudiología clínica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fonoaudiología infantil",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fonoaudiología geriátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia del lenguaje",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia del habla",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación de la voz",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación auditiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Trastornos del desarrollo del lenguaje",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Trastornos de la deglución (disfagia)",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Trastornos de la comunicación",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación neurológica del lenguaje",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Fonoaudiología educativa",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "terapeuta-ocupacional",
    "name": "Terapeuta ocupacional",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Terapia ocupacional en rehabilitación física",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia ocupacional neurológica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia ocupacional pediátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia ocupacional geriátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia ocupacional en salud mental",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia ocupacional comunitaria",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación funcional",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia ocupacional para discapacidad",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia ocupacional laboral",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Adaptación funcional y ayudas técnicas",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación cognitiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "biomedico",
    "name": "Biomédico",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Biomedicina clínica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Biomedicina estética",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Análisis clínicos",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Diagnóstico por imágenes",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Biología molecular",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Genética clínica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Microbiología clínica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Inmunología clínica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Citología y patología celular",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Toxicología clínica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Reproducción asistida",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Investigación biomédica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "psicoanalista",
    "name": "Psicoanalista",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Psicoanálisis clínico",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicoanálisis infantil",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicoanálisis de adolescentes",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicoanálisis de adultos",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicoanálisis de pareja",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicoanálisis familiar",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicoanálisis lacaniano",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicoanálisis freudiano",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicoterapia psicoanalítica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Supervisión psicoanalítica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "acupunturista",
    "name": "Acupunturista",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Acupuntura tradicional china",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Acupuntura médica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Acupuntura para manejo del dolor",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Acupuntura estética",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Acupuntura para ansiedad y estrés",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Acupuntura deportiva",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Acupuntura para fertilidad",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Electroacupuntura",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Auriculoterapia",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Moxibustión",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "quiropractico",
    "name": "Quiropráctico",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Quiropraxia general",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Quiropraxia deportiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Quiropraxia pediátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Quiropraxia geriátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Ajuste vertebral",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Corrección postural",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Tratamiento de dolor lumbar",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Tratamiento de dolor cervical",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación de columna",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Prevención de lesiones musculoesqueléticas",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "osteopata",
    "name": "Osteópata",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Osteopatía estructural",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Osteopatía visceral",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Osteopatía craneal",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Osteopatía pediátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Osteopatía deportiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Osteopatía geriátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Osteopatía para dolor crónico",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Osteopatía para rehabilitación musculoesquelética",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Osteopatía para trastornos digestivos",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Osteopatía para disfunciones posturales",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "psicopedagogo",
    "name": "Psicopedagogo",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Psicopedagogía clínica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicopedagogía educativa",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Evaluación psicopedagógica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Intervención en dificultades de aprendizaje",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Trastornos del aprendizaje (dislexia, discalculia, disgrafía)",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Orientación escolar",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicopedagogía infantil",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicopedagogía para adolescentes",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Psicopedagogía para adultos",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Estimulación cognitiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Reeducación pedagógica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "sexologo",
    "name": "Sexólogo",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Sexología clínica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia sexual",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia sexual de pareja",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Educación sexual",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Sexología médica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Sexología psicológica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Tratamiento de disfunciones sexuales",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Asesoramiento en salud sexual",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Sexualidad en adolescentes",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Sexualidad en adultos mayores",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "esteticista",
    "name": "Esteticista",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Estética facial",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Estética corporal",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Cosmiatría",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Tratamientos antienvejecimiento",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Tratamientos para acné",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Limpieza facial profesional",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Tratamientos reductores",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Tratamientos reafirmantes",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Aparatología estética",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Estética dermatológica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "podologo",
    "name": "Podólogo",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Podología clínica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Podología deportiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Podología geriátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Podología pediátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Podología para pie diabético",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Tratamiento de uñas encarnadas",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Tratamiento de callosidades",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Corrección de alteraciones ungueales",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Cuidado preventivo del pie",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación podológica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "coach-de-salud",
    "name": "Coach de salud",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Coaching de bienestar",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Coaching nutricional",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Coaching de hábitos saludables",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Coaching de manejo del estrés",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Coaching de sueño",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Coaching de cambio de estilo de vida",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Coaching de salud mental",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Coaching de actividad física",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Coaching de prevención de enfermedades",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "instructor-de-yoga",
    "name": "Instructor de yoga",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Yoga terapéutico",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Yoga para principiantes",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Yoga avanzado",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Yoga prenatal",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Yoga postnatal",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Yoga para niños",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Yoga para adultos mayores",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Hatha yoga",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Vinyasa yoga",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Ashtanga yoga",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Kundalini yoga",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Yoga restaurativo",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Yoga para manejo del estrés",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "instructor-de-pilates",
    "name": "Instructor de pilates",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Pilates clínico",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Pilates terapéutico",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Pilates para rehabilitación",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Pilates para embarazadas",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Pilates postparto",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Pilates para adultos mayores",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Pilates deportivo",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Pilates de suelo (mat pilates)",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Pilates con máquinas (reformer)",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Pilates para fortalecimiento del core",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Pilates para corrección postural",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "terapeuta-holistico",
    "name": "Terapeuta holístico",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Terapia energética",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Terapia vibracional",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Sanación energética",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Terapia con cristales",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Terapia de chakras",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Terapia holística emocional",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Terapia holística espiritual",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Terapia integrativa",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Terapia mente-cuerpo",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "naturopata",
    "name": "Naturópata",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Naturopatía clínica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Naturopatía preventiva",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Fitoterapia",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Terapias naturales integrativas",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Medicina natural",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Naturopatía nutricional",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Naturopatía para manejo del estrés",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Naturopatía para enfermedades crónicas",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "neuropsicologo",
    "name": "Neuropsicólogo",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Neuropsicología clínica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Neuropsicología infantil",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Neuropsicología del adulto",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Neuropsicología geriátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Evaluación neuropsicológica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación neuropsicológica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Neuropsicología cognitiva",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Neuropsicología del desarrollo",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Neuropsicología de trastornos neurológicos",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Neuropsicología de trastornos neurodegenerativos",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "terapeuta-familiar",
    "name": "Terapeuta familiar",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Terapia familiar sistémica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia familiar estructural",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia familiar estratégica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia familiar para resolución de conflictos",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia familiar para adolescentes",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia familiar para problemas de conducta",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia familiar para crisis familiares",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Mediación familiar",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "terapeuta-de-pareja",
    "name": "Terapeuta de pareja",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Terapia de pareja sistémica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia de pareja cognitivo-conductual",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia de pareja para manejo de conflictos",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia de pareja para problemas de comunicación",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia de pareja para crisis emocionales",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia de pareja prematrimonial",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia de pareja para infidelidad",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia de pareja para sexualidad",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "terapeuta-conductual",
    "name": "Terapeuta conductual",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Terapia cognitivo-conductual (TCC)",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia conductual aplicada",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia conductual infantil",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia conductual para ansiedad",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia conductual para depresión",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia conductual para trastornos obsesivo-compulsivos",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia conductual para manejo del estrés",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia conductual para trastornos del comportamiento",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "fitoterapeuta",
    "name": "Fitoterapeuta",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Fitoterapia clínica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Fitoterapia preventiva",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Fitoterapia digestiva",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Fitoterapia para ansiedad y estrés",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Fitoterapia para trastornos del sueño",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Fitoterapia para enfermedades crónicas",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Fitoterapia dermatológica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Fitoterapia inmunológica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "reflexologo",
    "name": "Reflexólogo",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Reflexología podal",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Reflexología de manos",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Reflexología facial",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Reflexología terapéutica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Reflexología para manejo del estrés",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Reflexología para dolor crónico",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Reflexología para bienestar general",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Reflexología energética",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "hipnoterapeuta",
    "name": "Hipnoterapeuta",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Hipnoterapia clínica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Hipnoterapia para ansiedad",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Hipnoterapia para manejo del estrés",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Hipnoterapia para fobias",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Hipnoterapia para trastornos del sueño",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Hipnoterapia para control del dolor",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Hipnoterapia para dejar de fumar",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Hipnoterapia para control de peso",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "instructor-de-meditacion",
    "name": "Instructor de meditación",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Meditación mindfulness",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Meditación guiada",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Meditación para manejo del estrés",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Meditación para ansiedad",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Meditación para bienestar emocional",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Meditación terapéutica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Meditación para concentración",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Meditación para sueño",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "terapeuta-del-dolor",
    "name": "Terapeuta del dolor",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Manejo del dolor crónico",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Manejo del dolor musculoesquelético",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia para dolor neuropático",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia para dolor postquirúrgico",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación para dolor crónico",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapias integrativas para el dolor",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia física para el dolor",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia psicológica para el dolor",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "cosmetologo",
    "name": "Cosmetólogo",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Cosmetología facial",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Cosmetología corporal",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Cosmetología dermatológica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Cosmetología antienvejecimiento",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Cosmetología para acné",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Cosmetología estética avanzada",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Cosmetología terapéutica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Cosmetología preventiva",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "tricologo",
    "name": "Tricólogo",
    "defaultHasMedicalRecord": false,
    "defaultHasPrescription": false,
    "isWellness": true,
    "specialties": [
      {
        "name": "Tricología clínica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Tricología dermatológica",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Tricología estética",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Tratamiento de alopecia",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Tratamiento de caída del cabello",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Tricología capilar preventiva",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Salud del cuero cabelludo",
        "hasMedicalRecord": false,
        "hasPrescription": false
      },
      {
        "name": "Terapias capilares regenerativas",
        "hasMedicalRecord": false,
        "hasPrescription": false
      }
    ]
  },
  {
    "id": "terapeuta-respiratorio",
    "name": "Terapeuta respiratorio",
    "defaultHasMedicalRecord": true,
    "defaultHasPrescription": false,
    "isWellness": false,
    "specialties": [
      {
        "name": "Terapia respiratoria clínica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia respiratoria pediátrica",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia respiratoria neonatal",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Rehabilitación pulmonar",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia respiratoria para enfermedades crónicas",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia respiratoria en cuidados intensivos",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Terapia respiratoria domiciliaria",
        "hasMedicalRecord": true,
        "hasPrescription": false
      },
      {
        "name": "Educación respiratoria",
        "hasMedicalRecord": true,
        "hasPrescription": false
      }
    ]
  }
];

export const DEFAULT_SPECIALTIES_LIST: string[] = [
  "Medicina general",
  "Medicina familiar y comunitaria",
  "Medicina interna",
  "Pediatría",
  "Ginecología y obstetricia",
  "Cardiología",
  "Dermatología",
  "Endocrinología",
  "Gastroenterología",
  "Neurología",
  "Psiquiatría",
  "Traumatología y ortopedia",
  "Urología",
  "Neumonología",
  "Nefrología",
  "Oncología",
  "Reumatología",
  "Infectología",
  "Medicina del deporte",
  "Medicina del trabajo",
  "Medicina estética",
  "Medicina preventiva",
  "Medicina de urgencias",
  "Geriatría",
  "Medicina intensiva",
  "Psicología clínica",
  "Psicología infantil",
  "Psicología del adolescente",
  "Psicología del adulto",
  "Psicología del adulto mayor",
  "Psicología educativa",
  "Psicología organizacional",
  "Psicología deportiva",
  "Psicología forense",
  "Psicología social",
  "Psicología de la salud",
  "Psicología comunitaria",
  "Psicología neurocognitiva",
  "Psicología positiva",
  "Terapia de pareja",
  "Terapia familiar",
  "Odontología general",
  "Ortodoncia",
  "Implantología oral",
  "Endodoncia",
  "Periodoncia",
  "Odontopediatría",
  "Cirugía oral",
  "Cirugía maxilofacial",
  "Prótesis dental",
  "Estética dental",
  "Odontología restauradora",
  "Odontología preventiva",
  "Radiología odontológica",
  "Odontología geriátrica",
  "Odontología deportiva",
  "Fisioterapia musculoesquelética",
  "Fisioterapia deportiva",
  "Fisioterapia neurológica",
  "Fisioterapia respiratoria",
  "Fisioterapia pediátrica",
  "Fisioterapia geriátrica",
  "Fisioterapia traumatológica",
  "Fisioterapia postquirúrgica",
  "Fisioterapia cardiopulmonar",
  "Fisioterapia del suelo pélvico",
  "Fisioterapia vestibular",
  "Fisioterapia para dolor crónico",
  "Rehabilitación funcional",
  "Rehabilitación neuromotora",
  "Terapia manual ortopédica",
  "Nutrición clínica",
  "Nutrición deportiva",
  "Nutrición pediátrica",
  "Nutrición geriátrica",
  "Nutrición para enfermedades metabólicas",
  "Nutrición para diabetes",
  "Nutrición para obesidad y sobrepeso",
  "Nutrición hospitalaria",
  "Nutrición comunitaria",
  "Nutrición preventiva",
  "Nutrición oncológica",
  "Nutrición vegetariana y vegana",
  "Nutrición digestiva",
  "Nutrición funcional",
  "Educación nutricional",
  "Fonoaudiología clínica",
  "Fonoaudiología infantil",
  "Fonoaudiología geriátrica",
  "Terapia del lenguaje",
  "Terapia del habla",
  "Rehabilitación de la voz",
  "Rehabilitación auditiva",
  "Trastornos del desarrollo del lenguaje",
  "Trastornos de la deglución (disfagia)",
  "Trastornos de la comunicación",
  "Rehabilitación neurológica del lenguaje",
  "Fonoaudiología educativa",
  "Terapia ocupacional en rehabilitación física",
  "Terapia ocupacional neurológica",
  "Terapia ocupacional pediátrica",
  "Terapia ocupacional geriátrica",
  "Terapia ocupacional en salud mental",
  "Terapia ocupacional comunitaria",
  "Terapia ocupacional para discapacidad",
  "Terapia ocupacional laboral",
  "Adaptación funcional y ayudas técnicas",
  "Rehabilitación cognitiva",
  "Biomedicina clínica",
  "Biomedicina estética",
  "Análisis clínicos",
  "Diagnóstico por imágenes",
  "Biología molecular",
  "Genética clínica",
  "Microbiología clínica",
  "Inmunología clínica",
  "Citología y patología celular",
  "Toxicología clínica",
  "Reproducción asistida",
  "Investigación biomédica",
  "Psicoanálisis clínico",
  "Psicoanálisis infantil",
  "Psicoanálisis de adolescentes",
  "Psicoanálisis de adultos",
  "Psicoanálisis de pareja",
  "Psicoanálisis familiar",
  "Psicoanálisis lacaniano",
  "Psicoanálisis freudiano",
  "Psicoterapia psicoanalítica",
  "Supervisión psicoanalítica",
  "Acupuntura tradicional china",
  "Acupuntura médica",
  "Acupuntura para manejo del dolor",
  "Acupuntura estética",
  "Acupuntura para ansiedad y estrés",
  "Acupuntura deportiva",
  "Acupuntura para fertilidad",
  "Electroacupuntura",
  "Auriculoterapia",
  "Moxibustión",
  "Quiropraxia general",
  "Quiropraxia deportiva",
  "Quiropraxia pediátrica",
  "Quiropraxia geriátrica",
  "Ajuste vertebral",
  "Corrección postural",
  "Tratamiento de dolor lumbar",
  "Tratamiento de dolor cervical",
  "Rehabilitación de columna",
  "Prevención de lesiones musculoesqueléticas",
  "Osteopatía estructural",
  "Osteopatía visceral",
  "Osteopatía craneal",
  "Osteopatía pediátrica",
  "Osteopatía deportiva",
  "Osteopatía geriátrica",
  "Osteopatía para dolor crónico",
  "Osteopatía para rehabilitación musculoesquelética",
  "Osteopatía para trastornos digestivos",
  "Osteopatía para disfunciones posturales",
  "Psicopedagogía clínica",
  "Psicopedagogía educativa",
  "Evaluación psicopedagógica",
  "Intervención en dificultades de aprendizaje",
  "Trastornos del aprendizaje (dislexia, discalculia, disgrafía)",
  "Orientación escolar",
  "Psicopedagogía infantil",
  "Psicopedagogía para adolescentes",
  "Psicopedagogía para adultos",
  "Estimulación cognitiva",
  "Reeducación pedagógica",
  "Sexología clínica",
  "Terapia sexual",
  "Terapia sexual de pareja",
  "Educación sexual",
  "Sexología médica",
  "Sexología psicológica",
  "Tratamiento de disfunciones sexuales",
  "Asesoramiento en salud sexual",
  "Sexualidad en adolescentes",
  "Sexualidad en adultos mayores",
  "Estética facial",
  "Estética corporal",
  "Cosmiatría",
  "Tratamientos antienvejecimiento",
  "Tratamientos para acné",
  "Limpieza facial profesional",
  "Tratamientos reductores",
  "Tratamientos reafirmantes",
  "Aparatología estética",
  "Estética dermatológica",
  "Podología clínica",
  "Podología deportiva",
  "Podología geriátrica",
  "Podología pediátrica",
  "Podología para pie diabético",
  "Tratamiento de uñas encarnadas",
  "Tratamiento de callosidades",
  "Corrección de alteraciones ungueales",
  "Cuidado preventivo del pie",
  "Rehabilitación podológica",
  "Coaching de bienestar",
  "Coaching nutricional",
  "Coaching de hábitos saludables",
  "Coaching de manejo del estrés",
  "Coaching de sueño",
  "Coaching de cambio de estilo de vida",
  "Coaching de salud mental",
  "Coaching de actividad física",
  "Coaching de prevención de enfermedades",
  "Yoga terapéutico",
  "Yoga para principiantes",
  "Yoga avanzado",
  "Yoga prenatal",
  "Yoga postnatal",
  "Yoga para niños",
  "Yoga para adultos mayores",
  "Hatha yoga",
  "Vinyasa yoga",
  "Ashtanga yoga",
  "Kundalini yoga",
  "Yoga restaurativo",
  "Yoga para manejo del estrés",
  "Pilates clínico",
  "Pilates terapéutico",
  "Pilates para rehabilitación",
  "Pilates para embarazadas",
  "Pilates postparto",
  "Pilates para adultos mayores",
  "Pilates deportivo",
  "Pilates de suelo (mat pilates)",
  "Pilates con máquinas (reformer)",
  "Pilates para fortalecimiento del core",
  "Pilates para corrección postural",
  "Terapia energética",
  "Terapia vibracional",
  "Sanación energética",
  "Terapia con cristales",
  "Terapia de chakras",
  "Terapia holística emocional",
  "Terapia holística espiritual",
  "Terapia integrativa",
  "Terapia mente-cuerpo",
  "Naturopatía clínica",
  "Naturopatía preventiva",
  "Fitoterapia",
  "Terapias naturales integrativas",
  "Medicina natural",
  "Naturopatía nutricional",
  "Naturopatía para manejo del estrés",
  "Naturopatía para enfermedades crónicas",
  "Neuropsicología clínica",
  "Neuropsicología infantil",
  "Neuropsicología del adulto",
  "Neuropsicología geriátrica",
  "Evaluación neuropsicológica",
  "Rehabilitación neuropsicológica",
  "Neuropsicología cognitiva",
  "Neuropsicología del desarrollo",
  "Neuropsicología de trastornos neurológicos",
  "Neuropsicología de trastornos neurodegenerativos",
  "Terapia familiar sistémica",
  "Terapia familiar estructural",
  "Terapia familiar estratégica",
  "Terapia familiar para resolución de conflictos",
  "Terapia familiar para adolescentes",
  "Terapia familiar para problemas de conducta",
  "Terapia familiar para crisis familiares",
  "Mediación familiar",
  "Terapia de pareja sistémica",
  "Terapia de pareja cognitivo-conductual",
  "Terapia de pareja para manejo de conflictos",
  "Terapia de pareja para problemas de comunicación",
  "Terapia de pareja para crisis emocionales",
  "Terapia de pareja prematrimonial",
  "Terapia de pareja para infidelidad",
  "Terapia de pareja para sexualidad",
  "Terapia cognitivo-conductual (TCC)",
  "Terapia conductual aplicada",
  "Terapia conductual infantil",
  "Terapia conductual para ansiedad",
  "Terapia conductual para depresión",
  "Terapia conductual para trastornos obsesivo-compulsivos",
  "Terapia conductual para manejo del estrés",
  "Terapia conductual para trastornos del comportamiento",
  "Fitoterapia clínica",
  "Fitoterapia preventiva",
  "Fitoterapia digestiva",
  "Fitoterapia para ansiedad y estrés",
  "Fitoterapia para trastornos del sueño",
  "Fitoterapia para enfermedades crónicas",
  "Fitoterapia dermatológica",
  "Fitoterapia inmunológica",
  "Reflexología podal",
  "Reflexología de manos",
  "Reflexología facial",
  "Reflexología terapéutica",
  "Reflexología para manejo del estrés",
  "Reflexología para dolor crónico",
  "Reflexología para bienestar general",
  "Reflexología energética",
  "Hipnoterapia clínica",
  "Hipnoterapia para ansiedad",
  "Hipnoterapia para manejo del estrés",
  "Hipnoterapia para fobias",
  "Hipnoterapia para trastornos del sueño",
  "Hipnoterapia para control del dolor",
  "Hipnoterapia para dejar de fumar",
  "Hipnoterapia para control de peso",
  "Meditación mindfulness",
  "Meditación guiada",
  "Meditación para manejo del estrés",
  "Meditación para ansiedad",
  "Meditación para bienestar emocional",
  "Meditación terapéutica",
  "Meditación para concentración",
  "Meditación para sueño",
  "Manejo del dolor crónico",
  "Manejo del dolor musculoesquelético",
  "Terapia para dolor neuropático",
  "Terapia para dolor postquirúrgico",
  "Rehabilitación para dolor crónico",
  "Terapias integrativas para el dolor",
  "Terapia física para el dolor",
  "Terapia psicológica para el dolor",
  "Cosmetología facial",
  "Cosmetología corporal",
  "Cosmetología dermatológica",
  "Cosmetología antienvejecimiento",
  "Cosmetología para acné",
  "Cosmetología estética avanzada",
  "Cosmetología terapéutica",
  "Cosmetología preventiva",
  "Tricología clínica",
  "Tricología dermatológica",
  "Tricología estética",
  "Tratamiento de alopecia",
  "Tratamiento de caída del cabello",
  "Tricología capilar preventiva",
  "Salud del cuero cabelludo",
  "Terapias capilares regenerativas",
  "Terapia respiratoria clínica",
  "Terapia respiratoria pediátrica",
  "Terapia respiratoria neonatal",
  "Rehabilitación pulmonar",
  "Terapia respiratoria para enfermedades crónicas",
  "Terapia respiratoria en cuidados intensivos",
  "Terapia respiratoria domiciliaria",
  "Educación respiratoria"
];

export const DEFAULT_BEAUTY_SPECIALTIES_LIST: string[] = [
  "Acupuntura tradicional china",
  "Acupuntura médica",
  "Acupuntura para manejo del dolor",
  "Acupuntura estética",
  "Acupuntura para ansiedad y estrés",
  "Acupuntura deportiva",
  "Acupuntura para fertilidad",
  "Electroacupuntura",
  "Auriculoterapia",
  "Moxibustión",
  "Estética facial",
  "Estética corporal",
  "Cosmiatría",
  "Tratamientos antienvejecimiento",
  "Tratamientos para acné",
  "Limpieza facial profesional",
  "Tratamientos reductores",
  "Tratamientos reafirmantes",
  "Aparatología estética",
  "Estética dermatológica",
  "Coaching de bienestar",
  "Coaching nutricional",
  "Coaching de hábitos saludables",
  "Coaching de manejo del estrés",
  "Coaching de sueño",
  "Coaching de cambio de estilo de vida",
  "Coaching de salud mental",
  "Coaching de actividad física",
  "Coaching de prevención de enfermedades",
  "Yoga terapéutico",
  "Yoga para principiantes",
  "Yoga avanzado",
  "Yoga prenatal",
  "Yoga postnatal",
  "Yoga para niños",
  "Yoga para adultos mayores",
  "Hatha yoga",
  "Vinyasa yoga",
  "Ashtanga yoga",
  "Kundalini yoga",
  "Yoga restaurativo",
  "Yoga para manejo del estrés",
  "Pilates clínico",
  "Pilates terapéutico",
  "Pilates para rehabilitación",
  "Pilates para embarazadas",
  "Pilates postparto",
  "Pilates para adultos mayores",
  "Pilates deportivo",
  "Pilates de suelo (mat pilates)",
  "Pilates con máquinas (reformer)",
  "Pilates para fortalecimiento del core",
  "Pilates para corrección postural",
  "Terapia energética",
  "Terapia vibracional",
  "Sanación energética",
  "Terapia con cristales",
  "Terapia de chakras",
  "Terapia holística emocional",
  "Terapia holística espiritual",
  "Terapia integrativa",
  "Terapia mente-cuerpo",
  "Naturopatía clínica",
  "Naturopatía preventiva",
  "Fitoterapia",
  "Terapias naturales integrativas",
  "Medicina natural",
  "Naturopatía nutricional",
  "Naturopatía para manejo del estrés",
  "Naturopatía para enfermedades crónicas",
  "Fitoterapia clínica",
  "Fitoterapia preventiva",
  "Fitoterapia digestiva",
  "Fitoterapia para ansiedad y estrés",
  "Fitoterapia para trastornos del sueño",
  "Fitoterapia para enfermedades crónicas",
  "Fitoterapia dermatológica",
  "Fitoterapia inmunológica",
  "Reflexología podal",
  "Reflexología de manos",
  "Reflexología facial",
  "Reflexología terapéutica",
  "Reflexología para manejo del estrés",
  "Reflexología para dolor crónico",
  "Reflexología para bienestar general",
  "Reflexología energética",
  "Hipnoterapia clínica",
  "Hipnoterapia para ansiedad",
  "Hipnoterapia para manejo del estrés",
  "Hipnoterapia para fobias",
  "Hipnoterapia para trastornos del sueño",
  "Hipnoterapia para control del dolor",
  "Hipnoterapia para dejar de fumar",
  "Hipnoterapia para control de peso",
  "Meditación mindfulness",
  "Meditación guiada",
  "Meditación para manejo del estrés",
  "Meditación para ansiedad",
  "Meditación para bienestar emocional",
  "Meditación terapéutica",
  "Meditación para concentración",
  "Meditación para sueño",
  "Cosmetología facial",
  "Cosmetología corporal",
  "Cosmetología dermatológica",
  "Cosmetología antienvejecimiento",
  "Cosmetología para acné",
  "Cosmetología estética avanzada",
  "Cosmetología terapéutica",
  "Cosmetología preventiva",
  "Tricología clínica",
  "Tricología dermatológica",
  "Tricología estética",
  "Tratamiento de alopecia",
  "Tratamiento de caída del cabello",
  "Tricología capilar preventiva",
  "Salud del cuero cabelludo",
  "Terapias capilares regenerativas"
];

/**
 * Encuentra la profesión a la que pertenece una especialidad.
 */
export function findProfessionBySpecialty(
  specialtyName?: string | null,
  catalog: ProfessionCategory[] = DEFAULT_PROFESSIONS_CATALOG
): ProfessionCategory | undefined {
  if (!specialtyName) return undefined;
  const lower = specialtyName.trim().toLowerCase();
  const activeCatalog = catalog && catalog.length > 0 ? catalog : DEFAULT_PROFESSIONS_CATALOG;

  for (const prof of activeCatalog) {
    if (prof.name.toLowerCase() === lower) return prof;
    if (prof.specialties.some(s => s.name.toLowerCase() === lower)) {
      return prof;
    }
  }
  return undefined;
}

/**
 * Resuelve si un especialista tiene acceso a Historia Médica y Récipe Médico.
 * Prioridad:
 * 1. Override directo en el registro del doctor (doctor.hasMedicalRecord / doctor.hasPrescription)
 * 2. Configuración de la especialidad específica en el catálogo de settings (professionsCatalog)
 * 3. Configuración por defecto de la profesión (defaultHasMedicalRecord / defaultHasPrescription)
 * 4. Por defecto true si es Médico, false si no coincide.
 */
export function resolveDoctorCapabilities(
  doctor?: {
    specialty?: string | null;
    profession?: string | null;
    hasMedicalRecord?: boolean | null;
    hasPrescription?: boolean | null;
    [key: string]: any;
  } | null,
  catalog?: ProfessionCategory[] | null
): {
  profession: string;
  specialty: string;
  hasMedicalRecord: boolean;
  hasPrescription: boolean;
} {
  const activeCatalog = catalog && catalog.length > 0 ? catalog : DEFAULT_PROFESSIONS_CATALOG;
  const specialty = (doctor?.specialty || '').trim();
  const explicitProf = (doctor?.profession || '').trim();

  const matchedProf =
    (explicitProf
      ? activeCatalog.find(p => p.name.toLowerCase() === explicitProf.toLowerCase())
      : undefined) ||
    findProfessionBySpecialty(specialty, activeCatalog);

  const matchedSpec = matchedProf?.specialties.find(
    s => s.name.toLowerCase() === specialty.toLowerCase()
  );

  // Resolver Historia Médica
  let hasMedicalRecord = true;
  if (typeof doctor?.hasMedicalRecord === 'boolean') {
    hasMedicalRecord = doctor.hasMedicalRecord;
  } else if (typeof (doctor as any)?.has_medical_record === 'boolean') {
    hasMedicalRecord = (doctor as any).has_medical_record;
  } else if (matchedSpec) {
    hasMedicalRecord = matchedSpec.hasMedicalRecord;
  } else if (matchedProf) {
    hasMedicalRecord = matchedProf.defaultHasMedicalRecord;
  }

  // Resolver Récipe Médico
  let hasPrescription = true;
  if (typeof doctor?.hasPrescription === 'boolean') {
    hasPrescription = doctor.hasPrescription;
  } else if (typeof (doctor as any)?.has_prescription === 'boolean') {
    hasPrescription = (doctor as any).has_prescription;
  } else if (matchedSpec) {
    hasPrescription = matchedSpec.hasPrescription;
  } else if (matchedProf) {
    hasPrescription = matchedProf.defaultHasPrescription;
  }

  return {
    profession: explicitProf || matchedProf?.name || 'Médico',
    specialty: specialty || 'Medicina general',
    hasMedicalRecord,
    hasPrescription,
  };
}

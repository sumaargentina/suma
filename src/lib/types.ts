export type ChatMessage = {
  id: string;
  sender: 'user' | 'admin' | 'patient' | 'doctor';
  text: string;
  timestamp: string; // ISO string
};

// =====================================================
// NÚCLEO FAMILIAR - Tipos
// =====================================================

export type DocumentType = 'DNI' | 'Pasaporte' | 'Otro';

export const DOCUMENT_TYPES: DocumentType[] = ['DNI', 'Pasaporte', 'Otro'];

export const COUNTRY_CODES = [
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
];

export type FamilyRelationship =
  | 'hijo'
  | 'hija'
  | 'padre'

  | 'madre'
  | 'abuelo'
  | 'abuela'
  | 'nieto'
  | 'nieta'
  | 'conyuge'
  | 'hermano'
  | 'hermana'
  | 'otro';

export const FAMILY_RELATIONSHIP_LABELS: Record<FamilyRelationship, string> = {
  hijo: 'Hijo',
  hija: 'Hija',
  padre: 'Padre',
  madre: 'Madre',
  abuelo: 'Abuelo',
  abuela: 'Abuela',
  nieto: 'Nieto',
  nieta: 'Nieta',
  conyuge: 'Cónyuge',
  hermano: 'Hermano',
  hermana: 'Hermana',
  otro: 'Otro',
};

export interface FamilyMember {
  id: string;
  accountHolderId: string;
  firstName: string;
  lastName: string;
  cedula?: string;
  documentType?: DocumentType;
  birthDate: string; // YYYY-MM-DD
  gender?: string;
  email?: string;
  phone?: string;
  relationship: FamilyRelationship;
  relationshipDetail?: string;
  linkedPatientId?: string;
  canViewHistory: boolean;
  canBookAppointments: boolean;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive' | 'pending_verification';
  // Computed fields (not stored in DB)
  fullName?: string;
  age?: number;
}

export type BankDetail = {
  id: string;
  bank: string;
  accountNumber: string;
  accountHolder: string;
  idNumber: string;
  description?: string | null;
  alias?: string;
};

export type Service = {
  id: string;
  name: string;
  price: number;
  duration?: number; // In minutes
  description?: string;
};

export type Coupon = {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minAmount?: number;
  maxDiscount?: number;
  validFrom: string; // ISO string
  validTo: string; // ISO string
  maxUses?: number;
  isActive: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  scopeType: 'all' | 'specialty' | 'city' | 'specific';
  scopeSpecialty?: string;
  scopeCity?: string;
  scopeDoctors?: string[];
  scope?: 'general' | string;
  value?: number;
  clinicId?: string;
};

// Categorías predefinidas de gastos
export const EXPENSE_CATEGORIES = [
  'Alquiler',
  'Servicios (Luz, Agua, Internet)',
  'Equipamiento Médico',
  'Insumos Médicos',
  'Personal',
  'Marketing y Publicidad',
  'Mantenimiento',
  'Seguros',
  'Impuestos',
  'Capacitación',
  'Limpieza',
  'Otros'
] as const;

export type UserRole = 'patient' | 'doctor' | 'admin' | 'superadmin' | 'clinic' | 'secretary';

export interface Secretary {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  role: 'secretary';
  permissions: string[];
}

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  category?: ExpenseCategory | string; // Permite categorías predefinidas o personalizadas
  office?: string; // Consultorio/ubicación del gasto
};

export type DaySchedule = {
  active: boolean;
  slots: { start: string; end: string }[];
};

export type Schedule = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

export type DoctorAddress = {
  id: string;
  name: string;
  address: string;
  city: string;
  schedule: Schedule;
  lat: number;
  lng: number;
  consultationFee?: number;
  slotDuration?: number; // Duración de cada cita en este consultorio (en minutos)
  services?: Service[];
};

export type OnlineConsultation = {
  enabled: boolean;
  consultationFee: number;
  schedule: Schedule;
  platform?: string; // e.g., "Zoom", "Google Meet", "WhatsApp Video"
  slotDuration?: number; // Duración de cada consulta online (en minutos)
  services?: Service[];
};

// Clinic & Branch Types
export type ClinicBranch = {
  id: string;
  clinicId: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  location?: { lat: number; lng: number } | string;
  isActive: boolean;
};

export type ClinicService = {
  id: string;
  clinicId: string;
  branchId: string;
  name: string;
  serviceCategory?: string;
  price: number;
  duration: number; // minutes
  dailyCapacity?: number;
  operatingHours?: Record<string, string[]>; // e.g., { "lunes": ["08:00-12:00"], ... }
  description?: string;
  isActive: boolean;
  items?: { name: string; price: number }[]; // New field for sub-services/items
};

export type ClinicSpecialty = {
  id: string;
  clinicId: string;
  name: string;
};

export type ClinicExpense = {
  id: string;
  clinicId: string;
  description: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  createdAt?: string;
};

export type PatientCommunication = {
  id: string;
  clinicId: string;
  patientId: string;
  type: 'whatsapp' | 'email' | 'phone_call' | 'sms';
  template?: string;
  message: string;
  sentBy: string;
  sentAt: string;
  createdAt?: string;
};

export const COMMUNICATION_TEMPLATES = {
  appointment_reminder: {
    label: 'Recordatorio de Cita',
    message: 'Hola {nombre}, te recordamos que tienes una cita programada el {fecha} a las {hora}. ¡Te esperamos!'
  },
  follow_up: {
    label: 'Seguimiento',
    message: 'Hola {nombre}, esperamos que te encuentres bien. Queremos saber cómo fue tu experiencia en tu última visita. ¿Podemos ayudarte en algo más?'
  },
  we_miss_you: {
    label: 'Te Extrañamos',
    message: 'Hola {nombre}, hace tiempo que no nos visitas. ¡Te esperamos para tu próximo chequeo!'
  },
  thank_you: {
    label: 'Agradecimiento',
    message: 'Hola {nombre}, gracias por visitarnos. Fue un placer atenderte. ¡Hasta pronto!'
  },
  custom: {
    label: 'Mensaje Personalizado',
    message: ''
  }
} as const;

export type ClinicPatientMessage = {
  id: string;
  clinicId: string;
  patientId: string;
  senderType: 'clinic' | 'patient';
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type ClinicChatConversation = {
  patient: Patient;
  lastMessage?: ClinicPatientMessage;
  unreadCount: number;
};

export type Clinic = {
  id: string;
  adminEmail: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  createdAt: string;
  password?: string; // Required for Admin/Clinic login
  address?: string;
  city?: string;
  bannerImage?: string;
  rating?: number;
  reviewCount?: number;
  // For compatibility with UI that expects status
  status?: 'active' | 'inactive';
  paymentSettings?: PaymentSettings;
  coupons?: Coupon[];
  plan?: 'esencial' | 'profesional' | 'empresarial' | 'integral';
  billingCycle?: 'monthly' | 'annual';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  acceptedInsurances?: string[];
};

export type PaymentSettings = {
  cash: { enabled: boolean; description?: string };
  transfer: { enabled: boolean; cbu?: string; alias?: string; bank?: string; holder?: string; cuit?: string };
  mercadopago: { enabled: boolean; link?: string; qrImage?: string; publicKey?: string };
};

export type Doctor = {
  id: string;
  name: string;
  email: string;
  cedula: string;
  documentType?: DocumentType;
  specialty: string;
  city: string;
  address: string;
  sector: string;
  rating: number;
  reviewCount: number;
  profileImage: string;
  bannerImage: string;
  aiHint: string;
  description: string;
  services: Service[];
  bankDetails: BankDetail[];
  expenses: Expense[];
  coupons: Coupon[];
  schedule: Schedule;
  addresses?: DoctorAddress[];
  onlineConsultation?: OnlineConsultation;
  slotDuration: number;
  consultationFee: number;
  sellerId: string | null;
  status: 'active' | 'inactive';
  lastPaymentDate?: string | null;
  password: string;
  whatsapp: string;
  lat: number;
  lng: number;
  joinDate: string;
  subscriptionStatus: 'active' | 'inactive' | 'pending_payment';
  nextPaymentDate: string;
  readByAdmin?: boolean;
  readBySeller?: boolean;
  medicalLicense?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verified?: boolean;
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;

  // Clinic Fields
  clinicId?: string;
  isClinicEmployee?: boolean;
  branchIds?: string[];

  // Payment Settings
  paymentSettings?: PaymentSettings;
  acceptedInsurances?: string[];
};

export type Seller = {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  profileImage: string;
  referralCode: string;
  bankDetails: BankDetail[];
  commissionRate: number;
  expenses?: Expense[];
};

export type Patient = {
  id: string;
  name: string;
  email: string;
  password: string;
  age: number | null;
  gender: 'masculino' | 'femenino' | 'otro' | null;
  phone: string | null;
  cedula: string | null;
  documentType?: DocumentType;
  city: string | null;
  favoriteDoctorIds?: string[];
  profileImage: string | null;
  profileCompleted?: boolean;
};

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  doctorName?: string; // Optional because now it can be a service appointment
  doctorId?: string; // Optional for service appointments
  clinicServiceId?: string; // New: For service appointments (e.g., Lab)
  serviceName?: string; // New: To verify which service was booked
  date: string;
  time: string;
  services: Service[]; // This remains for legacy Doctor appointments (medical services)
  totalPrice: number;
  consultationFee: number;
  paymentMethod: 'efectivo' | 'transferencia' | 'mercadopago';
  paymentStatus: 'Pendiente' | 'Pagado';
  paymentProof: string | null;
  attendance: 'Atendido' | 'No Asistió' | 'Pendiente';
  patientConfirmationStatus: 'Pendiente' | 'Confirmada' | 'Cancelada';
  clinicalNotes?: string;
  prescription?: string;
  messages?: ChatMessage[];
  readByDoctor?: boolean;
  readByPatient?: boolean;
  unreadMessagesByDoctor?: number;
  unreadMessagesByPatient?: number;
  lastMessageTimestamp?: string;
  discountAmount?: number;
  appliedCoupon?: string;
  patientPhone?: string;
  doctorAddress?: string; // Consultorio donde se realiza la cita
  office?: string; // Campo legacy
  addressId?: string;
  consultationType?: 'presencial' | 'online'; // Tipo de consulta
  meetingLink?: string; // Link de la reunión para consultas online
  // Núcleo Familiar
  familyMemberId?: string; // Si no es null, la cita es para este familiar
  bookedByPatientId?: string; // Quién agendó la cita
  familyMemberName?: string; // Nombre del familiar (computed)
  bookedByName?: string; // Nombre de quien agendó (computed)
};

export type IncludedDoctorCommission = {
  id: string;
  name: string;
  commissionAmount: number;
};

export type SellerPayment = {
  id: string;
  sellerId: string;
  paymentDate: string;
  amount: number;
  period: string;
  includedDoctors: IncludedDoctorCommission[];
  paymentProofUrl: string;
  transactionId: string;
  status: 'pending' | 'paid';
  readBySeller?: boolean;
};

export type MarketingMaterial = {
  id: string;
  type: 'image' | 'video' | 'file' | 'url';
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
};

export type DoctorPayment = {
  id: string;
  doctorId: string;
  doctorName: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Rejected';
  paymentProofUrl: string | null;
  transactionId: string;
  readByAdmin?: boolean;
  readByDoctor?: boolean;
  paymentMethod?: string;
  targetAccount?: string;
  paymentDescription?: string;
};

export type AdminSupportTicket = {
  id: string;
  userId: string;
  userName: string;
  userRole: 'doctor' | 'seller';
  subject: string;
  description: string;
  status: 'abierto' | 'cerrado';
  date: string;
  createdAt?: string; // ISO timestamp con hora completa
  messages?: ChatMessage[];
  readByAdmin?: boolean;
  readBySeller?: boolean;
  readByDoctor?: boolean;
};

export type AdminNotification = {
  id: string;
  type: 'payment' | 'new_doctor' | 'support_ticket';
  title: string;
  description: string;
  date: string;
  read: boolean;
  link: string;
};

export type PatientNotification = {
  id: string;
  type: 'reminder' | 'payment_approved' | 'new_message' | 'record_added' | 'attendance_marked';
  appointmentId: string;
  title: string;
  description: string;
  date: string;
  read: boolean;
  createdAt: string;
  link: string;
};

export type DoctorNotification = {
  id: string;
  type: 'new_appointment' | 'payment_verification' | 'support_reply' | 'subscription_update' | 'new_message' | 'patient_confirmed' | 'patient_cancelled';
  title: string;
  description: string;
  date: string;
  createdAt: string;
  read: boolean;
  link: string;
};

export type SellerNotification = {
  id: string;
  type: 'payment_processed' | 'support_reply' | 'new_doctor_registered';
  title: string;
  description: string;
  date: string;
  createdAt: string;
  read: boolean;
  link: string;
};

export type ClinicNotification = {
  id: string;
  type: 'new_appointment' | 'payment_verification' | 'support_reply' | 'subscription_update' | 'new_message' | 'patient_confirmed' | 'patient_cancelled';
  title: string;
  description: string;
  date: string;
  createdAt: string;
  read: boolean;
  link: string;
};

export type CompanyExpense = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  category: 'operativo' | 'marketing' | 'personal';
};

export type City = {
  name: string;
  subscriptionFee: number;
};

export type AppSettings = {
  cities: City[];
  specialties: string[];
  companyBankDetails: BankDetail[];
  timezone: string;
  logoUrl: string;
  currency: string;
  beautySpecialties?: string[];
  heroImageUrl?: string;
  billingCycleStartDay?: number;
  billingCycleEndDay?: number;
  coupons: Coupon[];
  companyExpenses: CompanyExpense[];
}

export type DoctorReview = {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  patientProfileImage?: string | null;
  rating: number;
  comment: string;
  date: string;
  appointmentId?: string;
  isVerified: boolean;
};

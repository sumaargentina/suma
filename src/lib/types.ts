export type ChatMessage = {
  id: string;
  sender: 'user' | 'admin' | 'patient' | 'doctor' | 'clinic' | 'seller';
  text: string;
  timestamp: string; // ISO string
};

// =====================================================
// NÚCLEO FAMILIAR - Tipos
// =====================================================

export type DocumentType = 'Cédula' | 'Pasaporte' | 'DNI' | 'Otro';

export const DOCUMENT_TYPES: DocumentType[] = ['Cédula', 'Pasaporte', 'DNI', 'Otro'];

export const COUNTRY_CODES = [
  // Sudamérica
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  // Centroamérica y Caribe
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+53', country: 'Cuba', flag: '🇨🇺' },
  { code: '+1809', country: 'Rep. Dominicana', flag: '🇩🇴' },
  { code: '+509', country: 'Haití', flag: '🇭🇹' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+1787', country: 'Puerto Rico', flag: '🇵🇷' },
  // Norteamérica
  { code: '+1', country: 'USA / Canadá', flag: '🇺🇸' },
  // Europa
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+33', country: 'Francia', flag: '🇫🇷' },
  { code: '+49', country: 'Alemania', flag: '🇩🇪' },
  { code: '+39', country: 'Italia', flag: '🇮🇹' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  // Asia
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japón', flag: '🇯🇵' },
  { code: '+82', country: 'Corea del Sur', flag: '🇰🇷' },
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
  // Campos adicionales médicos
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  religion?: string | null;
  maritalStatus?: 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'union_libre' | null;
  education?: string | null;
  occupation?: string | null;
  city?: string | null;
  allergies?: string[] | null;
  notes?: string | null;
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
  currency?: 'USD' | 'VES' | string;
  accountType?: 'pago_movil' | 'transferencia' | 'zelle' | 'efectivo_dolares' | 'cuenta_nacional' | 'otro';
  country?: string; // Código ISO del país (VE, AR, CO) o 'GLOBAL' para cuentas internacionales
  phone?: string;
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
  name?: string;
  code: string;
  description?: string;
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

export type UserRole = 'patient' | 'doctor' | 'admin' | 'superadmin' | 'clinic' | 'secretary' | 'pharmacy' | 'laboratory';

export type WorkspaceType = 'private' | 'clinic' | 'public_hospital';

export interface DoctorWorkspace {
  id: string;
  doctorId: string;
  workspaceType: WorkspaceType;
  clinicId?: string | null;
  customName?: string | null;
  roleInWorkplace?: 'owner' | 'staff_doctor' | 'guard_doctor' | string;
  status: 'active' | 'pending_invitation' | 'inactive';
  canManageFinances: boolean;
  canManageSchedule: boolean;
  consultationFee?: number;
  slotDuration?: number;
  schedule?: Schedule | null;
  isDefault: boolean;
  clinicName?: string;
  clinicSlug?: string;
  clinicLogo?: string;
  clinicAddress?: string;
  clinicPlan?: string;
  clinicStatus?: string;
  clinicSubscriptionStatus?: string;
  subscriptionLocked?: boolean;
  lockReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActiveWorkspace {
  id: string;
  workspaceType: WorkspaceType;
  name: string;
  clinicId?: string | null;
  roleInWorkplace?: string;
  canManageFinances: boolean;
  canManageSchedule: boolean;
  subscriptionLocked?: boolean;
  lockReason?: string;
}

export interface Secretary {
  id: string;
  clinicId?: string;
  laboratoryId?: string;
  name: string;
  email: string;
  role: 'secretary';
  permissions: string[];
  phone?: string;
  country?: string;
  state?: string;
  city?: string;
  sector?: string;
  address?: string;
}

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // Monto en USD
  currency?: 'USD' | 'VES';
  amountInLocalCurrency?: number; // Equivalente en Bs.
  exchangeRate?: number; // Tasa BCV congelada al momento del gasto
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
  country?: string;
  state?: string;
  city: string;
  sector?: string;
  address: string;
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
  country?: string;
  state?: string;
  city: string;
  sector?: string;
  address: string;
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
  amount: number; // Monto en USD
  currency?: 'USD' | 'VES';
  amountInLocalCurrency?: number; // Equivalente en Bs.
  exchangeRate?: number; // Tasa BCV congelada
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
  country?: string;
  state?: string;
  address?: string;
  city?: string;
  sector?: string;
  bannerImage?: string;
  rating?: number;
  reviewCount?: number;
  // For compatibility with UI that expects status
  status?: 'active' | 'inactive';
  paymentSettings?: PaymentSettings;
  coupons?: Coupon[];
  plan?: 'esencial' | 'profesional' | 'empresarial' | 'integral' | 'hospital_gratuito' | string;
  billingCycle?: 'monthly' | 'annual' | 'free' | string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  acceptedInsurances?: string[];
  // Subscription fields
  subscriptionStatus?: 'active' | 'inactive' | 'pending_payment';
  lastPaymentDate?: string | null;
  nextPaymentDate?: string | null;
  subscriptionFee?: number;
  billingMonths?: number;
  discountPercentage?: number;
  freeMonths?: number;
  legalName?: string | null;
  rif?: string | null;
  regentName?: string | null;
  regentLicense?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  lat?: number;
  lng?: number;
};

export type ClinicPayment = {
  id: string;
  clinicId: string;
  clinicName?: string; // Computed field for display
  amount: number;
  date: string;
  status: 'Pending' | 'Paid' | 'Rejected';
  paymentMethod: 'transfer' | 'mercadopago' | 'cash';
  transactionId?: string;
  paymentProofUrl?: string | null;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentSettings = {
  cash: { enabled: boolean; description?: string };
  pagoMovil?: { enabled: boolean; bank?: string; phone?: string; idDocument?: string; holder?: string };
  transfer: { 
    enabled: boolean; 
    bank?: string; 
    holder?: string; 
    accountNumber?: string; 
    phone?: string; 
    idDocument?: string; 
    // Legacy fields for backwards compatibility
    cbu?: string; 
    alias?: string; 
    cuit?: string; 
  };
  zelle?: { enabled: boolean; email?: string; holder?: string };
  mercadopago?: { enabled: boolean; link?: string; qrImage?: string; publicKey?: string };
};

export type Laboratory = {
  id: string;
  adminEmail?: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email: string;
  website?: string;
  password?: string;
  licenseNumber?: string;
  accreditations?: Record<string, unknown>[];
  country?: string;
  state?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  sector?: string;
  bannerImage?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: Record<string, string[]>;
  appointmentRequired?: boolean;
  services?: Record<string, unknown>;
  homeService?: boolean;
  photos?: string[];
  status?: 'active' | 'inactive';
  verified?: boolean;
  verifiedAt?: string | null;
  bankDetails?: Record<string, unknown>;
  totalStudiesPerformed?: number;
  rating?: number;
  totalReviews?: number;
  paymentSettings?: PaymentSettings;
  acceptedInsurances?: string[];
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  subscriptionStatus?: 'active' | 'inactive' | 'pending_payment';
  plan?: 'esencial' | 'profesional' | 'empresarial' | 'integral' | 'hospital_gratuito' | string;
  billingCycle?: 'monthly' | 'annual' | 'free' | string;
  subscriptionFee?: number;
  billingMonths?: number;
  discountPercentage?: number;
  freeMonths?: number;
  legalName?: string | null;
  rif?: string | null;
  regentName?: string | null;
  regentLicense?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Legacy aliases for backward compatibility in UI components
  lat?: number;
  lng?: number;
  reviewCount?: number;
  coupons?: Coupon[];
  lastPaymentDate?: string | null;
  nextPaymentDate?: string | null;
};

export type LaboratoryService = {
  id: string;
  laboratoryId: string;
  name: string;
  serviceCategory?: string;
  price: number;
  duration?: number;
  dailyCapacity?: number;
  operatingHours?: Record<string, string[]>;
  description?: string;
  preparationInstructions?: string;
  resultsDeliveryTime?: string;
  isActive: boolean;
  items?: { name: string; price: number }[];
  createdAt?: string;
};

export type LaboratoryOrder = {
  id: string;
  doctorId: string;
  patientId: string;
  appointmentId?: string;
  laboratoryId?: string;
  orderNumber: string;
  studies: { name: string; code?: string; urgency?: string }[];
  diagnosis?: string;
  clinicalIndications?: string;
  digitalSignature?: string;
  qrCode?: string;
  verificationCode?: string;
  validFrom?: string;
  validUntil?: string;
  status?: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate?: string;
  completedDate?: string;
  resultsAvailable?: boolean;
  resultsUrl?: string;
  resultsUploadedAt?: string;
  doctorNotes?: string;
  laboratoryNotes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Doctor = {
  id: string;
  name: string;
  email: string;
  cedula: string;
  documentType?: DocumentType;
  profession?: string;
  specialty: string;
  hasMedicalRecord?: boolean | null;
  has_medical_record?: boolean | null;
  hasPrescription?: boolean | null;
  has_prescription?: boolean | null;
  country?: string;
  state?: string;
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

  phone?: string;
  onboardingCompleted?: boolean;

  // Digital Signature & Stamp
  signature_url?: string;
  stamp_url?: string;

  // B2B Pharmacy Sponsorships
  acceptsPharmacySponsorships?: boolean;
  accepts_pharmacy_sponsorships?: boolean;
  sponsorshipConditions?: string | null;
  sponsorship_conditions?: string | null;
};

export interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string | null;
  family_member_id?: string | null;
  visit_date: string;
  record_type?: string;
  reason_for_visit?: string | null;
  diagnosis: string;
  evaluation?: string | null;
  requested_studies?: string | null;
  prescription?: string | null;
  treatment_plan?: string | null;
  prescription_expires_at?: string | null;
  recipe_status?: 'active' | 'dispensed' | 'expired' | string | null;
  dispensed_by_pharmacy_id?: string | null;
  dispensed_by_pharmacy_name?: string | null;
  dispensed_at?: string | null;
  dispensation_notes?: string | null;
  notes?: string | null;
  evolution?: string | null;
  medical_report?: string | null;
  requires_rest?: boolean;
  rest_days?: number | null;
  rest_start_date?: string | null;
  rest_end_date?: string | null;
  rest_type?: string | null;
  rest_justification?: string | null;
  vital_signs?: any;
  created_at?: string;
  updated_at?: string;
  doctors?: Doctor;
}

export type Pharmacy = {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string | null;
  whatsapp?: string | null;
  licenseNumber?: string | null;
  license_number?: string | null;
  isChain?: boolean;
  is_chain?: boolean;
  chainName?: string | null;
  chain_name?: string | null;
  branchName?: string | null;
  branch_name?: string | null;
  address: string;
  city: string;
  state?: string | null;
  sector?: string | null;
  postalCode?: string | null;
  postal_code?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: Record<string, { open: string; close: string }> | null;
  opening_hours?: Record<string, { open: string; close: string }> | null;
  is24Hours?: boolean;
  is_24_hours?: boolean;
  logoUrl?: string | null;
  logo_url?: string | null;
  bannerUrl?: string | null;
  banner_url?: string | null;
  bannerImage?: string | null;
  banner_image?: string | null;
  photos?: string[] | null;
  status?: 'pending' | 'active' | 'inactive' | 'suspended';
  verified?: boolean;
  totalPrescriptionsFilled?: number;
  total_prescriptions_filled?: number;
  rating?: number;
  totalReviews?: number;
  // B2B Sponsorship & Advertising Plan ($200/month)
  sponsorshipPlanStatus?: 'inactive' | 'pending_payment' | 'active';
  sponsorship_plan_status?: 'inactive' | 'pending_payment' | 'active';
  sponsorshipPlanFee?: number;
  sponsorship_plan_fee?: number;
  sponsorshipNextPaymentDate?: string | null;
  sponsorship_next_payment_date?: string | null;
  discountPercentage?: number;
  discount_percentage?: number;
  freeMonths?: number;
  free_months?: number;
  freeTrialEndsAt?: string | null;
  free_trial_ends_at?: string | null;
  agreementNotes?: string | null;
  agreement_notes?: string | null;
  requestedPlan?: 'free' | 'b2b' | string | null;
  requested_plan?: 'free' | 'b2b' | string | null;
  legalName?: string | null;
  legal_name?: string | null;
  rif?: string | null;
  regentName?: string | null;
  regent_name?: string | null;
  regentLicense?: string | null;
  regent_license?: string | null;
  contactName?: string | null;
  contact_name?: string | null;
  contactRole?: string | null;
  contact_role?: string | null;
  promotionalTagline?: string | null;
  promotional_tagline?: string | null;
  deliveryAvailable?: boolean;
  delivery_available?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  verifiedAt?: string;
  verified_at?: string;
};

export type PharmacyProduct = {
  id: string;
  pharmacyId: string;
  pharmacy_id?: string;
  name: string;
  genericName?: string | null;
  generic_name?: string | null;
  presentation?: string | null;
  category?: string | null;
  isAvailable: boolean;
  is_available?: boolean;
  stockQuantity?: number | null;
  stock_quantity?: number | null;
  isPromotion: boolean;
  is_promotion?: boolean;
  promoLabel?: string | null;
  promo_label?: string | null;
  referencePrice?: number | null;
  reference_price?: number | null;
  promoPrice?: number | null;
  promo_price?: number | null;
  imageUrl?: string | null;
  image_url?: string | null;
  description?: string | null;
  usageIndications?: string | null;
  usage_indications?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SponsorshipMessage = {
  id: string;
  sender?: 'doctor' | 'pharmacy';
  senderRole?: 'doctor' | 'pharmacy' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
};

export type DoctorPharmacySponsorship = {
  id: string;
  doctorId: string;
  doctor_id?: string;
  pharmacyId: string;
  pharmacy_id?: string;
  initiatedBy: 'doctor' | 'pharmacy';
  initiated_by?: 'doctor' | 'pharmacy';
  status: 'pending' | 'pending_doctor' | 'pending_pharmacy' | 'matched' | 'active' | 'paused' | 'rejected';
  scopeType: 'city' | 'national' | 'branch';
  scope_type?: 'city' | 'national' | 'branch';
  targetCity?: string | null;
  target_city?: string | null;
  chainName?: string | null;
  chain_name?: string | null;
  agreementType?: 'monthly_fixed' | 'per_recipe_percentage' | 'fixed_monthly' | 'percentage' | 'per_recipe' | 'patient_discount' | 'custom' | null;
  agreement_type?: string | null;
  agreementValue?: string | null;
  agreement_value?: string | null;
  agreementNotes?: string | null;
  agreement_notes?: string | null;
  // Módulo 4: Cupón negociable entre médico y farmacia
  hasPatientCoupon?: boolean;
  has_patient_coupon?: boolean;
  couponCode?: string | null;
  coupon_code?: string | null;
  couponDiscountPercent?: number | null;
  coupon_discount_percent?: number | null;
  couponDescription?: string | null;
  coupon_description?: string | null;
  // Módulo 2: Métricas ROI en tiempo real
  impressionsCount?: number;
  impressions_count?: number;
  cardClicksCount?: number;
  card_clicks_count?: number;
  whatsappClicksCount?: number;
  whatsapp_clicks_count?: number;
  ordersCount?: number;
  orders_count?: number;
  dispensedRecipesCount?: number;
  doctorApprovedActivation?: boolean;
  doctor_approved_activation?: boolean;
  pharmacyApprovedActivation?: boolean;
  pharmacy_approved_activation?: boolean;
  messages: SponsorshipMessage[];
  unreadByDoctor?: number;
  unread_by_doctor?: number;
  unreadByPharmacy?: number;
  unread_by_pharmacy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Populated relations
  doctor?: Partial<Doctor>;
  pharmacy?: Partial<Pharmacy>;
};

export type PharmacyRecipeOrder = {
  id: string;
  recipeId?: string | null;
  recipeCode?: string | null;
  pharmacyId: string;
  doctorId?: string | null;
  patientId?: string | null;
  patientName: string;
  patientCedula?: string | null;
  patientPhone?: string | null;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress?: string | null;
  prescriptionText?: string | null;
  matchedItems?: any[];
  couponCode?: string | null;
  discountPercentage?: number;
  status: 'pending' | 'pending_quote' | 'quoted' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  quotedTotalUsd?: number | null;
  quotedTotalBs?: number | null;
  pharmacyNotes?: string | null;
  patientNotes?: string | null;
  isChronicTreatment?: boolean;
  refillIntervalDays?: number;
  nextRefillDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  doctor?: Partial<Doctor>;
  pharmacy?: Partial<Pharmacy>;
};

export type PharmacyPayment = {
  id: string;
  pharmacyId: string;
  pharmacyName?: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Paid' | 'Rejected';
  paymentMethod?: string;
  transactionId?: string;
  paymentProofUrl?: string | null;
  notes?: string | null;
  createdAt?: string;
};

export type Seller = {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  country?: string;
  state?: string;
  city?: string;
  sector?: string;
  address?: string;
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
  birthDate?: string | null; // YYYY-MM-DD
  gender: 'masculino' | 'femenino' | null;
  phone: string | null;
  cedula: string | null;
  documentType?: DocumentType;
  country?: string | null;
  state?: string | null;
  city: string | null;
  sector?: string | null;
  address?: string | null;
  favoriteDoctorIds?: string[];
  favoritedDoctorIds?: string[];
  favoriteClinicIds?: string[];
  profileImage: string | null;
  profileCompleted?: boolean;
  // Campos adicionales opcionales
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  religion?: string | null;
  maritalStatus?: 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'union_libre' | null;
  education?: string | null;
  occupation?: string | null;
  weight?: string | null;
  height?: string | null;
  whatsapp?: string | null;
};

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  doctorName?: string; // Optional because now it can be a service appointment
  doctorId?: string; // Optional for service appointments
  clinicId?: string; // Clinic ID when booked with a clinic doctor or clinic service
  specialty?: string; // Doctor or service specialty
  clinicServiceId?: string; // New: For service appointments (e.g., Lab)
  laboratoryId?: string; // For laboratory appointments
  laboratoryServiceId?: string; // For laboratory study/test appointments
  serviceName?: string; // New: To verify which service was booked
  date: string;
  time: string;
  reason?: string | null;
  services: Service[]; // This remains for legacy Doctor appointments (medical services)
  totalPrice: number;
  consultationFee: number;
  paymentMethod: 'efectivo' | 'transferencia' | 'pagomovil' | 'zelle' | 'mercadopago' | string;
  paymentStatus: 'Pendiente' | 'Pagado' | 'Reembolsado';
  paymentProof: string | null;
  attendance: 'Atendido' | 'No Asistió' | 'Pendiente';
  patientConfirmationStatus: 'Pendiente' | 'Confirmada' | 'Cancelada';
  noShowResolution?: 'rescheduled' | 'refunded' | 'retained';
  refundReason?: string;
  refundDate?: string;
  refundAmount?: number;
  rescheduledFromDate?: string;
  noShowNote?: string;
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
  // Sistema Multi-Moneda y Auditoría Histórica Inmutable
  currency?: 'USD' | 'VES' | string; // Moneda de referencia / base
  paymentCurrency?: 'USD' | 'VES' | string; // Moneda seleccionada para el pago (USD o Bs.)
  exchangeRate?: number; // Tasa de cambio congelada al momento del pago/reserva
  amountInUSD?: number; // Monto histórico congelado en USD
  amountInLocalCurrency?: number; // Monto histórico congelado en moneda local (Bs.)
  paidAt?: string; // Fecha y hora en la que se registró el pago
  paymentAccountDetails?: {
    bank?: string;
    accountNumber?: string;
    accountHolder?: string;
    idNumber?: string;
    phone?: string;
    currency?: string;
    accountType?: string;
  };
};

export type IncludedDoctorCommission = {
  id: string;
  name: string;
  commissionAmount: number;
  doctorPaymentId?: string;
  paymentDate?: string;
  paymentAmount?: number;
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
  amount: number; // Monto en USD
  amountInLocalCurrency?: number; // Monto en Bs. congelado al pagar
  exchangeRate?: number; // Tasa BCV aplicada y congelada
  paymentCurrency?: 'USD' | 'VES'; // Moneda original del pago
  paidAt?: string; // Timestamp de pago/confirmación
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
  userRole: 'doctor' | 'seller' | 'clinic';
  subject: string;
  description: string;
  status: 'abierto' | 'cerrado';
  date: string;
  createdAt?: string; // ISO timestamp con hora completa
  messages?: ChatMessage[];
  readByAdmin?: boolean;
  readBySeller?: boolean;
  readByDoctor?: boolean;
  readByClinic?: boolean;
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
  type: 'new_appointment' | 'payment_verification' | 'support_reply' | 'subscription_update' | 'new_message' | 'patient_confirmed' | 'patient_cancelled' | 'campaign_invitation';
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

export type CountryConfig = {
  id?: string;
  code: string;
  name: string;
  flag: string;
  phoneCode: string;
  currency: string;
  isActive?: boolean;
  exchangeRate?: number; // Tasa de cambio frente al USD (ej: 65.50 para VES)
  currencySymbol?: string; // Símbolo de la moneda (ej: "Bs.")
  lastRateUpdate?: string; // Fecha y hora de actualización
  rateLabel?: string; // Nombre de la tasa (ej: "Tasa BCV", "Dólar Oficial / MEP", "TRM Oficial")
  doctorMonthlyFee?: number; // Mensualidad base del Médico en este país (ej: $25 USD)
  clinicMonthlyFee?: number; // Mensualidad Plan Clínica en este país (ej: $200 USD)
  pharmacyB2BMonthlyFee?: number; // Mensualidad Plan Alianza B2B Farmacia en este país (ej: $200 USD)
  laboratoryMonthlyFee?: number; // Mensualidad Plan Laboratorio Clínico en este país (ej: $50 USD)
  defaultSellerCommission?: number; // % Comisión Vendedores en este país (ej: 20%)
};

export type StateConfig = {
  id?: string;
  code?: string;
  name: string;
  country: string;
};

export type City = {
  name: string;
  subscriptionFee: number;
  country?: string;
  state?: string;
  lat?: number;
  lng?: number;
};

export type CommercialAlly = {
  id: string;
  name: string;
  logoUrl: string;
  category?: 'farmacia' | 'clinica' | 'laboratorio' | 'marca' | 'aliado';
  country?: string;
  city?: string;
  websiteUrl?: string;
  isActive?: boolean;
};

export type SpecialtyConfigItem = {
  name: string;
  hasMedicalRecord: boolean;
  hasPrescription: boolean;
};

export type ProfessionCategory = {
  id: string;
  name: string;
  defaultHasMedicalRecord: boolean;
  defaultHasPrescription: boolean;
  isWellness?: boolean;
  specialties: SpecialtyConfigItem[];
};

export type AppSettings = {
  professionsCatalog?: ProfessionCategory[];
  countries?: CountryConfig[];
  states?: StateConfig[];
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
  exchangeRates?: Record<string, number>;
  bcvRate?: number; // Tasa oficial BCV en Venezuela (Bs./USD)
  bcvLastUpdated?: string;
  commercialAllies?: CommercialAlly[];
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

// =====================================================
// JORNADAS DE SALUD (HEALTH CAMPAIGNS)
// =====================================================

export type HealthCampaignOrganizerRole = 'doctor' | 'clinic' | 'pharmacy' | 'laboratory' | 'admin';

export type HealthCampaignDoctor = {
  id: string;
  campaignId: string;
  doctorId: string;
  doctorName: string;
  doctorEmail?: string | null;
  doctorSpecialty?: string | null;
  doctorProfileImage?: string | null;
  status: 'pending' | 'accepted' | 'declined';
  readByDoctor?: boolean;
  invitedAt: string;
  respondedAt?: string | null;
};

export type HealthCampaignPaymentDetails = {
  currency?: 'USD' | 'VES' | 'ARS' | string;
  bank?: string;
  accountType?: string; // ej. 'Pago Móvil', 'Transferencia', 'Zelle', 'Efectivo', 'Alias/CBU'
  accountHolder?: string;
  idNumber?: string; // C.I. / RIF / CUIT
  accountNumber?: string;
  phone?: string;
  notes?: string;
};

export type HealthCampaignRegistration = {
  id: string;
  campaignId: string;
  patientId?: string | null;
  name: string;
  cedula: string;
  email?: string | null;
  phone?: string | null;
  age?: number | null;
  gender?: 'hombre' | 'mujer' | 'nino' | 'nina' | string;
  interestSpecialty?: string | null;
  notes?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  amountPaid?: number | null;
  ticketCode?: string | null;
  spotNumber?: number | null;
  status: 'registered' | 'attended';
  createdAt: string;
};

export type HealthCampaignAttendance = {
  id: string;
  campaignId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  patientId?: string | null;
  isRegisteredPatient: boolean;
  patientName: string;
  patientCedula: string;
  patientEmail?: string | null;
  patientPhone?: string | null;
  patientAge?: number | null;
  patientGender: 'hombre' | 'mujer' | string;
  demographicGroup: 'hombre' | 'mujer' | 'nino' | string;
  symptoms?: string | null;
  diagnosis?: string | null;
  evaluation?: string | null;
  treatmentPlan?: string | null;
  prescription?: string | null;
  requestedStudies?: string | null;
  hasPrescription: boolean;
  medicalRecordId?: string | null;
  amountPaid?: number;
  paymentStatus?: 'paid' | 'pending' | 'free' | string;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  emailSent?: boolean;
  attendedAt: string;
};

export type HealthCampaignStats = {
  totalAttended: number;
  totalPreRegistered: number;
  totalWithPrescription: number;
  totalRegisteredInSuma: number;
  totalGuests: number;
  totalRevenue?: number;
  demographics: {
    hombres: number;
    mujeres: number;
    ninos: number;
  };
  bySpecialty: {
    specialty: string;
    count: number;
    withPrescription: number;
  }[];
  byDoctor: {
    doctorId: string;
    doctorName: string;
    specialty: string;
    attendedCount: number;
    prescriptionCount: number;
  }[];
  topDoctor?: {
    doctorId: string;
    doctorName: string;
    specialty: string;
    attendedCount: number;
  } | null;
};

export type HealthCampaign = {
  id: string;
  title: string;
  description?: string | null;
  organizerId: string;
  organizerRole: HealthCampaignOrganizerRole;
  organizerName: string;
  organizerLogo?: string | null;
  campaignType: 'free' | 'paid';
  pricingMode?: 'per_event' | 'per_specialist';
  priceAmount?: number;
  specialtyPrices?: Record<string, number>;
  priceInfo?: string | null;
  paymentAccountSource?: 'organizer' | 'manual';
  paymentDetails?: HealthCampaignPaymentDetails | null;
  capacityMode?: 'unlimited' | 'limited';
  maxCapacity?: number | null;
  specialties: string[];
  startDate: string;
  endDate?: string | null;
  startTime: string;
  endTime: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  sector?: string | null;
  address?: string | null;
  coverImage?: string | null;
  galleryImages: string[];
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  doctors?: HealthCampaignDoctor[];
  registrations?: HealthCampaignRegistration[];
  attendances?: HealthCampaignAttendance[];
  stats?: HealthCampaignStats;
};

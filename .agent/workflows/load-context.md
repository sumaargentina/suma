---
description: Load project context and memory for SUMA medical platform
---

# SUMA - Project Context & Memory

## Project Overview
SUMA es una plataforma médica integral que conecta pacientes con médicos y clínicas.
- **Lanzamiento actual (2026):** Enfocado en **Venezuela** (Moneda USD/VES, Cédula MPPS, GMT-4 Caracas, Pago Móvil).
- **Expansión Internacional (2027):** Arquitectura **Multi-Instance** (Opción 1): Cada país operará con su propia instancia y base de datos independiente (ej. Argentina, Colombia) para garantizar cero cruce de historiales médicos y cumplimiento legal estricto.

## Recent Session Modifications

### 1. Financial Distribution Chart Fix
**File:** `src/components/doctor/dashboard/tabs/finances-tab.tsx`
**Lines:** 594-627
**Issue:** The expenses bar (red) was overflowing its container when expenses exceeded revenue.
**Solution:** Modified the chart to calculate both income and expense bar widths relative to the maximum value of either, ensuring proportional scaling and proper containment.

### 2. Doctor Dashboard - Patient Search in Chat
**File:** `src/components/doctor/dashboard/tabs/chat-tab.tsx`
**Changes:**
- Added `Search` icon import from lucide-react
- Added `Input` component import
- Added `searchTerm` state for filtering
- Implemented `filteredConversations` logic to filter by patient name
- Added search input field in CardHeader
- Handled "no results" state

### 3. Patient Family Module - DNI Validation & Gender Options
**File:** `src/components/patient/tabs/family-tab.tsx`
**Lines:** 583-607
**Changes:**
- DNI (cedula) input: Restricted to max 9 numeric digits only, stripping non-numeric characters
- Gender dropdown: Added "No especificar" option with value `no_especificar`
**Database Compatibility:** Verified `gender` column in `family_members` table is `VARCHAR(20)` - compatible with new option.

### 4. Patient Profile - Phone Number Update Fix
**Files Modified:**
- `src/app/profile/page.tsx` (lines 516-547)
- `src/app/api/appointments/doctor/route.ts` (complete rewrite)
- `src/lib/supabaseService.ts` (added function, later kept as fallback)

**Issue:** When a patient updated their phone number in their profile, doctors still saw the OLD phone number when clicking WhatsApp. This was because `patientPhone` was stored at appointment creation time and never updated.

**Solution:** Modified the API route `/api/appointments/doctor` to:
1. Fetch all appointments for the doctor
2. Extract unique patient IDs
3. Query `patients` table for current phone numbers
4. Merge updated phone numbers into the response

**Profile UI Improvements:**
- Enhanced country code selector with flags
- Widened trigger to 140px for better visibility
- Updated placeholder text and helper instructions

### 5. Key Database Tables Referenced
- `appointments`: Contains `patient_id`, `patient_phone` (stored at creation), `doctor_id`
- `patients`: Contains `id`, `phone`, `name`, `email`, `cedula`, etc.
- `family_members`: Contains `id`, `patient_id`, `cedula`, `gender` (VARCHAR(20))
- `doctors`: Contains `id`, `name`, `whatsapp`, etc.

### 6. Important API Routes
- `/api/appointments/doctor?id={doctorId}` - Gets doctor appointments with updated patient phones
- `/api/appointments/create` - Creates new appointments
- `/api/validate-unique` - Validates unique fields (cedula, email)

### 7. Key Components Structure
```
src/
├── app/
│   ├── dashboard/page.tsx          # Patient dashboard
│   ├── doctor/dashboard/page.tsx   # Doctor dashboard wrapper
│   ├── profile/page.tsx            # Patient profile editing
│   └── api/appointments/doctor/route.ts  # Doctor appointments API
├── components/
│   ├── doctor/
│   │   ├── dashboard-client.tsx    # Main doctor dashboard logic
│   │   ├── appointment-card.tsx    # Individual appointment card (has WhatsApp button)
│   │   └── dashboard/tabs/         # Dashboard tab components
│   └── patient/
│       └── tabs/family-tab.tsx     # Family members management
└── lib/
    ├── supabaseService.ts          # Database service functions
    ├── types.ts                    # TypeScript types
    └── auth.tsx                    # Authentication context
```

### 8. Country Codes Configuration
Located in `src/lib/types.ts` as `COUNTRY_CODES` array with structure:
```typescript
{ code: '+54', country: 'Argentina', flag: '🇦🇷' }
```

### 9. Known Considerations
- Phone numbers are stored with country code prefix (e.g., `+541123456789`)
- Leading zeros in phone numbers are automatically stripped
- The `getDoctorAppointmentsWithPatientData` function exists in supabaseService.ts but is not currently used (kept as fallback)
- RLS (Row Level Security) is active on Supabase tables

### 10. Appointment Confirmation Email Enhancement (2026-02-04)
**Files Modified:**
- `src/app/api/send-appointment-email/route.ts` (complete rewrite)
- `src/lib/appointments.tsx` (email payload update)

**Changes:**
- Added complete price breakdown: Consulta Base + Servicios Adicionales + Descuentos = Total
- Added consultation type indicator (Online/Presencial)
- Added location/address information
- Added family member name when booking for dependents
- Added payment method display
- Visual improvements with emojis and colored sections
- Subject line now includes date

**Email Payload Fields:**
```typescript
{
  email, name, date, time, doctor, specialty,
  consultationFee, services, totalPrice,
  discountAmount, appliedCoupon,
  consultationType, address, familyMemberName,
  paymentMethod
}
```

### 11. Patient Dashboard Price Breakdown (2026-02-04)
**File:** `src/app/dashboard/page.tsx`
**Lines:** 141-170

**Changes:**
- AppointmentCard now shows detailed price breakdown
- Displays: Consulta fee, Services total (if any), Discount (if any), Final total
- Added emoji icons for payment methods

### 12. Phone Number Fixes (2026-02-04 - 15:34)
**Files Modified:**
- `src/components/welcome-modal.tsx` (line 188)
- `src/app/profile/page.tsx` (lines 96-127)
- `src/lib/types.ts` (lines 16-48)

**Issues Fixed:**
1. **Inconsistent phone format:** Welcome modal was saving phone with space (`+54 123456789`) but profile page expected no space (`+54123456789`).
2. **Phone parsing not working:** Regex couldn't parse phones saved with space.
3. **Limited country codes:** Only 12 countries were available.

**Solutions:**
1. Changed welcome modal to save phone without space: `${countryCode}${phone}`
2. Improved profile page parsing to handle both formats (with/without space) and fallback to known country codes.
3. Expanded COUNTRY_CODES to include 30+ countries (all South America, Central America, Caribbean, North America, Europe, Asia).

**Phone Format Standard:**
- Storage: `+54123456789` (no space)
- Display: Parsed and shown with separate selector

---
*Last updated: 2026-02-04 - 15:34*

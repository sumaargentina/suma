import { NextRequest, NextResponse } from 'next/server';
import {
    isEmailUniqueAcrossAllTables,
    isDoctorCedulaUnique,
    isDoctorMedicalLicenseUnique,
    isPatientCedulaUnique,
    isReferralCodeUnique,
    isAppointmentSlotAvailable,
} from '@/lib/unique-validation';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, value, excludeId, extra } = body;

        if (!type || value === undefined) {
            return NextResponse.json(
                { error: 'type and value are required' },
                { status: 400 }
            );
        }

        let result;

        switch (type) {
            case 'email':
                result = await isEmailUniqueAcrossAllTables(value);
                break;

            case 'doctor_cedula':
                result = await isDoctorCedulaUnique(value, excludeId);
                break;

            case 'doctor_medical_license':
                result = await isDoctorMedicalLicenseUnique(value, excludeId);
                break;

            case 'patient_cedula':
                result = await isPatientCedulaUnique(value, excludeId);
                break;

            case 'referral_code':
                result = await isReferralCodeUnique(value, excludeId);
                break;

            case 'appointment_slot':
                if (!extra?.doctorId || !extra?.date || !extra?.time) {
                    return NextResponse.json(
                        { error: 'doctorId, date, and time are required in extra for appointment_slot' },
                        { status: 400 }
                    );
                }
                result = await isAppointmentSlotAvailable(extra.doctorId, extra.date, extra.time, excludeId);
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown validation type: ${type}` },
                    { status: 400 }
                );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in validate-unique API:', error);
        return NextResponse.json(
            { error: 'Internal server error', isUnique: false, field: '', message: 'Error al validar' },
            { status: 500 }
        );
    }
}

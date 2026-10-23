import { NextRequest, NextResponse } from 'next/server';
import { sendRoleWelcomeEmail, sendDoctorVerifiedEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, role = 'patient', type = 'welcome', extraData = {}, specialty, medicalLicense } = body;

    if (!email || !name) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    if (type === 'doctor_verified') {
      const result = await sendDoctorVerifiedEmail({
        email,
        name,
        specialty: specialty || extraData?.specialty,
        medicalLicense: medicalLicense || extraData?.medicalLicense,
      });

      if (!result.success) {
        return NextResponse.json({ error: 'Error enviando correo de verificación' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    const result = await sendRoleWelcomeEmail({
      email,
      name,
      role,
      extraData,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Error enviando correo de bienvenida' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error enviando correo en /api/send-welcome-email:', error);
    // No fallar el registro si el correo falla, pero devolver error 500 para el log
    return NextResponse.json({ error: 'Error enviando correo' }, { status: 500 });
  }
}

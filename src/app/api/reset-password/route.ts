import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword } from '@/lib/password-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { email, token, password } = await req.json();
    if (!email || !token || !password) {
      return NextResponse.json({ success: false, error: 'Datos incompletos' }, { status: 400 });
    }

    // Validar token en Supabase
    const { data: resetData, error: fetchError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('token', token)
      .single();

    if (fetchError || !resetData) {
      return NextResponse.json({ success: false, error: 'Token inválido o no encontrado' }, { status: 400 });
    }

    const expiresAt = new Date(resetData.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json({ success: false, error: 'Token expirado' }, { status: 400 });
    }

    // Encriptar nueva contraseña
    const hashedPassword = await hashPassword(password);

    // Actualizar contraseña en la tabla correspondiente (patients, doctors, sellers)
    // Primero buscamos en qué tabla está el usuario
    let userTable = '';
    let userId = '';

    // Buscar en patients
    const { data: patient } = await supabase.from('patients').select('id').eq('email', email).single();
    if (patient) {
      userTable = 'patients';
      userId = patient.id;
    } else {
      // Buscar en doctors
      const { data: doctor } = await supabase.from('doctors').select('id').eq('email', email).single();
      if (doctor) {
        userTable = 'doctors';
        userId = doctor.id;
      } else {
        // Buscar en sellers
        const { data: seller } = await supabase.from('sellers').select('id').eq('email', email).single();
        if (seller) {
          userTable = 'sellers';
          userId = seller.id;
        }
      }
    }

    if (!userTable) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Actualizar contraseña
    const { error: updateError } = await supabase
      .from(userTable)
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (updateError) {
      throw new Error('Error al actualizar la contraseña');
    }

    // Eliminar token usado
    await supabase.from('password_resets').delete().eq('email', email);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    let message = 'Error al restablecer la contraseña';
    if (error instanceof Error) message = error.message;
    console.error('Error reset password:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
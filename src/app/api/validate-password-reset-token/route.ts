import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();
    if (!email || !token) {
      return NextResponse.json({ valid: false, error: 'Datos incompletos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false, error: 'Token inválido' }, { status: 400 });
    }

    if (data.token !== token) {
      return NextResponse.json({ valid: false, error: 'Token incorrecto' }, { status: 400 });
    }

    if (Date.now() > new Date(data.expires_at).getTime()) {
      return NextResponse.json({ valid: false, error: 'Token expirado' }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false, error: 'Error validando token' }, { status: 500 });
  }
}
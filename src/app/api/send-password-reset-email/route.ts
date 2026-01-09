import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    // Generar token aleatorio y expiración (1 hora)
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Guardar token en Supabase (tabla password_resets)
    // Primero intentamos borrar tokens anteriores para este email
    await supabase.from('password_resets').delete().eq('email', email);

    // Insertar nuevo token
    const { error: dbError } = await supabase.from('password_resets').insert({
      email,
      token,
      expires_at: expiresAt,
    });

    if (dbError) {
      console.error('Error guardando token en Supabase:', dbError);
      // Si la tabla no existe, loguear pero no fallar catastróficamente (para desarrollo)
      if (dbError.code === '42P01') { // undefined_table
        console.warn('Tabla password_resets no existe. Crea la tabla en Supabase.');
      } else {
        throw new Error('Error de base de datos');
      }
    }

    // URL de recuperación
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Enviar correo
    await transporter.sendMail({
      from: `Recuperación Suma <${GMAIL_USER}>`,
      to: email,
      subject: 'Recupera tu contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background: #0ea5e9; padding: 24px 0; text-align: center;">
            <span style="font-size: 2.2rem; color: #fff; font-weight: bold; letter-spacing: 2px;">SUMA</span>
          </div>
          <div style="padding: 32px 24px 24px 24px;">
            <h2 style="color: #0ea5e9; margin-bottom: 12px;">Solicitud de restablecimiento de contraseña</h2>
            <p style="color: #222; margin-bottom: 16px;">Hola,</p>
            <p style="color: #222; margin-bottom: 16px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en <b>Suma</b>.</p>
            <p style="color: #222; margin-bottom: 24px;">Haz clic en el siguiente botón para crear una nueva contraseña. Si no solicitaste este cambio, puedes ignorar este correo.</p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${resetUrl}" style="display: inline-block; background: #0ea5e9; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Restablecer contraseña</a>
            </div>
            <p style="color: #666; font-size: 13px;">Este enlace expirará en 1 hora por seguridad.</p>
            <p style="color: #bbb; font-size: 12px; margin-top: 32px;">Si tienes problemas, copia y pega este enlace en tu navegador:<br /><span style="color: #0ea5e9; word-break: break-all;">${resetUrl}</span></p>
          </div>
          <div style="background: #f1f5f9; color: #888; text-align: center; font-size: 12px; padding: 16px;">&copy; ${new Date().getFullYear()} Suma. Todos los derechos reservados.</div>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error enviando correo de recuperación:', error);
    return NextResponse.json({ error: 'Error enviando correo' }, { status: 500 });
  }
}
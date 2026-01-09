import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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
    const { email, name } = await req.json();
    if (!email || !name) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    await transporter.sendMail({
      from: `Bienvenida Suma <${GMAIL_USER}>`,
      to: email,
      subject: '¡Bienvenido a Suma!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background: #0ea5e9; padding: 24px 0; text-align: center;">
            <span style="font-size: 2.2rem; color: #fff; font-weight: bold; letter-spacing: 2px;">SUMA</span>
          </div>
          <div style="padding: 32px 24px 24px 24px;">
            <h2 style="color: #0ea5e9; margin-bottom: 12px;">¡Bienvenido a Suma, ${name}!</h2>
            <p style="color: #222; margin-bottom: 16px;">Nos alegra mucho tenerte como parte de nuestra comunidad.</p>
            <p style="color: #222; margin-bottom: 16px;">A partir de ahora podrás disfrutar de todos los beneficios y servicios que <b>Suma</b> tiene para ti: agendar citas, consultar médicos, recibir recordatorios y mucho más.</p>
            <p style="color: #222; margin-bottom: 24px;">Nuestro equipo está aquí para acompañarte en tu bienestar y salud. ¡Esperamos que tu experiencia sea excelente!</p>
            <div style="text-align: center; margin-bottom: 32px;">
              <span style="display: inline-block; background: #0ea5e9; color: #fff; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 16px;">¡Bienvenido a la familia Suma!</span>
            </div>
            <p style="color: #666; font-size: 13px;">Si tienes alguna duda o necesitas ayuda, puedes responder a este correo o contactarnos desde la app.</p>
          </div>
          <div style="background: #f1f5f9; color: #888; text-align: center; font-size: 12px; padding: 16px;">&copy; ${new Date().getFullYear()} Suma. Todos los derechos reservados.</div>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error enviando correo de bienvenida:', error);
    // No fallar el registro si el correo falla, pero devolver error 500 para el log
    return NextResponse.json({ error: 'Error enviando correo' }, { status: 500 });
  }
}
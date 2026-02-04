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

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log('📧 EMAIL API: Recibida solicitud de envío de correo');
  console.log('📧 GMAIL_USER:', GMAIL_USER ? `${GMAIL_USER.substring(0, 10)}...` : 'NO CONFIGURADO');
  console.log('📧 GMAIL_PASS:', GMAIL_PASS ? 'Configurado (oculto)' : 'NO CONFIGURADO');
  console.log('📧 Destinatario:', body.email);
  console.log('📧 Paciente:', body.name);

  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error('❌ Error: Variables de entorno GMAIL_USER o GMAIL_PASS no configuradas');
    return NextResponse.json({ error: 'Configuración de email incompleta' }, { status: 500 });
  }

  try {
    const {
      email,
      name,
      date,
      time,
      doctor,
      specialty,
      services,
      consultationFee,
      totalPrice,
      discountAmount,
      appliedCoupon,
      consultationType,
      address,
      familyMemberName,
      paymentMethod
    } = body;

    if (!email || !name || !date || !time || !doctor) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Calcular subtotal de servicios
    type Service = { name: string; price?: number };
    const servicesTotal = Array.isArray(services)
      ? services.reduce((sum: number, s: Service) => sum + (s.price || 0), 0)
      : 0;

    // Subtotal antes de descuento
    const subtotal = (consultationFee || 0) + servicesTotal;
    const discount = discountAmount || 0;

    // Formatear servicios adicionales con precios
    let servicesHtml = '';
    if (Array.isArray(services) && services.length > 0) {
      servicesHtml = (services as Service[]).map((s: Service) =>
        `<tr>
          <td style="padding: 6px 0; color: #555;">${s.name}</td>
          <td style="padding: 6px 0; text-align: right; font-family: monospace;">$${Number(s.price || 0).toFixed(2)}</td>
        </tr>`
      ).join('');
    }

    // Determinar tipo de consulta
    const isOnline = consultationType === 'online';
    const consultationTypeText = isOnline ? '💻 Consulta Online' : '🏥 Consulta Presencial';
    const locationText = isOnline
      ? 'Recibirás el enlace de la videollamada antes de tu cita'
      : (address || 'Dirección del consultorio');

    // Info de familiar si aplica
    const familyInfoHtml = familyMemberName
      ? `<tr><td style="padding: 6px 0;"><b>Paciente:</b></td><td style="padding: 6px 0;">👨‍👩‍👧 ${familyMemberName} (Familiar)</td></tr>`
      : '';

    // Método de pago
    const paymentMethodText = paymentMethod === 'transferencia'
      ? '💳 Transferencia Bancaria'
      : '💵 Pago en Efectivo';

    await transporter.sendMail({
      from: `Citas Suma <${GMAIL_USER}>`,
      to: email,
      subject: `✅ Confirmación de tu cita en Suma - ${formatDate(date)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e0e7ef; border-radius: 12px; overflow: hidden; background: #f8fafc;">
          <div style="background: linear-gradient(90deg, #0ea5e9 60%, #38bdf8 100%); padding: 28px 0; text-align: center;">
            <span style="font-size: 2.5rem; color: #fff; font-weight: bold; letter-spacing: 2px;">SUMA</span>
          </div>
          <div style="padding: 36px 28px 28px 28px; background: #fff;">
            <h2 style="color: #0ea5e9; margin-bottom: 18px; font-size: 1.5rem;">¡Tu cita ha sido agendada exitosamente!</h2>
            <p style="color: #222; margin-bottom: 18px; font-size: 1.1rem;">Hola <b>${name}</b>,</p>
            <p style="color: #222; margin-bottom: 22px;">Aquí tienes todos los detalles de tu cita:</p>
            
            <!-- Tipo de consulta destacado -->
            <div style="background: ${isOnline ? '#eef2ff' : '#f0fdf4'}; border: 1px solid ${isOnline ? '#c7d2fe' : '#bbf7d0'}; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; text-align: center;">
              <span style="font-size: 1.1rem; font-weight: bold; color: ${isOnline ? '#4f46e5' : '#16a34a'};">${consultationTypeText}</span>
            </div>
            
            <!-- Detalles de la cita -->
            <div style="background: #f1f5f9; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px;">
              <table style="width: 100%; font-size: 1rem; color: #222;">
                <tr><td style="padding: 6px 0;"><b>Médico:</b></td><td style="padding: 6px 0;">Dr(a). ${doctor}</td></tr>
                <tr><td style="padding: 6px 0;"><b>Especialidad:</b></td><td style="padding: 6px 0;">${specialty || '-'}</td></tr>
                ${familyInfoHtml}
                <tr><td style="padding: 6px 0;"><b>Fecha:</b></td><td style="padding: 6px 0;">📅 ${formatDate(date)}</td></tr>
                <tr><td style="padding: 6px 0;"><b>Hora:</b></td><td style="padding: 6px 0;">🕐 ${time}</td></tr>
                <tr><td style="padding: 6px 0;"><b>Ubicación:</b></td><td style="padding: 6px 0;">📍 ${locationText}</td></tr>
              </table>
            </div>
            
            <!-- Desglose de Precios -->
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px 0; color: #b45309; font-size: 1rem;">💰 Detalle del Pago</h3>
              <table style="width: 100%; font-size: 0.95rem; color: #222;">
                <tr>
                  <td style="padding: 6px 0;"><b>Consulta Base:</b></td>
                  <td style="padding: 6px 0; text-align: right; font-family: monospace;">$${Number(consultationFee || 0).toFixed(2)}</td>
                </tr>
                ${servicesHtml ? `
                  <tr><td colspan="2" style="padding: 8px 0 4px 0; color: #666; font-size: 0.85rem;"><b>Servicios Adicionales:</b></td></tr>
                  ${servicesHtml}
                ` : ''}
                ${discount > 0 ? `
                  <tr style="border-top: 1px dashed #ccc;">
                    <td style="padding: 8px 0 6px 0;"><b>Subtotal:</b></td>
                    <td style="padding: 8px 0 6px 0; text-align: right; font-family: monospace;">$${subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #16a34a;"><b>Descuento${appliedCoupon ? ` (${appliedCoupon})` : ''}:</b></td>
                    <td style="padding: 6px 0; text-align: right; font-family: monospace; color: #16a34a;">-$${discount.toFixed(2)}</td>
                  </tr>
                ` : ''}
                <tr style="border-top: 2px solid #f59e0b;">
                  <td style="padding: 10px 0 6px 0; font-size: 1.1rem;"><b>TOTAL A PAGAR:</b></td>
                  <td style="padding: 10px 0 6px 0; text-align: right; font-family: monospace; font-size: 1.2rem; font-weight: bold; color: #b45309;">$${Number(totalPrice || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 6px 0; color: #666; font-size: 0.85rem;">Método: ${paymentMethodText}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #0ea5e9; font-size: 1.1rem; margin-bottom: 18px; text-align: center;"><b>¡Te esperamos con alegría!</b></p>
            <div style="text-align: center; margin-bottom: 28px;">
              <span style="display: inline-block; background: #0ea5e9; color: #fff; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 17px; letter-spacing: 1px;">⏰ Recuerda llegar 10 minutos antes</span>
            </div>
            <p style="color: #222; font-size: 1rem; margin-bottom: 18px; text-align: center;">Cada vez son más los venezolanos que se <b>SUMAN</b> a una mejor salud.<br>¡Gracias por ser parte de nuestra comunidad!</p>
            <p style="color: #666; font-size: 13px; text-align: center;">Si tienes alguna duda o necesitas reprogramar, puedes responder a este correo o contactarnos desde la app.</p>
          </div>
          <div style="background: #f1f5f9; color: #888; text-align: center; font-size: 12px; padding: 16px;">&copy; ${new Date().getFullYear()} Suma. Todos los derechos reservados.</div>
        </div>
      `
    });

    console.log('✅ EMAIL API: Correo enviado exitosamente a', body.email);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    let message = 'Error enviando correo';
    if (error instanceof Error) message = error.message;
    console.error('❌ EMAIL API: Error enviando correo de cita:', message);
    console.error('❌ Error completo:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

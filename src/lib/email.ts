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

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    try {
        await transporter.sendMail({
            from: `Suma Salud <${GMAIL_USER}>`,
            to,
            subject,
            html,
        });
        return { success: true };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
}

export async function sendWalkInWelcomeEmail(email: string, name: string, password: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
      <div style="background: #0ea5e9; padding: 24px 0; text-align: center;">
        <span style="font-size: 2.2rem; color: #fff; font-weight: bold; letter-spacing: 2px;">SUMA</span>
      </div>
      <div style="padding: 32px 24px 24px 24px;">
        <h2 style="color: #0ea5e9; margin-bottom: 12px;">¡Bienvenido a Suma, ${name}!</h2>
        <p style="color: #222; margin-bottom: 16px;">Tu cuenta ha sido creada exitosamente durante tu visita.</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #0369a1;">Tus credenciales de acceso:</p>
          <p style="margin: 0 0 4px 0;">Email: <strong>${email}</strong></p>
          <p style="margin: 0;">Contraseña temporal: <strong>${password}</strong></p>
        </div>

        <p style="color: #222; margin-bottom: 16px;"><strong>Importante:</strong> Por tu seguridad, te recomendamos cambiar esta contraseña la primera vez que inicies sesión.</p>
        
        <p style="color: #222; margin-bottom: 16px;">Con tu cuenta de Suma podrás:</p>
        <ul style="color: #444; margin-bottom: 24px; padding-left: 20px;">
          <li style="margin-bottom: 8px;">Agendar nuevas citas para cualquier especialidad.</li>
          <li style="margin-bottom: 8px;">Ver tu historial médico y recetas.</li>
          <li style="margin-bottom: 8px;">Gestionar tus pagos y seguros.</li>
        </ul>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${appUrl}/login" style="display: inline-block; background: #0ea5e9; color: #fff; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; text-decoration: none;">Iniciar Sesión</a>
        </div>
        
        <p style="color: #666; font-size: 13px;">Si tienes alguna duda, estamos aquí para ayudarte.</p>
      </div>
      <div style="background: #f1f5f9; color: #888; text-align: center; font-size: 12px; padding: 16px;">&copy; ${new Date().getFullYear()} Suma. Todos los derechos reservados.</div>
    </div>
  `;

    return sendEmail({
        to: email,
        subject: 'Bienvenido a Suma - Tus credenciales de acceso',
        html,
    });
}

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

export type WelcomeUserRole =
    | 'patient'
    | 'doctor'
    | 'clinic'
    | 'pharmacy'
    | 'laboratory'
    | 'seller'
    | 'secretary';

export interface WelcomeEmailExtraData {
    specialty?: string;
    medicalLicense?: string;
    verificationStatus?: string;
    tempPassword?: string;
    clinicName?: string;
    laboratoryName?: string;
}

export async function sendRoleWelcomeEmail({
    email,
    name,
    role = 'patient',
    extraData = {},
}: {
    email: string;
    name: string;
    role?: WelcomeUserRole | string;
    extraData?: WelcomeEmailExtraData;
}) {
    if (!email || !name) {
        return { success: false, error: 'Missing email or name' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const year = new Date().getFullYear();

    let subject = '¡Bienvenido a Suma!';
    let headerSubtitle = 'Plataforma Integral de Salud';
    let bodyContent = '';
    let ctaUrl = `${appUrl}/login`;
    let ctaLabel = 'Ingresar a mi cuenta';

    const credentialsBlock = extraData.tempPassword
        ? `
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin-bottom: 20px; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #0369a1;">Tus credenciales de acceso:</p>
          <p style="margin: 0 0 4px 0; color: #334155;">Email: <strong>${email}</strong></p>
          <p style="margin: 0; color: #334155;">Contraseña temporal: <strong>${extraData.tempPassword}</strong></p>
        </div>
        `
        : '';

    switch (role) {
        case 'doctor': {
            subject = '¡Bienvenido a Suma, Dr(a).! - Cuenta en proceso de verificación';
            headerSubtitle = 'Portal Médico Profesional';
            ctaUrl = `${appUrl}/doctor/dashboard`;
            ctaLabel = 'Ir a mi Portal Médico';
            bodyContent = `
                <h2 style="color: #0ea5e9; margin-bottom: 12px;">¡Bienvenido(a) a Suma, Dr(a). ${name}!</h2>
                <p style="color: #222; margin-bottom: 16px;">Gracias por registrarte como profesional médico en nuestra red de salud.</p>
                
                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px; border-radius: 0 6px 6px 0;">
                  <p style="margin: 0 0 6px 0; font-weight: bold; color: #b45309; font-size: 15px;">⏳ Estatus de tu cuenta: Pendiente de Verificación</p>
                  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">
                    Nuestro equipo administrativo se encuentra revisando tu perfil y credenciales profesionales${extraData.medicalLicense ? ` (Matrícula: <strong>${extraData.medicalLicense}</strong>)` : ''}. 
                    <strong>Te enviaremos un correo electrónico de confirmación apenas tu cuenta sea verificada.</strong>
                  </p>
                </div>

                ${credentialsBlock}

                <p style="color: #222; margin-bottom: 12px;">Mientras verificamos tu cuenta, ya puedes ingresar a tu portal para:</p>
                <ul style="color: #444; margin-bottom: 24px; padding-left: 20px; line-height: 1.6;">
                  <li>Completar tu perfil profesional, foto y datos de contacto.</li>
                  <li>Configurar tus consultorios, horarios de atención y servicios.</li>
                  <li>Explorar las herramientas de gestión médica de Suma.</li>
                </ul>
            `;
            break;
        }
        case 'clinic': {
            subject = '¡Bienvenida tu Clínica a Suma!';
            headerSubtitle = 'Portal de Clínicas y Centros de Salud';
            ctaUrl = `${appUrl}/clinic/dashboard`;
            ctaLabel = 'Ir al Portal de Clínica';
            bodyContent = `
                <h2 style="color: #0ea5e9; margin-bottom: 12px;">¡Bienvenido a Suma, ${name}!</h2>
                <p style="color: #222; margin-bottom: 16px;">El registro de tu centro de salud se ha completado exitosamente en nuestra plataforma.</p>
                ${credentialsBlock}
                <p style="color: #222; margin-bottom: 12px;">Desde tu panel de clínica podrás:</p>
                <ul style="color: #444; margin-bottom: 24px; padding-left: 20px; line-height: 1.6;">
                  <li>Gestionar tus sedes, especialidades y servicios médicos.</li>
                  <li>Afiliar médicos y administrar el equipo de secretaría.</li>
                  <li>Llevar el control de turnos, pacientes e inventario.</li>
                </ul>
            `;
            break;
        }
        case 'pharmacy': {
            subject = '¡Bienvenida tu Farmacia a Suma!';
            headerSubtitle = 'Red de Farmacias Aliadas';
            ctaUrl = `${appUrl}/login`;
            ctaLabel = 'Acceder al Panel de Farmacia';
            bodyContent = `
                <h2 style="color: #0ea5e9; margin-bottom: 12px;">¡Bienvenido a Suma, ${name}!</h2>
                <p style="color: #222; margin-bottom: 16px;">Tu farmacia ha sido registrada exitosamente dentro del ecosistema de salud Suma.</p>
                ${credentialsBlock}
                <p style="color: #222; margin-bottom: 16px;">A partir de ahora podrás gestionar tu catálogo, pedidos y conectar con pacientes y profesionales de la red.</p>
            `;
            break;
        }
        case 'laboratory': {
            subject = '¡Bienvenido tu Laboratorio a Suma!';
            headerSubtitle = 'Red de Laboratorios Clínicos';
            ctaUrl = `${appUrl}/login`;
            ctaLabel = 'Acceder al Panel de Laboratorio';
            bodyContent = `
                <h2 style="color: #0ea5e9; margin-bottom: 12px;">¡Bienvenido a Suma, ${name}!</h2>
                <p style="color: #222; margin-bottom: 16px;">Tu laboratorio ha sido registrado exitosamente en nuestra plataforma.</p>
                ${credentialsBlock}
                <p style="color: #222; margin-bottom: 16px;">Ya puedes ingresar para gestionar tus estudios, órdenes médicas y atención a pacientes.</p>
            `;
            break;
        }
        case 'seller': {
            subject = '¡Bienvenido al Equipo Comercial de Suma!';
            headerSubtitle = 'Portal de Vendedores y Asesores';
            ctaUrl = `${appUrl}/seller`;
            ctaLabel = 'Ir al Panel de Vendedor';
            bodyContent = `
                <h2 style="color: #0ea5e9; margin-bottom: 12px;">¡Bienvenido(a) al equipo Suma, ${name}!</h2>
                <p style="color: #222; margin-bottom: 16px;">Tu cuenta de ejecutivo comercial ha sido creada exitosamente.</p>
                ${credentialsBlock}
                <p style="color: #222; margin-bottom: 16px;">Desde tu panel podrás gestionar tus médicos referidos, hacer seguimiento a sus cuentas y consultar tus comisiones.</p>
            `;
            break;
        }
        case 'secretary': {
            subject = '¡Bienvenido(a) a Suma! - Acceso de Secretaría';
            headerSubtitle = 'Gestión de Consultorio y Turnos';
            ctaUrl = `${appUrl}/login`;
            ctaLabel = 'Iniciar Sesión';
            bodyContent = `
                <h2 style="color: #0ea5e9; margin-bottom: 12px;">¡Hola, ${name}!</h2>
                <p style="color: #222; margin-bottom: 16px;">Se ha creado tu cuenta de secretaría en <strong>Suma</strong>${extraData.clinicName ? ` para <strong>${extraData.clinicName}</strong>` : ''}${extraData.laboratoryName ? ` para <strong>${extraData.laboratoryName}</strong>` : ''}.</p>
                ${credentialsBlock}
                <p style="color: #222; margin-bottom: 16px;">Con tu cuenta podrás gestionar la agenda de citas, recepción de pacientes y cobros del centro.</p>
            `;
            break;
        }
        case 'patient':
        default: {
            subject = '¡Bienvenido a Suma!';
            headerSubtitle = 'Tu Salud en un Solo Lugar';
            ctaUrl = `${appUrl}/dashboard`;
            ctaLabel = 'Ir a mi cuenta Suma';
            bodyContent = `
                <h2 style="color: #0ea5e9; margin-bottom: 12px;">¡Bienvenido(a) a Suma, ${name}!</h2>
                <p style="color: #222; margin-bottom: 16px;">Nos alegra mucho tenerte como parte de nuestra comunidad.</p>
                ${credentialsBlock}
                <p style="color: #222; margin-bottom: 16px;">A partir de ahora podrás disfrutar de todos los beneficios y servicios que <b>Suma</b> tiene para ti: agendar citas médicas, consultar especialistas verificados, recibir recordatorios y llevar tu historial médico.</p>
                <p style="color: #222; margin-bottom: 24px;">Nuestro equipo está aquí para acompañarte en tu bienestar y salud.</p>
            `;
            break;
        }
    }

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 26px 20px; text-align: center;">
        <div style="font-size: 2.2rem; color: #fff; font-weight: bold; letter-spacing: 2px;">SUMA</div>
        <div style="font-size: 13px; color: #e0f2fe; margin-top: 4px;">${headerSubtitle}</div>
      </div>
      <div style="padding: 32px 24px 24px 24px;">
        ${bodyContent}
        <div style="text-align: center; margin: 28px 0;">
          <a href="${ctaUrl}" style="display: inline-block; background: #0ea5e9; color: #fff; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; text-decoration: none;">${ctaLabel}</a>
        </div>
        <p style="color: #64748b; font-size: 13px; margin-top: 20px;">Si tienes alguna duda o necesitas asistencia, puedes responder a este correo o contactarnos desde la plataforma.</p>
      </div>
      <div style="background: #f8fafc; color: #94a3b8; text-align: center; font-size: 12px; padding: 16px; border-top: 1px solid #e2e8f0;">
        &copy; ${year} Suma Salud. Todos los derechos reservados.
      </div>
    </div>
    `;

    return sendEmail({
        to: email,
        subject,
        html,
    });
}

export async function sendDoctorVerifiedEmail({
    email,
    name,
    specialty,
    medicalLicense,
}: {
    email: string;
    name: string;
    specialty?: string;
    medicalLicense?: string;
}) {
    if (!email || !name) {
        return { success: false, error: 'Missing email or name' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const year = new Date().getFullYear();

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 26px 20px; text-align: center;">
        <div style="font-size: 2.2rem; color: #fff; font-weight: bold; letter-spacing: 2px;">SUMA</div>
        <div style="font-size: 13px; color: #d1fae5; margin-top: 4px;">Verificación Profesional Completada</div>
      </div>
      <div style="padding: 32px 24px 24px 24px;">
        <h2 style="color: #059669; margin-bottom: 12px;">¡Felicidades, Dr(a). ${name}!</h2>
        <p style="color: #222; margin-bottom: 16px; line-height: 1.5;">
          Nos complace informarte que nuestro equipo administrativo ha revisado y <strong>verificado exitosamente</strong> tus credenciales profesionales en <strong>Suma</strong>.
        </p>

        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #065f46; font-size: 15px;">✅ Estatus actual: Médico Verificado</p>
          ${specialty ? `<p style="margin: 0 0 4px 0; color: #047857; font-size: 14px;">Especialidad: <strong>${specialty}</strong></p>` : ''}
          ${medicalLicense ? `<p style="margin: 0; color: #047857; font-size: 14px;">Matrícula Profesional: <strong>${medicalLicense}</strong></p>` : ''}
        </div>

        <p style="color: #222; margin-bottom: 12px;">¿Qué significa esto para tu cuenta?</p>
        <ul style="color: #444; margin-bottom: 24px; padding-left: 20px; line-height: 1.6;">
          <li>Tu perfil cuenta ahora con el <strong>sello oficial de Médico Verificado</strong> en el directorio de Suma.</li>
          <li>Los pacientes ya pueden encontrar tu perfil públicamente y agendar citas contigo.</li>
          <li>Tienes acceso completo a todas las funcionalidades de tu Portal Médico.</li>
        </ul>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${appUrl}/doctor/dashboard" style="display: inline-block; background: #10b981; color: #fff; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; text-decoration: none;">Ir a mi Portal Médico</a>
        </div>

        <p style="color: #64748b; font-size: 13px; margin-top: 20px;">¡Gracias por formar parte de la red de profesionales verificados de Suma!</p>
      </div>
      <div style="background: #f8fafc; color: #94a3b8; text-align: center; font-size: 12px; padding: 16px; border-top: 1px solid #e2e8f0;">
        &copy; ${year} Suma Salud. Todos los derechos reservados.
      </div>
    </div>
    `;

    return sendEmail({
        to: email,
        subject: '✅ ¡Tu cuenta médica en Suma ha sido verificada exitosamente!',
        html,
    });
}

export async function sendSellerNewReferralEmail({
    sellerEmail,
    sellerName,
    doctorName,
    doctorEmail,
    doctorPhone,
    specialty,
    city,
}: {
    sellerEmail: string;
    sellerName: string;
    doctorName: string;
    doctorEmail?: string;
    doctorPhone?: string;
    specialty?: string;
    city?: string;
}) {
    if (!sellerEmail || !sellerName) {
        return { success: false, error: 'Missing seller email or name' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const year = new Date().getFullYear();

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 26px 20px; text-align: center;">
        <div style="font-size: 2.2rem; color: #fff; font-weight: bold; letter-spacing: 2px;">SUMA</div>
        <div style="font-size: 13px; color: #e0f2fe; margin-top: 4px;">Nuevo Médico Referido Registrado</div>
      </div>
      <div style="padding: 32px 24px 24px 24px;">
        <h2 style="color: #0284c7; margin-bottom: 12px;">¡Excelente trabajo, ${sellerName}! 🎉</h2>
        <p style="color: #222; margin-bottom: 16px; line-height: 1.5;">
          Un nuevo profesional médico se acaba de registrar en <strong>Suma</strong> vinculado a tu código de referido:
        </p>

        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #0369a1; font-size: 15px;">👨‍⚕️ Dr(a). ${doctorName}</p>
          ${specialty ? `<p style="margin: 0 0 4px 0; color: #334155; font-size: 14px;">Especialidad: <strong>${specialty}</strong></p>` : ''}
          ${city ? `<p style="margin: 0 0 4px 0; color: #334155; font-size: 14px;">Ciudad: <strong>${city}</strong></p>` : ''}
          ${doctorEmail ? `<p style="margin: 0 0 4px 0; color: #334155; font-size: 14px;">Correo: <strong>${doctorEmail}</strong></p>` : ''}
          ${doctorPhone ? `<p style="margin: 0 0 4px 0; color: #334155; font-size: 14px;">Teléfono/WhatsApp: <strong>${doctorPhone}</strong></p>` : ''}
          <p style="margin: 8px 0 0 0; color: #b45309; font-size: 13px;">⏳ Estatus actual: <strong>Pendiente por Verificar</strong></p>
        </div>

        <p style="color: #222; margin-bottom: 16px; line-height: 1.5;">
          Recuerda que ganarás tu <strong>comisión de forma recurrente por cada pago de suscripción</strong> que realice este médico en la plataforma. Te recomendamos acompañarlo para que complete su perfil y verificación.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${appUrl}/seller" style="display: inline-block; background: #0ea5e9; color: #fff; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; text-decoration: none;">Ver mis Médicos Referidos</a>
        </div>
      </div>
      <div style="background: #f8fafc; color: #94a3b8; text-align: center; font-size: 12px; padding: 16px; border-top: 1px solid #e2e8f0;">
        &copy; ${year} Suma Salud. Todos los derechos reservados.
      </div>
    </div>
    `;

    return sendEmail({
        to: sellerEmail,
        subject: `🎉 ¡Nuevo médico referido registrado!: Dr(a). ${doctorName}`,
        html,
    });
}

export async function sendSellerDoctorVerifiedEmail({
    sellerEmail,
    sellerName,
    doctorName,
    specialty,
}: {
    sellerEmail: string;
    sellerName: string;
    doctorName: string;
    specialty?: string;
}) {
    if (!sellerEmail || !sellerName) {
        return { success: false, error: 'Missing seller email or name' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const year = new Date().getFullYear();

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 26px 20px; text-align: center;">
        <div style="font-size: 2.2rem; color: #fff; font-weight: bold; letter-spacing: 2px;">SUMA</div>
        <div style="font-size: 13px; color: #d1fae5; margin-top: 4px;">Médico Referido Verificado</div>
      </div>
      <div style="padding: 32px 24px 24px 24px;">
        <h2 style="color: #059669; margin-bottom: 12px;">¡Buenas noticias, ${sellerName}! ✅</h2>
        <p style="color: #222; margin-bottom: 16px; line-height: 1.5;">
          Tu médico referido <strong>Dr(a). ${doctorName}</strong>${specialty ? ` (${specialty})` : ''} ha sido <strong>verificado exitosamente</strong> por el equipo administrativo de Suma.
        </p>

        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #065f46; font-size: 15px;">✅ Ya está activo y visible en el directorio público</p>
          <p style="margin: 0; color: #047857; font-size: 14px;">
            Recuerda que recibirás tu comisión de forma <strong>recurrente por cada pago de suscripción</strong> que realice el médico.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${appUrl}/seller" style="display: inline-block; background: #10b981; color: #fff; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; text-decoration: none;">Ir a mi Portal de Vendedora</a>
        </div>
      </div>
      <div style="background: #f8fafc; color: #94a3b8; text-align: center; font-size: 12px; padding: 16px; border-top: 1px solid #e2e8f0;">
        &copy; ${year} Suma Salud. Todos los derechos reservados.
      </div>
    </div>
    `;

    return sendEmail({
        to: sellerEmail,
        subject: `✅ ¡Tu médico referido Dr(a). ${doctorName} ha sido verificado!`,
        html,
    });
}

export async function sendSellerCommissionGeneratedEmail({
    sellerEmail,
    sellerName,
    doctorName,
    commissionAmount,
    period,
}: {
    sellerEmail: string;
    sellerName: string;
    doctorName: string;
    commissionAmount: number;
    period: string;
}) {
    if (!sellerEmail || !sellerName) {
        return { success: false, error: 'Missing seller email or name' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const year = new Date().getFullYear();

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 26px 20px; text-align: center;">
        <div style="font-size: 2.2rem; color: #fff; font-weight: bold; letter-spacing: 2px;">SUMA</div>
        <div style="font-size: 13px; color: #e0f2fe; margin-top: 4px;">Nueva Comisión Recurrente Generada</div>
      </div>
      <div style="padding: 32px 24px 24px 24px;">
        <h2 style="color: #0284c7; margin-bottom: 12px;">¡Sumaste una nueva comisión, ${sellerName}! 💸</h2>
        <p style="color: #222; margin-bottom: 16px; line-height: 1.5;">
          Se ha aprobado un pago de suscripción de tu médico referido <strong>Dr(a). ${doctorName}</strong> y se ha generado automáticamente tu comisión recurrente.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #166534; font-size: 16px;">Monto de Comisión: $${commissionAmount.toFixed(2)}</p>
          <p style="margin: 0 0 4px 0; color: #15803d; font-size: 14px;">Médico: <strong>Dr(a). ${doctorName}</strong></p>
          <p style="margin: 0; color: #15803d; font-size: 14px;">Período: <strong>${period}</strong></p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${appUrl}/seller" style="display: inline-block; background: #0ea5e9; color: #fff; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; text-decoration: none;">Ver mis Finanzas y Comisiones</a>
        </div>
      </div>
      <div style="background: #f8fafc; color: #94a3b8; text-align: center; font-size: 12px; padding: 16px; border-top: 1px solid #e2e8f0;">
        &copy; ${year} Suma Salud. Todos los derechos reservados.
      </div>
    </div>
    `;

    return sendEmail({
        to: sellerEmail,
        subject: `💸 Nueva comisión generada ($${commissionAmount.toFixed(2)}) - Dr(a). ${doctorName}`,
        html,
    });
}

export async function sendSellerCommissionPaidEmail({
    sellerEmail,
    sellerName,
    amount,
    period,
    transactionId,
}: {
    sellerEmail: string;
    sellerName: string;
    amount: number;
    period: string;
    transactionId?: string;
}) {
    if (!sellerEmail || !sellerName) {
        return { success: false, error: 'Missing seller email or name' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const year = new Date().getFullYear();

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 26px 20px; text-align: center;">
        <div style="font-size: 2.2rem; color: #fff; font-weight: bold; letter-spacing: 2px;">SUMA</div>
        <div style="font-size: 13px; color: #d1fae5; margin-top: 4px;">Comprobante de Pago de Comisiones</div>
      </div>
      <div style="padding: 32px 24px 24px 24px;">
        <h2 style="color: #059669; margin-bottom: 12px;">¡Pago de comisiones enviado, ${sellerName}! 🎉</h2>
        <p style="color: #222; margin-bottom: 16px; line-height: 1.5;">
          El equipo administrativo de <strong>Suma</strong> ha registrado el pago de tus comisiones pendientes.
        </p>

        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 6px 0; font-weight: bold; color: #065f46; font-size: 16px;">Total Pagado: $${amount.toFixed(2)}</p>
          <p style="margin: 0 0 4px 0; color: #047857; font-size: 14px;">Período: <strong>${period}</strong></p>
          ${transactionId ? `<p style="margin: 0; color: #047857; font-size: 14px;">Referencia: <strong>${transactionId}</strong></p>` : ''}
        </div>

        <p style="color: #222; margin-bottom: 16px;">
          Puedes consultar el detalle y el comprobante de transferencia directamente en la sección <strong>Finanzas</strong> de tu portal.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${appUrl}/seller" style="display: inline-block; background: #10b981; color: #fff; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; text-decoration: none;">Ver Comprobante en mi Portal</a>
        </div>
      </div>
      <div style="background: #f8fafc; color: #94a3b8; text-align: center; font-size: 12px; padding: 16px; border-top: 1px solid #e2e8f0;">
        &copy; ${year} Suma Salud. Todos los derechos reservados.
      </div>
    </div>
    `;

    return sendEmail({
        to: sellerEmail,
        subject: `✅ Pago de comisiones procesado ($${amount.toFixed(2)}) - Suma`,
        html,
    });
}

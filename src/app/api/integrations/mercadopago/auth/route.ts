import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const doctorId = url.searchParams.get('doctor_id');

        if (!doctorId) {
            return NextResponse.json({ error: 'Missing doctor_id' }, { status: 400 });
        }

        const appId = process.env.MP_APP_ID;
        const redirectUri = process.env.MP_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/mercadopago/callback`;

        // State se usa para mantener el contexto (doctor_id) a través del redirect
        const state = doctorId;

        if (!appId) {
            return NextResponse.json({ error: 'Server configuration error: Missing MP_APP_ID' }, { status: 500 });
        }

        // Construir URL de autorización de MercadoPago
        // https://www.mercadopago.com.ar/developers/en/docs/your-integrations/connect-accounts
        const authUrl = `https://auth.mercadopago.com.ar/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        return NextResponse.redirect(authUrl);

    } catch (error) {
        console.error('Auth Redirect Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

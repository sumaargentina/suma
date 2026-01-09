import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state'); // Debería contener el doctor_id encriptado o simple

        if (!code || !state) {
            return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
        }

        // El 'state' lo usamos para pasar el ID del médico que inició el flujo
        // Por simplicidad ahora asumimos que state = doctor_id. En producción debería estar firmado.
        const doctorId = state;

        // 1. Intercambiar code por tokens
        const tokenUrl = 'https://api.mercadopago.com/oauth/token';
        const params = new URLSearchParams();
        params.append('client_id', process.env.MP_APP_ID!);
        params.append('client_secret', process.env.MP_CLIENT_SECRET!);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', process.env.MP_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/mercadopago/callback`);

        console.log('🔗 Exchanging MP code for doctor:', doctorId);

        const mpResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error('❌ MP OAuth Error:', mpData);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/doctor/dashboard?view=bank-details&error=mp_connection_failed`);
        }

        // 2. Guardar en Supabase
        const { access_token, refresh_token, public_key, user_id, expires_in } = mpData;

        const { error: dbError } = await supabaseAdmin
            .from('doctor_integrations')
            .upsert({
                doctor_id: doctorId,
                provider: 'mercadopago',
                mp_access_token: access_token,
                mp_refresh_token: refresh_token,
                mp_public_key: public_key,
                mp_user_id: user_id?.toString(), // MP returns number sometimes
                mp_expires_in: expires_in,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'doctor_id, provider' });

        if (dbError) {
            console.error('❌ DB Error saving integration:', dbError);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/doctor/dashboard?view=bank-details&error=db_save_failed`);
        }

        console.log('✅ MercadoPago Connected for Doctor:', doctorId);

        // 3. Redirigir al dashboard con éxito
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/doctor/dashboard?view=bank-details&success=mp_connected`);

    } catch (error) {
        console.error('❌ Integration Callback Error:', error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/doctor/dashboard?view=bank-details&error=internal_error`);
    }
}

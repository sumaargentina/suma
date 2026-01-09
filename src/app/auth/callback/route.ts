import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const requestUrl = new URL(request.url);
        const code = requestUrl.searchParams.get('code');

        if (code) {
            const cookieStore = cookies();
            const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

            // Intercambiar el código por una sesión
            await supabase.auth.exchangeCodeForSession(code);
        }

        // URL a la que redirigir después de iniciar sesión
        // Por defecto al dashboard, o a donde indique el parámetro 'next'
        const next = requestUrl.searchParams.get('next') || '/dashboard';

        return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } catch (error) {
        console.error('Auth callback error:', error);
        // En caso de error, redirigir al login con un parámetro de error
        const requestUrl = new URL(request.url);
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_error`);
    }
}

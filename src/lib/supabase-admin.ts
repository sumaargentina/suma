import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// En el cliente, las variables de entorno secretas no están disponibles
// Esto es esperado y correcto por seguridad
if (typeof window === 'undefined') {
    // Solo mostrar advertencia en el servidor
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('❌ Supabase Admin: Missing Credentials in Environment');
    }
}

// Initialize Supabase Admin client
// En el cliente usará credenciales placeholder (no funcionará, pero no romperá)
// En el servidor usará las credenciales reales
export const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceRoleKey || 'placeholder-key',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

if (typeof window === 'undefined') {
    console.log('✅ Supabase Admin configurado (Servidor)');
}

export { supabaseUrl };

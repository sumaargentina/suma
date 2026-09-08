import { createClient } from '@supabase/supabase-js';

// SEGURIDAD: Credenciales SOLO desde variables de entorno
// NUNCA hardcodear credenciales en el código
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validar que las credenciales existan
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SEGURIDAD: Faltan variables de entorno de Supabase');
  console.error('   Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
}

// Initialize Supabase client (Singleton pattern to avoid multiple GoTrueClient warnings)
const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl || '', supabaseAnonKey || '', {
      auth: {
        persistSession: false,
      },
    });
  }

  const globalWithSupabase = globalThis as unknown as { __supabaseInstance?: ReturnType<typeof createClient> };
  if (!globalWithSupabase.__supabaseInstance) {
    globalWithSupabase.__supabaseInstance = createClient(
      supabaseUrl || '',
      supabaseAnonKey || '',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }
  return globalWithSupabase.__supabaseInstance;
};

export const supabase = getSupabaseClient();

export { supabaseUrl, supabaseAnonKey };


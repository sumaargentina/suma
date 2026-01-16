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

// Initialize Supabase client
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export { supabaseUrl, supabaseAnonKey };


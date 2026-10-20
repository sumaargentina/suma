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

// Helper to safely clear corrupted/stale Supabase tokens from browser storage
export const clearStaleSupabaseAuth = () => {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') && key.endsWith('-auth-token'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    const sessionKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('sb-') && key.endsWith('-auth-token'))) {
        sessionKeys.push(key);
      }
    }
    sessionKeys.forEach((k) => sessionStorage.removeItem(k));
  } catch (e) {
    console.warn('[Supabase] Error clearing stale auth storage:', e);
  }
};

// Initialize Supabase client (Singleton pattern to avoid multiple GoTrueClient warnings)
const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl || '', supabaseAnonKey || '', {
      auth: {
        persistSession: false,
      },
    });
  }

  const globalWithSupabase = globalThis as unknown as {
    __supabaseInstance?: ReturnType<typeof createClient>;
    __supabaseAuthListenerAttached?: boolean;
  };

  if (!globalWithSupabase.__supabaseAuthListenerAttached) {
    globalWithSupabase.__supabaseAuthListenerAttached = true;

    // Intercept any unhandled GoTrue / Supabase refresh token error to prevent Next.js Turbopack console errors
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const isRefreshError =
        reason?.name === 'AuthApiError' ||
        reason?.message?.includes('Refresh Token Not Found') ||
        reason?.message?.includes('Invalid Refresh Token') ||
        reason?.message?.includes('refresh_token_not_found') ||
        reason?.error_description?.includes('Refresh Token');

      if (isRefreshError) {
        event.preventDefault(); // Evita que Turbopack / Next.js muestre el error unhandled en consola
        console.warn('⚠️ [Supabase Auth] Sesión expirada o token no encontrado. Limpiando tokens obsoletos...');
        clearStaleSupabaseAuth();
        try {
          globalWithSupabase.__supabaseInstance?.auth.signOut({ scope: 'local' }).catch(() => {});
        } catch {}
      }
    });
  }

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

    // Escuchar cambios de estado para limpiar tokens caducados
    globalWithSupabase.__supabaseInstance.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearStaleSupabaseAuth();
      }
    });
  }

  return globalWithSupabase.__supabaseInstance;
};

export const supabase = getSupabaseClient();

export { supabaseUrl, supabaseAnonKey };



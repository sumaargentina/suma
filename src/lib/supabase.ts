import { createClient } from '@supabase/supabase-js';

// Fallback credentials if .env fails
const FALLBACK_URL = 'https://fnjdqdwpttmrpzbqzbqm.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuamRxZHdwdHRtcnB6YnF6YnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODIxNzcsImV4cCI6MjA3OTg1ODE3N30.SqE1FWYn0nMrT4OOYtmDLlRJKpDOWue2iDlQqyvqKGQ';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

console.log('✅ Supabase configurado (Cliente):', {
  url: supabaseUrl,
  usingFallback: !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});

export { supabaseUrl, supabaseAnonKey };

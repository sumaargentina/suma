const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
const supabaseConfig = `
# Supabase Configuration (Added automatically)
NEXT_PUBLIC_SUPABASE_URL=https://fnjdqdwpttmrpzbqzbqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuamRxZHdwdHRtcnB6YnF6YnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODIxNzcsImV4cCI6MjA3OTg1ODE3N30.SqE1FWYn0nMrT4OOYtmDLlRJKpDOWue2iDlQqyvqKGQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuamRxZHdwdHRtcnB6YnF6YnFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MjE3NywiZXhwIjoyMDc5ODU4MTc3fQ.ToWEbG_ZPxN3GTLAiDCtpgSg-NKoT8ZcivdA6W5_xYk
`;

try {
    let content = '';
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
        // Remover configuraciones viejas de Supabase si existen para evitar duplicados
        content = content.replace(/NEXT_PUBLIC_SUPABASE_URL=.*\n?/g, '');
        content = content.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*\n?/g, '');
        content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*\n?/g, '');
    }

    // Agregar la configuración nueva al final
    const newContent = content.trim() + '\n' + supabaseConfig;
    fs.writeFileSync(envPath, newContent);
    console.log('✅ Archivo .env actualizado correctamente.');
} catch (error) {
    console.error('❌ Error al escribir .env:', error);
}

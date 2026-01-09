const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log('🔍 Verificando configuración de entorno...');

// Intentar cargar .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ Archivo .env encontrado en:', envPath);
    const envConfig = dotenv.parse(fs.readFileSync(envPath));

    // Verificar URL
    if (envConfig.NEXT_PUBLIC_SUPABASE_URL) {
        console.log('✅ NEXT_PUBLIC_SUPABASE_URL encontrada:', envConfig.NEXT_PUBLIC_SUPABASE_URL);
    } else {
        console.error('❌ Faltante: NEXT_PUBLIC_SUPABASE_URL');
    }

    // Verificar Anon Key
    if (envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const key = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY encontrada (longitud: ' + key.length + ')');
        if (key.startsWith('eyJ')) {
            console.log('   Formato parece correcto (JWT)');
        } else {
            console.warn('   ⚠️ El formato de la clave parece sospechoso (no empieza con eyJ)');
        }
    } else {
        console.error('❌ Faltante: NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    // Verificar Service Role
    if (envConfig.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('✅ SUPABASE_SERVICE_ROLE_KEY encontrada');
    } else {
        console.error('❌ Faltante: SUPABASE_SERVICE_ROLE_KEY');
    }

} else {
    console.error('❌ NO se encontró el archivo .env en la raíz del proyecto');
}

#!/usr/bin/env node

/**
 * Script de Verificación de Seguridad
 * Verifica que todas las configuraciones de seguridad estén correctas
 */

const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

let errors = 0;
let warnings = 0;
let passed = 0;

function log(message, color = RESET) {
    console.log(`${color}${message}${RESET}`);
}

function checkFile(filePath, description) {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
        log(`✅ ${description}`, GREEN);
        passed++;
        return true;
    } else {
        log(`❌ ${description} - Archivo no encontrado: ${filePath}`, RED);
        errors++;
        return false;
    }
}

function checkEnvVariable(varName) {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        log(`❌ Archivo .env no encontrado`, RED);
        errors++;
        return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes(`${varName}=`)) {
        const value = envContent.match(new RegExp(`${varName}=(.+)`))?.[1];
        if (value && value.trim() && !value.includes('your-') && !value.includes('change-this')) {
            log(`✅ ${varName} está configurado`, GREEN);
            passed++;
            return true;
        } else {
            log(`⚠️  ${varName} existe pero parece usar valor por defecto`, YELLOW);
            warnings++;
            return false;
        }
    } else {
        log(`❌ ${varName} no está configurado en .env`, RED);
        errors++;
        return false;
    }
}

function checkPackageInstalled(packageName) {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        log(`❌ package.json no encontrado`, RED);
        errors++;
        return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps[packageName]) {
        log(`✅ Paquete ${packageName} instalado (${deps[packageName]})`, GREEN);
        passed++;
        return true;
    } else {
        log(`❌ Paquete ${packageName} no está instalado`, RED);
        errors++;
        return false;
    }
}

console.log('\n' + '='.repeat(60));
log('🔐 VERIFICACIÓN DE SEGURIDAD - SUMA ARGENTINA', BLUE);
console.log('='.repeat(60) + '\n');

// 1. Verificar archivos de seguridad
log('📁 Verificando archivos de seguridad...', BLUE);
checkFile('src/middleware.ts', 'Middleware de protección de rutas');
checkFile('src/components/protected-route.tsx', 'Componente ProtectedRoute');
checkFile('src/lib/auth-helpers.ts', 'Helpers de autenticación');
checkFile('src/app/api/auth/set-token/route.ts', 'API route set-token');
checkFile('src/app/api/auth/clear-token/route.ts', 'API route clear-token');

console.log('');

// 2. Verificar variables de entorno
log('🔑 Verificando variables de entorno...', BLUE);
checkEnvVariable('JWT_SECRET');
checkEnvVariable('NEXT_PUBLIC_SUPABASE_URL');
checkEnvVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY');
checkEnvVariable('SUPABASE_SERVICE_ROLE_KEY');

console.log('');

// 3. Verificar paquetes instalados
log('📦 Verificando paquetes necesarios...', BLUE);
checkPackageInstalled('jose');
checkPackageInstalled('@supabase/supabase-js');

console.log('');

// 4. Verificar documentación
log('📚 Verificando documentación...', BLUE);
checkFile('SECURITY_CONFIG.md', 'Documentación de configuración');
checkFile('SECURITY_SUMMARY.md', 'Resumen de seguridad');

console.log('');

// Resumen
console.log('='.repeat(60));
log('📊 RESUMEN', BLUE);
console.log('='.repeat(60));
log(`✅ Verificaciones pasadas: ${passed}`, GREEN);
if (warnings > 0) log(`⚠️  Advertencias: ${warnings}`, YELLOW);
if (errors > 0) log(`❌ Errores: ${errors}`, RED);

console.log('');

if (errors === 0 && warnings === 0) {
    log('🎉 ¡Todas las verificaciones pasaron! El sistema de seguridad está correctamente configurado.', GREEN);
    process.exit(0);
} else if (errors === 0) {
    log('⚠️  Hay algunas advertencias. Revisa la configuración.', YELLOW);
    process.exit(0);
} else {
    log('❌ Hay errores que deben ser corregidos antes de continuar.', RED);
    console.log('');
    log('💡 Pasos sugeridos:', BLUE);
    log('1. Revisa SECURITY_CONFIG.md para instrucciones detalladas');
    log('2. Asegúrate de tener JWT_SECRET configurado en .env');
    log('3. Ejecuta: npm install jose');
    log('4. Reinicia el servidor: npm run dev');
    process.exit(1);
}

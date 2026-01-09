/**
 * =====================================================
 * VERIFICATION SCRIPT
 * =====================================================
 * Script para verificar que todo está configurado correctamente
 * 
 * Ejecutar: node scripts/verify-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de SUMA...\n');

let errors = 0;
let warnings = 0;

// =====================================================
// 1. VERIFICAR ARCHIVOS CREADOS
// =====================================================

console.log('📁 Verificando archivos creados...');

const requiredFiles = [
    'IMPLEMENTATION_ROADMAP.md',
    'SUPABASE_AUTH_IMPLEMENTATION_GUIDE.md',
    'START_HERE.md',
    'database/migrations/001_supabase_auth_complete.sql',
    'database/migrations/002_pharmacies_laboratories.sql',
    'src/lib/auth-service.ts',
    'src/lib/new-auth-context.tsx',
];

requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ❌ ${file} - NO ENCONTRADO`);
        errors++;
    }
});

// =====================================================
// 2. VERIFICAR VARIABLES DE ENTORNO
// =====================================================

console.log('\n🔐 Verificando variables de entorno...');

const envPath = path.join(process.cwd(), '.env.local');

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');

    const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
    ];

    requiredEnvVars.forEach(envVar => {
        if (envContent.includes(envVar)) {
            console.log(`  ✅ ${envVar}`);
        } else {
            console.log(`  ❌ ${envVar} - NO CONFIGURADO`);
            errors++;
        }
    });

    // Optional pero recomendado
    const optionalEnvVars = [
        'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
    ];

    optionalEnvVars.forEach(envVar => {
        if (envContent.includes(envVar)) {
            console.log(`  ✅ ${envVar} (opcional)`);
        } else {
            console.log(`  ⚠️  ${envVar} - No configurado (opcional para OAuth)`);
            warnings++;
        }
    });
} else {
    console.log('  ❌ Archivo .env.local no encontrado');
    errors++;
}

// =====================================================
// 3. VERIFICAR DEPENDENCIAS
// =====================================================

console.log('\n📦 Verificando dependencias...');

const packageJsonPath = path.join(process.cwd(), 'package.json');

if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const requiredDeps = [
        '@supabase/supabase-js',
        '@supabase/auth-helpers-nextjs',
        'next',
        'react',
    ];

    requiredDeps.forEach(dep => {
        if (dependencies[dep]) {
            console.log(`  ✅ ${dep} v${dependencies[dep]}`);
        } else {
            console.log(`  ❌ ${dep} - NO INSTALADO`);
            errors++;
        }
    });

    // Recomendadas
    const recommendedDeps = [
        'qrcode',
        'speakeasy',
    ];

    recommendedDeps.forEach(dep => {
        if (dependencies[dep]) {
            console.log(`  ✅ ${dep} v${dependencies[dep]} (recomendado)`);
        } else {
            console.log(`  ⚠️  ${dep} - No instalado (necesario para MFA y recetas)`);
            warnings++;
        }
    });
} else {
    console.log('  ❌ package.json no encontrado');
    errors++;
}

// =====================================================
// 4. VERIFICAR ESTRUCTURA DE DIRECTORIOS
// =====================================================

console.log('\n📂 Verificando estructura de directorios...');

const requiredDirs = [
    'src/app',
    'src/components',
    'src/lib',
    'database/migrations',
    'public',
];

requiredDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
        console.log(`  ✅ ${dir}`);
    } else {
        console.log(`  ❌ ${dir} - NO ENCONTRADO`);
        errors++;
    }
});

// =====================================================
// 5. RESUMEN
// =====================================================

console.log('\n' + '='.repeat(50));
console.log('📊 RESUMEN DE VERIFICACIÓN');
console.log('='.repeat(50));

if (errors === 0 && warnings === 0) {
    console.log('✅ Todo está correctamente configurado!');
    console.log('\n🎯 Próximos pasos:');
    console.log('   1. Leer START_HERE.md');
    console.log('   2. Ejecutar migraciones SQL en Supabase');
    console.log('   3. Configurar Supabase Dashboard');
    console.log('   4. Actualizar componentes UI');
} else {
    if (errors > 0) {
        console.log(`❌ ${errors} error(es) encontrado(s)`);
        console.log('\n🔧 Acción requerida:');
        console.log('   - Revisa los errores marcados con ❌');
        console.log('   - Ejecuta los comandos necesarios');
        console.log('   - Vuelve a ejecutar este script');
    }

    if (warnings > 0) {
        console.log(`⚠️  ${warnings} advertencia(s)`);
        console.log('\n💡 Recomendación:');
        console.log('   - Las advertencias son opcionales');
        console.log('   - Pero mejorarán la funcionalidad');
        console.log('   - Considera instalarlas cuando sea posible');
    }
}

console.log('\n📖 Documentación:');
console.log('   - Roadmap general: IMPLEMENTATION_ROADMAP.md');
console.log('   - Guía de auth: SUPABASE_AUTH_IMPLEMENTATION_GUIDE.md');
console.log('   - Empezar aquí: START_HERE.md');

console.log('\n✨ ¡Éxito en tu implementación!\n');

// Exit with error code if there are errors
process.exit(errors > 0 ? 1 : 0);

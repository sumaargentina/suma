const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generar una clave aleatoria segura de 64 caracteres
const jwtSecret = crypto.randomBytes(32).toString('base64');

const envPath = path.join(process.cwd(), '.env');

// Leer el archivo .env actual
let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
}

// Verificar si JWT_SECRET ya existe
if (envContent.includes('JWT_SECRET=')) {
    console.log('⚠️  JWT_SECRET ya existe en .env');
    console.log('Si deseas cambiarlo, edita manualmente el archivo .env');
} else {
    // Agregar JWT_SECRET al final del archivo
    const newLine = envContent.endsWith('\n') ? '' : '\n';
    const jwtLine = `${newLine}# JWT Secret for authentication tokens\nJWT_SECRET=${jwtSecret}\n`;

    fs.writeFileSync(envPath, envContent + jwtLine, 'utf8');

    console.log('✅ JWT_SECRET agregado exitosamente a .env');
    console.log('🔑 Clave generada:', jwtSecret);
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('1. Esta clave es secreta y única para tu aplicación');
    console.log('2. NO la compartas con nadie');
    console.log('3. NO la subas a GitHub');
    console.log('4. Reinicia el servidor: npm run dev');
}

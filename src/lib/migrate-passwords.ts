import { hashPassword, isPasswordHashed } from './password-utils';
import * as supabaseService from './supabaseService';

/**
 * Script de migración para encriptar contraseñas existentes
 * Este script debe ejecutarse una sola vez para migrar las contraseñas existentes
 * de texto plano a formato encriptado usando bcrypt.
 */
export async function migratePasswords() {
  console.log('🔐 Iniciando migración de contraseñas...');

  try {
    // Obtener todos los usuarios
    const [patients, doctors, sellers] = await Promise.all([
      supabaseService.getPatients(),
      supabaseService.getDoctors(),
      supabaseService.getSellers(),
    ]);

    let totalUsers = 0;
    let migratedUsers = 0;
    let skippedUsers = 0;

    // Migrar pacientes
    console.log(`📋 Procesando ${patients.length} pacientes...`);
    for (const patient of patients) {
      totalUsers++;
      if (!patient.password) {
        console.log(`⚠️  Paciente ${patient.name} (${patient.email}) no tiene contraseña`);
        skippedUsers++;
        continue;
      }

      if (isPasswordHashed(patient.password)) {
        console.log(`✅ Paciente ${patient.name} (${patient.email}) ya tiene contraseña encriptada`);
        skippedUsers++;
        continue;
      }

      try {
        const hashedPassword = await hashPassword(patient.password);
        await supabaseService.updatePatient(patient.id, { password: hashedPassword });
        console.log(`🔐 Paciente ${patient.name} (${patient.email}) migrado exitosamente`);
        migratedUsers++;
      } catch (error) {
        console.error(`❌ Error migrando paciente ${patient.name} (${patient.email}):`, error);
      }
    }

    // Migrar doctores
    console.log(`👨‍⚕️  Procesando ${doctors.length} doctores...`);
    for (const doctor of doctors) {
      totalUsers++;
      if (!doctor.password) {
        console.log(`⚠️  Doctor ${doctor.name} (${doctor.email}) no tiene contraseña`);
        skippedUsers++;
        continue;
      }

      if (isPasswordHashed(doctor.password)) {
        console.log(`✅ Doctor ${doctor.name} (${doctor.email}) ya tiene contraseña encriptada`);
        skippedUsers++;
        continue;
      }

      try {
        const hashedPassword = await hashPassword(doctor.password);
        await supabaseService.updateDoctor(doctor.id, { password: hashedPassword });
        console.log(`🔐 Doctor ${doctor.name} (${doctor.email}) migrado exitosamente`);
        migratedUsers++;
      } catch (error) {
        console.error(`❌ Error migrando doctor ${doctor.name} (${doctor.email}):`, error);
      }
    }

    // Migrar vendedores
    console.log(`👩‍💼 Procesando ${sellers.length} vendedores...`);
    for (const seller of sellers) {
      totalUsers++;
      if (!seller.password) {
        console.log(`⚠️  Vendedor ${seller.name} (${seller.email}) no tiene contraseña`);
        skippedUsers++;
        continue;
      }

      if (isPasswordHashed(seller.password)) {
        console.log(`✅ Vendedor ${seller.name} (${seller.email}) ya tiene contraseña encriptada`);
        skippedUsers++;
        continue;
      }

      try {
        const hashedPassword = await hashPassword(seller.password);
        await supabaseService.updateSeller(seller.id, { password: hashedPassword });
        console.log(`🔐 Vendedor ${seller.name} (${seller.email}) migrado exitosamente`);
        migratedUsers++;
      } catch (error) {
        console.error(`❌ Error migrando vendedor ${seller.name} (${seller.email}):`, error);
      }
    }

    // Resumen final
    console.log('\n📊 RESUMEN DE MIGRACIÓN:');
    console.log(`Total de usuarios procesados: ${totalUsers}`);
    console.log(`Usuarios migrados: ${migratedUsers}`);
    console.log(`Usuarios omitidos (ya encriptados o sin contraseña): ${skippedUsers}`);

    if (migratedUsers > 0) {
      console.log('\n✅ Migración completada exitosamente');
      console.log('🔒 Todas las contraseñas ahora están encriptadas de forma segura');
    } else {
      console.log('\nℹ️  No se requirió migración - todas las contraseñas ya estaban encriptadas');
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Función para verificar el estado de encriptación de las contraseñas
 */
export async function checkPasswordEncryptionStatus() {
  console.log('🔍 Verificando estado de encriptación de contraseñas...');

  try {
    const [patients, doctors, sellers] = await Promise.all([
      supabaseService.getPatients(),
      supabaseService.getDoctors(),
      supabaseService.getSellers(),
    ]);

    let totalUsers = 0;
    let encryptedUsers = 0;
    let plainTextUsers = 0;
    let noPasswordUsers = 0;

    // Verificar pacientes
    for (const patient of patients) {
      totalUsers++;
      if (!patient.password) {
        noPasswordUsers++;
      } else if (isPasswordHashed(patient.password)) {
        encryptedUsers++;
      } else {
        plainTextUsers++;
        console.log(`⚠️  Paciente ${patient.name} (${patient.email}) tiene contraseña en texto plano`);
      }
    }

    // Verificar doctores
    for (const doctor of doctors) {
      totalUsers++;
      if (!doctor.password) {
        noPasswordUsers++;
      } else if (isPasswordHashed(doctor.password)) {
        encryptedUsers++;
      } else {
        plainTextUsers++;
        console.log(`⚠️  Doctor ${doctor.name} (${doctor.email}) tiene contraseña en texto plano`);
      }
    }

    // Verificar vendedores
    for (const seller of sellers) {
      totalUsers++;
      if (!seller.password) {
        noPasswordUsers++;
      } else if (isPasswordHashed(seller.password)) {
        encryptedUsers++;
      } else {
        plainTextUsers++;
        console.log(`⚠️  Vendedor ${seller.name} (${seller.email}) tiene contraseña en texto plano`);
      }
    }

    console.log('\n📊 ESTADO DE ENCRIPTACIÓN:');
    console.log(`Total de usuarios: ${totalUsers}`);
    console.log(`Contraseñas encriptadas: ${encryptedUsers}`);
    console.log(`Contraseñas en texto plano: ${plainTextUsers}`);
    console.log(`Usuarios sin contraseña: ${noPasswordUsers}`);

    if (plainTextUsers === 0) {
      console.log('\n✅ Todas las contraseñas están encriptadas correctamente');
    } else {
      console.log(`\n⚠️  Se encontraron ${plainTextUsers} usuarios con contraseñas en texto plano`);
      console.log('💡 Ejecuta migratePasswords() para encriptar las contraseñas restantes');
    }

  } catch (error) {
    console.error('❌ Error verificando estado de encriptación:', error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
} 
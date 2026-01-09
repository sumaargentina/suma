/**
 * Script para crear usuarios de prueba para QA
 * Ejecutar con: npx ts-node scripts/create-test-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

const supabaseUrl = 'https://fnjdqdwpttmrpzbqzbqm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

async function createTestUsers() {
    console.log('🚀 Creando usuarios de prueba para QA...\n');

    const testPassword = 'Test123!';
    const hashedPassword = await hashPassword(testPassword);

    // 1. Crear Paciente de prueba
    console.log('👤 Creando paciente de prueba...');
    const { data: patient, error: patientError } = await supabase
        .from('patients')
        .upsert({
            email: 'paciente.test@suma.com',
            password: hashedPassword,
            name: 'Paciente de Prueba',
            phone: '+5491123456789',
            cedula: '12345678',
            age: 35,
            gender: 'masculino',
            city: 'Buenos Aires',
            profile_completed: true,
        }, { onConflict: 'email' })
        .select()
        .single();

    if (patientError) {
        console.error('❌ Error creando paciente:', patientError.message);
    } else {
        console.log('✅ Paciente creado:', patient.email);
    }

    // 2. Crear Doctor de prueba
    console.log('\n👨‍⚕️ Creando doctor de prueba...');
    const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .upsert({
            email: 'doctor.test@suma.com',
            password: hashedPassword,
            name: 'Dr. Test QA',
            specialty: 'Medicina General',
            city: 'Buenos Aires',
            cedula: '87654321',
            medical_license: 'MN-TEST-001',
            consultation_fee: 5000,
            phone: '+5491187654321',
            whatsapp: '+5491187654321',
            bio: 'Doctor de prueba para QA testing',
            availability: {
                lunes: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
                martes: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
                miercoles: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
                jueves: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
                viernes: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
            },
            services: [
                { name: 'Consulta General', price: 5000, duration: 30 },
                { name: 'Chequeo Completo', price: 8000, duration: 60 },
            ],
            offices: [
                {
                    name: 'Consultorio Principal',
                    address: 'Av. Corrientes 1234, CABA',
                    phone: '+5491187654321'
                }
            ],
            rating: 4.5,
            review_count: 10,
            is_verified: true,
            is_active: true,
            accepts_medical_insurance: true,
        }, { onConflict: 'email' })
        .select()
        .single();

    if (doctorError) {
        console.error('❌ Error creando doctor:', doctorError.message);
    } else {
        console.log('✅ Doctor creado:', doctor.email);
    }

    // 3. Crear Vendedora de prueba
    console.log('\n💼 Creando vendedora de prueba...');
    const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .upsert({
            email: 'vendedora.test@suma.com',
            password: hashedPassword,
            name: 'Vendedora de Prueba',
            phone: '+5491155555555',
            referral_code: 'TESTQA2024',
            commission_rate: 10,
            is_active: true,
        }, { onConflict: 'email' })
        .select()
        .single();

    if (sellerError) {
        console.error('❌ Error creando vendedora:', sellerError.message);
    } else {
        console.log('✅ Vendedora creada:', seller.email);
    }

    // Resumen
    console.log('\n' + '='.repeat(50));
    console.log('📋 CREDENCIALES DE PRUEBA PARA QA');
    console.log('='.repeat(50));
    console.log(`
┌─────────────────────────────────────────────────────┐
│ ROL          │ EMAIL                    │ PASSWORD  │
├─────────────────────────────────────────────────────┤
│ Paciente     │ paciente.test@suma.com   │ Test123!  │
│ Doctor       │ doctor.test@suma.com     │ Test123!  │
│ Vendedora    │ vendedora.test@suma.com  │ Test123!  │
│ Admin        │ admin@admin.com          │ admin123  │
└─────────────────────────────────────────────────────┘
    `);
    console.log('✅ Usuarios de prueba creados exitosamente!\n');
}

createTestUsers().catch(console.error);

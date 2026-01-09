
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde .env.local
// Cargar variables de entorno (intentar varias ubicaciones)
const envLocal = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const envMain = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('📂 CWD:', process.cwd());
console.log('📂 .env.local loaded:', !!envLocal.parsed);
console.log('📂 .env loaded:', !!envMain.parsed);

// Verificar que se cargaron las variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Variables de entorno no cargadas correctamente.');
    console.error('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'MISSING');
    console.error('KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING');
    console.error('💡 Nota: Asegúrate de tener un archivo .env o .env.local en la raíz del proyecto.');
    process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
    console.log('🔍 Iniciando diagnóstico de base de datos...');

    try {
        // 1. Verificar tabla doctors
        const { data: doctors, error: errDoc } = await supabaseAdmin.from('doctors').select('id').limit(1);
        if (errDoc) {
            console.error('❌ Error accediendo a tabla doctors:', errDoc);
        } else {
            console.log(`✅ Tabla doctors accesible. Registros encontrados: ${doctors.length}`);
        }

        // 2. Verificar tabla medical_records
        console.log('🔍 Verificando tabla medical_records...');
        const { data: records, error: errRecords } = await supabaseAdmin.from('medical_records').select('*').limit(1);

        if (errRecords) {
            console.error('❌ Error accediendo a tabla medical_records:', errRecords);

            if (errRecords.code === '42P01') {
                console.error('🚨 LA TABLA NO EXISTE. Debes correr la migración 006.');
            }
        } else {
            console.log(`✅ Tabla medical_records existe y es accesible.`);

            // 3. Intentar insertar un registro de prueba (si hay un paciente y un doctor)
            if (doctors && doctors.length > 0) {
                const { data: patients } = await supabaseAdmin.from('patients').select('id').limit(1);

                if (patients && patients.length > 0) {
                    const testRecord = {
                        patient_id: patients[0].id,
                        doctor_id: doctors[0].id,
                        visit_date: new Date().toISOString(),
                        record_type: 'consultation',
                        reason_for_visit: 'DIAGNOSTIC TEST',
                        diagnosis: 'Test Diagnosis',
                        treatment_plan: 'Test Treatment',
                        notes: 'Creado por script de diagnóstico'
                    };

                    console.log('💾 Intentando insertar registro de prueba:', testRecord);

                    const { data: inserted, error: errInsert } = await supabaseAdmin
                        .from('medical_records')
                        .insert(testRecord)
                        .select();

                    if (errInsert) {
                        console.error('❌ Error insertando registro de prueba:', errInsert);
                    } else {
                        console.log('✅ Registro de prueba insertado correctamente:', inserted);
                        // Limpiar
                        await supabaseAdmin.from('medical_records').delete().eq('id', inserted[0].id);
                        console.log('🧹 Registro de prueba eliminado.');
                    }
                } else {
                    console.warn('⚠️ No se puede probar inserción: No hay pacientes en la tabla.');
                }
            } else {
                console.warn('⚠️ No se puede probar inserción: No hay doctores en la tabla.');
            }
        }

    } catch (error) {
        console.error('💥 Error inesperado:', error);
    }
}

diagnose();

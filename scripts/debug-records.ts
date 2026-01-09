
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
const envLocal = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const envMain = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Faltan credenciales en .env.local');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function inspectrecords() {
    console.log('🔍 Inspeccionando registros médicos...');

    // 1. Contar total
    const { count, error: countError } = await supabaseAdmin
        .from('medical_records')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Error contando:', countError);
        return;
    }
    console.log(`📊 Total de historias clínicas en DB: ${count}`);

    // 2. Ver las últimas 5
    const { data: records, error } = await supabaseAdmin
        .from('medical_records')
        .select(`
            id,
            visit_date,
            patient_id,
            doctor_id,
            diagnosis
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error leyendo registros:', error);
    } else {
        console.log('📋 Últimos 5 registros:');
        records?.forEach(r => {
            console.log(` - [${r.visit_date}] ID: ${r.id}`);
            console.log(`   Paciente: ${r.patient_id}`);
            console.log(`   Doctor:   ${r.doctor_id}`);
            console.log(`   Diag:     ${r.diagnosis}`);
            console.log('---');
        });
    }

    // 3. Ver pacientes para cruzar IDs
    if (records && records.length > 0) {
        const patientIds = records.map(r => r.patient_id);
        const { data: patients } = await supabaseAdmin
            .from('patients')
            .select('id, first_name, last_name, email')
            .in('id', patientIds);

        console.log('👥 Pacientes correspondientes:');
        patients?.forEach(p => {
            console.log(`   ${p.id} -> ${p.first_name} ${p.last_name} (${p.email})`);
        });
    }
}

inspectrecords();

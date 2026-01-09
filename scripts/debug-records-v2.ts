
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Cargar variables
const envLocal = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const envMain = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('❌ Missing URL or KEY');
    process.exit(1);
}

const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
});

async function run() {
    console.log('⚡ Conectando...');

    // 1. Ver TODOS los records
    const { data: records, error } = await supabase
        .from('medical_records')
        .select('*')
        .limit(50);

    if (error) {
        console.error('❌ Error Query:', error.message, error.code);
        fs.writeFileSync('scripts/output.json', JSON.stringify({ error: error }, null, 2));
        return;
    }

    const output = {
        total: records?.length || 0,
        records: [] as any[]
    };

    if (records && records.length > 0) {
        for (const r of records) {
            const { data: p } = await supabase.from('patients').select('id, first_name, last_name, email').eq('id', r.patient_id).single();
            const { data: d } = await supabase.from('doctors').select('id, name').eq('id', r.doctor_id).single();

            output.records.push({
                id: r.id,
                created_at: r.created_at,
                patient_name: p ? `${p.first_name} ${p.last_name}` : 'UNKNOWN',
                patient_email: p?.email,
                patient_id: r.patient_id,
                doctor_name: d?.name,
                doctor_id: r.doctor_id,
                diagnosis: r.diagnosis ? r.diagnosis.substring(0, 20) + '...' : ''
            });
        }
    }

    fs.writeFileSync('scripts/output.json', JSON.stringify(output, null, 2));
    console.log('✅ Archivo scripts/output.json escrito.');
}

run();

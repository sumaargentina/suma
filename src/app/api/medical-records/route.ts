
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        console.log('📝 API Recibida para crear registro:', body);

        // Validación básica
        if (!body.patient_id || !body.doctor_id || !body.diagnosis) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios' },
                { status: 400 }
            );
        }

        // Usamos supabaseAdmin para ignorar RLS y asegurar la escritura
        const { data, error } = await supabaseAdmin
            .from('medical_records')
            .insert([body])
            .select()
            .single();

        if (error) {
            console.error('❌ Error Supabase Admin:', error);
            // Devolver el error exacto para depuración
            return NextResponse.json(
                { error: error.message, details: error },
                { status: 500 }
            );
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('💥 Error Servidor:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get('patient_id');

    if (!patient_id) {
        return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    try {
        console.log(`🔎 API GET Records para paciente: ${patient_id}`);
        console.log('🔑 Supabase Key Status:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Presente' : 'MISSING/UNDEFINED');

        const { data, error } = await supabaseAdmin
            .from('medical_records')
            .select(`
                *,
                doctors ( name, specialty )
            `)
            .eq('patient_id', patient_id)
            .order('visit_date', { ascending: false });

        if (data && data.length === 0) {
            console.warn('⚠️ No se encontraron registros. Corriendo diagnóstico de permisos...');
            // Check count global
            const { count } = await supabaseAdmin.from('medical_records').select('*', { count: 'exact', head: true });
            console.log(`📊 Registros totales en DB (desde API): ${count}`);
        }

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching records:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        console.log('Cities API: Fetching cities from settings...');

        const { data, error } = await supabaseAdmin
            .from('settings')
            .select('cities')
            .eq('id', 'main')
            .single();

        if (error) {
            console.error('Cities API error:', error);
            return NextResponse.json(
                { error: error.message, cities: [] },
                { status: 500 }
            );
        }

        const cities = data?.cities || [];
        console.log('Cities API: Found', cities.length, 'cities');

        return NextResponse.json({ cities });
    } catch (error) {
        console.error('Cities API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error', cities: [] },
            { status: 500 }
        );
    }
}

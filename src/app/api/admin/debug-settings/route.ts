import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Ver el estado actual de settings
export async function GET() {
    try {
        console.log('Debug Settings: Fetching current settings...');

        const { data, error } = await supabaseAdmin
            .from('settings')
            .select('*')
            .eq('id', 'main')
            .single();

        if (error) {
            console.error('Debug Settings error:', error);
            return NextResponse.json({
                success: false,
                error: error.message,
                data: null
            }, { status: 500 });
        }

        console.log('Debug Settings: Found settings', JSON.stringify(data, null, 2));

        return NextResponse.json({
            success: true,
            data: {
                id: data?.id,
                cities: data?.cities || [],
                citiesCount: (data?.cities || []).length,
                specialties: data?.specialties || [],
                specialtiesCount: (data?.specialties || []).length,
                coupons: data?.coupons || [],
                companyBankDetails: data?.company_bank_details || [],
                allFields: Object.keys(data || {})
            }
        });
    } catch (error) {
        console.error('Debug Settings error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// POST - Agregar ciudades de prueba
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, cities, specialties } = body;

        if (action === 'add_test_cities') {
            // Agregar ciudades de prueba
            const testCities = cities || [
                { name: 'Buenos Aires', subscriptionFee: 29000 },
                { name: 'Córdoba', subscriptionFee: 25000 },
                { name: 'Rosario', subscriptionFee: 24000 },
                { name: 'Mendoza', subscriptionFee: 23000 },
                { name: 'Mar del Plata', subscriptionFee: 22000 }
            ];

            const { data, error } = await supabaseAdmin
                .from('settings')
                .update({ cities: testCities })
                .eq('id', 'main')
                .select();

            if (error) {
                return NextResponse.json({
                    success: false,
                    error: error.message
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: `Added ${testCities.length} cities`,
                data: data
            });
        }

        if (action === 'add_test_specialties') {
            // Agregar especialidades de prueba
            const testSpecialties = specialties || [
                'Cardiología',
                'Dermatología',
                'Ginecología',
                'Medicina General',
                'Neurología',
                'Oftalmología',
                'Pediatría',
                'Psiquiatría',
                'Traumatología'
            ];

            const { data, error } = await supabaseAdmin
                .from('settings')
                .update({ specialties: testSpecialties })
                .eq('id', 'main')
                .select();

            if (error) {
                return NextResponse.json({
                    success: false,
                    error: error.message
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: `Added ${testSpecialties.length} specialties`,
                data: data
            });
        }

        if (action === 'reset_settings') {
            // Resetear a valores por defecto
            const defaultSettings = {
                cities: [
                    { name: 'Buenos Aires', subscriptionFee: 29000 },
                    { name: 'Córdoba', subscriptionFee: 25000 },
                    { name: 'Rosario', subscriptionFee: 24000 }
                ],
                specialties: [
                    'Cardiología',
                    'Dermatología',
                    'Ginecología',
                    'Medicina General',
                    'Neurología',
                    'Oftalmología',
                    'Pediatría'
                ],
                coupons: [],
                company_bank_details: [],
                company_expenses: [],
                timezone: 'America/Argentina/Buenos_Aires',
                currency: 'ARS'
            };

            const { data, error } = await supabaseAdmin
                .from('settings')
                .update(defaultSettings)
                .eq('id', 'main')
                .select();

            if (error) {
                return NextResponse.json({
                    success: false,
                    error: error.message
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: 'Settings reset to defaults',
                data: data
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Invalid action. Use: add_test_cities, add_test_specialties, or reset_settings'
        }, { status: 400 });

    } catch (error) {
        console.error('Debug Settings POST error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

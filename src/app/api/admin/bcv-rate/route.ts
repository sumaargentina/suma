import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

interface BcvResponse {
    promedio?: number;
    fechaActualizacion?: string;
    moneda?: string;
    nombre?: string;
}

// Función para obtener la tasa oficial del BCV desde servicios de alta disponibilidad
async function fetchOfficialBcvRate(): Promise<{ rate: number; date: string; source: string }> {
    // 1. Intentar primera fuente oficial (ve.dolarapi.com)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
            signal: controller.signal,
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data: BcvResponse = await res.json();
            if (data && typeof data.promedio === 'number' && data.promedio > 0) {
                return {
                    rate: Math.round(data.promedio * 100) / 100, // redondeo a 2 decimales
                    date: data.fechaActualizacion || new Date().toISOString(),
                    source: 'BCV Oficial (ve.dolarapi.com)'
                };
            }
        }
    } catch (err) {
        console.warn('Fallo consulta a ve.dolarapi.com, intentando respaldo...', err);
    }

    // 2. Intentar fuente de respaldo (pydolarvenezuela)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv', {
            signal: controller.signal,
            cache: 'no-store',
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const bcvPrice = data?.monitors?.usd?.price || data?.monitors?.bcv?.price;
            if (typeof bcvPrice === 'number' && bcvPrice > 0) {
                return {
                    rate: Math.round(bcvPrice * 100) / 100,
                    date: data?.datetime?.date || new Date().toISOString(),
                    source: 'BCV Oficial (pydolarve)'
                };
            }
        }
    } catch (err) {
        console.warn('Fallo respaldo pydolarve:', err);
    }

    throw new Error('No se pudo consultar la tasa oficial del BCV en este momento.');
}

// GET: Consulta la tasa oficial y la compara con la guardada en la base de datos
export async function GET() {
    try {
        // 1. Obtener la tasa configurada actualmente en settings
        const { data: settingsData, error: dbError } = await supabaseAdmin
            .from('settings')
            .select('bcv_rate, bcv_last_updated, exchange_rates')
            .eq('id', 'main')
            .single();

        if (dbError && dbError.code !== 'PGRST116') {
            console.error('Error al leer settings:', dbError);
        }

        const currentSystemRate = Number(settingsData?.bcv_rate || 65.50);
        const lastSystemUpdate = settingsData?.bcv_last_updated || null;

        // 2. Consultar la tasa oficial del BCV en vivo
        const official = await fetchOfficialBcvRate();

        // 3. Evaluar si difieren
        const diff = Math.abs(official.rate - currentSystemRate);
        const hasUpdate = diff >= 0.01;

        // 4. Obtener historial reciente de actualizaciones
        const { data: historyData } = await supabaseAdmin
            .from('bcv_rate_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        return NextResponse.json({
            success: true,
            currentSystemRate,
            lastSystemUpdate,
            officialRate: official.rate,
            officialDate: official.date,
            source: official.source,
            hasUpdate,
            diff: Math.round(diff * 100) / 100,
            history: historyData || []
        });
    } catch (error: any) {
        console.error('Error en /api/admin/bcv-rate:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al consultar la tasa del BCV'
        }, { status: 500 });
    }
}

// POST: Actualiza la tasa del sistema con la tasa oficial o una manual
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        let newRate: number;
        let source = body.source;

        if (body.rate && typeof body.rate === 'number' && body.rate > 0) {
            newRate = Math.round(body.rate * 100) / 100;
            if (!source) source = 'Ajuste Manual';
        } else {
            // Si no se envía rate, consultar la oficial en vivo y aplicarla
            const official = await fetchOfficialBcvRate();
            newRate = official.rate;
            if (!source) source = '1-Clic Oficial BCV';
        }

        const now = new Date().toISOString();

        // Obtener la tasa previa del sistema
        const { data: currentSettings } = await supabaseAdmin
            .from('settings')
            .select('bcv_rate')
            .eq('id', 'main')
            .single();

        const previousRate = currentSettings?.bcv_rate ? Number(currentSettings.bcv_rate) : null;

        // Actualizar en settings
        const { error } = await supabaseAdmin
            .from('settings')
            .update({
                bcv_rate: newRate,
                bcv_last_updated: now,
                exchange_rates: { VES: newRate, USD: 1.0 },
                currency: 'USD',
                updated_at: now
            })
            .eq('id', 'main');

        if (error) {
            throw error;
        }

        // Registrar en tabla de historial
        try {
            await supabaseAdmin
                .from('bcv_rate_history')
                .insert({
                    rate: newRate,
                    previous_rate: previousRate,
                    source: source,
                    updated_by: body.updatedBy || 'admin',
                    created_at: now
                });
        } catch (histError) {
            console.warn('No se pudo registrar en bcv_rate_history:', histError);
        }

        return NextResponse.json({
            success: true,
            updatedRate: newRate,
            previousRate,
            updatedAt: now,
            message: `Tasa BCV actualizada exitosamente a Bs. ${newRate.toFixed(2)}`
        });
    } catch (error: any) {
        console.error('Error al actualizar tasa en /api/admin/bcv-rate:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al guardar la nueva tasa'
        }, { status: 500 });
    }
}

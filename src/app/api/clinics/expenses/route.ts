import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';
import { sanitizeString, detectInjection } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

// GET - Obtener gastos de clínica
export async function GET(req: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Requiere autenticación
        const authResult = await requireAuth(req, ['clinic', 'laboratory', 'admin', 'secretary']);

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user } = authResult;
        const { searchParams } = new URL(req.url);
        const clinicId = searchParams.get('clinicId');

        if (!clinicId) {
            return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Verificar acceso a la clínica o laboratorio
        if ((user.role === 'clinic' || user.role === 'laboratory') && clinicId !== user.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        if (user.role === 'secretary' && clinicId !== user.clinicId && clinicId !== (user as any).laboratoryId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const { data, error } = await supabaseAdmin
            .from('clinic_expenses')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('date', { ascending: false });

        if (error) throw error;

        // Convert to camelCase
        const camelData = data.map(item => {
            const result: Record<string, unknown> = {};
            for (const key in item) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                result[camelKey] = item[key as keyof typeof item];
            }
            return result;
        });

        return NextResponse.json(camelData);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// POST - Crear gasto
export async function POST(req: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Requiere autenticación
        const authResult = await requireAuth(req, ['clinic', 'laboratory', 'admin', 'secretary']);

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user } = authResult;
        const body = await req.json();
        const clinicId = body.clinicId || body.clinic_id;
        const { description, amount, category, date } = body;

        if (!clinicId || !description || amount === undefined || !category || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Verificar acceso
        if ((user.role === 'clinic' || user.role === 'laboratory') && clinicId !== user.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // 🔐 SEGURIDAD: Detectar inyección
        if (detectInjection(JSON.stringify(body))) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        logSecurityEvent('EXPENSE_CREATED', { userId: user.id, clinicId });

        const { data, error } = await supabaseAdmin
            .from('clinic_expenses')
            .insert([{
                clinic_id: clinicId,
                description: sanitizeString(description),
                amount,
                category: sanitizeString(category),
                date
            }])
            .select()
            .single();

        if (error) throw error;

        // Convert to camelCase
        const result: Record<string, unknown> = {};
        for (const key in data) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = data[key as keyof typeof data];
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// PATCH - Actualizar gasto
export async function PATCH(req: NextRequest) {
    try {
        const authResult = await requireAuth(req, ['clinic', 'laboratory', 'admin', 'secretary']);
        if (authResult instanceof NextResponse) {
            return authResult;
        }
        const { user } = authResult;
        const { searchParams } = new URL(req.url);
        const body = await req.json();
        const id = searchParams.get('id') || body.id;

        if (!id) {
            return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
        }

        const { data: expense } = await supabaseAdmin
            .from('clinic_expenses')
            .select('clinic_id')
            .eq('id', id)
            .single();

        if (expense && (user.role === 'clinic' || user.role === 'laboratory') && expense.clinic_id !== user.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const updatePayload: Record<string, unknown> = {};
        if (body.description !== undefined) updatePayload.description = sanitizeString(body.description);
        if (body.amount !== undefined) updatePayload.amount = body.amount;
        if (body.category !== undefined) updatePayload.category = sanitizeString(body.category);
        if (body.date !== undefined) updatePayload.date = body.date;

        const { data, error } = await supabaseAdmin
            .from('clinic_expenses')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        const result: Record<string, unknown> = {};
        for (const key in data) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = data[key as keyof typeof data];
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// DELETE - Eliminar gasto
export async function DELETE(req: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Requiere autenticación
        const authResult = await requireAuth(req, ['clinic', 'laboratory', 'admin']);

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user } = authResult;
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Verificar propiedad del gasto
        const { data: expense } = await supabaseAdmin
            .from('clinic_expenses')
            .select('clinic_id')
            .eq('id', id)
            .single();

        if (expense && (user.role === 'clinic' || user.role === 'laboratory') && expense.clinic_id !== user.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        logSecurityEvent('EXPENSE_DELETED', { userId: user.id, expenseId: id });

        const { error } = await supabaseAdmin
            .from('clinic_expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

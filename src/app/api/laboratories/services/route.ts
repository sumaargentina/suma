import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const toCamelCase = (item: Record<string, any>) => {
    const camel: Record<string, any> = {};
    for (const key in item) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        camel[camelKey] = item[key];
    }
    return camel;
};

// GET /api/laboratories/services - Obtener servicios/exámenes de un laboratorio
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const laboratoryId = searchParams.get('laboratoryId');
        const serviceId = searchParams.get('id');

        let query = supabaseAdmin.from('laboratory_services').select('*');

        if (serviceId) {
            query = query.eq('id', serviceId);
            const { data, error } = await query.maybeSingle();
            if (error) throw error;
            if (!data) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
            return NextResponse.json(toCamelCase(data));
        }

        if (laboratoryId) {
            query = query.eq('laboratory_id', laboratoryId);
        }

        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;

        const formatted = (data || []).map(toCamelCase);
        return NextResponse.json(formatted);
    } catch (err: any) {
        console.error('Error in GET /api/laboratories/services:', err);
        return NextResponse.json({ error: err.message || 'Error al obtener servicios de laboratorio' }, { status: 500 });
    }
}

// POST /api/laboratories/services - Crear nuevo servicio o prueba de laboratorio
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            laboratoryId: rawLabId,
            laboratory_id,
            name,
            serviceCategory,
            category,
            price = 0,
            duration = 15,
            dailyCapacity = 50,
            description,
            preparationInstructions,
            preparation_info,
            resultsDeliveryTime = 'Mismo día',
            delivery_time,
            operatingHours,
            items,
            isActive = true
        } = body;

        const laboratoryId = rawLabId || laboratory_id;
        if (!laboratoryId || !name) {
            return NextResponse.json({ error: 'laboratoryId y name son requeridos' }, { status: 400 });
        }

        const now = new Date().toISOString();

        const insertData = {
            laboratory_id: laboratoryId,
            name: name.trim(),
            service_category: (serviceCategory || category || 'General').trim(),
            price: Number(price) || 0,
            duration: Number(duration) || 15,
            daily_capacity: Number(dailyCapacity) || 50,
            description: description || null,
            preparation_instructions: preparationInstructions || preparation_info || null,
            results_delivery_time: resultsDeliveryTime || delivery_time || null,
            operating_hours: operatingHours || null,
            is_active: isActive !== false,
            created_at: now
        };

        const { data, error } = await supabaseAdmin
            .from('laboratory_services')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('Error adding laboratory service:', error);
            throw error;
        }

        return NextResponse.json(toCamelCase(data));
    } catch (err: any) {
        console.error('Error in POST /api/laboratories/services:', err);
        return NextResponse.json({ error: err.message || 'Error al crear servicio' }, { status: 500 });
    }
}

// PATCH /api/laboratories/services - Actualizar servicio
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
        }

        const dbUpdates: Record<string, any> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
        if (updates.serviceCategory !== undefined) dbUpdates.service_category = updates.serviceCategory;
        if (updates.price !== undefined) dbUpdates.price = Number(updates.price);
        if (updates.duration !== undefined) dbUpdates.duration = Number(updates.duration);
        if (updates.dailyCapacity !== undefined) dbUpdates.daily_capacity = Number(updates.dailyCapacity);
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.preparationInstructions !== undefined) dbUpdates.preparation_instructions = updates.preparationInstructions;
        if (updates.resultsDeliveryTime !== undefined) dbUpdates.results_delivery_time = updates.resultsDeliveryTime;
        if (updates.operatingHours !== undefined) dbUpdates.operating_hours = updates.operatingHours;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

        const { data, error } = await supabaseAdmin
            .from('laboratory_services')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating laboratory service:', error);
            throw error;
        }

        return NextResponse.json(toCamelCase(data));
    } catch (err: any) {
        console.error('Error in PATCH /api/laboratories/services:', err);
        return NextResponse.json({ error: err.message || 'Error al actualizar servicio' }, { status: 500 });
    }
}

// DELETE /api/laboratories/services - Eliminar servicio
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('laboratory_services')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting laboratory service:', error);
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Error in DELETE /api/laboratories/services:', err);
        return NextResponse.json({ error: err.message || 'Error al eliminar servicio' }, { status: 500 });
    }
}

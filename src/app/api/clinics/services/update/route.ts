import { updateClinicService } from '@/lib/supabaseService';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request) {
    try {
        const data = await req.json();
        const { id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: 'Missing service ID' }, { status: 400 });
        }

        await updateClinicService(id, updateData);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error updating service:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

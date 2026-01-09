import { updateClinicBranch } from '@/lib/supabaseService';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request) {
    try {
        const data = await req.json();
        const { id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: 'Missing branch ID' }, { status: 400 });
        }

        await updateClinicBranch(id, updateData);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error updating branch:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

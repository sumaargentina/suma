import { deleteClinicBranch } from '@/lib/supabaseService';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing branch ID' }, { status: 400 });
        }

        await deleteClinicBranch(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error deleting branch:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

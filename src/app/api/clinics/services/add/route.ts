import { addClinicService } from '@/lib/supabaseService';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const result = await addClinicService(data);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('API Error adding service:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

import { addClinic } from '@/lib/supabaseService';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const id = await addClinic(data);
        return NextResponse.json({ id });
    } catch (error: any) {
        console.error('API Error adding clinic:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            details: error
        }, { status: 500 });
    }
}

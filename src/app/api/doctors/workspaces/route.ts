import { NextRequest, NextResponse } from 'next/server';
import { getDoctorWorkspaces, addDoctorWorkspace, updateDoctorWorkspace } from '@/lib/supabaseService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const doctorId = searchParams.get('doctorId');

        if (!doctorId) {
            return NextResponse.json({ error: 'Missing doctorId' }, { status: 400 });
        }

        const workspaces = await getDoctorWorkspaces(doctorId);
        return NextResponse.json(workspaces);
    } catch (error: any) {
        console.error('API Error in GET /api/doctors/workspaces:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body.doctorId || !body.workspaceType) {
            return NextResponse.json({ error: 'Missing required workspace fields' }, { status: 400 });
        }

        const newWorkspace = await addDoctorWorkspace(body);
        return NextResponse.json(newWorkspace, { status: 201 });
    } catch (error: any) {
        console.error('API Error in POST /api/doctors/workspaces:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { workspaceId, ...updates } = body;

        if (!workspaceId) {
            return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
        }

        const success = await updateDoctorWorkspace(workspaceId, updates);
        return NextResponse.json({ success });
    } catch (error: any) {
        console.error('API Error in PATCH /api/doctors/workspaces:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

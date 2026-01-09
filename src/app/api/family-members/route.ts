import { NextRequest, NextResponse } from 'next/server';
import { getFamilyMembers, addFamilyMember } from '@/lib/supabaseService';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const patientId = searchParams.get('patientId');

        if (!patientId) {
            return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
        }

        const members = await getFamilyMembers(patientId);
        return NextResponse.json(members);
    } catch (error) {
        console.error('Error fetching family members:', error);
        return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        if (!data.accountHolderId) {
            return NextResponse.json({ error: 'accountHolderId is required' }, { status: 400 });
        }

        if (!data.firstName || !data.lastName) {
            return NextResponse.json({ error: 'firstName and lastName are required' }, { status: 400 });
        }

        if (!data.birthDate) {
            return NextResponse.json({ error: 'birthDate is required' }, { status: 400 });
        }

        if (!data.relationship) {
            return NextResponse.json({ error: 'relationship is required' }, { status: 400 });
        }

        const newMember = await addFamilyMember(data);
        return NextResponse.json(newMember, { status: 201 });
    } catch (error) {
        console.error('Error adding family member:', error);
        const message = error instanceof Error ? error.message : 'Failed to add family member';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

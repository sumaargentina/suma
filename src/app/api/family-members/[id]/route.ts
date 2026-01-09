import { NextRequest, NextResponse } from 'next/server';
import { getFamilyMember, updateFamilyMember, deleteFamilyMember } from '@/lib/supabaseService';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const member = await getFamilyMember(params.id);

        if (!member) {
            return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
        }

        return NextResponse.json(member);
    } catch (error) {
        console.error('Error fetching family member:', error);
        return NextResponse.json({ error: 'Failed to fetch family member' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const data = await request.json();

        await updateFamilyMember(params.id, data);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating family member:', error);
        const message = error instanceof Error ? error.message : 'Failed to update family member';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await deleteFamilyMember(params.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting family member:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete family member';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

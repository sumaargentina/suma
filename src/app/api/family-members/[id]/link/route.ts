import { NextRequest, NextResponse } from 'next/server';
// Force recompile check
import { linkFamilyMemberToPatient, findUserByEmail, getFamilyMember } from '@/lib/supabaseService';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Helper simple para este endpoint si toCamelCase no está exportado
const mapPatientData = (data: any) => ({
    id: data.id,
    name: data.name,
    email: data.email,
    role: 'patient',
    cedula: data.cedula
});

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const identifier = String(body.identifier || ''); // ensure string

        console.log(`🔗 Linking family member ${params.id} to identifier: ${identifier}`);

        if (!identifier.trim()) {
            return NextResponse.json({ error: 'Email o DNI es requerido' }, { status: 400 });
        }

        // 1. Verify family member exists and belongs to requesting user (TODO: Add auth check here if not handled by middleware)
        const familyMember = await getFamilyMember(params.id);
        if (!familyMember) {
            return NextResponse.json({ error: 'Familiar no encontrado' }, { status: 404 });
        }

        // 2. Find user (by email or cedula)
        let user: any = null;

        if (identifier.includes('@')) {
            // Search by email (checks all roles)
            user = await findUserByEmail(identifier.trim());
        } else {
            // Search by cedula in patients table
            // Try to handle format variations (with/without dots)
            const originalInput = identifier.trim();
            const cleanInput = originalInput.replace(/\./g, '');

            let query = supabaseAdmin.from('patients').select('*');

            console.log(`Searching patient with cedula: "${originalInput}" or "${cleanInput}"`);

            if (originalInput !== cleanInput) {
                // If input has dots, search for both: exact match OR cleaned version
                // This covers:
                // 1. User inputs "12.345.678", DB has "12345678" -> Matches cleaned
                // 2. User inputs "12.345.678", DB has "12.345.678" -> Matches original
                query = query.or(`cedula.eq.${originalInput},cedula.eq.${cleanInput}`);
            } else {
                // Also try to match possible formatted version in DB if user inputs plain, 
                // although storing formatted is discouraged.
                // For now, simple exact match on cleaned input is safest if we assume DB stores mostly cleaned or exact.
                // But let's just search for what user sent if no dots.
                query = query.eq('cedula', originalInput);
            }

            const { data, error } = await query.limit(1);

            if (error) {
                console.error('Error searching patient by cedula:', error);
            } else {
                console.log('Search result:', data ? `Found ${data.length} records` : 'No data');
            }

            if (data && data.length > 0) {
                user = mapPatientData(data[0]);
                console.log('User matched:', user.id);
            } else {
                console.log('User NOT found by cedula');
            }
        }

        if (!user) {
            return NextResponse.json({
                error: `No existe usuario registrado con DNI o Email: "${identifier}". Verifica que el paciente tenga este dato cargado en su perfil.`
            }, { status: 404 });
        }

        if (user.role !== 'patient') {
            return NextResponse.json({ error: 'La cuenta encontrada no corresponde a un perfil de paciente (role=' + user.role + ').' }, { status: 400 });
        }

        if (user.id === familyMember.accountHolderId) {
            return NextResponse.json({ error: 'No puedes vincular al familiar con tu propia cuenta principal.' }, { status: 400 });
        }

        // 3. Link
        await linkFamilyMemberToPatient(params.id, user.id);

        return NextResponse.json({
            success: true,
            linkedTo: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error linking family member:', error);
        const message = error instanceof Error ? error.message : 'Error al vincular cuenta';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

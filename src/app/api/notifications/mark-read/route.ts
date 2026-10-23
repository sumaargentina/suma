import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            role,
            ticketIds = [],
            paymentIds = [],
            doctorIds = [],
            appointmentIds = [],
            sellerPaymentIds = [],
        } = body;

        const promises: PromiseLike<unknown>[] = [];

        if (role === 'admin') {
            if (Array.isArray(ticketIds) && ticketIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('support_tickets').update({ read_by_admin: true }).in('id', ticketIds)
                );
            }
            if (Array.isArray(paymentIds) && paymentIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('doctor_payments').update({ read_by_admin: true }).in('id', paymentIds)
                );
            }
            if (Array.isArray(doctorIds) && doctorIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('doctors').update({ read_by_admin: true }).in('id', doctorIds)
                );
            }
        } else if (role === 'doctor') {
            if (Array.isArray(appointmentIds) && appointmentIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('appointments').update({ read_by_doctor: true }).in('id', appointmentIds)
                );
            }
            if (Array.isArray(paymentIds) && paymentIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('doctor_payments').update({ read_by_doctor: true }).in('id', paymentIds)
                );
            }
            if (Array.isArray(ticketIds) && ticketIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('support_tickets').update({ read_by_doctor: true }).in('id', ticketIds)
                );
            }
        } else if (role === 'seller') {
            if (Array.isArray(doctorIds) && doctorIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('doctors').update({ read_by_seller: true }).in('id', doctorIds)
                );
            }
            if (Array.isArray(sellerPaymentIds) && sellerPaymentIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('seller_payments').update({ read_by_seller: true }).in('id', sellerPaymentIds)
                );
            }
            if (Array.isArray(ticketIds) && ticketIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('support_tickets').update({ read_by_seller: true }).in('id', ticketIds)
                );
            }
        } else if (role === 'patient') {
            if (Array.isArray(appointmentIds) && appointmentIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('appointments').update({ read_by_patient: true }).in('id', appointmentIds)
                );
            }
        } else if (role === 'clinic' || role === 'secretary') {
            if (Array.isArray(appointmentIds) && appointmentIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('appointments').update({ read_by_doctor: true }).in('id', appointmentIds)
                );
            }
            if (Array.isArray(ticketIds) && ticketIds.length > 0) {
                promises.push(
                    supabaseAdmin.from('support_tickets').update({ read_by_clinic: true }).in('id', ticketIds)
                );
            }
        }

        await Promise.all(promises);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in POST /api/notifications/mark-read:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

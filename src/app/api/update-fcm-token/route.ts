import { NextRequest, NextResponse } from 'next/server';

// Endpoint desactivado temporalmente por migración a Supabase
// TODO: Implementar gestión de tokens FCM con Supabase

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Servicio de tokens FCM no disponible temporalmente' },
    { status: 503 }
  );
}
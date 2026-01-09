import { NextRequest, NextResponse } from 'next/server';

// Endpoint desactivado temporalmente por migración a Supabase
// TODO: Implementar notificaciones con Supabase Edge Functions o servicio externo

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Servicio de notificaciones no disponible temporalmente' },
    { status: 503 }
  );
}
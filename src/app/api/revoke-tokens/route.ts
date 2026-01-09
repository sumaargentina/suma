import { NextRequest, NextResponse } from 'next/server';

// Endpoint desactivado por migración a Supabase
// Supabase maneja la revocación de sesiones de forma diferente

export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true });
}
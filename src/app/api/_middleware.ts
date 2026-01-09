import { NextRequest, NextResponse } from 'next/server';

// Middleware simplificado para migración a Supabase
// TODO: Implementar validación de token de Supabase si es necesario para rutas protegidas

export async function middleware(request: NextRequest) {
  // Permitir todo temporalmente o implementar validación JWT de Supabase
  return NextResponse.next();
}
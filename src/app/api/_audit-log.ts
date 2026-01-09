// Audit log desactivado temporalmente por migración a Supabase
// TODO: Implementar logs de auditoría en Supabase

export async function saveAuditLog({ userId, email, role, ip, action, details, result, message }: {
  userId: string;
  email?: string;
  role?: string;
  ip?: string;
  action: string;
  details?: unknown;
  result: 'success' | 'error';
  message?: string;
}) {
  // No-op
  console.log('Audit log (skipped):', { action, userId, result });
}
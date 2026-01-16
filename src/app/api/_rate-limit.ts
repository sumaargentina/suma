/**
 * SEGURIDAD: Rate Limiting para proteger contra ataques de fuerza bruta y DoS
 * Implementación en memoria (para producción usar Redis)
 */

// Configuración de límites por tipo de ruta
const RATE_LIMITS = {
  default: { windowMs: 60 * 1000, maxRequests: 60 },      // 60 req/min general
  auth: { windowMs: 60 * 1000, maxRequests: 5 },          // 5 req/min para login
  sensitive: { windowMs: 60 * 1000, maxRequests: 10 },    // 10 req/min para operaciones sensibles
  public: { windowMs: 60 * 1000, maxRequests: 100 },      // 100 req/min para rutas públicas
};

type RateLimitType = keyof typeof RATE_LIMITS;

// Estructura: { key: [timestamps] }
const requestsMap: Record<string, number[]> = {};

// Limpiar entradas antiguas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const key in requestsMap) {
    requestsMap[key] = requestsMap[key].filter(ts => now - ts < 300000);
    if (requestsMap[key].length === 0) {
      delete requestsMap[key];
    }
  }
}, 300000);

/**
 * Verifica si una petición excede el rate limit
 * @param key - Identificador único (IP + userId)
 * @param type - Tipo de rate limit a aplicar
 * @returns { allowed: boolean, remaining: number, resetMs: number }
 */
export function checkRateLimit(key: string, type: RateLimitType = 'default'): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const { windowMs, maxRequests } = RATE_LIMITS[type];
  const now = Date.now();

  if (!requestsMap[key]) {
    requestsMap[key] = [];
  }

  // Eliminar timestamps fuera de la ventana
  requestsMap[key] = requestsMap[key].filter(ts => now - ts < windowMs);

  const remaining = Math.max(0, maxRequests - requestsMap[key].length);
  const oldestRequest = requestsMap[key][0] || now;
  const resetMs = oldestRequest + windowMs - now;

  if (requestsMap[key].length >= maxRequests) {
    return { allowed: false, remaining: 0, resetMs };
  }

  requestsMap[key].push(now);
  return { allowed: true, remaining: remaining - 1, resetMs };
}

/**
 * Función simple de rate limit (retrocompatible)
 */
export function rateLimit(key: string): boolean {
  return checkRateLimit(key, 'default').allowed;
}

/**
 * Genera una clave de rate limit desde IP y userId
 */
export function getRateLimitKey(ip: string | null, userId?: string): string {
  const ipPart = ip || 'unknown';
  const userPart = userId || 'anonymous';
  return `${ipPart}:${userPart}`;
}

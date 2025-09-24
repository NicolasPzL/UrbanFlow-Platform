// middlewares/rateLimiter.js
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter para endpoints de autenticación
 * Protege contra ataques de fuerza bruta en login
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por IP en 15 minutos
  message: {
    ok: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
      retryAfter: '15 minutos'
    }
  },
  standardHeaders: true, // Incluir headers de rate limit en la respuesta
  legacyHeaders: false, // No incluir headers X-RateLimit-*
  skipSuccessfulRequests: true, // No contar requests exitosos
  keyGenerator: (req) => {
    // Usar IP + correo para identificar intentos de login
    return `${req.ip}-${req.body?.correo || 'unknown'}`;
  }
});

/**
 * Rate limiter para endpoints de registro
 * Protege contra spam de registros
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 registros por IP en 1 hora
  message: {
    ok: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.',
      retryAfter: '1 hora'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.ip}-register`;
  }
});

/**
 * Rate limiter general para API
 * Protege contra abuso general de la API
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP en 15 minutos
  message: {
    ok: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas peticiones. Intenta de nuevo más tarde.',
      retryAfter: '15 minutos'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Contar todos los requests
  keyGenerator: (req) => {
    // Usar IP + user ID si está autenticado
    const userId = req.user?.id || 'anonymous';
    return `${req.ip}-${userId}`;
  }
});

/**
 * Rate limiter estricto para operaciones administrativas
 * Para endpoints que requieren rol de administrador
 */
export const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 operaciones admin por IP en 5 minutos
  message: {
    ok: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas operaciones administrativas. Intenta de nuevo en 5 minutos.',
      retryAfter: '5 minutos'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usar IP + user ID del admin
    const userId = req.user?.id || 'unknown';
    return `${req.ip}-admin-${userId}`;
  }
});

/**
 * Rate limiter para endpoints de datos sensibles
 * Para mediciones, sensores, etc.
 */
export const dataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // máximo 30 requests por IP en 1 minuto
  message: {
    ok: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas consultas de datos. Intenta de nuevo en 1 minuto.',
      retryAfter: '1 minuto'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    return `${req.ip}-data-${userId}`;
  }
});

/**
 * Rate limiter para endpoints públicos (mapa, etc.)
 * Más permisivo para usuarios no autenticados
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por IP en 15 minutos
  message: {
    ok: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas peticiones al mapa público. Intenta de nuevo más tarde.',
      retryAfter: '15 minutos'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.ip}-public`;
  }
});

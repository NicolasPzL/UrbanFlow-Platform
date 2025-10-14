// middlewares/auth.js (ESM compatible)
import authConfig from '../config/auth.js';
const {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  accessCookieOptions,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = authConfig;

/** Extrae token de cookie o encabezado Authorization */
function getTokenFromReq(req) {
  const cookieTok = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieTok) return cookieTok;

  const hdr = req.headers?.authorization || ''
  const [type, tok] = hdr.split(' ');
  if (type?.toLowerCase() === 'bearer' && tok) return tok;

  return null;
}

/** Adjunta usuario al request si el token es válido (no obliga auth) */
async function optionalAuth(req, _res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) return next();
    const payload = verifyAccessToken(token);
    req.user = payload; // { id, email, role, ... }
    return next();
  } catch (_err) {
    // si falla, seguimos sin user
    return next();
  }
}

/**
 * Protege la ruta. Si el access token expiró pero hay refresh válido,
 * emite uno nuevo y continúa.
 */
async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) throw new Error('NO_ACCESS');

    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
      return next();
    } catch (err) {
      // Intento de rotación con refresh si el error es por expiración
      const refreshTok = req.cookies?.[REFRESH_COOKIE_NAME];
      if (!refreshTok) throw err;

      const refreshPayload = verifyRefreshToken(refreshTok);
      // Re-emite access (y opcional: refresca refresh)
      const newAccess = signAccessToken(stripIatExp(refreshPayload));
      res.cookie(AUTH_COOKIE_NAME, newAccess, accessCookieOptions);

      // (opcional) rotación del refresh para sliding sessions
      const newRefresh = signRefreshToken(stripIatExp(refreshPayload));
      res.cookie(REFRESH_COOKIE_NAME, newRefresh, refreshCookieOptions);

      req.user = stripIatExp(refreshPayload);
      return next();
    }
  } catch (_err) {
    return res.status(401).json({ error: 'No autenticado' });
  }
}

/** Autoriza por roles: requireRole('admin'), requireRole('admin','operator') */
function requireRole(...roles) {
  // normaliza roles requeridos a minúsculas
  const required = roles.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log('Usuario autenticado:', req.user);

    // soporta multi-rol: req.user.roles (array) + rol primario
    const primary = (req.user.rol || req.user.role || '').toString().toLowerCase();
    const extra = Array.isArray(req.user.roles) ? req.user.roles.map(r => String(r).toLowerCase()) : [];
    const userRoles = primary ? Array.from(new Set([primary, ...extra])) : extra;

    const ok = required.length === 0 || userRoles.some(r => required.includes(r));

    if (!ok) {
      return res.status(403).json({
        error: 'No autorizado',
        userRoles,
        required,
      });
    }

    next();
  };
}


/** Helpers para login/logout */
function setAuthCookies(res, payload) {
  const access = signAccessToken(payload);
  const refresh = signRefreshToken(payload);
  res.cookie(AUTH_COOKIE_NAME, access, accessCookieOptions);
  res.cookie(REFRESH_COOKIE_NAME, refresh, refreshCookieOptions);
}

function clearAuthCookies(res) {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
}

/** Quita metacampos de JWT antes de re-firmar */
function stripIatExp(obj) {
  // evita re-firmar con iat/exp previos
  const { iat, exp, nbf, ...rest } = obj || {};
  return rest;
}

export {
  optionalAuth,
  requireAuth,
  requireRole,
  setAuthCookies,
  clearAuthCookies,
};

export default {
  optionalAuth,
  requireAuth,
  requireRole,
  setAuthCookies,
  clearAuthCookies,
};

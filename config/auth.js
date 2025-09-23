// config/auth.js (ESM)
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

/** Entorno */
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

/** JWT (Access) */
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_.ENV';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_ALG = process.env.JWT_ALG || 'HS256';

/** JWT (Refresh) — opcional */
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET || JWT_SECRET;
const REFRESH_JWT_EXPIRES_IN = process.env.REFRESH_JWT_EXPIRES_IN || '7d';

/** Cookies */
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'access_token';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || (IS_PROD ? 'Strict' : 'Lax'); // 'Strict'|'Lax'|'None'
const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : IS_PROD; // true en producción por defecto

// Max-Age en ms (por defecto 1h y 7d). Puedes sobreescribir con envs.
const ACCESS_COOKIE_MAX_AGE =
  process.env.ACCESS_COOKIE_MAX_AGE
    ? Number(process.env.ACCESS_COOKIE_MAX_AGE)
    : 60 * 60 * 1000;

const REFRESH_COOKIE_MAX_AGE =
  process.env.REFRESH_COOKIE_MAX_AGE
    ? Number(process.env.REFRESH_COOKIE_MAX_AGE)
    : 7 * 24 * 60 * 60 * 1000;

/** Opciones base para cookies */
const accessCookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: COOKIE_SAME_SITE,
  domain: COOKIE_DOMAIN,
  path: '/',
  maxAge: ACCESS_COOKIE_MAX_AGE,
};

const refreshCookieOptions = {
  ...accessCookieOptions,
  maxAge: REFRESH_COOKIE_MAX_AGE,
};

/** Helpers JWT */
function signAccessToken(payload = {}, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: JWT_ALG,
    expiresIn: JWT_EXPIRES_IN,
    ...options,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALG] });
}

function signRefreshToken(payload = {}, options = {}) {
  return jwt.sign(payload, REFRESH_JWT_SECRET, {
    algorithm: JWT_ALG,
    expiresIn: REFRESH_JWT_EXPIRES_IN,
    ...options,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_JWT_SECRET, { algorithms: [JWT_ALG] });
}

export {
  // Env / flags
  NODE_ENV,
  IS_PROD,

  // JWT
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_ALG,

  // Refresh
  REFRESH_JWT_SECRET,
  REFRESH_JWT_EXPIRES_IN,

  // Cookies
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  accessCookieOptions,
  refreshCookieOptions,

  // Helpers
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};

export default {
  NODE_ENV,
  IS_PROD,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_ALG,
  REFRESH_JWT_SECRET,
  REFRESH_JWT_EXPIRES_IN,
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  accessCookieOptions,
  refreshCookieOptions,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};

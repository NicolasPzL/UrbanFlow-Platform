// utils/jwtHelper.js - Utilidades para manejo de JWT
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_.ENV';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET || JWT_SECRET;
const REFRESH_JWT_EXPIRES_IN = process.env.REFRESH_JWT_EXPIRES_IN || '7d';

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'access_token';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';

/**
 * Genera un token JWT
 * @param {Object} payload - Datos a incluir en el token
 * @param {Object} options - Opciones adicionales
 * @returns {string} Token JWT
 */
export function signToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    ...options
  });
}

/**
 * Genera un refresh token
 * @param {Object} payload - Datos a incluir en el token
 * @param {Object} options - Opciones adicionales
 * @returns {string} Refresh token JWT
 */
export function signRefreshToken(payload, options = {}) {
  return jwt.sign(payload, REFRESH_JWT_SECRET, {
    expiresIn: REFRESH_JWT_EXPIRES_IN,
    ...options
  });
}

/**
 * Verifica un token JWT
 * @param {string} token - Token a verificar
 * @returns {Object} Payload decodificado
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Verifica un refresh token
 * @param {string} token - Refresh token a verificar
 * @returns {Object} Payload decodificado
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_JWT_SECRET);
}

/**
 * Configura cookies de autenticación
 * @param {Object} res - Objeto response de Express
 * @param {string} accessToken - Token de acceso
 * @param {string} refreshToken - Token de refresh (opcional)
 */
export function setAuthCookie(res, accessToken, refreshToken = null) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
  };

  res.cookie(AUTH_COOKIE_NAME, accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000 // 1 hora
  });

  if (refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });
  }
}

/**
 * Limpia cookies de autenticación
 * @param {Object} res - Objeto response de Express
 */
export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
}

/**
 * Extrae token del header Authorization
 * @param {Object} req - Objeto request de Express
 * @returns {string|null} Token extraído o null
 */
export function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [type, token] = authHeader.split(' ');
  return type?.toLowerCase() === 'bearer' ? token : null;
}

/**
 * Extrae token de las cookies
 * @param {Object} req - Objeto request de Express
 * @returns {string|null} Token extraído o null
 */
export function getTokenFromCookie(req) {
  return req.cookies?.[AUTH_COOKIE_NAME] || null;
}

/**
 * Genera un token JWT para reset de contraseña
 * @param {Object} payload - Datos a incluir (debe incluir sub, pr: 'pwd_reset', pwd: hash del password_hash)
 * @param {Object} options - Opciones adicionales
 * @returns {string} Token JWT de reset
 */
export function signPasswordResetToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m', // 15 minutos para reset
    ...options
  });
}
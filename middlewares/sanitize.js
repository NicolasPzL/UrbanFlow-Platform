// middlewares/sanitize.js
import { body, sanitizeBody } from 'express-validator';
import xss from 'xss';

/**
 * Middleware de sanitización general
 * Escapa HTML y limpia datos de entrada
 */
export const sanitizeInput = [
  sanitizeBody('*').escape(), // Escapa caracteres HTML peligrosos
  sanitizeBody('correo').normalizeEmail(), // Normaliza emails
  sanitizeBody('nombre').trim(), // Elimina espacios al inicio y final
  sanitizeBody('codigo_interno').trim().toUpperCase(), // Convierte a mayúsculas
];

/**
 * Sanitización específica para datos de usuario
 */
export const sanitizeUserData = [
  sanitizeBody('nombre')
    .trim()
    .escape()
    .customSanitizer(value => value.replace(/[<>]/g, '')),
  
  sanitizeBody('correo')
    .normalizeEmail()
    .trim(),
  
  sanitizeBody('contrasena')
    .trim(), // No escapar contraseñas, solo limpiar espacios
];

/**
 * Sanitización para datos de cabinas
 */
export const sanitizeCabinaData = [
  sanitizeBody('codigo_interno')
    .trim()
    .toUpperCase()
    .escape(),
  
  sanitizeBody('estado_actual')
    .trim()
    .toLowerCase(),
];

/**
 * Función para sanitizar strings manualmente
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return xss(str.trim(), {
    whiteList: {}, // No permitir ningún tag HTML
    stripIgnoreTag: true, // Eliminar tags no permitidos
    stripIgnoreTagBody: ['script'] // Eliminar contenido de scripts
  });
};

/**
 * Función para sanitizar objetos completos
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Middleware para sanitizar parámetros de consulta
 */
export const sanitizeQuery = (req, res, next) => {
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
};

/**
 * Middleware para sanitizar el cuerpo de la petición
 */
export const sanitizeBody = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

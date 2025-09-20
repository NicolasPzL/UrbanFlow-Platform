// utils/password.js - Utilidades para manejo de contraseñas
import bcrypt from 'bcryptjs';

/**
 * Genera hash de una contraseña
 * @param {string} password - Contraseña en texto plano
 * @param {number} saltRounds - Rounds de salt (default: 12)
 * @returns {Promise<string>} Hash de la contraseña
 */
export async function hashPassword(password, saltRounds = 12) {
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compara una contraseña con su hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hash - Hash almacenado
 * @returns {Promise<boolean>} True si coinciden
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Valida fortaleza de contraseña
 * @param {string} password - Contraseña a validar
 * @returns {Object} Resultado de validación
 */
export function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isValid = password.length >= minLength && 
                  hasUpperCase && 
                  hasLowerCase && 
                  hasNumbers && 
                  hasSpecialChar;

  return {
    isValid,
    errors: [
      ...(password.length < minLength ? ['Debe tener al menos 8 caracteres'] : []),
      ...(!hasUpperCase ? ['Debe tener al menos una mayúscula'] : []),
      ...(!hasLowerCase ? ['Debe tener al menos una minúscula'] : []),
      ...(!hasNumbers ? ['Debe tener al menos un número'] : []),
      ...(!hasSpecialChar ? ['Debe tener al menos un carácter especial'] : [])
    ]
  };
}

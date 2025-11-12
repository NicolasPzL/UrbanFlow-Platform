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
 * Genera una contraseña temporal segura
 * @param {number} length - Longitud de la contraseña (default: 14)
 * @returns {string} Contraseña temporal generada
 */
export function generateTemporaryPassword(length = 14) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const allChars = uppercase + lowercase + numbers;
  
  // Asegurar al menos un carácter de cada tipo (sin símbolos)
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // Completar el resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mezclar caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
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

  const isValid = password.length >= minLength && 
                  hasUpperCase && 
                  hasLowerCase && 
                  hasNumbers;

  return {
    isValid,
    errors: [
      ...(password.length < minLength ? ['Debe tener al menos 8 caracteres'] : []),
      ...(!hasUpperCase ? ['Debe tener al menos una mayúscula'] : []),
      ...(!hasLowerCase ? ['Debe tener al menos una minúscula'] : []),
      ...(!hasNumbers ? ['Debe tener al menos un número'] : [])
    ]
  };
}

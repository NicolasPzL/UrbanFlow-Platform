// Clase personalizada para manejo de errores de la aplicación
export default class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', details = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Mantener el stack trace correcto
    Error.captureStackTrace(this, this.constructor);
  }
}
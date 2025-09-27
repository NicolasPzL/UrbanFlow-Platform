export default function errorHandler(err, req, res, _next) {
  // Log para observabilidad (puedes integrar logger real aquí)
  console.error('Error:', err);

  // Normalizar status y payload
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'APP_ERROR');
  const message = err.message || 'Error interno del servidor';
  const details = err.details ?? null;

  // Respuesta alineada al estándar del proyecto
  const body = {
    ok: false,
    error: { code, message, details },
  };

  // Adjuntar stack solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}
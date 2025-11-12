import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { log as logToDatabase } from '../models/auditoriaModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.resolve(__dirname, '../logs');
const auditFile = path.join(logsDir, 'auditoria.log');

function ensureLogDirectory() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

function safeAppend(payload) {
  try {
    ensureLogDirectory();
    fs.appendFileSync(auditFile, `${JSON.stringify(payload)}\n`, { encoding: 'utf8' });
  } catch (err) {
    console.warn('[AUDIT] No se pudo escribir en auditoria.log:', err.message);
  }
}

/**
 * Registra un evento de auditoría tanto en archivo como en base de datos.
 * @param {Object} options
 * @param {string} options.event - Código del evento (ej. AUTH_LOGIN, USER_CREATE)
 * @param {number|null} [options.actorId] - ID del usuario que ejecuta la acción, si está disponible
 * @param {string|null} [options.actorEmail] - Correo del actor
 * @param {string|null} [options.ip] - Dirección IP de origen
 * @param {Object} [options.metadata] - Información adicional serializable
 */
export async function auditEvent({ event, actorId = null, actorEmail = null, ip = null, metadata = {} }) {
  const at = new Date().toISOString();
  const metadataObject = metadata && typeof metadata === 'object' ? metadata : {};
  const logPayload = {
    event,
    actor: actorId,
    actorId,
    actorEmail,
    ip,
    at,
    ...metadataObject,
  };

  console.log('[AUDIT]', JSON.stringify(logPayload));
  safeAppend(logPayload);

  try {
    await logToDatabase({
      usuario_id: actorId,
      accion: event,
      detalles: { ...metadataObject, actor: actorId, actorEmail, ip, at },
    });
  } catch (err) {
    console.warn('[AUDIT] Error registrando en base de datos:', err.message);
  }
}
// middlewares/audit.js - Versión simplificada para Semana 2
// Solo registra en consola, sin base de datos

/**
 * Middleware de auditoría simplificado para desarrollo
 * Registra acciones en consola (sin base de datos)
 */
export const auditMiddleware = (action, resource = null) => {
  return (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Interceptar la respuesta para registrar el resultado
    res.send = function(data) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Registrar en consola (simplificado para Semana 2)
      const auditData = {
        timestamp: new Date().toISOString(),
        action: action,
        resource: resource || req.originalUrl,
        method: req.method,
        userId: req.user?.id || 'anonymous',
        userEmail: req.user?.email || 'N/A',
        userRole: req.user?.role || 'N/A',
        ip: req.ip,
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        duration: `${duration}ms`
      };
      
      // Log en consola con colores
      const statusColor = auditData.success ? '\x1b[32m' : '\x1b[31m'; // Verde o Rojo
      const resetColor = '\x1b[0m';
      
      console.log(`${statusColor}[AUDIT]${resetColor} ${auditData.action} - ${auditData.resource} (${auditData.method}) - ${auditData.userEmail} - ${auditData.statusCode} - ${auditData.duration}`);
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middlewares específicos para diferentes tipos de acciones
 * Versión simplificada para Semana 2
 */

// Auditoría de autenticación
export const auditAuth = auditMiddleware('AUTH', 'authentication');

// Auditoría de gestión de usuarios
export const auditUserManagement = auditMiddleware('USER_MANAGEMENT', 'users');

// Auditoría de gestión de roles
export const auditRoleManagement = auditMiddleware('ROLE_MANAGEMENT', 'roles');

// Auditoría de acceso a dashboard
export const auditDashboardAccess = auditMiddleware('DASHBOARD_ACCESS', 'dashboard');

// Auditoría de acceso a mapa
export const auditMapAccess = auditMiddleware('MAP_ACCESS', 'map');

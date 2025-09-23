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

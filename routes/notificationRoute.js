const express = require('express');
const { notificationController } = require('../controllers');
const router = express.Router();

router.get('/:usuarioId', notificationController.listarNotificacionesUsuario);
router.post('/', notificationController.crearNotificacion);
router.delete('/:id', notificationController.eliminarNotificacion);

module.exports = router;

/**
 * notificationRoute.js
 * 
 * @description Rutas para el sistema de notificaciones y alertas de UrbanFlow
 * @version 1.0
 * 
 * @requires express
 * @requires ../controllers/notificationController
 * 
 * @route GET /notificaciones/:usuarioId
 * @description Obtiene el listado de notificaciones para un usuario específico.
 * @access Autenticado (debe coincidir usuarioId con usuario autenticado o ser admin)
 * @param {string} usuarioId - ID del usuario cuyas notificaciones se consultan
 * @returns {Array} Lista de notificaciones del usuario
 * 
 * @route POST /notificaciones/
 * @description Crea una nueva notificación en el sistema. Puede ser automática (por fallos 
 *              detectados) o manual (comunicados administrativos).
 * @access Administradores o sistema automático
 * @body {Object} Notificación - Datos de la notificación a crear
 * @returns {Object} Notificación creada
 * 
 * @route DELETE /notificaciones/:id
 * @description Elimina una notificación específica (ej: cuando se marca como leída).
 * @access Autenticado (usuario propietario o admin)
 * @param {string} id - ID de la notificación a eliminar
 * @returns {Object} Confirmación de eliminación
 * 
 * @example
 * // Obtener notificaciones del usuario:
 * GET /api/notificaciones/507f1f77bcf86cd799439011
 * 
 * // Crear notificación de alerta:
 * POST /api/notificaciones/
 * Body: {
 *   "titulo": "Alerta en Cabina #45",
 *   "mensaje": "La cabina 45 presenta vibraciones anómalas",
 *   "tipo": "alerta",
 *   "usuarioId": "507f1f77bcf86cd799439011",
 *   "cabinaId": "45"
 * }
 * 
 * // Eliminar notificación:
 * DELETE /api/notificaciones/550e8400e29b41d4a716446
 */
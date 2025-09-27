const express = require('express');
const { scheduleController } = require('../controllers');
const router = express.Router();

router.get('/', scheduleController.listarHorarios);
router.get('/:id', scheduleController.obtenerHorario);
router.post('/', scheduleController.crearHorario);
router.put('/:id', scheduleController.actualizarHorario);
router.delete('/:id', scheduleController.eliminarHorario);

module.exports = router;

/**
 * scheduleRoute.js
 * 
 * @description Rutas CRUD para la gestión de horarios y programación del metro cable
 * @version 1.0
 * 
 * @requires express
 * @requires ../controllers/scheduleController
 * 
 * @overview Gestiona la programación operativa del sistema de transporte por cable aéreo.
 *           Controla frecuencias, horarios de servicio y mantenimiento según RF del documento.
 * 
 * @route GET /horarios/
 * @description Obtiene todos los horarios configurados en el sistema.
 *              Útil para mostrar la programación completa a operadores.
 * @access Autenticado
 * @returns {Array} Lista completa de horarios y frecuencias programadas
 * 
 * @route GET /horarios/:id
 * @description Obtiene un horario específico por su ID único.
 * @access Autenticado
 * @param {string} id - Identificador único del horario (ej: 'hora_pico_manana')
 * @returns {Object} Detalles completos del horario específico
 * 
 * @route POST /horarios/
 * @description Crea un nuevo horario o programación en el sistema.
 *              Para ajustar frecuencias según demanda o programar mantenimiento.
 * @access Solo administradores
 * @body {Object} Horario - Datos del nuevo horario a crear
 * @returns {Object} Horario creado con ID asignado
 * 
 * @route PUT /horarios/:id
 * @description Actualiza un horario existente (cambiar frecuencia, días, etc.).
 * @access Solo administradores
 * @param {string} id - ID del horario a actualizar
 * @body {Object} Horario - Datos actualizados del horario
 * @returns {Object} Horario actualizado
 * 
 * @route DELETE /horarios/:id
 * @description Elimina un horario del sistema (por reestructuración operativa).
 * @access Solo administradores
 * @param {string} id - ID del horario a eliminar
 * @returns {Object} Confirmación de eliminación
 * 
 * @example
 * // Obtener toda la programación para el dashboard operativo:
 * GET /api/horarios/
 * 
 * // Consultar horario específico de hora pico:
 * GET /api/horarios/hora_pico_manana
 * 
 * // Crear nuevo horario para festivos (admin):
 * POST /api/horarios/
 * Body: {
 *   "nombre": "Horario Festivos",
 *   "tipo": "festivo",
 *   "dias": ["2024-12-25", "2024-01-01"],
 *   "frecuencia": "15min",
 *   "hora_inicio": "06:00",
 *   "hora_fin": "22:00"
 * }
 * 
 * // Actualizar frecuencia de un horario (admin):
 * PUT /api/horarios/hora_pico_tarde
 * Body: {
 *   "frecuencia": "4min",  // Aumentar frecuencia en hora pico
 *   "activo": true
 * }
 */
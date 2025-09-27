const express = require('express');
const { stopController } = require('../controllers');
const router = express.Router();

router.get('/', stopController.listarParadas);
router.get('/:id', stopController.obtenerParada);
router.post('/', stopController.crearParada);
router.put('/:id', stopController.actualizarParada);
router.delete('/:id', stopController.eliminarParada);

module.exports = router;

/**
 * stopRoute.js
 * 
 * @description Rutas CRUD para la gestión de estaciones del sistema de metro cable
 * @version 1.0
 * 
 * @requires express
 * @requires ../controllers/stopController
 * 
 * @overview Gestiona las estaciones (paradas) del sistema de transporte por cable aéreo.
 *           Incluye terminales y estaciones intermedias según la configuración descrita en el documento.
 * 
 * @route GET /paradas/
 * @description Obtiene todas las estaciones del sistema de metro cable.
 *              Esencial para mostrar la infraestructura completa en el geoportal/mapa.
 * @access Público o autenticado (para visualización en mapa público)
 * @returns {Array} Lista completa de todas las estaciones del sistema
 * 
 * @route GET /paradas/:id
 * @description Obtiene una estación específica por su ID único.
 * @access Autenticado
 * @param {string} id - Identificador único de la estación (ej: 'terminal_principal')
 * @returns {Object} Detalles completos de la estación específica
 * 
 * @route POST /paradas/
 * @description Crea una nueva estación en el sistema. Para expansión de la red.
 * @access Solo administradores
 * @body {Object} Parada - Datos de la nueva estación a crear
 * @returns {Object} Estación creada con ID asignado
 * 
 * @route PUT /paradas/:id
 * @description Actualiza una estación existente (modificar posición, capacidad, estado).
 * @access Solo administradores
 * @param {string} id - ID de la estación a actualizar
 * @body {Object} Parada - Datos actualizados de la estación
 * @returns {Object} Estación actualizada
 * 
 * @route DELETE /paradas/:id
 * @description Elimina una estación del sistema (por cierre o reconfiguración).
 * @access Solo administradores
 * @param {string} id - ID de la estación a eliminar
 * @returns {Object} Confirmación de eliminación
 * 
 * @example
 * // Obtener todas las estaciones para el mapa interactivo:
 * GET /api/paradas/
 * 
 * // Consultar detalles de una estación terminal:
 * GET /api/paradas/terminal_norte
 * 
 * // Crear nueva estación intermedia (admin):
 * POST /api/paradas/
 * Body: {
 *   "nombre": "Nueva Estación Intermedia",
 *   "tipo": "intermedia",
 *   "posicion": {"lat": 6.126, "lng": -75.453},
 *   "capacidad": 200,
 *   "estado": "activa",
 *   "rutaId": "linea_principal"
 * }
 * 
 * // Actualizar estado de una estación (admin):
 * PUT /api/paradas/intermedia_2
 * Body: {
 *   "estado": "mantenimiento",  // Por trabajos de mantenimiento
 *   "capacidad": 100  // Reducción temporal de capacidad
 * }
 */
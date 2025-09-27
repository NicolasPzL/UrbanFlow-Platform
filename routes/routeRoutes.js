const express = require('express');
const { routeController } = require('../controllers');
const router = express.Router();

router.get('/', routeController.listarRutas);
router.get('/:id', routeController.obtenerRuta);
router.post('/', routeController.crearRuta);
router.put('/:id', routeController.actualizarRuta);
router.delete('/:id', routeController.eliminarRuta);

module.exports = router;

/**
 * routeRoutes.js
 * 
 * @description Rutas CRUD completas para la gestión de rutas del sistema de metro cable
 * @version 1.0
 * 
 * @requires express
 * @requires ../controllers/routeController
 * 
 * @overview Sigue el patrón REST estándar para operaciones CRUD sobre recursos de rutas.
 *           Las rutas con '/' operan sobre la colección completa, las con '/:id' sobre elementos específicos.
 * 
 * @route GET /rutas/
 * @description Obtiene el listado completo de todas las rutas del sistema de metro cable.
 * @access Autenticado (probablemente público para visualización en mapa)
 * @returns {Array} Lista de todas las rutas con sus estaciones y cabinas
 * 
 * @route GET /rutas/:id
 * @description Obtiene una ruta específica por su ID único.
 * @access Autenticado
 * @param {string} id - Identificador único de la ruta (ej: 'linea_principal')
 * @returns {Object} Datos completos de la ruta específica
 * 
 * @route POST /rutas/
 * @description Crea una nueva ruta en el sistema. Para administradores al expandir la red.
 * @access Solo administradores
 * @body {Object} Ruta - Datos de la nueva ruta a crear
 * @returns {Object} Ruta creada con ID asignado
 * 
 * @route PUT /rutas/:id
 * @description Actualiza una ruta existente (modificar estaciones, horarios, etc.).
 * @access Solo administradores
 * @param {string} id - ID de la ruta a actualizar
 * @body {Object} Ruta - Datos actualizados de la ruta
 * @returns {Object} Ruta actualizada
 * 
 * @route DELETE /rutas/:id
 * @description Elimina una ruta del sistema (por cierre o reestructuración).
 * @access Solo administradores
 * @param {string} id - ID de la ruta a eliminar
 * @returns {Object} Confirmación de eliminación
 * 
 * @example
 * // Obtener todas las rutas para el mapa principal:
 * GET /api/rutas/
 * 
 * // Obtener detalles específicos de la Línea Norte:
 * GET /api/rutas/linea_norte
 * 
 * // Crear una nueva ruta (admin):
 * POST /api/rutas/
 * Body: {
 *   "nombre": "Línea Oeste",
 *   "estaciones": ["terminal_oeste", "intermedia_1", "intermedia_2", "terminal_centro"],
 *   "color": "#FF5733",
 *   "estado": "activa"
 * }
 * 
 * // Actualizar estaciones de una ruta (admin):
 * PUT /api/rutas/linea_sur
 * Body: {
 *   "estaciones": ["terminal_sur", "nueva_estacion", "terminal_centro"]
 * }
 */
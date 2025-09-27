const express = require('express');
const { reviewController } = require('../controllers');
const router = express.Router();

router.post('/', reviewController.crearOpinion);
router.get('/ruta/:rutaId', reviewController.listarOpinionesPorRuta);
router.delete('/:id', reviewController.eliminarOpinion);

module.exports = router;

/**
 * reviewRoute.js
 * 
 * @description Rutas para el sistema de opiniones y reseñas de usuarios de UrbanFlow
 * @version 1.0
 * 
 * @requires express
 * @requires ../controllers/reviewController
 * 
 * @route POST /opiniones/
 * @description Crea una nueva opinión o reseña sobre el servicio de metro cable.
 *              Los usuarios pueden evaluar rutas específicas o el servicio en general.
 * @access Usuarios autenticados
 * @body {Object} Opinión - Datos de la opinión a crear
 * @returns {Object} Opinión creada con ID asignado
 * 
 * @route GET /opiniones/ruta/:rutaId
 * @description Obtiene todas las opiniones asociadas a una ruta específica del sistema.
 *              Útil para mostrar feedback específico por cada línea de metro cable.
 * @access Público o autenticado (dependiendo de la política)
 * @param {string} rutaId - ID de la ruta cuyas opiniones se consultan
 * @returns {Array} Lista de opiniones de la ruta especificada
 * 
 * @route DELETE /opiniones/:id
 * @description Elimina una opinión específica del sistema. Solo puede ser eliminada por 
 *              el usuario autor o por administradores.
 * @access Autor de la opinión o administradores
 * @param {string} id - ID de la opinión a eliminar
 * @returns {Object} Confirmación de eliminación
 * 
 * @example
 * // Crear opinión sobre una ruta:
 * POST /api/opiniones/
 * Body: {
 *   "usuarioId": "507f1f77bcf86cd799439011",
 *   "rutaId": "LINEA_A",
 *   "calificacion": 4,
 *   "comentario": "Excelente servicio, muy puntual",
 *   "fechaViaje": "2024-01-15"
 * }
 * 
 * // Obtener opiniones de una ruta:
 * GET /api/opiniones/ruta/LINEA_A
 * 
 * // Eliminar opinión:
 * DELETE /api/opiniones/550e8400e29b41d4a716446
 */
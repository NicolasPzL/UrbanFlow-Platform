const express = require('express');
const { adminController } = require('../controllers');
const router = express.Router();

router.get('/usuarios', adminController.listarUsuarios);
router.get('/estadisticas', adminController.obtenerEstadisticas);

module.exports = router;

/**
 * adminRoute.js
 * 
 * @description Rutas del módulo de administración para la plataforma UrbanFlow
 * @version 1.0
 * 
 * @requires express
 * @requires ../controllers/adminController
 * 
 * @route GET /admin/usuarios
 * @description Obtiene el listado completo de usuarios registrados en el sistema.
 * @access Solo administradores
 * @middleware isAdmin (debe verificar rol de administrador)
 * 
 * @route GET /admin/estadisticas  
 * @description Obtiene estadísticas generales del sistema para el panel de administración.
 * @access Solo administradores
 * @middleware isAdmin (debe verificar rol de administrador)
 * 
 * @example
 * // Uso típico en app.js:
 * app.use('/admin', require('./routes/adminRoute'));
 * 
 * Asegurar que estas rutas estén protegidas con el middleware isAdmin antes de ponerlas en producción, ya que según los requisitos RF8 y RF10, el acceso al módulo de administración debe estar restringido exclusivamente a usuarios con rol de administrador
 */
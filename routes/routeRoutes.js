const express = require('express');
const { routeController } = require('../controllers');
const router = express.Router();

router.get('/', routeController.listarRutas);
router.get('/:id', routeController.obtenerRuta);
router.post('/', routeController.crearRuta);
router.put('/:id', routeController.actualizarRuta);
router.delete('/:id', routeController.eliminarRuta);

module.exports = router;
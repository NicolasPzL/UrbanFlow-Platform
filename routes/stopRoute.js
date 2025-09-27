const express = require('express');
const { stopController } = require('../controllers');
const router = express.Router();

router.get('/', stopController.listarParadas);
router.get('/:id', stopController.obtenerParada);
router.post('/', stopController.crearParada);
router.put('/:id', stopController.actualizarParada);
router.delete('/:id', stopController.eliminarParada);

module.exports = router;
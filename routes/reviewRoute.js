const express = require('express');
const { reviewController } = require('../controllers');
const router = express.Router();

router.post('/', reviewController.crearOpinion);
router.get('/ruta/:rutaId', reviewController.listarOpinionesPorRuta);
router.delete('/:id', reviewController.eliminarOpinion);

module.exports = router;
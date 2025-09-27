const express = require('express');
const { scheduleController } = require('../controllers');
const router = express.Router();

router.get('/', scheduleController.listarHorarios);
router.get('/:id', scheduleController.obtenerHorario);
router.post('/', scheduleController.crearHorario);
router.put('/:id', scheduleController.actualizarHorario);
router.delete('/:id', scheduleController.eliminarHorario);

module.exports = router;
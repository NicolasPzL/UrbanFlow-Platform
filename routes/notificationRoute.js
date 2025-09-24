const express = require('express');
const { notificationController } = require('../controllers');
const router = express.Router();

router.get('/:usuarioId', notificationController.listarNotificacionesUsuario);
router.post('/', notificationController.crearNotificacion);
router.delete('/:id', notificationController.eliminarNotificacion);

module.exports = router;
const express = require('express');
const { adminController } = require('../controllers');
const router = express.Router();

router.get('/usuarios', adminController.listarUsuarios);
router.get('/estadisticas', adminController.obtenerEstadisticas);

module.exports = router;
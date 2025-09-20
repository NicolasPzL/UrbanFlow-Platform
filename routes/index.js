const express = require('express');
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const routeRoutes = require('./routeRoutes');
const stopRoutes = require('./stopRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const reviewRoutes = require('./reviewRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');
const exampleRoutes = require('./exampleRoutes');

const router = express.Router();

// Define main routes
router.use('/usuarios', userRoutes);
router.use('/auth', authRoutes);
router.use('/rutas', routeRoutes);
router.use('/paradas', stopRoutes);
router.use('/horarios', scheduleRoutes);
router.use('/opiniones', reviewRoutes);
router.use('/notificaciones', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/ejemplo', exampleRoutes);

module.exports = router;
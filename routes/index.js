const express = require('express');
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const routeRoutes = require('./routeRoutes');
const stopRoutes = require('./stopRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const reviewRoutes = require('./reviewRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');

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

module.exports = router;

/**
 * index.js
 * 
 * @description Archivo principal de enrutamiento de la plataforma UrbanFlow
 * @version 1.0
 * 
 * @requires express
 * @requires ./userRoutes
 * @requires ./authRoutes
 * @requires ./routeRoutes  
 * @requires ./stopRoutes
 * @requires ./scheduleRoutes
 * @requires ./reviewRoutes
 * @requires ./notificationRoutes
 * @requires ./adminRoutes
 * @requires ./exampleRoutes
 * 
 * @overview Centraliza y organiza todas las rutas de la aplicación en módulos específicos.
 *           Cada módulo se monta bajo un path base específico para mantener una estructura
 *           RESTful y organizada.
 * 
 * @routes
 * /usuarios     - Gestión de usuarios y perfiles
 * /auth         - Autenticación y registro (login, registro, JWT)
 * /rutas        - Gestión de rutas del sistema de cable aéreo
 * /paradas      - Gestión de estaciones/intermedias del metro cable  
 * /horarios     - Programación y horarios de operación
 * /opiniones    - Reseñas y feedback de usuarios
 * /notificaciones - Alertas y comunicaciones del sistema
 * /admin        - Funcionalidades exclusivas de administración
 * /ejemplo      - Rutas de ejemplo para desarrollo/pruebas
 * 
 * @usage
 * // En app.js principal:
 * const routes = require('./routes/index');
 * app.use('/api', routes); // Todas las rutas estarán bajo /api/*
 * 
 * @example
 * // Acceso a rutas de autenticación:
 * POST /api/auth/login
 * POST /api/auth/register
 * 
 * // Acceso a gestión de usuarios:
 * GET /api/usuarios/profile
 * PUT /api/usuarios/update
 */
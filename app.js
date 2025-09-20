const express = require('express');
const routes = require('./routes'); // Ajusta la ruta si es necesario

const app = express();
app.use(express.json());
app.use('/api', routes);

// Middleware de manejo de errores (al final)
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

module.exports = app;
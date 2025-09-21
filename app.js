// app.js - Aplicación principal de UrbanFlow Platform
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// Cargar variables de entorno
dotenv.config();

// Importar rutas
import userRoutes from './routes/userRoutes.js';

// Importar middlewares
import { requireAuth, optionalAuth } from './middlewares/auth.js';
import { verifyToken, isAdmin } from './middlewares/authMiddleware.js';

// Importar controladores
import * as userController from './controllers/userCotroller.js';
import * as authController from './controllers/authController.js';
import * as roleController from './controllers/roleController.js';

// Crear aplicación Express
const app = express();

// Configuración del puerto
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// =============================================================================
// MIDDLEWARES GLOBALES
// =============================================================================

// Seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// =============================================================================
// RUTAS PÚBLICAS
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'UrbanFlow Platform API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Autenticación
app.post('/api/auth/login', authController.login);
app.post('/api/auth/logout', authController.logout);

// =============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================================================

// Usuario actual
app.get('/api/auth/me', requireAuth, authController.me);

// Gestión de usuarios (solo admin)
app.get('/api/users', requireAuth, userController.listUsers);
app.get('/api/users/:id', requireAuth, userController.getUser);
app.post('/api/users', requireAuth, userController.createUser);
app.put('/api/users/:id', requireAuth, userController.updateUser);
app.delete('/api/users/:id', requireAuth, userController.removeUser);

// Gestión de roles (solo admin)
app.get('/api/roles', requireAuth, roleController.list);
app.post('/api/roles', requireAuth, roleController.create);
app.put('/api/roles/:id', requireAuth, roleController.update);
app.delete('/api/roles/:id', requireAuth, roleController.softDelete);

// =============================================================================
// RUTAS DE DASHBOARD Y ANALYTICS
// =============================================================================

// Dashboard principal
app.get('/api/dashboard', requireAuth, (req, res) => {
  res.json({
    ok: true,
    data: {
      message: 'Dashboard endpoint - implementar lógica de analytics',
      user: req.user,
      timestamp: new Date().toISOString()
    }
  });
});

// Mapa público (sin autenticación)
app.get('/api/map/public', (req, res) => {
  res.json({
    ok: true,
    data: {
      message: 'Mapa público - implementar datos de estaciones y rutas',
      timestamp: new Date().toISOString()
    }
  });
});

// =============================================================================
// MANEJO DE ERRORES
// =============================================================================

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Ruta ${req.originalUrl} no encontrada`,
      method: req.method
    }
  });
});

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        details: err.message
      }
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token inválido'
      }
    });
  }

  // Error de AppError personalizado
  if (err.status) {
    return res.status(err.status).json({
      ok: false,
      error: {
        code: err.code || 'APP_ERROR',
        message: err.message,
        details: err.details
      }
    });
  }

  // Error interno del servidor
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
    }
  });
});

// =============================================================================
// INICIO DEL SERVIDOR
// =============================================================================

// Función para iniciar el servidor
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 UrbanFlow Platform API iniciada en puerto ${PORT}`);
    console.log(`📊 Entorno: ${NODE_ENV}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  });
};

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Iniciar servidor
startServer();

export default app;

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
import auth from './middlewares/auth.js';
const { requireAuth, optionalAuth, requireRole } = auth;

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

// Sanitización y rate limiting deshabilitados (middlewares no implementados aún)
// app.use(sanitizeQuery);
// app.use(sanitizeBody);
// app.use(apiLimiter);

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
app.post('/api/auth/login', 
  // loginLimiter,
  // validateLogin,
  authController.login
);
app.post('/api/auth/logout', 
  requireAuth, 
  authController.logout
);

// =============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================================================

// Usuario actual
app.get('/api/auth/me', requireAuth, authController.me);

// Gestión de usuarios (solo admin)
app.get('/api/users', 
  requireAuth, 
  requireRole('admin'), 
  userController.listUsers
);
app.get('/api/users/:id', 
  requireAuth, 
  requireRole('admin'), 
  // validateId, 
  userController.getUser
);
app.post('/api/users', 
  requireAuth, 
  requireRole('admin'), 
  // validateUser, 
  userController.createUser
);
app.put('/api/users/:id', 
  requireAuth, 
  requireRole('admin'), 
  // validateId, 
  // validateUser, 
  userController.updateUser
);
app.delete('/api/users/:id', 
  requireAuth, 
  requireRole('admin'), 
  // validateId, 
  userController.removeUser
);

// Gestión de roles (solo admin)
app.get('/api/roles', 
  requireAuth, 
  requireRole('admin'), 
  roleController.list
);
app.post('/api/roles', 
  requireAuth, 
  requireRole('admin'), 
  roleController.create
);
app.put('/api/roles/:id', 
  requireAuth, 
  requireRole('admin'), 
  // validateId, 
  roleController.update
);
app.delete('/api/roles/:id', 
  requireAuth, 
  requireRole('admin'), 
  // validateId, 
  roleController.softDelete
);

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

// Montar routers adicionales
app.use('/api', userRoutes);

// =============================================================================
// MANEJO DE ERRORES
// =============================================================================

// Middleware para rutas no encontradas (Express 5 no acepta '*')
app.use((req, res) => {
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
    console.log(` UrbanFlow Platform API iniciada en puerto ${PORT}`);
    console.log(` Entorno: ${NODE_ENV}`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/health`);
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

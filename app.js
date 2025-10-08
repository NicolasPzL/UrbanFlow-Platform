// app.js - Aplicación principal de UrbanFlow Platform
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// Cargar variables de entorno
dotenv.config();

// Importar rutas
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import citizenRoutes from './routes/citizenRoutes.js';

// Importar middlewares
import auth from './middlewares/auth.js';
import errorHandler from './middlewares/errorHandler.js';
const { requireAuth, optionalAuth, requireRole } = auth;

// Importar controladores (ya gestionados por routers dedicados)

// Crear aplicación Express
const app = express();

// Configuración del puerto
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Resolver __dirname en módulos ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Autenticación (router dedicado)
app.use('/api/auth', authRoutes);

// =============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================================================

// Usuario actual (expuesto por router de auth)
// app.get('/api/auth/me', requireAuth, authController.me);

// Usuarios (CRUD canónico) - protegido a nivel de montaje
app.use('/api/users', requireAuth, requireRole('admin'), userRoutes);

// Roles (CRUD) - protegido a nivel de montaje
app.use('/api/roles', requireAuth, requireRole('admin'), roleRoutes);

// =============================================================================
// RUTAS DE DASHBOARD Y ANALYTICS
// =============================================================================

// Mapa público (sin autenticación)
app.use('/api/map', publicRoutes);

// Dashboard ciudadano (público, sin autenticación)
app.use('/api/citizen', citizenRoutes);

// Dashboard (requiere autenticación)
app.use('/api/dashboard', requireAuth, dashboardRoutes);

// =============================================================================
// SERVIR FRONTEND (BUILD VITE) Y FALLBACK SPA
// =============================================================================

// Servir archivos estáticos del frontend compilado
const clientBuildPath = path.join(__dirname, 'views', 'original', 'build');
app.use(express.static(clientBuildPath));

// Fallback SPA: para cualquier ruta que no sea /api/*, devolver index.html
// Express 5 no acepta '*', usamos una regex que excluye /api
app.get(/^(?!\/api\/).*/, (req, res) => {
  return res.sendFile(path.join(clientBuildPath, 'index.html'));
});

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

// Middleware global de manejo de errores (centralizado)
app.use(errorHandler);

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

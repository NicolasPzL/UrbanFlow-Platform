// app.js - Aplicación principal de UrbanFlow Platform
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import xss from 'xss';

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
const ANALYTICS_BASE_URL = process.env.ANALYTICS_BASE_URL || 'http://localhost:8001/api';

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
      scriptSrc: ["'self'", "'unsafe-inline'"],
      workerSrc: ["'self'", "blob:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.mapbox.com", "https://events.mapbox.com"],
    },
  },
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
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
// Sanitización básica contra XSS en body, query y params (compatible con Express 5)
function sanitizeInPlace(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = xss(val);
    } else if (Array.isArray(val)) {
      obj[key] = val.map((item) => (typeof item === 'string' ? xss(item) : (typeof item === 'object' && item !== null ? (sanitizeInPlace(item), item) : item)));
    } else if (val && typeof val === 'object') {
      sanitizeInPlace(val);
    }
  }
}
app.use((req, _res, next) => {
  try {
    if (req.body) sanitizeInPlace(req.body);
    if (req.query) sanitizeInPlace(req.query); // muta propiedades sin reasignar el objeto
    if (req.params) sanitizeInPlace(req.params);
  } catch {}
  next();
});

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50,                  // 50 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests, try later.' },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 600,            // 600 req/min por IP
  standardHeaders: true,
  legacyHeaders: false,
});
// Aplicar límites (antes de montar rutas)
app.use('/api/auth/login', loginLimiter);
app.use('/api/', apiLimiter);

// Sanitización (pendiente de implementar sanitizers específicos)
// app.use(sanitizeQuery);
// app.use(sanitizeBody);

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

// Dashboard ciudadano (requiere autenticación de cliente)
app.use('/api/citizen', requireAuth, requireRole('cliente'), citizenRoutes);

// Dashboard principal para staff (excluye cliente)
app.use('/api/dashboard', requireAuth, requireRole('admin','operador','analista'), dashboardRoutes);

// -----------------------------------------------------------------------------
// Proxy hacia Microservicio de Analytics (FastAPI) usando fetch nativo
// -----------------------------------------------------------------------------

async function proxyToAnalytics(req, res, upstreamPath) {
  try {
    const url = `${ANALYTICS_BASE_URL}${upstreamPath}`;
    const method = req.method.toUpperCase();

    // Construir opciones de fetch
    const headers = { 'Content-Type': 'application/json' };
    // Reenviar querystring
    const qs = new URLSearchParams(req.query || {}).toString();
    const target = qs ? `${url}?${qs}` : url;

    const body = method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(req.body || {});

    const resp = await fetch(target, { method, headers, body });
    const contentType = resp.headers.get('content-type') || '';
    res.status(resp.status);
    if (contentType.includes('application/json')) {
      const data = await resp.json();
      return res.json(data);
    }
    const text = await resp.text();
    return res.send(text);
  } catch (e) {
    console.error('Proxy analytics error:', e);
    // Si es una ruta del chatbot, devolver mensaje genérico amigable
    if (upstreamPath.includes('/chatbot')) {
      return res.status(502).json({ 
        ok: true, 
        data: {
          success: false,
          response: "Lo siento, en este momento no tengo esa información disponible. Por favor, contacta con soporte técnico para que puedan ayudarte con tu consulta o actualizarme con esa información.",
          query_type: "error"
        }
      });
    }
    return res.status(502).json({ ok: false, error: 'UPSTREAM_ERROR', detail: e?.message || 'proxy error' });
  }
}

// Staff: admin, operador, analista
app.use('/api/analytics', requireAuth, requireRole('admin','operador','analista'), (req, res) => {
  return proxyToAnalytics(req, res, `/analytics${req.path}`);
});
app.use('/api/data', requireAuth, requireRole('admin','operador','analista'), (req, res) => {
  return proxyToAnalytics(req, res, `/data${req.path}`);
});
app.use('/api/models', requireAuth, requireRole('admin','operador','analista'), (req, res) => {
  return proxyToAnalytics(req, res, `/models${req.path}`);
});
app.use('/api/predictions', requireAuth, requireRole('admin','operador','analista'), (req, res) => {
  return proxyToAnalytics(req, res, `/predictions${req.path}`);
});

// Cliente: rutas ciudadanas simplificadas hacia analytics
app.use('/api/citizen/analytics', requireAuth, requireRole('cliente'), (req, res) => {
  return proxyToAnalytics(req, res, `/analytics${req.path}`);
});

// Chatbot: rutas del chatbot (requiere autenticación de staff)
app.use('/api/chatbot', requireAuth, requireRole('admin','operador','analista','cliente'), (req, res) => {
  // req.path NO incluye el prefijo del mount point en Express
  // Ejemplo: petición /api/chatbot/capabilities -> req.path = /capabilities
  // Necesitamos agregar /chatbot al path para que coincida con las rutas del microservicio
  const upstreamPath = `/chatbot${req.path}`;
  return proxyToAnalytics(req, res, upstreamPath);
});

// =============================================================================
// SERVIR FRONTEND (BUILD VITE) Y FALLBACK SPA
// =============================================================================

// Servir archivos estáticos del nuevo frontend compilado (Vite)
const clientBuildPath = path.join(__dirname, 'views', 'build');
app.use(express.static(clientBuildPath));

// Fallback SPA: para cualquier ruta que no sea /api/*
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
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
# Documentación Técnica Completa - UrbanFlow Platform

## Tabla de Contenidos

1. [Visión General del Sistema](#visión-general-del-sistema)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Herramientas y Frameworks](#herramientas-y-frameworks)
4. [Flujo del Sistema](#flujo-del-sistema)
5. [Módulos del Sistema](#módulos-del-sistema)
6. [Base de Datos](#base-de-datos)
7. [Seguridad y Autenticación](#seguridad-y-autenticación)
8. [Microservicio de Analytics](#microservicio-de-analytics)
9. [Frontend React](#frontend-react)
10. [APIs y Endpoints](#apis-y-endpoints)
11. [Procesamiento de Datos](#procesamiento-de-datos)
12. [Despliegue y Configuración](#despliegue-y-configuración)

---

## Visión General del Sistema

**UrbanFlow Platform** es una solución tecnológica integral diseñada para la gestión, monitoreo y análisis de sistemas de transporte por cable (metro cable). La plataforma centraliza toda la operación, proporcionando herramientas avanzadas para optimizar la eficiencia, seguridad y experiencia del usuario.

### Objetivos Principales

- **Gestión operativa en tiempo real**: Monitoreo continuo del estado de las cabinas y sensores
- **Análisis predictivo**: Procesamiento de datos de telemetría mediante inteligencia artificial
- **Visualización geográfica**: Mapa interactivo con posición de cabinas en tiempo real
- **Control de acceso**: Sistema de roles y permisos diferenciados
- **Analítica avanzada**: Cálculo de métricas vibracionales, detección de anomalías y predicciones ML

### Características Clave

- Dashboard centralizado con métricas en tiempo real
- Geoportal interactivo con Mapbox
- Sistema de autenticación JWT con cookies seguras
- Microservicio de analytics independiente (Python/FastAPI)
- Frontend React moderno con TypeScript
- Simulador de telemetría para pruebas y desarrollo
- Sistema de auditoría completo

---

## Arquitectura del Sistema

### Arquitectura General

UrbanFlow Platform sigue una **arquitectura de microservicios híbrida** con los siguientes componentes principales:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Landing     │  │  Dashboard    │  │  Geoportal   │     │
│  │  Page        │  │  (Staff)      │  │  (Publico)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  User Mgmt   │  │  Citizen     │  │  NOVACORE    │     │
│  │  (Admin)     │  │  Dashboard   │  │  Page         │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │ (CORS, Cookies)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND NODE.JS (Express 5)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middlewares: Auth, Rate Limit, Sanitization, Audit │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes: /api/auth, /api/users, /api/dashboard, etc.│   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Controllers: Auth, Users, Dashboard, Geoportal      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Models: Users, Roles, Geoportal, Auditoría           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Proxy HTTP
                            │ (fetch nativo)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        MICROSERVICIO ANALYTICS (Python + FastAPI)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Services: TelemetryProcessor, Analytics, ML       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Simulator: TelemetrySimulator (Background Task)     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Models: SQLAlchemy ORM (Mediciones, Telemetria)    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ SQLAlchemy / pg Pool
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL + POSTGIS                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  usuarios   │  │  mediciones  │  │ telemetria_  │     │
│  │  roles       │  │  sensores    │  │ cruda        │     │
│  │  auditoria   │  │  cabinas     │  │ modelos_ml   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Principales

#### 1. **Frontend (React + TypeScript + Vite)**
- **Ubicación**: `views/`
- **Tecnología**: React 18, TypeScript, Vite 6, Tailwind CSS
- **UI Framework**: shadcn/ui (Radix UI primitives)
- **Mapas**: Mapbox GL JS, react-map-gl
- **Estado**: React Hooks (useState, useEffect, useCallback)
- **Routing**: Sistema propio basado en `AppView` type

#### 2. **Backend Node.js (Express 5)**
- **Ubicación**: Raíz del proyecto
- **Tecnología**: Express 5.1.0, Node.js 18+
- **Base de datos**: PostgreSQL con pg (node-postgres)
- **Autenticación**: JWT con cookies httpOnly
- **Seguridad**: Helmet, CORS, rate limiting, XSS sanitization

#### 3. **Microservicio Analytics (Python + FastAPI)**
- **Ubicación**: `microservices/analytics/`
- **Tecnología**: FastAPI 0.115, Python 3.12+, SQLAlchemy 2.0
- **Procesamiento**: NumPy, SciPy, scikit-learn, pandas
- **Visualización**: Matplotlib, Seaborn, Plotly
- **Servidor**: Uvicorn (ASGI)

#### 4. **Base de Datos (PostgreSQL + PostGIS)**
- **Versión**: PostgreSQL 13+
- **Extensiones**: PostGIS (para datos geográficos)
- **Pool de conexiones**: pg Pool (Node.js), SQLAlchemy (Python)

---

## Herramientas y Frameworks

### Backend Node.js

#### Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `express` | ^5.1.0 | Framework web |
| `pg` | ^8.11.3 | Cliente PostgreSQL |
| `jsonwebtoken` | ^9.0.2 | Tokens JWT |
| `bcryptjs` | ^3.0.2 | Hashing de contraseñas |
| `helmet` | ^8.1.0 | Seguridad HTTP headers |
| `cors` | ^2.8.5 | CORS middleware |
| `express-rate-limit` | ^7.5.1 | Rate limiting |
| `xss` | ^1.0.15 | Sanitización XSS |
| `cookie-parser` | ^1.4.7 | Parsing de cookies |
| `morgan` | ^1.10.1 | Logging HTTP |
| `dotenv` | ^17.2.2 | Variables de entorno |

#### Estructura de Carpetas Backend

```
/
├── app.js                    # Punto de entrada principal
├── config/                   # Configuración
│   ├── auth.js              # Config JWT y cookies
│   └── db.js                # Pool de conexiones PostgreSQL
├── controllers/              # Lógica de negocio
│   ├── authController.js    # Login, logout, cambio password
│   ├── userController.js    # CRUD usuarios
│   ├── dashboardController.js # Dashboard principal
│   ├── citizenController.js  # Dashboard ciudadano
│   ├── publicController.js   # Geoportal público
│   └── roleController.js    # Gestión de roles
├── models/                   # Modelos de datos
│   ├── userModel.js         # Operaciones usuarios
│   ├── rolModel.js          # Operaciones roles
│   ├── userRolModel.js      # Relación usuarios-roles
│   ├── geoportalModel.js    # Datos geoportal
│   └── auditoriaModel.js    # Registro de auditoría
├── routes/                   # Definición de rutas
│   ├── authRoutes.js        # /api/auth/*
│   ├── userRoutes.js        # /api/users/*
│   ├── dashboardRoutes.js   # /api/dashboard/*
│   ├── citizenRoutes.js     # /api/citizen/*
│   ├── publicRoutes.js      # /api/map/*
│   └── roleRoutes.js        # /api/roles/*
├── middlewares/              # Middlewares
│   ├── auth.js              # Autenticación y autorización
│   ├── asyncHandler.js      # Manejo de errores async
│   ├── errorHandler.js      # Handler global de errores
│   ├── rateLimiter.js       # Rate limiting
│   ├── sanitize.js          # Sanitización
│   ├── validation.js        # Validación de datos
│   └── audit.js             # Registro de auditoría
├── utils/                    # Utilidades
│   ├── jwtHelper.js         # Helpers JWT
│   ├── password.js          # Hashing y validación
│   └── responses.js         # Respuestas estandarizadas
└── errors/                   # Manejo de errores
    └── AppError.js           # Clase de error personalizada
```

### Frontend React

#### Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `react` | ^18.3.1 | Framework UI |
| `react-dom` | ^18.3.1 | React DOM renderer |
| `typescript` | ^5.9.3 | TypeScript compiler |
| `vite` | ^6.3.6 | Build tool y dev server |
| `tailwindcss` | - | Framework CSS |
| `mapbox-gl` | ^2.15.0 | Mapbox GL JS |
| `react-map-gl` | ^7.1.7 | React wrapper para Mapbox |
| `@radix-ui/*` | Varias | Componentes UI primitivos |
| `lucide-react` | ^0.487.0 | Iconos |
| `sonner` | ^2.0.3 | Toast notifications |
| `recharts` | ^2.15.2 | Gráficos |

#### Estructura de Carpetas Frontend

```
views/
├── src/
│   ├── main.tsx             # Punto de entrada React
│   ├── App.tsx              # Componente raíz y routing
│   ├── index.css            # Estilos globales
│   ├── types/
│   │   └── index.ts         # Tipos TypeScript
│   ├── lib/
│   │   └── roles.ts         # Utilidades de roles
│   ├── components/          # Componentes principales
│   │   ├── LandingPage.tsx  # Página de inicio
│   │   ├── Dashboard.tsx    # Dashboard staff
│   │   ├── CitizenDashboard.tsx # Dashboard cliente
│   │   ├── PublicGeoportal.tsx # Geoportal público
│   │   ├── DetailedGeoportal.tsx # Geoportal detallado
│   │   ├── UserManagement.tsx # Gestión usuarios
│   │   ├── LoginModal.tsx   # Modal de login
│   │   ├── Navbar.tsx       # Barra de navegación
│   │   ├── WelcomeDashboard.tsx # Dashboard de bienvenida
│   │   └── ui/              # Componentes shadcn/ui
│   ├── novacore/            # Página NOVACORE
│   │   ├── NovacorePage.tsx
│   │   ├── theme.ts
│   │   ├── hooks/
│   │   │   └── useReveal.ts
│   │   ├── sections/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── AboutSection.tsx
│   │   │   ├── MissionVisionSection.tsx
│   │   │   ├── ServicesSection.tsx
│   │   │   ├── TeamSection.tsx
│   │   │   ├── KPISection.tsx
│   │   │   ├── ProjectsSection.tsx
│   │   │   ├── TimelineSection.tsx
│   │   │   └── FooterSection.tsx
│   │   └── components/
│   │       └── KpiModal.tsx
│   └── styles/
│       └── globals.css      # Estilos globales
├── public/                  # Assets estáticos
├── build/                   # Build de producción (generado)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Microservicio Analytics

#### Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `fastapi` | 0.115.0 | Framework web async |
| `uvicorn[standard]` | 0.30.6 | Servidor ASGI |
| `sqlalchemy` | 2.0.34 | ORM |
| `psycopg2-binary` | >=2.9.10 | Driver PostgreSQL |
| `pydantic` | 2.9.2 | Validación de datos |
| `numpy` | >=2.0.0 | Cálculos numéricos |
| `scipy` | >=1.13.0 | Cálculos científicos |
| `pandas` | >=2.2.0 | Manipulación de datos |
| `scikit-learn` | >=1.5.0 | Machine Learning |
| `matplotlib` | >=3.8.0 | Visualización |
| `seaborn` | >=0.13.0 | Visualización estadística |
| `plotly` | >=5.17.0 | Gráficos interactivos |

#### Estructura de Carpetas Analytics

```
microservices/analytics/
├── app/
│   ├── main.py              # Punto de entrada FastAPI
│   ├── core/
│   │   └── config.py        # Configuración centralizada
│   ├── db/
│   │   ├── session.py       # SQLAlchemy session factory
│   │   └── models.py        # Modelos ORM
│   ├── services/
│   │   ├── telemetry_processor.py      # Procesamiento telemetría
│   │   ├── telemetry_processor_simple.py # Versión simplificada
│   │   ├── telemetry_simulator.py      # Simulador de datos
│   │   ├── analytics.py     # Servicio de analytics
│   │   └── ml.py            # Servicio ML
│   └── api/
│       └── routes.py        # Endpoints FastAPI
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## Flujo del Sistema

### Flujo de Autenticación

```
1. Usuario accede a la aplicación
   │
   ▼
2. Frontend verifica sesión existente
   GET /api/auth/me (con cookie)
   │
   ├─► Si hay sesión válida → Usuario autenticado
   │
   └─► Si no hay sesión → Mostrar Landing Page
       │
       ▼
3. Usuario hace clic en "Iniciar Sesión"
   │
   ▼
4. Frontend muestra LoginModal
   │
   ▼
5. Usuario ingresa credenciales
   POST /api/auth/login
   Body: { correo, password }
   │
   ├─► Backend valida credenciales
   │   ├─► Busca usuario en BD
   │   ├─► Compara password hash (bcrypt)
   │   ├─► Verifica si cuenta está bloqueada
   │   └─► Registra intento (auditoría)
   │
   ├─► Si credenciales válidas:
   │   ├─► Genera JWT access token (1h)
   │   ├─► Genera JWT refresh token (7d)
   │   ├─► Establece cookies httpOnly
   │   ├─► Registra login exitoso (auditoría)
   │   └─► Retorna datos del usuario
   │
   └─► Si credenciales inválidas:
       ├─► Incrementa failed_attempts
       ├─► Bloquea cuenta si >= 5 intentos (15 min)
       ├─► Registra intento fallido (auditoría)
       └─► Retorna error 401
   │
   ▼
6. Frontend recibe respuesta
   │
   ├─► Si éxito: Actualiza estado de auth, redirige a dashboard
   │
   └─► Si error: Muestra mensaje de error
```

### Flujo de Procesamiento de Telemetría

```
1. Datos crudos ingresan al sistema
   │
   ├─► Opción A: Simulador (desarrollo/pruebas)
   │   └─► TelemetrySimulator lee telemetria_cruda
   │       └─► Procesa cada 5 segundos (configurable)
   │
   └─► Opción B: Datos reales (producción)
       └─► Sensores IoT envían datos a telemetria_cruda
   │
   ▼
2. TelemetryProcessor procesa datos
   │
   ├─► Lee registros no procesados de telemetria_cruda
   │
   ├─► Para cada registro:
   │   ├─► Calcula métricas vibracionales:
   │   │   ├─► RMS (Root Mean Square)
   │   │   ├─► Kurtosis
   │   │   ├─► Skewness
   │   │   ├─► ZCR (Zero Crossing Rate)
   │   │   ├─► Pico máximo
   │   │   ├─► Crest Factor
   │   │   └─► Frecuencias (media, dominante)
   │   │
   │   ├─► Análisis espectral (FFT):
   │   │   ├─► Transformada de Fourier
   │   │   ├─► Amplitud máxima espectral
   │   │   └─► Energía por bandas de frecuencia
   │   │
   │   ├─► Clasificación de estado:
   │   │   ├─► Inicio
   │   │   ├─► Crucero
   │   │   ├─► Frenado
   │   │   ├─► Zona lenta
   │   │   └─► Reaceleración
   │   │
   │   └─► Calcula distancia acumulada
   │
   ▼
3. Inserta resultados en mediciones
   │
   ├─► Crea registro Medicion con todas las métricas
   │
   └─► Actualiza estado de cabina si es necesario
   │
   ▼
4. Frontend consume datos procesados
   │
   ├─► Dashboard hace polling cada 10 segundos
   │   GET /api/dashboard
   │   │
   │   ├─► Backend consulta mediciones recientes
   │   ├─► Calcula KPIs (promedios, totales)
   │   ├─► Evalúa anomalías (alertas)
   │   └─► Retorna datos estructurados
   │
   └─► Geoportal hace polling cada 5 segundos
       GET /api/map/cabins
       │
       └─► Backend consulta última posición de cada cabina
           └─► Prioriza mediciones sobre telemetria_cruda
```

### Flujo de Visualización en Dashboard

```
1. Usuario accede al Dashboard
   │
   ▼
2. Frontend carga datos iniciales
   GET /api/dashboard
   │
   ├─► Backend consulta microservicio analytics:
   │   ├─► GET /api/analytics/summary
   │   ├─► GET /api/analytics/system-health
   │   ├─► GET /api/analytics/sensors/status
   │   ├─► GET /api/data/measurements/recent?limit=500
   │   └─► GET /api/analytics/cabins/summary
   │
   ├─► Backend procesa y agrega datos:
   │   ├─► Calcula KPIs (RMS, velocidad, distancia, etc.)
   │   ├─► Construye series de vibración
   │   ├─► Evalúa anomalías y alertas
   │   └─► Mapea sensores a cabinas
   │
   └─► Retorna respuesta JSON estructurada
   │
   ▼
3. Frontend renderiza componentes
   │
   ├─► KPIs: Muestra 8 tarjetas con métricas principales
   │
   ├─► Gráfico de Vibración: Serie temporal de RMS
   │
   ├─► Tabla de Cabinas: Estado, velocidad, vibración
   │
   ├─► Historial: Últimas 50 mediciones
   │
   └─► Alertas: Lista de anomalías detectadas (solo staff)
   │
   ▼
4. Polling automático
   │
   └─► setInterval cada 10 segundos
       └─► Vuelve al paso 2 (actualiza datos)
```

### Flujo de Geoportal

```
1. Usuario accede al Geoportal
   │
   ├─► Público: /geoportal-public (sin auth)
   │
   └─► Detallado: /geoportal-detail (requiere auth)
   │
   ▼
2. Frontend inicializa mapa Mapbox
   │
   ├─► Carga estilos de mapa
   │
   ├─► Configura controles (zoom, pitch, bearing)
   │
   └─► Solicita datos iniciales
       GET /api/map/cabins
       │
       ├─► Backend consulta:
       │   ├─► Estaciones operativas
       │   ├─► Última posición de cada cabina
       │   │   └─► Prioriza mediciones sobre telemetria_cruda
       │   └─► Estado actual de cabinas
       │
       └─► Retorna datos geográficos
   │
   ▼
3. Frontend renderiza en mapa
   │
   ├─► Marcadores de estaciones (puntos fijos)
   │
   ├─► Marcadores de cabinas (puntos móviles)
   │   ├─► Color según estado (normal/warning/alert)
   │   ├─► Popup con información detallada
   │   └─► Animación de movimiento
   │
   └─► Estadísticas del sistema
   │
   ▼
4. Polling automático
   │
   └─► setInterval cada 5 segundos
       └─► Actualiza posición de cabinas
```

---

## Módulos del Sistema

### 1. Módulo de Autenticación (`controllers/authController.js`)

**Responsabilidades:**
- Autenticación de usuarios (login)
- Gestión de sesiones (JWT + cookies)
- Cambio de contraseña
- Recuperación de contraseña (forgot/reset)
- Logout
- Verificación de sesión actual (`/me`)

**Funciones Principales:**

#### `login(req, res)`
- Valida credenciales (correo + password)
- Verifica si cuenta está bloqueada (`locked_until`)
- Compara password con hash almacenado (bcrypt)
- Genera tokens JWT (access + refresh)
- Establece cookies httpOnly
- Registra intentos (exitosos y fallidos) en auditoría
- Determina si usuario debe cambiar contraseña (`must_change_password`)

**Flujo:**
```javascript
1. Recibe { correo, password }
2. Busca usuario por correo (findByEmail)
3. Verifica locked_until
4. Compara password (comparePassword)
5. Si válido:
   - recordSuccessfulLogin (resetea failed_attempts)
   - Genera tokens (signToken, signRefreshToken)
   - Establece cookies (setAuthCookie)
   - Registra auditoría (AUTH_LOGIN_SUCCESS)
   - Retorna datos usuario
6. Si inválido:
   - recordFailedLogin (incrementa failed_attempts, bloquea si >= 5)
   - Registra auditoría (AUTH_LOGIN_FAIL)
   - Retorna 401
```

#### `changePassword(req, res)`
- Valida contraseña actual
- Valida fortaleza de nueva contraseña
- Actualiza password_hash en BD
- Establece `must_change_password = false`
- Genera nuevos tokens
- Registra cambio en auditoría

#### `me(req, res)`
- Retorna información del usuario autenticado
- Usa `req.user` del middleware `requireAuth`

**Seguridad:**
- Rate limiting: 50 intentos / 15 minutos en `/api/auth/login`
- Bloqueo temporal: 15 minutos tras 5 intentos fallidos
- Cookies httpOnly, secure en producción, sameSite configurable
- Auditoría completa de todos los eventos

---

### 2. Módulo de Gestión de Usuarios (`controllers/userController.js`)

**Responsabilidades:**
- CRUD completo de usuarios
- Asignación de roles
- Activación/desactivación de usuarios
- Soft delete y restauración
- Búsqueda y filtrado
- Paginación

**Funciones Principales:**

#### `createUser(req, res)`
- Crea nuevo usuario
- Valida correo único
- Hash de contraseña (bcrypt, 12 rounds)
- Asigna roles (puede ser múltiple)
- Registra en auditoría

#### `getUsers(req, res)`
- Lista usuarios con filtros:
  - Búsqueda por nombre/correo
  - Filtro por rol
  - Filtro por estado activo
  - Incluir/excluir eliminados
- Paginación (limit, offset)
- Ordenamiento (sortBy, sortDir)

#### `updateUser(req, res)`
- Actualización parcial de usuario
- Valida correo único si se cambia
- Soporta cambio de contraseña
- Actualiza roles si se especifican

#### `deleteUser(req, res)`
- Soft delete (marca `deleted_at`, no borra físicamente)
- Desactiva usuario (`is_active = false`)

#### `restoreUser(req, res)`
- Restaura usuario eliminado
- Limpia `deleted_at`
- Reactiva usuario

**Restricciones:**
- Solo usuarios con rol `admin` pueden acceder
- No se puede eliminar a sí mismo
- Validación de exclusión mutua: `cliente` vs staff (`admin`, `operador`, `analista`)

---

### 3. Módulo de Dashboard (`controllers/dashboardController.js`)

**Responsabilidades:**
- Agregación de datos del microservicio analytics
- Cálculo de KPIs
- Construcción de series temporales
- Evaluación de anomalías y alertas
- Mapeo de sensores a cabinas

**Funciones Principales:**

#### `main(req, res)` - Endpoint principal `/api/dashboard`

**Flujo de datos:**
```javascript
1. Consulta microservicio analytics (paralelo):
   - GET /api/analytics/summary
   - GET /api/analytics/system-health
   - GET /api/analytics/sensors/status
   - GET /api/data/measurements/recent?limit=500
   - GET /api/analytics/cabins/summary

2. Procesa datos:
   - buildKPIs(): Calcula 8 KPIs principales
   - buildCabins(): Mapea sensores a cabinas
   - buildVibrationSeries(): Construye serie temporal
   - evaluateAnomalies(): Detecta alertas

3. Filtra por rol:
   - Staff (admin/operador/analista): Ve alertas completas
   - Cliente: Sin alertas, datos limitados

4. Retorna estructura:
   {
     kpis: [...],
     vibrationSeries: [...],
     cabins: [...],
     historicalData: [...],
     alerts: [...],
     availableCabins: [...]
   }
```

#### `buildKPIs(summary, systemHealth, recent)`
Calcula 8 KPIs:
1. **RMS Promedio**: Root Mean Square de vibración
2. **Total Mediciones**: Cantidad de registros procesados
3. **Velocidad Promedio**: Velocidad promedio del sistema (m/s)
4. **Distancia Recorrida**: Distancia total estimada (km)
5. **Kurtosis Promedio**: Curtosis de vibración
6. **Crest Factor**: Factor de cresta promedio
7. **Pico Máximo**: Valor pico máximo registrado
8. **Estado Dominante**: Estado operativo más común

#### `evaluateAnomalies(entry)`
Evalúa cada medición y genera alertas según umbrales:

**Umbrales:**
- RMS: warning >= 1.5, critical >= 1.9
- Pico: warning >= 3.0, critical >= 4.0
- Crest Factor: warning si < 1.4 o > 6.0
- Kurtosis: warning >= 6.0, info si <= 1.2
- Velocidad: warning < 0.5 m/s, critical <= 0.2 m/s
- Frecuencia dominante: warning si fuera de 8-45 Hz (en crucero/reaceleración)

**Tipos de alertas:**
- `critical`: Requiere acción inmediata
- `warning`: Requiere atención
- `info`: Informativo

#### `buildVibrationSeries(recent, cabins)`
- Mapea mediciones a cabinas
- Ordena por timestamp
- Calcula alertas para cada punto
- Limita a 500 registros más recientes

**Restricciones de acceso:**
- Solo staff (`admin`, `operador`, `analista`)
- Clientes tienen dashboard separado (`/api/citizen`)

---

### 4. Módulo de Geoportal (`models/geoportalModel.js`)

**Responsabilidades:**
- Consulta de estaciones operativas
- Consulta de posición actual de cabinas
- Priorización de datos procesados (`mediciones`) sobre crudos (`telemetria_cruda`)
- Cálculo de estadísticas del sistema

**Funciones Principales:**

#### `getGeoportalData()`
```sql
-- Estaciones
SELECT estacion_id, nombre, tipo, latitud, longitud
FROM estaciones
WHERE estado_operativo = 'operativa'

-- Cabinas (con prioridad a mediciones)
SELECT DISTINCT ON (c.cabina_id)
  c.cabina_id,
  c.codigo_interno,
  c.estado_actual,
  s.sensor_id,
  COALESCE(m.latitud, tc.lat) AS latitud,
  COALESCE(m.longitud, tc.lon) AS longitud,
  COALESCE(m.velocidad, tc.velocidad_ms) AS velocidad,
  m.rms,
  m.estado_procesado
FROM cabinas c
JOIN sensores s ON c.cabina_id = s.cabina_id
LEFT JOIN LATERAL (
  SELECT * FROM mediciones m
  WHERE m.sensor_id = s.sensor_id
  ORDER BY m.timestamp DESC LIMIT 1
) m ON true
LEFT JOIN LATERAL (
  SELECT lat, lon, velocidad_kmh / 3.6 AS velocidad_ms
  FROM telemetria_cruda tc
  WHERE tc.sensor_id = s.sensor_id
  ORDER BY tc.timestamp DESC LIMIT 1
) tc ON true
WHERE c.estado_actual IN ('operativo', 'operativa', 'inusual', 'alerta')
```

**Estrategia de datos:**
1. Prioriza `mediciones` (datos procesados) para posición y métricas
2. Fallback a `telemetria_cruda` si no hay mediciones
3. Convierte velocidad de km/h a m/s cuando es necesario

#### `computeStats(cabins)`
Calcula:
- Número de cabinas activas
- Velocidad promedio
- Estado del sistema (normal/warning/alert)
- Última actualización

**Endpoints:**
- Público: `GET /api/map/cabins` (sin autenticación)
- Detallado: Usa mismo endpoint pero con más datos si está autenticado

---

### 5. Módulo de Roles (`controllers/roleController.js`)

**Responsabilidades:**
- CRUD de roles
- Asignación de roles a usuarios
- Validación de permisos

**Roles del Sistema:**
- `admin`: Acceso completo, gestión de usuarios y roles
- `operador`: Operaciones y monitoreo
- `analista`: Análisis de datos y reportes
- `cliente`: Acceso limitado a dashboard ciudadano

**Funciones Principales:**
- `getRoles()`: Lista todos los roles
- `createRole()`: Crea nuevo rol
- `updateRole()`: Actualiza rol existente
- `deleteRole()`: Elimina rol (soft delete)

**Restricciones:**
- Solo `admin` puede gestionar roles
- No se pueden eliminar roles asignados a usuarios

---

### 6. Módulo de Auditoría (`middlewares/audit.js`)

**Responsabilidades:**
- Registro de eventos del sistema
- Trazabilidad de acciones de usuarios
- Logging de seguridad

**Eventos Registrados:**
- `AUTH_LOGIN_SUCCESS` / `AUTH_LOGIN_FAIL`
- `AUTH_LOGOUT`
- `AUTH_PASSWORD_CHANGED`
- `AUTH_PASSWORD_RESET_REQUESTED` / `AUTH_PASSWORD_RESET_COMPLETED`
- `USER_CREATED` / `USER_UPDATED` / `USER_DELETED`
- `ROLE_ASSIGNED` / `ROLE_REMOVED`

**Estructura de registro:**
```javascript
{
  evento_id: BigInteger,
  evento_tipo: String,
  actor_id: Integer (usuario_id),
  actor_email: String,
  ip_address: String,
  user_agent: String,
  metadata: JSON,
  timestamp: DateTime
}
```

**Funciones:**
- `auditEvent({ event, actorId, actorEmail, ip, metadata })`: Registra evento

---

## Base de Datos

### Esquema Principal

#### Tabla `usuarios`
```sql
CREATE TABLE usuarios (
  usuario_id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  correo VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'usuario',
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT false,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP,
  password_updated_at TIMESTAMP,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**Índices:**
- `idx_usuarios_correo` en `correo`
- `idx_usuarios_rol` en `rol`
- `idx_usuarios_deleted_at` en `deleted_at`

#### Tabla `roles`
```sql
CREATE TABLE roles (
  rol_id SERIAL PRIMARY KEY,
  nombre_rol VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  permisos JSON,
  creado_en TIMESTAMP DEFAULT NOW()
);
```

#### Tabla `usuario_roles`
```sql
CREATE TABLE usuario_roles (
  usuario_rol_id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(usuario_id),
  rol_id INTEGER REFERENCES roles(rol_id),
  asignado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, rol_id)
);
```

#### Tabla `cabinas`
```sql
CREATE TABLE cabinas (
  cabina_id SERIAL PRIMARY KEY,
  codigo_interno VARCHAR(50) UNIQUE,
  estado_actual VARCHAR(50),
  linea_id INTEGER REFERENCES lineas(linea_id)
);
```

#### Tabla `sensores`
```sql
CREATE TABLE sensores (
  sensor_id SERIAL PRIMARY KEY,
  cabina_id INTEGER UNIQUE REFERENCES cabinas(cabina_id),
  tipo_sensor VARCHAR(50),
  activo BOOLEAN DEFAULT true
);
```

#### Tabla `telemetria_cruda`
```sql
CREATE TABLE telemetria_cruda (
  telemetria_id BIGSERIAL PRIMARY KEY,
  sensor_id INTEGER REFERENCES sensores(sensor_id),
  timestamp TIMESTAMP NOT NULL,
  numero_cabina INTEGER,
  codigo_cabina VARCHAR(50),
  lat NUMERIC(10, 8),
  lon NUMERIC(11, 8),
  alt NUMERIC(8, 2),
  velocidad_kmh NUMERIC(6, 2),
  aceleracion_m_s2 NUMERIC(6, 2),
  temperatura_c NUMERIC(5, 2),
  vibracion_x NUMERIC(8, 4),
  vibracion_y NUMERIC(8, 4),
  vibracion_z NUMERIC(8, 4),
  direccion VARCHAR(50),
  pos_m NUMERIC(10, 2)
);
```

**Índices:**
- `idx_telemetria_sensor_timestamp` en `(sensor_id, timestamp)`
- `idx_telemetria_timestamp` en `timestamp`

#### Tabla `mediciones`
```sql
CREATE TABLE mediciones (
  medicion_id BIGSERIAL PRIMARY KEY,
  sensor_id INTEGER REFERENCES sensores(sensor_id),
  timestamp TIMESTAMP NOT NULL,
  latitud NUMERIC(10, 8),
  longitud NUMERIC(11, 8),
  altitud NUMERIC(8, 2),
  velocidad NUMERIC(6, 2),
  rms NUMERIC(8, 4),
  kurtosis NUMERIC(8, 4),
  skewness NUMERIC(8, 4),
  zcr NUMERIC(8, 4),
  pico NUMERIC(8, 4),
  crest_factor NUMERIC(8, 4),
  frecuencia_media NUMERIC(8, 4),
  frecuencia_dominante NUMERIC(8, 4),
  amplitud_max_espectral NUMERIC(8, 4),
  energia_banda_1 NUMERIC(8, 4),
  energia_banda_2 NUMERIC(8, 4),
  energia_banda_3 NUMERIC(8, 4),
  estado_procesado VARCHAR(50)
);
```

**Índices:**
- `idx_mediciones_sensor_timestamp` en `(sensor_id, timestamp DESC)`
- `idx_mediciones_timestamp` en `timestamp DESC`

#### Tabla `auditoria`
```sql
CREATE TABLE auditoria (
  evento_id BIGSERIAL PRIMARY KEY,
  evento_tipo VARCHAR(100) NOT NULL,
  actor_id INTEGER REFERENCES usuarios(usuario_id),
  actor_email VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

**Índices:**
- `idx_auditoria_evento_tipo` en `evento_tipo`
- `idx_auditoria_actor_id` en `actor_id`
- `idx_auditoria_timestamp` en `timestamp DESC`

#### Tabla `estaciones`
```sql
CREATE TABLE estaciones (
  estacion_id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50),
  latitud NUMERIC(10, 8),
  longitud NUMERIC(11, 8),
  altitud NUMERIC(8, 2),
  estado_operativo VARCHAR(50) DEFAULT 'operativa'
);
```

#### Tabla `modelos_ml`
```sql
CREATE TABLE modelos_ml (
  modelo_id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  framework VARCHAR(50),
  fecha_entrenamiento TIMESTAMP,
  descripcion TEXT,
  parametros JSONB,
  metricas JSONB
);
```

#### Tabla `predicciones`
```sql
CREATE TABLE predicciones (
  prediccion_id BIGSERIAL PRIMARY KEY,
  medicion_id BIGINT REFERENCES mediciones(medicion_id),
  modelo_id INTEGER REFERENCES modelos_ml(modelo_id),
  clase_predicha VARCHAR(50) NOT NULL,
  probabilidades JSONB,
  timestamp_prediccion TIMESTAMP DEFAULT NOW()
);
```

### Relaciones

```
usuarios ←─── usuario_roles ───→ roles
cabinas ←─── sensores
sensores ←─── telemetria_cruda
sensores ←─── mediciones
mediciones ←─── predicciones ───→ modelos_ml
usuarios ←─── auditoria
```

---

## Seguridad y Autenticación

### Autenticación JWT

**Configuración:**
- **Access Token**: Expira en 1 hora (`JWT_EXPIRES_IN=1h`)
- **Refresh Token**: Expira en 7 días (`REFRESH_JWT_EXPIRES_IN=7d`)
- **Algoritmo**: HS256
- **Secrets**: `JWT_SECRET` y `REFRESH_JWT_SECRET` (variables de entorno)

**Payload del Token:**
```javascript
{
  id: usuario_id,
  email: correo,
  rol: rol_principal,
  must_change_password: boolean,
  iat: issued_at,
  exp: expiration
}
```

**Cookies:**
- `access_token`: HttpOnly, Secure en producción, SameSite configurable
- `refresh_token`: HttpOnly, Secure en producción, SameSite configurable
- Path: `/`
- Max-Age: 1h (access), 7d (refresh)

### Middleware de Autenticación

#### `requireAuth(req, res, next)`
1. Extrae token de cookie o header `Authorization: Bearer <token>`
2. Verifica token con `verifyAccessToken()`
3. Si expiró pero hay refresh token válido:
   - Genera nuevo access token
   - Opcionalmente rota refresh token
   - Continúa con la petición
4. Si `must_change_password === true`:
   - Bloquea acceso excepto a rutas permitidas:
     - `/api/auth/me`
     - `/api/auth/change-password`
     - `/api/auth/logout`
5. Adjunta `req.user` con datos del token

#### `requireRole(...roles)`
- Verifica que `req.user.rol` esté en la lista de roles permitidos
- Soporta múltiples roles: `requireRole('admin', 'operador')`
- Retorna 403 si no tiene permisos

### Seguridad HTTP (Helmet)

**Configuración CSP (Content Security Policy):**
```javascript
{
  'default-src': ["'self'"],
  'script-src': ["'self'", 'https://api.mapbox.com', 'https://events.mapbox.com', "'unsafe-inline'"],
  'style-src': ["'self'", 'https://api.mapbox.com', 'https://fonts.googleapis.com', "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https://api.mapbox.com', 'https://images.unsplash.com'],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https://api.mapbox.com'],
  'frame-ancestors': ["'self'"],
  'worker-src': ["'self'", 'blob:', 'https://api.mapbox.com']
}
```

**Otros headers:**
- `X-Content-Type-Options: nosniff`
- `X-Powered-By: (removido)`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Rate Limiting

**Login:**
- 50 intentos / 15 minutos por IP
- Endpoint: `/api/auth/login`

**API General:**
- 600 requests / minuto por IP
- Endpoint: `/api/*`

### Sanitización

**XSS Protection:**
- Sanitización automática de `req.body`, `req.query`, `req.params`
- Usa librería `xss` para limpiar strings
- Recursivo para objetos y arrays anidados

### Protección de Contraseñas

**Hashing:**
- Algoritmo: bcrypt
- Rounds: 12 (configurable)
- Salt automático

**Validación de Fortaleza:**
- Mínimo 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 minúscula
- Al menos 1 número
- (Opcional) Al menos 1 carácter especial

**Bloqueo de Cuenta:**
- 5 intentos fallidos → Bloqueo por 15 minutos
- Campo `locked_until` en BD
- Campo `failed_attempts` se resetea en login exitoso

---

## Microservicio de Analytics

### Arquitectura

El microservicio de analytics es una aplicación **FastAPI** independiente que se comunica con el backend Node.js mediante HTTP. Procesa datos de telemetría, calcula métricas analíticas y proporciona endpoints para consultas.

### Configuración (`app/core/config.py`)

**Variables de Entorno:**
- `DATABASE_URL`: URL de conexión PostgreSQL (o construye desde `DB_*`)
- `DEBUG`: Modo debug (default: false)
- `ENABLE_SIMULATOR`: Activa simulador (default: true si DEBUG)
- `SIMULATOR_INTERVAL_SECONDS`: Intervalo de simulación (default: 5)
- `SIMULATOR_SLICE_SIZE`: Tamaño de lote (default: 1)
- `ML_CONTAMINATION`: Contaminación para detección de anomalías (default: 0.1)
- `CORS_ORIGINS`: Orígenes permitidos (default: ["*"])

### Servicios Principales

#### 1. TelemetryProcessor (`app/services/telemetry_processor.py`)

**Responsabilidades:**
- Procesamiento de datos de `telemetria_cruda`
- Cálculo de métricas vibracionales
- Análisis espectral (FFT)
- Clasificación de estados operativos
- Inserción en `mediciones`

**Métricas Calculadas:**

1. **RMS (Root Mean Square)**
   ```python
   rms = sqrt(vibracion_x² + vibracion_y² + vibracion_z²)
   ```

2. **Kurtosis**
   ```python
   kurtosis = E[(X - μ)⁴] / σ⁴ - 3
   ```
   - Mide "colas" de la distribución
   - Valores altos indican picos/choques

3. **Skewness (Asimetría)**
   ```python
   skewness = E[(X - μ)³] / σ³
   ```
   - Mide asimetría de la distribución

4. **ZCR (Zero Crossing Rate)**
   ```python
   zcr = número de cruces por cero / longitud de señal
   ```
   - Frecuencia de cambios de signo

5. **Pico Máximo**
   ```python
   pico = max(|vibracion_x|, |vibracion_y|, |vibracion_z|)
   ```

6. **Crest Factor**
   ```python
   crest_factor = pico / rms
   ```
   - Relación entre pico y RMS
   - Valores altos indican picos aislados

7. **Frecuencia Media**
   ```python
   frecuencia_media = sum(f * |FFT(f)|) / sum(|FFT(f)|)
   ```

8. **Frecuencia Dominante**
   ```python
   frecuencia_dominante = argmax(|FFT(f)|)
   ```

9. **Análisis Espectral**
   - FFT (Fast Fourier Transform)
   - Amplitud máxima espectral
   - Energía por bandas de frecuencia (3 bandas)

**Clasificación de Estados:**
- `Inicio`: Velocidad < 1 m/s, aceleración > 0.5
- `Crucero`: Velocidad > 3 m/s, aceleración baja
- `Frenado`: Velocidad > 0, aceleración < -0.5
- `Zona lenta`: Velocidad 1-3 m/s
- `Reaceleración`: Velocidad > 0, aceleración > 0.5

**Métodos Públicos:**
- `process_new_telemetry()`: Procesa datos nuevos
- `build_metrics_for_row(row, previous_row, distancia_acumulada)`: Calcula métricas para una fila
- `build_measurement_model(metrics)`: Construye modelo `Medicion` desde métricas

#### 2. TelemetrySimulator (`app/services/telemetry_simulator.py`)

**Responsabilidades:**
- Simulación continua de datos de telemetría
- Lee `telemetria_cruda` en orden
- Procesa y escribe en `mediciones` cada N segundos
- Ejecuta en background como `asyncio.Task`

**Flujo:**
```python
1. Inicialización:
   - Lee todos los registros de telemetria_cruda ordenados
   - Almacena en memoria (o itera sobre BD)

2. Loop principal (cada 5 segundos):
   - Obtiene siguiente lote (slice_size registros)
   - Para cada registro:
     a. Llama a TelemetryProcessor.build_metrics_for_row()
     b. Construye modelo Medicion
     c. Inserta en BD
   - Incrementa índice
   - Si llega al final, reinicia desde el inicio

3. Manejo de sesiones:
   - Crea nueva sesión SQLAlchemy por lote
   - Commit y cierra sesión después de cada lote
```

**Estado:**
- `current_index`: Índice actual en secuencia
- `current_cycle`: Ciclo actual (reinicios)
- `processed_measurements`: Total procesado
- `running`: Si está activo

**Endpoint de Estado:**
- `GET /api/simulator/status`: Retorna estado del simulador

#### 3. AnalyticsService (`app/services/analytics.py`)

**Responsabilidades:**
- Agregación de datos históricos
- Cálculo de estadísticas del sistema
- Análisis de tendencias
- Resúmenes por sensor/cabina

**Métodos:**
- `summary()`: Resumen general del sistema
- `get_system_health()`: Estado de salud del sistema
- `get_sensor_analytics(sensor_id, days)`: Análisis de sensor específico
- `get_cabins_summary()`: Resumen de todas las cabinas

#### 4. MLPredictionService (`app/services/ml.py`)

**Responsabilidades:**
- Detección de anomalías (Isolation Forest)
- Clasificación de estados (opcional)
- Predicciones de mantenimiento

**Modelos:**
- Isolation Forest para detección de anomalías
- DBSCAN para clustering (opcional)

### Endpoints FastAPI

#### Procesamiento
- `POST /api/analytics/process`: Procesa datos nuevos manualmente
- `GET /api/analytics/trayecto`: Obtiene trayectoria completa

#### Datos
- `GET /api/data/measurements/recent?limit=500`: Mediciones recientes
- `GET /api/data/measurements/{medicion_id}`: Medición específica

#### Analytics
- `GET /api/analytics/summary`: Resumen general
- `GET /api/analytics/system-health`: Estado de salud
- `GET /api/analytics/sensor/{sensor_id}?days=7`: Análisis de sensor
- `GET /api/analytics/sensors/status`: Estado de todos los sensores
- `GET /api/analytics/cabins/summary`: Resumen de cabinas

#### ML
- `GET /api/models`: Lista de modelos ML
- `POST /api/models/train`: Entrena nuevo modelo
- `GET /api/predictions/{prediccion_id}`: Predicción específica

#### Simulador
- `GET /api/simulator/status`: Estado del simulador

### Integración con Backend Node.js

El backend Node.js actúa como **proxy** hacia el microservicio:

```javascript
// app.js
const ANALYTICS_BASE_URL = process.env.ANALYTICS_BASE_URL || 'http://localhost:8001/api';

async function proxyToAnalytics(req, res, upstreamPath) {
  const url = `${ANALYTICS_BASE_URL}${upstreamPath}`;
  const resp = await fetch(url, {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
  });
  // ... reenvía respuesta
}

// Rutas proxy
app.use('/api/analytics', requireAuth, requireRole('admin','operador','analista'), 
  (req, res) => proxyToAnalytics(req, res, `/analytics${req.path}`));
```

**Ventajas:**
- Backend centraliza autenticación/autorización
- Frontend no necesita conocer múltiples URLs
- CORS simplificado (solo backend → analytics)

---

## Frontend React

### Arquitectura de Componentes

#### Componente Raíz: `App.tsx`

**Responsabilidades:**
- Gestión de estado de autenticación
- Routing basado en `AppView` type
- Hidratación de sesión al cargar
- Manejo de login/logout

**Estados:**
```typescript
type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
};

type AppView = 
  | 'landing'
  | 'geoportal-public'
  | 'dashboard'
  | 'geoportal-detail'
  | 'user-management'
  | 'citizen-dashboard'
  | 'novacore';
```

**Flujo:**
1. Al montar: `useEffect` → `GET /api/auth/me` → Hidrata sesión
2. `handleViewChange(view)`: Valida permisos, cambia vista
3. `handleLogin(user)`: Actualiza auth state, redirige
4. `handleLogout()`: Limpia sesión, redirige a landing

#### Componentes Principales

##### 1. `LandingPage.tsx`
- Página de inicio pública
- Botón "Conocer Más" → Navega a `/novacore`
- Botón "Iniciar Sesión" → Abre `LoginModal`
- Botón "Ver Mapa" → Navega a `/geoportal-public`

##### 2. `Dashboard.tsx` (Staff)
- **Polling**: Cada 10 segundos → `GET /api/dashboard`
- **KPIs**: 8 tarjetas con métricas principales
- **Gráfico de Vibración**: Serie temporal de RMS (Recharts)
- **Tabla de Cabinas**: Estado, velocidad, vibración
- **Historial**: Últimas 50 mediciones
- **Alertas**: Lista de anomalías (solo si tiene permisos)

**Estructura:**
```typescript
const [kpis, setKpis] = useState([]);
const [vibrationSeries, setVibrationSeries] = useState([]);
const [cabins, setCabins] = useState([]);
const [alerts, setAlerts] = useState([]);

useEffect(() => {
  loadDashboard();
  const interval = setInterval(loadDashboard, 10000);
  return () => clearInterval(interval);
}, []);
```

##### 3. `CitizenDashboard.tsx`
- Dashboard simplificado para clientes
- Sin alertas ni datos sensibles
- Métricas básicas del sistema

##### 4. `PublicGeoportal.tsx` / `DetailedGeoportal.tsx`
- **Mapa Mapbox**: Visualización geográfica
- **Polling**: Cada 5 segundos → `GET /api/map/cabins`
- **Marcadores**:
  - Estaciones (puntos fijos)
  - Cabinas (puntos móviles con color según estado)
- **Popup**: Información detallada al hacer clic
- **Estadísticas**: Resumen del sistema

**Configuración Mapbox:**
```typescript
const [viewState, setViewState] = useState({
  longitude: -75.5636,
  latitude: 6.2476,
  zoom: 12,
  pitch: 0,
  bearing: 0
});
```

##### 5. `UserManagement.tsx` (Admin)
- **CRUD Usuarios**: Crear, editar, eliminar, restaurar
- **Búsqueda y Filtros**: Por nombre, correo, rol, estado
- **Asignación de Roles**: Checkboxes con exclusión mutua
- **Validación**: Email, password strength, roles

**Funcionalidades:**
- Crear usuario con roles múltiples
- Editar usuario (nombre, correo, roles, estado)
- Soft delete (marca `deleted_at`)
- Restaurar usuario eliminado
- Validación de exclusión: `cliente` vs staff

##### 6. `LoginModal.tsx`
- Modal de autenticación
- Formulario de login
- Modal de cambio de contraseña (si `must_change_password`)
- Validación de campos
- Manejo de errores

##### 7. `Navbar.tsx`
- Barra de navegación superior
- Logo y menú según autenticación
- Botones de login/logout
- Navegación entre vistas

##### 8. `NovacorePage.tsx`
- Página corporativa de NOVACORE
- Secciones:
  - Hero: Título, logo, CTAs
  - About: "Quiénes somos"
  - Mission/Vision: Misión, visión, valores
  - Services: "Qué hacemos"
  - Team: 4 tarjetas de equipo
  - KPIs: Métricas de proyectos (con modales)
  - Projects: Proyectos destacados
  - Timeline: Evolución de la empresa
  - Footer: Copyright y enlaces

**Animaciones:**
- Scroll reveal con `IntersectionObserver`
- Hover effects en tarjetas
- Gradientes animados en hero

### Sistema de UI (shadcn/ui)

**Componentes Utilizados:**
- `Button`, `Input`, `Label`, `Card`
- `Dialog`, `Modal`, `Alert`
- `Table`, `Tabs`, `Select`
- `Checkbox`, `Radio`, `Switch`
- `Toast` (Sonner)
- `Tooltip`, `Popover`, `Dropdown`

**Estilos:**
- Tailwind CSS para utilidades
- Tema oscuro/claro (next-themes)
- Variables CSS para colores

### Estado y Comunicación

**Estado Local:**
- `useState` para estado de componentes
- `useEffect` para efectos secundarios
- `useCallback` para funciones memoizadas

**Comunicación con Backend:**
- `fetch` nativo con `credentials: 'include'` (cookies)
- Manejo de errores con try/catch
- Respuestas estandarizadas: `{ ok: boolean, data?: any, error?: any }`

**Polling:**
- `setInterval` para actualización automática
- Limpieza en `useEffect` cleanup

---

## APIs y Endpoints

### Backend Node.js

#### Autenticación (`/api/auth`)
- `POST /api/auth/login`: Login de usuario
- `POST /api/auth/logout`: Cerrar sesión
- `GET /api/auth/me`: Usuario actual
- `POST /api/auth/refresh`: Renovar token
- `POST /api/auth/change-password`: Cambiar contraseña
- `POST /api/auth/forgot-password`: Solicitar reset
- `POST /api/auth/reset-password`: Resetear contraseña

#### Usuarios (`/api/users`) - Requiere `admin`
- `GET /api/users`: Lista usuarios (con filtros y paginación)
- `POST /api/users`: Crear usuario
- `GET /api/users/:id`: Obtener usuario
- `PATCH /api/users/:id`: Actualizar usuario
- `DELETE /api/users/:id`: Eliminar usuario (soft)
- `PATCH /api/admin/users/:id/restore`: Restaurar usuario

#### Roles (`/api/roles`) - Requiere `admin`
- `GET /api/roles`: Lista roles
- `POST /api/roles`: Crear rol
- `GET /api/roles/:id`: Obtener rol
- `PATCH /api/roles/:id`: Actualizar rol
- `DELETE /api/roles/:id`: Eliminar rol

#### Dashboard (`/api/dashboard`) - Requiere staff
- `GET /api/dashboard`: Dashboard principal
  - Retorna: KPIs, series de vibración, cabinas, historial, alertas

#### Ciudadano (`/api/citizen`) - Requiere `cliente`
- `GET /api/citizen/dashboard`: Dashboard ciudadano
- `GET /api/citizen/analytics/*`: Proxy a analytics (limitado)

#### Geoportal (`/api/map`)
- `GET /api/map/cabins`: Datos de cabinas y estaciones (público)
- `GET /api/map/stations`: Lista de estaciones

#### Proxy Analytics (`/api/analytics/*`, `/api/data/*`, `/api/models/*`, `/api/predictions/*`)
- Todas las rutas se proxean al microservicio FastAPI
- Requieren autenticación y rol staff (excepto algunas públicas)

### Microservicio FastAPI

#### Health
- `GET /health`: Health check

#### Procesamiento
- `POST /api/analytics/process`: Procesa datos nuevos
- `GET /api/analytics/trayecto`: Trayectoria completa

#### Datos
- `GET /api/data/measurements/recent?limit=500`: Mediciones recientes
- `GET /api/data/measurements/{id}`: Medición específica

#### Analytics
- `GET /api/analytics/summary`: Resumen general
- `GET /api/analytics/system-health`: Estado de salud
- `GET /api/analytics/sensor/{id}?days=7`: Análisis de sensor
- `GET /api/analytics/sensors/status`: Estado de sensores
- `GET /api/analytics/cabins/summary`: Resumen de cabinas

#### ML
- `GET /api/models`: Lista modelos
- `POST /api/models/train`: Entrenar modelo
- `GET /api/predictions/{id}`: Predicción específica

#### Simulador
- `GET /api/simulator/status`: Estado del simulador

---

## Procesamiento de Datos

### Pipeline de Procesamiento

```
telemetria_cruda (Datos sin procesar)
    │
    ▼
TelemetryProcessor.process_new_telemetry()
    │
    ├─► Para cada registro:
    │   ├─► Calcula métricas vibracionales
    │   ├─► Análisis espectral (FFT)
    │   ├─► Clasifica estado operativo
    │   └─► Calcula distancia acumulada
    │
    ▼
mediciones (Datos procesados)
    │
    ├─► Consumido por Dashboard
    ├─► Consumido por Geoportal
    └─► Usado para predicciones ML
```

### Métricas Vibracionales

#### RMS (Root Mean Square)
```python
rms = sqrt(vibracion_x² + vibracion_y² + vibracion_z²)
```
- **Propósito**: Medida global de vibración
- **Umbrales**: 
  - Normal: < 1.5
  - Warning: >= 1.5
  - Critical: >= 1.9

#### Kurtosis
```python
kurtosis = E[(X - μ)⁴] / σ⁴ - 3
```
- **Propósito**: Detecta picos/choques
- **Interpretación**:
  - Normal: ~0 (distribución normal)
  - Alto (>6): Picos aislados, posibles fallos

#### Skewness
```python
skewness = E[(X - μ)³] / σ³
```
- **Propósito**: Mide asimetría
- **Interpretación**:
  - Positivo: Cola a la derecha
  - Negativo: Cola a la izquierda

#### ZCR (Zero Crossing Rate)
```python
zcr = número_cruces_cero / longitud_señal
```
- **Propósito**: Frecuencia de cambios de signo
- **Uso**: Detección de patrones rítmicos

#### Crest Factor
```python
crest_factor = pico_maximo / rms
```
- **Propósito**: Relación pico/RMS
- **Umbrales**:
  - Normal: 1.4 - 6.0
  - Bajo (<1.4): Señal muy uniforme
  - Alto (>6.0): Picos aislados, posibles golpes

### Análisis Espectral

#### FFT (Fast Fourier Transform)
```python
fft_result = fft(vibracion_signal)
frequencies = fftfreq(len(signal), sample_rate)
amplitude_spectrum = abs(fft_result)
```

**Métricas derivadas:**
- **Frecuencia Media**: Promedio ponderado de frecuencias
- **Frecuencia Dominante**: Frecuencia con mayor amplitud
- **Amplitud Máxima Espectral**: Valor máximo del espectro
- **Energía por Bandas**: Energía en 3 bandas de frecuencia

### Clasificación de Estados

**Algoritmo:**
```python
if velocidad < 1.0 and aceleracion > 0.5:
    estado = "Inicio"
elif velocidad > 3.0 and abs(aceleracion) < 0.3:
    estado = "Crucero"
elif aceleracion < -0.5:
    estado = "Frenado"
elif 1.0 <= velocidad <= 3.0:
    estado = "Zona lenta"
elif aceleracion > 0.5:
    estado = "Reaceleración"
else:
    estado = "Desconocido"
```

### Detección de Anomalías

**Métodos:**
1. **Umbrales Fijos**: RMS, pico, crest factor, etc.
2. **Isolation Forest**: Modelo ML para detección de outliers
3. **DBSCAN**: Clustering para identificar grupos anómalos

**Alertas Generadas:**
- `RMS_HIGH`: Vibración global elevada
- `PEAK_HIGH`: Picos de vibración altos
- `CREST_FACTOR_LOW/HIGH`: Factor de cresta fuera de rango
- `KURTOSIS_HIGH`: Kurtosis elevada (pulsos/choques)
- `VELOCITY_STALL`: Cabina casi detenida
- `FREQ_DOM_OUTLIER`: Frecuencia dominante fuera de rango

---

## Despliegue y Configuración

### Variables de Entorno

#### Backend Node.js (`.env` en raíz)
```env
NODE_ENV=development
PORT=3000

# Base de datos
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=urbanflow_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=change_me_secret_key
REFRESH_JWT_SECRET=change_me_refresh_secret
JWT_EXPIRES_IN=1h
REFRESH_JWT_EXPIRES_IN=7d

# Cookies
AUTH_COOKIE_NAME=access_token
REFRESH_COOKIE_NAME=refresh_token
COOKIE_SECURE=false  # true en producción
COOKIE_SAME_SITE=None  # Lax/Strict en producción

# CORS
FRONTEND_URL=http://localhost:5173

# Analytics Microservice
ANALYTICS_BASE_URL=http://localhost:8001/api
```

#### Microservicio Analytics (mismo `.env` o variables separadas)
```env
# Database (usa DB_* del backend o especifica)
ANALYTICS_DATABASE_URL=postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/urbanflow_db

# Simulador
ENABLE_SIMULATOR=true
SIMULATOR_INTERVAL_SECONDS=5
SIMULATOR_SLICE_SIZE=1

# ML
ML_CONTAMINATION=0.1
ML_RANDOM_STATE=42
ML_DBSCAN_EPS=0.5
ML_DBSCAN_MIN_SAMPLES=5

# Logging
LOG_LEVEL=INFO
DEBUG=false
```

### Scripts de Inicio

#### Desarrollo

**Terminal 1 - Backend:**
```bash
npm install
npm run dev  # nodemon app.js
```

**Terminal 2 - Frontend:**
```bash
cd views
npm install
npm run dev  # vite dev server (puerto 5173)
```

**Terminal 3 - Analytics:**
```bash
cd microservices/analytics
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

#### Producción

**Backend:**
```bash
npm install --production
npm run build  # Si hay build steps
NODE_ENV=production PORT=3000 node app.js
```

**Frontend:**
```bash
cd views
npm install
npm run build  # Genera views/build/
# Servido por Express en /static
```

**Analytics:**
```bash
cd microservices/analytics
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
```

### Docker (Opcional)

**Analytics:**
```bash
cd microservices/analytics
docker build -t urbanflow-analytics:latest .
docker run -p 8001:8001 \
  -e ANALYTICS_DATABASE_URL="postgresql+psycopg2://..." \
  urbanflow-analytics:latest
```

### Base de Datos

**Inicialización:**
```bash
# Crear base de datos
createdb urbanflow_db

# Ejecutar scripts SQL
psql -d urbanflow_db -f docs/urbanflow_db.sql
psql -d urbanflow_db -f docs/Esquema_base_de_datos.sql
```

**Extensiones:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Health Checks

- Backend: `GET http://localhost:3000/health`
- Analytics: `GET http://localhost:8001/health`

---

## Consideraciones Finales

### Rendimiento

- **Polling**: Dashboard (10s), Geoportal (5s)
- **Caché**: Headers `Cache-Control` para assets estáticos
- **Pool de conexiones**: PostgreSQL pool (max 20 conexiones)
- **Batch processing**: Inserción en lotes en analytics

### Escalabilidad

- **Horizontal**: Múltiples instancias de backend (load balancer)
- **Base de datos**: Read replicas para consultas
- **Analytics**: Workers independientes, puede escalar horizontalmente
- **Frontend**: CDN para assets estáticos

### Monitoreo

- **Logs**: Morgan (HTTP), Python logging (analytics)
- **Auditoría**: Tabla `auditoria` para trazabilidad
- **Health checks**: Endpoints `/health` en ambos servicios

### Seguridad

- **HTTPS**: Obligatorio en producción
- **Secrets**: Variables de entorno, nunca en código
- **Rate limiting**: Protección contra fuerza bruta
- **Sanitización**: XSS protection en todos los inputs
- **CSP**: Content Security Policy configurada
- **Cookies**: HttpOnly, Secure, SameSite

---

## Conclusión

UrbanFlow Platform es una solución completa y robusta para la gestión de sistemas de transporte por cable. Combina un backend Node.js eficiente, un microservicio de analytics potente, y un frontend React moderno, todo integrado con una base de datos PostgreSQL robusta.

La arquitectura modular permite escalabilidad y mantenibilidad, mientras que las medidas de seguridad implementadas protegen tanto los datos como los usuarios del sistema.

---

**Última actualización**: Enero 2025  
**Versión del documento**: 1.0  
**Autor**: Equipo de Desarrollo UrbanFlow


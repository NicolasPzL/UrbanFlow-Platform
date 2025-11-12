# 📘 DOCUMENTACIÓN COMPLETA DEL SISTEMA URBANFLOW PLATFORM

## 🎯 VISIÓN GENERAL DEL SISTEMA

**UrbanFlow Platform** es una solución tecnológica integral diseñada para la gestión, monitoreo y análisis predictivo de sistemas de transporte por cable (metrocable). La plataforma integra múltiples tecnologías para crear un ecosistema completo que transforma datos de sensores IoT en información operativa valiosa para la toma de decisiones en tiempo real.

### **Propósito del Sistema**
- **Monitoreo en tiempo real** del estado operativo de las cabinas
- **Análisis predictivo** mediante algoritmos de Machine Learning
- **Visualización geográfica** interactiva de la operación
- **Gestión de usuarios** con roles y permisos diferenciados
- **Detección temprana** de anomalías y mantenimiento predictivo

---

## 🏗️ ARQUITECTURA GENERAL DEL SISTEMA

### **Arquitectura de Microservicios**

El sistema está compuesto por **tres componentes principales** que se comunican mediante APIs REST:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/TypeScript)              │
│                    Puerto: 5173 (desarrollo)                │
│                    Puerto: 3000 (producción)                │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/HTTPS
                       │ (APIs REST)
┌──────────────────────▼──────────────────────────────────────┐
│              BACKEND PRINCIPAL (Node.js/Express)            │
│                    Puerto: 3000                              │
│  - Autenticación JWT                                         │
│  - Proxy hacia microservicio                                │
│  - Gestión de usuarios y roles                             │
│  - Controladores de dashboard                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP Proxy
                       │ (ANALYTICS_BASE_URL)
┌──────────────────────▼──────────────────────────────────────┐
│        MICROSERVICIO DE ANALYTICS (Python/FastAPI)          │
│                    Puerto: 8001                              │
│  - Procesamiento de telemetría                              │
│  - Cálculos matemáticos (RMS, FFT, Haversine)              │
│  - Machine Learning (Isolation Forest, DBSCAN)              │
│  - Clasificación de estados operativos                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQL (SQLAlchemy)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              BASE DE DATOS (PostgreSQL)                     │
│                    Puerto: 5432                              │
│  - Tablas: usuarios, mediciones, predicciones, etc.         │
└─────────────────────────────────────────────────────────────┘
```

### **Patrón de Comunicación**

1. **Frontend ↔ Backend**: Comunicación directa mediante fetch API
2. **Backend ↔ Microservicio**: Proxy HTTP transparente
3. **Microservicio ↔ Base de Datos**: ORM SQLAlchemy
4. **Backend ↔ Base de Datos**: Pool de conexiones PostgreSQL (pg)

---

## 📁 ESTRUCTURA COMPLETA DE ARCHIVOS

### **Raíz del Proyecto**

```
UrbanFlow-Platform/
├── 📂 config/                    # Configuración del sistema
│   ├── auth.js                   # Configuración JWT y cookies
│   └── db.js                     # Pool de conexiones PostgreSQL
│
├── 📂 controllers/                # Lógica de negocio (MVC)
│   ├── authController.js         # Login, logout, refresh token
│   ├── userController.js          # CRUD de usuarios
│   ├── roleController.js         # CRUD de roles
│   ├── dashboardController.js     # Dashboard operacional
│   ├── citizenController.js      # Dashboard ciudadano
│   └── publicController.js       # Geoportal público
│
├── 📂 models/                     # Modelos de datos
│   ├── userModel.js              # Operaciones con usuarios
│   ├── rolModel.js               # Operaciones con roles
│   ├── geoportalModel.js         # Datos del geoportal
│   ├── auditoriaModel.js         # Registro de auditoría
│   └── userRolModel.js           # Relación usuarios-roles
│
├── 📂 routes/                     # Definición de rutas API
│   ├── authRoutes.js             # /api/auth/*
│   ├── userRoutes.js             # /api/users/*
│   ├── roleRoutes.js             # /api/roles/*
│   ├── dashboardRoutes.js        # /api/dashboard/*
│   ├── citizenRoutes.js         # /api/citizen/*
│   └── publicRoutes.js           # /api/map/*
│
├── 📂 middlewares/                # Middlewares de Express
│   ├── auth.js                   # Autenticación JWT
│   ├── errorHandler.js           # Manejo centralizado de errores
│   ├── rateLimiter.js            # Rate limiting
│   ├── validation.js             # Validación de datos
│   ├── sanitize.js               # Sanitización XSS
│   ├── audit.js                  # Auditoría de acciones
│   └── asyncHandler.js           # Wrapper para async/await
│
├── 📂 utils/                      # Utilidades
│   ├── jwtHelper.js              # Helpers para JWT
│   ├── password.js               # Hash de contraseñas (bcrypt)
│   └── responses.js              # Formato de respuestas
│
├── 📂 validators/                 # Validadores de datos
│   ├── authValidator.js          # Validación de login
│   └── userValidator.js          # Validación de usuarios
│
├── 📂 errors/                     # Manejo de errores
│   └── AppError.js               # Clase de error personalizada
│
├── 📂 views/                      # Frontend React/TypeScript
│   ├── 📂 src/
│   │   ├── App.tsx               # Componente principal
│   │   ├── main.tsx              # Punto de entrada
│   │   ├── 📂 components/
│   │   │   ├── Dashboard.tsx      # Dashboard operacional
│   │   │   ├── GeoportalMap.tsx  # Mapa interactivo
│   │   │   ├── PublicGeoportal.tsx # Geoportal público
│   │   │   ├── DetailedGeoportal.tsx # Geoportal detallado
│   │   │   ├── UserManagement.tsx # Gestión de usuarios
│   │   │   ├── CitizenDashboard.tsx # Dashboard ciudadano
│   │   │   ├── WelcomeDashboard.tsx # Dashboard de bienvenida
│   │   │   ├── LandingPage.tsx   # Página de inicio
│   │   │   ├── LoginModal.tsx    # Modal de login
│   │   │   ├── Navbar.tsx        # Barra de navegación
│   │   │   └── 📂 ui/            # Componentes UI (Radix UI)
│   │   ├── 📂 types/
│   │   │   └── index.ts          # Definiciones TypeScript
│   │   ├── 📂 lib/
│   │   │   └── roles.ts         # Utilidades de roles
│   │   └── 📂 styles/
│   │       └── globals.css      # Estilos globales
│   ├── package.json              # Dependencias frontend
│   ├── vite.config.ts            # Configuración Vite
│   └── tsconfig.json             # Configuración TypeScript
│
├── 📂 microservices/
│   └── 📂 analytics/              # Microservicio de analítica
│       ├── 📂 app/
│       │   ├── main.py           # Aplicación FastAPI
│       │   ├── 📂 api/
│       │   │   └── routes.py     # Endpoints REST
│       │   ├── 📂 services/
│       │   │   ├── telemetry_processor_simple.py  # Procesador principal
│       │   │   ├── telemetry_processor.py        # Procesador avanzado
│       │   │   ├── analytics.py                   # Servicios de analytics
│       │   │   └── ml.py                         # Machine Learning
│       │   ├── 📂 db/
│       │   │   ├── models.py     # Modelos SQLAlchemy
│       │   │   └── session.py    # Sesión de BD
│       │   └── 📂 core/
│       │       └── config.py      # Configuración
│       ├── requirements.txt      # Dependencias Python
│       ├── Dockerfile           # Contenedor Docker
│       └── README.md           # Documentación del microservicio
│
├── 📂 docs/                      # Documentación
│   ├── Esquema_base_de_datos.sql # Esquema SQL
│   ├── urbanflow_db_query.sql   # Consultas SQL
│   ├── openapi.yaml             # Especificación API
│   └── Docs1.md                 # Documentación inicial
│
├── 📂 public/                    # Archivos estáticos
│   ├── css/                     # Estilos CSS
│   └── js/                      # Scripts JavaScript
│
├── app.js                        # Punto de entrada Node.js
├── package.json                  # Dependencias backend
├── .env                          # Variables de entorno
└── README.md                     # Documentación principal
```

---

## 🔧 COMPONENTES PRINCIPALES DEL SISTEMA

### **1. BACKEND NODE.JS (Express.js)**

#### **Tecnologías Utilizadas**
- **Node.js**: Runtime JavaScript (versión >= 18.18.0)
- **Express.js 5.1.0**: Framework web
- **PostgreSQL**: Base de datos relacional (cliente pg)
- **JWT**: Autenticación con tokens (jsonwebtoken)
- **bcryptjs**: Hash de contraseñas
- **Helmet**: Seguridad HTTP headers
- **CORS**: Configuración de origen cruzado
- **express-rate-limit**: Rate limiting
- **express-validator**: Validación de datos
- **xss**: Protección contra XSS

#### **Archivo Principal: `app.js`**

**Responsabilidades:**
1. Configuración de middlewares globales
2. Montaje de rutas API
3. Proxy hacia microservicio de analytics
4. Servir frontend estático
5. Manejo centralizado de errores

**Middlewares Aplicados:**
- **Helmet**: Headers de seguridad
- **CORS**: Configuración de origen cruzado
- **Morgan**: Logging de requests
- **Body Parsers**: JSON y URL-encoded
- **Cookie Parser**: Manejo de cookies
- **Sanitización XSS**: Protección contra inyección
- **Rate Limiting**: Límite de requests por IP

#### **Sistema de Autenticación**

**Archivo: `middlewares/auth.js`**

**Componentes:**
- **JWT Tokens**: Access token (1h) y Refresh token (7d)
- **Cookies HTTPOnly**: Almacenamiento seguro
- **Rotación de tokens**: Renovación automática con refresh token
- **Middleware requireAuth**: Protección de rutas
- **Middleware requireRole**: Autorización por roles

**Flujo de Autenticación:**
```
1. Usuario → POST /api/auth/login {correo, password}
2. Backend → Verifica credenciales en BD
3. Backend → Genera JWT con payload {id, email, rol}
4. Backend → Establece cookies HTTPOnly
5. Frontend → Recibe token y guarda en cookies
6. Requests siguientes → Token en cookie automáticamente
7. Middleware → Verifica token en cada request protegido
```

#### **Sistema de Roles**

**Roles Implementados:**
- **admin**: Acceso total, gestión de usuarios y roles
- **operador**: Dashboard operacional y geoportal detallado
- **analista**: Dashboard y análisis avanzados
- **cliente**: Solo geoportal público y dashboard ciudadano

**Implementación:**
- Tabla `roles` en PostgreSQL
- Tabla `user_roles` para relaciones muchos-a-muchos
- Middleware `requireRole()` para autorización
- Validación en frontend con guardas de ruta

#### **Endpoints Principales**

**Autenticación:**
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/refresh` - Renovar token

**Gestión de Usuarios (solo admin):**
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

**Dashboard:**
- `GET /api/dashboard` - Dashboard principal
- `GET /api/dashboard/cabin/:id/history` - Historial de cabina

**Geoportal:**
- `GET /api/map/public` - Datos públicos del mapa

**Proxy Analytics (hacia microservicio):**
- `GET /api/analytics/*` - Análisis avanzados
- `GET /api/data/*` - Datos de sensores
- `GET /api/models/*` - Modelos ML
- `GET /api/predictions/*` - Predicciones

---

### **2. FRONTEND REACT/TYPESCRIPT**

#### **Tecnologías Utilizadas**
- **React 18.3.1**: Biblioteca UI
- **TypeScript 5.9.3**: Type safety
- **Vite 6.3.6**: Build tool y dev server
- **TailwindCSS**: Framework CSS utility-first
- **Radix UI**: Componentes accesibles
- **Recharts 2.15.2**: Gráficos interactivos
- **Mapbox GL 2.15.0**: Mapas interactivos
- **react-map-gl 7.1.7**: Wrapper React para Mapbox
- **React Hook Form**: Manejo de formularios
- **Lucide React**: Iconos

#### **Arquitectura del Frontend**

**SPA (Single Page Application):**
- Navegación client-side con React Router
- Estado global con React Context/State
- Actualización de datos en tiempo real

**Componentes Principales:**

**1. App.tsx** - Componente raíz
- Gestión de estado de autenticación
- Navegación entre vistas
- Hidratación de sesión al cargar
- Control de acceso por roles

**2. Dashboard.tsx** - Dashboard operacional
- 8 KPIs técnicos (RMS, Kurtosis, Crest Factor, etc.)
- 4 pestañas de análisis:
  - Análisis Vibracional
  - Análisis Espectral
  - Estados Operativos
  - Energía por Bandas
- Gráficos interactivos con Recharts
- Tabla de historial con filtrado
- Estado de cabinas en tiempo real

**3. GeoportalMap.tsx** - Mapa interactivo
- Mapbox GL JS para visualización
- Marcadores de cabinas con código de colores
- Marcadores de estaciones
- Popups informativos
- Vista 3D con edificios extruidos

**4. UserManagement.tsx** - Gestión de usuarios
- CRUD completo de usuarios
- Asignación de roles
- Tabla paginada con búsqueda
- Formularios validados

**5. CitizenDashboard.tsx** - Dashboard ciudadano
- Vista simplificada para usuarios finales
- Información de estado del sistema
- Métricas básicas

**Sistema de Estados:**
- **AuthState**: Estado de autenticación y usuario
- **AppView**: Vistas disponibles (landing, dashboard, geoportal, etc.)
- **User**: Tipo de usuario con roles

**Integración con Backend:**
- Fetch API con `credentials: 'include'` para cookies
- Manejo de errores centralizado
- Actualización automática de datos

---

### **3. MICROSERVICIO DE ANALYTICS (Python/FastAPI)**

#### **Tecnologías Utilizadas**
- **FastAPI 0.115.0**: Framework web moderno
- **Uvicorn**: Servidor ASGI
- **SQLAlchemy 2.0.34**: ORM para PostgreSQL
- **NumPy 1.26.4**: Cálculos numéricos
- **Pandas 2.2.2**: Manipulación de datos
- **SciPy 1.11.4**: Cálculos científicos
- **scikit-learn 1.4.2**: Machine Learning
- **Matplotlib 3.8.2**: Visualización
- **Plotly 5.17.0**: Gráficos interactivos

#### **Estructura del Microservicio**

**Archivo Principal: `app/main.py`**
- Configuración de FastAPI
- Middleware CORS
- Health check endpoint
- Manejo global de errores
- Montaje de rutas API

**Servicios Implementados:**

**1. TelemetryProcessorSimple** (`telemetry_processor_simple.py`)
- **Responsabilidad**: Procesar telemetría cruda y calcular métricas
- **Proceso**:
  1. Lee datos de `telemetria_cruda`
  2. Calcula métricas vibracionales (RMS, pico, crest factor)
  3. Calcula distancia incremental con Haversine
  4. Clasifica estado operativo
  5. Inserta en `mediciones`

**2. AnalyticsService** (`analytics.py`)
- **Responsabilidad**: Análisis estadísticos y resúmenes
- **Funcionalidades**:
  - Resumen del sistema
  - Salud del sistema
  - Análisis por sensor
  - Análisis de tendencias

**3. MLPredictionService** (`ml.py`)
- **Responsabilidad**: Predicciones con Machine Learning
- **Algoritmos**:
  - Isolation Forest (detección de anomalías)
  - DBSCAN (clustering)
  - StandardScaler (normalización)
- **Clasificación**: 4 estados (normal, inusual, monitoreo, alerta)

#### **Procesos Matemáticos Implementados**

**1. Cálculo de RMS (Root Mean Square)**
```python
# Vector de vibración total
vib_total = np.sqrt(vib_x**2 + vib_y**2 + vib_z**2)
# RMS (en procesador simple, aproximado por velocidad)
rms = base_rms + noise
```

**2. Transformada de Fourier (FFT)**
```python
# FFT para análisis espectral
fft_data = fft(vib_data)
freqs = fftfreq(len(vib_data))
amplitudes = np.abs(fft_data)
# Frecuencia dominante
dominant_idx = np.argmax(amplitudes)
frecuencia_dominante = freqs[dominant_idx]
```

**3. Fórmula de Haversine**
```python
# Distancia entre dos puntos geográficos
R_EARTH = 6371000  # Radio de la Tierra en metros
dlat = lat2_rad - lat1_rad
dlon = lon2_rad - lon1_rad
a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
c = 2 * atan2(sqrt(a), sqrt(1-a))
distance = R_EARTH * c
```

**4. Clasificación de Estados Operativos**
```python
# Estados: inicio, crucero, frenado, zona_lenta, reaceleracion, parado
if velocidad_kmh < 1.0:
    return "parado"
elif velocidad_kmh < 5.0:
    return "zona_lenta"
elif velocidad_kmh < 15.0 and distancia < 1000:
    return "inicio"
elif 24 <= velocidad_kmh <= 26:
    return "crucero"
elif distancia > (total - 450):
    return "frenado"
elif is_reacceleration_phase():
    return "reaceleracion"
```

**5. Machine Learning - Detección de Anomalías**
```python
# Isolation Forest
isolation_forest = IsolationForest(contamination=0.1)
anomaly_scores = isolation_forest.fit_predict(features_scaled)

# DBSCAN Clustering
dbscan = DBSCAN(eps=0.5, min_samples=5)
clusters = dbscan.fit_predict(features_scaled)
```

#### **Endpoints del Microservicio**

**Procesamiento:**
- `POST /api/analytics/process` - Procesar telemetría nueva
- `GET /api/analytics/trayecto` - Trayectoria completa
- `GET /api/analytics/summary` - Resumen del sistema

**Análisis:**
- `GET /api/analytics/system-health` - Salud del sistema
- `GET /api/analytics/sensor/{id}` - Análisis por sensor
- `GET /api/analytics/trends/{id}` - Análisis de tendencias
- `GET /api/analytics/cabins/summary` - Estado de cabinas

**Datos:**
- `GET /api/data/measurements/recent` - Mediciones recientes
- `GET /api/data/measurements/sensor/{id}` - Por sensor
- `GET /api/data/measurements/by-cab/{id}` - Por cabina

**Predicciones:**
- `POST /api/predictions/run` - Predicción individual
- `POST /api/predictions/batch` - Predicciones en lote
- `GET /api/predictions/history/{id}` - Historial

**Modelos:**
- `GET /api/models` - Listar modelos ML
- `POST /api/models` - Crear modelo

---

## 🗄️ BASE DE DATOS POSTGRESQL

### **Esquema Principal**

#### **Tablas de Usuarios y Seguridad**

**Tabla: `usuarios`**
```sql
- usuario_id (SERIAL PRIMARY KEY)
- nombre (VARCHAR)
- correo (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- rol (VARCHAR)
- is_active (BOOLEAN)
- creado_en (TIMESTAMP)
- actualizado_en (TIMESTAMP)
- deleted_at (TIMESTAMP) -- Soft delete
- last_login_at (TIMESTAMP)
- failed_attempts (INTEGER)
- locked_until (TIMESTAMP)
```

**Tabla: `roles`**
```sql
- rol_id (SERIAL PRIMARY KEY)
- nombre_rol (VARCHAR UNIQUE)
- descripcion (TEXT)
- permisos (JSONB)
```

**Tabla: `user_roles`**
```sql
- user_rol_id (SERIAL PRIMARY KEY)
- usuario_id (INTEGER FK)
- rol_id (INTEGER FK)
```

**Tabla: `auditoria`**
```sql
- auditoria_id (BIGSERIAL PRIMARY KEY)
- usuario_id (INTEGER FK)
- accion (VARCHAR)
- recurso (VARCHAR)
- metodo_http (VARCHAR)
- timestamp_auditoria (TIMESTAMP)
- codigo_respuesta (INTEGER)
- exito (BOOLEAN)
```

#### **Tablas Operativas**

**Tabla: `cabinas`**
```sql
- cabina_id (INTEGER PRIMARY KEY)
- codigo_interno (VARCHAR UNIQUE)
- estado_actual (VARCHAR)
- fecha_fabricacion (DATE)
```

**Tabla: `sensores`**
```sql
- sensor_id (INTEGER PRIMARY KEY)
- cabina_id (INTEGER FK UNIQUE)
- modelo (VARCHAR)
- version_firmware (VARCHAR)
- fecha_instalacion (DATE)
```

**Tabla: `telemetria_cruda`**
```sql
- telemetria_id (BIGSERIAL PRIMARY KEY)
- sensor_id (INTEGER FK)
- timestamp (TIMESTAMP)
- lat (NUMERIC)
- lon (NUMERIC)
- alt (NUMERIC)
- velocidad_kmh (NUMERIC)
- aceleracion_m_s2 (NUMERIC)
- temperatura_c (NUMERIC)
- vibracion_x (NUMERIC)
- vibracion_y (NUMERIC)
- vibracion_z (NUMERIC)
- direccion (VARCHAR)
- pos_m (NUMERIC)
```

**Tabla: `mediciones`**
```sql
- medicion_id (BIGSERIAL PRIMARY KEY)
- sensor_id (INTEGER FK)
- timestamp (TIMESTAMP)
- latitud (NUMERIC)
- longitud (NUMERIC)
- altitud (NUMERIC)
- velocidad (NUMERIC) -- en m/s
- rms (NUMERIC)
- kurtosis (NUMERIC)
- skewness (NUMERIC)
- zcr (NUMERIC)
- pico (NUMERIC)
- crest_factor (NUMERIC)
- frecuencia_media (NUMERIC)
- frecuencia_dominante (NUMERIC)
- amplitud_max_espectral (NUMERIC)
- energia_banda_1 (NUMERIC)
- energia_banda_2 (NUMERIC)
- energia_banda_3 (NUMERIC)
- estado_procesado (VARCHAR)
```

#### **Tablas de IA/ML**

**Tabla: `modelos_ml`**
```sql
- modelo_id (SERIAL PRIMARY KEY)
- nombre (VARCHAR)
- version (VARCHAR)
- framework (VARCHAR)
- fecha_entrenamiento (DATE)
- descripcion (TEXT)
```

**Tabla: `predicciones`**
```sql
- prediccion_id (BIGSERIAL PRIMARY KEY)
- medicion_id (BIGINT FK)
- modelo_id (INTEGER FK)
- clase_predicha (VARCHAR)
- probabilidades (JSONB)
- timestamp_prediccion (TIMESTAMP)
```

#### **Tablas de Infraestructura**

**Tabla: `lineas`**
```sql
- linea_id (SERIAL PRIMARY KEY)
- nombre (VARCHAR)
- longitud_km (NUMERIC)
```

**Tabla: `estaciones`**
```sql
- estacion_id (SERIAL PRIMARY KEY)
- linea_id (INTEGER FK)
- nombre (VARCHAR)
- tipo (VARCHAR)
- latitud (NUMERIC)
- longitud (NUMERIC)
- altitud_m (NUMERIC)
- estado_operativo (VARCHAR)
```

**Tabla: `tramos`**
```sql
- tramo_id (SERIAL PRIMARY KEY)
- linea_id (INTEGER FK)
- estacion_inicio_id (INTEGER FK)
- estacion_fin_id (INTEGER FK)
- longitud_m (NUMERIC)
- pendiente_porcentaje (NUMERIC)
```

**Tabla: `cabina_estado_hist`**
```sql
- hist_id (BIGSERIAL PRIMARY KEY)
- cabina_id (INTEGER FK)
- estado (VARCHAR)
- timestamp_inicio (TIMESTAMP)
- timestamp_fin (TIMESTAMP)
```

---

## 🔄 FLUJO COMPLETO DE DATOS EN EL SISTEMA

### **1. Flujo de Telemetría (Datos de Sensores)**

```
Sensores IoT → telemetria_cruda (PostgreSQL)
                    ↓
Microservicio Python → TelemetryProcessorSimple
                    ↓
Procesamiento:
  - Cálculo de RMS, pico, crest factor
  - Cálculo de distancia Haversine
  - Análisis espectral (FFT)
  - Clasificación de estado operativo
                    ↓
mediciones (PostgreSQL) → Datos procesados
                    ↓
Backend Node.js → Proxy /api/analytics/*
                    ↓
Frontend React → Visualización en Dashboard
```

### **2. Flujo de Autenticación**

```
Usuario → Frontend → POST /api/auth/login
                    ↓
Backend → Verifica credenciales en BD
                    ↓
Backend → Genera JWT + Cookies HTTPOnly
                    ↓
Frontend → Almacena token en cookies
                    ↓
Requests siguientes → Cookie automática
                    ↓
Middleware requireAuth → Verifica token
                    ↓
Middleware requireRole → Verifica permisos
                    ↓
Controlador → Ejecuta lógica de negocio
```

### **3. Flujo de Predicciones ML**

```
Medición nueva → MLPredictionService
                    ↓
Obtiene datos históricos (últimos 30 días)
                    ↓
Extrae características (10 features)
                    ↓
Normaliza con StandardScaler
                    ↓
Isolation Forest → Detecta anomalías
                    ↓
DBSCAN → Identifica patrones
                    ↓
Análisis de tendencias → RMS, volatilidad
                    ↓
Clasificación → normal/inusual/monitoreo/alerta
                    ↓
Almacena en predicciones (PostgreSQL)
                    ↓
Backend → Proxy /api/predictions/*
                    ↓
Frontend → Visualiza alertas en Dashboard
```

### **4. Flujo del Dashboard**

```
Frontend → GET /api/dashboard
                    ↓
Backend → dashboardController.main()
                    ↓
Backend → Proxy GET /api/analytics/summary
                    ↓
Microservicio → AnalyticsService.summary()
                    ↓
Consulta BD → KPIs agregados
                    ↓
Backend → Construye respuesta con KPIs
                    ↓
Frontend → Renderiza gráficos y tablas
```

### **5. Flujo del Geoportal**

```
Frontend → GET /api/map/public
                    ↓
Backend → publicController.getPublicData()
                    ↓
Modelo → geoportalModel.getPublicData()
                    ↓
Consulta BD → Estaciones + Cabinas
                    ↓
Backend → Devuelve datos geográficos
                    ↓
Frontend → Mapbox GL → Renderiza mapa
```

---

## 🛠️ HERRAMIENTAS Y TECNOLOGÍAS

### **Backend Node.js**

**Framework y Runtime:**
- Node.js >= 18.18.0
- Express.js 5.1.0
- ES Modules (type: "module")

**Base de Datos:**
- PostgreSQL 13+
- pg 8.11.3 (cliente PostgreSQL)

**Seguridad:**
- jsonwebtoken 9.0.2
- bcryptjs 3.0.2
- helmet 8.1.0
- express-rate-limit 7.5.1
- xss 1.0.15
- express-validator 7.2.1

**Utilidades:**
- dotenv 17.2.2
- cookie-parser 1.4.7
- cors 2.8.5
- morgan 1.10.1

**Desarrollo:**
- nodemon 3.1.10

### **Frontend React**

**Framework:**
- React 18.3.1
- TypeScript 5.9.3
- Vite 6.3.6

**UI:**
- TailwindCSS
- Radix UI (componentes accesibles)
- Lucide React (iconos)

**Visualización:**
- Recharts 2.15.2 (gráficos)
- Mapbox GL 2.15.0 (mapas)
- react-map-gl 7.1.7

**Formularios:**
- React Hook Form 7.55.0

**Notificaciones:**
- Sonner 2.0.3

### **Microservicio Python**

**Framework:**
- FastAPI 0.115.0
- Uvicorn 0.30.6

**Base de Datos:**
- SQLAlchemy 2.0.34
- psycopg2-binary 2.9.9

**Cálculos:**
- NumPy 1.26.4
- Pandas 2.2.2
- SciPy 1.11.4

**Machine Learning:**
- scikit-learn 1.4.2

**Visualización:**
- Matplotlib 3.8.2
- Seaborn 0.13.0
- Plotly 5.17.0

**Utilidades:**
- python-dotenv 1.0.1
- Pydantic 2.9.2

### **Base de Datos**

- PostgreSQL 13+
- Extensión PostGIS (opcional, para análisis espacial)

### **Herramientas de Desarrollo**

- Git (control de versiones)
- VS Code (editor recomendado)
- Docker (opcional, para contenedores)
- Postman/Insomnia (pruebas de API)

---

## 🔐 SISTEMA DE SEGURIDAD

### **Autenticación**

**JWT Tokens:**
- Access Token: 1 hora de duración
- Refresh Token: 7 días de duración
- Algoritmo: HS256
- Almacenamiento: Cookies HTTPOnly

**Cookies:**
- httpOnly: true (no accesible desde JavaScript)
- secure: true (solo HTTPS en producción)
- sameSite: Strict/None (según entorno)
- maxAge: Configurable

### **Autorización**

**Sistema de Roles:**
- 4 roles: admin, operador, analista, cliente
- Middleware `requireRole()` para proteger rutas
- Guardas en frontend para navegación

### **Protección de Datos**

**Sanitización:**
- XSS protection en todos los inputs
- Validación de datos con express-validator
- Prepared statements para SQL (previene SQL injection)

**Rate Limiting:**
- Login: 50 intentos por 15 minutos
- API general: 600 requests por minuto por IP

**Headers de Seguridad:**
- Helmet.js configura headers HTTP seguros
- Content Security Policy (CSP)
- X-Frame-Options, X-Content-Type-Options, etc.

### **Auditoría**

**Registro de Acciones:**
- Todos los logins (exitosos y fallidos)
- Operaciones CRUD en usuarios
- Accesos a rutas protegidas
- Cambios de estado importantes

**Tabla `auditoria`:**
- Registra: usuario, acción, recurso, método HTTP
- Timestamp, código de respuesta, éxito/fallo
- IP address, user agent

---

## 📊 MÉTRICAS Y KPIS DEL SISTEMA

### **Métricas Vibracionales**

**RMS (Root Mean Square):**
- Representa la energía promedio de vibración
- Cálculo: `sqrt(mean(vib_total^2))`
- Rango típico: 0.1 - 2.0

**Pico:**
- Valor máximo absoluto de vibración
- Detecta eventos extremos
- Rango típico: 0.2 - 4.0

**Crest Factor:**
- Relación pico/RMS
- Indica presencia de picos aislados
- Rango típico: 1.5 - 6.0

**Kurtosis:**
- Mide la "cola" de la distribución
- Valores altos indican picos frecuentes
- Rango típico: -1.5 a 5.0

**Skewness:**
- Mide la asimetría de la distribución
- Valores positivos/negativos indican sesgo
- Rango típico: -2.0 a 2.0

**ZCR (Zero Crossing Rate):**
- Tasa de cruces por cero
- Indica frecuencia de cambios de signo
- Rango típico: 0.1 - 2.0

### **Métricas Espectrales**

**Frecuencia Media:**
- Centroide espectral
- Fórmula: `Σ(f * A) / Σ(A)`

**Frecuencia Dominante:**
- Frecuencia con mayor amplitud
- Encontrada con `argmax(amplitudes)`

**Amplitud Máxima Espectral:**
- Valor pico en el espectro de frecuencias
- `max(amplitudes)`

**Energía por Bandas:**
- Banda 1 (0-50 Hz): Vibraciones estructurales
- Banda 2 (50-200 Hz): Vibraciones operativas
- Banda 3 (>200 Hz): Vibraciones de alta frecuencia

### **Estados Operativos**

**6 Estados Clasificados:**
1. **inicio**: Velocidad < 15 km/h, distancia < 1000m
2. **crucero**: Velocidad 24-26 km/h, velocidad constante
3. **frenado**: Velocidad > 15 km/h, cerca del final
4. **zona_lenta**: Velocidad < 5 km/h
5. **reaceleracion**: Velocidad 6-24 km/h, después de zona_lenta
6. **parado**: Velocidad < 1 km/h

### **KPIs del Dashboard**

**8 KPIs Principales:**
1. RMS Promedio
2. Total Mediciones
3. Velocidad Promedio
4. Distancia Total
5. Kurtosis Promedio
6. Crest Factor
7. Pico Máximo
8. Estado Dominante

---

## 🚀 PROCESOS DE DESPLIEGUE

### **Desarrollo Local**

**Backend:**
```bash
npm install
npm run dev  # Nodemon con hot reload
```

**Frontend:**
```bash
cd views
npm install
npm run dev  # Vite dev server
```

**Microservicio:**
```bash
cd microservices/analytics
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### **Producción**

**Backend:**
```bash
npm install --production
npm start
```

**Frontend:**
```bash
cd views
npm run build
# Servir desde Express o servidor web estático
```

**Microservicio:**
```bash
# Docker
docker build -t urbanflow-analytics .
docker run -p 8001:8001 urbanflow-analytics

# O directamente
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

---

## 📈 ESCALABILIDAD Y RENDIMIENTO

### **Optimizaciones Implementadas**

**Base de Datos:**
- Pool de conexiones (máximo 20 conexiones)
- Índices en campos frecuentemente consultados
- Consultas optimizadas con LIMIT y OFFSET

**Backend:**
- Rate limiting para prevenir sobrecarga
- Caché de respuestas (puede implementarse)
- Compresión de respuestas (gzip)

**Microservicio:**
- Procesamiento en lotes (batch processing)
- Prevención de duplicados antes de insertar
- Procesamiento incremental (solo datos nuevos)

**Frontend:**
- Code splitting con Vite
- Lazy loading de componentes
- Optimización de imágenes
- Caché de assets estáticos

---

## 🧪 TESTING Y CALIDAD

### **Pruebas Implementadas**

**Microservicio:**
- `test_reaceleracion_simple.py` - Pruebas unitarias de reaceleración
- `test_analytics.py` - Pruebas de analytics
- Health check endpoint

**Backend:**
- Validación de datos con express-validator
- Manejo de errores centralizado
- Logging estructurado

### **Validación de Datos**

**Backend:**
- Validación de entrada con express-validator
- Sanitización XSS
- Validación de tipos TypeScript

**Microservicio:**
- Validación con Pydantic
- Verificación de rangos de valores
- Manejo de errores robusto

---

## 📝 CONCLUSIÓN

UrbanFlow Platform es un sistema completo y robusto que integra:

1. **Arquitectura moderna**: Microservicios, API REST, SPA
2. **Tecnologías de vanguardia**: React, TypeScript, FastAPI, PostgreSQL
3. **Procesamiento avanzado**: FFT, Haversine, Machine Learning
4. **Seguridad empresarial**: JWT, rate limiting, auditoría completa
5. **Escalabilidad**: Diseño modular y optimizado para crecimiento

El sistema está **listo para producción** y proporciona una base sólida para la gestión inteligente de sistemas de transporte por cable, cumpliendo con todos los requisitos funcionales y técnicos especificados.

---

**Versión del Documento**: 1.0  
**Fecha de Actualización**: 2025-01-09  
**Autor**: Sistema de Documentación UrbanFlow Platform

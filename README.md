# UrbanFlow Platform

**Plataforma integral de gestión y monitoreo para sistemas de transporte por cable**

#### Movilidad Inteligente | Eficiencia | Seguridad
## Visión General

UrbanFlow es una solución tecnológica completa diseñada para la gestión, monitoreo y análisis de sistemas de transporte por cable. La plataforma centraliza toda la operación, proporcionando herramientas avanzadas para optimizar la eficiencia, seguridad y experiencia del usuario.

---

## Objetivo Principal

Transformar la movilidad urbana mediante una plataforma digital que integre:

- **Gestión operativa** en tiempo real
- **Monitoreo continuo** del estado de las cabinas
- **Análisis predictivo** mediante inteligencia artificial
- **Visualización geográfica** de toda la operación

---

## Características Principales

### Dashboard Centralizado
- Monitoreo en tiempo real del estado operativo
- Métricas de rendimiento y eficiencia
- Alertas tempranas y notificaciones
- Históricos y tendencias

### Geoportal Interactivo
- Mapa en tiempo real con posición de cabinas
- Código de colores para estados operativos
- Visualización de rutas y estaciones
- Acceso público informativo

### Gestión de Usuarios
- Roles diferenciados (Administradores, Operadores)
- Autenticación segura
- Control de acceso y permisos

### Analítica Avanzada
- Procesamiento de datos de sensores IoT
- Modelos predictivos de mantenimiento
- Reportes personalizables
- Indicadores de desempeño

---
## Estructura del Repositorio

```
urbanflow-platform/
├── config/           # Archivos de configuración general
├── controllers/      # Lógica de negocio (intermediario entre models y views)
├── data/            # Datos estáticos o archivos temporales
├── db/              # Scripts y configuraciones para conexión a BD
├── docs/            # Documentación técnica y manuales
├── errors/          # Manejo personalizado de errores
├── microservices/   # Microservicios adicionales (Flask para IA)
├── middlewares/     # Funciones intermedias (autenticación, autorización)
├── models/          # Definición de estructuras de datos y esquemas de BD
├── public/          # Archivos estáticos accesibles (CSS, JS, imágenes)
├── routes/          # Definición de rutas de la API y aplicativo web
├── sql/             # Scripts SQL de creación y carga de BD
├── utils/           # Funciones auxiliares reutilizables
├── views/           # Vistas/renderizado de interfaz (plantillas)
├── .gitignore       # Archivos/carpetas a ignorar en Git
├── app.js           # Archivo principal de la aplicación Node.js
├── LICENSE.md       # Licencia del proyecto
├── package.json     # Dependencias y scripts del proyecto
├── README.md        # Este archivo
└── requirements.txt # Dependencias para microservicios Python
```
---

## Módulos de la Plataforma

| Módulo | Función |
|--------|---------|
| **Operaciones** | Monitoreo en tiempo real y gestión de flota |
| **Seguridad** | Control de acceso y protocolos de emergencia |
| **Mantenimiento** | Alertas predictivas y gestión de incidencias |
| **Analítica** | Business Intelligence y reporting |
| **Usuario** | Información pública y autogestión |

---

## Beneficios Clave

-  **Eficiencia operativa** mejorada
-  **Seguridad** reforzada para pasajeros
-  **Experiencia de usuario** optimizada
-  **Toma de decisiones** basada en datos
-  **Mantenimiento predictivo** preventivo

---

**UrbanFlow** - Conectando ciudades de forma inteligente y segura

---

## Guía Rápida de Inicio (Runbook)

### 1) Prerrequisitos
- **Node.js** 20 LTS recomendado (funciona con 18/20; evite Node 24 en Windows por issues con Rollup).
- **npm** 8+.
- **PostgreSQL** 13+ corriendo local: `127.0.0.1:5432`.

### 2) Configurar variables de entorno
Crear `.env` en la raíz del proyecto. Ejemplo mínimo:

```
NODE_ENV=development
PORT=3000

# Base de datos (backend Node y microservicios)
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=urbanflow_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT / Cookies
JWT_SECRET=change_me
REFRESH_JWT_SECRET=change_me_refresh
AUTH_COOKIE_NAME=access_token
REFRESH_COOKIE_NAME=refresh_token

# CORS (para usar Vite Dev Server)
FRONTEND_URL=http://localhost:5173
```

Inicialice la BD con los scripts en `docs/db_actualizada_2do_sprint.sql` si es necesario.

### 3) Instalar dependencias
En la raíz (backend Node):

```
npm install
```

Frontend (Vite en `views/`):

```
npm --prefix "views" install
```

### 4) Arranque en desarrollo (recomendado)
- Terminal A (backend):
```
npm run dev
```
Backend disponible en `http://localhost:3000`.

- Terminal B (frontend con hot reload):
```
npm --prefix "views" run dev
```
Frontend Vite en `http://localhost:5173`.

Notas:
- Si accedes al front por `5173`, las APIs `/api/*` las atiende el backend en `3000` (CORS activado vía `FRONTEND_URL`).
- Si prefieres servir el front desde Express, usa el paso 5.

### 5) Servir frontend empaquetado desde Express (modo "producción local")
Construir el frontend y arrancar backend:

```
npm --prefix "views" run build
npm run dev
```

Express servirá los estáticos desde `views/build/` en `http://localhost:3000`.

### 6) Credenciales de prueba
Después de cargar datos, inicia sesión desde el botón “Iniciar Sesión”. La API espera body `{ correo, password }`.

### 7) Microservicio de Analítica (FastAPI)
Ubicación: `microservices/analytics/`

#### 7.1 Abrir Terminal Integrada (VS Code)
- Abre la carpeta del proyecto.
- Menú: View > Terminal (o `Ctrl+``).
- Asegúrate de estar en la ruta del microservicio:
```
cd microservices/analytics
```

#### 7.2 Crear y activar entorno virtual (Windows PowerShell)
```
python -m venv venv
.\n+venv\Scripts\Activate.ps1
```

#### 7.3 Instalar requerimientos
```
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

#### 7.4 Variables de entorno (opcional)
- El microservicio carga automáticamente el `.env` de la raíz y construye la `DATABASE_URL` con `DB_*` si no encuentra `ANALYTICS_DATABASE_URL`.
- Si deseas especificar una URL distinta solo para analítica:
```
$env:ANALYTICS_DATABASE_URL="postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/urbanflow_db"
```

#### 7.5 Ejecutar FastAPI (Uvicorn)
```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```
- Salud: `http://localhost:8080/health`

#### 7.6 Integración con backend (proxy)
- En el `.env` del backend Node (raíz) define:
```
ANALYTICS_BASE_URL=http://localhost:8080/api
```
- Reinicia el backend: `npm run dev`
- Endpoints desde el front/back:
  - Staff: `/api/analytics/*`, `/api/data/*`, `/api/models*`, `/api/predictions*`
  - Cliente: `/api/citizen/analytics/*`

#### 7.7 Docker (alternativo)
```
cd microservices/analytics
docker build -t urbanflow-analytics:dev .
docker run --rm -e ANALYTICS_DATABASE_URL="postgresql+psycopg2://postgres:postgres@host.docker.internal:5432/urbanflow_db" -p 8080:8080 urbanflow-analytics:dev
```

### 8) Roles y acceso
- El backend protege rutas como `/api/users` con `requireAuth` + `requireRole('admin')`.
- El frontend aplica guardas por rol; tras login se hidrata la sesión con `/api/auth/me`.

### 9) Problemas comunes y soluciones
- **404 index.html** al abrir `http://localhost:3000`:
  - Ejecuta `npm --prefix "views" run build` para generar `views/build/`.
- **CORS o sesión no persiste en 5173**:
  - Asegura `FRONTEND_URL=http://localhost:5173` en `.env` y que `fetch` use `credentials: 'include'` (ya está en el código).
- **Rollup en Windows (Node 24)**:
  - Preferir Node 20 LTS, o reinstalar dependencias en `views/` y reconstruir.
- **Roles inválidos al crear/editar**:
  - La BD debe contener los nombres de roles esperados. El front normaliza valores y el back valida existencia.


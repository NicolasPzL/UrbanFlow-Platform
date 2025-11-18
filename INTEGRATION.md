# UrbanFlow Platform - Integración Completa

## Resumen de Servicios

UrbanFlow Platform está compuesta por los siguientes servicios:

### 🏗️ Servicios Principales
- **Backend Node.js** (Puerto 3000): API principal con autenticación y gestión de usuarios
- **Frontend Vite** (Puerto 5173): Interfaz de usuario React/TypeScript
- **Base de Datos PostgreSQL** (Puerto 5432): Almacenamiento de datos

### 🔬 Microservicios
- **Analytics Service** (Puerto 8080): Análisis de datos y métricas
- **Predictions Service** (Puerto 3001): Predicciones y detección de anomalías

## 🚀 Inicio Rápido

### Opción 1: Scripts Automatizados (Recomendado)

#### Windows
```bash
# Ejecutar todos los servicios
start-all-services.bat
```

#### Linux/macOS
```bash
# Ejecutar todos los servicios
./start-all-services.sh
```

### Opción 2: Docker Compose
```bash
# Iniciar todos los servicios con Docker
docker-compose up -d
```

### Opción 3: Manual

#### 1. Base de Datos
```bash
# Asegúrate de que PostgreSQL esté ejecutándose
# Carga los datos con el script de ingesta
psql -U postgres -d urbanflow_db -f docs/db_actualizada_2do_sprint.sql
```

#### 2. Backend Node.js
```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm run dev
```

#### 3. Frontend Vite
```bash
# Instalar dependencias
npm --prefix "views" install

# Iniciar servidor de desarrollo
npm --prefix "views" run dev
```

#### 4. Microservicio de Analytics
```bash
cd microservices/analytics
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8080
```

#### 5. Microservicio de Predicciones
```bash
cd microservices/predictions-service
pip install -r requirements.txt
python app.py
```

## 🔍 Verificación de Servicios

### Script de Verificación Automática
```bash
python verify-services.py
```

### Verificación Manual

#### Backend Node.js
```bash
curl http://localhost:3000/health
```

#### Frontend Vite
```bash
curl http://localhost:5173
```

#### Analytics Service
```bash
curl http://localhost:8080/health
```

#### Predictions Service
```bash
curl http://localhost:3001/api/v1/health
```

## 📊 APIs Disponibles

### Backend Principal (Puerto 3000)
- `GET /health` - Health check
- `POST /api/auth/login` - Autenticación
- `GET /api/auth/me` - Usuario actual
- `GET /api/users` - Gestión de usuarios (admin)
- `GET /api/roles` - Gestión de roles (admin)
- `GET /api/dashboard` - Dashboard principal
- `GET /api/map` - Datos del mapa público

### Analytics Service (Puerto 8080)
- `GET /health` - Health check
- `GET /api/summary` - Resumen de analytics
- `POST /api/predict` - Predicciones ML

### Predictions Service (Puerto 3001)
- `GET /api/v1/health` - Health check
- `GET /api/v1/sensors` - Lista de sensores
- `GET /api/v1/sensors/{id}/historical` - Datos históricos
- `POST /api/v1/sensors/{id}/predict` - Generar predicciones
- `GET /api/v1/sensors/{id}/stats` - Estadísticas del sensor
- `GET /api/v1/system/overview` - Resumen del sistema

## 🔧 Configuración

### Variables de Entorno Principales (.env)
```env
# Base de datos
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=urbanflow_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your_jwt_secret
REFRESH_JWT_SECRET=your_refresh_secret

# CORS
FRONTEND_URL=http://localhost:5173
```

### Variables de Microservicios

#### Analytics (.env en microservices/analytics/)
```env
ANALYTICS_DATABASE_URL=postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/urbanflow_db
```

#### Predictions (.env en microservices/predictions-service/)
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=urbanflow_db
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
```

## 🧪 Pruebas

### Pruebas del Backend
```bash
# Ejecutar tests del backend
npm test
```

### Pruebas de Microservicios
```bash
# Analytics
cd microservices/analytics
python -m pytest

# Predictions
cd microservices/predictions-service
python test_service.py
```

### Pruebas de Integración
```bash
# Verificar todos los servicios
python verify-services.py
```

## 📈 Monitoreo

### Health Checks
- Backend: http://localhost:3000/health
- Frontend: http://localhost:5173
- Analytics: http://localhost:8080/health
- Predictions: http://localhost:3001/api/v1/health

### Logs
```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
```

## 🐛 Solución de Problemas

### Problemas Comunes

#### 1. Puerto ya en uso
```bash
# Encontrar proceso usando el puerto
netstat -ano | findstr :3000

# Terminar proceso
taskkill /PID <PID> /F
```

#### 2. Error de conexión a base de datos
- Verificar que PostgreSQL esté ejecutándose
- Verificar credenciales en .env
- Verificar que la base de datos exista

#### 3. CORS errors
- Verificar FRONTEND_URL en .env
- Verificar que el frontend esté en el puerto correcto

#### 4. Microservicios no responden
- Verificar que las dependencias estén instaladas
- Verificar variables de entorno
- Verificar que la base de datos esté accesible

### Logs de Debug
```bash
# Backend con debug
DEBUG=* npm run dev

# Frontend con debug
npm --prefix "views" run dev -- --debug

# Microservicios con debug
cd microservices/analytics
DEBUG=* python -m uvicorn app.main:app --reload --port 8080
```

## 🔄 Actualizaciones

### Actualizar Dependencias
```bash
# Backend
npm update

# Frontend
npm --prefix "views" update

# Microservicios
cd microservices/analytics
pip install --upgrade -r requirements.txt

cd ../predictions-service
pip install --upgrade -r requirements.txt
```

### Reconstruir Frontend
```bash
npm --prefix "views" run build
```

## 📚 Documentación Adicional

- [README.md](README.md) - Documentación principal
- [microservices/analytics/README.md](microservices/analytics/README.md) - Analytics Service
- [microservices/predictions-service/README.md](microservices/predictions-service/README.md) - Predictions Service
- [docs/](docs/) - Documentación técnica

## 🤝 Contribución

1. Fork del repositorio
2. Crear rama feature
3. Implementar cambios
4. Ejecutar pruebas
5. Crear pull request

## 📄 Licencia

MIT License - Ver [LICENSE.md](LICENSE.md) para más detalles

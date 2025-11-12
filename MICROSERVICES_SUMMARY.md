# UrbanFlow Platform - Microservicios Implementados

## 🎯 Resumen de Implementación

Se ha creado una integración completa del microservicio de predicciones con el proyecto UrbanFlow Platform existente, incluyendo:

### ✅ Servicios Implementados

#### 1. **Predictions Service** (Puerto 3001)
- **Framework**: Flask
- **Funcionalidades**:
  - Análisis de datos históricos de sensores
  - Predicciones usando media móvil y tendencias
  - Detección de anomalías basada en Z-score
  - Score de salud del sistema
  - API REST completa

#### 2. **Analytics Service** (Puerto 8080) - Existente
- **Framework**: FastAPI
- **Funcionalidades**: Análisis de datos y métricas

### 🔧 Integración Completa

#### Scripts de Inicio Automático
- `start-all-services.bat` (Windows)
- `start-all-services.sh` (Linux/macOS)
- `docker-compose.yml` (Docker)

#### Verificación de Servicios
- `verify-services.py` - Script de verificación automática
- `test_service.py` - Pruebas específicas del microservicio

### 📊 APIs Disponibles

#### Predictions Service
```
GET  /api/v1/health                    # Health check
GET  /api/v1/sensors                   # Lista de sensores
GET  /api/v1/sensors/{id}/historical  # Datos históricos
POST /api/v1/sensors/{id}/predict     # Generar predicciones
GET  /api/v1/sensors/{id}/stats       # Estadísticas
GET  /api/v1/system/overview          # Resumen del sistema
```

#### Analytics Service
```
GET  /health                          # Health check
GET  /api/summary                     # Resumen de analytics
POST /api/predict                     # Predicciones ML
```

### 🧠 Algoritmos de Predicción Implementados

#### 1. **Media Móvil Simple**
- Suaviza fluctuaciones temporales
- Ventana configurable (default: 10)

#### 2. **Media Móvil Exponencial**
- Peso mayor a datos recientes
- Factor de suavizado configurable

#### 3. **Detección de Tendencias**
- Regresión lineal para identificar patrones
- Cálculo de confianza basado en R²

#### 4. **Detección de Anomalías**
- Basada en desviación estándar (Z-score)
- Identificación de valores atípicos
- Clasificación por severidad

#### 5. **Score de Salud del Sistema**
- Evaluación del estado general
- Basado en RMS, kurtosis y distribución de estados
- Clasificación: healthy, moderate, warning, critical

### 🔗 Integración con Base de Datos

El microservicio se conecta directamente a la base de datos PostgreSQL existente usando las mismas variables de entorno:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=urbanflow_db
DB_USER=postgres
DB_PASSWORD=postgres
```

### 📈 Datos Procesados

El microservicio procesa datos de las siguientes tablas:
- `sensores` - Información de sensores
- `cabinas` - Estado de las cabinas
- `mediciones` - Datos históricos de vibración

### 🚀 Inicio Rápido

#### Opción 1: Script Automático
```bash
# Windows
start-all-services.bat

# Linux/macOS
./start-all-services.sh
```

#### Opción 2: Docker Compose
```bash
docker-compose up -d
```

#### Opción 3: Manual
```bash
# Backend
npm run dev

# Frontend
npm --prefix "views" run dev

# Analytics
cd microservices/analytics
python -m uvicorn app.main:app --reload --port 8080

# Predictions
cd microservices/predictions-service
python app.py
```

### 🔍 Verificación

```bash
# Verificar todos los servicios
python verify-services.py

# URLs de verificación
http://localhost:3000/health          # Backend
http://localhost:5173                 # Frontend
http://localhost:8080/health          # Analytics
http://localhost:3001/api/v1/health   # Predictions
```

### 📚 Documentación

- [INTEGRATION.md](INTEGRATION.md) - Guía completa de integración
- [microservices/predictions-service/README.md](microservices/predictions-service/README.md) - Documentación del microservicio
- [README.md](README.md) - Documentación principal actualizada

### 🎉 Estado Final

✅ **Microservicio de predicciones completamente funcional**
✅ **Integración con base de datos existente**
✅ **Scripts de inicio automático**
✅ **Verificación de servicios**
✅ **Documentación completa**
✅ **Docker Compose configurado**
✅ **Pruebas implementadas**

El microservicio está listo para usar y se integra perfectamente con el proyecto UrbanFlow Platform existente.

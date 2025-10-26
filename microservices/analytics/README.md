# UrbanFlow Analytics Service

Microservicio centralizado de análisis y predicciones ML para la plataforma UrbanFlow.

## Características

- **Análisis en tiempo real**: Procesamiento de datos de sensores en tiempo real
- **Predicciones ML**: Algoritmos de machine learning para detección de anomalías
- **Análisis histórico**: Tendencias y patrones basados en datos históricos
- **Monitoreo de salud**: Estado de sensores y sistema completo
- **API RESTful**: Endpoints para integración con otros servicios

## Tecnologías

- **FastAPI**: Framework web moderno y rápido
- **SQLAlchemy**: ORM para PostgreSQL
- **scikit-learn**: Algoritmos de machine learning
- **NumPy/Pandas**: Procesamiento de datos
- **PostgreSQL**: Base de datos principal

## Endpoints Principales

### Analytics
- `GET /api/analytics/summary` - Resumen general del sistema
- `GET /api/analytics/system-health` - Estado de salud del sistema
- `GET /api/analytics/sensor/{sensor_id}` - Análisis detallado de sensor
- `GET /api/analytics/trends/{sensor_id}` - Análisis de tendencias

### Predicciones ML
- `POST /api/predictions/run` - Ejecutar predicción para medición
- `POST /api/predictions/batch` - Predicciones en lote
- `GET /api/predictions/history/{sensor_id}` - Historial de predicciones

### Datos
- `GET /api/data/measurements/recent` - Mediciones recientes
- `GET /api/data/measurements/sensor/{sensor_id}` - Mediciones por sensor

### Modelos
- `GET /api/models` - Listar modelos ML
- `POST /api/models` - Crear nuevo modelo

## Configuración

### Variables de Entorno

```bash
# Base de datos
DATABASE_URL=postgresql+psycopg2://user:pass@host:port/db

# Configuración ML
ML_CONTAMINATION=0.1
ML_RANDOM_STATE=42
ML_DBSCAN_EPS=0.5
ML_DBSCAN_MIN_SAMPLES=5

# Análisis
DEFAULT_ANALYSIS_DAYS=7
MAX_HISTORICAL_DAYS=30
MAX_MEASUREMENTS_LIMIT=1000

# Servicio
DEBUG=false
LOG_LEVEL=INFO
```

## Instalación

### Desarrollo

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servicio
uvicorn app.main:app --reload --host 0.0.0.0 --port 8081
```

### Docker

```bash
# Construir imagen
docker build -t urbanflow-analytics .

# Ejecutar contenedor
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql+psycopg2://user:pass@host:port/db" \
  urbanflow-analytics
```

## Estados Operativos

El sistema clasifica automáticamente cada medición en uno de los siguientes estados operativos:

### Estados Principales
1. **inicio**: Velocidad < 15 km/h, distancia < 1000m (fase de arranque)
2. **crucero**: Velocidad 24-26 km/h, distancia 1000m - (total-450m) (velocidad constante)
3. **frenado**: Velocidad > 15 km/h, distancia > (total-450m) (aproximación a estación)
4. **zona_lenta**: Velocidad < 5 km/h (reducción de velocidad)
5. **reaceleracion**: Velocidad 6-24 km/h, después de zona_lenta (incremento controlado de velocidad)
6. **parado**: Velocidad < 1 km/h (estado de detención)

### Detección de Reaceleración
La fase de **reaceleracion** se detecta cuando:
- Velocidad actual entre 6-24 km/h
- Estado anterior fue "zona_lenta" o velocidad venía de rango bajo (4-6 km/h)
- Tendencia de velocidad positiva sostenida
- No se ha alcanzado aún la velocidad de crucero estable

## Algoritmos ML

### Detección de Anomalías
- **Isolation Forest**: Detección de outliers en datos de sensores
- **DBSCAN**: Clustering para identificar patrones
- **Análisis de tendencias**: Regresión lineal para detectar cambios

### Clasificación
- **4 clases**: normal, inusual, monitoreo, alerta
- **Probabilidades**: Distribución de confianza por clase
- **Factores múltiples**: RMS, kurtosis, tendencias, volatilidad

## Integración

El microservicio se integra con:
- **Base de datos PostgreSQL**: Esquema completo de UrbanFlow
- **Frontend React**: API REST para dashboard
- **Sistema principal Node.js**: Comunicación HTTP

## Monitoreo

- **Health Check**: `GET /health`
- **Métricas**: Estado de sensores y predicciones
- **Logs**: Nivel configurable de logging
- **CORS**: Configurado para desarrollo y producción
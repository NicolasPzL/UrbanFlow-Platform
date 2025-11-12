# Urban Flow - Predictions Service

Microservicio de predicciones para la plataforma Urban Flow que analiza datos históricos de sensores y genera predicciones usando algoritmos de machine learning simples.

## Características

- **Análisis de datos históricos**: Procesa mediciones de sensores de vibración
- **Predicciones en tiempo real**: Media móvil, tendencias y detección de anomalías
- **Score de salud del sistema**: Evaluación automática del estado de las cabinas
- **API REST**: Endpoints para consultas y predicciones
- **Integración con PostgreSQL**: Conexión directa con la base de datos existente

## Algoritmos Implementados

### 1. Media Móvil Simple
- Calcula promedio de los últimos N valores
- Útil para suavizar fluctuaciones temporales

### 2. Media Móvil Exponencial
- Peso mayor a datos recientes
- Mejor respuesta a cambios recientes

### 3. Detección de Tendencias
- Regresión lineal para identificar patrones
- Cálculo de confianza basado en R²

### 4. Detección de Anomalías
- Basada en desviación estándar (Z-score)
- Identificación de valores atípicos

### 5. Score de Salud
- Evaluación del estado general del sistema
- Basado en RMS, kurtosis y distribución de estados

## API Endpoints

### GET /api/v1/health
Verificación de salud del servicio

### GET /api/v1/sensors
Lista de sensores activos con información básica

### GET /api/v1/sensors/{sensor_id}/historical
Datos históricos de un sensor específico
- Parámetros: `hours` (default: 24)

### POST /api/v1/sensors/{sensor_id}/predict
Genera predicciones para un sensor
- Body: `{"method": "moving_average", "window": 10, "hours": 24}`

### GET /api/v1/sensors/{sensor_id}/stats
Estadísticas de un sensor
- Parámetros: `hours` (default: 24)

### GET /api/v1/system/overview
Resumen general del sistema

## Instalación y Uso

### Requisitos
- Python 3.11+
- PostgreSQL con datos de Urban Flow
- Variables de entorno configuradas

### Instalación Local
```bash
cd microservices/predictions-service
pip install -r requirements.txt
python app.py
```

### Docker
```bash
docker build -t urbanflow-predictions .
docker run -p 3001:3001 urbanflow-predictions
```

### Variables de Entorno
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urbanflow
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
```

## Ejemplos de Uso

### Obtener sensores activos
```bash
curl http://localhost:3001/api/v1/sensors
```

### Obtener datos históricos
```bash
curl "http://localhost:3001/api/v1/sensors/1/historical?hours=48"
```

### Generar predicción
```bash
curl -X POST http://localhost:3001/api/v1/sensors/1/predict \
  -H "Content-Type: application/json" \
  -d '{"method": "moving_average", "window": 10, "hours": 24}'
```

### Respuesta de predicción
```json
{
  "sensor_id": 1,
  "predictions": {
    "rms": {
      "predicted_value": 0.85,
      "confidence": 0.75,
      "method": "moving_average"
    },
    "rms_trend": {
      "trend": "stable",
      "slope": 0.02,
      "confidence": 0.68
    },
    "rms_anomalies": []
  },
  "health": {
    "health_score": 85.5,
    "status": "healthy",
    "avg_rms": 0.82,
    "total_measurements": 1200
  }
}
```

## Integración con Datos Históricos

El servicio se conecta directamente a la base de datos PostgreSQL y utiliza las tablas:
- `sensores`: Información de sensores
- `cabinas`: Estado de las cabinas
- `mediciones`: Datos históricos de vibración

Los datos se procesan en tiempo real y se generan predicciones basadas en:
- Valores RMS (Root Mean Square)
- Kurtosis y Skewness
- Velocidad de las cabinas
- Estados procesados (operativo, inusual, alerta)

## Monitoreo y Alertas

El servicio incluye:
- Health checks automáticos
- Detección de anomalías en tiempo real
- Score de salud del sistema
- Métricas de rendimiento

## Desarrollo

### Estructura del Proyecto
```
predictions-service/
├── app.py                 # Aplicación principal
├── requirements.txt       # Dependencias
├── Dockerfile            # Imagen Docker
├── README.md             # Documentación
└── .env                  # Variables de entorno
```

### Agregar Nuevos Algoritmos
1. Extender la clase `PredictionEngine`
2. Implementar método estático
3. Agregar endpoint en `app.py`
4. Actualizar documentación

## Contribución

1. Fork del repositorio
2. Crear rama feature
3. Implementar cambios
4. Agregar tests
5. Crear pull request

## Licencia

MIT License - Ver LICENSE.md para más detalles

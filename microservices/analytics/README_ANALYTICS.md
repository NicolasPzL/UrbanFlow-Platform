# Microservicio de Analítica - UrbanFlow Platform

## Descripción

Este microservicio procesa datos de telemetría de la cabina de transporte por cable y genera métricas analíticas para el dashboard del sistema. Está desarrollado en Python con FastAPI y se conecta directamente a la base de datos PostgreSQL.

## Funcionalidades Principales

### 1. Procesamiento de Datos
- **Entrada**: Datos crudos de `public.telemetria_cruda`
- **Procesamiento**: Cálculo de métricas vibracionales y espectrales
- **Salida**: Resultados en `public.mediciones`

### 2. Métricas Calculadas

#### Métricas Básicas
- **RMS**: Root Mean Square de vibración
- **Kurtosis**: Medida de la "cola" de la distribución
- **Skewness**: Medida de asimetría
- **ZCR**: Zero Crossing Rate
- **Pico**: Valor máximo de vibración
- **Crest Factor**: Relación pico/RMS

#### Métricas Espectrales
- **Frecuencia Media**: Centroide espectral
- **Frecuencia Dominante**: Frecuencia con mayor amplitud
- **Amplitud Máxima Espectral**: Valor pico en el espectro
- **Energía por Bandas**: Baja (0-50Hz), Media (50-200Hz), Alta (>200Hz)

#### Estados Operativos
- **Inicio**: Primera parte del recorrido, velocidad ascendente
- **Crucero**: Velocidad estable entre 24-26 km/h
- **Frenado**: Última parte del trayecto (~450m antes del final)
- **Zona Lenta**: Velocidad ≈ 5 km/h durante ~40m
- **Reaceleración**: Incremento posterior hasta 25 km/h

### 3. Endpoints REST

#### POST `/api/analytics/process`
Procesa nuevos datos de telemetría cruda y calcula métricas.

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "status": "success",
    "message": "Procesados 15 ventanas de datos",
    "processed_count": 15
  }
}
```

#### GET `/api/analytics/trayecto`
Devuelve la trayectoria completa ordenada por timestamp.

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "trajectory": [
      {
        "timestamp": "2024-01-15T10:30:00Z",
        "latitud": -33.4489,
        "longitud": -70.6693,
        "altitud": 1200.5,
        "velocidad_m_s": 6.94,
        "estado_procesado": "crucero"
      }
    ],
    "total_points": 1500
  }
}
```

#### GET `/api/analytics/summary`
Devuelve KPIs agregados del sistema.

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "distancia_total_km": 18.2,
    "velocidad_promedio_kmh": 25.3,
    "velocidad_maxima_kmh": 28.7,
    "temperatura_promedio_c": 22.1,
    "rms_promedio": 0.85,
    "distribucion_estados": {
      "crucero": {"count": 1200, "percentage": 80.0},
      "inicio": {"count": 150, "percentage": 10.0},
      "frenado": {"count": 100, "percentage": 6.7},
      "zona_lenta": {"count": 50, "percentage": 3.3}
    },
    "estado_cabina_actual": "operativa",
    "total_mediciones": 1500
  }
}
```

## Instalación y Configuración

### 1. Requisitos
- Python 3.12+
- PostgreSQL 12+
- Node.js (para el backend principal)

### 2. Instalación
```bash
# Navegar al directorio del microservicio
cd microservices/analytics

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual (Windows)
venv\Scripts\activate

# Activar entorno virtual (Linux/Mac)
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Configuración
Crear archivo `.env` basado en `.env.example`:
```bash
# Copiar configuración de ejemplo
cp .env.example .env

# Editar variables según tu entorno
# DB_HOST, DB_PASSWORD, etc.
```

### 4. Inicialización de Base de Datos
```bash
# Inicializar base de datos con datos de muestra
python init_database.py

# Esto creará:
# - Tablas necesarias
# - Cabina y sensor
# - Líneas, estaciones y tramos
# - Datos de telemetría de muestra
```

### 5. Ejecución
```bash
# Usar script de inicio (recomendado)
python start_analytics.py

# O ejecutar directamente
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### 5.1 Modo simulación de telemetría

El microservicio puede generar mediciones sintéticas a partir de `telemetria_cruda` para alimentar el dashboard completo de UrbanFlow sin necesidad de hardware real.

```bash
# Configurar variables (desarrollo)
export ENABLE_SIMULATOR=true
export SIMULATOR_INTERVAL_SECONDS=5   # intervalo entre lotes
export SIMULATOR_SLICE_SIZE=3        # registros procesados por tick

# Levantar el microservicio
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Iniciar el backend Node en otra terminal
node app.js
```

Pruebas rápidas:

- `GET http://localhost:8001/api/simulator/status` → `enabled=true`, `running=true`, `generated_measurements` creciendo.
- `SELECT * FROM mediciones ORDER BY medicion_id DESC LIMIT 10;` → filas nuevas generadas por el simulador.
- Abrir la aplicación web: el dashboard y el geoportal muestran datos vivos provenientes de `mediciones`.

### 6. Pruebas
```bash
# Ejecutar pruebas completas
python test_analytics.py

# Esto probará:
# - Procesamiento consecutivo
# - Cálculo de distancias
# - Clasificación de estados
# - Integración con base de datos
```

## Estructura del Proyecto

```
microservices/analytics/
├── app/
│   ├── api/
│   │   └── routes.py          # Endpoints REST
│   ├── core/
│   │   └── config.py          # Configuración
│   ├── db/
│   │   ├── models.py          # Modelos SQLAlchemy
│   │   └── session.py         # Conexión a BD
│   ├── services/
│   │   ├── analytics.py        # Servicio de análisis
│   │   ├── ml.py              # Servicio de ML
│   │   └── telemetry_processor.py  # Procesador de telemetría
│   └── main.py                # Aplicación FastAPI
├── requirements.txt           # Dependencias Python
├── Dockerfile                # Imagen Docker
├── docker-compose.yml        # Orquestación
└── README_ANALYTICS.md       # Esta documentación
```

## Algoritmos Implementados

### 1. Cálculo de Distancia (Haversine)
```python
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Radio de la Tierra en metros
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c
```

### 2. Análisis Espectral
- **FFT**: Transformada rápida de Fourier
- **Bandas de Frecuencia**: Baja (0-50Hz), Media (50-200Hz), Alta (>200Hz)
- **Frecuencia Dominante**: Pico espectral principal

### 3. Métricas Vibracionales
- **RMS**: `sqrt(mean(x² + y² + z²))`
- **Kurtosis**: `mean((x-μ)⁴/σ⁴) - 3`
- **Skewness**: `mean((x-μ)³/σ³)`
- **ZCR**: Tasa de cruce por cero

## Integración con el Sistema

### 1. Base de Datos
- **Tabla origen**: `public.telemetria_cruda`
- **Tabla destino**: `public.mediciones`
- **Conexión**: PostgreSQL con SQLAlchemy

### 2. Backend Principal
- **Comunicación**: HTTP REST API
- **Autenticación**: JWT tokens
- **CORS**: Configurado para frontend

### 3. Frontend Dashboard
- **Datos**: Consumidos desde `/api/analytics/trayecto`
- **KPIs**: Obtenidos desde `/api/analytics/summary`
- **Procesamiento**: Triggered desde `/api/analytics/process`

## Monitoreo y Logs

### 1. Health Check
```bash
curl http://localhost:8001/health
```

### 2. Documentación API
- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`

### 3. Logs
- **Nivel**: Configurable via `LOG_LEVEL`
- **Formato**: JSON estructurado
- **Rotación**: Diaria

## Troubleshooting

### 1. Error de Conexión a BD
```bash
# Verificar variables de entorno
echo $DB_HOST $DB_PASSWORD $DB_NAME

# Probar conexión
psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

### 2. Error de Dependencias
```bash
# Reinstalar dependencias
pip install --force-reinstall -r requirements.txt
```

### 3. Error de Procesamiento
- Verificar que `telemetria_cruda` tenga datos
- Revisar logs del servicio
- Validar formato de timestamps

## Contribución

1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m "Agregar nueva funcionalidad"`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE.md` para más detalles.

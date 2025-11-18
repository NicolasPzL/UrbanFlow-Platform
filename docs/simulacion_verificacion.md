# Verificación de la Simulación de Telemetría

## 1. Mapa de código relevante

- **Simulador FastAPI**  
  - Arranque: `microservices/analytics/app/main.py` (`on_startup` crea `TelemetrySimulator`).  
  - Loop principal: `TelemetrySimulator._run_loop()` ejecuta `asyncio.sleep(interval_seconds)` → valor configurado en `SIMULATOR_INTERVAL_SECONDS` (5 s por defecto).  
  - Inserción en `mediciones`: `TelemetrySimulator._process_next_slice()` llama a `TelemetryProcessor.build_metrics_for_row()` y luego `TelemetryProcessor.build_measurement_model()`; el `Session` hace `session.add(measurement)` por cada fila.  
  - **Nota**: el simulador actual *reproduce* datos existentes de `telemetria_cruda`; no existe código que inserte nuevos registros en esa tabla. La ingesta debe provenir del simulador externo o de los scripts SQL/CSV históricos.

- **Procesamiento “real” de telemetría**  
  - API REST: `POST /api/analytics/process` → `microservices/analytics/app/api/routes.py` instancia `TelemetryProcessor.process_new_telemetry()`.  
  - Lectura desde `telemetria_cruda`: `_get_unprocessed_telemetry()` filtra por `timestamp > MAX(mediciones.timestamp)` para evitar reprocesar.  
  - Escritura en `mediciones`: `_batch_insert_measurements()` + `_filter_duplicate_measurements()` previenen duplicados (sensor_id + timestamp).  
  - Frecuencia: es bajo demanda (polling manual o programado). Se recomienda ejecutar este endpoint inmediatamente después de cada inserción en `telemetria_cruda`.

## 2. Scripts de verificación (`tools/verify_simulation.py`)

Se agregó un CLI para repetir las comprobaciones clave sin escribir SQL manual.

### 2.1 Intervalo de 5 segundos

```
python tools/verify_simulation.py interval \
  --sensor-id 101 \
  --start 2025-02-01T00:00:00 \
  --hours 2 \
  --interval-tolerance 0.7 \
  --min-success-rate 92
```

Reporta promedio, desviación estándar y porcentaje de diferencias dentro de `5 ± interval-tolerance`. Si el simulador respeta `SIMULATOR_INTERVAL_SECONDS`, el `% dentro de rango` debe acercarse al 100 %.

### 2.2 Cobertura de un día completo

```
python tools/verify_simulation.py coverage \
  --sensor-id 101 \
  --date 2024-05-01 \
  --interval 5 \
  --min-coverage 0.95
```

Muestra primer/último timestamp, duración total en horas y compara el conteo real con el esperado (`86 400 s / 5 s ≈ 17 280` registros por cabina).

### 2.3 Coherencia estadística

```
python tools/verify_simulation.py stats \
  --sensor-id 101 \
  --baseline 2024-04-30T00:00:00,2024-04-30T23:59:59 \
  --sim 2024-05-01T00:00:00,2024-05-01T23:59:59 \
  --tolerance-percent 15
```

Calcula `avg/min/max/std` para velocidad, altitud y vibraciones en ambas ventanas. Permite verificar que los valores simulados mantienen el mismo orden de magnitud que el dataset histórico. Si alguna métrica cae fuera de rango deben revisarse los datos fuente (CSV) usados por el simulador externo.

### 2.4 Conteo telemetria → mediciones

```
python tools/verify_simulation.py pipeline \
  --sensor-id 101 \
  --start 2024-05-01T08:00:00 \
  --hours 1 \
  --tolerance 5
```

Entrega los conteos en `telemetria_cruda` y `mediciones` para la ventana indicada y el porcentaje de cobertura.  
Si la diferencia excede la tolerancia (configurable con `--tolerance`) revise:

1. Que el microservicio esté corriendo (`POST /api/analytics/process` o simulador activo).  
2. Que no existan filtros adicionales (p. ej. `WHERE procesado = false` en `TelemetryProcessorSimple`).  
3. Que no se esté sobrescribiendo el `timestamp` (el simulador asigna `datetime.utcnow()`, por lo que la comparación debe hacerse con ventanas sincronizadas con la hora de procesamiento).

### 2.5 Interpretación de resultados

- **Intervalo (interval)**  
  - *OK*: media cercana a 5 s, desviación baja, porcentaje ≥ `--min-success-rate`.  
  - *FAIL*: media fuera de `± interval-tolerance` o menos muestras dentro del rango. Revisa `SIMULATOR_INTERVAL_SECONDS`, lags del sistema operativo o la frecuencia del simulador externo.
- **Cobertura (coverage)**  
  - *OK*: ratio ≥ `--min-coverage`; para un día completo se esperan ≈ 17 280 muestras por cabina (24 h * 3600 s / 5 s).  
  - *FAIL*: ratio < umbral; indica que faltan tramos del día o que la ingestión se detuvo.
- **Estadísticos (stats)**  
  - *OK*: diferencias porcentuales de `avg` y `std` ≤ `--tolerance-percent`.  
  - *FAIL*: alguna métrica supera el umbral; validar que el dataset base y la simulación partan del mismo recorrido.
- **Pipeline (pipeline)**  
  - *OK*: `abs(mediciones - telemetria) ≤ tolerance`.  
  - *FAIL*: diferencia mayor al umbral o sin datos de entrada; puede indicar perdidas, retrasos o doble procesamiento.

Cada subcomando devuelve `exit code 0` si el estado es OK y `exit code 1` en caso contrario. En CI se puede verificar con `echo $?` (Linux/macOS) o `echo %ERRORLEVEL%` (Windows). Ante un código distinto de cero, repetir el comando con ventanas más acotadas y revisar los logs del microservicio.

## 3. Consultas SQL rápidas

**Intervalo promedio por cabina**
```sql
SELECT sensor_id,
       AVG(EXTRACT(EPOCH FROM diff)) AS avg_seconds,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM diff)) AS p95
FROM (
    SELECT sensor_id,
           timestamp - LAG(timestamp) OVER (PARTITION BY sensor_id ORDER BY timestamp) AS diff
    FROM telemetria_cruda
) t
WHERE diff IS NOT NULL
GROUP BY sensor_id;
```

**Cobertura diaria y total esperado**
```sql
SELECT sensor_id,
       MIN(timestamp) AS first_sample,
       MAX(timestamp) AS last_sample,
       COUNT(*) AS muestras,
       (DATE_PART('epoch', MAX(timestamp) - MIN(timestamp)) / 5)::int AS esperado
FROM telemetria_cruda
WHERE timestamp::date = '2024-05-01'
GROUP BY sensor_id;
```

**Comparación estadística (original vs simulado)**
```sql
WITH baseline AS (
    SELECT AVG(velocidad_kmh) AS vel_avg, STDDEV_POP(velocidad_kmh) AS vel_std
    FROM telemetria_cruda
    WHERE timestamp BETWEEN '2024-04-30' AND '2024-04-30 23:59:59'
),
sim AS (
    SELECT AVG(velocidad_kmh) AS vel_avg, STDDEV_POP(velocidad_kmh) AS vel_std
    FROM telemetria_cruda
    WHERE timestamp BETWEEN '2024-05-01' AND '2024-05-01 23:59:59'
)
SELECT * FROM baseline, sim;
```

**Conteo pipeline**
```sql
SELECT
    (SELECT COUNT(*) FROM telemetria_cruda WHERE timestamp BETWEEN :start AND :end) AS telemetria,
    (SELECT COUNT(*) FROM mediciones WHERE timestamp BETWEEN :start AND :end) AS mediciones;
```

## 4. Pruebas automatizadas

- Se añadió `microservices/analytics/test_pipeline_integration.py`, un test PyTest con SQLite en memoria que:
  1. Inserta telemetría sintética y verifica que `TelemetryProcessor.process_new_telemetry()` genera la misma cantidad de `mediciones`.
  2. Ejecuta el procesador por segunda vez para confirmar que no se duplican registros gracias a `_filter_duplicate_measurements`.
- Ejecución:

```
cd microservices/analytics
pytest test_pipeline_integration.py
```

## 5. Resumen operativo

1. **Simulador interno (`TelemetrySimulator`)**: procesa datos ya existentes en `telemetria_cruda` con un sleep configurable (5 s). se activa sólo si `ENABLE_SIMULATOR=true`.  
2. **Generación de telemetría**: debe provenir del simulador externo/documentado; el repositorio no incluye un generador que inserte en `telemetria_cruda`.  
3. **Procesamiento analítico**: `TelemetryProcessor` (o la versión simple) transforma cada fila en `mediciones`.  
4. **Verificación continua**: ejecutar `tools/verify_simulation.py` tras cada despliegue para validar frecuencia, cobertura, coherencia estadística y conteos del pipeline. Mantener un cron SQL (ver sección 3) para monitorear el KPI “frescura de mediciones”.


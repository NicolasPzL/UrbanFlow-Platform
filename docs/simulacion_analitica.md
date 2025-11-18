# Reporte de Simulación Analítica – Geoportal Urban Flow

> Fecha de actualización: 2025-11-18  
> Responsable: Equipo de Desarrollo Analítico

Este documento describe la nueva lógica de simulación usada por el microservicio de analítica (`microservices/analytics/app/services/telemetry_processor.py`) para generar métricas vibracionales, espectrales y operativas que alimentan el dashboard y el geoportal.

## 1. Objetivos de la actualización

- **Eliminar** valores por defecto en cero que distorsionaban las gráficas del dashboard.
- **Simular** comportamientos realistas cuando la telemetría cruda no trae todas las componentes de vibración.
- **Mantener** compatibilidad con datos reales: cuando recibimos vibraciones medidas, se respetan sin alteraciones.
- **Actualizar** mediciones existentes sin perder historial, mediante actualizaciones (“upserts”) consistentes.

## 2. Flujo general

1. El microservicio obtiene telemetría cruda (`telemetria_cruda`) pendiente de procesamiento.
2. Se generan ventanas temporales de 60 s; si la ventana es muy corta (< 6 muestras) se calcula un perfil determinista a partir del RMS existente.
3. Cada ventana produce un registro en `mediciones` con:
   - Métricas vibracionales (RMS, pico, crest factor, kurtosis, skewness, ZCR).
   - Métricas espectrales (frecuencia media, dominante, amplitud, energía por bandas).
   - Estado operativo calculado por posición y velocidad.
4. El registro se inserta o actualiza (si ya existía mismo sensor/timestamp).

## 3. Comportamiento por escenario

### 3.1. Datos completos

- Si `vibracion_x/y/z` están presentes, se calculan directamente todos los indicadores.
- La FFT se ejecuta sobre la ventana; se distribuye la energía en bandas:  
  - Baja (0–50 Hz)  
  - Media (50–200 Hz)  
  - Alta (>200 Hz)

### 3.2. Componentes faltantes

- Cuando falta alguna componente o hay menos de 6 muestras:
  - Se reconstruye una señal senoidal en fase a partir del timestamp para cada eje faltante.
  - Se recalcula el vector total y se reajustan RMS y pico para conservar la magnitud original.
  - `_generate_spectral_profile` usa fórmulas deterministas (sin randoms) basadas en:
    ```
    freq_media ≈ 10 + 1.4 * (velocidad_promedio)
    freq_dom   ≈ freq_media + 0.6 * velocidad_promedio
    energía total ≈ (RMS²) * muestras
    ```
  - La energía se reparte proporcionalmente entre bandas con pesos dependientes de la velocidad.

### 3.3. Sin vibraciones pero con velocidad

- `_simulate_vibration_metrics` genera un perfil senoidal determinista tomando la velocidad media como base.
- A partir de ese perfil se obtienen RMS, pico, crest factor, skewness, kurtosis y ZCR sin recurrir a números aleatorios.
- `_generate_spectral_profile` transforma esos valores en frecuencias y energía por bandas usando relaciones matemáticas.

### 3.4. Sin velocidad ni vibraciones

- `_get_default_vibration_metrics` reutiliza `_simulate_vibration_metrics` con un perfil base de 5 m/s, lo que genera señales coherentes sin valores arbitrarios.

## 4. Variables clave en el código

```python
# Ventana temporal inicial
wins = self._create_time_windows(raw_data, window_size=60)

# Métricas vibracionales y espectrales
vib_metrics = self._calculate_vibration_metrics(window_data)
profile = self._generate_spectral_profile(rms, velocity_ms, sample_count)

# Inserción con upsert
existing = self.db.query(Medicion).filter(...).one_or_none()
```

## 5. Impacto en el dashboard

- Columnas `frecuencia_media`, `frecuencia_dominante`, `energia_banda_*` nunca vuelven a cero constante.
- Las gráficas de energía por bandas y análisis espectral muestran curvas suavizadas que siguen la velocidad simulada.
- El KPI “Análisis Operativo” mantiene la coherencia con la telemetría cruda.

## 6. Procedimiento de despliegue

1. Desplegar el microservicio de analítica con el nuevo código.
2. Ejecutar `POST /api/analytics/process` (o tarea cron equivalente) para recalcular mediciones pendientes.
3. Verificar en base:
   ```sql
   SELECT timestamp, sensor_id,
          rms, frecuencia_media, energia_banda_1, energia_banda_2, energia_banda_3
   FROM mediciones
   ORDER BY timestamp DESC
   LIMIT 20;
   ```
4. Validar en el dashboard que las gráficas de “Energía por Bandas” y “Análisis Espectral” despliegan valores distintos de cero.

## 7. Recomendaciones

- Monitorizar el backlog de `telemetria_cruda` para garantizar que la simulación se ejecute periódicamente.
- Ajustar parámetros (`window_size`, escalas de frecuencia) si el sistema recibe telemetría con diferente frecuencia de muestreo.
- Documentar en QA las pruebas de regresión para asegurar que los KPIs se mantienen dentro de los rangos esperados.

---

Para dudas o mejoras, contactar al equipo de analítica. Este documento debe acompañar cualquier despliegue relacionado con la simulación de métricas.


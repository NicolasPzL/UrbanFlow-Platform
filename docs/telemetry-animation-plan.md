## Análisis de telemetría cruda y propuesta de animación

### 1. Inspección de `public.telemetria_cruda`
- Campos relevantes confirmados: `timestamp`, `sensor_id`, `lat`, `lon`, `alt`, `velocidad_kmh`, `aceleracion_m_s2`, `temperatura_c`, `vibracion_x/y/z`.
- Frecuencia observada: registros cada ~5 minutos (según muestra en base).
- Las coordenadas (`lat`, `lon`) utilizan formato decimal (precision 9,6) adecuado para Mapbox.
- `velocidad_kmh` necesita conversión a m/s (`valor / 3.6`) para mantener consistencia con el mapa actual.
- Existe un único sensor asociado a `CAB-0001`, lo que simplifica la correlación.

### 2. Propuesta para animar movimiento real
1. **Endpoint dedicado**  
   - Exponer `/api/map/path/:cabinaId` que retorne las últimas _N_ posiciones (ej. 50 muestras) desde `telemetria_cruda`.
   - Incluir campos normalizados: `lat`, `lon`, `alt`, `velocidad_ms`, `timestamp`.

2. **Servicio de streaming/polling**  
   - **Opción rápida**: polling cada 5 s desde el frontend (ya utilizado para `/api/map/public`).
   - **Opción óptima**: WebSocket o Server-Sent Events desde microservicio analytics → backend → frontend.

3. **Interpolación y animación (frontend)**  
   - Al recibir la serie, guardar en un buffer por cabina.
   - Utilizar `requestAnimationFrame` para interpolar entre la posición actual y la siguiente teniendo en cuenta `timestamp`.
   - Aplicar easing lineal o basado en velocidad para mantener fluidez.

4. **Fallbacks**  
   - Si no hay nuevos registros en un ciclo, mantener la posición final y mostrar indicador “sin actualización”.
   - Registrar métricas de frescura (`Date.now() - timestamp`) para alertar al usuario.

### 3. Pasos siguientes sugeridos
1. Implementar consulta SQL parametrizada en `geoportalModel` que combine `telemetria_cruda` con `cabinas`.
2. Crear DTO en backend (por ejemplo `CabinTelemetryDto`) y endpoint REST/WS.
3. Añadir hook en `GeoportalMap` para animar marcadores usando buffer de posiciones.
4. Documentar pruebas de rendimiento (carga máxima de muestras) y actualizar guía de despliegue.


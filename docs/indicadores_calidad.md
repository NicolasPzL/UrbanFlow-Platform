# Indicadores de Calidad – UrbanFlow Platform (ISO/IEC 25010)

| KPI | Descripción | Umbral objetivo | Fuente de datos | Frecuencia |
|-----|-------------|-----------------|-----------------|------------|
| Disponibilidad del backend | Porcentaje de tiempo en que la API responde 200 | ≥ 99 % mensual | Logs de uptime, monitor externo (pendiente) | Mensual |
| Latencia P95 API (`/api/dashboard`) | Tiempo en ms para responder al dashboard | ≤ 800 ms | Logs de morgan (convertidos a reportes) | Semanal |
| Tasa de errores 5xx | Número de respuestas 5xx / total de requests | ≤ 0.5 % | morgan + analítica (script pendiente) | Semanal |
| Tiempo de reacción a incidentes | Tiempo desde detección a mitigación | ≤ 2 horas | Bitácora de incidentes | Post-incident |
| Frescura de datos de mediciones | Diferencia entre `telemetria_cruda` y `mediciones` | ≤ 20 s | Consultas SQL programadas | Diaria |
| Cobertura documental | % de módulos críticos con documentación actualizada | ≥ 90 % | Revisión checklist | Quincenal |
| Cumplimiento de auditoría | % de eventos críticos con registro en `logs/auditoria.log` | 100 % | Revisión de log y tabla `audit_log` | Semanal |

## Procedimiento de Medición
1. Exportar logs HTTP semanalmente y generar reporte (script `scripts/report_latency.js`, por implementar).
2. Ejecutar consulta SQL para frescura de datos:
   ```sql
   SELECT EXTRACT(EPOCH FROM (MAX(tc.timestamp) - MAX(m.timestamp))) AS diff_seconds
   FROM telemetria_cruda tc
   JOIN mediciones m USING (sensor_id);
   ```
3. Revisar `logs/auditoria.log` y `audit_log` comparando con eventos esperados (login, creación de usuarios, cambios de contraseña).
4. Documentar resultados y acciones en `docs/checklist_cumplimiento.md`.

Los indicadores se revisan en la reunión de seguimiento semanal y se actualizan mensualmente en el reporte de operación.


# Matriz de Riesgos – UrbanFlow Platform

| ID | Riesgo | Probabilidad | Impacto | Nivel | Mitigación / Plan |
|----|--------|--------------|---------|-------|-------------------|
| R1 | Caída de la base de datos PostgreSQL | Media | Alto | Alto | Respaldos diarios (`pg_dump`), monitoreo de servicio, procedimiento de restauración (`docs/ops/restore_db.md`). |
| R2 | Exposición accidental del archivo `.env` | Media | Alto | Alto | `.gitignore` reforzado, guía en `docs/plan_configuracion.md`, rotación de secretos trimestral, revisión de PRs. |
| R3 | Datos sintéticos insertados en ambiente productivo | Baja | Alto | Medio | Variables `GENERATOR_ENABLED=false` en producción, auditoría cuando se active generador, validación previa. |
| R4 | Falla del generador de telemetría bloqueando pipeline | Media | Medio | Medio | Circuit breaker implementado, logs `[AUDIT]`, monitoreo manual de colas. |
| R5 | Vulnerabilidades en dependencias externas | Media | Medio | Medio | Ejecución trimestral de `npm audit` y `pip-audit`, registro en `docs/indicadores_calidad.md`, actualización planificada. |
| R6 | Ausencia de pruebas formales (ISO 29119) provoca regresiones | Alta | Medio | Alto | Documentar como pendiente en `docs/checklist_cumplimiento.md`, planificar suite automática en fase siguiente. |
| R7 | Usuario con rol privilegiado comprometido | Baja | Alto | Medio | Auditoría de login/logout, rotación de contraseñas, política de doble aprobación para cambios críticos. |
| R8 | Latencia alta del microservicio analytics | Media | Medio | Medio | Métricas de latencia P95 en `docs/indicadores_calidad.md`, optimización de consultas, escalado manual si supera umbral. |
| R9 | Falta de documentación actualizada tras cambios rápidos | Media | Medio | Medio | Checklist obligatorio en PRs, revisiones semanales de documentación, responsables asignados en `docs/plan_ciclo_vida.md`. |
| R10 | Incidente de seguridad sin respuesta coordinada | Baja | Alto | Medio | Procedimiento de incidentes (`docs/politica_seguridad.md`), notificación al Responsable de Seguridad y registro en `logs/auditoria.log`. |

Leyenda: Probabilidad (Baja/Media/Alta), Impacto (Bajo/Medio/Alto), Nivel (evaluación cualitativa). La matriz se revisa al inicio de cada sprint y se actualiza cuando se materializa un riesgo o se ejecuta una acción de mitigación.


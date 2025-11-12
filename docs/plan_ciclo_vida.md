# Plan de Ciclo de Vida del Software – UrbanFlow Platform

## Propósito
Establecer el ciclo de vida adoptado para UrbanFlow Platform con el fin de asegurar un desarrollo, operación y mantenimiento controlados, alineados con ISO/IEC 12207 e ISO/IEC 29110.

## Fases y Actividades

### 1. Planificación
- **Actividades:** definición de alcance, estimación de esfuerzo, identificación de riesgos, asignación de responsables y calendarización.
- **Roles:** Product Owner (prioriza requisitos), Líder Técnico (define arquitectura y estimaciones), Responsable de Calidad (establece criterios de aceptación).
- **Entregables:** `docs/plan_proyecto_uf.md`, `docs/matriz_riesgos.md`, backlog priorizado, cronograma (`docs/cronograma.md`).
- **Gate:** aprobación del plan por Product Owner y Líder Técnico; aceptación de riesgos y presupuesto; confirmación de disponibilidad del entorno.
- **Frecuencia:** actualización mensual o ante cambios mayores de alcance.

### 2. Desarrollo (Implementación)
- **Actividades:** refinamiento de requisitos, diseño técnico ligero, codificación, revisión de código, integraciones y actualización de documentación.
- **Roles:** Desarrolladores (backend Node.js / microservicio FastAPI / frontend), QA (valida criterios de aceptación), DevOps de soporte (configuración de ambientes).
- **Entregables:** commits revisados, `CHANGELOG.md`, documentación técnica (`docs/arquitectura.md`, manuales), artefactos desplegables.
- **Gate:** revisión técnica por par, actualización de checklists (`docs/checklist_cumplimiento.md`), evidencias de verificación manual.
- **Frecuencia:** sprints quincenales con despliegue continuo cuando se cumplan criterios.

### 3. Operación
- **Actividades:** monitoreo de servicios, revisión de logs (incluyendo auditoría), soporte a usuarios, ejecución de procedimientos operativos y gestión de incidentes.
- **Roles:** Equipo de Operaciones/Soporte (monitorea y atiende incidencias), Administrador de Plataforma (gestiona accesos y parámetros).
- **Entregables:** reportes de operación (uptime, métricas KPI en `docs/indicadores_calidad.md`), bitácoras de incidentes, actualizaciones de manuales de usuario/admin.
- **Gate:** incidentes resueltos y documentados; auditoría de eventos críticos (`logs/auditoria.log`); verificación de backups y salud de BD.
- **Frecuencia:** monitoreo diario; revisión formal cada semana.

### 4. Mantenimiento
- **Actividades:** corrección de defectos, optimización de rendimiento, actualización de dependencias, rotación de secretos, planificación de releases.
- **Roles:** Equipo de Desarrollo (ejecuta cambios correctivos/evolutivos), Responsable de Seguridad (valida rotación de secretos y políticas), Líder Técnico (prioriza backlog de mantenimiento).
- **Entregables:** parches documentados en `CHANGELOG.md`, scripts actualizados, reportes de mantenimiento preventivo.
- **Gate:** pruebas manuales satisfactorias, actualización de documentos afectados, aprobación de despliegue por Responsable de Calidad.
- **Frecuencia:** ventanas mensuales de mantenimiento preventivo y correctivo bajo demanda.

## Puntos de Control y Gobernanza
| Gate | Descripción | Responsables | Evidencia |
|------|-------------|---------------|-----------|
| G1 – Aprobación de planificación | Validar alcance, riesgos y cronograma | Product Owner, Líder Técnico | Plan de proyecto firmado, cronograma vigente |
| G2 – Revisión técnica de sprint | Confirmar que historias cumplen criterios de aceptación y checklist | Desarrollador revisor, Responsable de Calidad | Checklist completado, código aprobado en PR |
| G3 – Preparación de release | Revisar cambios, pruebas manuales, actualización de documentación | Líder Técnico, QA | `CHANGELOG.md`, manuales actualizados, ticket de release |
| G4 – Operación estable | Evaluar métricas y auditorías post-deployment | Operaciones, Responsable de Seguridad | Reporte de métricas (`docs/indicadores_calidad.md`), logs auditados |
| G5 – Retrospectiva | Analizar desempeño, lecciones aprendidas, acciones de mejora | Equipo completo | Acta de retrospectiva (`docs/retro_<fecha>.md`) |

## Revisiones y Mejora Continua
- **Revisión mensual** del plan por el Product Owner para ajustar prioridades y recursos.
- **Retrospectivas quincenales** para identificar mejoras de proceso (entrada a `docs/roadmap_cmmilevel2.md`).
- **Auditoría de seguridad trimestral** para validar cumplimientos de `docs/politica_seguridad.md` y rotación de secretos.
- **Actualización de documentación** obligatoria en cada release mayor para mantener trazabilidad (ver `docs/trazabilidad_requisitos.md`).

## Responsabilidades Resumidas
- **Product Owner:** priorización de requisitos, aceptación funcional, comunicación con stakeholders.
- **Líder Técnico:** gobierno del ciclo de vida, revisión de diseño, aprobación de despliegues.
- **Responsable de Calidad:** custodia de checklists y criterios de aceptación, mantenimiento del repositorio documental.
- **Responsable de Seguridad:** gestión de credenciales, auditorías, planes de continuidad.
- **Equipo de Desarrollo/Operaciones:** ejecución de actividades técnicas según fase.

Este plan se revisará cada seis meses o cuando exista un cambio significativo en alcance, equipo o tecnología base. Cualquier ajuste se documentará en `CHANGELOG.md` dentro de la sección “Procesos”.


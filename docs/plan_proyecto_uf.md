# Plan de Proyecto – UrbanFlow Platform

## 1. Propósito y Alcance
Desarrollar y mantener la plataforma UrbanFlow para monitorizar telemetría de cabinas urbanas incluyendo análisis vibracional, espectral y estados operativos. El alcance abarca backend Node.js/Express, microservicio FastAPI, frontend React y base de datos PostgreSQL.  
Excluye la gestión física de sensores y el despliegue productivo (cubierto por operaciones locales).

## 2. Objetivos Específicos
- Consolidar pipeline de ingestión, procesamiento y visualización de telemetría.
- Implementar controles de seguridad y auditoría alineados a normas ISO.
- Proporcionar documentación operativa y manuales para usuarios y administradores.

## 3. Entregables Principales
| Entregable | Fecha objetivo | Responsable |
|------------|----------------|-------------|
| Dashboard operativo con alertas FSM | 2025-10-25 | Líder Técnico |
| Documentación normativa (`docs/*`) | 2025-10-25 | Responsable de Calidad |
| Manuales de usuario y admin | 2025-10-25 | Responsable de Calidad |
| Plan de configuración y seguridad | 2025-10-25 | Responsable de Seguridad |
| Roadmap CMMI Nivel 2 | 2025-10-27 | Líder Técnico |

## 4. Organización y Roles
- **Product Owner:** Javier Ríos – prioriza funcionalidades y valida entregables.
- **Líder Técnico:** Ana Gómez – define arquitectura, revisa código, aprueba despliegues.
- **Responsable de Calidad:** Laura Pérez – mantiene documentación y checklists.
- **Responsable de Seguridad:** Martín Silva – gestiona credenciales, auditorías.
- **Equipo de Desarrollo:** Full-stack (backend/frontend) y equipo de microservicio analytics.
- **Operaciones (Soporte):** Encargados de despliegue, monitoreo y backups.

## 5. Cronograma Resumido
Ver `docs/cronograma.md` para detalle quincenal. Ciclo de trabajo en sprints de 2 semanas con revisiones y retrospectivas.

## 6. Gestión de Riesgos
Se mantiene en `docs/matriz_riesgos.md`. Riesgos top-5 actuales:
1. Caída de base de datos.
2. Exposición accidental de `.env`.
3. Falla en generador sintético en entornos productivos.
4. Falta de pruebas formales (ISO 29119 pendiente).
5. Desalineación documental tras cambios rápidos.

## 7. Plan de Comunicación
| Interesado | Medio | Frecuencia | Contenido |
|------------|-------|------------|-----------|
| Product Owner | Reunión virtual / mensaje | Semanal | Progreso de sprint, riesgos, próximos hitos |
| Equipo Técnico | Reunión diaria (15 min) | Diario | Estado tareas, bloqueos, prioridades |
| Stakeholders externos | Reporte mensual | Mensual | Resumen de métricas, avances y próximos pasos |
| Operaciones | Slack / correo | Bajo demanda | Incidentes, despliegues programados |

## 8. Plan de Calidad
- Aplicar checklist en `docs/checklist_cumplimiento.md` antes de cada merge a `dev`.
- Mantener KPIs definidos en `docs/indicadores_calidad.md`.
- Revisiones de código obligatorias y documentación actualizada cada release.

## 9. Plan de Configuración y Seguridad
- Resumen en `docs/plan_configuracion.md` y `docs/politica_seguridad.md`.
- Rotación de secretos documentada, backups controlados y auditoría activa.

## 10. Seguimiento y Control
- Reunión semanal de seguimiento (PO + Líder Técnico) para validar avances vs. cronograma.
- Actualización del cronograma y checklist tras cada sprint.
- Registro de incidencias y acciones correctivas en `docs/checklist_cumplimiento.md`.

## 11. Cierre del Proyecto / Release Mayor
- Validación de alcance cumplido por el Product Owner.
- Entrega de documentación actualizada (manuales, políticas, changelog).
- Sesión de retrospectiva final y captura de lecciones aprendidas (`docs/retro_final.md`).

Este plan se revisa y actualiza al inicio de cada trimestre o cuando se incorpora un nuevo alcance significativo.


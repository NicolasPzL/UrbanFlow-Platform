# Plan de mejora continua – Geoportal

| Área | Acción | Periodicidad | Responsable |
| --- | --- | --- | --- |
| Observabilidad | Incorporar logging estructurado para errores Mapbox y métricas de autoenfoque (integración con ELK). | Q2 2026 | Frontend + DevOps |
| Testing | Extender Playwright a Firefox y WebKit, añadir aserciones visuales para autoenfoque. | Mensual | QA Lead |
| Rendimiento | Analizar consumo de memoria del mapa y evaluar carga diferida de capas 3D. | Trimestral | Arquitecto frontend |
| Accesibilidad | Ejecutar auditorías WCAG y pruebas con lectores de pantalla sobre `MapModeToggle`. | Trimestral | UX Research |
| Documentación | Revisar `docs/quality-matrix.md` y métricas tras cada release mayor. | Post-release | QA Lead |

## Backlog priorizado

- Automatizar la recopilación de `login_to_geoportal_ms` en CI.
- Instrumentar pruebas contractuales contra `/api/map/public`.
- Evaluar fallback offline para el mapa cuando Mapbox no esté disponible.


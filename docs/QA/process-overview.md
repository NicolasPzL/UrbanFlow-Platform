# Proceso de aseguramiento de calidad para el Geoportal

Este documento describe la adaptación de las prácticas de ingeniería de software del proyecto UrbanFlow conforme a ISO/IEC 12207 para las funcionalidades críticas del geoportal (autenticación, renderizado estable, autoenfoque de estaciones y selector 2D/3D).

## 1. Estructura de procesos (ISO/IEC 12207)

| Fase | Actividades | Entregables | Responsables |
| --- | --- | --- | --- |
| **Análisis** | Identificación de incidencias (pantalla en blanco, errores Mapbox/React, falta de autoenfoque). Priorización con stakeholders. | Registro de incidentes, alcance aprobado. | Líder funcional, QA Lead. |
| **Diseño** | Definición de hipótesis técnicas, diseño de componentes `MapModeToggle`, consolidación de `GeoportalMap` y plan de pruebas. | Diagramas de flujo, plan de remediación, checklist de cumplimiento ISO/IEC 25010. | Arquitecto frontend, QA Lead. |
| **Implementación** | Refactorización de `GeoportalMap`, normalización de datos, integración del botón 2D/3D y autoenfoque inicial. | Pull requests versionados, notas de cambio. | Equipo frontend. |
| **Verificación** | Ejecución de las pruebas E2E (Playwright) y captura de métricas de desempeño. | Reporte `auth-geoportal.spec.ts`, evidencia de métricas. | QA Lead. |
| **Mantenimiento** | Actualización de documentación, checklist de despliegue y backlog de mejoras. | `docs/quality-matrix.md`, `docs/DeploymentGuide.md`, `docs/QA/continuous-improvement.md`. | QA Lead, DevOps. |

## 2. Control de riesgos

- **Errores de inicialización Mapbox**: Sanitización de coordenadas y bloqueo de capas duplicadas antes de añadirlas.
- **Inconsistencias de sesión**: Normalización de `/api/auth/me` en el cliente, rutas mockeadas en pruebas E2E.
- **Regresiones de usabilidad**: Pruebas Playwright con coberturas para toggles y flujos de login.
- **Dependencia externa (Mapbox)**: Interceptores en pruebas y guía de despliegue con variables `VITE_MAPBOX_ACCESS_TOKEN`.

## 3. Gestión de configuración

- Todas las modificaciones quedan asociadas a tickets o tareas de plan de mejora.
- Los archivos clave (`GeoportalMap.tsx`, `MapModeToggle.tsx`, suites Playwright) requieren revisión cruzada.
- Los cambios en `docs/` deben acompañarse de referencia explícita a ISO/IEC 12207 o 25010.

## 4. Métricas y trazabilidad

- Cada ejecución de `npm run test:e2e` anexa una anotación `login_to_geoportal_ms` para seguimiento de tiempos.
- Las métricas consolidadas se registran en `docs/QA/geoportal-metrics.md`.
- El plan de calidad se revisa trimestralmente o tras incidentes mayores.


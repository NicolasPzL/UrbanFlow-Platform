# Matriz de calidad ISO/IEC 25010 – Geoportal UrbanFlow

| Característica | Subcaracterística | Evidencia / Implementación | Métrica asociada |
| --- | --- | --- | --- |
| **Adecuación funcional** | Completitud | Autoenfoque automático en estaciones y control dual 2D/3D cubren requisitos de navegación y visualización. | Cobertura del flujo `auth-geoportal.spec.ts`. |
|  | Corrección | Sanitización de datos geoespaciales y validación de credenciales evitan estados inconsistentes en mapa y sesión. | Incidencias críticas en consola <= 0 durante pruebas E2E. |
| **Fiabilidad** | Madurez | Prevención de capas duplicadas y manejo de errores Mapbox reduce fallos observados. | Métrica `login_to_geoportal_ms` < 2500 ms y sin errores críticos. |
|  | Recuperabilidad | Fallback de mensajes en errores de mapa y logs controlados en `App.tsx`. | Reintentos exitosos de carga registrados en métricas. |
| **Usabilidad** | Adecuación reconocible | `MapModeToggle` con textos descriptivos y diseño responsivo conforme a guías WCAG. | Encuestas internas / pruebas heurísticas (pendiente). |
|  | Operabilidad | Redirección automática al geoportal detallado tras login y acceso persistente al toggle. | Test E2E valida navegación sin refrescos manuales. |
| **Eficiencia de desempeño** | Comportamiento temporal | Autoenfoque basado en bounds minimiza interacción inicial del usuario. | Tiempo de render inicial capturado en `geoportal-metrics.md`. |
|  | Utilización de recursos | Uso de `reuseMaps` controlado, evita recrear instancias mientras remueve capas innecesarias. | Monitorización manual de uso de memoria (pendiente). |
| **Mantenibilidad** | Modularidad | Separación en `MapModeToggle`, `mapModes/` y normalización dentro de `GeoportalMap`. | Revisión de dependencias en PR (SR-2025-Geoportal). |
|  | Analizabilidad | Documentación actualizada en `docs/QA/process-overview.md` y comentarios en código clave. | Tiempo de onboarding < 1 día (objetivo interno). |
| **Portabilidad** | Adaptabilidad | Botón 2D/3D y autoenfoque funcionan en navegadores Chromium (validado en CI). | Matriz de compatibilidad en `geoportal-metrics.md`. |


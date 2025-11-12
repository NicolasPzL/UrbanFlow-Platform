# Métricas del Geoportal

Las siguientes métricas se alinean con ISO/IEC 25023 (medición de calidad del producto) y se actualizan a partir de la suite E2E (`npm run test:e2e`).

| Métrica | Objetivo | Fuente | Resultado actual | Observaciones |
| --- | --- | --- | --- | --- |
| Tiempo login → render geoportal | ≤ 2500 ms | Anotación `login_to_geoportal_ms` en `auth-geoportal.spec.ts` | Pendiente de captura (ejecutar `npm run test:e2e`) | Registrar mínimo 3 corridas consecutivas en CI. |
| Errores críticos en consola | 0 | Reporte Playwright (`test-results/`) | 0 (esperado tras refactor) | Revisar logs en caso de advertencias Mapbox externas. |
| Cumplimiento autoenfoque | 100 % de ejecuciones | Vérsatil: validación visual + screenshot Playwright | Pendiente (se valida manualmente en la primera ejecución) | Incorporar aserción visual en backlog. |
| Compatibilidad navegadores | Chromium estable | Configuración `playwright.config.ts` | Chromium (validado), ampliar a Firefox/WebKit (pendiente) | Añadir proyectos adicionales en CI cuando se requiera. |

## Procedimiento de captura

1. Ejecutar `npm install` en `views/`.
2. Ejecutar `npm run test:e2e`.
3. Extraer anotaciones de rendimiento desde el reporte HTML (`playwright-report/index.html`) y registrar en la tabla.
4. Archivar evidencia (trazas o videos) durante al menos dos ciclos de liberación.


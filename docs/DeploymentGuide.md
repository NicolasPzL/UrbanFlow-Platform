# Guía de despliegue – Geoportal UrbanFlow

## 1. Prerrequisitos

- Node.js ≥ 18.18.0 y npm ≥ 9.
- Variables de entorno:
  - `VITE_MAPBOX_ACCESS_TOKEN` (clave pública de Mapbox).
  - Cookies de autenticación configuradas según `config/auth.js`.
- Base de datos y API en línea (microservicios listos).

## 2. Pasos previos al despliegue

1. `npm install` en la raíz y en `views/`.
2. Ejecutar en `views/`:
   ```bash
   npm run build
   npm run test:e2e
   ```
3. Revisar `docs/QA/geoportal-metrics.md` y actualizar la tabla si existen nuevos resultados.
4. Confirmar que no existen advertencias en consola relacionadas con Mapbox o React.

## 3. Despliegue

- Backend: desplegar con PM2 o contenedor Docker según procedimiento existente.
- Frontend (`views/`):
  - Copiar artefactos de `dist/` al CDN o servidor web.
  - Asegurar que la variable `VITE_MAPBOX_ACCESS_TOKEN` esté disponible en el entorno de ejecución.

## 4. Post-despliegue

- Verificar flujo completo: acceso público → login → geoportal detallado → toggle 2D/3D.
- Registrar cualquier incidencia en la bitácora de QA.
- Programar revisión semanal del reporte Playwright hasta estabilizar métricas.


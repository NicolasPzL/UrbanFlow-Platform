# Changelog – UrbanFlow Platform

## [1.4.0] – 2025-10-20
### Added
- Generador de telemetría con máquina de estados (FSM) y anticolisión reforzada.
- Pipeline de análisis vibracional con cálculo de espectro y métricas FFT.
- Tablero operativo con alertas dinámicas y filtros de cabina.
- Documentación de ciclo de vida, seguridad y gestión de configuración (`docs/*`).
- Middleware de auditoría para eventos críticos y cabeceras de seguridad reforzadas.

### Changed
- Normalización de IDs de cabina y trazabilidad de mediciones en `controllers/dashboardController.js`.
- Mejora de flujos de autenticación (`must_change_password`) y creación de usuarios con contraseñas temporales.

### Fixed
- Eliminación de “teleports” geográficos en datos sintéticos.
- Correcciones en cálculos de espectro (sin valores nulos) y ordenamiento de mediciones recientes.

## [1.3.0] – 2025-08-15
- Integración del microservicio de analytics (FastAPI) con procesamiento en tiempo real.
- Añadido dashboard vibracional y espectral inicial en frontend.
- Gestión básica de roles y autenticación JWT con cookies seguras.

## [1.2.0] – 2025-05-10
- Conversión del backend a módulos ES y adopción de Helmet, rate limiting y sanitización.
- Inclusión de motor de auditoría en base de datos (`audit_log`).

## [1.1.0] – 2025-02-18
- Publicación inicial del backend Node.js y frontend React con autenticación.

> Nota: versiones anteriores a 1.1.0 se registraron en notas internas. A partir de 1.4.0 se adopta la política de versionado documentada en `docs/politica_versionado.md`.


# Plan de Gestión de Configuración – UrbanFlow Platform

## 1. Alcance
Este plan describe cómo se identifican, controlan y resguardan los elementos de configuración (CI) del proyecto UrbanFlow Platform, incluyendo código fuente, scripts, archivos .env y documentación.

## 2. Estructura del Repositorio
```
/
├── app.js                         // Entrada principal Express
├── controllers/                   // Lógica de negocio (Node.js)
├── microservices/analytics/       // Microservicio FastAPI
├── models/, routes/, middlewares/ // Capas del backend
├── views/                         // Frontend React/Vite
├── docs/                          // Documentación de procesos y manuales
├── logs/                          // Salida de auditoría y operación
└── .env (local, no versionado)    // Variables de entorno
```

## 3. Baselines y Versionado
- Las versiones oficiales se etiquetan según `docs/politica_versionado.md` y se documentan en `CHANGELOG.md`.
- La rama `main` representa la baseline aprobada; `dev` integra cambios en curso.
- Documentación relevante (manuales, planes) debe actualizarse en el mismo PR que introduce cambios funcionales.

## 4. Gestión de Archivos `.env` y Secretos
- Los archivos `.env` nunca deben subirse al repositorio.
- Mantener un `.env.example` con variables obligatorias (sin valores sensibles).
- Secretos críticos: `JWT_SECRET`, `REFRESH_JWT_SECRET`, credenciales de BD, claves externas (Mapbox, etc.).
- **Rotación de secretos (JWT):**
  1. Generar nuevos valores seguros (`openssl rand -hex 32`).
  2. Actualizar `.env` en los entornos (dev/test/prod) y reiniciar servicios.
  3. Invalidar sesiones previas forzando limpieza de cookies si es necesario.
  4. Registrar la rotación en `logs/auditoria.log` y en la bitácora de operaciones.
- Guardar secretos en el gestor corporativo (ej. Vault, Azure Key Vault) cuando esté disponible.

## 5. Respaldos y Restauración
- **Base de datos PostgreSQL:** ejecutar respaldo completo diario (`pg_dump`) y almacenarlo de forma cifrada. Documentar comandos y destino en `docs/ops/backups.md`.
- **Logs críticos:** rotar semanalmente `logs/auditoria.log` y conservar copias por al menos 90 días.
- **Restauración:** mantener script de restauración (`scripts/restore_db.sql`) y guía breve en `docs/ops/restore_db.md`.

## 6. Control de Cambios
- Cada Pull Request debe contener:
  - Descripción del cambio.
  - Referencia a requisitos/issue en `docs/trazabilidad_requisitos.md`.
  - Actualización de `CHANGELOG.md` y documentación afectada.
  - Checklist de cumplimiento actualizado (`docs/checklist_cumplimiento.md`).
- Cambios críticos (seguridad, infraestructura) requieren aprobación del Responsable de Seguridad y del Líder Técnico.

## 7. Gestión de Librerías y Dependencias
- Mantener `package.json`, `requirements.txt` y `poetry.lock` (si aplica) actualizados.
- Ejecutar auditorías de dependencias trimestralmente (`npm audit`, `pip-audit`) y registrar resultados en `docs/indicadores_calidad.md`.

## 8. Roles y Responsabilidades
- **Líder Técnico:** aprueba baselines y controla merges a `main`.
- **Responsable de Configuración:** custodia este plan, revisa PRs críticos y mantiene inventario de CIs.
- **Desarrolladores:** siguen la política de ramas/commits, actualizan documentación al introducir cambios.
- **Operaciones:** gestiona despliegues y respaldos, asegura integridad de logs.

## 9. Inventario de Elementos de Configuración (CI)
- Código fuente (backend, frontend, microservicios).
- Scripts de despliegue y utilidades (`scripts/`).
- Documentación (`docs/`, manuales, planes, matrices).
- Archivos de configuración runtime (`.env`, `config/*.json`), gestionados fuera del repositorio.
- Logs y bitácoras en `logs/`.

## 10. Auditoría y Mejora
- Revisar este plan cada seis meses junto con el roadmap CMMI (`docs/roadmap_cmmilevel2.md`).
- Auditar cumplimiento de políticas de secretos y backups trimestralmente.
- Registrar acciones correctivas en `docs/checklist_cumplimiento.md` con fecha y responsable.

El cumplimiento de este plan soporta las normas ISO/IEC 12207, ISO/IEC 27001, ISO 9001 e ISO/IEC 29110 al asegurar que la configuración del producto sea controlada y rastreable.


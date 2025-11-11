# Matriz de Trazabilidad de Requisitos – UrbanFlow Platform

| ID | Historia / Issue | Módulo / Endpoint | Métrica de aceptación |
|----|------------------|-------------------|-----------------------|
| RF-01 | Autenticación segura de usuarios administrativos | `POST /api/auth/login`, `middlewares/auth.js` | Inicio de sesión válido responde `200` con cookie httpOnly; intentos inválidos generan `401` y registro en auditoría |
| RF-02 | Forzar cambio de contraseña en primer acceso para roles no admin | `middlewares/auth.js`, `controllers/authController.changePassword` | Usuario con `must_change_password=true` solo accede a `/change-password`; campo se actualiza a `false` tras éxito |
| RF-03 | Gestión de usuarios (alta con contraseña temporal) | `POST /api/users` (userController.createUser) | Usuario creado recibe `temporaryPassword`; auditoría registra evento `CREATE_USER`; roles asignados consistentemente |
| RF-04 | Proceso de logout y limpieza de cookies | `POST /api/auth/logout` | Cookie de sesión eliminada y auditoría registra `LOGOUT`; respuesta `200` |
| RF-05 | Ingestión de telemetría y procesamiento a mediciones | `microservices/analytics/app/main.py`, `services/telemetry_processor_simple.py` | Cada inserción genera registros en `telemetria_cruda` y `mediciones`; latencia < 20 s entre tablas |
| RF-06 | Análisis espectral y vibracional en dashboard | `controllers/dashboardController.js`, `views/src/components/Dashboard.tsx` | Dashboard muestra RMS, picos y espectro sin valores nulos; alertas se generan al exceder umbrales |
| RF-07 | Estado operativo basado en FSM | `microservices/analytics/app/main.py`, `services/telemetry_processor_simple.py` | Secuencia Inicio → Reaceleración → Crucero → Frenado → Parado visible en logs y API `/api/dashboard` |
| RF-08 | Generador sintético con anticolisión y validación física | `microservices/analytics/app/main.py` | Generador se pausa ante colisiones; vibraciones no nulas; sin “teleports” (>200 m) por tick |
| RF-09 | Exposición de métricas recientes para dashboards | `GET /api/data/measurements/recent`, `controllers/dashboardController.js` | Respuesta ordenada DESC, máximo 500 registros, sin duplicados; cabeceras anti-cache activas |
| RF-10 | Gestión de roles y permisos | `routes/roleRoutes.js`, `middlewares/auth.js` | Solo roles autorizados acceden a rutas; intentos indebidos devuelven `403` y quedan registrados |
| RF-11 | Validación de seguridad y auditoría | `middlewares/audit.js`, `logs/auditoria.log`, `models/auditoriaModel.js` | Eventos críticos (login, cambio de contraseña, user CRUD) guardan JSON con actor, IP y timestamp |
| RF-12 | Gestión de configuraciones y secretos | `.env`, `docs/plan_configuracion.md` | Variables críticas documentadas; rotación de `JWT_SECRET` descrita; respaldo de BD documentado |

La matriz se actualiza al cierre de cada sprint junto con `docs/checklist_cumplimiento.md`. Nuevos requisitos deberán enlazarse a historias de usuario o issues en el backlog con su métrica medible asociada.


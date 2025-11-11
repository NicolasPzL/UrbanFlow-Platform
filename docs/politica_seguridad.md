# Política de Seguridad de la Información – UrbanFlow Platform

## 1. Objetivo
Establecer controles mínimos de seguridad para proteger la confidencialidad, integridad y disponibilidad de UrbanFlow Platform conforme a ISO/IEC 27001.

## 2. Alcance
Aplica al backend Node.js/Express, microservicio FastAPI, base de datos PostgreSQL, infraestructura asociada y documentación operacional.

## 3. Principios
- **Menor privilegio:** solo usuarios con rol adecuado acceden a recursos críticos.
- **Confidencialidad de credenciales:** manejo seguro de contraseñas, tokens y archivos `.env`.
- **Trazabilidad:** todos los eventos críticos quedan registrados en logs de auditoría.
- **Disponibilidad:** mantener respaldos y planes de contingencia.

## 4. Control de Acceso
- Autenticación mediante JWT y cookies httpOnly/secure.
- Roles (`admin`, `operador`, `analista`, `cliente`) gobernados por middleware `requireRole`.
- Contraseñas temporales forzadas a cambiarse en primer acceso (usuarios no admin).
- Caducidad y bloqueo: se registran fallos de login y se bloquea temporalmente tras múltiples intentos.

## 5. Gestión de Credenciales y Secretos
- Las claves `JWT_SECRET` y `REFRESH_JWT_SECRET` se rotan según el procedimiento descrito en `docs/plan_configuracion.md`.
- Contraseñas de BD y tokens externos se almacenan únicamente en gestores seguros o `.env` locales cifrados.
- Queda prohibido compartir credenciales por canales no cifrados.

## 6. Clasificación de Información
- **Confidencial:** datos de usuarios, contraseñas, tokens, configuraciones `.env`, respaldos de BD.
- **Interna:** documentación operativa (`docs/`), scripts, reportes de métricas.
- **Pública:** materiales divulgados en presentaciones o sitios oficiales.

## 7. Logging y Auditoría
- Eventos obligatorios: inicio/cierre de sesión, fallos de autenticación, cambios de contraseña, creación/edición/eliminación de usuario, activación/desactivación del generador.
- Los eventos se registran en `logs/auditoria.log` y en `audit_log` (PostgreSQL) con formato JSON, incluyendo IP y actor.
- Los logs se preservan mínimo 90 días y se rotan semanalmente.

## 8. Gestión de Incidentes y Continuidad
- Ante incidentes de seguridad:
  1. Notificar al Responsable de Seguridad y al Líder Técnico.
  2. Aislar el sistema afectado (revocar tokens, pausar generador si aplica).
  3. Investigar usando auditorías y registros.
  4. Documentar el incidente, acciones tomadas y medidas preventivas.
- Plan de continuidad: respaldos diarios de BD, verificación semanal de restauración, documentación en `docs/ops/`.

## 9. Protección de la Plataforma
- Uso de `helmet` y cabeceras reforzadas (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- Rate limiting aplicado a endpoints públicos.
- Sanitización de entradas (`xss`, validadores).
- Separación lógica de microservicio y API con CORS restringido.

## 10. Capacitación y Concienciación
- Todo miembro del equipo debe revisar anualmente esta política y confirmar su entendimiento.
- Nuevos integrantes reciben inducción basada en este documento y en el manual administrativo (`docs/manual_admin.md`).

## 11. Revisión y Mejora Continua
- La política se revisa semestralmente o después de cualquier incidente significativo.
- Las acciones derivadas se registran en `docs/checklist_cumplimiento.md` y se incluyen en el roadmap de madurez (`docs/roadmap_cmmilevel2.md`).

El incumplimiento de esta política puede derivar en suspensión de accesos y medidas disciplinarias. La política forma parte del Sistema de Gestión de Seguridad de la Información para UrbanFlow Platform.


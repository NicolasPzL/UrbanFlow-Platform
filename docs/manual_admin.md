# Manual del Administrador – UrbanFlow Platform

## 1. Acceso al panel administrativo
1. Ingrese a la URL del dashboard (`http://localhost:3000` por defecto).
2. Autentíquese con una cuenta con rol `admin`. Si se le asignó un usuario nuevo, se entregará una contraseña temporal que debe cambiar en el primer inicio.

## 2. Gestión de usuarios
### 2.1 Crear usuario nuevo
1. Abra el módulo de administración y seleccione “Usuarios”.
2. Presione “Crear nuevo usuario” e ingrese nombre y correo.
3. Seleccione roles (por defecto `operador`).  
   - El sistema generará automáticamente una contraseña temporal segura.
   - Esta contraseña se muestra una sola vez en pantalla; entréguela de forma segura al usuario.
4. El evento queda registrado en `logs/auditoria.log` y en la tabla `audit_log` con la acción `CREATE_USER`.

### 2.2 Editar usuario existente
1. Busque el usuario y actualice campos necesarios (nombre, estado, roles).
2. Los cambios en roles se reflejan inmediatamente y se registran como `UPDATE_USER`.

### 2.3 Forzar cambio de contraseña
- Para restablecer la contraseña, utilice “Restablecer contraseña” o `POST /api/auth/forgot-password` con el correo del usuario.  
- Una vez que el usuario se autentique con la contraseña temporal, deberá cambiarla y el sistema marcará `must_change_password = false`.

### 2.4 Bloqueo y eliminación
- Eliminar usuarios realiza un “soft delete”; evite eliminar al último administrador (restricción automática).
- Todos los eventos quedan auditados.

## 3. Parámetros clave de configuración (.env)
> **No almacenar secretos en el control de versiones**. Utilice `.env` local y rotación periódica.

| Variable | Descripción | Observaciones |
|----------|-------------|----------------|
| `PORT` | Puerto de la API principal | Predeterminado 3000 |
| `NODE_ENV` | Entorno (`development` / `production`) | Afecta logging y seguridad |
| `JWT_SECRET` / `REFRESH_JWT_SECRET` | Claves para tokens | Rotar según `docs/plan_configuracion.md` |
| `REFRESH_COOKIE_NAME` | Nombre de cookie refresh | Debe coincidir con configuración de frontend |
| `ANALYTICS_BASE_URL` | URL del microservicio FastAPI | Predeterminado `http://localhost:8001/api` |
| `FRONTEND_URL` | Origen permitido para CORS | Usado en cookies y CORS |
| Variables del generador (`GENERATOR_ENABLED`, `FSM_ENABLED`, etc.) | Controlan inserción sintética de telemetría | Documentadas en `docs/plan_configuracion.md` |

## 4. Auditoría y seguridad
- Los eventos críticos (login, fallos de login, cambio de contraseña, creación/edición de usuario) se registran mediante el middleware de auditoría en `logs/auditoria.log` y en la tabla `audit_log`.
- Revise periódicamente el log para detectar accesos sospechosos.
- Siga la política de seguridad (`docs/politica_seguridad.md`), especialmente en rotación de secretos y gestión de accesos.

## 5. Mantenimiento operativo
- Monitoree el estado del microservicio de analytics (`uvicorn` en puerto 8001).  
- Ejecute respaldos de la base de datos según `docs/plan_configuracion.md`.
- Antes de aplicar actualizaciones, revise el `CHANGELOG.md` y actualice la documentación afectada.

Cualquier cambio en procesos administrativos debe documentarse y comunicarse a los interesados siguiendo el plan de proyecto (`docs/plan_proyecto_uf.md`).


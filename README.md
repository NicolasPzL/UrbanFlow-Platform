# UrbanFlow-Platform
Plataforma digital integral para la gestión, monitoreo y análisis del sistema de metro cable de UrbanFlow Analytics S.A.S.
# Plataforma de Movilidad Inteligente - UrbanFlow 

Este es el monorepo oficial para el desarrollo de la plataforma digital integral de **Urban Flow Analytics S.A.S.**. El objetivo es gestionar, monitorear y analizar eficientemente nuestro sistema de metro cable urbano por cabinas.

Buscamos optimizar la experiencia de viaje, aumentar la eficiencia del servicio y fortalecer la seguridad de los pasajeros mediante el uso estratégico de datos y plataformas tecnológicas innovadoras.

---

##  Estructura del Repositorio

* `/analytics`: Contiene el microservicio en **Python/Flask** para el análisis de vibraciones y la detección predictiva de fallos en las cabinas.
* `/backend`: API principal, gestión de usuarios, rutas, estaciones y lógica de negocio, desarrollada en **Node.js** bajo un patrón MVC.
* `/frontend`: Portal web interactivo para administradores, operadores y ciudadanos, desarrollado también con **Node.js** para la gestión de vistas.

---

##  Funcionalidades Clave

El desarrollo de esta plataforma se centra en los siguientes módulos principales:

* **Gestión de Operaciones:** Módulo para administrar rutas, estaciones y cabinas del sistema de teleférico.
* **Dashboard en Tiempo Real:** Visualización de indicadores de desempeño (KPIs) y la ubicación en tiempo real de las cabinas sobre un mapa, usando un código de colores para su estado operativo (🟢 Normal, 🟡 Inusual, 🔴 Fallo).
* **Analítica Predictiva:** Detección temprana de fallos en cabinas mediante el entrenamiento de modelos de IA con datos de vibraciones recolectados por sensores IoT.
* **Gestión de Usuarios:** Sistema de autenticación segura y gestión de roles para diferenciar el acceso de administradores, operadores y ciudadanos.

---

##  Cómo Empezar (Runbook)

> Este repo expone un backend Node/Express y sirve el frontend (Vite build) desde `views/original/build` en el mismo puerto (3000).

### 1) Requisitos
- Node.js 20+ (recomendado) / 18+ mínimo
- PostgreSQL en local con la DB configurada en `.env`

### 2) Variables de entorno (`.env` en la raíz)
Ejemplo mínimo:
```
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=urbanflow_db
DB_USER=postgres
DB_PASSWORD=tu_password
JWT_SECRET=super_secreto
```

### 3) Instalar dependencias backend
En la raíz del proyecto:

```
npm install
```

### 4) Construir el frontend (Vite) dentro de `views/original/`
El backend sirve automáticamente el build estático desde `/`.

```
npm --prefix "views/original" install
# Tipos de React/TS para evitar errores del IDE/compilación
npm --prefix "views/original" i -D typescript @types/react @types/react-dom @types/node
# Build de producción
npm --prefix "views/original" run build
```

### 5) Levantar el backend

```
npm run dev
# Abre http://localhost:3000
```

### 6) Rutas principales
- Health: `GET /health`
- Público: `GET /api/map/public` (estructura: `{ stations: [], cabins: [], stats: { activeCabins, totalPassengers, avgETA } }`)
- Auth: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- Usuarios (admin): `GET/POST /api/users`, `GET/PUT/DELETE /api/users/:id`
- Roles (admin): `GET/POST /api/roles`, `PUT/DELETE /api/roles/:id`
- Dashboard (admin): `GET /api/dashboard` (puede estar como stub)

### 7) Notas de integración Frontend
- El backend sirve la landing y SPA build desde `/`.
- Si desarrollas el frontend con Vite por separado, usa puerto 5173 y proxy `/api` → `http://localhost:3000`.
- Cookies HTTPOnly: cuando hagas fetch a `/api/*`, usa `credentials: 'include'`.

### 8) Errores comunes y soluciones
- 400 `entity.parse.failed` en GET (body-parser):
  - No envíes `Content-Type: application/json` en GET/DELETE y deja el body vacío.
- `path-to-regexp` error en fallback SPA (Express 5):
  - Ya está resuelto usando regex `app.get(/^(?!\/api\/).*/, ...)`.
- JSX/TS en `views/original/`:
  - Instalar dev-deps: `typescript @types/react @types/react-dom @types/node` y usar el `tsconfig.json` incluido.

### 9) Multi-rol de usuarios (API)
- Crear usuario aceptando uno o varios roles:
```
POST /api/users
{
  "nombre": "Ana Ruiz",
  "correo": "ana@example.com",
  "password": "Usuario123!",
  "rol": ["admin", "operador"]
}
```
- Alternativa: `roles: ["admin", "operador"]`.
- El primer rol se usa como rol primario en `usuarios.rol`; todos se reflejan en `rol_usuario`.

### 10) Seguridad
- Rutas `/api/users` y `/api/roles` requieren `requireAuth` + rol `admin`.
- Para pruebas, loguéate y usa la cookie `access_token` (HTTPOnly). En fetch/axios, setea `credentials: 'include'`.

### 11) Despliegue
- Ejecuta el build del frontend y sirve desde Express tal como está en `app.js`.
- Ajusta `helmet`/CSP si algún asset del build se bloquea.

---

##  Contactos del Proyecto

* **Líder de Analítica:** @tu-usuario-de-github
* **Líder de Backend:** @usuario-lider-backend
* **Líder de Frontend:** @usuario-lider-frontend

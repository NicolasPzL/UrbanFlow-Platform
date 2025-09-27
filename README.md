# UrbanFlow Platform
Plataforma digital integral para la gestión, monitoreo y análisis del sistema de metro cable de NovaCore.

## Conectamos tu ciudad desde las alturas  
**Movilidad Inteligente**

---

## Descripción del Proyecto

Este es el monorepo oficial para el desarrollo de la plataforma digital integral de **NovaCore**. El objetivo es gestionar, monitorear y analizar eficientemente nuestro sistema de metro cable urbano por cabinas.

Buscamos optimizar la experiencia de viaje, aumentar la eficiencia del servicio y fortalecer la seguridad de los pasajeros mediante el uso estratégico de datos y plataformas tecnológicas innovadoras.

---

## Estructura del Repositorio

```
urbanflow-platform/
├── config/           # Archivos de configuración general
├── controllers/      # Lógica de negocio (intermediario entre models y views)
├── data/            # Datos estáticos o archivos temporales
├── db/              # Scripts y configuraciones para conexión a BD
├── docs/            # Documentación técnica y manuales
├── errors/          # Manejo personalizado de errores
├── microservices/   # Microservicios adicionales (Flask para IA)
├── middlewares/     # Funciones intermedias (autenticación, autorización)
├── models/          # Definición de estructuras de datos y esquemas de BD
├── public/          # Archivos estáticos accesibles (CSS, JS, imágenes)
├── routes/          # Definición de rutas de la API y aplicativo web
├── sql/             # Scripts SQL de creación y carga de BD
├── utils/           # Funciones auxiliares reutilizables
├── views/           # Vistas/renderizado de interfaz (plantillas)
├── .gitignore       # Archivos/carpetas a ignorar en Git
├── app.js           # Archivo principal de la aplicación Node.js
├── LICENSE.md       # Licencia del proyecto
├── package.json     # Dependencias y scripts del proyecto
├── README.md        # Este archivo
└── requirements.txt # Dependencias para microservicios Python
```

---

## Funcionalidades Clave

El desarrollo de esta plataforma se centra en los siguientes módulos principales:

### Modulo de Gestion de Usuarios CRUD
- Sistema de autenticación segura con JWT y cookies HTTP-only
- Gestion de roles (Administrador y Usuario)
- Registro, edición y eliminación de usuarios (solo administradores)
- Middlewares de verificación de token y permisos de administrador

### Dashboard de Datos y Analítica
- Visualización en tiempo real e histórica de mediciones IoT
- Parámetros de vibración (RMS, curtosis, skewness, ZCR, valor pico, crest factor)
- Análisis espectral (frecuencias principales, energía por bandas)
- Modelo de IA para predicción de estados (Operativo, Alerta, Fallo)
- Gráficos y tablas dinámicas para exploración de datos

### Geoportal y Visualización en Mapa
- Mapa interactivo con la red completa de transporte por cable aéreo
- Marcadores dinámicos que se mueven en tiempo real según coordenadas GPS
- Codigo de colores para estado de cabinas (Verde: Normal, Amarillo: Alerta, Rojo: Fallo)
- Vista pública accesible sin autenticación
- Funcionalidades adicionales: capas, filtros, vistas históricas

---

## Como Empezar

### Prerrequisitos
- Node.js 16+ 
- Python 3.8+
- PostgreSQL 12+
- Git

### Instalación y Configuración

1. **Clonar el repositorio:**
```bash
git clone https://github.com/novacore/urbanflow-platform.git
cd urbanflow-platform
```

2. **Configurar Backend (Node.js):**
```bash
cd backend
npm install
cp .env.example .env
# Configurar variables de entorno en .env (BD, JWT_SECRET, etc.)
npm run dev
```

3. **Configurar Microservicio de Analítica (Python/Flask):**
```bash
cd analytics
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

4. **Configurar Frontend (Node.js):**
```bash
cd frontend
npm install
npm start
```

### Variables de Entorno Críticas

**Backend (.env):**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urbanflow
DB_USER=usuario
DB_PASS=contraseña
JWT_SECRET=tu_jwt_secret_muy_seguro
FLASK_MS_URL=http://localhost:5000
```

**Analytics (.env):**
```env
DB_URL=postgresql://usuario:contraseña@localhost:5432/urbanflow
MODEL_PATH=./models/predictive_model.pkl
```

---

## Estructura de la Base de Datos

La plataforma utiliza PostgreSQL con las siguientes tablas principales:
- `cabinas`: Información estática de cada cabina
- `sensores`: Sensores IoT asociados a cabinas
- `mediciones`: Datos en tiempo real de sensores (1 registro/segundo)
- `usuarios`: Gestion de usuarios y roles

---

## Desarrollo

### Scripts Disponibles

**Backend:**
```bash
npm run dev          # Desarrollo con hot-reload
npm test             # Ejecutar pruebas unitarias
npm run build        # Compilación para producción
```

**Analytics:**
```bash
python train_model.py    # Entrenar modelo de IA
python test_model.py     # Probar modelo con datos de prueba
```

### Convenciones de Código
- Seguir patrones MVC en backend
- Usar ESLint/Prettier para consistencia de código
- Commits semánticos (feat, fix, docs, style, refactor, test, chore)
- Branching strategy: Git Flow

---

## Cronograma de Desarrollo

El proyecto sigue un cronograma de 12 semanas:
1. **Semanas 1-2:** Arquitectura, prototipo y documentación
2. **Semanas 3-4:** Backend y autenticación
3. **Semanas 5-6:** Frontend inicial y mapa
4. **Semanas 7-8:** Microservicio Flask y KPIs
5. **Semanas 9-10:** Integración completa con IA
6. **Semanas 11-12:** Pruebas, optimización y entrega

---

## Soporte y Documentación

- [Documentación Técnica](./docs/technical.md)
- [Reportar Issues](https://github.com/novacore/urbanflow-platform/issues)
- [Changelog](./docs/CHANGELOG.md)

---

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE.md](LICENSE.md) para más detalles.

---

**NovaCore** - Transformando la movilidad urbana mediante tecnología innovadora.
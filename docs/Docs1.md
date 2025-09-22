# Urban Flow - Documentación Inicial

##  Visión General

**Urban Flow** es una plataforma integral diseñada para la gestión inteligente, monitoreo en tiempo real y análisis predictivo de sistemas de **metrocable por cabinas**. Centralizamos toda la información operativa, facilitando visualización avanzada de datos, analítica procesable e integración de modelos de IA para predecir y prevenir fallos operativos.

---

##  Arquitectura del Proyecto

```console
urban-flow/
├── config/              # Configuración de conexiones y parámetros
├── controllers/         # Lógica de aplicación y reglas de negocio
├── data/                # Archivos de datos estáticos y temporales
├── db/                  # Configuración y conexión a base de datos
├── docs/                # Documentación técnica y manuales
├── middlewares/         # Interceptores y validaciones
├── models/              # Esquemas y modelos de datos
├── public/              # Recursos estáticos (CSS, JS, imágenes)
├── routes/              # Definición de endpoints y rutas
├── sql/                 # Scripts SQL de estructura y datos
├── utils/               # Utilidades y funciones auxiliares
├── views/               # Capa de presentación y plantillas
│
├── .env                 # Variables de entorno y configuraciones sensibles
├── app.js               # Punto de entrada de la aplicación
├── .gitignore          # Exclusiones de control de versiones
├── LICENSE.md          # Licencia de uso
└── README.md           # Guía de inicio rápido
```

---

##  Componentes Principales

### 1. Gestión de Usuarios y Roles
Sistema completo de administración de acceso con:
- **CRUD de usuarios** exclusivo para administradores
- **Autenticación JWT** con cookies seguras (httpOnly, secure)
- **Roles diferenciados**: Administrador (gestión total) y Usuario (consulta y visualización)
- **Auditoría de acceso** y gestión de sesiones

### 2. Dashboard de Analítica en Tiempo Real
Interfaz unificada para monitoreo operativo que incluye:
- **Visualización dinámica** de datos sensoriales GPS, altitud, velocidad
- **Métricas de vibración**: RMS, curtosis, skewness, ZCR, factor de cresta
- **Gráficos interactivos** y tablas con capacidad de filtrado
- **Sistema de alertas** basado en modelos predictivos de IA

### 3. Geoportal Interactivo
Plataforma cartográfica especializada con:
- **Visualización en tiempo real** de la red de metrocable
- **Seguimiento activo** de cabinas mediante coordenadas GPS
- **Codificación por color** según estado: operativo (verde), alerta (amarillo), crítico (rojo)
- **Capacidad de expansión** para capas adicionales y análisis históricos

---

##  Funcionalidades Clave

### Gestión de Accesos (RF1–RF10)
- Registro y administración segura de usuarios
- Control de permisos basado en roles
- Autenticación robusta con JWT
- Interfaces diferenciadas por nivel de acceso

### Dashboard Analítico (RF11–RF18)
- Monitoreo en tiempo real de sensores IoT
- Visualización de métricas técnicas y operativas
- Herramientas de análisis histórico y comparativo
- Integración con modelos predictivos de IA

### Geoportal (RF19–RF24)
- Mapa interactivo con ubicación en tiempo real
- Sistema de visualización por estados operativos
- Herramientas de consulta y análisis espacial
- Soporte para visualización de tendencias históricas

---

##  Stack Tecnológico

### Arquitectura Principal
- **Backend**: Node.js con arquitectura MVC
- **Frontend**: Renderizado server-side con motor de plantillas
- **Microservicio IA**: Python con Flask para modelos predictivos
- **Base de datos**: PostgreSQL para gestión transaccional
- **Autenticación**: JWT con cookies seguras

### Características Técnicas
- **Interfaz minimalista** y centrada en la usabilidad
- **Diseño accesible** y responsive
- **API RESTful** para integraciones futuras
- **Comunicación en tiempo real** para actualizaciones instantáneas

---

##  Esquema de Base de Datos

### Entidades Principales
- **usuarios**: Gestión de identidades y acceso al sistema
- **cabinas**: Inventario y estado actual de las cabinas
- **sensores**: Configuración y metadata de dispositivos IoT
- **mediciones**: Datos transaccionales de lecturas sensoriales

### Estructura SQL (PostgreSQL)

```sql
-- PASO 1: Creación de Tipos de Datos Personalizados (ENUMS)
-- Se crea un tipo ENUM para la columna 'rol' en la tabla 'usuarios'.
-- Esto garantiza que solo los valores 'administrador' y 'usuario' sean aceptados,
-- mejorando la integridad de los datos.

CREATE TYPE tipo_rol AS ENUM ('administrador', 'usuario');

-- =============================================================================

-- PASO 2: Creación de las Tablas

-- Tabla: usuarios
-- Propósito: Almacena la información de los usuarios registrados en la plataforma.
-- Su función es gestionar el acceso (autenticación y autorización).
CREATE TABLE usuarios (
    usuario_id SERIAL PRIMARY KEY, -- ID único autoincremental para cada usuario.
    nombre VARCHAR(100) NOT NULL, -- Nombre del usuario.
    correo VARCHAR(100) UNIQUE NOT NULL, -- Correo electrónico para el login (debe ser único).
    contrasena VARCHAR(255) NOT NULL, -- Se almacena el hash de la contraseña, no el texto plano.
    rol tipo_rol DEFAULT 'usuario' NOT NULL, -- Rol del usuario, con 'usuario' como valor por defecto.
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Fecha y hora de registro.
);

-- Tabla: cabinas
-- Propósito: Tabla maestra que funciona como inventario de todas las cabinas del sistema.
CREATE TABLE cabinas (
    cabina_id INT PRIMARY KEY, -- ID único de la cabina, proveído por el sistema.
    codigo_interno VARCHAR(20) UNIQUE NOT NULL, -- Código de operación único.
    fecha_fabricacion DATE, -- Fecha de fabricación de la cabina.
    estado_actual VARCHAR(20) NOT NULL CHECK (estado_actual IN ('operativo', 'inusual', 'alerta', 'fuera de servicio')) -- Estado actual de la cabina.
);

-- Tabla: sensores
-- Propósito: Almacena la información de cada sensor IoT y lo asocia a una única cabina.
CREATE TABLE sensores (
    sensor_id INT PRIMARY KEY, -- ID único del sensor.
    cabina_id INT UNIQUE NOT NULL, -- Llave foránea a 'cabinas'. Se usa UNIQUE para forzar la relación 1 a 1.
    modelo VARCHAR(50), -- Modelo del sensor.
    version_firmware VARCHAR(20), -- Versión del firmware instalado en el sensor.
    fecha_instalacion DATE, -- Fecha en que el sensor fue instalado en la cabina.
    CONSTRAINT fk_cabina
        FOREIGN KEY(cabina_id) 
        REFERENCES cabinas(cabina_id)
        ON DELETE CASCADE -- Si se elimina una cabina, su sensor asociado también se elimina.
);

-- Tabla: mediciones
-- Propósito: Tabla transaccional que almacena cada lectura de datos enviada por los sensores.
-- Se espera que esta tabla crezca masivamente.
CREATE TABLE mediciones (
    medicion_id BIGSERIAL PRIMARY KEY, -- ID único auto incremental (BIGSERIAL para soportar un gran volumen de datos).
    sensor_id INT NOT NULL, -- Llave foránea que indica qué sensor envió la medición.
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, -- Fecha y hora exacta de la medición.
    latitud DECIMAL(9,6),
    longitud DECIMAL(9,6),
    altitud DECIMAL(8,2),
    velocidad DECIMAL(5,2),
    rms DECIMAL(8,4),
    kurtosis DECIMAL(8,4),
    skewness DECIMAL(8,4),
    zcr DECIMAL(8,4),
    pico DECIMAL(8,4),
    crest_factor DECIMAL(8,4),
    frecuencia_media DECIMAL(8,4),
    frecuencia_dominante DECIMAL(8,4),
    amplitud_max_espectral DECIMAL(8,4),
    energia_banda_1 DECIMAL(8,4),
    energia_banda_2 DECIMAL(8,4),
    energia_banda_3 DECIMAL(8,4),
    estado_procesado VARCHAR(20) CHECK (estado_procesado IN ('operativo', 'inusual', 'alerta')), -- Estado resultante del análisis de IA.
    CONSTRAINT fk_sensor
        FOREIGN KEY(sensor_id) 
        REFERENCES sensores(sensor_id)
        ON DELETE CASCADE -- Si se elimina un sensor, todo su historial de mediciones se borra.
);

```

---

##  Cronograma de Implementación

### Semanas 1-2: Fundación
- Definición arquitectónica completa
- Prototipado de interfaces en Figma
- Implementación de esquema de base de datos
- Setup inicial del proyecto y documentación

### Semanas 3-4: Núcleo del Backend
- Desarrollo de API REST con Node.js
- Implementación de módulo CRUD de usuarios
- Sistema de autenticación JWT seguro
- Middlewares de validación y seguridad

### Semanas 5-6: Frontend Base
- Sistema de login y gestión de sesiones
- Dashboard con visualizaciones básicas
- Geoportal con mapa base y visualización inicial
- Interfaces responsivas y accesibles

### Semanas 7-8: Integración IA
- Desarrollo de microservicio Flask
- Implementación de KPIs y métricas iniciales
- Modelos predictivos básicos para detección de anomalías
- API de comunicación entre servicios

### Semanas 9-10: Integración Completa
- Conexión Node ↔ Flask ↔ Frontend
- Visualización de predicciones en tiempo real
- Sistema de alertas y notificaciones
- Optimización de rendimiento

### Semana 11: Calidad y Seguridad
- Pruebas unitarias y de integración
- Auditoría de seguridad y optimización
- Pruebas de carga y rendimiento
- Aseguramiento de la calidad del código

### Semana 12: Entrega Final
- Demo completo del sistema
- Documentación técnica exhaustiva
- Manual de usuario y operación
- Plan de despliegue y mantenimiento

---

##  Equipo Urban Flow

**Urban Flow Analytics S.A.S.**
*Innovación en movilidad urbana sostenible*

Somos especialistas en sistemas de transporte por cable, comprometidos con:
-  Mejora continua de la movilidad urbana
-  Implementación de soluciones basadas en datos
-  Innovación tecnológica para la seguridad operativa
-  Desarrollo sostenible de infraestructuras urbanas

**Misión**: Transformar el transporte urbano mediante tecnología inteligente que prioriza la seguridad, eficiencia y experiencia del usuario.

**Compromiso**: Entregar soluciones robustas y escalables que establezcan nuevos estándares en la gestión de sistemas de metrocable.
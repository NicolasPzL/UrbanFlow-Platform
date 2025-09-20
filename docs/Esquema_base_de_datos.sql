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
    medicion_id BIGSERIAL PRIMARY KEY, -- ID único autoincremental (BIGSERIAL para soportar un gran volumen de datos).
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

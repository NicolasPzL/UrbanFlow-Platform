// Configuración de la base de datos PostgreSQL
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

// Cargar variables de entorno por si este módulo se importa antes que app.js
dotenv.config();

// Validar que las variables de entorno requeridas estén definidas
if (!process.env.DB_NAME) {
  throw new Error('DB_NAME debe estar definido en el archivo .env');
}
if (!process.env.DB_USER) {
  throw new Error('DB_USER debe estar definido en el archivo .env');
}
if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD debe estar definido en el archivo .env');
}
if (!process.env.DB_HOST) {
  throw new Error('DB_HOST debe estar definido en el archivo .env');
}

// Configuración de la conexión a la base de datos
// Todas las credenciales deben venir del archivo .env por seguridad
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  // Configuraciones adicionales para producción
  max: 20, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 5000, // tiempo máximo para obtener una conexión (aumentado)
  // Configuraciones adicionales para debugging
  ssl: process.env.DB_SSL === 'true' || false, // Usar variable de entorno o false por defecto
});

// Log seguro para verificar que .env se está leyendo correctamente
// Nota: Nunca loguear la contraseña
console.log('[DB] Conectando a PostgreSQL con:', {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
});

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de conexiones:', err);
  process.exit(-1);
});

export default pool;

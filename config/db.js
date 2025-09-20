// Configuración de la base de datos PostgreSQL
import pkg from 'pg';
const { Pool } = pkg;

// Configuración de la conexión a la base de datos
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'urbanflow',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  // Configuraciones adicionales para producción
  max: 20, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 2000, // tiempo máximo para obtener una conexión
});

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de conexiones:', err);
  process.exit(-1);
});

export default pool;

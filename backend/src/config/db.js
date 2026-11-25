import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(client => {
    console.log('✅ Conectado a PostgreSQL (Neon)');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar a PostgreSQL:', err.message);
    process.exit(1);
  });

pool.on('error', (err) => {
  console.error('Error inesperado en el pool:', err);
  process.exit(-1);
});

export default pool;

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 20, // Maksimal koneksi aktif per cluster instance
  idleTimeoutMillis: 30000, // Menutup koneksi yang tidak terpakai setelah 30 detik
  connectionTimeoutMillis: 2000, // Gagal cepat jika DB terlalu sibuk (2 detik)
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = pool;
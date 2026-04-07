const pool = require('./config/database');

async function migrate() {
  try {
    await pool.query('ALTER TABLE absensi ADD COLUMN IF NOT EXISTS lokasi_masuk TEXT, ADD COLUMN IF NOT EXISTS lokasi_keluar TEXT;');
    console.log('Migration successful');
  } catch (error) {
    console.error('Migration failed', error);
  } finally {
    pool.end();
  }
}
migrate();

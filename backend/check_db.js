const pool = require('./config/database');

async function check() {
  try {
    const jabatan = await pool.query('SELECT * FROM jabatan');
    console.log('--- TABLE JABATAN ---');
    console.table(jabatan.rows);

    const usersJabatan = await pool.query('SELECT DISTINCT jabatan FROM users');
    console.log('--- UNIQUE JABATAN IN USERS ---');
    console.table(usersJabatan.rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();

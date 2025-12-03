const pool = require('../config/database');

class Attendance {
  // CREATE struktur
  static async create(attendanceData) {
    const { 
      user_id, tanggal_absen, waktu_masuk, foto_masuk, status,
      user_latitude, user_longitude, distance_meter,
      unit_kerja_id, shift_id, jam_seharusnya_masuk, jam_seharusnya_keluar
    } = attendanceData;
    
    const query = `
      INSERT INTO absensi (
        user_id, tanggal_absen, waktu_masuk, foto_masuk, status,
        user_latitude, user_longitude, distance_meter,
        unit_kerja_id, shift_id, jam_seharusnya_masuk, jam_seharusnya_keluar
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      user_id, tanggal_absen, waktu_masuk, foto_masuk, status,
      user_latitude, user_longitude, distance_meter,
      unit_kerja_id, shift_id, jam_seharusnya_masuk, jam_seharusnya_keluar
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // UPDATE CHECKOUT struktur
  static async updateCheckOut(id, waktu_keluar, foto_keluar) {
    const query = `
      UPDATE absensi 
      SET waktu_keluar = $1, foto_keluar = $2 
      WHERE id = $3 
      RETURNING *
    `;
    
    const values = [waktu_keluar, foto_keluar, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // FIND BY USER AND DATE 
  static async findByUserAndDate(user_id, tanggal_absen) {
    const query = 'SELECT * FROM absensi WHERE user_id = $1 AND tanggal_absen = $2';
    const result = await pool.query(query, [user_id, tanggal_absen]);
    return result.rows[0];
  }

  // GET USER ATTENDANCE
  static async getUserAttendance(user_id, startDate, endDate) {
    const query = `
      SELECT 
        a.*, 
        uk.nama_unit AS location,
        s.nama_shift,
        s.jam_masuk as jam_masuk_shift,
        s.jam_keluar as jam_keluar_shift,
        s.toleransi_telat_minutes
      FROM absensi a
      JOIN unit_kerja uk ON a.unit_kerja_id = uk.id
      JOIN shifts s ON a.shift_id = s.id
      WHERE a.user_id = $1 AND a.tanggal_absen BETWEEN $2 AND $3 
      ORDER BY a.tanggal_absen DESC
    `;
    const result = await pool.query(query, [user_id, startDate, endDate]);
    return result.rows;
  }

// GET ALL ATTENDANCE - DENGAN TIMEZONE JAKARTA
  static async getAllAttendance(startDate, endDate) {
    console.log('📅 Executing getAllAttendance with:', { startDate, endDate });
    
    const queryStartDate = startDate || new Date().toISOString().split('T')[0];
    const queryEndDate = endDate || new Date().toISOString().split('T')[0];
    
    console.log('📊 Final query dates:', queryStartDate, queryEndDate);
    
    const query = `
      SELECT 
        a.*, 
        u.nama, u.nik, u.jabatan, u.departemen, u.divisi,
        uk.nama_unit,
        s.nama_shift
      FROM absensi a 
      LEFT JOIN users u ON a.user_id = u.id 
      LEFT JOIN unit_kerja uk ON a.unit_kerja_id = uk.id
      LEFT JOIN shifts s ON a.shift_id = s.id
      WHERE a.tanggal_absen BETWEEN $1 AND $2 
      ORDER BY a.tanggal_absen DESC, a.waktu_masuk DESC
    `;
    
    console.log('🔍 Executing SQL query...');
    
    try {
      const result = await pool.query(query, [queryStartDate, queryEndDate]);
      console.log('✅ Query successful, row count:', result.rows.length);
      
      // Log sample data untuk debugging waktu
      if (result.rows.length > 0) {
        console.log('🕒 Sample time data (first 3 records):');
        result.rows.slice(0, 3).forEach((row, index) => {
          console.log(`Record ${index + 1}:`, {
            nama: row.nama,
            waktu_masuk: row.waktu_masuk,
            waktu_keluar: row.waktu_keluar,
            tanggal_absen: row.tanggal_absen
          });
        });
      }
      
      return result.rows;
    } catch (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }
  }

  // GET TODAY ATTENDANCE
  static async getTodayAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const query = `
      SELECT 
        a.*, 
        u.nama, u.nik, u.jabatan, u.departemen, u.divisi,
        uk.nama_unit,
        s.nama_shift
      FROM absensi a 
      JOIN users u ON a.user_id = u.id 
      JOIN unit_kerja uk ON a.unit_kerja_id = uk.id
      JOIN shifts s ON a.shift_id = s.id
      WHERE a.tanggal_absen = $1 
      ORDER BY a.waktu_masuk DESC
    `;
    const result = await pool.query(query, [today]);
    return result.rows;
  }
}

module.exports = Attendance;
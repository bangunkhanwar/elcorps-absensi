const pool = require('../config/database');

class Attendance {
  // CREATE struktur
  // CREATE struktur sesuai skema asli database
  static async create(attendanceData) {
    const { 
      user_id, tanggal_absen, waktu_masuk, foto_masuk, status, location
    } = attendanceData;
    
    const query = `
      INSERT INTO absensi (
        user_id, tanggal_absen, waktu_masuk, foto_masuk, status, location
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      user_id, tanggal_absen, waktu_masuk, foto_masuk, status, location
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
        uk.nama_unit AS location_name,
        s.nama_shift,
        s.jam_masuk as jam_masuk_shift,
        s.jam_keluar as jam_keluar_shift
      FROM absensi a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      WHERE a.user_id = $1 AND a.tanggal_absen BETWEEN $2 AND $3 
      ORDER BY a.tanggal_absen DESC, a.waktu_masuk DESC   -- Tambah sort waktu
    `;
    
    // Tambahkan log untuk debug
    // console.log("Executing History Query:", {user_id, startDate, endDate});
    
    const result = await pool.query(query, [user_id, startDate, endDate]);
    return result.rows;
  }

  // GET ALL ATTENDANCE
  static async getAllAttendance(startDate, endDate, unitId = null) {
    const queryStartDate = startDate || new Date().toISOString().split('T')[0];
    const queryEndDate = endDate || new Date().toISOString().split('T')[0];
    
    let query = `
      SELECT 
        a.*, 
        u.nama, 
        u.nik, 
        u.jabatan, 
        uk.nama_unit,
        s.nama_shift
      FROM absensi a 
      JOIN users u ON a.user_id = u.id 
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      WHERE a.tanggal_absen BETWEEN $1 AND $2
    `;
    
    const params = [queryStartDate, queryEndDate];
    if (unitId) {
      query += ` AND u.unit_kerja_id = $${params.length + 1}`;
      params.push(unitId);
    }
    
    query += ` ORDER BY a.tanggal_absen DESC, a.waktu_masuk DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  }

  // GET TODAY ATTENDANCE
  static async getTodayAttendance(unitId = null) {
    const today = new Date().toISOString().split('T')[0];
    let query = `
      SELECT 
        a.*, 
        u.nama, 
        uk.nama_unit
      FROM absensi a 
      JOIN users u ON a.user_id = u.id 
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      WHERE a.tanggal_absen = $1
    `;
    const params = [today];
    if (unitId) {
      query += ` AND u.unit_kerja_id = $${params.length + 1}`;
      params.push(unitId);
    }
    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = Attendance;

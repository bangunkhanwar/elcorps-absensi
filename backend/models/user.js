const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const {
      nama, nik, email, password, jabatan, departemen, divisi, 
      foto_profile, role, unit_kerja_id, shift_id
    } = userData;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (nama, nik, email, password, jabatan, departemen, divisi, 
                        foto_profile, role, unit_kerja_id, shift_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      nama, nik, email, hashedPassword, jabatan, departemen, divisi,
      foto_profile, role, unit_kerja_id, shift_id
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getAll() {
    const query = `
      SELECT 
        u.*,
        uk.nama_unit,
        s.nama_shift
      FROM users u
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      ORDER BY u.nama
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateProfile(id, updateData) {
    const { nama, jabatan, departemen, divisi, foto_profile } = updateData;
    const query = `
      UPDATE users 
      SET nama = $1, jabatan = $2, departemen = $3, divisi = $4, foto_profile = $5
      WHERE id = $6
      RETURNING *
    `;
    const values = [nama, jabatan, departemen, divisi, foto_profile, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateUser(id, updateData) {
    const { nama, nik, email, password, jabatan, departemen, divisi, unit_kerja_id, shift_id, role } = updateData;
    
    let query = '';
    let values = [];
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `
        UPDATE users 
        SET nama = $1, nik = $2, email = $3, password = $4, jabatan = $5, 
            departemen = $6, divisi = $7, unit_kerja_id = $8, shift_id = $9, role = $10
        WHERE id = $11
        RETURNING *
      `;
      values = [nama, nik, email, hashedPassword, jabatan, departemen, divisi, unit_kerja_id, shift_id, role, id];
    } else {
      query = `
        UPDATE users 
        SET nama = $1, nik = $2, email = $3, jabatan = $4, 
            departemen = $5, divisi = $6, unit_kerja_id = $7, shift_id = $8, role = $9
        WHERE id = $10
        RETURNING *
      `;
      values = [nama, nik, email, jabatan, departemen, divisi, unit_kerja_id, shift_id, role, id];
    }
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM absensi WHERE user_id = $1', [id]);
      await client.query('DELETE FROM izin WHERE user_id = $1', [id]);
      const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
      await client.query('COMMIT');
      
      if (result.rowCount === 0) {
        throw new Error('User tidak ditemukan');
      }
      
      return { message: 'User berhasil dihapus' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByIdWithUnitAndShift(id) {
    const query = `
      SELECT 
        u.*, 
        uk.nama_unit, uk.latitude, uk.longitude, uk.radius_meter,
        s.nama_shift, s.jam_masuk, s.jam_keluar, s.toleransi_telat_minutes
      FROM users u
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (!result.rows[0]) {
      throw new Error('User tidak ditemukan');
    }
    
    const user = result.rows[0];
    
    console.log('📍 DETAILED User data:', {
      id: user.id,
      nama: user.nama,
      unit_kerja_id: user.unit_kerja_id,
      unit_kerja: user.nama_unit,
      latitude: user.latitude,
      longitude: user.longitude,
      radius: user.radius_meter,
      shift_id: user.shift_id,
      shift: user.nama_shift,
      jam_masuk: user.jam_masuk,
      jam_keluar: user.jam_keluar,
      toleransi: user.toleransi_telat_minutes
    });
    
    return user;
  }

  static async getAllUnitKerja() {
    const query = 'SELECT * FROM unit_kerja WHERE is_active = true ORDER BY nama_unit';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getShiftsByUnit(unit_kerja_id) {
    const query = 'SELECT * FROM shifts WHERE unit_kerja_id = $1 AND is_active = true ORDER BY jam_masuk';
    const result = await pool.query(query, [unit_kerja_id]);
    return result.rows;
  }

  // NEW METHODS FOR SHIFT MANAGEMENT

  // Mengambil user berdasarkan unit_kerja_id
  static async getByUnit(unitId) {
    try {
      const query = `
        SELECT u.id, u.nama, u.nik, u.email, u.jabatan, u.departemen, u.divisi, 
               u.unit_kerja_id, u.shift_id, s.nama_shift, s.jam_masuk, s.jam_keluar,
               uk.nama_unit
        FROM users u
        LEFT JOIN shifts s ON u.shift_id = s.id
        LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
        WHERE u.unit_kerja_id = $1
        ORDER BY u.nama
      `;
      const result = await pool.query(query, [unitId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Mengambil unit_kerja berdasarkan nama
  static async getUnitKerjaByNama(nama) {
    try {
      const query = 'SELECT * FROM unit_kerja WHERE nama_unit = $1 AND is_active = true';
      const result = await pool.query(query, [nama]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update shift karyawan
  static async updateShift(userId, shiftId) {
    try {
      const query = `
        UPDATE users 
        SET shift_id = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING *
      `;
      const result = await pool.query(query, [shiftId, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get default shift for a unit
  static async getDefaultShift(unitId) {
    try {
      const query = `
        SELECT * FROM shifts 
        WHERE unit_kerja_id = $1 AND is_default = true AND is_active = true
        LIMIT 1
      `;
      const result = await pool.query(query, [unitId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get store stats for leader_store
  static async getStoreStats(unitId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get total employees in the unit
      const totalQuery = `
        SELECT COUNT(*) as total 
        FROM users 
        WHERE unit_kerja_id = $1 AND role != 'hr'
      `;
      const totalResult = await pool.query(totalQuery, [unitId]);
      const totalEmployees = parseInt(totalResult.rows[0].total);

      // Get today's attendance for the unit
      const attendanceQuery = `
        SELECT a.*, u.nama 
        FROM absensi a
        JOIN users u ON a.user_id = u.id
        WHERE a.unit_kerja_id = $1 AND a.tanggal_absen = $2
      `;
      const attendanceResult = await pool.query(attendanceQuery, [unitId, today]);
      const todayData = attendanceResult.rows;

      const presentToday = todayData.length || 0;
      
      const lateToday = todayData.filter(item => {
        if (!item.waktu_masuk) return false;
        const waktuMasuk = new Date(`1970-01-01T${item.waktu_masuk}`);
        return waktuMasuk > new Date('1970-01-01T08:00:00');
      }).length;

      const onTimeCount = todayData.filter(item => {
        if (!item.waktu_masuk) return false;
        const waktuMasuk = new Date(`1970-01-01T${item.waktu_masuk}`);
        return waktuMasuk <= new Date('1970-01-01T08:00:00');
      }).length;

      const onTimePercentage = presentToday > 0 ? Math.round((onTimeCount / presentToday) * 100) : 0;

      return {
        totalEmployees,
        presentToday,
        lateToday,
        absentToday: totalEmployees - presentToday,
        onTimePercentage
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
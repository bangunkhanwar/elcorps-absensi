const pool = require('../config/database');

class Leave {
  static async create(leaveData) {
    const { user_id, start_date, end_date, jenis_izin, lampiran } = leaveData;
    const keterangan = leaveData.keterangan || '';

    const query = `
      INSERT INTO izin (user_id, start_date, end_date, jenis_izin, keterangan, lampiran, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `;
    
    const values = [user_id, start_date, end_date, jenis_izin, keterangan, lampiran || null];
    
    console.log('Executing query:', query);
    console.log('With values:', values);
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getUserLeaves(user_id) {
    const query = `
      SELECT 
        i.*, 
        u.nama, 
        u.nik, 
        u.jabatan, 
        u.departemen, 
        u.divisi,
        uk.nama_unit as unit_kerja
      FROM izin i 
      JOIN users u ON i.user_id = u.id 
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      WHERE i.user_id = $1 
      ORDER BY i.start_date DESC
    `;
    const result = await pool.query(query, [user_id]);
    return result.rows;
  }

  static async getAllLeaves() {
    const query = `
      SELECT 
        i.*, 
        u.nama, 
        u.nik, 
        u.jabatan, 
        u.departemen, 
        u.divisi,
        uk.nama_unit as unit_kerja
      FROM izin i 
      JOIN users u ON i.user_id = u.id 
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      ORDER BY i.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getPendingLeaves() {
    const query = `
      SELECT 
        i.*, 
        u.nama, 
        u.nik, 
        u.jabatan, 
        u.departemen, 
        u.divisi,
        uk.nama_unit as unit_kerja
      FROM izin i 
      JOIN users u ON i.user_id = u.id 
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      WHERE i.status = 'pending'
      ORDER BY i.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE izin 
      SET status = $1 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }
}

module.exports = Leave;
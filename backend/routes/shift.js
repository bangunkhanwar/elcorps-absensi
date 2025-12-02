const express = require('express');
const router = express.Router();
const pool = require('../config/database'); // Gunakan pool langsung
const { auth } = require('../middleware/auth');

// Get all shifts for a unit
router.get('/unit/:unitId', auth, async (req, res) => {
  try {
    const query = `
      SELECT * FROM shifts 
      WHERE unit_kerja_id = $1 AND is_active = true 
      ORDER BY jam_masuk ASC
    `;
    const result = await pool.query(query, [req.params.unitId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all shifts
router.get('/', auth, async (req, res) => {
  try {
    const query = `
      SELECT s.*, uk.nama_unit
      FROM shifts s
      LEFT JOIN unit_kerja uk ON s.unit_kerja_id = uk.id
      ORDER BY s.unit_kerja_id ASC, s.jam_masuk ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new shift
// Create new shift
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Hanya HR yang bisa membuat shift
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat membuat shift' });
    }

    const { unit_kerja_id, kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default } = req.body;

    console.log('➕ Create shift request:', {
      unit_kerja_id,
      kode_shift,
      nama_shift,
      jam_masuk,
      jam_keluar,
      toleransi_telat_minutes,
      is_default
    });

    // Validasi input required
    if (!unit_kerja_id || !kode_shift || !nama_shift || !jam_masuk || !jam_keluar) {
      return res.status(400).json({ 
        error: 'Data tidak lengkap. Harap isi: unit kerja, kode shift, nama shift, jam masuk, jam keluar' 
      });
    }

    // Cek apakah kode shift sudah ada di unit kerja ini
    const duplicateCheck = await client.query(
      'SELECT id FROM shifts WHERE unit_kerja_id = $1 AND kode_shift = $2 AND is_active = true',
      [unit_kerja_id, kode_shift]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: `Kode shift "${kode_shift}" sudah digunakan di unit kerja ini. Gunakan kode shift lain.` 
      });
    }

    // Jika shift ini dijadikan default, set semua shift lain di unit ini menjadi tidak default
    if (is_default) {
      await client.query(
        'UPDATE shifts SET is_default = false WHERE unit_kerja_id = $1',
        [unit_kerja_id]
      );
    }

    const query = `
      INSERT INTO shifts (unit_kerja_id, kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, 5), COALESCE($7, false))
      RETURNING *
    `;
    const values = [
      unit_kerja_id, 
      kode_shift, 
      nama_shift, 
      jam_masuk, 
      jam_keluar, 
      toleransi_telat_minutes, // biarkan undefined, gunakan COALESCE
      is_default               // biarkan undefined, gunakan COALESCE
    ];
    
    console.log('📝 Executing INSERT query with values:', values);
    
    const result = await client.query(query, values);
    
    await client.query('COMMIT');
    
    console.log('✅ Shift created successfully:', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Create shift error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Handle duplicate key error secara spesifik
    if (error.code === '23505') { // PostgreSQL unique violation error code
      return res.status(400).json({ 
        error: 'Kode shift sudah digunakan di unit kerja ini. Silakan gunakan kode shift yang berbeda.' 
      });
    }
    
    // Handle foreign key violation
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: 'Unit kerja tidak valid. Pastikan unit kerja yang dipilih benar.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Terjadi kesalahan saat membuat shift',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// Update shift
router.put('/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Hanya HR yang bisa update shift
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengupdate shift' });
    }

    const { kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default } = req.body;

    // Dapatkan unit_kerja_id dan kode_shift lama dari shift yang akan diupdate
    const shiftQuery = await client.query(
      'SELECT unit_kerja_id, kode_shift as old_kode_shift FROM shifts WHERE id = $1',
      [req.params.id]
    );
    
    if (shiftQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Shift tidak ditemukan' });
    }
    
    const unit_kerja_id = shiftQuery.rows[0].unit_kerja_id;
    const old_kode_shift = shiftQuery.rows[0].old_kode_shift;

    // Cek jika kode_shift berubah dan sudah ada di unit kerja yang sama
    if (kode_shift && kode_shift !== old_kode_shift) {
      const duplicateCheck = await client.query(
        'SELECT id FROM shifts WHERE unit_kerja_id = $1 AND kode_shift = $2 AND is_active = true AND id != $3',
        [unit_kerja_id, kode_shift, req.params.id]
      );
      
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ 
          error: `Kode shift "${kode_shift}" sudah digunakan di unit kerja ini. Gunakan kode shift lain.` 
        });
      }
    }

    // Jika shift ini dijadikan default, set semua shift lain di unit ini menjadi tidak default
    if (is_default) {
      await client.query(
        'UPDATE shifts SET is_default = false WHERE unit_kerja_id = $1 AND id != $2',
        [unit_kerja_id, req.params.id]
      );
    }

    const query = `
      UPDATE shifts 
      SET kode_shift = $1, nama_shift = $2, jam_masuk = $3, jam_keluar = $4, 
          toleransi_telat_minutes = COALESCE($5, 5), is_default = COALESCE($6, false)
      WHERE id = $7
      RETURNING *
    `;
    const values = [
      kode_shift || old_kode_shift,  // Gunakan kode_shift baru atau tetap kode_shift lama
      nama_shift, 
      jam_masuk, 
      jam_keluar, 
      toleransi_telat_minutes,
      is_default,
      req.params.id
    ];
    
    const result = await client.query(query, values);
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Shift berhasil diperbarui', 
      shift: result.rows[0] 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Update shift error:', error);
    
    // Handle duplicate key error secara spesifik
    if (error.code === '23505') { // PostgreSQL unique violation error code
      return res.status(400).json({ 
        error: 'Kode shift sudah digunakan di unit kerja ini. Silakan gunakan kode shift yang berbeda.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Terjadi kesalahan saat memperbarui shift',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// Delete shift (soft delete by setting is_active to false)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Hanya HR yang bisa delete shift
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat menghapus shift' });
    }

    const query = 'UPDATE shifts SET is_active = false WHERE id = $1';
    await pool.query(query, [req.params.id]);
    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
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
router.post('/', auth, async (req, res) => {
  try {
    // Hanya HR yang bisa membuat shift
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat membuat shift' });
    }

    const { unit_kerja_id, kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default } = req.body;
    const query = `
      INSERT INTO shifts (unit_kerja_id, kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [unit_kerja_id, kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default || false];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update shift
router.put('/:id', auth, async (req, res) => {
  try {
    // Hanya HR yang bisa update shift
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengupdate shift' });
    }

    const { kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default } = req.body;
    const query = `
      UPDATE shifts 
      SET kode_shift = $1, nama_shift = $2, jam_masuk = $3, jam_keluar = $4, toleransi_telat_minutes = $5, is_default = $6
      WHERE id = $7
      RETURNING *
    `;
    const values = [kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default, req.params.id];
    const result = await pool.query(query, values);
    res.json({ message: 'Shift updated successfully', shift: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
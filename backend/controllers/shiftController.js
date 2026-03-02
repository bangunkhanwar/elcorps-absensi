const pool = require('../config/database');
const { createShiftSchema, updateShiftSchema } = require('../validations/shiftSchema');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Get all shifts for a unit
// @route   GET /api/shifts/unit/:unitId
const getShiftsByUnit = async (req, res) => {
  try {
    const query = `
      SELECT * FROM shifts 
      WHERE unit_kerja_id = $1 AND is_active = true 
      ORDER BY jam_masuk ASC
    `;
    const result = await pool.query(query, [req.params.unitId]);
    return sendSuccess(res, 'Data shift berhasil diambil', result.rows);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Get all shifts with unit info
// @route   GET /api/shifts
const getAllShifts = async (req, res) => {
  try {
    const query = `
      SELECT s.*, uk.nama_unit
      FROM shifts s
      LEFT JOIN unit_kerja uk ON s.unit_kerja_id = uk.id
      ORDER BY s.unit_kerja_id ASC, s.jam_masuk ASC
    `;
    const result = await pool.query(query);
    return sendSuccess(res, 'Data semua shift berhasil diambil', result.rows);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Create new shift (HR only)
// @route   POST /api/shifts
const createShift = async (req, res) => {
  const client = await pool.connect();
  try {
    const validation = createShiftSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Data tidak valid', 400, validation.error.format());
    }

    const { unit_kerja_id, kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default } = validation.data;

    await client.query('BEGIN');

    // Duplicate check
    const duplicateCheck = await client.query(
      'SELECT id FROM shifts WHERE unit_kerja_id = $1 AND kode_shift = $2 AND is_active = true',
      [unit_kerja_id, kode_shift]
    );
    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, `Kode shift "${kode_shift}" sudah digunakan di unit kerja ini.`, 400);
    }

    if (is_default) {
      await client.query('UPDATE shifts SET is_default = false WHERE unit_kerja_id = $1', [unit_kerja_id]);
    }

    const query = `
      INSERT INTO shifts (unit_kerja_id, kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await client.query(query, [unit_kerja_id, kode_shift, nama_shift, jam_masuk, jam_keluar, toleransi_telat_minutes, is_default]);
    
    await client.query('COMMIT');
    return sendSuccess(res, 'Shift berhasil dibuat', result.rows[0], 201);
  } catch (error) {
    await client.query('ROLLBACK');
    return sendError(res, error.message);
  } finally {
    client.release();
  }
};

// @desc    Update shift (HR only)
// @route   PUT /api/shifts/:id
const updateShift = async (req, res) => {
  const client = await pool.connect();
  try {
    const validation = updateShiftSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Data tidak valid', 400, validation.error.format());
    }

    const shiftQuery = await client.query('SELECT unit_kerja_id, kode_shift FROM shifts WHERE id = $1', [req.params.id]);
    if (shiftQuery.rows.length === 0) return sendError(res, 'Shift tidak ditemukan', 404);

    const { kode_shift, is_default } = validation.data;
    const { unit_kerja_id, kode_shift: old_kode_shift } = shiftQuery.rows[0];

    await client.query('BEGIN');

    if (kode_shift && kode_shift !== old_kode_shift) {
      const duplicateCheck = await client.query(
        'SELECT id FROM shifts WHERE unit_kerja_id = $1 AND kode_shift = $2 AND is_active = true AND id != $3',
        [unit_kerja_id, kode_shift, req.params.id]
      );
      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return sendError(res, `Kode shift "${kode_shift}" sudah digunakan.`, 400);
      }
    }

    if (is_default) {
      await client.query('UPDATE shifts SET is_default = false WHERE unit_kerja_id = $1 AND id != $2', [unit_kerja_id, req.params.id]);
    }

    // Build dynamic update query
    const fields = Object.keys(validation.data).filter(k => validation.data[k] !== undefined);
    if (fields.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Tidak ada data untuk diperbarui', 400);
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const query = `UPDATE shifts SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`;
    const result = await client.query(query, [...fields.map(f => validation.data[f]), req.params.id]);

    await client.query('COMMIT');
    return sendSuccess(res, 'Shift berhasil diperbarui', result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    return sendError(res, error.message);
  } finally {
    client.release();
  }
};

// @desc    Soft delete shift (HR only)
// @route   DELETE /api/shifts/:id
const deleteShift = async (req, res) => {
  try {
    const result = await pool.query('UPDATE shifts SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return sendError(res, 'Shift tidak ditemukan', 404);
    return sendSuccess(res, 'Shift berhasil dihapus');
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  getShiftsByUnit,
  getAllShifts,
  createShift,
  updateShift,
  deleteShift,
};

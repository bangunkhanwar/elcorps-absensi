const express = require('express');
const { auth } = require('../middleware/auth');
const pool = require('../config/database');
const User = require('../models/user');
const { createNotification } = require('./notification');

const router = express.Router();

// --- HELPER: Hitung Hari Kerja ---
function addWorkingDays(startDate, daysToAdd) {
  let currentDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < daysToAdd) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) addedDays++;
  }
  return currentDate;
}

// ============================================================
// PENGAJUAN LEMBUR
// ============================================================

// POST /apply — Karyawan mengajukan lembur
router.post('/apply', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { tanggal, jam_mulai, jam_selesai, keterangan } = req.body;
    const user_id = req.user.id;

    if (!tanggal || !jam_mulai || !jam_selesai) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Tanggal, jam mulai, dan jam selesai wajib diisi' });
    }

    // Hitung durasi dalam menit
    const [startH, startM] = jam_mulai.split(':').map(Number);
    const [endH, endM] = jam_selesai.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    let durasi_menit = endMinutes - startMinutes;

    if (durasi_menit <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Jam selesai harus lebih besar dari jam mulai' });
    }

    // Cari jabatan atasan
    const userResult = await client.query('SELECT jabatan_id FROM users WHERE id = $1', [user_id]);
    if (userResult.rowCount === 0) throw new Error('User tidak ditemukan');
    const userJabatanId = userResult.rows[0].jabatan_id;

    let target_jabatan_id = null;
    let expired_at = null;
    let status = 'pending';

    if (userJabatanId) {
      const jabatanResult = await client.query('SELECT reports_to_id FROM jabatan WHERE id = $1', [userJabatanId]);
      if (jabatanResult.rowCount > 0 && jabatanResult.rows[0].reports_to_id) {
        target_jabatan_id = jabatanResult.rows[0].reports_to_id;
        expired_at = addWorkingDays(new Date(), 3);
      } else {
        // Tidak punya atasan → auto approve
        status = 'approved';
      }
    }

    const result = await client.query(`
      INSERT INTO lembur (user_id, tanggal, jam_mulai, jam_selesai, durasi_menit, keterangan, status, target_jabatan_id, expired_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [user_id, tanggal, jam_mulai, jam_selesai, durasi_menit, keterangan || '', status, target_jabatan_id, expired_at]);

    await client.query('COMMIT');

    const lembur = result.rows[0];

    // Notif ke Employee
    await createNotification(
      user_id,
      'Pengajuan Lembur Dikirim',
      `Pengajuan lembur tanggal ${tanggal} (${Math.floor(durasi_menit / 60)}j ${durasi_menit % 60}m) sedang menunggu persetujuan atasan.`,
      'overtime_request'
    );

    // Notif ke Supervisor
    if (target_jabatan_id) {
      const supervisors = await User.findByJabatan(target_jabatan_id);
      for (const spv of supervisors) {
        await createNotification(
          spv.id,
          'Pengajuan Lembur Baru',
          `Ada pengajuan lembur baru dari ${req.user.nama} pada tanggal ${tanggal}.`,
          'overtime_approval'
        );
      }
    }

    res.status(201).json({ success: true, message: 'Pengajuan lembur berhasil dikirim', data: lembur });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error apply lembur:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// GET /my-overtime — Riwayat lembur user
router.get('/my-overtime', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, u.nama as acted_by_nama
      FROM lembur l
      LEFT JOIN users u ON l.acted_by_user_id = u.id
      WHERE l.user_id = $1
      ORDER BY l.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting overtime:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /team-approval — Lembur bawahan untuk di-approve atasan
router.get('/team-approval', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const userResult = await pool.query('SELECT jabatan_id, role FROM users WHERE id = $1', [user_id]);
    const userJabatanId = userResult.rows[0].jabatan_id;
    const userRole = userResult.rows[0].role;

    let isSupervisor = false;
    if (userJabatanId) {
      const supervisorCheck = await pool.query('SELECT 1 FROM jabatan WHERE reports_to_id = $1 LIMIT 1', [userJabatanId]);
      isSupervisor = supervisorCheck.rowCount > 0;
    }

    let query = '';
    let values = [];

    if (userRole === 'hr') {
      // HR bisa lihat semua lembur
      query = `
        SELECT l.*, u.nama, j.nama_jabatan
        FROM lembur l
        JOIN users u ON l.user_id = u.id
        LEFT JOIN jabatan j ON u.jabatan_id = j.id
        ORDER BY l.created_at DESC
      `;
    } else {
      if (!userJabatanId) {
        return res.json({ success: true, data: [], isSupervisor: false });
      }
      query = `
        SELECT l.*, u.nama, j.nama_jabatan
        FROM lembur l
        JOIN users u ON l.user_id = u.id
        LEFT JOIN jabatan j ON u.jabatan_id = j.id
        WHERE l.target_jabatan_id = $1
        ORDER BY l.created_at ASC
      `;
      values = [userJabatanId];
    }

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows, isSupervisor });
  } catch (error) {
    console.error('Error fetching overtime approvals:', error);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server' });
  }
});

// POST /action — Approve/Reject lembur (atasan saja)
router.post('/action', auth, async (req, res) => {
  try {
    const { lembur_id, action } = req.body;
    const user_id = req.user.id;

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Aksi tidak valid' });
    }

    const userResult = await pool.query('SELECT jabatan_id, role, nama FROM users WHERE id = $1', [user_id]);
    const userJabatanId = userResult.rows[0].jabatan_id;

    const lemburResult = await pool.query('SELECT * FROM lembur WHERE id = $1', [lembur_id]);
    if (lemburResult.rowCount === 0) return res.status(404).json({ success: false, error: 'Data lembur tidak ditemukan' });

    const lembur = lemburResult.rows[0];
    if (lembur.status !== 'pending') return res.status(400).json({ success: false, error: 'Lembur sudah diproses' });

    // Validasi: Harus atasan yang tepat
    if (lembur.target_jabatan_id !== userJabatanId) {
      return res.status(403).json({ success: false, error: 'Anda tidak memiliki hak untuk menyetujui lembur ini' });
    }

    const result = await pool.query(`
      UPDATE lembur 
      SET status = $1, acted_by_user_id = $2, acted_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [action, user_id, lembur_id]);

    // Notif ke Employee
    await createNotification(
      lembur.user_id,
      `Lembur ${action === 'approved' ? 'Disetujui ✅' : 'Ditolak ❌'}`,
      `Pengajuan lembur tanggal ${lembur.tanggal} telah ${action === 'approved' ? 'disetujui' : 'ditolak'} oleh ${userResult.rows[0].nama}.`,
      'overtime_status'
    );

    res.json({ success: true, message: `Lembur berhasil di-${action}`, data: result.rows[0] });
  } catch (error) {
    console.error('Error action lembur:', error);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server' });
  }
});

// ============================================================
// DAY OFF BALANCE (Akumulasi dari jam lembur)
// Setiap 8 jam (480 menit) lembur approved = 1 hari off
// ============================================================

// GET /day-off-balance — Hitung akumulasi jam lembur & sisa day off
router.get('/day-off-balance', auth, async (req, res) => {
  try {
    const user_id = req.user.id;

    // Total menit lembur yang sudah approved
    const lemburResult = await pool.query(`
      SELECT COALESCE(SUM(durasi_menit), 0) as total_menit
      FROM lembur
      WHERE user_id = $1 AND status = 'approved'
    `, [user_id]);
    const totalMenit = parseInt(lemburResult.rows[0].total_menit);

    // Total menit yang sudah diklaim sebagai day off
    const claimedResult = await pool.query(`
      SELECT COALESCE(SUM(total_menit_digunakan), 0) as total_claimed
      FROM day_off
      WHERE user_id = $1 AND status != 'rejected'
    `, [user_id]);
    const totalClaimed = parseInt(claimedResult.rows[0].total_claimed);

    const sisaMenit = totalMenit - totalClaimed;
    const hariTersedia = Math.floor(sisaMenit / 480); // 480 menit = 8 jam

    // Riwayat day off
    const dayOffHistory = await pool.query(`
      SELECT d.*, u.nama as approved_by_nama
      FROM day_off d
      LEFT JOIN users u ON d.approved_by = u.id
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC
    `, [user_id]);

    res.json({
      success: true,
      data: {
        total_menit_lembur: totalMenit,
        total_jam_lembur: Math.floor(totalMenit / 60),
        total_menit_diklaim: totalClaimed,
        sisa_menit: sisaMenit,
        sisa_jam: Math.floor(sisaMenit / 60),
        hari_off_tersedia: hariTersedia,
        history: dayOffHistory.rows
      }
    });
  } catch (error) {
    console.error('Error getting day-off balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /claim-day-off — Klaim day off dari akumulasi lembur
router.post('/claim-day-off', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { tanggal } = req.body;
    const user_id = req.user.id;

    if (!tanggal) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Tanggal day off wajib diisi' });
    }

    // Hitung sisa akumulasi
    const lemburResult = await client.query(`
      SELECT COALESCE(SUM(durasi_menit), 0) as total_menit
      FROM lembur WHERE user_id = $1 AND status = 'approved'
    `, [user_id]);
    const totalMenit = parseInt(lemburResult.rows[0].total_menit);

    const claimedResult = await client.query(`
      SELECT COALESCE(SUM(total_menit_digunakan), 0) as total_claimed
      FROM day_off WHERE user_id = $1 AND status != 'rejected'
    `, [user_id]);
    const totalClaimed = parseInt(claimedResult.rows[0].total_claimed);

    const sisaMenit = totalMenit - totalClaimed;

    if (sisaMenit < 480) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Akumulasi lembur belum cukup. Sisa: ${Math.floor(sisaMenit / 60)} jam ${sisaMenit % 60} menit. Minimal 8 jam untuk 1 hari off.`
      });
    }

    // Ambil ID-ID lembur yang berkontribusi
    const lemburIds = await client.query(`
      SELECT id FROM lembur WHERE user_id = $1 AND status = 'approved' ORDER BY tanggal ASC
    `, [user_id]);

    const result = await client.query(`
      INSERT INTO day_off (user_id, tanggal, sumber, lembur_ids, total_menit_digunakan, status, approved_by, approved_at)
      VALUES ($1, $2, 'overtime', $3, 480, 'approved', $1, NOW())
      RETURNING *
    `, [user_id, tanggal, lemburIds.rows.map(r => r.id)]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Day off berhasil diklaim dari akumulasi lembur',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error claiming day off:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;

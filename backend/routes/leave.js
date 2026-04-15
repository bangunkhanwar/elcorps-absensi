const express = require('express');
const Leave = require('../models/leave');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const pool = require('../config/database');
const User = require('../models/user');
const optimizeImage = require('../middleware/optimizeImage');
const { createNotification } = require('./notification');

const router = express.Router();

const MONTH_NAMES = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
];

// --- HELPER FUNCTION: Hitung Hari Kerja ---
function addWorkingDays(startDate, daysToAdd) {
  let currentDate = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < daysToAdd) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    // Jika bukan hari Sabtu (6) dan bukan hari Minggu (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  return currentDate;
}

// Helper: Mendapatkan relative path dengan tahun/bulan untuk upload
function getRelativeUploadPath(filename) {
  const now = new Date();
  const year = now.getFullYear();
  const month = MONTH_NAMES[now.getMonth()];
  return `${year}/${month}/${filename}`;
}

// --- AUTO-REJECT CRON JOB ---
// Jalankan setiap hari pada pukul 00:00 (Tengah Malam)
// Masa tenggat: 3 hari kerja
cron.schedule('0 0 * * *', async () => {
  console.log('⏳ [CRON] Menjalankan Auto-Reject Izin Expired...');
  try {
    const updateQuery = `
      UPDATE izin 
      SET status = 'rejected', 
          keterangan = keterangan || ' (Ditolak otomatis oleh sistem karena melewati batas waktu 3 hari kerja)',
          acted_at = NOW()
      WHERE status = 'pending' AND expired_at < NOW()
    `;
    const result = await pool.query(updateQuery);
    console.log(`✅ [CRON] Selesai. ${result.rowCount} pengajuan izin ditolak otomatis.`);
  } catch (error) {
    console.error('❌ [CRON] Gagal menjalankan Auto-Reject Izin:', error);
  }
});

// Configure multer for file upload — organized by year/month
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const now = new Date();
    const year = now.getFullYear();
    const month = MONTH_NAMES[now.getMonth()];
    
    const uploadDir = path.join(__dirname, '../uploads/leave', String(year), month);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'leave-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images and common document types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Only images and PDF files are allowed.'));
    }
  }
});

// File upload endpoint
router.post('/upload', auth, upload.single('file'), optimizeImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Construct the file URL with year/month path
    const relativePath = getRelativeUploadPath(req.file.filename);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/leave/${relativePath}`;
    
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl: fileUrl,
      relativePath: relativePath,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: 'File upload failed',
      details: error.message 
    });
  }
});

// ============================================================
// SALDO CUTI MANAGEMENT
// ============================================================

// GET saldo cuti user saat ini
router.get(['/balance', '/leave-balance'], auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const currentYear = new Date().getFullYear();

    // Cek apakah sudah ada saldo untuk tahun ini
    let saldoResult = await pool.query(
      'SELECT * FROM saldo_cuti WHERE user_id = $1 AND tahun = $2',
      [user_id, currentYear]
    );

    if (saldoResult.rowCount === 0) {
      // Buat saldo baru untuk tahun ini
      // Cek akumulasi dari tahun sebelumnya
      const prevYearResult = await pool.query(
        'SELECT saldo_awal, saldo_terpakai FROM saldo_cuti WHERE user_id = $1 AND tahun = $2',
        [user_id, currentYear - 1]
      );

      let saldoAwal = 12; // Default 12 hari

      if (prevYearResult.rowCount > 0) {
        const prev = prevYearResult.rows[0];
        const sisaTahunLalu = prev.saldo_awal - prev.saldo_terpakai;
        saldoAwal = 12 + Math.max(0, sisaTahunLalu); // Akumulasi sisa
      }

      await pool.query(
        'INSERT INTO saldo_cuti (user_id, tahun, saldo_awal, saldo_terpakai) VALUES ($1, $2, $3, 0)',
        [user_id, currentYear, saldoAwal]
      );

      saldoResult = await pool.query(
        'SELECT * FROM saldo_cuti WHERE user_id = $1 AND tahun = $2',
        [user_id, currentYear]
      );
    }

    const saldo = saldoResult.rows[0];
    const saldoSisa = saldo.saldo_awal - saldo.saldo_terpakai;

    res.json({
      success: true,
      data: {
        tahun: saldo.tahun,
        saldo_awal: saldo.saldo_awal,
        saldo_terpakai: saldo.saldo_terpakai,
        saldo_sisa: saldoSisa
      }
    });
  } catch (error) {
    console.error('Error getting leave balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// HR: Update saldo cuti karyawan
router.post('/balance/update', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ success: false, error: 'Akses ditolak. Hanya HR yang dapat mengubah saldo cuti.' });
    }

    const { user_id, tahun, saldo_awal, catatan } = req.body;

    if (!user_id || !tahun || saldo_awal === undefined) {
      return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
    }

    const result = await pool.query(`
      INSERT INTO saldo_cuti (user_id, tahun, saldo_awal, catatan, updated_at) 
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, tahun)
      DO UPDATE SET saldo_awal = $3, catatan = $4, updated_at = NOW()
      RETURNING *
    `, [user_id, tahun, saldo_awal, catatan || null]);

    res.json({ success: true, message: 'Saldo cuti berhasil diperbarui', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating leave balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PENGAJUAN IZIN (DUAL APPROVAL: Atasan → HR)
// ============================================================

router.post('/apply', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { start_date, end_date, jenis_izin, keterangan, lampiran } = req.body;
    const user_id = req.user.id;

    // A. Dapatkan jabatan_id user saat ini
    const userResult = await client.query('SELECT jabatan_id, jenis_kelamin FROM users WHERE id = $1', [user_id]);
    if (userResult.rowCount === 0) throw new Error('User tidak ditemukan');
    const userJabatanId = userResult.rows[0].jabatan_id;

    // B. Jika jenis izin = CUTI, cek saldo cuti
    if (jenis_izin.toLowerCase() === 'cuti') {
      const currentYear = new Date().getFullYear();
      const saldoResult = await client.query(
        'SELECT saldo_awal, saldo_terpakai FROM saldo_cuti WHERE user_id = $1 AND tahun = $2',
        [user_id, currentYear]
      );

      // Hitung durasi cuti
      const diffTime = Math.abs(new Date(end_date) - new Date(start_date));
      const durasiHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (saldoResult.rowCount > 0) {
        const saldo = saldoResult.rows[0];
        const sisaCuti = saldo.saldo_awal - saldo.saldo_terpakai;
        if (durasiHari > sisaCuti) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: `Saldo cuti tidak cukup. Sisa: ${sisaCuti} hari, Diajukan: ${durasiHari} hari.`
          });
        }
      } else {
        // Buat saldo default jika belum ada
        await client.query(
          'INSERT INTO saldo_cuti (user_id, tahun, saldo_awal, saldo_terpakai) VALUES ($1, $2, 12, 0)',
          [user_id, currentYear]
        );
        if (durasiHari > 12) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: `Saldo cuti tidak cukup. Sisa: 12 hari, Diajukan: ${durasiHari} hari.`
          });
        }
      }
    }

    // C. Cari jabatan atasan (reports_to_id)
    let target_jabatan_id = null;
    let expired_at = null;
    let status = 'pending';
    let approval_atasan = 'pending';
    let approval_hr = 'pending';

    if (userJabatanId) {
      const jabatanResult = await client.query('SELECT reports_to_id FROM jabatan WHERE id = $1', [userJabatanId]);
      if (jabatanResult.rowCount > 0 && jabatanResult.rows[0].reports_to_id) {
        target_jabatan_id = jabatanResult.rows[0].reports_to_id;
        
        // Hitung expired_at (3 hari kerja dari sekarang)
        expired_at = addWorkingDays(new Date(), 3);
      } else {
        // Jika tidak punya atasan (misal Direktur Utama), atasan auto-approve, tinggal tunggu HR
        approval_atasan = 'approved';
      }
    } else {
      // Jika user belum punya jabatan, pending tanpa target spesifik
      status = 'pending';
    }

    // D. Simpan Izin dengan dual approval fields
    const insertQuery = `
      INSERT INTO izin 
        (user_id, start_date, end_date, jenis_izin, keterangan, lampiran, status, 
         target_jabatan_id, expired_at, approval_atasan, approval_hr)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      user_id, start_date, end_date, jenis_izin, keterangan, lampiran, status,
      target_jabatan_id, expired_at, approval_atasan, approval_hr
    ];
    
    const result = await client.query(insertQuery, values);
    const leave = result.rows[0];
    await client.query('COMMIT');
    
    // E. NOTIFIKASI
    // 1. Notif ke Employee
    await createNotification(
      user_id, 
      'Pengajuan Izin Dikirim', 
      `Izin ${jenis_izin} Anda sedang menunggu persetujuan atasan & HR.`,
      'leave_request'
    );

    // 2. Notif ke Supervisor(s)
    if (target_jabatan_id) {
      const supervisors = await User.findByJabatan(target_jabatan_id);
      for (const spv of supervisors) {
        await createNotification(
          spv.id,
          'Persetujuan Izin Baru',
          `Ada pengajuan izin baru dari ${req.user.nama} (${jenis_izin}). Mohon segera ditindaklanjuti.`,
          'leave_approval'
        );
      }
    }
    
    res.status(201).json({ success: true, message: 'Izin berhasil diajukan', leave });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error apply izin:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Get user's leaves
router.get('/my-leaves', auth, async (req, res) => {
  try {
    const leaves = await Leave.getUserLeaves(req.user.id);
    res.json({
      success: true,
      message: 'Data pengajuan izin Anda',
      leaves: leaves
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all leaves (HR only)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr' && req.user.website_access !== true) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    console.log('Fetching all leaves...');
    const leaves = await Leave.getAllLeaves();
    console.log('Leaves fetched successfully:', leaves.length, 'records');
    
    res.json({
      message: 'Data semua pengajuan izin',
      leaves: leaves
    });
  } catch (error) {
    console.error('❌ Error in /api/leave/all:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// GET IZIN BAWAHAN (Untuk Atasan / Approval Tim)
router.get('/team-approval', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // Dapatkan jabatan_id atasan (user yang login)
    const userResult = await pool.query('SELECT jabatan_id, role, website_access FROM users WHERE id = $1', [user_id]);
    const userJabatanId = userResult.rows[0].jabatan_id;
    const userRole = userResult.rows[0].role;
    const websiteAccess = userResult.rows[0].website_access;

    let query = '';
    let values = [];

    // Jika HRD, tampilkan semua izin (View-Only)
    let isSupervisor = false;
    if (userJabatanId) {
      const supervisorCheck = await pool.query('SELECT 1 FROM jabatan WHERE reports_to_id = $1 LIMIT 1', [userJabatanId]);
      isSupervisor = supervisorCheck.rowCount > 0;
    }

    if (userRole === 'hr') {
      query = `
        SELECT i.*, u.nama, j.nama_jabatan,
          i.approval_atasan, i.approval_hr,
          ua.nama as acted_by_atasan_nama,
          uh.nama as acted_by_hr_nama
        FROM izin i 
        JOIN users u ON i.user_id = u.id 
        LEFT JOIN jabatan j ON u.jabatan_id = j.id
        LEFT JOIN users ua ON i.acted_by_atasan_id = ua.id
        LEFT JOIN users uh ON i.acted_by_hr_id = uh.id
        ORDER BY i.created_at DESC
      `;
    } else {
      // Hanya tampilkan izin yang di-targetkan ke jabatan user ini
      if (!userJabatanId) {
        return res.json({ success: true, data: [], isHR: false, isSupervisor: false });
      }
      query = `
        SELECT i.*, u.nama, j.nama_jabatan,
          i.approval_atasan, i.approval_hr,
          ua.nama as acted_by_atasan_nama,
          uh.nama as acted_by_hr_nama
        FROM izin i 
        JOIN users u ON i.user_id = u.id 
        LEFT JOIN jabatan j ON u.jabatan_id = j.id
        LEFT JOIN users ua ON i.acted_by_atasan_id = ua.id
        LEFT JOIN users uh ON i.acted_by_hr_id = uh.id
        WHERE i.target_jabatan_id = $1
        ORDER BY i.created_at ASC
      `;
      values = [userJabatanId];
    }

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows, isHR: userRole === 'hr', isSupervisor: isSupervisor });
  } catch (error) {
    console.error('Error fetching team approvals:', error);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server' });
  }
});

// ============================================================
// DUAL APPROVAL: APPROVE / REJECT IZIN
// ============================================================
// Flow:
//   1. Atasan approve → approval_atasan = 'approved', notif ke HR
//   2. HR approve → approval_hr = 'approved', status = 'approved'
//   3. Jika salah satu reject → status = 'rejected'
// ============================================================

router.post('/action', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { izin_id, action } = req.body; // action: 'approved' | 'rejected'
    const user_id = req.user.id;

    if (!['approved', 'rejected'].includes(action)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Aksi tidak valid' });
    }

    const userResult = await client.query('SELECT jabatan_id, role, nama FROM users WHERE id = $1', [user_id]);
    const userJabatanId = userResult.rows[0].jabatan_id;
    const userRole = userResult.rows[0].role;
    const userName = userResult.rows[0].nama;

    // Ambil data izin
    const izinResult = await client.query(
      'SELECT * FROM izin WHERE id = $1',
      [izin_id]
    );
    if (izinResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Izin tidak ditemukan' });
    }
    
    const izin = izinResult.rows[0];
    if (izin.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Izin sudah diproses sebelumnya' });
    }

    // --- LOGIC DUAL APPROVAL ---
    if (userRole === 'hr') {
      // HR sedang melakukan approval
      if (izin.approval_atasan !== 'approved') {
        // Atasan belum approve, HR tidak bisa approve duluan
        // Tapi HR bisa langsung reject
        if (action === 'rejected') {
          await client.query(`
            UPDATE izin 
            SET status = 'rejected', approval_hr = 'rejected',
                acted_by_hr_id = $1, acted_at_hr = NOW(), acted_at = NOW()
            WHERE id = $2
          `, [user_id, izin_id]);

          // Kembalikan saldo cuti jika jenis_izin = cuti
          if (izin.jenis_izin.toLowerCase() === 'cuti') {
            await returnLeaveBalance(client, izin);
          }

          await client.query('COMMIT');

          await createNotification(
            izin.user_id,
            'Izin Ditolak oleh HR',
            `Pengajuan izin ${izin.jenis_izin} Anda ditolak oleh HR (${userName}).`,
            'leave_status'
          );

          return res.json({ success: true, message: 'Izin berhasil ditolak oleh HR' });
        } else {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            success: false, 
            error: 'Atasan belum menyetujui. HR hanya bisa approve setelah atasan approve.' 
          });
        }
      }

      // Atasan sudah approve, HR bisa approve/reject
      if (action === 'approved') {
        // BOTH APPROVED → status = 'approved'
        await client.query(`
          UPDATE izin 
          SET status = 'approved', approval_hr = 'approved',
              acted_by_hr_id = $1, acted_at_hr = NOW(), acted_at = NOW()
          WHERE id = $2
        `, [user_id, izin_id]);

        // Kurangi saldo cuti jika jenis_izin = cuti
        if (izin.jenis_izin.toLowerCase() === 'cuti') {
          await deductLeaveBalance(client, izin);
        }

        await client.query('COMMIT');

        await createNotification(
          izin.user_id,
          'Izin Disetujui ✅',
          `Pengajuan izin ${izin.jenis_izin} Anda telah disetujui oleh Atasan & HR.`,
          'leave_status'
        );

        return res.json({ success: true, message: 'Izin disetujui oleh HR. Status: APPROVED ✅' });
      } else {
        // HR REJECT
        await client.query(`
          UPDATE izin 
          SET status = 'rejected', approval_hr = 'rejected',
              acted_by_hr_id = $1, acted_at_hr = NOW(), acted_at = NOW()
          WHERE id = $2
        `, [user_id, izin_id]);

        // Kembalikan saldo cuti jika sudah didebit sementara
        if (izin.jenis_izin.toLowerCase() === 'cuti') {
          await returnLeaveBalance(client, izin);
        }

        await client.query('COMMIT');

        await createNotification(
          izin.user_id,
          'Izin Ditolak oleh HR',
          `Pengajuan izin ${izin.jenis_izin} Anda ditolak oleh HR (${userName}).`,
          'leave_status'
        );

        return res.json({ success: true, message: 'Izin ditolak oleh HR. Status: REJECTED ❌' });
      }
    } else {
      // ATASAN sedang melakukan approval
      // Validasi: Harus atasan yang tepat
      if (izin.target_jabatan_id !== userJabatanId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, error: 'Anda tidak memiliki hak untuk menyetujui izin ini' });
      }

      if (izin.approval_atasan !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Izin sudah direspon oleh atasan' });
      }

      if (action === 'approved') {
        // Atasan approve → Tunggu HR
        await client.query(`
          UPDATE izin 
          SET approval_atasan = 'approved',
              acted_by_atasan_id = $1, acted_at_atasan = NOW()
          WHERE id = $2
        `, [user_id, izin_id]);

        await client.query('COMMIT');

        // Notif ke Employee
        await createNotification(
          izin.user_id,
          'Disetujui Atasan ✅',
          `Izin ${izin.jenis_izin} Anda disetujui oleh ${userName}. Menunggu persetujuan HR.`,
          'leave_status'
        );

        // Notif ke semua HR
        const hrUsers = await pool.query("SELECT id FROM users WHERE role = 'hr'");
        for (const hr of hrUsers.rows) {
          await createNotification(
            hr.id,
            'Izin Menunggu Persetujuan HR',
            `Izin ${izin.jenis_izin} dari user telah disetujui atasan. Mohon review dan tindak lanjuti.`,
            'leave_approval'
          );
        }

        return res.json({ success: true, message: 'Izin disetujui oleh atasan. Menunggu persetujuan HR.' });
      } else {
        // Atasan REJECT → langsung rejected, HR tidak perlu review
        await client.query(`
          UPDATE izin 
          SET status = 'rejected', approval_atasan = 'rejected',
              acted_by_atasan_id = $1, acted_at_atasan = NOW(), acted_at = NOW()
          WHERE id = $2
        `, [user_id, izin_id]);

        await client.query('COMMIT');

        await createNotification(
          izin.user_id,
          'Izin Ditolak ❌',
          `Pengajuan izin ${izin.jenis_izin} Anda ditolak oleh atasan (${userName}).`,
          'leave_status'
        );

        return res.json({ success: true, message: 'Izin ditolak oleh atasan. Status: REJECTED ❌' });
      }
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error action izin:', error);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server' });
  } finally {
    client.release();
  }
});

// --- HELPER: Kurangi saldo cuti ---
async function deductLeaveBalance(client, izin) {
  try {
    const currentYear = new Date().getFullYear();
    const diffTime = Math.abs(new Date(izin.end_date) - new Date(izin.start_date));
    const durasiHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    await client.query(`
      UPDATE saldo_cuti 
      SET saldo_terpakai = saldo_terpakai + $1, updated_at = NOW()
      WHERE user_id = $2 AND tahun = $3
    `, [durasiHari, izin.user_id, currentYear]);
  } catch (err) {
    console.error('Error deducting leave balance:', err);
  }
}

// --- HELPER: Kembalikan saldo cuti (jika ditolak) ---
async function returnLeaveBalance(client, izin) {
  try {
    const currentYear = new Date().getFullYear();
    const diffTime = Math.abs(new Date(izin.end_date) - new Date(izin.start_date));
    const durasiHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    await client.query(`
      UPDATE saldo_cuti 
      SET saldo_terpakai = GREATEST(0, saldo_terpakai - $1), updated_at = NOW()
      WHERE user_id = $2 AND tahun = $3
    `, [durasiHari, izin.user_id, currentYear]);
  } catch (err) {
    console.error('Error returning leave balance:', err);
  }
}

module.exports = router;

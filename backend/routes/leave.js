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

// --- AUTO-REJECT CRON JOB ---
// Jalankan setiap hari pada pukul 00:00 (Tengah Malam)
cron.schedule('0 0 * * *', async () => {
  console.log('⏳ [CRON] Menjalankan Auto-Reject Izin Expired...');
  try {
    const updateQuery = `
      UPDATE izin 
      SET status = 'rejected', 
          keterangan = keterangan || ' (Ditolak otomatis oleh sistem karena melewati batas waktu 2 hari kerja)',
          acted_at = NOW()
      WHERE status = 'pending' AND expired_at < NOW()
    `;
    const result = await pool.query(updateQuery);
    console.log(`✅ [CRON] Selesai. ${result.rowCount} pengajuan izin ditolak otomatis.`);
  } catch (error) {
    console.error('❌ [CRON] Gagal menjalankan Auto-Reject Izin:', error);
  }
});

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create leave subdirectory if it doesn't exist
    const uploadDir = path.join(__dirname, '../uploads/leave');
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

    // Construct the absolute file URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/leave/${req.file.filename}`;
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl: fileUrl,
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

// Apply for leave (with optional file upload)


router.post('/apply', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { start_date, end_date, jenis_izin, keterangan, lampiran } = req.body;
    const user_id = req.user.id;

    // A. Dapatkan jabatan_id user saat ini
    const userResult = await client.query('SELECT jabatan_id FROM users WHERE id = $1', [user_id]);
    if (userResult.rowCount === 0) throw new Error('User tidak ditemukan');
    const userJabatanId = userResult.rows[0].jabatan_id;

    // B. Cari jabatan atasan (reports_to_id)
    let target_jabatan_id = null;
    let expired_at = null;
    let status = 'pending';

    if (userJabatanId) {
      const jabatanResult = await client.query('SELECT reports_to_id FROM jabatan WHERE id = $1', [userJabatanId]);
      if (jabatanResult.rowCount > 0 && jabatanResult.rows[0].reports_to_id) {
        target_jabatan_id = jabatanResult.rows[0].reports_to_id;
        
        // C. Hitung expired_at (2 hari kerja dari sekarang)
        expired_at = addWorkingDays(new Date(), 2);
      } else {
        // Jika tidak punya atasan (misal Direktur Utama), bisa langsung auto-approve
        status = 'approved';
      }
    } else {
      // Jika user belum punya jabatan, default ke HR atau pending tanpa target spesifik
      // Untuk amannya, kita izinkan pending tapi atasan harus diset manual oleh admin nanti
      status = 'pending';
    }

    // D. Simpan Izin
    const insertQuery = `
      INSERT INTO izin 
        (user_id, start_date, end_date, jenis_izin, keterangan, lampiran, status, target_jabatan_id, expired_at)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [user_id, start_date, end_date, jenis_izin, keterangan, lampiran, status, target_jabatan_id, expired_at];
    
    const result = await client.query(insertQuery, values);
    const leave = result.rows[0];
    await client.query('COMMIT');
    
    // E. NOTIFIKASI
    // 1. Notif ke Employee
    await createNotification(
      user_id, 
      'Pengajuan Izin Dikirim', 
      `Izin ${jenis_izin} Anda sedang menunggu persetujuan atasan.`,
      'leave_request'
    );

    // 2. Notif ke Supervisor(s)
    if (target_jabatan_id) {
      const supervisors = await User.findByJabatan(target_jabatan_id);
      for (const spv of supervisors) {
        await createNotification(
          spv.id,
          'Persetujuan Izin Baru',
          `Ada pengajuan izin baru dari ${req.user.nama} (${jenis_izin}).`,
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
        SELECT i.*, u.nama, j.nama_jabatan 
        FROM izin i 
        JOIN users u ON i.user_id = u.id 
        LEFT JOIN jabatan j ON u.jabatan_id = j.id
        ORDER BY i.created_at DESC
      `;
    } else {
      // Hanya tampilkan izin yang di-targetkan ke jabatan user ini
      if (!userJabatanId) {
        return res.json({ success: true, data: [], isHR: false, isSupervisor: false });
      }
      query = `
        SELECT i.*, u.nama, j.nama_jabatan 
        FROM izin i 
        JOIN users u ON i.user_id = u.id 
        LEFT JOIN jabatan j ON u.jabatan_id = j.id
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

// APPROVE / REJECT IZIN
router.post('/action', auth, async (req, res) => {
  try {
    const { izin_id, action } = req.body; // action: 'approved' | 'rejected'
    const user_id = req.user.id;

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Aksi tidak valid' });
    }

    const userResult = await pool.query('SELECT jabatan_id, role FROM users WHERE id = $1', [user_id]);
    const userJabatanId = userResult.rows[0].jabatan_id;
    const userRole = userResult.rows[0].role;

    // Verifikasi kepemilikan approval (Kecuali HR bisa bypass jika diperlukan, tapi sesuai spek atasan yang klik)
    const izinResult = await pool.query('SELECT target_jabatan_id, status FROM izin WHERE id = $1', [izin_id]);
    if (izinResult.rowCount === 0) return res.status(404).json({ success: false, error: 'Izin tidak ditemukan' });
    
    const izin = izinResult.rows[0];
    if (izin.status !== 'pending') return res.status(400).json({ success: false, error: 'Izin sudah diproses sebelumnya' });
    
    // Validasi: Harus HR atau Atasan yang tepat
    if (userRole !== 'hr' && izin.target_jabatan_id !== userJabatanId) {
      return res.status(403).json({ success: false, error: 'Anda tidak memiliki hak untuk menyetujui izin ini' });
    }

    // Update Status
    const updateQuery = `
      UPDATE izin 
      SET status = $1, acted_by_user_id = $2, acted_at = NOW() 
      WHERE id = $3 
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [action, user_id, izin_id]);
    const updatedLeave = result.rows[0];

    // NOTIFIKASI ke Employee
    await createNotification(
      updatedLeave.user_id,
      `Izin ${action === 'approved' ? 'Disetujui' : 'Ditolak'}`,
      `Pengajuan izin ${updatedLeave.jenis_izin} Anda telah ${action === 'approved' ? 'disetujui' : 'ditolak'} oleh ${req.user.nama}.`,
      'leave_status'
    );

    res.json({ success: true, message: `Izin berhasil di-${action}`, data: updatedLeave });
  } catch (error) {
    console.error('Error action izin:', error);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;

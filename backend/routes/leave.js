const express = require('express');
const Leave = require('../models/leave');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

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
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Only images, PDF, Word, and Excel files are allowed.'));
    }
  }
});

// File upload endpoint
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Construct the absolute file URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/leave/${req.file.filename}`;
    res.status(200).json({
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
      error: 'File upload failed',
      details: error.message 
    });
  }
});

// Apply for leave (with optional file upload)
router.post('/apply', auth, async (req, res) => {
  try {
    const { start_date, end_date, jenis_izin, keterangan, lampiran } = req.body;

    console.log('📱 DATA DARI MOBILE:', {
      start_date, end_date, jenis_izin, keterangan,
      lampiran: lampiran ? 'File attached' : 'No file'
    });

    const leaveData = {
      user_id: req.user.id,
      start_date,
      end_date,
      jenis_izin: jenis_izin || 'lainnya', 
      keterangan: keterangan,
      lampiran: lampiran || null 
    };

    const leave = await Leave.create(leaveData);
    res.status(201).json({ 
      message: 'Pengajuan izin berhasil dikirim', 
      leave 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's leaves
router.get('/my-leaves', auth, async (req, res) => {
  try {
    const leaves = await Leave.getUserLeaves(req.user.id);
    res.json({
      message: 'Data pengajuan izin Anda',
      leaves: leaves
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all leaves (HR only)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengakses' });
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

// Get pending leaves (HR only)
router.get('/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengakses' });
    }

    const leaves = await Leave.getPendingLeaves();
    res.json({
      message: 'Data pengajuan izin pending',
      leaves: leaves
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update leave status (HR only)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengakses' });
    }

    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status harus pending, approved, atau rejected' });
    }

    const leave = await Leave.updateStatus(req.params.id, status);
    res.json({ 
      message: 'Status izin berhasil diupdate', 
      leave 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
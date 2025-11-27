const express = require('express');
const Leave = require('../models/leave');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Apply for leave
router.post('/apply', auth, async (req, res) => {
  try {
    const { start_date, end_date, jenis_izin, keterangan, lampiran } = req.body;

    console.log('📱 DATA DARI MOBILE:', {
      start_date, end_date, jenis_izin, keterangan, lampiran
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
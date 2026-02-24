const express = require('express');
const { auth, isHR } = require('../middleware/auth');
const leaveUpload = require('../middleware/leaveUpload');
const { 
  uploadLeaveFile, 
  applyLeave, 
  getMyLeaves, 
  getAllLeaves, 
  updateLeaveStatus 
} = require('../controllers/leaveController');

const router = express.Router();

// Routes
router.post('/upload', auth, leaveUpload.single('file'), uploadLeaveFile);
router.post('/apply', auth, applyLeave);
router.get('/my-leaves', auth, getMyLeaves);

// HR/Admin routes
router.get('/all', auth, isHR, getAllLeaves);
router.patch('/:id/status', auth, isHR, updateLeaveStatus);

module.exports = router;

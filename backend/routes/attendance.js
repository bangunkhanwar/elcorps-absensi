const express = require('express');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { 
  checkIn, 
  checkOut, 
  getHistory,
  getToday
} = require('../controllers/attendanceController');

const router = express.Router();

// Attendance routes
router.post('/checkin', auth, upload.single('foto_masuk'), checkIn);
router.post('/checkout', auth, upload.single('foto_keluar'), checkOut);
router.get('/history', auth, getHistory);
router.get('/today', auth, getToday);

// Tambahkan sisa route lain secara bertahap
// router.get('/all', auth, getAllAttendance);

module.exports = router;

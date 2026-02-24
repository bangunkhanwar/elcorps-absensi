const express = require('express');
const { auth, isHR } = require('../middleware/auth');
const { 
  getShiftsByUnit, 
  getAllShifts, 
  createShift, 
  updateShift, 
  deleteShift 
} = require('../controllers/shiftController');

const router = express.Router();

// Publicly accessible within authenticated users
router.get('/unit/:unitId', auth, getShiftsByUnit);
router.get('/', auth, getAllShifts);

// HR Only routes
router.post('/', auth, isHR, createShift);
router.put('/:id', auth, isHR, updateShift);
router.delete('/:id', auth, isHR, deleteShift);

module.exports = router;

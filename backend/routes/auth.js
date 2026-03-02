const express = require('express');
const { auth, isHR } = require('../middleware/auth');
const { 
  registerUser, 
  loginUser, 
  getAllUsers, 
  updateProfile, 
  deleteUser, 
  getMasterData 
} = require('../controllers/authController');
const { sendSuccess } = require('../utils/responseHandler');

const passwordController = require('../controllers/passwordController');

const router = express.Router();
// Forgot Password
router.post('/forgot-password', passwordController.forgotPassword);

// Reset Password
router.post('/reset-password', passwordController.resetPassword);

// Public routes
router.post('/login', loginUser);

// Protected routes (Perlu Login)
router.get('/me', auth, (req, res) => sendSuccess(res, 'Profile data retrieved', { user: req.user }));
router.put('/profile', auth, updateProfile);

// HR/Admin routes
router.get('/users', auth, isHR, getAllUsers);
router.post('/register', auth, isHR, registerUser);
router.delete('/users/:id', auth, isHR, deleteUser);
router.get('/master-data', auth, isHR, getMasterData);

module.exports = router;

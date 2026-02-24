const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { sendError } = require('../utils/responseHandler');

/**
 * Main authentication middleware
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return sendError(res, 'Akses ditolak. Token tidak tersedia.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Find user and select all fields (needed for later checks), but omit password
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return sendError(res, 'Token tidak valid atau user tidak ditemukan.', 401);
    } 

    req.user = user;
    next();
  } catch (error) {
    console.error('[AuthMiddleware]', error.message);
    return sendError(res, 'Token tidak valid.', 401);
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 'Akses ditolak. Izin tidak memadai.', 403);
    }
    next();
  };
};

// Preset authorization middlewares
const isHR = authorize('hr');

module.exports = { auth, authorize, isHR };
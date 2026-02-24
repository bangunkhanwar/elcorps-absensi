const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const User = require('../models/user');
const { loginSchema, registerSchema } = require('../validations/authSchema');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Register user (HR only)
const registerUser = async (req, res) => {
  try {
    // Validasi Input menggunakan Zod
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Data tidak valid', 400, validation.error.format());
    }

    const {
      nama, nik, email, password, jabatan, departemen, divisi, 
      foto_profile, role, unit_kerja, unit_kerja_id, shift_id
    } = validation.data;

    // Parallel checks for performance
    const [emailCheck, nikCheck] = await Promise.all([
      pool.query('SELECT id FROM users WHERE email = $1', [email]),
      pool.query('SELECT id FROM users WHERE nik = $1', [nik])
    ]);

    if (emailCheck.rows.length > 0) return sendError(res, 'Email sudah terdaftar', 400);
    if (nikCheck.rows.length > 0) return sendError(res, 'NIK sudah terdaftar', 400);

    let finalUnitKerjaId = unit_kerja_id;
    if (!finalUnitKerjaId && unit_kerja) {
      const unitResult = await pool.query('SELECT id FROM unit_kerja WHERE nama_unit = $1 AND is_active = true', [unit_kerja]);
      if (unitResult.rows[0]) finalUnitKerjaId = unitResult.rows[0].id;
    }

    let finalShiftId = shift_id;
    if (!finalShiftId && finalUnitKerjaId) {
      const shiftResult = await pool.query(
        'SELECT id FROM shifts WHERE unit_kerja_id = $1 AND (is_default = true OR is_active = true) ORDER BY is_default DESC LIMIT 1',
        [finalUnitKerjaId]
      );
      if (shiftResult.rows[0]) finalShiftId = shiftResult.rows[0].id;
    }

    const newUser = await User.create({
      nama, nik, email, password, jabatan, departemen, divisi,
      foto_profile: foto_profile || '',
      role: role || 'karyawan',
      unit_kerja_id: finalUnitKerjaId,
      shift_id: finalShiftId
    });

    // Remove password from returned object
    delete newUser.password;

    return sendSuccess(res, 'User berhasil dibuat', newUser, 201);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Login user
const loginUser = async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Data tidak valid', 400, validation.error.format());
    }

    const { email, password, login_type } = validation.data;

    const user = await User.findByEmailWithPassword(email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return sendError(res, 'Email atau password salah', 401);
    }

    if (login_type === 'website') {
      if (user.role !== 'hr' && !user.website_access) {
        return sendError(res, 'Akses ditolak. Gunakan akun dengan akses website.', 403);
      }
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    // Remove password from returned object
    delete user.password;

    return sendSuccess(res, 'Login berhasil', { token, user });
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Get all users (HR only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    return sendSuccess(res, 'Data semua user berhasil diambil', users);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Update user profile (Self)
const updateProfile = async (req, res) => {
  try {
    const { nama, jabatan, departemen, divisi, foto_profile } = req.body;
    const user = await User.updateProfile(req.user.id, { nama, jabatan, departemen, divisi, foto_profile });
    return sendSuccess(res, 'Profile berhasil diupdate', user);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Delete user (HR only)
const deleteUser = async (req, res) => {
  try {
    const result = await User.delete(req.params.id);
    return sendSuccess(res, result.message);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Get master data (HR only)
const getMasterData = async (req, res) => {
  try {
    const [jabatan, departemen, divisi] = await Promise.all([
      pool.query("SELECT DISTINCT jabatan FROM users WHERE jabatan != '' ORDER BY jabatan"),
      pool.query("SELECT DISTINCT departemen FROM users WHERE departemen != '' ORDER BY departemen"),
      pool.query("SELECT DISTINCT divisi FROM users WHERE divisi != '' ORDER BY divisi")
    ]);

    return sendSuccess(res, 'Master data berhasil diambil', { 
      jabatan: jabatan.rows.map(r => r.jabatan), 
      departemen: departemen.rows.map(r => r.departemen), 
      divisi: divisi.rows.map(r => r.divisi) 
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  updateProfile,
  deleteUser,
  getMasterData,
  // Fungsi lain bisa ditambahkan di sini...
};

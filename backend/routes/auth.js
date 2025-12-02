const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const User = require('../models/user');

const router = express.Router();

// Register user (HR only)
router.post('/register', auth, async (req, res) => {
  try {
    // Cek jika user adalah HR
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mendaftarkan user' });
    }

    const {
      nama, nik, email, password, jabatan, departemen, divisi, 
      foto_profile, role, unit_kerja, unit_kerja_id, shift_id
    } = req.body;

    // Cek jika email sudah ada
    const emailCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    // Cek jika NIK sudah ada
    const nikCheck = await pool.query('SELECT * FROM users WHERE nik = $1', [nik]);
    if (nikCheck.rows.length > 0) {
      return res.status(400).json({ error: 'NIK sudah terdaftar' });
    }

    // Jika unit_kerja_id tidak diberikan, cari berdasarkan nama unit_kerja
    let finalUnitKerjaId = unit_kerja_id;
    if (!finalUnitKerjaId && unit_kerja) {
      const unitResult = await pool.query(
        'SELECT id FROM unit_kerja WHERE nama_unit = $1 AND is_active = true',
        [unit_kerja]
      );
      if (unitResult.rows[0]) {
        finalUnitKerjaId = unitResult.rows[0].id;
      }
    }

    // Jika shift_id tidak diberikan, cari shift default untuk unit kerja
    let finalShiftId = shift_id;
    if (!finalShiftId && finalUnitKerjaId) {
      const shiftResult = await pool.query(
        'SELECT id FROM shifts WHERE unit_kerja_id = $1 AND (is_default = true OR is_active = true) ORDER BY is_default DESC LIMIT 1',
        [finalUnitKerjaId]
      );
      if (shiftResult.rows[0]) {
        finalShiftId = shiftResult.rows[0].id;
      } else {
        return res.status(400).json({ error: 'Tidak ada shift yang tersedia untuk unit kerja ini' });
      }
    }

    // Gunakan model User.create yang sudah otomatis mengatur website_access
    const userData = {
      nama,
      nik,
      email,
      password,
      jabatan,
      departemen,
      divisi,
      foto_profile: foto_profile || '',
      role: role || 'karyawan',
      unit_kerja_id: finalUnitKerjaId,
      shift_id: finalShiftId
    };

    const newUser = await User.create(userData);
    
    res.status(201).json({ 
      message: 'User berhasil dibuat', 
      user: newUser
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, login_type } = req.body;

    console.log('🔐 Login attempt:', { email, login_type });

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password harus diisi' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    
    if (!user) {
      return res.status(400).json({ error: 'Email atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Email atau password salah' });
    }

    // Validasi login type
    if (login_type === 'website') {
      // Website: hanya HR dan karyawan dengan website_access yang bisa akses
      const allowedRoles = ['hr', 'leader_store'];
      const hasWebsiteAccess = user.website_access === true;

      if (!allowedRoles.includes(user.role) && !hasWebsiteAccess) {
        return res.status(403).json({ 
          error: 'Akses ditolak. Hanya admin dan karyawan dengan akses website yang dapat login melalui website.' 
        });
      }
    } else if (login_type === 'mobile') {
      // Mobile: semua role bisa akses
      console.log('📱 Mobile login allowed for role:', user.role);
    } else {
      return res.status(400).json({ error: 'Tipe login tidak valid' });
    }

    // Dapatkan detail user dengan unit_kerja dan shift
    let userWithDetails;
    try {
      const detailQuery = `
        SELECT 
          u.*, 
          uk.nama_unit, uk.latitude, uk.longitude, uk.radius_meter,
          s.nama_shift, s.jam_masuk, s.jam_keluar, s.toleransi_telat_minutes
        FROM users u
        LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
        LEFT JOIN shifts s ON u.shift_id = s.id
        WHERE u.id = $1
      `;
      const detailResult = await pool.query(detailQuery, [user.id]);
      userWithDetails = detailResult.rows[0];
      
      if (!userWithDetails) {
        userWithDetails = {
          ...user,
          nama_unit: null,
          latitude: null,
          longitude: null,
          radius_meter: null,
          nama_shift: null,
          jam_masuk: null,
          jam_keluar: null,
          toleransi_telat_minutes: null
        };
      }
    } catch (error) {
      console.error('❌ Error fetching user details:', error);
      userWithDetails = user;
    }

    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for:', user.email);

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: userWithDetails.id,
        nama: userWithDetails.nama,
        email: userWithDetails.email,
        nik: userWithDetails.nik,
        role: userWithDetails.role,
        jabatan: userWithDetails.jabatan,
        departemen: userWithDetails.departemen,
        divisi: userWithDetails.divisi,
        unit_kerja: userWithDetails.nama_unit,
        unit_kerja_id: userWithDetails.unit_kerja_id,
        shift_id: userWithDetails.shift_id,
        foto_profile: userWithDetails.foto_profile,
        website_access: userWithDetails.website_access,
        website_privileges: userWithDetails.website_privileges || []
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.*, 
        uk.nama_unit,
        s.nama_shift, s.jam_masuk, s.jam_keluar
      FROM users u
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [req.user.id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({
      message: 'Data user ditemukan',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users (HR only)
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengakses' });
    }

    const users = await User.getAll();
    
    res.json({
      message: 'Data semua user',
      users: users
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { nama, jabatan, departemen, divisi, foto_profile } = req.body;
    
    const query = `
      UPDATE users 
      SET nama = $1, jabatan = $2, departemen = $3, divisi = $4, foto_profile = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;
    const values = [nama, jabatan, departemen, divisi, foto_profile, req.user.id];
    
    const result = await pool.query(query, values);
    
    res.json({
      message: 'Profile berhasil diupdate',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user by HR
router.put('/users/:id', auth, async (req, res) => {
  try {
    // Cek jika user adalah HR
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengupdate user' });
    }

    const userId = req.params.id;
    // Hapus website_access dan website_privileges dari body karena sudah dihandle otomatis
    const { nama, nik, email, password, jabatan, departemen, divisi, unit_kerja_id, shift_id, role } = req.body;
    
    // Gunakan model User.updateUser yang sudah otomatis mengatur website_access
    const updateData = {
      nama,
      nik,
      email,
      password, // akan dihash otomatis di model jika ada
      jabatan,
      departemen,
      divisi,
      unit_kerja_id,
      shift_id,
      role
    };

    const updatedUser = await User.updateUser(userId, updateData);
    
    res.json({
      message: 'User berhasil diupdate',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user by HR
router.delete('/users/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Cek jika user adalah HR
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat menghapus user' });
    }

    const userId = req.params.id;

    await client.query('BEGIN');
    
    // Hapus data terkait
    await client.query('DELETE FROM absensi WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM izin WHERE user_id = $1', [userId]);
    
    // Hapus user
    const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
    
    if (result.rowCount === 0) {
      throw new Error('User tidak ditemukan');
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: 'User berhasil dihapus'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Delete user error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Get employees by unit (for leader_store and HR)
router.get('/unit/:unitId/employees', auth, async (req, res) => {
  try {
    // Hanya HR dan karyawan dengan website_access yang bisa akses
    if (req.user.role !== 'hr' && !req.user.website_access) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    // Jika bukan HR, hanya bisa akses unitnya sendiri
    if (req.user.role !== 'hr' && req.user.unit_kerja_id != req.params.unitId) {
      return res.status(403).json({ error: 'Akses ditolak untuk unit kerja ini' });
    }

    const query = `
      SELECT u.id, u.nama, u.nik, u.email, u.jabatan, u.departemen, u.divisi, 
             u.unit_kerja_id, u.shift_id, s.nama_shift, s.jam_masuk, s.jam_keluar,
             uk.nama_unit
      FROM users u
      LEFT JOIN shifts s ON u.shift_id = s.id
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      WHERE u.unit_kerja_id = $1 AND u.role = 'karyawan'
      ORDER BY u.nama
    `;
    const result = await pool.query(query, [req.params.unitId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get employees by unit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unit kerja by nama
router.get('/unit-kerja/nama/:nama', auth, async (req, res) => {
  try {
    const query = 'SELECT * FROM unit_kerja WHERE nama_unit = $1 AND is_active = true';
    const result = await pool.query(query, [req.params.nama]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Unit kerja tidak ditemukan' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Get unit kerja by nama error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all unit kerja
router.get('/unit-kerja', auth, async (req, res) => {
  try {
    const query = 'SELECT * FROM unit_kerja WHERE is_active = true ORDER BY nama_unit';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get unit kerja error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update employee shift (for leader_store and HR)
router.put('/employees/:id/shift', auth, async (req, res) => {
  try {
    const { shift_id } = req.body;
    
    // Hanya HR dan karyawan dengan website_access yang bisa akses
    if (req.user.role !== 'hr' && !req.user.website_access) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    // Jika bukan HR, hanya bisa update karyawan di unitnya sendiri
    if (req.user.role !== 'hr') {
      const employeeQuery = 'SELECT * FROM users WHERE id = $1';
      const employeeResult = await pool.query(employeeQuery, [req.params.id]);
      const employee = employeeResult.rows[0];
      
      if (!employee || employee.unit_kerja_id !== req.user.unit_kerja_id) {
        return res.status(403).json({ error: 'Akses ditolak untuk karyawan ini' });
      }
    }

    const updateQuery = `
      UPDATE users 
      SET shift_id = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `;
    const updateResult = await pool.query(updateQuery, [shift_id, req.params.id]);
    
    res.json({
      message: 'Shift karyawan berhasil diupdate',
      user: updateResult.rows[0]
    });
  } catch (error) {
    console.error('❌ Update employee shift error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update all employees shift in a unit (for HR only)
router.put('/unit/:unitId/update-all-shifts', auth, async (req, res) => {
  try {
    // Hanya HR yang bisa update massal
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengupdate shift massal' });
    }

    const { unitId } = req.params;
    const { shift_id } = req.body;

    const updateQuery = `
      UPDATE users 
      SET shift_id = $1, updated_at = NOW() 
      WHERE unit_kerja_id = $2 AND role = 'karyawan'
      RETURNING *
    `;
    const updateResult = await pool.query(updateQuery, [shift_id, unitId]);
    
    res.json({
      message: `Berhasil mengupdate shift ${updateResult.rows.length} karyawan`,
      updatedCount: updateResult.rows.length,
      users: updateResult.rows
    });
  } catch (error) {
    console.error('❌ Update all employees shift error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== STORE LEADERS MANAGEMENT ====================

// Get semua store leaders (HR only)
router.get('/store-leaders', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengakses' });
    }

    const result = await pool.query(`
      SELECT u.id, u.nama, u.email, u.jabatan, 
             uk.nama_unit as unit_kerja, u.unit_kerja_id
      FROM users u
      LEFT JOIN unit_kerja uk ON u.unit_kerja_id = uk.id
      WHERE u.website_access = true AND u.role = 'karyawan'
      ORDER BY uk.nama_unit, u.nama
    `);
    
    res.json({
      success: true,
      storeLeaders: result.rows
    });
  } catch (error) {
    console.error('❌ Get store leaders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get privileges store leader (HR only)
router.get('/store-leaders/:id/privileges', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengakses' });
    }

    const result = await pool.query(
      'SELECT website_privileges FROM users WHERE id = $1',
      [req.params.id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Store leader tidak ditemukan' });
    }

    // Pastikan kita return array, bahkan jika NULL
    const website_privileges = result.rows[0].website_privileges || [];

    console.log('📥 Retrieved privileges for user:', req.params.id, website_privileges);

    res.json({
      success: true,
      website_privileges: website_privileges
    });
  } catch (error) {
    console.error('❌ Get leader privileges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update privileges store leader (HR only)
router.put('/store-leaders/:id/privileges', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengupdate' });
    }

    const { privileges } = req.body;

    console.log('🔄 Updating privileges for user:', req.params.id, 'Privileges:', privileges);

    // Validasi input
    if (!Array.isArray(privileges)) {
      return res.status(400).json({ error: 'Privileges harus berupa array' });
    }

    // Pastikan format JSON yang valid untuk PostgreSQL JSONB
    // PostgreSQL JSONB expect format seperti: ["shift-management", "reports"]
    const jsonbPrivileges = JSON.stringify(privileges);

    console.log('📦 Formatted privileges for DB:', jsonbPrivileges);

    const result = await pool.query(
      'UPDATE users SET website_privileges = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, nama, website_privileges',
      [jsonbPrivileges, req.params.id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Store leader tidak ditemukan' });
    }

    console.log('✅ Privileges updated successfully for:', result.rows[0].nama);
    console.log('✅ Stored privileges:', result.rows[0].website_privileges);

    res.json({
      success: true,
      message: 'Privileges berhasil diupdate',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Update leader privileges error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get employees by unit kerja untuk Store Leader
router.get('/unit/:unitId/store-employees', auth, async (req, res) => {
  try {
    // Hanya HR dan Store Leader yang bisa akses
    if (req.user.role !== 'hr' && !req.user.website_access) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    // Jika Store Leader, hanya bisa akses unitnya sendiri
    if (req.user.role !== 'hr' && req.user.unit_kerja_id != req.params.unitId) {
      return res.status(403).json({ error: 'Akses ditolak untuk unit kerja ini' });
    }

    const query = `
      SELECT u.id, u.nama, u.nik, u.email, u.jabatan, 
             u.shift_id, s.nama_shift, s.jam_masuk, s.jam_keluar
      FROM users u
      LEFT JOIN shifts s ON u.shift_id = s.id
      WHERE u.unit_kerja_id = $1 AND u.role = 'karyawan'
      ORDER BY u.nama
    `;
    const result = await pool.query(query, [req.params.unitId]);
    
    res.json({
      success: true,
      employees: result.rows
    });
  } catch (error) {
    console.error('❌ Get store employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
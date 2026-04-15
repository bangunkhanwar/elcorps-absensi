const express = require('express');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const optimizeImage = require('../middleware/optimizeImage');
const User = require('../models/user');
const Attendance = require('../models/attendance');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();

const MONTH_NAMES = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
];

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

// Helper: Mendapatkan relative path dengan tahun/bulan untuk upload
function getRelativeUploadPath(type, filename) {
  const now = new Date();
  const year = now.getFullYear();
  const month = MONTH_NAMES[now.getMonth()];
  return `${year}/${month}/${filename}`;
}

// Helper: Validate Payload Signature
function validateSignature(payload, signature) {
  if (!signature) return false;
  
  // Create string to hash: user_id + lat + lng + secret
  const data = `${payload.user_id}:${payload.latitude}:${payload.longitude}:${SECRET_KEY}`;
  const expectedSignature = crypto.createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');
    
  return expectedSignature === signature;
}

// Helper function: Calculate distance between coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
} 

// Helper function: Calculate check-in status (digunakan saat clock-in)
// Nilai: 'tepat_waktu' | 'terlambat'
function calculateStatus(currentTime, shiftTime, tolerance) {
  if (!currentTime || typeof currentTime !== 'string' || !currentTime.includes(':')) {
    console.warn('⚠️ calculateStatus: invalid currentTime:', currentTime);
    return 'tepat_waktu';
  }
  if (!shiftTime || typeof shiftTime !== 'string' || !shiftTime.includes(':')) {
    console.warn('⚠️ calculateStatus: invalid shiftTime:', shiftTime);
    return 'tepat_waktu';
  }

  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const [shiftHour, shiftMinute] = shiftTime.split(':').map(Number);

  if (isNaN(currentHour) || isNaN(currentMinute) || isNaN(shiftHour) || isNaN(shiftMinute)) {
    console.warn('⚠️ calculateStatus: NaN in time parsing');
    return 'tepat_waktu';
  }

  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const shiftTotalMinutes = shiftHour * 60 + shiftMinute;
  const batasTelat = shiftTotalMinutes + (tolerance || 5);

  return currentTotalMinutes <= batasTelat ? 'tepat_waktu' : 'terlambat';
}

// Helper function: Calculate FINAL attendance status (digunakan saat clock-out)
// Nilai: 'tepat_waktu' | 'telat_masuk' | 'pulang_cepat' | 'telat_masuk_pulang_cepat' | 'tidak_lengkap'
function calculateFullAttendanceStatus(attendance, userShift) {
  const {
    waktu_masuk,
    waktu_keluar,
  } = attendance;

  const {
    jam_masuk,
    jam_keluar,
    toleransi_telat_minutes
  } = userShift;

  // 1. Hanya salah satu yang terisi → tidak lengkap
  if (!waktu_masuk || !waktu_keluar) return 'tidak_lengkap';

  // 2. Parse waktu ke menit
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    // Handle format HH:MM:SS atau HH:MM
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  };

  const masukMenit  = parseTimeToMinutes(waktu_masuk);
  const keluarMenit = parseTimeToMinutes(waktu_keluar);
  const jamMasukMenit  = parseTimeToMinutes(jam_masuk);
  const jamKeluarMenit = parseTimeToMinutes(jam_keluar);

  // 3. Cek keterlambatan masuk (dengan toleransi)
  const isLate     = masukMenit  > (jamMasukMenit + (toleransi_telat_minutes || 5));
  // 4. Cek pulang cepat
  const isEarlyOut = keluarMenit < jamKeluarMenit;

  // 5. Tentukan status final
  if (!isLate && !isEarlyOut)  return 'tepat_waktu';
  if (!isLate && isEarlyOut)   return 'pulang_cepat';
  if (isLate  && !isEarlyOut)  return 'telat_masuk';
  if (isLate  && isEarlyOut)   return 'telat_masuk_pulang_cepat';

  return 'tepat_waktu';
}

// Helper function: Get current time in specific timezone (SERVER TIME)
function getCurrentTimeInTimezone(timezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  const second = parts.find(p => p.type === 'second').value;
  
  return `${hour}:${minute}:${second}`;
}

// Helper function: Get current date in specific timezone (SERVER DATE)
function getCurrentDateInTimezone(timezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${year}-${month}-${day}`;
}

// Helper function: Get current Jakarta date (for backward compatibility)
function getCurrentJakartaDate() {
  return getCurrentDateInTimezone('Asia/Jakarta');
}

// CHECK-IN
router.post('/checkin', auth, upload.single('foto_masuk'), optimizeImage, async (req, res) => {
  // Helper untuk hapus file jika ada
  function removeUploadedFile() {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ File upload dihapus:', req.file.path);
      } catch (err) {
        console.error('Gagal menghapus file upload:', err);
      }
    }
  }
  try {
    console.log('📱 Check-in request received:', {
      user_id: req.user.id,
      body: req.body
    });

    // Dapatkan user data terlebih dahulu untuk mendapatkan timezone
    const user = await User.findByIdWithUnitAndShift(req.user.id);
    
    if (!user) {
      console.log('❌ User not found');
      removeUploadedFile();
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }

    // Gunakan waktu sesuai timezone unit kerja
    const timezone = user.timezone || 'Asia/Jakarta';
    const today = getCurrentDateInTimezone(timezone);
    
    // FALLBACK: Jika user tidak punya shift, ambil default dari unit kerja
    if (!user.shift_id || !user.jam_masuk) {
      console.log('⚠️ User has no shift, attempting to find default shift for unit:', user.unit_kerja_id);
      const defaultShift = await User.getDefaultShift(user.unit_kerja_id);
      if (defaultShift) {
        console.log('✅ Found default shift:', defaultShift.nama_shift);
        user.shift_id = defaultShift.id;
        user.jam_masuk = defaultShift.jam_masuk;
        user.jam_keluar = defaultShift.jam_keluar;
        user.nama_shift = defaultShift.nama_shift;
        user.toleransi_telat_minutes = defaultShift.toleransi_telat_minutes;
      } else {
        console.log('❌ No default shift found for unit:', user.unit_kerja_id);
        // Tetap lanjutkan, tapi status mungkin "Invalid shift time"
      }
    }

    const existingAttendance = await Attendance.findByUserAndDate(req.user.id, today);
    if (existingAttendance) {
      console.log('❌ User already checked in today');
      removeUploadedFile();
      return res.status(400).json({ success: false, error: 'Anda sudah check-in hari ini' });
    }

    console.log('📍 User data from database:', {
      id: user.id,
      nama: user.nama,
      unit_kerja: user.nama_unit,
      unit_kerja_id: user.unit_kerja_id,
      latitude: user.latitude,
      longitude: user.longitude,
      radius_meter: user.radius_meter,
      shift: user.nama_shift,
      jam_masuk: user.jam_masuk,
      toleransi: user.toleransi_telat_minutes,
      timezone: timezone
    });

    if (!user.latitude || !user.longitude) {
      console.log('❌ Unit kerja missing coordinates:', {
        unit_kerja: user.nama_unit,
        latitude: user.latitude,
        longitude: user.longitude
      });
      removeUploadedFile();
      return res.status(400).json({ 
        success: false,
        error: `Unit kerja ${user.nama_unit} belum memiliki koordinat lokasi` 
      });
    }

    const { latitude, longitude, signature, lokasi_masuk } = req.body;

    console.log('📍 Raw location data from mobile:', { 
      latitude, 
      longitude,
      lokasi_masuk,
      foto_masuk: req.file ? req.file.filename : 'No photo'
    });
    
    if (latitude === undefined || longitude === undefined) {
      console.log('❌ Coordinates undefined from mobile');
      removeUploadedFile();
      return res.status(400).json({ 
        success: false,
        error: 'Koordinat lokasi tidak terdeteksi. Pastikan GPS aktif dan izin lokasi diberikan.' 
      });
    }

    if (!latitude || !longitude) {
      console.log('❌ Missing coordinates from mobile');
      removeUploadedFile();
      return res.status(400).json({ success: false, error: 'Koordinat lokasi diperlukan' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.log('❌ Invalid coordinate format:', { lat, lng });
      removeUploadedFile();
      return res.status(400).json({ 
        success: false,
        error: 'Format koordinat tidak valid. Pastikan aplikasi memiliki akses lokasi.' 
      });
    }

    console.log('📍 Parsed coordinates:', { lat, lng });

    const distance = calculateDistance(
      lat, lng,
      parseFloat(user.latitude), parseFloat(user.longitude)
    );

    console.log('📍 Distance calculation:', {
      user_lat: user.latitude,
      user_lng: user.longitude,
      mobile_lat: lat,
      mobile_lng: lng,
      distance: Math.round(distance),
      allowed_radius: user.radius_meter
    });

    // if (distance > user.radius_meter) {
    //   console.log('❌ User outside radius');
    //   removeUploadedFile();
    //   return res.status(400).json({ 
    //     error: `Anda berada di luar radius unit kerja. Jarak: ${Math.round(distance)}m, Radius: ${user.radius_meter}m` 
    //   });
    // }

    // AMBIL WAKTU SESUAI TIMEZONE UNIT KERJA
    const currentTime = getCurrentTimeInTimezone(timezone);
    const status = calculateStatus(currentTime, user.jam_masuk, user.toleransi_telat_minutes);

    console.log('⏰ Attendance status calculation:', {
      timezone: timezone,
      current_time: currentTime,
      shift_time: user.jam_masuk,
      toleransi: user.toleransi_telat_minutes,
      status: status
    });

    const attendanceData = {
      user_id: req.user.id,
      tanggal_absen: today,
      waktu_masuk: currentTime,
      foto_masuk: req.file ? getRelativeUploadPath('attendance', req.file.filename) : '',
      status: status,
      user_latitude: lat,
      user_longitude: lng,
      distance_meter: Math.round(distance),
      unit_kerja_id: user.unit_kerja_id,
      shift_id: user.shift_id,
      jam_seharusnya_masuk: user.jam_masuk,
      jam_seharusnya_keluar: user.jam_keluar,
      lokasi_masuk: lokasi_masuk
    };

    console.log('💾 Saving attendance data:', attendanceData);

    const attendance = await Attendance.create(attendanceData);
    
    console.log('✅ Check-in successful for user:', req.user.id);
    
    res.status(201).json({ 
      success: true,
      message: 'Check-in berhasil',
      attendance: {
        ...attendance,
        waktu_masuk: currentTime,
        status: status,
        unit_kerja: user.nama_unit,
        shift: user.nama_shift,
        distance: Math.round(distance)
      }
    });
    
  } catch (error) {
    console.error('❌ Check-in error:', error);
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ File upload dihapus karena error:', req.file.path);
      } catch (err) {
        console.error('Gagal menghapus file upload (error):', err);
      }
    }
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// CHECK-OUT
router.post('/checkout', auth, upload.single('foto_keluar'), optimizeImage, async (req, res) => {  try {
    console.log('📱 Check-out request received:', {
      user_id: req.user.id,
      body: req.body
    });

    const user = await User.findByIdWithUnitAndShift(req.user.id);
    const timezone = user.timezone || 'Asia/Jakarta';
    const today = getCurrentDateInTimezone(timezone);
    
    const attendance = await Attendance.findByUserAndDate(req.user.id, today);
    if (!attendance) {
      return res.status(400).json({ success: false, error: 'Anda belum check-in hari ini' });
    }

    if (attendance.waktu_keluar) {
      return res.status(400).json({ success: false, error: 'Anda sudah check-out hari ini' });
    }

    console.log('📍 Current user data for check-out:', {
      id: user.id,
      nama: user.nama,
      current_unit: user.nama_unit,
      stored_unit_id: attendance.unit_kerja_id
    });

    if (user.unit_kerja_id !== attendance.unit_kerja_id) {
      console.log('❌ Unit kerja changed:', {
        clock_in_unit: attendance.unit_kerja_id,
        current_unit: user.unit_kerja_id
      });
      return res.status(400).json({ 
        success: false,
        error: `Unit kerja Anda telah diubah. Silakan hubungi HR.` 
      });
    }

    if (!user.latitude || !user.longitude) {
      console.log('❌ Unit kerja missing coordinates');
      return res.status(400).json({ 
        success: false,
        error: `Unit kerja ${user.nama_unit} belum memiliki koordinat lokasi` 
      });
    }

    const { latitude, longitude, signature, lokasi_keluar } = req.body;

    console.log('📍 Check-out location data:', { 
      latitude, 
      longitude,
      lokasi_keluar,
      foto_keluar: req.file ? req.file.filename : 'No photo'
    });
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        success: false,
        error: 'Koordinat lokasi tidak terdeteksi. Pastikan GPS aktif dan izin lokasi diberikan.' 
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ 
        success: false,
        error: 'Format koordinat tidak valid. Pastikan aplikasi memiliki akses lokasi.' 
      });
    }

    console.log('📍 Check-out coordinates:', { lat, lng });

    const distance = calculateDistance(
      lat, lng,
      parseFloat(user.latitude), parseFloat(user.longitude)
    );

    console.log('📍 Check-out distance calculation:', {
      user_lat: user.latitude,
      user_lng: user.longitude,
      mobile_lat: lat,
      mobile_lng: lng,
      distance: Math.round(distance),
      allowed_radius: user.radius_meter
    });

    // if (distance > user.radius_meter) {
    //   console.log('❌ User outside radius during check-out');
    //   return res.status(400).json({ 
    //     success: false,
    //     error: `Anda berada di luar radius unit kerja. Jarak: ${Math.round(distance)}m, Radius: ${user.radius_meter}m` 
    //   });
    // }

    // AMBIL WAKTU SESUAI TIMEZONE UNIT KERJA
    const currentTime = getCurrentTimeInTimezone(timezone);

    // Hitung status FINAL berdasarkan waktu masuk + waktu keluar + shift
    const finalStatus = calculateFullAttendanceStatus(
      {
        waktu_masuk: attendance.waktu_masuk,
        waktu_keluar: currentTime,
      },
      {
        jam_masuk: user.jam_masuk || attendance.jam_seharusnya_masuk,
        jam_keluar: user.jam_keluar || attendance.jam_seharusnya_keluar,
        toleransi_telat_minutes: user.toleransi_telat_minutes
      }
    );

    console.log('⏰ Final attendance status calculation:', {
      waktu_masuk: attendance.waktu_masuk,
      waktu_keluar: currentTime,
      jam_masuk_shift: user.jam_masuk,
      jam_keluar_shift: user.jam_keluar,
      toleransi: user.toleransi_telat_minutes,
      finalStatus
    });

    const updatedAttendance = await Attendance.updateCheckOut(
      attendance.id,
      currentTime,
      req.file ? getRelativeUploadPath('attendance', req.file.filename) : '',
      {
        lokasi_keluar,
        status: finalStatus
      }
    );

    console.log('✅ Check-out successful for user:', req.user.id);
    
    res.json({ 
      success: true,
      message: 'Check-out berhasil',
      attendance: {
        ...updatedAttendance,
        unit_kerja: user.nama_unit,
        distance: Math.round(distance)
      }
    });
    
  } catch (error) {
    console.error('❌ Check-out error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// GET HISTORY
router.get('/history', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user_id = req.user.id;

    const attendance = await Attendance.getUserAttendance(user_id, startDate, endDate);
    
    res.json({
      success: true,
      message: 'Data history berhasil diambil',
      data: attendance
    });

  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server' });
  }
});

// GET TODAY - Perbaikan untuk include unit kerja data
router.get('/today', auth, async (req, res) => {
  try {
    const user = await User.findByIdWithUnitAndShift(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }
    
    const timezone = user?.timezone || 'Asia/Jakarta';
    const today = getCurrentDateInTimezone(timezone);
    
    const attendance = await Attendance.findByUserAndDate(req.user.id, today);
    
    // Siapkan data unit kerja untuk response
    const unitKerjaData = {
      latitude: user.latitude,
      longitude: user.longitude,
      radius_meter: user.radius_meter,
      nama_unit: user.nama_unit,
      timezone: user.timezone
    };
    
    res.json({
      success: true,
      message: 'Status absensi hari ini',
      date: today,
      data: attendance || null,
      unit_kerja: unitKerjaData
    });
  } catch (error) {
    console.error('Today error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET ALL ATTENDANCE TODAY (Untuk HR dan Leader)
router.get('/today-all', auth, async (req, res) => {
  try {
    // Periksa akses website
    if (req.user.role !== 'hr' && !req.user.website_access) {
      return res.status(403).json({ 
        success: false, 
        error: 'Anda tidak memiliki akses website' 
      });
    }

    // Untuk leader, hanya ambil data unit kerjanya
    let unitId = null;
    if (req.user.role !== 'hr' && req.user.website_access) {
      unitId = req.user.unit_kerja_id;
      console.log('👔 Leader access - filtering by unit:', unitId);
    }
    
    const attendance = await Attendance.getTodayAttendance(unitId);
    
    res.json({
      success: true,
      message: 'Data absensi hari ini',
      date: new Date().toISOString().split('T')[0],
      attendances: attendance
    });
  } catch (error) {
    console.error('Today-all error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// GET ALL ATTENDANCE (Untuk HR dan Leader dengan website access) - PAKAI YANG LAMA
router.get('/all', auth, async (req, res) => {
  try {
    // Periksa apakah user memiliki akses website
    if (req.user.role !== 'hr' && !req.user.website_access) {
      return res.status(403).json({ 
        success: false, 
        error: 'Anda tidak memiliki akses website' 
      });
    }

    const { startDate, endDate, unitId } = req.query;
    console.log('🔍 Fetching all attendance for period:', { 
      startDate, 
      endDate, 
      unitId,
      userRole: req.user.role,
      userUnitId: req.user.unit_kerja_id
    });
    
    const queryStartDate = startDate || new Date().toISOString().split('T')[0];
    const queryEndDate = endDate || new Date().toISOString().split('T')[0];
    
    console.log('📅 Using date range:', queryStartDate, 'to', queryEndDate);
    
    // Untuk leader (non-HR) dengan website_access, hanya bisa lihat unit kerjanya sendiri
    let filteredUnitId = unitId;
    if (req.user.role !== 'hr' && req.user.website_access) {
      console.log('👔 Leader access detected, restricting to unit:', req.user.unit_kerja_id);
      filteredUnitId = req.user.unit_kerja_id || unitId;
    }
    
    // PAKAI MODEL LAMA YANG SUDAH BERFUNGSI
    const attendance = await Attendance.getAllAttendance(
      queryStartDate, 
      queryEndDate, 
      filteredUnitId || null
    );
    
    console.log(`✅ Successfully retrieved ${attendance.length} attendance records`);
    
    res.json({
      success: true,
      message: 'Data semua absensi',
      period: { startDate: queryStartDate, endDate: queryEndDate },
      attendances: attendance
    });
  } catch (error) {
    console.error('❌ All attendance error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// GET USER ATTENDANCE BY ID
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    console.log('🔍 Attendance request for user:', userId, 'Month:', month, 'Year:', year);

    if (req.user.role !== 'hr' && req.user.id != userId) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];

    console.log('📅 Date range:', startDate, 'to', endDate);

    const attendance = await Attendance.getUserAttendance(userId, startDate, endDate);
    
    console.log('✅ Found records:', attendance.length);
    res.json(attendance);
  } catch (error) {
    console.error('❌ User attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT BARU: Get unit kerja list (untuk admin)
router.get('/unit-kerja', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengakses' });
    }

    const unitKerja = await User.getAllUnitKerja();
    res.json(unitKerja);
  } catch (error) {
    console.error('Unit kerja error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT BARU: Get shifts by unit kerja (untuk admin)
router.get('/shifts/:unitKerjaId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengakses' });
    }

    const { unitKerjaId } = req.params;
    const shifts = await User.getShiftsByUnit(unitKerjaId);
    res.json(shifts);
  } catch (error) {
    console.error('Shifts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET SERVER TIME
router.get('/server-time', async (req, res) => {
  res.json({
    success: true,
    data: {
      timestamp: Date.now(),
      iso: new Date().toISOString()
    }
  });
});

module.exports = router;
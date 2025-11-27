const express = require('express');
const Attendance = require('../models/attendance');
const User = require('../models/user');
const { auth } = require('../middleware/auth');

const router = express.Router();

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

// Helper function: Calculate attendance status based on shift rules
function calculateStatus(waktuMasuk, jamMasukShift, toleransi) {
  if (!waktuMasuk) return 'Tidak Hadir';
  
  const [masukHour, masukMinute] = waktuMasuk.split(':').map(Number);
  const [shiftHour, shiftMinute] = jamMasukShift.split(':').map(Number);
  
  const masukTotalMinutes = masukHour * 60 + masukMinute;
  const shiftTotalMinutes = shiftHour * 60 + shiftMinute;
  const batasTelat = shiftTotalMinutes + toleransi;
  
  if (masukTotalMinutes <= batasTelat) {
    return 'Tepat Waktu';
  } else {
    return 'Terlambat';
  }
}

// Helper function: Get current date in Asia/Jakarta timezone
function getCurrentJakartaDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

// Helper function: Get current time in Asia/Jakarta timezone  
function getCurrentJakartaTime() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta' });
}

// CHECK-IN
router.post('/checkin', auth, async (req, res) => {
  try {
    console.log('📱 Check-in request received:', {
      user_id: req.user.id,
      body: req.body
    });

    const today = getCurrentJakartaDate();
    
    const existingAttendance = await Attendance.findByUserAndDate(req.user.id, today);
    if (existingAttendance) {
      console.log('❌ User already checked in today');
      return res.status(400).json({ error: 'Anda sudah check-in hari ini' });
    }

    const user = await User.findByIdWithUnitAndShift(req.user.id);
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
      toleransi: user.toleransi_telat_minutes
    });

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    if (!user.latitude || !user.longitude) {
      console.log('❌ Unit kerja missing coordinates:', {
        unit_kerja: user.nama_unit,
        latitude: user.latitude,
        longitude: user.longitude
      });
      return res.status(400).json({ 
        error: `Unit kerja ${user.nama_unit} belum memiliki koordinat lokasi` 
      });
    }

    const { latitude, longitude, foto_masuk } = req.body;
    console.log('📍 Raw location data from mobile:', { 
      latitude, 
      longitude,
      type_lat: typeof latitude,
      type_lng: typeof longitude,
      foto_masuk: foto_masuk ? 'Photo provided' : 'No photo'
    });
    
    if (latitude === undefined || longitude === undefined) {
      console.log('❌ Coordinates undefined from mobile');
      return res.status(400).json({ 
        error: 'Koordinat lokasi tidak terdeteksi. Pastikan GPS aktif dan izin lokasi diberikan.' 
      });
    }

    if (!latitude || !longitude) {
      console.log('❌ Missing coordinates from mobile');
      return res.status(400).json({ error: 'Koordinat lokasi diperlukan' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.log('❌ Invalid coordinate format:', { lat, lng });
      return res.status(400).json({ 
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

    if (distance > user.radius_meter) {
      console.log('❌ User outside radius');
      return res.status(400).json({ 
        error: `Anda berada di luar radius unit kerja. Jarak: ${Math.round(distance)}m, Radius: ${user.radius_meter}m` 
      });
    }

    const currentTime = getCurrentJakartaTime();
    const status = calculateStatus(currentTime, user.jam_masuk, user.toleransi_telat_minutes);

    console.log('⏰ Attendance status calculation:', {
      current_time: currentTime,
      shift_time: user.jam_masuk,
      toleransi: user.toleransi_telat_minutes,
      status: status
    });

    const attendanceData = {
      user_id: req.user.id,
      tanggal_absen: today,
      waktu_masuk: currentTime,
      foto_masuk: foto_masuk || '',
      status: status,
      user_latitude: lat,
      user_longitude: lng,
      distance_meter: Math.round(distance),
      unit_kerja_id: user.unit_kerja_id,
      shift_id: user.shift_id,
      jam_seharusnya_masuk: user.jam_masuk,
      jam_seharusnya_keluar: user.jam_keluar
    };

    console.log('💾 Saving attendance data:', attendanceData);

    const attendance = await Attendance.create(attendanceData);
    
    console.log('✅ Check-in successful for user:', req.user.id);
    
    res.status(201).json({ 
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
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// CHECK-OUT 
router.post('/checkout', auth, async (req, res) => {
  try {
    console.log('📱 Check-out request received:', {
      user_id: req.user.id,
      body: req.body
    });

    const today = getCurrentJakartaDate();
    
    const attendance = await Attendance.findByUserAndDate(req.user.id, today);
    if (!attendance) {
      return res.status(400).json({ error: 'Anda belum check-in hari ini' });
    }

    if (attendance.waktu_keluar) {
      return res.status(400).json({ error: 'Anda sudah check-out hari ini' });
    }

    // DAPATKAN USER TERBARU untuk validasi unit kerja
    const user = await User.findByIdWithUnitAndShift(req.user.id);
    console.log('📍 Current user data for check-out:', {
      id: user.id,
      nama: user.nama,
      current_unit: user.nama_unit,
      stored_unit_id: attendance.unit_kerja_id
    });

    // VALIDASI: Pastikan user masih di unit kerja yang sama dengan saat clock in
    if (user.unit_kerja_id !== attendance.unit_kerja_id) {
      console.log('❌ Unit kerja changed:', {
        clock_in_unit: attendance.unit_kerja_id,
        current_unit: user.unit_kerja_id
      });
      return res.status(400).json({ 
        error: `Unit kerja Anda telah diubah dari ${attendance.unit_kerja_id} menjadi ${user.unit_kerja_id}. Silakan hubungi HR.` 
      });
    }

    if (!user.latitude || !user.longitude) {
      console.log('❌ Unit kerja missing coordinates');
      return res.status(400).json({ 
        error: `Unit kerja ${user.nama_unit} belum memiliki koordinat lokasi` 
      });
    }

    const { latitude, longitude, foto_keluar } = req.body;
    console.log('📍 Check-out location data:', { 
      latitude, 
      longitude,
      foto_keluar: foto_keluar ? 'Photo provided' : 'No photo'
    });
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        error: 'Koordinat lokasi tidak terdeteksi. Pastikan GPS aktif dan izin lokasi diberikan.' 
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ 
        error: 'Format koordinat tidak valid. Pastikan aplikasi memiliki akses lokasi.' 
      });
    }

    console.log('📍 Check-out coordinates:', { lat, lng });

    // VALIDASI LOKASI untuk check-out
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

    if (distance > user.radius_meter) {
      console.log('❌ User outside radius during check-out');
      return res.status(400).json({ 
        error: `Anda berada di luar radius unit kerja. Jarak: ${Math.round(distance)}m, Radius: ${user.radius_meter}m` 
      });
    }

    const currentTime = getCurrentJakartaTime();
    const updatedAttendance = await Attendance.updateCheckOut(
      attendance.id,
      currentTime,
      foto_keluar || ''
    );

    console.log('✅ Check-out successful for user:', req.user.id);
    
    res.json({ 
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
    
    const defaultStartDate = new Date();
    defaultStartDate.setDate(1);
    const defaultEndDate = new Date();

    const start = startDate || defaultStartDate.toISOString().split('T')[0];
    const end = endDate || defaultEndDate.toISOString().split('T')[0];

    const attendance = await Attendance.getUserAttendance(req.user.id, start, end);
    
    res.json({
      message: 'Riwayat absensi',
      period: { start, end },
      data: attendance
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET TODAY
router.get('/today', auth, async (req, res) => {
  try {
    const today = getCurrentJakartaDate();
    const attendance = await Attendance.findByUserAndDate(req.user.id, today);
    
    res.json({
      message: 'Status absensi hari ini',
      date: today,
      data: attendance || null
    });
  } catch (error) {
    console.error('Today error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 

// GET ALL ATTENDANCE TODAY (Untuk HR)
router.get('/today-all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Hanya HR yang dapat mengakses' });
    }

    const today = getCurrentJakartaDate();
    const attendance = await Attendance.getTodayAttendance();
    
    res.json({
      message: 'Data absensi hari ini',
      date: today,
      attendances: attendance
    });
  } catch (error) {
    console.error('Today-all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET ALL ATTENDANCE (Untuk HR)
  router.get('/all', auth, async (req, res) => {
    try {
      if (req.user.role !== 'hr') {
        return res.status(403).json({ error: 'Hanya HR yang dapat mengakses' });
      }

      const { startDate, endDate } = req.query;
      console.log('🔍 Fetching all attendance for period:', { startDate, endDate });
      
      const queryStartDate = startDate || new Date().toISOString().split('T')[0];
      const queryEndDate = endDate || new Date().toISOString().split('T')[0];
      
      console.log('📅 Using date range:', queryStartDate, 'to', queryEndDate);
      
      const attendance = await Attendance.getAllAttendance(queryStartDate, queryEndDate);
      
      console.log('✅ Raw data from database:');
      attendance.forEach((att, index) => {
        console.log(`${index + 1}. ${att.nama}:`, {
          masuk: att.waktu_masuk,
          keluar: att.waktu_keluar,
          tanggal: att.tanggal_absen
        });
      });
      
      res.json({
        message: 'Data semua absensi',
        period: { startDate: queryStartDate, endDate: queryEndDate },
        attendances: attendance
      });
    } catch (error) {
      console.error('❌ All attendance error:', error);
      res.status(500).json({ 
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

module.exports = router;
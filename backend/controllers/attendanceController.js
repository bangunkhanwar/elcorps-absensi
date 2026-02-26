const { deleteFile } = require('../utils/fileHandler');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const Attendance = require('../models/attendance');
const User = require('../models/user');
const { 
  calculateDistance, 
  calculateStatus, 
  getCurrentTimeInTimezone, 
  getCurrentDateInTimezone 
} = require('../utils/attendanceHelper');

// @desc    Check-in user
// @route   POST /api/attendance/checkin
const checkIn = async (req, res) => {
  const filePath = req.file?.path;

  try {
    const user = await User.findByIdWithUnitAndShift(req.user.id);
    if (!user) {
      if (filePath) await deleteFile(filePath);
      return sendError(res, 'User tidak ditemukan', 404);
    }

    const timezone = user.timezone || 'Asia/Jakarta';
    const today = getCurrentDateInTimezone(timezone);
    
    if (await Attendance.findByUserAndDate(req.user.id, today)) {
      if (filePath) await deleteFile(filePath);
      return sendError(res, 'Anda sudah check-in hari ini', 400);
    }

    const { latitude, longitude } = req.body;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      if (filePath) await deleteFile(filePath);
      return sendError(res, 'Koordinat lokasi diperlukan dan harus valid', 400);
    }

    const distance = calculateDistance(lat, lng, parseFloat(user.latitude), parseFloat(user.longitude));

    if (distance > user.radius_meter) {
      if (filePath) await deleteFile(filePath);
      return sendError(res, `Di luar radius. Jarak: ${Math.round(distance)}m, Radius: ${user.radius_meter}m`, 400);
    }

    const currentTime = getCurrentTimeInTimezone(timezone);
    const status = calculateStatus(currentTime, user.jam_masuk, user.toleransi_telat_minutes);

    const attendance = await Attendance.create({
      user_id: req.user.id,
      tanggal_absen: today,
      waktu_masuk: currentTime,
      foto_masuk: req.file ? req.file.filename : '',
      status: status,
      location: `${user.nama_unit} (${lat}, ${lng})`
    });

    return sendSuccess(res, 'Check-in berhasil', attendance, 201);
  } catch (error) {
    if (filePath) await deleteFile(filePath);
    return sendError(res, error.message);
  }
};

// @desc    Check-out user
// @route   POST /api/attendance/checkout
const checkOut = async (req, res) => {
  const filePath = req.file?.path;
  try {
    const user = await User.findByIdWithUnitAndShift(req.user.id);
    const timezone = user.timezone || 'Asia/Jakarta';
    const today = getCurrentDateInTimezone(timezone);
    
    const attendance = await Attendance.findByUserAndDate(req.user.id, today);
    if (!attendance || attendance.waktu_keluar) {
      if (filePath) await deleteFile(filePath);
      return sendError(res, 'Data absensi tidak valid untuk checkout', 400);
    }

    const { latitude, longitude } = req.body;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      if (filePath) await deleteFile(filePath);
      return sendError(res, 'Koordinat lokasi diperlukan', 400);
    }

    const distance = calculateDistance(lat, lng, parseFloat(user.latitude), parseFloat(user.longitude));

    if (distance > user.radius_meter) {
      if (filePath) await deleteFile(filePath);
      return sendError(res, 'Di luar radius unit kerja', 400);
    }

    const currentTime = getCurrentTimeInTimezone(timezone);
    const updatedAttendance = await Attendance.updateCheckOut(
      attendance.id,
      currentTime,
      req.file ? req.file.filename : ''
    );

    return sendSuccess(res, 'Check-out berhasil', updatedAttendance);
  } catch (error) {
    if (filePath) await deleteFile(filePath);
    return sendError(res, error.message);
  }
};

// @desc    Get user attendance history
// @route   GET /api/attendance/history
const getHistory = async (req, res) => {
  try {
    let { startDate, endDate, month, year } = req.query;

    // Jika parameter adalah month & year, hitung rentang tanggalnya
    if (!startDate && !endDate && month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0); // Hari terakhir bulan tersebut
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    }

    if (!startDate || !endDate) {
      return sendError(res, 'Tanggal mulai dan selesai (atau bulan dan tahun) diperlukan', 400);
    }

    const data = await Attendance.getUserAttendance(req.user.id, startDate, endDate);
    return sendSuccess(res, 'Data history berhasil diambil', data);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Get today's attendance for a user
// @route   GET /api/attendance/today
const getToday = async (req, res) => {
  try {
    const user = await User.findByIdWithUnitAndShift(req.user.id);
    const timezone = user.timezone || 'Asia/Jakarta';
    const today = getCurrentDateInTimezone(timezone);
    
    const attendance = await Attendance.findByUserAndDate(req.user.id, today);
    
    // DEBUG LOG: Cek apakah data benar-benar ada di database
    console.log(`[AttendanceDebug] User: ${req.user.id}, Date: ${today}, Found: ${!!attendance}`);
    
    const data = {
      ...attendance,
      unit_kerja: {
        latitude: user.latitude,
        longitude: user.longitude,
        radius_meter: user.radius_meter,
        nama_unit: user.nama_unit
      }
    };

    return sendSuccess(res, 'Data absensi hari ini berhasil diambil', data);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Get current server time for synchronization
// @route   GET /api/attendance/server-time
const getServerTime = async (req, res) => {
  try {
    const now = new Date();
    return sendSuccess(res, 'Server time retrieved', {
      timestamp: now.getTime(),
      iso: now.toISOString()
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  checkIn,
  checkOut,
  getHistory,
  getToday,
  getServerTime
};

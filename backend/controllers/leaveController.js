const Leave = require('../models/leave');
const { applyLeaveSchema, updateStatusSchema } = require('../validations/leaveSchema');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Upload file for leave application
// @route   POST /api/leave/upload
const uploadLeaveFile = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'Tidak ada file yang diunggah', 400);
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/leave/${req.file.filename}`;
    
    return sendSuccess(res, 'File berhasil diunggah', {
      fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    return sendError(res, 'Gagal mengunggah file', 500, error.message);
  }
};

// @desc    Apply for leave
// @route   POST /api/leave/apply
const applyLeave = async (req, res) => {
  try {
    const validation = applyLeaveSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Data tidak valid', 400, validation.error.format());
    }

    const { start_date, end_date, jenis_izin, keterangan, lampiran } = validation.data;

    const leave = await Leave.create({
      user_id: req.user.id,
      start_date,
      end_date,
      jenis_izin: jenis_izin || 'lainnya',
      keterangan,
      lampiran: lampiran || null
    });

    return sendSuccess(res, 'Pengajuan izin berhasil dikirim', leave, 201);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Get user's own leave history
// @route   GET /api/leave/my-leaves
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.getUserLeaves(req.user.id);
    return sendSuccess(res, 'Data pengajuan izin Anda', leaves);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Get all leaves (HR/Admin only)
// @route   GET /api/leave/all
const getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.getAllLeaves();
    return sendSuccess(res, 'Data semua pengajuan izin', leaves);
  } catch (error) {
    return sendError(res, error.message);
  }
};

// @desc    Update leave status (HR/Admin only)
// @route   PATCH /api/leave/:id/status
const updateLeaveStatus = async (req, res) => {
  try {
    const validation = updateStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Data tidak valid', 400, validation.error.format());
    }

    const leave = await Leave.updateStatus(req.params.id, validation.data.status);
    return sendSuccess(res, 'Status izin berhasil diupdate', leave);
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  uploadLeaveFile,
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
};

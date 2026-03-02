const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads/attendance/'));
  },
  filename: function (req, file, cb) {
    let prefix = '';
    if (file.fieldname === 'foto_masuk') {
      prefix = 'clockin-';
    } else if (file.fieldname === 'foto_keluar') {
      prefix = 'clockout-';
    }
    // Ambil nama dan tanggal absen dari request
    const nama = (req.user && req.user.nama) ? req.user.nama.replace(/\s+/g, '_').toLowerCase() : 'user';
    // Tanggal absen dari body atau gunakan hari ini
    let tanggal = req.body && req.body.tanggal_absen ? req.body.tanggal_absen : '';
    if (!tanggal) {
      const now = new Date();
      tanggal = now.toISOString().split('T')[0];
    }
    // Format nama file
    const filename = `${prefix}${nama}-${tanggal}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

const fileFIlter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Only .jpeg and .png files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFIlter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
}); 

module.exports = upload;

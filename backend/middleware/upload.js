const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

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
    
    // Sanitize user name: only alphanumeric and underscores
    const name = (req.user && req.user.nama) 
      ? req.user.nama.toLowerCase().replace(/[^a-z0-9]/g, '_') 
      : 'user';
    
    const date = new Date().toISOString().split('T')[0];
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    
    const filename = `${prefix}${name}-${date}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya format .jpeg, .jpg, dan .png yang diizinkan!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
}); 

module.exports = upload;

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const pool = require('./config/database');

const app = express();

// Middleware Keamanan
app.use(helmet()); // Proteksi HTTP Header
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Membatasi domain di produksi
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting: Batasi request berlebihan
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Maksimal 100 request per IP per windowMs
  message: { error: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Import routes
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const shiftRoutes = require('./routes/shift'); 

const allowedOrigins = [
  process.env.FRONTEND_URL_1 || 'http://localhost:5173',
  process.env.FRONTEND_URL_2 || 'http://localhost:5174',
  process.env.FRONTEND_URL_3 || '',
  process.env.FRONTEND_URL_4 || ''
].filter(Boolean);

// Middleware Parsing
app.use(express.json({ limit: '1mb' })); // Kurangi limit JSON untuk mencegah DoS
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/shifts', shiftRoutes); 

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ GLOBAL ERROR:', err);
  res.status(500).json({ 
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/leave', express.static(path.join(__dirname, 'uploads/leave')));

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 Elcorps Absensi API BERHASIL!',
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Health check aman (tanpa bocorin nama DB)
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      message: 'Server dan Database sehat!',
      database: 'Connected ✅',
      time: result.rows[0].now,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Database connection failed',
      status: 'Error'
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server BERJALAN di port ${PORT}`);
  console.log(`🔗 Base URL: http://localhost:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`📊 Attendance: http://localhost:${PORT}/api/attendance`);
  console.log(`📝 Leave: http://localhost:${PORT}/api/leave`);
  console.log(`🕒 Shifts: http://localhost:${PORT}/api/shifts`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads/leave`);
});

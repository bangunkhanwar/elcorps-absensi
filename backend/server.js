const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const overtimeRoutes = require('./routes/overtime');
const shiftRoutes = require('./routes/shift');
const { router: notificationRoutes } = require('./routes/notification');

// Middleware
app.use(cors({
  origin: [
    'https://elsa.elhijab.com',
    'https://hradmin.elhijab.com',
    'https://api.elhijab.com',
    'https://sb32k63z-5000.asse.devtunnels.ms', // backend devtunnel
    'https://sb32k63z-5174.asse.devtunnels.ms'  // frontend devtunnel
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/leave', express.static(path.join(__dirname, 'uploads/leave')));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: '🎉 Elcorps Absensi API BERHASIL!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      attendance: '/api/attendance',
      leave: '/api/leave',
      overtime: '/api/overtime',
      shifts: '/api/shifts'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      message: 'Server dan Database sehat!',
      database: 'Connected ✅',
      time: result.rows[0].now,
      database_name: process.env.DB_NAME
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database connection failed',
      error: error.message
    });
  }
});


const PORT = process.env.PORT || 5000;

// Handle error agar app tidak crash
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Graceful shutdown untuk PM2
process.on('SIGTERM', async () => {
  console.log('SIGTERM diterima, graceful shutdown...');
  try { await pool.end(); } catch(e) {}
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT diterima, graceful shutdown...');
  try { await pool.end(); } catch(e) {}
  process.exit(0);
});

// Jalankan HTTP - SSL ditangani Nginx
app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ HTTP Server BERJALAN di port ${PORT}`);
  console.log(`📍 Health: http://127.0.0.1:${PORT}/health`);
  console.log(`🔐Auth: http://127.0.0.1:${PORT}/api/auth`);
  console.log(`📊 Attendance: http://127.0.0.1:${PORT}/api/attendance`);
  console.log(`📝Leave: http://127.0.0.1:${PORT}/api/leave`);
  console.log(`⏰ Overtime: http://127.0.0.1:${PORT}/api/overtime`);
  console.log(`🕒 Shifts: http://127.0.0.1:${PORT}/api/shifts`);
  console.log(`📁 Uploads: http://127.0.0.1:${PORT}/uploads/leave`);
  if (process.send) process.send('ready');
});

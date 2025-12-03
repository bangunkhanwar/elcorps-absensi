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
const shiftRoutes = require('./routes/shift'); 

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/shifts', shiftRoutes); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server BERJALAN di port ${PORT}`);
  console.log(`🔗 Base URL: http://localhost:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`📊 Attendance: http://localhost:${PORT}/api/attendance`);
  console.log(`📝 Leave: http://localhost:${PORT}/api/leave`);
  console.log(`🕒 Shifts: http://localhost:${PORT}/api/shifts`);
});
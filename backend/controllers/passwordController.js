const pool = require('../config/database');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Konfigurasi nodemailer Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'yahya.d.prastyo@gmail.com',
    pass: 'frub stct mpmo bvdj', // gunakan App Password, bukan password Gmail biasa
  },
});

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    // Cek apakah email terdaftar
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Email tidak terdaftar' });
    }

    // Generate token dan waktu kadaluarsa (1 jam)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Simpan token dan expiry ke database
    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [token, expires, email]
    );

    // Kirim email reset password
    const resetLink = `https://l26q1zp3-5174.asse.devtunnels.ms/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    await transporter.sendMail({
      from: 'yahya.d.prastyo@gmail.com',
      to: email,
      subject: 'Reset Password',
      html: `<p>Klik link berikut untuk reset password:</p><a href="${resetLink}">${resetLink}</a>`,
    });

    res.json({ message: 'Link reset password telah dikirim ke email Anda' });
  } catch (err) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;
  try {
    // Cek token dan expiry
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND reset_password_token = $2 AND reset_password_expires > NOW()',
      [email, token]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password dan hapus token
    await pool.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE email = $2',
      [hashedPassword, email]
    );

    res.json({ message: 'Password berhasil direset' });
  } catch (err) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: err.message });
  }
};

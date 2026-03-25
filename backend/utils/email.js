const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT == '465', 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Membantu jika VPS memiliki masalah dengan verifikasi sertifikat SSL/TLS
    rejectUnauthorized: false
  }
});

// Verifikasi koneksi saat aplikasi dijalankan
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error);
  } else {
    console.log('✅ SMTP Server is ready');
  }
});

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Elcorps Absensi" <noreply@elcorps.com>',
    to: email,
    subject: 'Kode OTP Reset Password - Elcorps Absensi',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #10b981; text-align: center;">Reset Password</h2>
        <p>Halo,</p>
        <p>Anda telah meminta untuk mereset password akun Elcorps Absensi Anda. Berikut adalah kode OTP Anda:</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #065f46; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Kode ini hanya berlaku selama <b>5 menit</b>. Jangan berikan kode ini kepada siapapun.</p>
        <p>Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">Ini adalah email otomatis, mohon tidak membalas email ini.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('Gagal mengirim email OTP. Silakan coba lagi nanti.');
  }
};

module.exports = { sendOTPEmail };

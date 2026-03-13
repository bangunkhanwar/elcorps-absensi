import React, { useState, useEffect } from 'react';
import { Lock, Loader2, KeyRound, Timer } from 'lucide-react';
import api from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useModal } from '../context/ModalContext';

const ResetPasswordScreen = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // Set default 5 menit saat pertama masuk
  const { showSuccess, showError } = useModal();

  const email = searchParams.get('email');

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResend = async () => {
    if (countdown > 0 || resendLoading) return;
    
    setResendLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      showSuccess('Kode OTP baru telah dikirim ke email Anda.');
      setCountdown(300);
    } catch (err) {
      if (err.status === 429) {
        setCountdown(300);
      }
      showError(err.message || 'Gagal mengirim ulang kode OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      return showError('Masukkan 6 digit kode OTP.');
    }
    if (!newPassword || newPassword.length < 6) {
      return showError('Password minimal 6 karakter.');
    }
    if (newPassword !== confirmPassword) {
      return showError('Konfirmasi password tidak cocok.');
    }
    
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      showSuccess('Password berhasil direset. Silakan login.', () => navigate('/login'));
    } catch (err) {
      showError(err.message || 'Gagal reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <p className="text-red-600 font-semibold">Email tidak ditemukan. Silakan ulangi proses lupa password.</p>
          <button 
            onClick={() => navigate('/forgot-password')}
            className="mt-4 text-emerald-600 hover:underline"
          >
            Kembali ke Lupa Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-xl shadow-md">
        <div className="flex flex-col items-center mb-6">
          <KeyRound className="w-10 h-10 text-emerald-500 mb-2" />
          <h2 className="text-xl font-bold mb-1">Reset Password</h2>
          <p className="text-gray-500 text-sm text-center">
            Kode OTP telah dikirim ke <span className="font-semibold text-gray-700">{email}</span>
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-1 font-medium">Kode OTP</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center text-2xl tracking-[0.5em] font-bold"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="000000"
            required
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">Masukkan 6 digit kode yang Anda terima di email.</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-1 font-medium">Password Baru</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-1 font-medium">Konfirmasi Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 transition disabled:opacity-60 font-semibold"
          disabled={loading}
        >
          {loading && <Loader2 className="animate-spin w-5 h-5" />} Reset Password
        </button>
        
        <div className="mt-6 text-center">
          {countdown > 0 ? (
            <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
              <Timer className="w-3 h-3" />
              <span>Kirim ulang tersedia dalam {formatTime(countdown)}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Tidak menerima kode? 
              <button 
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="ml-1 text-emerald-600 hover:underline font-medium disabled:opacity-50"
              >
                {resendLoading ? 'Mengirim...' : 'Kirim ulang'}
              </button>
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordScreen;

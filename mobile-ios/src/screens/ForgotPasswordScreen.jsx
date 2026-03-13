import React, { useState, useEffect } from 'react';
import { Mail, Loader2, Timer } from 'lucide-react';
import api from '../services/api';
import { useModal } from '../context/ModalContext';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { showSuccess, showError } = useModal();
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      showSuccess('Kode OTP telah dikirim ke email Anda.', () => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      });
    } catch (err) {
      if (err.status === 429) {
        // Jika limit reached, kita bisa estimasi atau set default 5 menit
        setCountdown(300);
      }
      showError(err.message || 'Gagal mengirim email OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-xl shadow-md">
        <div className="flex flex-col items-center mb-6">
          <Mail className="w-10 h-10 text-emerald-500 mb-2" />
          <h2 className="text-xl font-bold mb-1">Lupa Password?</h2>
          <p className="text-gray-500 text-sm text-center">Masukkan email Anda untuk menerima kode OTP reset password.</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-1 font-medium">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            disabled={countdown > 0}
          />
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 transition disabled:opacity-60 font-semibold"
          disabled={loading || countdown > 0}
        >
          {loading && <Loader2 className="animate-spin w-5 h-5" />} Kirim Kode OTP
        </button>

        {countdown > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-orange-600 bg-orange-50 py-2 rounded-lg border border-orange-100">
            <Timer className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Tunggu {formatTime(countdown)} untuk kirim ulang</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full mt-4 py-2 text-gray-400 hover:text-gray-600 transition text-sm font-medium flex items-center justify-center gap-1"
        >
          Kembali ke Login
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordScreen;

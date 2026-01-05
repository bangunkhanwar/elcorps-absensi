import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPasswordScreen = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });
    if (!newPassword || newPassword.length < 6) {
      setAlert({ type: 'error', message: 'Password minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAlert({ type: 'error', message: 'Konfirmasi password tidak cocok.' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, token, newPassword });
      setAlert({ type: 'success', message: 'Password berhasil direset. Silakan login.' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Gagal reset password.' });
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <p className="text-red-600 font-semibold">Link reset password tidak valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-xl shadow-md">
        <div className="flex flex-col items-center mb-6">
          <Lock className="w-10 h-10 text-emerald-500 mb-2" />
          <h2 className="text-xl font-bold mb-1">Reset Password</h2>
          <p className="text-gray-500 text-sm text-center">Masukkan password baru Anda.</p>
        </div>
        {alert.message && (
          <div className={`mb-4 text-sm rounded px-3 py-2 ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{alert.message}</div>
        )}
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Password Baru</label>
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
          <label className="block text-gray-700 mb-1">Konfirmasi Password</label>
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
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 transition disabled:opacity-60"
          disabled={loading}
        >
          {loading && <Loader2 className="animate-spin w-5 h-5" />} Reset Password
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordScreen;

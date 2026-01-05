import React, { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import api from '../services/api';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ type: '', message: '' });
    try {
      await api.post('/auth/forgot-password', { email });
      setAlert({ type: 'success', message: 'Link reset password telah dikirim ke email Anda.' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Gagal mengirim email reset password.' });
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
          <p className="text-gray-500 text-sm text-center">Masukkan email Anda untuk menerima link reset password.</p>
        </div>
        {alert.message && (
          <div className={`mb-4 text-sm rounded px-3 py-2 ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{alert.message}</div>
        )}
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 transition disabled:opacity-60"
          disabled={loading}
        >
          {loading && <Loader2 className="animate-spin w-5 h-5" />} Kirim Link Reset
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordScreen;

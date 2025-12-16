import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Smartphone, User } from 'lucide-react';
import { authAPI } from '../services/api';

const LoginScreen = () => {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Animation on mount
    setTimeout(() => setFadeIn(true), 100);
    
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.email || !form.password) {
        setError('Email dan password harus diisi');
        return;
    }

    setLoading(true);
    setError('');

    try {
        const response = await authAPI.login({ 
        email: form.email, 
        password: form.password 
        });
        
        console.log('Login Response:', response);
        
        // PERBAIKAN DI SINI: Backend mungkin mengembalikan format berbeda
        const responseData = response.data;
        
        // Cek beberapa kemungkinan format response
        if (responseData.token) {
        // Format 1: { token: "...", user: {...} }
        localStorage.setItem('token', responseData.token);
        localStorage.setItem('user', JSON.stringify(responseData.user || responseData.data));
        navigate('/', { replace: true });
        return;
        }
        
        if (responseData.success && responseData.data?.token) {
        // Format 2: { success: true, data: { token: "...", user: {...} } }
        localStorage.setItem('token', responseData.data.token);
        localStorage.setItem('user', JSON.stringify(responseData.data.user || responseData.data));
        navigate('/', { replace: true });
        return;
        }
        
        if (responseData.data?.token) {
        // Format 3: { data: { token: "...", user: {...} } }
        localStorage.setItem('token', responseData.data.token);
        localStorage.setItem('user', JSON.stringify(responseData.data.user || responseData.data));
        navigate('/', { replace: true });
        return;
        }
        
        // Jika format tidak dikenali
        console.error('Response format tidak dikenali:', responseData);
        setError('Format response tidak dikenali: ' + JSON.stringify(responseData).substring(0, 100));
        
    } catch (err) {
        console.error('Login error:', err);
        
        let errorMessage = 'Terjadi kesalahan saat login';
        
        if (err.response) {
        errorMessage = err.response.data?.message || `Error ${err.response.status}`;
        } else if (err.request) {
        errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
        }
        
        setError(errorMessage);
    } finally {
        setLoading(false);
    }
    };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-64 h-64 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {/* Logo/Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mb-4">
            <Smartphone className="text-white" size={36} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Absensi Karyawan</h1>
          <p className="text-gray-600">Login untuk mengakses aplikasi</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-gray-100">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-shake">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center">
                    <User className="text-emerald-600 mr-2" size={18} />
                    Email
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Masukkan email Anda"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="text-gray-400" size={20} />
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center">
                    <Lock className="text-emerald-600 mr-2" size={18} />
                    Password
                  </div>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Masukkan password"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-gray-400" size={20} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                    Ingat saya
                  </label>
                </div>
                <Link 
                  to="/forgot-password" 
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Lupa password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition duration-200 flex items-center justify-center
                  ${loading 
                    ? 'bg-emerald-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transform hover:-translate-y-0.5'
                  }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Memproses...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2" size={20} />
                    Masuk ke Aplikasi
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Atau</span>
                </div>
              </div>
            </div>

            {/* Server Settings Link */}
            <div className="mt-6 text-center">
              <Link 
                to="/settings" 
                className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-emerald-600"
              >
                <Smartphone className="mr-1" size={16} />
                Pengaturan Server
              </Link>
            </div>
          </div>

          {/* App Info */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-gray-500 text-sm mt-4">
              © {new Date().getFullYear()} ELCORPS • Sistem Absensi Karyawan
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Install aplikasi ini ke homescreen untuk pengalaman terbaik
            </p>
          </div>
        </div>
      </div>

      {/* PWA Install Prompt */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl p-4 shadow-lg flex items-center justify-between animate-bounce-in">
          <div className="flex items-center">
            <div className="bg-white/20 p-2 rounded-lg mr-3">
              <Smartphone className="text-white" size={20} />
            </div>
            <div>
              <p className="font-medium">Install Aplikasi</p>
              <p className="text-sm text-emerald-100">Untuk akses lebih cepat</p>
            </div>
          </div>
          <button className="bg-white text-emerald-600 font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition">
            Install
          </button>
        </div>
      </div>

      {/* Add custom animations to index.css */}
      <style jsx="true">{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes bounce-in {
          0% { transform: translateY(100%); opacity: 0; }
          60% { transform: translateY(-10px); opacity: 1; }
          80% { transform: translateY(5px); }
          100% { transform: translateY(0); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
        
        .bg-grid-slate-100 {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(241 245 249 / 0.5)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
          mask-image: linear-gradient(0deg, white, rgba(255, 255, 255, 0.6));
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
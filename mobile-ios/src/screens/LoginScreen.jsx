import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { authAPI } from '../services/api';
import logo from '../assets/logo.png';

const LoginScreen = () => {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    email: 'bangun@gmail.com',
    password: 'password'
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 100);
    
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
    setError('');
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
      
      const responseData = response.data;
      
      if (responseData.token) {
        localStorage.setItem('token', responseData.token);
        localStorage.setItem('user', JSON.stringify(responseData.user || responseData.data));
        navigate('/', { replace: true });
        return;
      }
      
      if (responseData.success && responseData.data?.token) {
        localStorage.setItem('token', responseData.data.token);
        localStorage.setItem('user', JSON.stringify(responseData.data.user || responseData.data));
        navigate('/', { replace: true });
        return;
      }
      
      if (responseData.data?.token) {
        localStorage.setItem('token', responseData.data.token);
        localStorage.setItem('user', JSON.stringify(responseData.data.user || responseData.data));
        navigate('/', { replace: true });
        return;
      }
      
      console.error('Response format tidak dikenali:', responseData);
      setError('Format response tidak dikenali');
      
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

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`min-h-screen bg-white transition-opacity duration-800 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header dengan logo dan teks - menggunakan inline style sementara */}
      <div className="rounded-b-3xl shadow-lg py-10" style={{ backgroundColor: '#25a298' }}>
        <div className="flex flex-col items-center">
          <div className="w-36 h-28 -mb-7">
            <img 
              src={logo} 
              alt="elcorps Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-white/90 text-lg">Absensi Karyawan</p>
        </div>
      </div>

      {/* Login Card */}
      <div className="flex flex-col items-center justify-center px-6 -mt-8">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200 w-full max-w-md">

          {error && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-xl">
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
              <div className="flex items-center mb-3">
                <Mail style={{ color: '#25a298' }} size={20} />
                <span className="text-gray-700 font-medium ml-2">Email</span>
              </div>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-4 bg-gray-50 rounded-xl text-gray-800 placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] disabled:opacity-50"
                placeholder="Masukkan email Anda"
                style={{ borderColor: 'rgba(37, 162, 152, 0.5)' }}
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center mb-3">
                <Lock style={{ color: '#25a298' }} size={20} />
                <span className="text-gray-700 font-medium ml-2">Password</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-4 bg-gray-50 rounded-xl text-gray-800 placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] pr-12 disabled:opacity-50"
                  placeholder="Masukkan password"
                  style={{ borderColor: 'rgba(37, 162, 152, 0.5)' }}
                />
                <button
                  type="button"
                  onClick={toggleShowPassword}
                  disabled={loading}
                  className="absolute right-4 top-4 disabled:opacity-50"
                  style={{ color: '#25a298' }}
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 bg-gray-100 border-gray-300 rounded focus:ring-2"
                  style={{ 
                    color: '#25a298',
                    '--tw-ring-color': '#25a298'
                  }}
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                  Ingat saya
                </label>
              </div>
              <Link 
                to="/forgot-password" 
                className="text-sm font-medium hover:underline"
                style={{ color: '#25a298' }}
              >
                Lupa password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{ 
                backgroundColor: loading ? '#3ac2b5' : '#25a298',
                color: 'white'
              }}
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition duration-200 hover:opacity-90 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Memproses...
                </div>
              ) : (
                'Masuk ke Aplikasi'
              )}
            </button>
          </form>

          {/* Links Section */}
          <div className="mt-8 space-y-4 text-center">
            <div className="flex justify-center space-x-6">
              <Link 
                to="/server-settings" 
                className="font-medium hover:underline"
                style={{ color: '#25a298' }}
              >
                Server Settings
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} elcorps • Version 1.0
            </p>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }
        
        .-mt-8 {
          margin-top: -2rem;
        }
        
        /* Custom focus styles */
        input:focus {
          --tw-ring-color: #25a298;
          border-color: #25a298;
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
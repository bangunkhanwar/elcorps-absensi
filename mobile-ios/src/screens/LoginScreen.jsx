import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { authAPI } from '../services/api';
import logo from '../assets/elcorps_img.png';

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
      
      // response is now the data object from the interceptor
      if (response?.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        if (!localStorage.getItem('onboarding_completed')) {
          localStorage.setItem('isFirstLogin', 'true');
        }
        
        navigate('/', { replace: true });
      } else {
        setError('Login gagal. Periksa kembali akun Anda.');
      }
    } catch (err) {
      setError(err.message);
    }
     finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
  <div className={`min-h-screen relative overflow-hidden bg-white transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>

    {/* Soft background gradient (lebih hidup + ada brand color) */}
    <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-[#25a298]/10" />

    {/* Glow / ambient light */}
    <div className="absolute top-[-80px] left-[-80px] w-[250px] h-[250px] bg-[#25a298]/20 rounded-full blur-3xl" />
    <div className="absolute bottom-[-100px] right-[-80px] w-[250px] h-[250px] bg-[#25a298]/10 rounded-full blur-3xl" />

    {/* Content */}
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-5">

      {/* Glass Card */}
      <div className="
        w-full max-w-md p-6 rounded-3xl
        bg-white/80 backdrop-blur-xl
        border border-[#25a298]/10
        shadow-[0_10px_40px_rgba(0,0,0,0.08)]
      ">

        {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-40 h-28 mb-0">
          <img
            src={logo}
            alt="logo"
            className="w-full h-full object-contain drop-shadow-md"
          />
        </div>

        <p className="text-gray-500 text-sm tracking-wide leading-tight -mt-5">
          Absensi Karyawan
        </p>
      </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="
                w-full px-4 py-3 rounded-xl
                bg-white text-gray-800 placeholder-gray-400
                border border-gray-200
                focus:outline-none focus:ring-2 focus:ring-[#25a298]/40
                focus:border-[#25a298]
                transition-all duration-300
              "
              placeholder="✉ Masukkan email"
            />
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                className="
                  w-full px-4 py-3 pr-12 rounded-xl
                  bg-white text-gray-800 placeholder-gray-400
                  border border-gray-200
                  focus:outline-none focus:ring-2 focus:ring-[#25a298]/40
                  focus:border-[#25a298]
                  transition-all duration-300
                "
                placeholder="🔐 Masukkan password"
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#25a298] transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between text-gray-500 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-[#25a298]" />
              Ingat
            </label>

            <Link to="/forgot-password" className="hover:text-[#25a298] transition">
              Lupa Password?
            </Link>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full py-3 rounded-xl font-semibold
              bg-[#25a298] text-white
              shadow-[0_8px_20px_rgba(37,162,152,0.3)]
              hover:bg-[#1f8e85]
              transition-all duration-300
            "
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  </div>
);
};

export default LoginScreen;
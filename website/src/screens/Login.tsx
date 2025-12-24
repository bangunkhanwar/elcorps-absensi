import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logoelcorps2.png'
import { authAPI } from '../services/api'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setMessage('')

    try {
      const response = await authAPI.login({ email, password, login_type: 'website' })

      const user = response.data.user
      console.log('👤 User login data:', user) // Debug log
      
      // Updated validation: Allow hr, leader_store, OR karyawan with website_access
      const allowedRoles = ['hr', 'leader_store']
      const hasWebsiteAccess = user.website_access === true
      
      if (!allowedRoles.includes(user.role) && !hasWebsiteAccess) {
        setMessage('Anda tidak memiliki akses ke website admin')
        setIsLoading(false)
        return
      }
      
      localStorage.removeItem('token');
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      
      setMessage('Login berhasil!')
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Login gagal')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-screen fixed top-0 left-0 overflow-hidden flex justify-center items-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700">
      {/* Login Card */}
      <div className="w-96 p-8 rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl z-10 border border-white/30 transform transition-all duration-500 hover:shadow-3xl">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="w-32 h-32 mx-auto mb-4 transform transition-all duration-700 hover:scale-105">
            <img
              src={logo}
              alt="Logo Elcorps"
              className="w-full h-full object-contain transform transition-all duration-500 ease-out hover:scale-110 hover:rotate-2 filter drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-primary-600 transform transition-all duration-300 hover:scale-105">Admin</h1>
          <p className="text-gray-600 mt-1 text-sm transition-all duration-300 hover:text-primary-500">Manajemen Absensi karyawan</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Input */}
          <div className="transform transition-all duration-300 hover:scale-[1.02]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Masukan Email"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:border-primary-300"
            />
          </div>

          {/* Password Input with Toggle */}
          <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Masukan password"
              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:border-primary-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-primary-600 transition-all duration-300 hover:scale-110"
            >
              {showPassword ? '🔓' : '🔒'}
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl bg-primary-500 text-white font-semibold transition-all duration-500 transform hover:scale-[1.02] active:scale-95 ${
              isLoading 
                ? 'opacity-70 cursor-not-allowed' 
                : 'hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 hover:shadow-lg'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </div>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <span>Masuk</span>
              </span>
            )}
          </button>

          {/* Extra Links */}
          <div className="flex justify-center items-center gap-3 text-sm mt-6 transform transition-all duration-300 hover:scale-105">
            <a href="/forgot-password" className="text-primary-600 font-medium hover:text-primary-700 transition-all duration-300 hover:underline">
              Lupa Password
            </a>
            <span className="text-primary-600 opacity-75 transition-all duration-300">•</span>
            <a href="/register" className="text-primary-600 font-medium hover:text-primary-700 transition-all duration-300 hover:underline">
              Daftar
            </a>
          </div>

          {/* Message */}
          {message && (
            <div className={`mt-4 p-3 rounded-xl text-center font-medium text-sm transform transition-all duration-500 animate-pulse ${
              message.includes('berhasil') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </form>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 transition-all duration-300 hover:text-primary-600">
            Secure Admin Access • Elcorps HR System
          </p>
        </div>
      </div>

      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-4 h-4 bg-white/20 rounded-full top-1/4 left-1/4 animate-float"></div>
        <div className="absolute w-3 h-3 bg-white/30 rounded-full top-3/4 right-1/3 animate-float delay-1000"></div>
        <div className="absolute w-2 h-2 bg-white/40 rounded-full bottom-1/4 left-2/3 animate-float delay-2000"></div>
      </div>
    </div>
  )
}

export default Login
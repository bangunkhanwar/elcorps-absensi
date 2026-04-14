import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo3.png'
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
      console.log('👤 User login data:', user)
      
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
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-4">
      {/* Login Card - LEBIH TRANSPARAN */}
      <div className="max-w-xs w-full sm:w-96 p-8 rounded-2xl bg-white/30 backdrop-blur-md shadow-2xl z-10 border border-white/40 transform transition-all duration-500 hover:shadow-3xl">
        {/* Header */}
        <div className="w-[180px] mx-auto mb-1 transform transition-all duration-700 hover:scale-105">
          <img
            src={logo}
            alt="Logo Elcorps"
            className="w-full h-auto object-contain transform transition-all duration-500 ease-out hover:scale-110 hover:rotate-2 filter drop-shadow-lg"
          />
        </div>

        <div className="text-center -mt-3 mb-6">
          <p className="text-sm font-medium tracking-wide text-white/80">
            Manajemen Absensi Karyawan
          </p>
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
              className="w-full px-4 py-3 rounded-xl border border-gray-300/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:border-primary-300"
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
              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 text-gray-900 placeholder-gray-400 hover:border-primary-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-700 hover:text-primary-600 transition-all duration-300 hover:scale-110"
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


          {/* Message */}
          {message && (
            <div className={`mt-4 p-3 rounded-xl text-center font-medium text-sm transform transition-all duration-500 animate-pulse ${
              message.includes('berhasil') 
                ? 'bg-green-50/70 text-green-800 border border-green-200/50 backdrop-blur-sm' 
                : 'bg-red-50/70 text-red-800 border border-red-200/50 backdrop-blur-sm'
            }`}>
              {message}
            </div>
          )}
        </form>

        {/* Footer Note */}
       
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
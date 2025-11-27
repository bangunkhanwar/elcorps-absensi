import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logoelcorps1.png'
import { authAPI, attendanceAPI } from '../services/api'

// Type definitions
interface StatsData {
  totalEmployees: number
  presentToday: number
  lateToday: number
  absentToday: number
  onTimePercentage: number
}

interface QuickAction {
  id: number
  title: string
  description: string
  icon: string
  path: string
}

// Function to get leader store privileges
const getLeaderStorePrivileges = (): string[] => {
  try {
    const savedPrivileges = localStorage.getItem('leader_store_privileges')
    if (savedPrivileges) {
      const privileges = JSON.parse(savedPrivileges)
      return privileges.filter((p: any) => p.enabled).map((p: any) => p.path)
    }
  } catch (error) {
    console.error('Error loading privileges:', error)
  }
  
  return []
}

// All possible menu configurations
const getAllPossibleMenus = (): QuickAction[] => [
  {
    id: 1,
    title: 'Data Karyawan',
    description: 'Kelola data karyawan dan akun',
    icon: '👥',
    path: '/employees',
  },
  {
    id: 2,
    title: 'Absensi Hari Ini',
    description: 'Lihat rekap harian',
    icon: '📊',
    path: '/attendance',
  },
  {
    id: 3,
    title: 'Pengaturan Shift',
    description: 'Atur jadwal shift karyawan',
    icon: '🕒',
    path: '/shift-management',
  },
  {
    id: 5,
    title: 'Pengaturan',
    description: 'Konfigurasi Hak Akses',
    icon: '⚙️',
    path: '/settings',
  }
]

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState<StatsData>({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    onTimePercentage: 0
  })
  const [user, setUser] = useState<any>(null)

  // Dynamic role-based quick actions
  const getQuickActions = (): QuickAction[] => {
    const allMenus = getAllPossibleMenus()

    // HR: semua menu
    if (user?.role === 'hr') {
      return allMenus
    }

    // Untuk semua leader types (Store Leader, Leader Area, dll): gunakan website_privileges
    if (user?.website_privileges && Array.isArray(user.website_privileges)) {
      const allowedPrivileges = user.website_privileges
      
      // Filter menu berdasarkan privileges yang aktif
      const filteredMenus = allMenus.filter(menu => {
        // Mapping privilege ke menu path
        const privilegeMap: { [key: string]: string } = {
          '/shift-management': 'shift-management',
          '/reports': 'reports',
          '/attendance': 'attendance', 
          '/employees': 'employee-data'
        }
        
        const requiredPrivilege = privilegeMap[menu.path]
        return requiredPrivilege ? allowedPrivileges.includes(requiredPrivilege) : false
      })

      return filteredMenus
    }

    // Default: no menus
    return []
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user profile
        const profileResponse = await authAPI.getProfile()
        setUser(profileResponse.data.user)

        console.log('👤 User role:', profileResponse.data.user.role)

        // Untuk HR - get semua data
        if (profileResponse.data.user.role === 'hr') {
          console.log('🔄 Fetching HR dashboard data...')
          
          // Get total employees count
          const usersResponse = await authAPI.getAllUsers()
          const totalEmployees = usersResponse.data?.users?.length || 0
          console.log('👥 Total employees:', totalEmployees)

          // Get today's attendance data
          const today = new Date().toISOString().split('T')[0]
          console.log('📅 Today:', today)
          
          const response = await attendanceAPI.getAll(today, today)
          console.log('📊 Attendance API response:', response.data)
          
          const todayData = response.data?.attendances || []
          console.log('✅ Today attendance data:', todayData)

          // Calculate stats
          const presentToday = todayData.length
          const lateToday = todayData.filter((item: any) => 
            item.status === 'Terlambat' || item.status === 'telat'
          ).length
          
          const onTimeCount = todayData.filter((item: any) => 
            item.status === 'Tepat Waktu' || item.status === 'tepat_waktu'
          ).length

          const onTimePercentage = presentToday > 0 ? Math.round((onTimeCount / presentToday) * 100) : 0

          console.log('📈 Final stats:', {
            totalEmployees,
            presentToday,
            lateToday,
            onTimeCount,
            onTimePercentage
          })

          setStats({
            totalEmployees: totalEmployees,
            presentToday: presentToday,
            lateToday: lateToday,
            absentToday: totalEmployees - presentToday,
            onTimePercentage: onTimePercentage
          })
        } else {
          // Untuk user lain, set default values
          setStats({
            totalEmployees: 0,
            presentToday: 0,
            lateToday: 0,
            absentToday: 0,
            onTimePercentage: 0
          })
        }
      } catch (error) {
        console.error('❌ Error fetching dashboard data:', error)
        setStats({
          totalEmployees: 0,
          presentToday: 0,
          lateToday: 0,
          absentToday: 0,
          onTimePercentage: 0
        })
      }
    }

    fetchData()

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const quickActions = getQuickActions()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sticky Navigation Header */}
      <nav className="sticky top-0 z-50 bg-primary-500 shadow-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <img src={logo} alt="Logo Elcorps" className="w-12 h-12 rounded-lg" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Elcorps HR
                </h1>
                <p className="text-sm text-white">Manajemen Absensi Karyawan</p>
              </div>
            </div>
            
            {/* Time and User Info */}
            <div className="flex items-center space-x-6">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-white">
                  {currentTime.toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-lg font-mono text-white">
                  {currentTime.toLocaleTimeString('id-ID')}
                </p>
              </div>
              
              <div className="w-px h-8 bg-slate-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary-500 font-semibold">
                  {user?.nama?.charAt(0) || 'A'}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-white">{user?.nama || 'Admin User'}</p>
                  <p className="text-xs text-white capitalize">{user?.role || 'Super Administrator'}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#25a298]"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Selamat Datang, {user?.nama || 'Admin'}! 👋
          </h2>
          <p className="text-slate-600">
            {user?.role === 'hr' 
              ? 'Kelola sistem absensi dan data karyawan dengan mudah' 
              : user?.website_privileges && Array.isArray(user.website_privileges)
              ? `${user?.jabatan || 'Leader'} - ${user?.unit_kerja || 'Unit'}`
              : 'Sistem manajemen absensi karyawan'
            }
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 transform transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Karyawan</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalEmployees}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <span className="text-2xl text-[#25a298]">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 transform transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Hadir Hari Ini</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.presentToday}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <span className="text-2xl text-[#25a298]">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 transform transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Terlambat</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.lateToday}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                <span className="text-2xl text-[#25a298]">⏰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 transform transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Tepat Waktu</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.onTimePercentage}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <span className="text-2xl text-[#25a298]">📝</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          {quickActions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleNavigation(action.path)}
                  className="bg-white rounded-2xl p-6 border border-slate-200 transform transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#25a298] group"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#25a298] to-[#1f8a80] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl text-white">{action.icon}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-slate-900 group-hover:text-[#25a298] transition-colors duration-300">
                      {action.title}
                    </h3>
                    <p className="text-slate-600 text-sm">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-2xl border border-slate-200">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <span className="text-2xl text-slate-400">🔒</span>
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">Tidak Ada Akses Menu</h3>
              <p className="text-slate-600">Admin HR belum mengaktifkan menu untuk role Anda</p>
            </div>
          )}
        </div>

        

        {/* Bottom Info */}
        <div className="text-center">
          <p className="text-slate-500 text-sm">
            Sistem terakhir diperbarui: {currentTime.toLocaleDateString('id-ID')} • 
            Versi 2.1.0 • <span className="text-green-600">●</span> Online
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
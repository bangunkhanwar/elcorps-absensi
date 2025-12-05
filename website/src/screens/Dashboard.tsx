import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logoelcorps1.png'
import { authAPI, attendanceAPI, leaveAPI } from '../services/api'

// Type definitions
interface StatsData {
  totalKaryawan: number
  totalAdmin: number
  hadirHariIni: number
  tepatWaktu: number
  telatMasuk: number
  pulangCepat: number
  totalIzin: number
  pendingIzin: number
  absensiTidakLengkap: number
  alpha: number
}

interface QuickAction {
  id: number
  title: string
  description: string
  icon: string
  path: string
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState<StatsData>({
    totalKaryawan: 0,
    totalAdmin: 0,
    hadirHariIni: 0,
    tepatWaktu: 0,
    telatMasuk: 0,
    pulangCepat: 0,
    totalIzin: 0,
    pendingIzin: 0,
    absensiTidakLengkap: 0,
    alpha: 0
  })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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
      id: 4,
      title: 'Laporan',
      description: 'Analisis & export data',
      icon: '📈',
      path: '/reports',
    },
    {
      id: 5,
      title: 'Pengaturan',
      description: 'Konfigurasi Hak Akses',
      icon: '⚙️',
      path: '/settings',
    }
  ]

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
        setLoading(true)
        
        // Get user profile
        const profileResponse = await authAPI.getProfile()
        const userData = profileResponse.data.user
        setUser(userData)

        console.log('👤 User role:', userData.role)

        // Fetch dashboard data hanya untuk HR dan leader dengan website access
        if (userData.role === 'hr' || userData.website_access) {
          console.log('🔄 Fetching dashboard data from existing APIs...')
          
          const today = new Date().toISOString().split('T')[0]
          
          // 1. Total karyawan & admin - dari authAPI
          const usersResponse = await authAPI.getAllUsers()
          const allUsers = usersResponse.data?.users || []
          
          // Filter berdasarkan role dan unit untuk leader
          let filteredUsers = allUsers
          if (userData.role !== 'hr' && userData.website_access) {
            filteredUsers = allUsers.filter((u: any) => 
              u.unit_kerja_id === userData.unit_kerja_id
            )
          }
          
          const totalKaryawan = filteredUsers.filter((u: any) => u.role === 'karyawan').length
          const totalAdmin = filteredUsers.filter((u: any) => u.role === 'hr').length
          
          // 2. Data absensi hari ini
          let attendanceData = []
          try {
            const attendanceResponse = await attendanceAPI.getAll(today, today)
            attendanceData = attendanceResponse.data?.attendances || []
          } catch (error) {
            console.log('⚠️ Using fallback attendance data')
            // Fallback ke data hari ini jika error
            const fallbackResponse = await attendanceAPI.getTodayAll()
            attendanceData = fallbackResponse.data?.attendances || []
          }
          
          // Filter attendance untuk leader
          let filteredAttendance = attendanceData
          if (userData.role !== 'hr' && userData.website_access) {
            filteredAttendance = attendanceData.filter((att: any) => 
              att.unit_kerja_id === userData.unit_kerja_id
            )
          }
          
          // Fungsi konversi waktu ke menit
          const timeToMinutes = (timeStr: string) => {
            if (!timeStr || timeStr === '-') return 0
            const [hours, minutes] = timeStr.split(':').map(Number)
            return hours * 60 + minutes
          }
          
          // Hitung statistik
          // Hadir hari ini = yang sudah clock in DAN clock out
          const hadirHariIni = filteredAttendance.filter((item: any) => 
            item.waktu_masuk && item.waktu_keluar
          ).length
          
          // Tepat waktu = status tepat waktu atau waktu_masuk <= jam_seharusnya_masuk
          const tepatWaktu = filteredAttendance.filter((item: any) => {
            if (!item.waktu_masuk || item.waktu_masuk === '-') return false
            
            if (item.status === 'tepat_waktu' || item.status === 'Tepat Waktu') {
              return true
            }
            
            // Hitung manual jika status tidak tersedia
            const waktuMasuk = timeToMinutes(item.waktu_masuk)
            const jamSeharusnyaMasuk = timeToMinutes(item.jam_seharusnya_masuk || '09:00')
            return waktuMasuk <= jamSeharusnyaMasuk
          }).length
          
          // Telat masuk = status telat atau waktu_masuk > jam_seharusnya_masuk
          const telatMasuk = filteredAttendance.filter((item: any) => {
            if (!item.waktu_masuk || item.waktu_masuk === '-') return false
            
            if (item.status === 'telat' || item.status === 'Terlambat') {
              return true
            }
            
            // Hitung manual jika status tidak tersedia
            const waktuMasuk = timeToMinutes(item.waktu_masuk)
            const jamSeharusnyaMasuk = timeToMinutes(item.jam_seharusnya_masuk || '09:00')
            return waktuMasuk > jamSeharusnyaMasuk
          }).length
          
          // Pulang cepat = waktu_keluar < jam_seharusnya_keluar
          const pulangCepat = filteredAttendance.filter((item: any) => {
            if (!item.waktu_keluar || item.waktu_keluar === '-' || !item.jam_seharusnya_keluar) {
              return false
            }
            const waktuKeluar = timeToMinutes(item.waktu_keluar)
            const jamSeharusnyaKeluar = timeToMinutes(item.jam_seharusnya_keluar)
            return waktuKeluar < jamSeharusnyaKeluar
          }).length
          
          // Absensi tidak lengkap = hanya clock in ATAU hanya clock out
          const absensiTidakLengkap = filteredAttendance.filter((item: any) => 
            (item.waktu_masuk && !item.waktu_keluar) || (!item.waktu_masuk && item.waktu_keluar)
          ).length
          
          // 3. Total izin hari ini (termasuk multi-day leaves)
          let totalIzin = 0
          try {
            const leavesResponse = await leaveAPI.getAllLeaves()
            const allLeaves = leavesResponse.data?.leaves || []
            
            // Filter untuk leader
            let filteredLeaves = allLeaves
            if (userData.role !== 'hr' && userData.website_access) {
              filteredLeaves = allLeaves.filter((leave: any) => 
                leave.unit_kerja_id === userData.unit_kerja_id
              )
            }
            
            // Hitung izin yang mencakup hari ini (status approved)
            totalIzin = filteredLeaves.filter((leave: any) => {
              if (leave.status !== 'approved') return false
              
              const leaveStart = new Date(leave.start_date)
              const leaveEnd = new Date(leave.end_date)
              const todayDate = new Date(today)
              
              // Normalize dates to compare only date parts
              leaveStart.setHours(0, 0, 0, 0)
              leaveEnd.setHours(0, 0, 0, 0)
              todayDate.setHours(0, 0, 0, 0)
              
              return todayDate >= leaveStart && todayDate <= leaveEnd
            }).length
          } catch (error) {
            console.log('⚠️ Error fetching leaves:', error)
          }
          
          // 4. Pending izin (real-time)
          let pendingIzin = 0
          try {
            const leavesResponse = await leaveAPI.getAllLeaves()
            const allLeaves = leavesResponse.data?.leaves || []
            
            // Filter untuk leader
            let filteredLeaves = allLeaves
            if (userData.role !== 'hr' && userData.website_access) {
              filteredLeaves = allLeaves.filter((leave: any) => 
                leave.unit_kerja_id === userData.unit_kerja_id
              )
            }
            
            pendingIzin = filteredLeaves.filter((leave: any) => 
              leave.status === 'pending'
            ).length
          } catch (error) {
            console.log('⚠️ Error fetching pending leaves:', error)
          }
          
          // 5. ALPHA: Tidak hadir, tidak izin, tidak ada absensi sama sekali
          // Alpha = Total karyawan - Hadir - Izin - Pending Izin
          const alpha = Math.max(0, totalKaryawan - hadirHariIni - totalIzin)
          
          console.log('📊 Dashboard stats calculated:', {
            totalKaryawan,
            totalAdmin,
            hadirHariIni,
            tepatWaktu,
            telatMasuk,
            pulangCepat,
            totalIzin,
            pendingIzin,
            absensiTidakLengkap,
            alpha
          })
          
          setStats({
            totalKaryawan,
            totalAdmin,
            hadirHariIni,
            tepatWaktu,
            telatMasuk,
            pulangCepat,
            totalIzin,
            pendingIzin,
            absensiTidakLengkap,
            alpha
          })
          
        } else {
          // Untuk user tanpa akses dashboard
          console.log('👤 User tanpa akses dashboard, skipping fetch')
        }
      } catch (error) {
        console.error('❌ Error fetching dashboard data:', error)
        // Set default data
        setStats({
          totalKaryawan: 0,
          totalAdmin: 0,
          hadirHariIni: 0,
          tepatWaktu: 0,
          telatMasuk: 0,
          pulangCepat: 0,
          totalIzin: 0,
          pendingIzin: 0,
          absensiTidakLengkap: 0,
          alpha: 0
        })
      } finally {
        setLoading(false)
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
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Navigation Header */}
      <nav className="sticky top-0 z-50 bg-primary-500 shadow-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <img src={logo} alt="Logo Elcorps" className="w-10 h-10 rounded-lg" />
              <div>
                <h1 className="text-xl font-bold text-white">Elcorps HR</h1>
                <p className="text-xs text-white">Manajemen Absensi</p>
              </div>
            </div>
            
            {/* Time and User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-white">
                  {currentTime.toLocaleDateString('id-ID', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-sm font-mono text-white">
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              <div className="w-px h-6 bg-slate-300"></div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-primary-500 font-semibold">
                  {user?.nama?.charAt(0) || 'A'}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-medium text-white">{user?.nama || 'Admin'}</p>
                  <p className="text-xs text-white capitalize">{user?.role || 'Admin'}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            Selamat Datang, {user?.nama || 'Admin'}! 👋
          </h2>
          <p className="text-sm text-slate-600">
            {user?.role === 'hr' 
              ? 'Kelola sistem absensi dan data karyawan' 
              : `${user?.jabatan || 'Karyawan'} - ${user?.nama_unit}`
            }
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#25a298]"></div>
            <p className="mt-2 text-sm text-slate-600">Memuat dashboard...</p>
          </div>
        ) : (
          <>
            {/* Compact Stats Grid - 2 Rows */}
            {(user?.role === 'hr' || user?.website_access) && (
              <>
                {/* Row 1: 5 Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                  {/* Total Karyawan */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">👥</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">Karyawan</p>
                        <p className="text-xl font-bold text-slate-900">{stats.totalKaryawan}</p>
                      </div>
                    </div>
                  </div>

                  {/* Total Admin */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">👑</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">Admin HR</p>
                        <p className="text-xl font-bold text-slate-900">{stats.totalAdmin}</p>
                      </div>
                    </div>
                  </div>

                  {/* Hadir Hari Ini */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">✅</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">Hadir</p>
                        <p className="text-xl font-bold text-slate-900">{stats.hadirHariIni}</p>
                        <p className="text-xs text-slate-500">Clock in & out</p>
                      </div>
                    </div>
                  </div>

                  {/* Total Izin */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">📝</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">Total Izin</p>
                        <p className="text-xl font-bold text-slate-900">{stats.totalIzin}</p>
                        <p className="text-xs text-slate-500">Termasuk multi-day</p>
                      </div>
                    </div>
                  </div>

                  {/* Pending Izin */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">⏳</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">Pending</p>
                        <p className="text-xl font-bold text-slate-900">{stats.pendingIzin}</p>
                        {stats.pendingIzin > 0 && (
                          <button 
                            onClick={() => navigate('/attendance?tab=pengajuan')}
                            className="text-xs text-[#25a298] hover:underline"
                          >
                            Review →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: 5 Cards (diubah dari 4 jadi 5) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                  {/* Tepat Waktu */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">⏱️</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">Tepat Waktu</p>
                        <p className="text-xl font-bold text-slate-900">{stats.tepatWaktu}</p>
                        {stats.hadirHariIni > 0 && (
                          <p className="text-xs text-slate-500">
                            {Math.round((stats.tepatWaktu / stats.hadirHariIni) * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Telat Masuk */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">⏰</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">Telat Masuk</p>
                        <p className="text-xl font-bold text-slate-900">{stats.telatMasuk}</p>
                        {stats.hadirHariIni > 0 && (
                          <p className="text-xs text-slate-500">
                            {Math.round((stats.telatMasuk / stats.hadirHariIni) * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pulang Cepat */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">🚶‍♂️</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">Pulang Cepat</p>
                        <p className="text-xl font-bold text-slate-900">{stats.pulangCepat}</p>
                        {stats.hadirHariIni > 0 && (
                          <p className="text-xs text-slate-500">
                            {Math.round((stats.pulangCepat / stats.hadirHariIni) * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Absensi Tidak Lengkap */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">⚠️</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">Tidak Lengkap</p>
                        <p className="text-xl font-bold text-slate-900">{stats.absensiTidakLengkap}</p>
                        <p className="text-xs text-slate-500">Hanya masuk/keluar</p>
                      </div>
                    </div>
                  </div>

                  {/* ALPHA - KARYAWAN TIDAK ADA KETERANGAN */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">❌</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">Alpha</p>
                        <p className="text-xl font-bold text-slate-900">{stats.alpha}</p>
                        <p className="text-xs text-slate-500">Tidak hadir & tidak izin</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Bar */}
                <div className="bg-gradient-to-r from-[#25a298] to-[#1f8a80] rounded-lg p-4 mb-6 text-white">
                  <div className="flex flex-wrap items-center justify-between">
                    <div className="mb-2 sm:mb-0">
                      <h3 className="text-sm font-bold">Ringkasan Performa</h3>
                      <p className="text-xs opacity-90">
                        {user?.role === 'hr' ? 'Seluruh sistem' : `Unit ${user?.nama_unit}`}
                      </p>
                    </div>
                    <div className="flex space-x-6">
                      <div className="text-center">
                        <p className="text-xs opacity-90">Kehadiran</p>
                        <p className="text-lg font-bold">
                          {stats.totalKaryawan > 0 
                            ? Math.round((stats.hadirHariIni / stats.totalKaryawan) * 100) 
                            : 0}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs opacity-90">Ketepatan</p>
                        <p className="text-lg font-bold">
                          {stats.hadirHariIni > 0 
                            ? Math.round((stats.tepatWaktu / stats.hadirHariIni) * 100) 
                            : 0}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs opacity-90">Alpha</p>
                        <p className="text-lg font-bold">
                          {stats.totalKaryawan > 0 
                            ? Math.round((stats.alpha / stats.totalKaryawan) * 100) 
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Quick Actions Grid */}
            <div className="mb-6">
              {quickActions.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleNavigation(action.path)}
                      className="bg-white rounded-lg p-4 border border-slate-200 hover:border-[#25a298] transition-all duration-300 group text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#25a298] to-[#1f8a80] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                          <span className="text-lg text-white">{action.icon}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#25a298] transition-colors duration-300">
                            {action.title}
                          </h3>
                          <p className="text-xs text-slate-600">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-slate-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl text-slate-400">🔒</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">Tidak Ada Akses Menu</h3>
                  <p className="text-xs text-slate-600">Admin HR belum mengaktifkan menu untuk role Anda</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Bottom Info */}
        <div className="text-center pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Sistem v2.1.0 • {currentTime.toLocaleDateString('id-ID', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })} • <span className="text-green-600">●</span> Online
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
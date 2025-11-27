import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

interface MenuPrivilege {
  id: string
  title: string
  description: string
  enabled: boolean
  path: string
}

const Settings: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [leaders, setLeaders] = useState<any[]>([])
  const [privileges, setPrivileges] = useState<MenuPrivilege[]>([
    {
      id: 'shift-management',
      title: 'Pengaturan Shift',
      description: 'Akses untuk mengatur jadwal shift karyawan',
      enabled: true,
      path: '/shift-management'
    },
    {
      id: 'reports',
      title: 'Laporan Bulanan',
      description: 'Akses untuk melihat dan generate laporan',
      enabled: true,
      path: '/reports'
    },
    {
      id: 'attendance',
      title: 'Data Absensi',
      description: 'Akses untuk melihat rekap absensi harian',
      enabled: false,
      path: '/attendance'
    },
    {
      id: 'employee-data',
      title: 'Data Karyawan',
      description: 'Akses untuk melihat data karyawan store',
      enabled: false,
      path: '/employees'
    }
  ])

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const profileResponse = await authAPI.getProfile()
        setUser(profileResponse.data.user)
        
        if (profileResponse.data.user.role !== 'hr') {
          navigate('/dashboard')
          return
        }
        
        // Load semua leaders dan privileges dari database
        await loadLeadersAndPrivileges()
      } catch (error) {
        console.error('Error checking access:', error)
        navigate('/dashboard')
      }
    }

    checkAccess()
  }, [navigate])

  const loadLeadersAndPrivileges = async () => {
    try {
      // HANYA gunakan endpoint yang ADA - getStoreLeaders
      const leadersResponse = await authAPI.getStoreLeaders()
      const leadersData = leadersResponse.data.storeLeaders || []
      setLeaders(leadersData)
      
      if (leadersData.length > 0) {
        // Gabungkan privileges dari semua leader (ambil yang paling umum)
        const allPrivileges = new Set()
        
        // Ambil privileges dari beberapa leader sebagai sample
        const sampleLeaders = leadersData.slice(0, Math.min(3, leadersData.length))
        
        for (const leader of sampleLeaders) {
          try {
            // Gunakan endpoint yang ADA - getLeaderPrivileges
            const privilegesResponse = await authAPI.getLeaderPrivileges(leader.id)
            const leaderPrivileges = privilegesResponse.data.website_privileges || []
            leaderPrivileges.forEach((priv: string) => allPrivileges.add(priv))
          } catch (error) {
            console.error(`Error loading privileges for leader ${leader.id}:`, error)
          }
        }
        
        // Update state privileges berdasarkan data dari database
        const commonPrivileges = Array.from(allPrivileges)
        const updatedPrivileges = privileges.map(priv => ({
          ...priv,
          enabled: commonPrivileges.includes(priv.id)
        }))
        setPrivileges(updatedPrivileges)
        
        console.log('Loaded leaders:', leadersData.length, 'Common privileges:', commonPrivileges)
      } else {
        console.log('No leaders found')
      }
    } catch (error) {
      console.error('Error loading leaders:', error)
      setLeaders([])
    }
  }

  const loadStoreLeadersFallback = async () => {
    try {
      // Fallback untuk kompatibilitas - load store leaders dari endpoint lama
      const leadersResponse = await authAPI.getStoreLeaders()
      const storeLeadersData = leadersResponse.data.storeLeaders || []
      setLeaders(storeLeadersData)
      
      if (storeLeadersData.length > 0) {
        const allPrivileges = new Set()
        const sampleLeaders = storeLeadersData.slice(0, Math.min(3, storeLeadersData.length))
        
        for (const leader of sampleLeaders) {
          try {
            const privilegesResponse = await authAPI.getLeaderPrivileges(leader.id)
            const leaderPrivileges = privilegesResponse.data.website_privileges || []
            leaderPrivileges.forEach((priv: string) => allPrivileges.add(priv))
          } catch (error) {
            console.error(`Error loading privileges for leader ${leader.id}:`, error)
          }
        }
        
        const commonPrivileges = Array.from(allPrivileges)
        const updatedPrivileges = privileges.map(priv => ({
          ...priv,
          enabled: commonPrivileges.includes(priv.id)
        }))
        setPrivileges(updatedPrivileges)
      }
    } catch (error) {
      console.error('Error in fallback loading:', error)
      setLeaders([])
    }
  }

  const handleTogglePrivilege = (id: string) => {
    const updatedPrivileges = privileges.map(priv =>
      priv.id === id ? { ...priv, enabled: !priv.enabled } : priv
    )
    setPrivileges(updatedPrivileges)
  }

  const handleSavePrivileges = async () => {
    if (leaders.length === 0) {
      setMessage('Tidak ada Leader yang tersedia')
      return
    }

    setLoading(true)
    try {
      // Get enabled privileges
      const enabledPrivileges = privileges
        .filter(priv => priv.enabled)
        .map(priv => priv.id)

      console.log('💾 Saving privileges for all leaders:', {
        enabledPrivileges,
        leadersCount: leaders.length
      })

      // Update privileges untuk SEMUA Leader
      let successCount = 0
      let errorCount = 0

      for (const leader of leaders) {
        try {
          console.log(`🔄 Updating privileges for ${leader.nama} (${leader.jabatan} - ID: ${leader.id})`)
          await authAPI.updateLeaderPrivileges(leader.id, enabledPrivileges)
          successCount++
          console.log(`✅ Success for ${leader.nama}`)
        } catch (error) {
          console.error(`❌ Error updating privileges for ${leader.nama}:`, error)
          errorCount++
        }
      }

      if (errorCount === 0) {
        setMessage(`✅ Privilege berhasil disimpan untuk ${successCount} Leader!`)
      } else {
        setMessage(`⚠️ Berhasil: ${successCount}, Gagal: ${errorCount} Leader`)
      }
      
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('❌ General error saving privileges:', error)
      setMessage('❌ Gagal menyimpan privilege ke database')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPrivileges = () => {
    const defaultPrivileges = privileges.map(priv => ({
      ...priv,
      enabled: priv.id === 'shift-management' // Hanya shift-management yang enabled by default
    }))
    setPrivileges(defaultPrivileges)
    setMessage('Privilege telah direset ke default')
    setTimeout(() => setMessage(''), 3000)
  }

  // Group leaders by jabatan untuk display
  const leadersByJabatan = leaders.reduce((acc, leader) => {
    const jabatan = leader.jabatan || 'Unknown'
    if (!acc[jabatan]) {
      acc[jabatan] = []
    }
    acc[jabatan].push(leader)
    return acc
  }, {} as Record<string, any[]>)

  if (!user || user.role !== 'hr') {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-slate-600 hover:text-[#25a298] transition-colors duration-200"
              >
                <span>←</span>
                <span>Kembali</span>
              </button>
              <div className="w-px h-6 bg-slate-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-[#25a298]">Pengaturan Hak Akses</h1>
                <p className="text-sm text-slate-500">Kelola hak akses menu untuk semua Leader</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-center font-medium ${
            message.includes('berhasil') || message.includes('reset')
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Hak Akses Menu</h2>
              <p className="text-sm text-slate-500">
                Aktifkan atau nonaktifkan menu yang dapat diakses oleh Leader
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Akan berlaku untuk {leaders.length} Leader
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleResetPrivileges}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-200"
              >
                Reset Default
              </button>
              <button
                onClick={handleSavePrivileges}
                disabled={loading}
                className="px-4 py-2 bg-[#25a298] text-white rounded-lg hover:bg-[#1f8a80] transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {privileges.map((privilege) => (
              <div
                key={privilege.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-200"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{privilege.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{privilege.description}</p>
                  <p className="text-xs text-slate-400 mt-1">Path: {privilege.path}</p>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privilege.enabled}
                    onChange={() => handleTogglePrivilege(privilege.id)}
                    className="sr-only peer"
                    disabled={loading}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#25a298] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25a298]"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Leaders List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Leader yang Terpengaruh</h3>
          <div className="space-y-4">
            {Object.entries(leadersByJabatan).map(([jabatan, jabatanLeaders]) => (
              <div key={jabatan}>
                <h4 className="font-medium text-slate-700 mb-2">{jabatan} ({jabatanLeaders.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {jabatanLeaders.map((leader) => (
                    <div key={leader.id} className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-[#25a298] rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {leader.nama?.charAt(0) || 'L'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{leader.nama}</p>
                        <p className="text-xs text-slate-500">{leader.unit_kerja || 'No Unit'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-yellow-600 text-sm">ℹ️</span>
            </div>
            <div>
              <h3 className="font-medium text-yellow-800">Informasi Privilege</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Pengaturan ini akan berlaku untuk <strong>semua Leader</strong> dan disimpan langsung ke database. 
                Admin HR selalu memiliki akses penuh ke semua menu.
              </p>
              <p className="text-sm text-yellow-600 mt-2">
                <strong>Total Leader yang terpengaruh:</strong> {leaders.length} leader
                {Object.entries(leadersByJabatan).map(([jabatan, jabatanLeaders]) => 
                  `, ${jabatan}: ${jabatanLeaders.length}`
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
import React, { useState, useEffect, useRef, useMemo } from 'react'
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
  interface Leader {
    id: number;
    nama: string;
    jabatan?: string;
    unit_kerja?: string;
  }
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [openLeaderList, setOpenLeaderList] = useState(false);
  const [searchLeader, setSearchLeader] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  // Tambahkan useEffect untuk menangani klik di luar dropdown
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenLeaderList(false);
      }
    };

    // Tambahkan event listener jika dropdown terbuka
    if (openLeaderList) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // Cleanup event listener pada unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openLeaderList]);

  const filteredLeaders = useMemo(() => {
    if (!searchLeader) return leaders;
    return leaders.filter(leader => 
      leader.nama?.toLowerCase().includes(searchLeader.toLowerCase()) ||
      leader.unit_kerja?.toLowerCase().includes(searchLeader.toLowerCase()) ||
      leader.jabatan?.toLowerCase().includes(searchLeader.toLowerCase())
    );
  }, [leaders, searchLeader]);

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
  }, {} as Record<string, Leader[]>)

  if (!user || user.role !== 'hr') {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h1 className="text-xl font-bold text-[#25a298]">Pengaturan Hak Akses</h1>
                <p className="text-sm text-slate-500">Kelola hak akses menu untuk Leader</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-4 p-4 rounded-xl text-center font-medium ${
            message.includes('berhasil') || message.includes('reset')
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Hak Akses Menu - 2 Kolom Responsif */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {privileges.map((privilege) => (
                <div
                  key={privilege.id}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{privilege.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{privilege.description}</p>
                      <p className="text-xs text-slate-400 mt-1">Path: {privilege.path}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
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
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dua Kolom untuk Leader dan Informasi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kolom 1: Leader yang Terpengaruh */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Leader yang Terpengaruh</h2>
            </div>
            <div className="p-6">
              <div className="relative" ref={dropdownRef}>
                <div
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white cursor-pointer flex justify-between items-center hover:border-[#25a298] transition-colors"
                  onClick={() => { setOpenLeaderList(!openLeaderList); setSearchLeader(''); }}
                >
                  <span className="text-slate-700">Lihat daftar Leader</span>
                  <span className={`text-slate-400 transition-transform ${openLeaderList ? 'rotate-180' : ''}`}>▼</span>
                </div>
                
                {openLeaderList && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow max-h-60">
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border-b border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#25a298] rounded-t-lg"
                      placeholder="Cari nama atau unit kerja..."
                      value={searchLeader}
                      onChange={(e) => setSearchLeader(e.target.value)}
                      autoFocus
                    />
                    <div className="overflow-y-auto max-h-48">
                      {filteredLeaders.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {filteredLeaders.map((leader) => (
                            <div 
                              key={leader.id} 
                              className="px-3 py-2 hover:bg-[#25a298] hover:text-white transition-colors cursor-pointer"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{leader.nama}</p>
                                  <p className="text-xs mt-0.5 truncate">{leader.unit_kerja || 'Tidak ada unit'}</p>
                                </div>
                                <span className="text-xs whitespace-nowrap ml-2">{leader.jabatan || 'Leader'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-4 text-slate-400 text-center text-sm">Tidak ada hasil</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Ringkasan Leader per Jabatan */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Ringkasan per Jabatan:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(leadersByJabatan).map(([jabatan, jabatanLeaders]) => (
                    <div key={jabatan} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600">{jabatan}</span>
                      <span className="text-sm font-medium text-[#25a298]">{jabatanLeaders.length}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Kolom 2: Informasi Privilege */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Informasi Privilege</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-[#25a298] bg-opacity-10 rounded-lg flex items-center justify-center flex-shrink-0 mr-3">
                    <span className="text-[#25a298] text-sm">ℹ️</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800 mb-1">Cara Kerja Privilege</h3>
                    <p className="text-sm text-slate-600">
                      Pengaturan ini berlaku untuk <strong>semua Leader</strong>. Setiap perubahan akan disimpan langsung ke database dan diterapkan secara otomatis.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-[#25a298] bg-opacity-10 rounded-lg flex items-center justify-center flex-shrink-0 mr-3">
                    <span className="text-[#25a298] text-sm">👑</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800 mb-1">Akses Admin HR</h3>
                    <p className="text-sm text-slate-600">
                      Admin HR selalu memiliki akses penuh ke semua menu, terlepas dari pengaturan ini.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-[#25a298] bg-opacity-10 rounded-lg flex items-center justify-center flex-shrink-0 mr-3">
                    <span className="text-[#25a298] text-sm">🔄</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800 mb-1">Penerapan Perubahan</h3>
                    <p className="text-sm text-slate-600">
                      Perubahan akan langsung berlaku setelah disimpan. Leader perlu refresh halaman untuk melihat perubahan.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Statistik */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Statistik:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Total Leader</p>
                    <p className="text-lg font-bold text-[#25a298]">{leaders.length}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Menu Aktif</p>
                    <p className="text-lg font-bold text-[#25a298]">
                      {privileges.filter(p => p.enabled).length} dari {privileges.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
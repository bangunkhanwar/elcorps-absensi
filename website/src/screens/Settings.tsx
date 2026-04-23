import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

interface MenuPrivilege {
  id: string
  title: string
  description: string
  enabled: boolean
  path: string
  icon: string
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
      path: '/shift-management',
      icon: '🕐'
    },
    {
      id: 'attendance',
      title: 'Data Absensi',
      description: 'Akses untuk melihat rekap absensi harian',
      enabled: false,
      path: '/attendance',
      icon: '📋'
    },
    {
      id: 'employee-data',
      title: 'Data Karyawan',
      description: 'Akses untuk melihat data karyawan store',
      enabled: false,
      path: '/employees',
      icon: '👥'
    }
  ])

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenLeaderList(false);
      }
    };

    if (openLeaderList) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

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
      const leadersResponse = await authAPI.getStoreLeaders()
      const leadersData = leadersResponse.data.storeLeaders || []
      setLeaders(leadersData)

      if (leadersData.length > 0) {
        const allPrivileges = new Set()
        const sampleLeaders = leadersData.slice(0, Math.min(3, leadersData.length))

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
      const enabledPrivileges = privileges
        .filter(priv => priv.enabled)
        .map(priv => priv.id)

      let successCount = 0
      let errorCount = 0

      for (const leader of leaders) {
        try {
          await authAPI.updateLeaderPrivileges(leader.id, enabledPrivileges)
          successCount++
        } catch (error) {
          console.error(`Error updating privileges for ${leader.nama}:`, error)
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
      console.error('General error saving privileges:', error)
      setMessage('❌ Gagal menyimpan privilege ke database')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPrivileges = () => {
    const defaultPrivileges = privileges.map(priv => ({
      ...priv,
      enabled: priv.id === 'shift-management'
    }))
    setPrivileges(defaultPrivileges)
    setMessage('Privilege telah direset ke default')
    setTimeout(() => setMessage(''), 3000)
  }

  const leadersByJabatan = leaders.reduce((acc, leader) => {
    const jabatan = leader.jabatan || 'Unknown'
    if (!acc[jabatan]) acc[jabatan] = []
    acc[jabatan].push(leader)
    return acc
  }, {} as Record<string, Leader[]>)

  if (!user || user.role !== 'hr') return null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
              <div className="w-px h-6 bg-slate-300" />
              <div>
                <h1 className="text-xl font-bold text-[#25a298]">Pengaturan Hak Akses</h1>
                <p className="text-sm text-slate-500 hidden sm:block">Kelola hak akses menu untuk Leader</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Notifikasi */}
        {message && (
          <div className={`p-4 rounded-xl text-center font-medium ${
            message.includes('berhasil') || message.includes('reset')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Hak Akses Menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Hak Akses Menu</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Aktifkan atau nonaktifkan menu yang dapat diakses Leader
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Berlaku untuk <span className="font-semibold text-[#25a298]">{leaders.length}</span> Leader
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={handleResetPrivileges}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-200 text-sm"
                >
                  Reset Default
                </button>
                <button
                  onClick={handleSavePrivileges}
                  disabled={loading}
                  className="px-4 py-2 bg-[#25a298] text-white rounded-lg hover:bg-[#1f8a80] transition-colors duration-200 disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>

          {/* Grid 3 kolom di desktop, 1 kolom di mobile */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {privileges.map((privilege) => (
                <div
                  key={privilege.id}
                  className={`relative p-4 border-2 rounded-xl transition-all duration-200 ${
                    privilege.enabled
                      ? 'border-[#25a298] bg-[#25a298]/5'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Icon + Toggle */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      privilege.enabled ? 'bg-[#25a298]/15' : 'bg-slate-100'
                    }`}>
                      {privilege.icon}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privilege.enabled}
                        onChange={() => handleTogglePrivilege(privilege.id)}
                        className="sr-only peer"
                        disabled={loading}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#25a298] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25a298]" />
                    </label>
                  </div>

                  {/* Info */}
                  <h3 className="font-semibold text-slate-900 text-sm">{privilege.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{privilege.description}</p>

                  {/* Status badge */}
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      privilege.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {privilege.enabled ? '✓ Aktif' : '— Nonaktif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Baris bawah: Leader + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Leader yang Terpengaruh */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Leader yang Terpengaruh</h2>
            </div>
            <div className="p-6">
              {/* Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <div
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white cursor-pointer flex justify-between items-center hover:border-[#25a298] transition-colors"
                  onClick={() => { setOpenLeaderList(!openLeaderList); setSearchLeader(''); }}
                >
                  <span className="text-slate-700">Lihat daftar Leader ({leaders.length})</span>
                  <span className={`text-slate-400 transition-transform duration-200 ${openLeaderList ? 'rotate-180' : ''}`}>▼</span>
                </div>

                {openLeaderList && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border-b border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#25a298] rounded-t-lg"
                      placeholder="Cari nama atau unit kerja..."
                      value={searchLeader}
                      onChange={(e) => setSearchLeader(e.target.value)}
                      autoFocus
                    />
                    <div className="overflow-y-auto max-h-48">
                      {filteredLeaders.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {filteredLeaders.map((leader) => (
                            <div key={leader.id} className="px-3 py-2 hover:bg-[#25a298]/10 transition-colors">
                              <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-slate-800 truncate">{leader.nama}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 truncate">{leader.unit_kerja || 'Tidak ada unit'}</p>
                                </div>
                                <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{leader.jabatan || 'Leader'}</span>
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

              {/* Ringkasan per Jabatan */}
              {Object.keys(leadersByJabatan).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Ringkasan per Jabatan:</h3>
                  <div className="space-y-2">
                    {Object.entries(leadersByJabatan).map(([jabatan, jabatanLeaders]) => (
                      <div key={jabatan} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600 truncate">{jabatan}</span>
                        <span className="text-sm font-semibold text-[#25a298] ml-2 flex-shrink-0">{jabatanLeaders.length} orang</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informasi Privilege */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Informasi</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                {
                  icon: 'ℹ️',
                  title: 'Cara Kerja Privilege',
                  desc: 'Pengaturan ini berlaku untuk semua Leader. Perubahan disimpan langsung ke database dan diterapkan otomatis.'
                },
                {
                  icon: '👑',
                  title: 'Akses Admin HR',
                  desc: 'Admin HR selalu memiliki akses penuh ke semua menu, terlepas dari pengaturan ini.'
                },
                {
                  icon: '🔄',
                  title: 'Penerapan Perubahan',
                  desc: 'Perubahan langsung berlaku setelah disimpan. Leader perlu refresh halaman untuk melihat perubahan.'
                }
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#25a298]/10 rounded-xl flex items-center justify-center flex-shrink-0 text-base">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800 text-sm">{item.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}

              {/* Statistik */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Statistik:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl text-center">
                    <p className="text-xs text-slate-500 mb-1">Total Leader</p>
                    <p className="text-2xl font-bold text-[#25a298]">{leaders.length}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl text-center">
                    <p className="text-xs text-slate-500 mb-1">Menu Aktif</p>
                    <p className="text-2xl font-bold text-[#25a298]">
                      {privileges.filter(p => p.enabled).length}
                      <span className="text-sm font-normal text-slate-400"> / {privileges.length}</span>
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
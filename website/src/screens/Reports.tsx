import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

interface ReportData {
  id: number
  nama: string
  nik: string
  unit_kerja: string
  total_hari_kerja: number
  total_hadir: number
  total_telat: number
  total_izin: number
  total_cuti: number
  total_alpha: number
  persentase_kehadiran: number
}

interface ReportSummary {
  totalKaryawan: number
  rataRataKehadiran: number
  totalIzin: number
  totalAlpha: number
  totalHadir: number
  totalTelat: number
}

const Reports: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [selectedUnit, setSelectedUnit] = useState<string>('all')
  const [openUnitDropdown, setOpenUnitDropdown] = useState(false)
  const [searchUnit, setSearchUnit] = useState('')
  const unitDropdownRef = useRef<HTMLDivElement>(null)
  const unitSearchRef = useRef<HTMLInputElement>(null)
  const [unitKerja, setUnitKerja] = useState<any[]>([])
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [summary, setSummary] = useState<ReportSummary>({
    totalKaryawan: 0,
    rataRataKehadiran: 0,
    totalIzin: 0,
    totalAlpha: 0,
    totalHadir: 0,
    totalTelat: 0
  })

  const filteredUnits = unitKerja.filter(unit =>
    unit.nama_unit.toLowerCase().includes(searchUnit.toLowerCase()) ||
    (unit.kode_unit && unit.kode_unit.toLowerCase().includes(searchUnit.toLowerCase()))
  )

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const profileResponse = await authAPI.getProfile()
        setUser(profileResponse.data.user)
        
        if (profileResponse.data.user.role === 'leader_store') {
          const privileges = JSON.parse(localStorage.getItem('leader_store_privileges') || '[]')
          const hasAccess = privileges.find((p: any) => p.path === '/reports' && p.enabled)
          if (!hasAccess) {
            navigate('/dashboard')
            return
          }
        }
        
        if (profileResponse.data.user.role === 'hr') {
          const unitsResponse = await authAPI.getAllUnitKerja()
          setUnitKerja(unitsResponse.data || [])
        }
        
        fetchReportData()
      } catch (error) {
        console.error('Error checking access:', error)
        navigate('/dashboard')
      }
    }

    checkAccess()
  }, [navigate])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // TODO: Ganti dengan API real
      // Contoh: const response = await reportsAPI.getMonthlyReport(selectedMonth, selectedUnit)
      
      // Untuk sementara kosongkan data sampai API ready
      setReportData([])
      setSummary({
        totalKaryawan: 0,
        rataRataKehadiran: 0,
        totalIzin: 0,
        totalAlpha: 0,
        totalHadir: 0,
        totalTelat: 0
      })

      console.log('Fetching report for:', { selectedMonth, selectedUnit })
      
    } catch (error) {
      console.error('Error fetching report data:', error)
      setReportData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchReportData()
    }
  }, [selectedMonth, selectedUnit, user])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) {
        setOpenUnitDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (openUnitDropdown && unitSearchRef.current) {
      unitSearchRef.current.focus()
    }
  }, [openUnitDropdown])

  const handleExport = async () => {
    try {
      // TODO: Implement export to Excel
      console.log('Exporting data for:', selectedMonth)
      // Contoh: await reportsAPI.exportMonthlyReport(selectedMonth, selectedUnit)
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  const formatMonth = (monthString: string) => {
    const date = new Date(monthString + '-01')
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  }

  if (!user) {
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
                <h1 className="text-2xl font-bold text-[#25a298]">Rekapitulasi Bulanan</h1>
                <p className="text-sm text-slate-500">Rekap absensi karyawan per bulan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Bagian kiri: filter bulan dan unit kerja */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
              {/* Filter Bulan */}
              <div className="w-full md:w-auto min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-2">Bulan</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] text-sm"
                />
              </div>

              {/* Filter Unit Kerja (hanya untuk HR) */}
              {user?.role === 'hr' && (
                <div className="w-full md:w-auto min-w-[250px]">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unit Kerja</label>
                  <div className="relative" ref={unitDropdownRef}>
                    <div
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] text-sm"
                      onClick={() => setOpenUnitDropdown(!openUnitDropdown)}
                    >
                      <span className="text-slate-900 flex-1 truncate">
                        {selectedUnit === 'all' 
                          ? 'Semua Unit' 
                          : unitKerja.find(u => u.id.toString() === selectedUnit)?.nama_unit || 'Pilih Unit'}
                      </span>
                      <span className="text-slate-400 flex-shrink-0">{openUnitDropdown ? '▲' : '▼'}</span>
                    </div>

                    {/* Dropdown options (tanpa perubahan) */}
                    {openUnitDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                        <div className="p-2 border-b border-slate-200">
                          <input
                            ref={unitSearchRef}
                            type="text"
                            placeholder="Cari unit kerja..."
                            value={searchUnit}
                            onChange={(e) => setSearchUnit(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298]"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          <div
                            className="px-4 py-2 cursor-pointer hover:bg-green-100 border-b border-slate-100 text-sm"
                            onClick={() => {
                              setSelectedUnit('all')
                              setOpenUnitDropdown(false)
                              setSearchUnit('')
                            }}
                          >
                            Semua Unit
                          </div>
                          {filteredUnits.length > 0 ? (
                            filteredUnits.map((unit) => (
                              <div
                                key={unit.id}
                                className={`px-4 py-2 cursor-pointer hover:bg-green-100 border-b border-slate-100 last:border-b-0 ${
                                  selectedUnit === unit.id.toString() ? 'bg-[#25a298] text-white hover:bg-[#1f8a80]' : ''
                                }`}
                                onClick={() => {
                                  setSelectedUnit(unit.id.toString())
                                  setOpenUnitDropdown(false)
                                  setSearchUnit('')
                                }}
                              >
                                <div className="text-sm font-medium">{unit.nama_unit}</div>
                                {unit.kode_unit && (
                                  <div className={`text-xs ${selectedUnit === unit.id.toString() ? 'text-blue-100' : 'text-slate-500'}`}>
                                    {unit.kode_unit}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-center text-slate-500 text-sm">
                              Tidak ada unit yang sesuai
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Export */}
            <button
              onClick={handleExport}
              disabled={reportData.length === 0}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base w-full sm:w-auto ${
                reportData.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#25a298] text-white hover:bg-[#1f8a80] active:bg-[#1a756b]'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Karyawan</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{summary.totalKaryawan}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <span className="text-xl text-[#25a298]">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Rata-rata Kehadiran</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{summary.rataRataKehadiran}%</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <span className="text-xl text-[#25a298]">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Izin</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{summary.totalIzin}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                <span className="text-xl text-[#25a298]">📝</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Alpha</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{summary.totalAlpha}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <span className="text-xl text-[#25a298]">❌</span>
              </div>
            </div>
          </div>
        </div>

        {/* Report Table */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#25a298]"></div>
            <p className="mt-2 text-slate-600">Memuat data laporan...</p>
          </div>
        ) : reportData.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Rekap Bulan {formatMonth(selectedMonth)}
              </h3>
              <p className="text-sm text-slate-500">
                Detail kehadiran karyawan per individu
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nama</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">NIK</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit Kerja</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hari Kerja</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hadir</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Terlambat</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Izin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cuti</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Alpha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.nama}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.nik}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.unit_kerja}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">{item.total_hari_kerja}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">{item.total_hadir}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">{item.total_telat}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">{item.total_izin}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">{item.total_cuti}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">{item.total_alpha}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.persentase_kehadiran >= 90 ? 'bg-green-100 text-green-800' :
                          item.persentase_kehadiran >= 80 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.persentase_kehadiran}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="text-2xl text-slate-400">📊</span>
            </div>
            <h3 className="font-bold text-lg mb-2 text-slate-900">Belum Ada Data Laporan</h3>
            <p className="text-slate-600">
              {loading ? 'Memuat data...' : 'Tidak ada data laporan untuk periode yang dipilih'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports
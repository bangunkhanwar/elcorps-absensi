import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { attendanceAPI, leaveAPI, authAPI } from '../../services/api'
import PengajuanIzin from './PengajuanIzin'
import * as XLSX from 'xlsx'

interface AttendanceData {
  id: number
  no: number
  nama: string
  unit_kerja: string
  unit_kerja_id?: number
  tipe_unit?: string
  jamMasuk: string
  jamPulang: string
  status: 'tepat_waktu' | 'telat_masuk' | 'pulang_cepat' | 'telat_masuk_pulang_cepat' | 'tidak_lengkap' | 'izin' | 'alpha' | 'day_off'
  nik: string
  jabatan: string
  departemen: string
  divisi: string
  lokasi: string
  lokasi_masuk: string
  lokasi_keluar: string
  keteranganIzin?: string
  foto_masuk: string
  foto_keluar: string
  tanggal_absen: string
}

interface UnitKerja {
  id: number
  nama_unit: string
  tipe_unit: string
  kode_unit: string
}

// Tipe filter unit — sesuai nilai di DB
type TipeFilter = 'semua' | 'head_office' | 'store'

const Absensi: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Tab
  const [activeTab, setActiveTab] = useState<'data' | 'pengajuan'>(() => {
    return (sessionStorage.getItem('absensiActiveTab') as 'data' | 'pengajuan') || 'data'
  })

  // Review mode (dari Dashboard)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewCategory, setReviewCategory] = useState('')
  const [reviewData, setReviewData] = useState<any[]>([])

  // Date range
  const [startDate, setStartDate] = useState<string>(() => {
    return sessionStorage.getItem('absensiStartDate') || new Date().toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return sessionStorage.getItem('absensiEndDate') || new Date().toISOString().split('T')[0]
  })

  // Filter unit kerja
  const [selectedTipe, setSelectedTipe] = useState<TipeFilter>('semua')
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null)
  const [unitKerjaList, setUnitKerjaList] = useState<UnitKerja[]>([])

  // Data
  const [searchData, setSearchData] = useState('')
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(false)
  const [currentDataPage, setCurrentDataPage] = useState(() => {
    return parseInt(sessionStorage.getItem('absensiDataPage') || '1')
  })
  const itemsPerPage = 10

  // isEmployeeOnlyView untuk review mode
  const isEmployeeOnlyView = reviewMode && (
    reviewCategory === 'alpha' ||
    reviewCategory === 'totalIzin' ||
    reviewCategory === 'pendingIzin' ||
    reviewCategory === 'hadirHariIni'
  )

  // Baca query params untuk review mode dari Dashboard
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search)
    const reviewParam = queryParams.get('review')
    const dateParam = queryParams.get('date')

    if (reviewParam) {
      setReviewMode(true)
      setReviewCategory(reviewParam)
      const categoryTitles: { [key: string]: string } = {
        'alpha':               'Karyawan Alpha (Tidak Hadir & Tidak Izin)',
        'tepatWaktu':         'Karyawan Tepat Waktu',
        'telatMasuk':         'Karyawan Terlambat Masuk',
        'pulangCepat':        'Karyawan Pulang Cepat',
        'hadirHariIni':       'Karyawan Hadir Hari Ini',
        'absensiTidakLengkap':'Absensi Tidak Lengkap',
        'totalIzin':          'Karyawan Izin Hari Ini',
        'pendingIzin':        'Pengajuan Izin Pending'
      }
      setReviewTitle(categoryTitles[reviewParam] || `Review: ${reviewParam}`)
      const storedData = localStorage.getItem(`review_${reviewParam}`)
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)
          setReviewData(parsedData.employees || [])
        } catch (e) {
          console.error('Error parsing review data:', e)
        }
      }
      if (dateParam) {
        setStartDate(dateParam)
        setEndDate(dateParam)
        sessionStorage.setItem('absensiStartDate', dateParam)
        sessionStorage.setItem('absensiEndDate', dateParam)
      }
    } else {
      setReviewMode(false)
      setReviewCategory('')
      setReviewTitle('')
      setReviewData([])
    }
  }, [location.search])

  // Persist tab & page
  useEffect(() => {
    sessionStorage.setItem('absensiActiveTab', activeTab)
    sessionStorage.setItem('absensiDataPage', currentDataPage.toString())
  }, [activeTab, currentDataPage])

  // Persist dates
  useEffect(() => {
    sessionStorage.setItem('absensiStartDate', startDate)
    sessionStorage.setItem('absensiEndDate', endDate)
  }, [startDate, endDate])

  // Load unit kerja list
  useEffect(() => {
    fetchUnitKerja()
  }, [])

  // Fetch data saat tanggal berubah atau keluar review mode
  useEffect(() => {
    if (!reviewMode) {
      fetchAllData()
    }
  }, [startDate, endDate, reviewMode])

  // Reset page saat filter/search berubah
  useEffect(() => {
    setCurrentDataPage(1)
  }, [startDate, endDate, selectedTipe, selectedUnitId, searchData])

  const fetchUnitKerja = async () => {
    try {
      const response = await authAPI.getAllUnitKerja()
      console.log('📍 getAllUnitKerja raw response:', response)

      // Handle berbagai format response:
      // 1. axios: response.data (array langsung)
      // 2. axios: response.data.unit_kerja
      // 3. intercepted: response langsung array
      // 4. intercepted: response.unit_kerja
      let units: any[] = []

      if (Array.isArray(response)) {
        units = response;
      } else if (Array.isArray((response as any)?.data)) {
        units = (response as any).data;
      } else if (Array.isArray((response as any)?.data?.unit_kerja)) {
        units = (response as any).data.unit_kerja;
      } else if (Array.isArray((response as any)?.unit_kerja)) {
        units = (response as any).unit_kerja;
      } else if ((response as any)?.data && typeof (response as any).data === 'object') {
        const firstArray = Object.values((response as any).data).find((v) => Array.isArray(v));
        if (firstArray) units = firstArray as any[];
      }

      console.log('📍 Unit kerja parsed:', units.length, 'items')
      console.log('📍 Sample item:', units[0])
      setUnitKerjaList(units)
    } catch (error) {
      console.error('Error fetching unit kerja:', error)
    }
  }

  const formatTimeFromString = (timeString: string): string => {
    if (!timeString || timeString === 'null' || timeString === 'undefined') return '-'
    if (timeString === '00:00:00' || timeString === '00:00') return '-'
    if (timeString.includes(':')) {
      const parts = timeString.split(':')
      if (parts.length >= 2) {
        const h = parts[0].padStart(2, '0')
        const m = parts[1].padStart(2, '0')
        if (h === '00' && m === '00') return '-'
        return `${h}:${m}`
      }
    }
    return timeString
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)

      // Fetch semua data paralel
      const [usersRes, attendanceRes, leaveRes] = await Promise.allSettled([
        authAPI.getAllUsers(),
        attendanceAPI.getAll(startDate, endDate),
        leaveAPI.getAllLeaves()
      ])

      // Users
      const allUsers: any[] = usersRes.status === 'fulfilled'
        ? (usersRes.value?.data?.users || usersRes.value?.data || usersRes.value || [])
        : []

      // Absensi
      const attendances: any[] = attendanceRes.status === 'fulfilled'
        ? (attendanceRes.value?.data?.attendances || [])
        : []

      // Izin approved yang mencakup periode
      const allLeaves: any[] = leaveRes.status === 'fulfilled'
        ? (leaveRes.value?.data?.leaves || [])
        : []

      const periodStart = new Date(startDate)
      const periodEnd = new Date(endDate)
      periodStart.setHours(0, 0, 0, 0)
      periodEnd.setHours(23, 59, 59, 999)

      const approvedLeaves = allLeaves.filter((leave: any) => {
        if (leave.status !== 'approved') return false
        const ls = new Date(leave.start_date)
        const le = new Date(leave.end_date)
        ls.setHours(0, 0, 0, 0)
        le.setHours(23, 59, 59, 999)
        return ls <= periodEnd && le >= periodStart
      })

      // Map absensi & izin by user_id
      const attendanceMap = new Map<number, any>()
      attendances.forEach((att: any) => attendanceMap.set(att.user_id, att))

      const leaveMap = new Map<number, any>()
      approvedLeaves.forEach((leave: any) => {
        if (leave.user_id) leaveMap.set(leave.user_id, leave)
      })

      // Gabungkan: semua karyawan (exclude HR) + status absensi mereka
      const combined: AttendanceData[] = allUsers
        .filter((user: any) => user.role !== 'hr')
        .map((user: any, index: number) => {
          const att = attendanceMap.get(user.id)
          const leave = leaveMap.get(user.id)

          let status: AttendanceData['status']
          if (att) {
            const dbStatus = normalizeStatus(att.status)
            // Day Off langsung dari DB — tidak dioverride oleh izin
            if (dbStatus === 'day_off') {
              status = 'day_off'
            } else {
              const hasLeave = approvedLeaves.some(
                (l: any) => (l.user_id === user.id || l.nik === user.nik)
              )
              status = hasLeave ? 'izin' : (dbStatus as AttendanceData['status'])
            }
          } else if (leave) {
            status = 'izin'
          } else {
            status = 'alpha'
          }

          // Ambil info unit kerja dari unitKerjaList jika tersedia
          const unitInfo = unitKerjaList.find(u => u.id === user.unit_kerja_id)

          return {
            id: att?.id || -(user.id),
            no: index + 1,
            nama: user.nama || '-',
            unit_kerja: user.nama_unit || unitInfo?.nama_unit || '-',
            unit_kerja_id: user.unit_kerja_id,
            tipe_unit: unitInfo?.tipe_unit || user.tipe_unit || '',
            jamMasuk: att ? formatTimeFromString(att.waktu_masuk_jakarta || att.waktu_masuk) : '-',
            jamPulang: att ? formatTimeFromString(att.waktu_keluar_jakarta || att.waktu_keluar) : '-',
            status,
            nik: user.nik || '-',
            jabatan: user.jabatan || '-',
            departemen: user.departemen || '-',
            divisi: user.divisi || '-',
            lokasi: att?.location || user.nama_unit || '-',
            lokasi_masuk: att?.lokasi_masuk || att?.location || user.nama_unit || '-',
            lokasi_keluar: att?.lokasi_keluar || '-',
            keteranganIzin: leave?.keterangan || '',
            foto_masuk: att?.foto_masuk || '',
            foto_keluar: att?.foto_keluar || '',
            tanggal_absen: att?.tanggal_absen || startDate
          }
        })

      setAttendanceData(combined)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      setAttendanceData([])
    } finally {
      setLoading(false)
    }
  }

  // Normalisasi status dari DB (lowercase snake_case)
  const normalizeStatus = (status: string): string => {
    if (!status) return 'tepat_waktu'
    return status.toLowerCase().trim()
  }

  const getDisplayStatus = (dbStatus: string): string => normalizeStatus(dbStatus)

  // Data source: review mode atau normal
  const getDataSource = (): AttendanceData[] => {
    if (reviewMode && reviewData.length > 0) {
      return reviewData.map((item: any, index: number) => ({
        id: item.id || -index,
        no: index + 1,
        nama: item.nama || '-',
        unit_kerja: item.unit_kerja || '-',
        unit_kerja_id: item.unit_kerja_id,
        tipe_unit: item.tipe_unit || '',
        jamMasuk: item.waktu_masuk || item.jamMasuk || '-',
        jamPulang: item.waktu_keluar || item.jamPulang || '-',
        status: getReviewStatus(item, reviewCategory) as AttendanceData['status'],
        nik: item.nik || '-',
        jabatan: item.jabatan || '-',
        departemen: item.departemen || '-',
        divisi: item.divisi || '-',
        lokasi: item.unit_kerja || '-',
        lokasi_masuk: item.lokasi_masuk || item.unit_kerja || '-',
        lokasi_keluar: item.lokasi_keluar || '-',
        keteranganIzin: item.keterangan || item.keteranganIzin || '',
        foto_masuk: item.foto_masuk || '',
        foto_keluar: item.foto_keluar || '',
        tanggal_absen: item.tanggal_absen || startDate
      }))
    }
    return attendanceData
  }

  const getReviewStatus = (item: any, category: string): string => {
    switch (category) {
      case 'alpha':               return 'alpha'
      case 'tepatWaktu':         return 'tepat_waktu'
      case 'telatMasuk':         return 'telat_masuk'
      case 'pulangCepat':        return 'pulang_cepat'
      case 'hadirHariIni':       return getDisplayStatus(item.status || 'tepat_waktu')
      case 'absensiTidakLengkap': return 'tidak_lengkap'
      case 'totalIzin':          return 'izin'
      case 'pendingIzin':        return 'izin'
      default:                   return getDisplayStatus(item.status || 'tepat_waktu')
    }
  }

  // Daftar store untuk dropdown — nilai DB: 'store'
  // Filter unit kerja bertipe store — nilai DB: 'store' (lowercase)
  const storeUnits = unitKerjaList.filter(u => {
    const tipe = (u.tipe_unit || '').toLowerCase().trim()
    return tipe === 'store'
  })

  // Filter berdasarkan tipe unit & unit spesifik — nilai DB: 'head_office' | 'store'
  const applyUnitFilter = (data: AttendanceData[]): AttendanceData[] => {
    if (reviewMode) return data
    if (selectedTipe === 'head_office') {
      return data.filter(item => {
        const unit = unitKerjaList.find(u => u.id === item.unit_kerja_id)
        return unit?.tipe_unit?.toLowerCase() === 'head_office'
      })
    }
    if (selectedTipe === 'store') {
      if (selectedUnitId) {
        return data.filter(item => item.unit_kerja_id === selectedUnitId)
      }
      return data.filter(item => {
        const unit = unitKerjaList.find(u => u.id === item.unit_kerja_id)
        return unit?.tipe_unit?.toLowerCase() === 'store'
      })
    }
    return data
  }

  const dataSource = getDataSource()

  const filteredAttendanceData = applyUnitFilter(dataSource)
    .filter(item =>
      item.nama.toLowerCase().includes(searchData.toLowerCase()) ||
      item.nik.toLowerCase().includes(searchData.toLowerCase()) ||
      item.unit_kerja.toLowerCase().includes(searchData.toLowerCase())
    )
    .sort((a, b) => a.nama.localeCompare(b.nama))

  const totalDataPages = Math.ceil(filteredAttendanceData.length / itemsPerPage)
  const startDataIndex = (currentDataPage - 1) * itemsPerPage
  const paginatedAttendanceData = filteredAttendanceData.slice(startDataIndex, startDataIndex + itemsPerPage)

  const handleDataPageChange = (newPage: number) => setCurrentDataPage(newPage)
  const handlePrevPage = () => currentDataPage > 1 && setCurrentDataPage(p => p - 1)
  const handleNextPage = () => currentDataPage < totalDataPages && setCurrentDataPage(p => p + 1)

  const handleViewDetail = (attendance: AttendanceData) => {
    sessionStorage.setItem('absensiStartDate', startDate)
    navigate('/attendance/detail', { state: { attendance } })
  }

  // Status helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'tepat_waktu':              return 'bg-green-100 text-green-800'
      case 'telat_masuk':              return 'bg-yellow-100 text-yellow-800'
      case 'pulang_cepat':             return 'bg-orange-100 text-orange-800'
      case 'telat_masuk_pulang_cepat': return 'bg-red-100 text-red-800'
      case 'tidak_lengkap':            return 'bg-gray-100 text-gray-800'
      case 'izin':                     return 'bg-blue-100 text-blue-800'
      case 'alpha':                    return 'bg-red-50 text-red-400'
      case 'day_off':                  return 'bg-purple-100 text-purple-700'
      default:                         return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'tepat_waktu':              return 'Tepat Waktu'
      case 'telat_masuk':              return 'Telat Masuk'
      case 'pulang_cepat':             return 'Pulang Cepat'
      case 'telat_masuk_pulang_cepat': return 'Telat Masuk + Pulang Cepat'
      case 'tidak_lengkap':            return 'Tidak Lengkap'
      case 'izin':                     return 'Izin'
      case 'alpha':                    return 'Alpha'
      case 'day_off':                  return 'Day Off'
      default:                         return status
    }
  }

  const formatDateRange = () => {
    if (startDate === endDate) {
      return new Date(startDate).toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
    }
    const s = new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    const e = new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${s} — ${e}`
  }

  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString('id-ID', {
  //     weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  //   })
  // }

  // Stats dari data yang sudah difilter
  const getStats = () => {
    const data = reviewMode ? reviewData : filteredAttendanceData
    return {
      hadir:    data.filter((i: any) => ['tepat_waktu','telat_masuk','pulang_cepat','telat_masuk_pulang_cepat','tidak_lengkap'].includes(i.status)).length,
      telat:    data.filter((i: any) => ['telat_masuk','telat_masuk_pulang_cepat'].includes(i.status)).length,
      izin:     data.filter((i: any) => i.status === 'izin').length,
      alpha:    data.filter((i: any) => i.status === 'alpha').length,
      day_off:  data.filter((i: any) => i.status === 'day_off').length,
      total:    data.length,
    }
  }
  const stats = getStats()

  // Label filter aktif
  const getActiveFilterLabel = () => {
    if (selectedTipe === 'head_office') return 'Head Office'
    if (selectedTipe === 'store') {
      if (selectedUnitId) {
        return unitKerjaList.find(u => u.id === selectedUnitId)?.nama_unit || 'Store'
      }
      return 'Semua Store'
    }
    return 'Semua Unit'
  }

  // Export Excel — sesuai data yang ditampilkan
  const exportToExcel = () => {
    const dataToExport = filteredAttendanceData.map((item, index) => ({
      'NO':            index + 1,
      'NAMA':          item.nama,
      'NIK':           item.nik,
      'JABATAN':       item.jabatan,
      'DEPARTEMEN':    item.departemen,
      'DIVISI':        item.divisi,
      'UNIT KERJA':    item.unit_kerja,
      'TANGGAL':       item.tanggal_absen,
      'JAM MASUK':     item.jamMasuk,
      'JAM PULANG':    item.jamPulang,
      'STATUS':        getStatusText(item.status),
      'LOKASI MASUK':  item.lokasi_masuk || '-',
      'LOKASI KELUAR': item.lokasi_keluar || '-',
      'KETERANGAN':    item.keteranganIzin || '',
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Absensi')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    })

    const unitLabel = selectedUnitId
      ? (unitKerjaList.find(u => u.id === selectedUnitId)?.nama_unit || 'unit').replace(/\s+/g, '_')
      : selectedTipe !== 'semua' ? selectedTipe : 'semua_unit'

    const fileName = reviewMode
      ? `absensi_${reviewCategory}_${startDate}.xlsx`
      : `absensi_${unitLabel}_${startDate}${startDate !== endDate ? '_sd_' + endDate : ''}.xlsx`

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleExitReview = () => {
    navigate('/attendance')
    setReviewMode(false)
    setReviewData([])
    localStorage.removeItem(`review_${reviewCategory}`)
  }

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
                <h1 className="text-2xl font-bold text-[#25a298]">
                  {reviewMode ? `Review: ${reviewTitle}` : 'Data Absensi'}
                </h1>
                <p className="text-sm text-slate-500">
                  {reviewMode ? 'Data berdasarkan kategori' : 'Kelola absensi dan pengajuan izin'}
                </p>
              </div>
            </div>
            {reviewMode && (
              <button
                onClick={handleExitReview}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors duration-200 border border-red-200 text-xs sm:text-sm"
              >
                Keluar Review Mode
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8">
          {/* Tab */}
          {!reviewMode ? (
            <div className="flex border-b border-slate-200">
              {(['data', 'pengajuan'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-300 ${
                    activeTab === tab
                      ? 'text-[#25a298] border-b-2 border-[#25a298]'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'data' ? 'Absensi' : 'Pengajuan Izin'}
                </button>
              ))}
            </div>
          ) : (
            <div className="border-b border-slate-200">
              <div className="py-4 px-6 text-center font-medium text-[#25a298] border-b-2 border-[#25a298]">
                Absensi Review
              </div>
            </div>
          )}

          <div className="p-6">
            {(reviewMode || activeTab === 'data') && (
              <div>
                {/* Toolbar */}
                <div className="mb-6 space-y-3">

                  {/* Baris 1: Info periode + tombol filter tipe */}
                  {!reviewMode && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Label periode */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Periode</p>
                        <p className="text-base font-semibold text-slate-800 truncate">{formatDateRange()}</p>
                      </div>

                      {/* Tombol filter: Semua | HO | STORE */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => { setSelectedTipe('semua'); setSelectedUnitId(null) }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                            selectedTipe === 'semua'
                              ? 'bg-[#25a298] text-white border-[#25a298]'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-[#25a298] hover:text-[#25a298]'
                          }`}
                        >
                          Semua
                        </button>
                        <button
                          onClick={() => { setSelectedTipe('head_office'); setSelectedUnitId(null) }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                            selectedTipe === 'head_office'
                              ? 'bg-[#25a298] text-white border-[#25a298]'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-[#25a298] hover:text-[#25a298]'
                          }`}
                        >
                          HO
                        </button>
                        <button
                          onClick={() => { setSelectedTipe('store'); setSelectedUnitId(null) }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                            selectedTipe === 'store'
                              ? 'bg-[#25a298] text-white border-[#25a298]'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-[#25a298] hover:text-[#25a298]'
                          }`}
                        >
                          Store
                        </button>

                        {/* Dropdown pilih store spesifik — muncul hanya jika pilih Store */}
                        {selectedTipe === 'store' && (
                          <div className="relative">
                            {storeUnits.length === 0 ? (
                              <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400">
                                Memuat store...
                              </div>
                            ) : (
                              <>
                                <select
                                  value={selectedUnitId || ''}
                                  onChange={(e) => setSelectedUnitId(e.target.value ? Number(e.target.value) : null)}
                                  className="pl-3 pr-8 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] text-sm text-slate-700 bg-white appearance-none cursor-pointer max-w-[220px]"
                                >
                                  <option value="">Semua Store ({storeUnits.length})</option>
                                  {storeUnits
                                    .sort((a, b) => a.nama_unit.localeCompare(b.nama_unit))
                                    .map(unit => (
                                      <option key={unit.id} value={unit.id}>
                                        {unit.nama_unit}
                                      </option>
                                    ))
                                  }
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Baris 2: Range tanggal + search + export */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Range tanggal */}
                    {!reviewMode && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value)
                            if (e.target.value > endDate) setEndDate(e.target.value)
                          }}
                          className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] text-sm"
                        />
                        <span className="text-slate-400 text-sm flex-shrink-0">s/d</span>
                        <input
                          type="date"
                          value={endDate}
                          min={startDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] text-sm"
                        />
                      </div>
                    )}

                    {/* Search */}
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder="Cari nama, NIK, atau unit kerja..."
                        value={searchData}
                        onChange={(e) => setSearchData(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] text-sm"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</div>
                    </div>

                    {/* Export Excel */}
                    <button
                      onClick={exportToExcel}
                      disabled={filteredAttendanceData.length === 0}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium flex-shrink-0 ${
                        filteredAttendanceData.length === 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-[#25a298] text-white hover:bg-[#1f8a80] active:bg-[#1a7a70]'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export Excel</span>
                    </button>
                  </div>

                  {/* Tag filter aktif */}
                  {!reviewMode && (selectedTipe !== 'semua' || startDate !== endDate) && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTipe !== 'semua' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#25a298]/10 text-[#25a298] rounded-full text-xs font-medium">
                          🏢 {getActiveFilterLabel()}
                          <button
                            onClick={() => { setSelectedTipe('semua'); setSelectedUnitId(null) }}
                            className="hover:text-[#1f8a80] font-bold ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {startDate !== endDate && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                          📅 {startDate} — {endDate}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Cards Statistik */}
                {!reviewMode && (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                    {[
                      { label: 'Hadir',      value: stats.hadir,    icon: '✅', color: 'bg-green-50' },
                      { label: 'Telat Masuk',value: stats.telat,    icon: '⏰', color: 'bg-yellow-50' },
                      { label: 'Izin',       value: stats.izin,     icon: '📝', color: 'bg-blue-50' },
                      { label: 'Day Off',    value: stats.day_off,  icon: '🌴', color: 'bg-purple-50' },
                      { label: 'Alpha',      value: stats.alpha,    icon: '❌', color: 'bg-red-50' },
                      { label: 'Total',      value: stats.total,    icon: '👥', color: 'bg-slate-50' },
                    ].map(card => (
                      <div key={card.label} className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-slate-500">{card.label}</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                          </div>
                          <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center`}>
                            <span className="text-lg">{card.icon}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tabel */}
                {loading && !reviewMode ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#25a298]" />
                    <p className="mt-2 text-slate-600">Memuat data...</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nama</th>
                            {isEmployeeOnlyView ? (
                              <>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">NIK</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Departemen</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Divisi</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit Kerja</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                              </>
                            ) : (
                              <>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit Kerja</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Jam Masuk</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Jam Pulang</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {paginatedAttendanceData.map((item, index) => (
                            <tr
                              key={`${item.id}-${index}`}
                              className={`hover:bg-slate-50 transition-colors duration-150 ${
                                item.status === 'alpha' ? 'opacity-60' :
                                item.status === 'day_off' ? 'bg-purple-50/50' : ''
                              }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{startDataIndex + index + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{item.nama}</div>
                                <div className="text-xs text-slate-500">{item.nik}</div>
                              </td>
                              {isEmployeeOnlyView ? (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.nik}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.departemen}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.divisi}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.unit_kerja}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                      {getStatusText(item.status)}
                                    </span>
                                    {item.keteranganIzin && (
                                      <div className="text-xs text-gray-500 mt-1">{item.keteranganIzin}</div>
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.unit_kerja}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.jamMasuk}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.jamPulang}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                      {getStatusText(item.status)}
                                    </span>
                                    {item.keteranganIzin && (
                                      <div className="text-xs text-gray-500 mt-1">{item.keteranganIzin}</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {(item.status !== 'alpha' && item.status !== 'day_off') ? (
                                      <button
                                        onClick={() => handleViewDetail(item)}
                                        className="text-[#25a298] hover:text-[#1f8a80] transition-colors duration-200 font-medium"
                                      >
                                        Detail
                                      </button>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {filteredAttendanceData.length === 0 && !loading && (
                      <div className="px-6 py-12 text-center">
                        <p className="text-2xl mb-2">📊</p>
                        <p className="text-slate-600">
                          {reviewMode ? 'Tidak ada data untuk kategori ini' : 'Tidak ada data untuk filter yang dipilih'}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                          {reviewMode ? 'Data mungkin belum tersedia' : 'Coba ubah periode atau filter unit kerja'}
                        </p>
                      </div>
                    )}

                    {/* Pagination */}
                    {totalDataPages > 1 && (
                      <div className="px-4 sm:px-6 py-4 border-t border-slate-200">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                          <p className="text-xs sm:text-sm text-slate-600">
                            Menampilkan{' '}
                            <span className="font-medium text-[#25a298]">
                              {paginatedAttendanceData.length > 0 ? startDataIndex + 1 : 0}
                            </span>
                            {' '}—{' '}
                            <span className="font-medium text-[#25a298]">
                              {Math.min(startDataIndex + paginatedAttendanceData.length, filteredAttendanceData.length)}
                            </span>
                            {' '}dari{' '}
                            <span className="font-medium text-[#25a298]">{filteredAttendanceData.length}</span> karyawan
                          </p>

                          {/* Desktop pagination */}
                          <div className="hidden sm:flex items-center space-x-1">
                            <button
                              onClick={handlePrevPage}
                              disabled={currentDataPage === 1}
                              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              Prev
                            </button>
                            {Array.from({ length: Math.min(5, totalDataPages) }, (_, i) => {
                              let pageNum: number
                              if (totalDataPages <= 5) pageNum = i + 1
                              else if (currentDataPage <= 3) pageNum = i + 1
                              else if (currentDataPage >= totalDataPages - 2) pageNum = totalDataPages - 4 + i
                              else pageNum = currentDataPage - 2 + i
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handleDataPageChange(pageNum)}
                                  className={`px-3.5 py-2 text-sm rounded-lg font-medium transition-colors duration-200 ${
                                    currentDataPage === pageNum
                                      ? 'bg-[#25a298] text-white'
                                      : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              )
                            })}
                            <button
                              onClick={handleNextPage}
                              disabled={currentDataPage === totalDataPages}
                              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              Next
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>

                          {/* Mobile pagination */}
                          <div className="flex sm:hidden items-center justify-between w-full max-w-xs mx-auto">
                            <button
                              onClick={handlePrevPage}
                              disabled={currentDataPage === 1}
                              className="px-4 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center flex-1 justify-center mr-2"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              Prev
                            </button>
                            <span className="text-sm font-medium text-[#25a298] px-3 py-1.5 bg-slate-50 rounded-lg">
                              {currentDataPage} / {totalDataPages}
                            </span>
                            <button
                              onClick={handleNextPage}
                              disabled={currentDataPage === totalDataPages}
                              className="px-4 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center flex-1 justify-center ml-2"
                            >
                              Next
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!reviewMode && activeTab === 'pengajuan' && <PengajuanIzin />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Absensi
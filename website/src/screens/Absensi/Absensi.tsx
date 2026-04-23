import React, { useState, useEffect, useRef } from 'react'
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

  // Review mode (dari Dashboard)s
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
  const isInitialMount = useRef(true);

  // Filter unit kerja
  const [selectedTipe, setSelectedTipe] = useState<TipeFilter>(() => {
    const saved = sessionStorage.getItem('absensiSelectedTipe');
    return (saved as TipeFilter) || 'semua';
  });
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('absensiSelectedUnitId');
    return saved ? Number(saved) : null;
  });
  const [unitKerjaList, setUnitKerjaList] = useState<UnitKerja[]>([])

  const [searchData, setSearchData] = useState<string>(() => {
    return sessionStorage.getItem('absensiSearchData') || '';
  });
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(false)
  const [currentDataPage, setCurrentDataPage] = useState(() => {
    return parseInt(sessionStorage.getItem('absensiDataPage') || '1')
  })
  const itemsPerPage = 10

  const [openStoreDropdown, setOpenStoreDropdown] = useState(false);
  const [searchStore, setSearchStore] = useState('');
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  // isEmployeeOnlyView untuk review mode
  const isEmployeeOnlyView = reviewMode && (
    reviewCategory === 'alpha' ||
    reviewCategory === 'totalIzin' ||
    reviewCategory === 'pendingIzin' ||
    reviewCategory === 'hadirHariIni' ||
    reviewCategory === 'dayOff'
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
        'alpha':                   'Karyawan Alpha (Tidak Hadir & Tidak Izin)',
        'tepatWaktu':             'Karyawan Tepat Waktu',
        'telatMasuk':             'Karyawan Terlambat Masuk',
        'pulangCepat':            'Karyawan Pulang Cepat',
        'telatMasukPulangCepat':  'Karyawan Telat Masuk & Pulang Cepat',
        'hadirHariIni':           'Karyawan Hadir Hari Ini',
        'absensiTidakLengkap':    'Absensi Tidak Lengkap',
        'totalIzin':              'Karyawan Izin Hari Ini',
        'pendingIzin':            'Pengajuan Izin Pending',
        'dayOff':                 'Karyawan Day Off Hari Ini'
      }
      setReviewTitle(categoryTitles[reviewParam] || `Review: ${reviewParam}`)
      const storedData = localStorage.getItem(`review_${reviewParam}`)
      console.log('📦 reviewParam:', reviewParam)
      console.log('📦 storedData:', storedData)
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)
          console.log('📦 parsedData:', parsedData)
          console.log('📦 employees:', parsedData.employees)
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
      setSelectedTipe('semua');
      setSelectedUnitId(null);
      setSearchData('');
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

  useEffect(() => {
    sessionStorage.setItem('absensiSelectedTipe', selectedTipe)
    if (selectedUnitId) {
      sessionStorage.setItem('absensiSelectedUnitId', String(selectedUnitId))
    } else {
      sessionStorage.removeItem('absensiSelectedUnitId')
    }
  }, [selectedTipe, selectedUnitId])


  useEffect(() => {
    sessionStorage.setItem('absensiSearchData', searchData);
  }, [searchData]);

  // Load unit kerja list
  useEffect(() => {
    fetchUnitKerja()
  }, [])

  // Tutup dropdown Store saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target as Node)) {
        setOpenStoreDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data saat tanggal berubah atau keluar review mode
  useEffect(() => {
    if (!reviewMode) {
      fetchAllData()
    }
  }, [startDate, endDate, reviewMode])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentDataPage(1);
  }, [startDate, endDate, selectedTipe, selectedUnitId, searchData]);

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
        units = response
      } else if (Array.isArray(response?.data)) {
        units = response.data
      } else if (Array.isArray(response?.data?.unit_kerja)) {
        units = response.data.unit_kerja
      } else if (Array.isArray((response as any)?.unit_kerja)) {
        units = (response as any).unit_kerja
      } else if (response?.data && typeof response.data === 'object') {
        // Coba ambil array pertama yang ditemukan di dalam response.data
        const firstArray = Object.values(response.data).find(v => Array.isArray(v))
        if (firstArray) units = firstArray as any[]
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

      // 🔥 Ambil profil user saat ini untuk mendapatkan role dan unit_kerja_id
      const profileRes = await authAPI.getProfile()
      const currentUser = profileRes.data.user

      const [usersRes, attendanceRes, leaveRes] = await Promise.allSettled([
        authAPI.getAllUsers(),
        attendanceAPI.getAll(startDate, endDate),
        leaveAPI.getAllLeaves()
      ])

      // Users
      let allUsers: any[] = usersRes.status === 'fulfilled'
        ? (usersRes.value?.data?.users || usersRes.value?.data || usersRes.value || [])
        : []

      // 🔥 FILTER UNIT UNTUK LEADER (non-HR dengan website_access)
      if (currentUser.role !== 'hr' && currentUser.website_access) {
        allUsers = allUsers.filter((u: any) => 
          u.unit_kerja_id === currentUser.unit_kerja_id
        )
      }

      // Absensi
      const attendances: any[] = attendanceRes.status === 'fulfilled'
        ? (attendanceRes.value?.data?.attendances || [])
        : []

      // Izin
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
      const isMultiDay = startDate !== endDate
      if (isMultiDay) {
        // Mode multi-hari: tampil per baris per tanggal
        const leaveMap = new Map<number, any>()
        approvedLeaves.forEach((leave: any) => {
          if (leave.user_id) leaveMap.set(leave.user_id, leave)
        })

        const combined: AttendanceData[] = attendances
          .filter((att: any) => {
            // Filter unit untuk leader
            const user = allUsers.find((u: any) => u.id === att.user_id)
            return !!user
          })
          .map((att: any, index: number) => {
            const user = allUsers.find((u: any) => u.id === att.user_id)
            if (!user) return null

            const leave = leaveMap.get(user.id)
            const hasLeave = approvedLeaves.some((l: any) => l.user_id === user.id || l.nik === user.nik)
            const dbStatus = normalizeStatus(att.status)

            let status: AttendanceData['status']
            if (dbStatus === 'day_off') {
              status = 'day_off'
            } else {
              status = hasLeave ? 'izin' : (dbStatus as AttendanceData['status'])
            }

            const unitInfo = unitKerjaList.find(u => u.id === user.unit_kerja_id)

            return {
              id: att.id,
              no: index + 1,
              nama: user.nama || '-',
              unit_kerja: user.nama_unit || unitInfo?.nama_unit || '-',
              unit_kerja_id: user.unit_kerja_id,
              tipe_unit: unitInfo?.tipe_unit || user.tipe_unit || '',
              jamMasuk: formatTimeFromString(att.waktu_masuk_jakarta || att.waktu_masuk),
              jamPulang: formatTimeFromString(att.waktu_keluar_jakarta || att.waktu_keluar),
              status,
              nik: user.nik || '-',
              jabatan: user.jabatan || '-',
              departemen: user.departemen || '-',
              divisi: user.divisi || '-',
              lokasi: att.location || user.nama_unit || '-',
              lokasi_masuk: att.lokasi_masuk || att.location || user.nama_unit || '-',
              lokasi_keluar: att.lokasi_keluar || '-',
              keteranganIzin: leave?.keterangan || '',
              foto_masuk: att.foto_masuk || '',
              foto_keluar: att.foto_keluar || '',
              tanggal_absen: att.tanggal_absen || startDate
            }
          })
          .filter(Boolean) as AttendanceData[]

        setAttendanceData(combined)

      } else {
        // Mode single-hari: tampil semua user + status (termasuk alpha)
        const attendanceMap = new Map<number, any>()
        attendances.forEach((att: any) => attendanceMap.set(att.user_id, att))

        const leaveMap = new Map<number, any>()
        approvedLeaves.forEach((leave: any) => {
          if (leave.user_id) leaveMap.set(leave.user_id, leave)
        })

        const combined: AttendanceData[] = allUsers
          .map((user: any, index: number) => {
            const att = attendanceMap.get(user.id)
            const leave = leaveMap.get(user.id)

            let status: AttendanceData['status']
            if (att) {
              const dbStatus = normalizeStatus(att.status)
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
      }
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
    const s = status.toLowerCase().trim()
    const map: {[key: string]: string} = {
      'terlambat': 'telat_masuk',
      'tepat waktu': 'tepat_waktu',
      'terlambat_pulang_cepat': 'telat_masuk_pulang_cepat',
    }
    return map[s] || s
  }

  const getDisplayStatus = (dbStatus: string): string => normalizeStatus(dbStatus)

  // Data source: review mode atau normal
  const getDataSource = (): AttendanceData[] => {
    console.log('📊 getDataSource called, reviewMode:', reviewMode, 'reviewData length:', reviewData.length)
    if (reviewMode) {
      if (reviewData.length === 0) return [];
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
      }));
    }
    return attendanceData;
  };

  const getReviewStatus = (item: any, category: string): string => {
    switch (category) {
      case 'alpha':                  return 'alpha'
      case 'tepatWaktu':            return 'tepat_waktu'
      case 'telatMasuk':            return 'telat_masuk'
      case 'pulangCepat':           return 'pulang_cepat'
      case 'telatMasukPulangCepat': return 'telat_masuk_pulang_cepat'
      case 'hadirHariIni':          return getDisplayStatus(item.status || 'tepat_waktu')
      case 'absensiTidakLengkap':   return 'tidak_lengkap'
      case 'totalIzin':             return 'izin'
      case 'pendingIzin':           return 'izin'
      case 'dayOff':                return 'day_off'
      default:                      return getDisplayStatus(item.status || 'tepat_waktu')
    }
  }

  // Daftar store untuk dropdown — nilai DB: 'store'
  // Filter unit kerja bertipe store — nilai DB: 'store' (lowercase)
  const storeUnits = unitKerjaList.filter(u => {
    const tipe = (u.tipe_unit || '').toLowerCase().trim()
    return tipe === 'store'
  })

  // Filter store berdasarkan pencarian
  const filteredStoreUnits = storeUnits
    .filter(unit => unit.nama_unit.toLowerCase().includes(searchStore.toLowerCase()))
    .sort((a, b) => a.nama_unit.localeCompare(b.nama_unit));

  // Filter berdasarkan tipe unit & unit spesifik — nilai DB: 'head_office' | 'store'
  const applyUnitFilter = (data: AttendanceData[]): AttendanceData[] => {
    if (selectedTipe === 'head_office') {
      return data.filter(item => {
        const unit = unitKerjaList.find(u => u.id === item.unit_kerja_id);
        return unit?.tipe_unit?.toLowerCase() === 'head_office';
      });
    }
    if (selectedTipe === 'store') {
      if (selectedUnitId) {
        return data.filter(item => item.unit_kerja_id === selectedUnitId);
      }
      return data.filter(item => {
        const unit = unitKerjaList.find(u => u.id === item.unit_kerja_id);
        return unit?.tipe_unit?.toLowerCase() === 'store';
      });
    }
    return data;
  };

  const dataSource = getDataSource()

  const filteredAttendanceData = applyUnitFilter(dataSource)
    .filter(item =>
      item.nama.toLowerCase().includes(searchData.toLowerCase()) ||
      item.nik.toLowerCase().includes(searchData.toLowerCase()) ||
      item.departemen.toLowerCase().includes(searchData.toLowerCase()) ||
      item.divisi.toLowerCase().includes(searchData.toLowerCase()) ||
      item.unit_kerja.toLowerCase().includes(searchData.toLowerCase())
    )
    .sort((a, b) => {
      if (startDate !== endDate) {
        const dateDiff = a.tanggal_absen.localeCompare(b.tanggal_absen)
        if (dateDiff !== 0) return dateDiff
      }
      return a.nama.localeCompare(b.nama)
    })

  const totalDataPages = Math.ceil(filteredAttendanceData.length / itemsPerPage)
  const startDataIndex = (currentDataPage - 1) * itemsPerPage
  const paginatedAttendanceData = filteredAttendanceData.slice(startDataIndex, startDataIndex + itemsPerPage)

  const handleDataPageChange = (newPage: number) => setCurrentDataPage(newPage)
  const handlePrevPage = () => currentDataPage > 1 && setCurrentDataPage(p => p - 1)
  const handleNextPage = () => currentDataPage < totalDataPages && setCurrentDataPage(p => p + 1)

  const handleViewDetail = (attendance: AttendanceData) => {
    sessionStorage.setItem('absensiStartDate', startDate)
    sessionStorage.setItem('absensiDataPage', currentDataPage.toString())
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

  // Export Excel
  const exportToExcel = async () => {
    setLoading(true);
    try {
      let dataToExport: any[] = [];

      // 🔥 Ambil profil user saat ini untuk filter unit (digunakan di kedua mode)
      const profileRes = await authAPI.getProfile();
      const currentUser = profileRes.data.user;

      // === Bagian Review Mode di exportToExcel ===
      if (reviewMode) {
        const [usersRes, attendanceRes, leaveRes] = await Promise.allSettled([
          authAPI.getAllUsers(),
          attendanceAPI.getAll(startDate, endDate),
          leaveAPI.getAllLeaves()
        ]);

        let allUsers: any[] = usersRes.status === 'fulfilled'
          ? (usersRes.value?.data?.users || usersRes.value?.data || usersRes.value || [])
          : [];

        // 🔥 Filter unit untuk leader (sama seperti fetchAllData)
        if (currentUser.role !== 'hr' && currentUser.website_access) {
          allUsers = allUsers.filter((u: any) => 
            u.unit_kerja_id === currentUser.unit_kerja_id
          );
        }

        const attendances: any[] = attendanceRes.status === 'fulfilled'
          ? (attendanceRes.value?.data?.attendances || [])
          : [];
        const allLeaves: any[] = leaveRes.status === 'fulfilled'
          ? (leaveRes.value?.data?.leaves || [])
          : [];

        const periodStart = new Date(startDate);
        const periodEnd = new Date(endDate);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setHours(23, 59, 59, 999);

        const approvedLeaves = allLeaves.filter((l: any) => {
          if (l.status !== 'approved') return false;
          const ls = new Date(l.start_date);
          const le = new Date(l.end_date);
          ls.setHours(0, 0, 0, 0);
          le.setHours(23, 59, 59, 999);
          return ls <= periodEnd && le >= periodStart;
        });

        const attendanceMap = new Map();
        attendances.forEach((att: any) => attendanceMap.set(att.user_id, att));
        const leaveMap = new Map();
        approvedLeaves.forEach((l: any) => leaveMap.set(l.user_id, l));

        const combined: AttendanceData[] = allUsers
          .filter((user: any) => user.role !== 'hr')
          .map((user: any, idx: number) => {
            const att = attendanceMap.get(user.id);
            const leave = leaveMap.get(user.id);
            let status: AttendanceData['status'];
            if (att) {
              const dbStatus = normalizeStatus(att.status);
              if (dbStatus === 'day_off') {
                status = 'day_off';
              } else {
                const hasLeave = approvedLeaves.some(
                  (l: any) => (l.user_id === user.id || l.nik === user.nik)
                );
                status = hasLeave ? 'izin' : (dbStatus as AttendanceData['status']);
              }
            } else if (leave) {
              status = 'izin';
            } else {
              status = 'alpha';
            }
            const unitInfo = unitKerjaList.find(u => u.id === user.unit_kerja_id);
            return {
              id: att?.id || -(user.id),
              no: idx + 1,
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
            };
          });

        // Filter berdasarkan kategori review
        const filtered = combined.filter(item => {
          const itemStatus = item.status;
          switch (reviewCategory) {
            case 'alpha': return itemStatus === 'alpha';
            case 'tepatWaktu': return itemStatus === 'tepat_waktu';
            case 'telatMasuk': return itemStatus === 'telat_masuk';
            case 'pulangCepat': return itemStatus === 'pulang_cepat';
            case 'telatMasukPulangCepat': return itemStatus === 'telat_masuk_pulang_cepat';
            case 'hadirHariIni': return ['tepat_waktu','telat_masuk','pulang_cepat','telat_masuk_pulang_cepat','tidak_lengkap'].includes(itemStatus);
            case 'absensiTidakLengkap': return itemStatus === 'tidak_lengkap';
            case 'totalIzin': return itemStatus === 'izin';
            case 'pendingIzin': return false;
            case 'dayOff': return itemStatus === 'day_off';
            default: return false;
          }
        });

        // Filter unit (Head Office / Store)
        let unitFiltered = filtered;
        if (selectedTipe === 'head_office') {
          unitFiltered = filtered.filter(item => {
            const unit = unitKerjaList.find(u => u.id === item.unit_kerja_id);
            return unit?.tipe_unit?.toLowerCase() === 'head_office';
          });
        } else if (selectedTipe === 'store') {
          if (selectedUnitId) {
            unitFiltered = filtered.filter(item => item.unit_kerja_id === selectedUnitId);
          } else {
            unitFiltered = filtered.filter(item => {
              const unit = unitKerjaList.find(u => u.id === item.unit_kerja_id);
              return unit?.tipe_unit?.toLowerCase() === 'store';
            });
          }
        }

        // Filter pencarian (search)
        const searchFiltered = unitFiltered.filter(item =>
          item.nama.toLowerCase().includes(searchData.toLowerCase()) ||
          item.nik.toLowerCase().includes(searchData.toLowerCase()) ||
          item.departemen.toLowerCase().includes(searchData.toLowerCase()) ||
          item.divisi.toLowerCase().includes(searchData.toLowerCase()) ||
          item.unit_kerja.toLowerCase().includes(searchData.toLowerCase())
        );

        // Mapping untuk Excel
        dataToExport = searchFiltered.map((item, index) => ({
          'NO': index + 1,
          'NAMA': item.nama,
          'NIK': item.nik,
          'JABATAN': item.jabatan,
          'DEPARTEMEN': item.departemen,
          'DIVISI': item.divisi,
          'UNIT KERJA': item.unit_kerja,
          'TANGGAL': item.tanggal_absen ? item.tanggal_absen.split('T')[0] : '-',
          'JAM MASUK': item.jamMasuk,
          'JAM PULANG': item.jamPulang,
          'STATUS': getStatusText(item.status),
          'LOKASI MASUK': item.lokasi_masuk || '-',
          'LOKASI KELUAR': item.lokasi_keluar || '-',
          'KETERANGAN': item.keteranganIzin || '',
        }));
      } else {
        // ✅ Mode normal: gunakan data yang sudah difilter dan ditampilkan di tabel
        dataToExport = filteredAttendanceData.map((item, index) => ({
          'NO': index + 1,
          'NAMA': item.nama,
          'NIK': item.nik,
          'JABATAN': item.jabatan,
          'DEPARTEMEN': item.departemen,
          'DIVISI': item.divisi,
          'UNIT KERJA': item.unit_kerja,
          'TANGGAL': item.tanggal_absen ? item.tanggal_absen.split('T')[0] : '-',
          'JAM MASUK': item.jamMasuk,
          'JAM PULANG': item.jamPulang,
          'STATUS': getStatusText(item.status),
          'LOKASI MASUK': item.lokasi_masuk || '-',
          'LOKASI KELUAR': item.lokasi_keluar || '-',
          'KETERANGAN': item.keteranganIzin || '',
        }));
      }

      // Proses pembuatan file Excel
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Absensi');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
      });

      const unitLabel = selectedUnitId
        ? (unitKerjaList.find(u => u.id === selectedUnitId)?.nama_unit || 'unit').replace(/\s+/g, '_')
        : selectedTipe !== 'semua' ? selectedTipe : 'semua_unit';

      const fileName = reviewMode
        ? `absensi_review_${reviewCategory}_${unitLabel}_${startDate}.xlsx`
        : `absensi_${unitLabel}_${startDate}${startDate !== endDate ? '_sd_' + endDate : ''}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Gagal mengekspor data.');
    } finally {
      setLoading(false);
    }
  };

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
                onClick={() => {
                  sessionStorage.removeItem('absensiSearchData');
                  navigate('/dashboard');
                }}
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

                        {/* Dropdown pilih store spesifik dengan pencarian */}
                        {selectedTipe === 'store' && (
                          <div ref={storeDropdownRef} className="relative" style={{ minWidth: '220px' }}>
                            {storeUnits.length === 0 ? (
                              <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400">
                                Memuat store...
                              </div>
                            ) : (
                              <>
                                {/* Tombol trigger dropdown */}
                                <div
                                  className="pl-9 pr-8 py-1.5 rounded-lg border border-slate-300 bg-white cursor-pointer text-sm flex justify-between items-center"
                                  onClick={() => {
                                    setOpenStoreDropdown(!openStoreDropdown);
                                    setSearchStore(''); // reset pencarian saat buka
                                  }}
                                >
                                  <span className="truncate">
                                    {selectedUnitId 
                                      ? storeUnits.find(u => u.id === selectedUnitId)?.nama_unit || 'Pilih Store'
                                      : `Semua Store (${storeUnits.length})`
                                    }
                                  </span>
                                  <span className="text-slate-400 ml-2">▼</span>
                                </div>
                                
                                {/* Ikon lokasi di kiri */}
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
                                  🏢
                                </div>

                                {/* Panel dropdown */}
                                {openStoreDropdown && (
                                  <div className="absolute z-30 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg">
                                    {/* Input pencarian */}
                                    <input
                                      type="text"
                                      className="w-full px-3 py-2 text-sm border-b border-slate-200 focus:outline-none rounded-t-lg"
                                      placeholder="Cari store..."
                                      value={searchStore}
                                      onChange={(e) => setSearchStore(e.target.value)}
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    
                                    {/* Daftar opsi */}
                                    <div className="max-h-60 overflow-y-auto text-sm">
                                      {/* Opsi "Semua Store" */}
                                      <div
                                        className={`px-3 py-2 hover:bg-[#25a298]/10 cursor-pointer flex items-center ${
                                          !selectedUnitId ? 'bg-[#25a298]/5 text-[#25a298] font-medium' : ''
                                        }`}
                                        onClick={() => {
                                          setSelectedUnitId(null);
                                          setOpenStoreDropdown(false);
                                          setSearchStore('');
                                        }}
                                      >
                                        Semua Store ({storeUnits.length})
                                      </div>
                                      
                                      {/* Daftar store hasil filter */}
                                      {filteredStoreUnits.length > 0 ? (
                                        filteredStoreUnits.map(unit => (
                                          <div
                                            key={unit.id}
                                            className={`px-3 py-2 hover:bg-[#25a298]/10 cursor-pointer ${
                                              selectedUnitId === unit.id ? 'bg-[#25a298]/5 text-[#25a298] font-medium' : ''
                                            }`}
                                            onClick={() => {
                                              setSelectedUnitId(unit.id);
                                              setOpenStoreDropdown(false);
                                              setSearchStore('');
                                            }}
                                          >
                                            {unit.nama_unit}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="px-3 py-2 text-gray-400 text-center">Tidak ada hasil</div>
                                      )}
                                    </div>
                                  </div>
                                )}
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
                        placeholder="Cari nama, NIK, departemen, divisi atau unit kerja..."
                        value={searchData}
                        onChange={(e) => setSearchData(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] text-sm"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</div>
                    </div>

                    {/* Export Excel */}
                    {!reviewMode && (
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
                    )}
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
                            {startDate !== endDate && (
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tanggal</th>
                            )}
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
                                {!reviewMode && (
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                                )}
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {paginatedAttendanceData.map((item, index) => (
                            <tr key={`${item.id}-${index}`} className={`hover:bg-slate-50 transition-colors duration-150 ${
                              item.status === 'alpha' ? 'opacity-60' :
                              item.status === 'day_off' ? 'bg-purple-50/50' : ''
                            }`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{startDataIndex + index + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{item.nama}</div>
                                <div className="text-xs text-slate-500">{item.nik}</div>
                              </td>
                              {startDate !== endDate && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  {new Date(item.tanggal_absen.split('T')[0] + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                              )}
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
                                  {!reviewMode && (
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
                                  )}
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
                            <span className="font-medium text-[#25a298]">{filteredAttendanceData.length}</span> {startDate !== endDate ? 'data' : 'karyawan'}
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
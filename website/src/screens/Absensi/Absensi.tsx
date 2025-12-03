import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { attendanceAPI, leaveAPI } from '../../services/api'
import PengajuanIzin from './PengajuanIzin'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface AttendanceData {
  id: number
  no: number
  nama: string
  unit_kerja: string
  jamMasuk: string
  jamPulang: string
  status: 'tepat_waktu' | 'telat' | 'izin'
  nik: string
  jabatan: string
  departemen: string
  divisi: string
  lokasi: string
  keteranganIzin?: string
  foto_masuk: string
  foto_keluar: string
  tanggal_absen: string
}

const Absensi: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'data' | 'pengajuan'>(() => {
    return (sessionStorage.getItem('absensiActiveTab') as 'data' | 'pengajuan') || 'data'
  })
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [searchData, setSearchData] = useState('')
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(false)
  const [currentDataPage, setCurrentDataPage] = useState(() => {
    return parseInt(sessionStorage.getItem('absensiDataPage') || '1')
  })
  const itemsPerPage = 10

  useEffect(() => {
    sessionStorage.setItem('absensiActiveTab', activeTab)
    sessionStorage.setItem('absensiDataPage', currentDataPage.toString())
  }, [activeTab, currentDataPage])

  useEffect(() => {
    fetchAttendanceData()
  }, [selectedDate])

  const formatTimeFromString = (timeString: string): string => {
    if (!timeString) return '-';
    
    console.log('🕒 Raw time string from backend:', timeString);
    
    if (!timeString || timeString === 'null' || timeString === 'undefined') {
      return '-';
    }

    // Data dari backend sudah dalam format Jakarta time, langsung format saja
    if (timeString.includes(':')) {
      const timeParts = timeString.split(':');
      
      if (timeParts.length >= 2) {
        const hours = timeParts[0].padStart(2, '0');
        const minutes = timeParts[1].padStart(2, '0');
        
        const formattedTime = `${hours}:${minutes}`;
        console.log('✅ Formatted time:', formattedTime, 'from:', timeString);
        
        return formattedTime;
      }
    }
    
    return timeString;
  };

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)
      
      // Fetch attendance data
      const response = await attendanceAPI.getAll(selectedDate, selectedDate)
      const attendances = response?.data?.attendances || []

      // Fetch leave data with error handling
      let approvedLeaves = []
      try {
        const leaveResponse = await leaveAPI.getAllLeaves()
        const allLeaves = leaveResponse?.data?.leaves || []
        
        approvedLeaves = allLeaves.filter((leave: any) => {
          const isApproved = leave.status === 'approved'
          const selected = new Date(selectedDate)
          const start = new Date(leave.start_date)
          const end = new Date(leave.end_date)
          
          selected.setHours(0, 0, 0, 0)
          start.setHours(0, 0, 0, 0)
          end.setHours(0, 0, 0, 0)
          
          return isApproved && selected >= start && selected <= end
        })
      } catch (leaveError) {
        console.error('Error fetching leaves:', leaveError)
        approvedLeaves = []
      }

      // Process attendance data
      const data = attendances.map((att: any, index: number) => {
        const userLeave = approvedLeaves.find((leave: any) => leave.nik === att.nik)
        
        return {
          id: att.id,
          no: index + 1,
          nama: att.nama || '-',
          unit_kerja: att.nama_unit || '-',
          jamMasuk: formatTimeFromString(att.waktu_masuk_jakarta || att.waktu_masuk),
          jamPulang: formatTimeFromString(att.waktu_keluar_jakarta || att.waktu_keluar),
          status: userLeave ? 'izin' : getAttendanceStatus(att),
          nik: att.nik || '-',
          jabatan: att.jabatan || '-',
          departemen: att.departemen || '-',
          divisi: att.divisi || '-',
          lokasi: att.location || att.nama_unit || '-',
          keteranganIzin: userLeave ? userLeave.keterangan : '',
          foto_masuk: att.foto_masuk || '',
          foto_keluar: att.foto_keluar || '',
          tanggal_absen: att.tanggal_absen || selectedDate
        }
      })
      
      // Add users on leave without attendance records
      const leaveUsersWithoutAttendance = approvedLeaves
        .filter((leave: any) => !attendances.some((att: any) => att.nik === leave.nik))
        .map((leave: any, index: number) => ({
          id: -index - 1,
          no: attendances.length + index + 1,
          nama: leave.nama || '-',
          unit_kerja: leave.unit_kerja || '-',
          jamMasuk: '-',
          jamPulang: '-',
          status: 'izin',
          nik: leave.nik || '-',
          jabatan: leave.jabatan || '-',
          departemen: leave.departemen || '-',
          divisi: leave.divisi || '-',
          lokasi: leave.unit_kerja || '-',
          keteranganIzin: leave.keterangan || '',
          foto_masuk: '',
          foto_keluar: '',
          tanggal_absen: selectedDate
        }))

      const combinedData = [...data, ...leaveUsersWithoutAttendance]
      setAttendanceData(combinedData)
    } catch (error: any) {
      console.error('Error fetching attendance:', error)
      // Fallback: try today-all endpoint
      try {
        const fallbackResponse = await attendanceAPI.getTodayAll()
        const fallbackData = fallbackResponse?.data?.attendances || []
        
        const processedData = fallbackData.map((att: any, index: number) => ({
          id: att.id,
          no: index + 1,
          nama: att.nama || '-',
          unit_kerja: att.nama_unit || '-',
          jamMasuk: formatTimeFromString(att.waktu_masuk_jakarta || att.waktu_masuk),
          jamPulang: formatTimeFromString(att.waktu_keluar_jakarta || att.waktu_keluar),
          status: getAttendanceStatus(att),
          nik: att.nik || '-',
          jabatan: att.jabatan || '-',
          departemen: att.departemen || '-',
          divisi: att.divisi || '-',
          lokasi: att.location || att.nama_unit || '-',
          keteranganIzin: '',
          foto_masuk: att.foto_masuk || '',
          foto_keluar: att.foto_keluar || '',
          tanggal_absen: att.tanggal_absen || selectedDate
        }))
        
        setAttendanceData(processedData)
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        setAttendanceData([])
      }
    } finally {
      setLoading(false)
    }
  }

  const getAttendanceStatus = (attendance: any): 'tepat_waktu' | 'telat' | 'izin' => {
    if (attendance.status === 'izin' || attendance.status === 'Izin') {
      return 'izin';
    }
    
    // Jika tidak ada waktu masuk, anggap tidak hadir/izin
    if (!attendance.waktu_masuk) {
      return 'izin';
    }

    // Parse waktu masuk untuk cek keterlambatan
    let isLate = false;
    const waktuMasuk = attendance.waktu_masuk;

    if (waktuMasuk.includes(':')) {
      const timeParts = waktuMasuk.split(':');
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      
      console.log('⏰ Status calculation:', {
        nama: attendance.nama,
        waktu_masuk: waktuMasuk,
        hours: hours,
        minutes: minutes,
        isLate: hours > 9 || (hours === 9 && minutes > 0)
      });
      
      // Asumsi jam 09:00 sebagai batas telat
      if (hours > 9 || (hours === 9 && minutes > 0)) {
        isLate = true;
      }
    }

    return isLate ? 'telat' : 'tepat_waktu';
  };

  const filteredAttendanceData = attendanceData
    .filter(item =>
      item.nama.toLowerCase().includes(searchData.toLowerCase()) ||
      item.nik.toLowerCase().includes(searchData.toLowerCase()) ||
      item.unit_kerja.toLowerCase().includes(searchData.toLowerCase())
    )
    .sort((a, b) => a.nama.localeCompare(b.nama))

  const totalDataPages = Math.ceil(filteredAttendanceData.length / itemsPerPage)
  const startDataIndex = (currentDataPage - 1) * itemsPerPage
  const paginatedAttendanceData = filteredAttendanceData.slice(startDataIndex, startDataIndex + itemsPerPage)

  const handleDataPageChange = (newPage: number) => {
    setCurrentDataPage(newPage)
  }

  const handleViewDetail = (attendance: AttendanceData) => {
    navigate('/attendance/detail', { state: { attendance } })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'tepat_waktu': return 'bg-green-100 text-green-800'
      case 'telat': return 'bg-yellow-100 text-yellow-800'
      case 'izin': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'tepat_waktu': return 'Tepat Waktu'
      case 'telat': return 'Telat'
      case 'izin': return 'Izin'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStats = () => {
    const hadir = attendanceData.filter(item => item.status === 'tepat_waktu' || item.status === 'telat').length
    const telat = attendanceData.filter(item => item.status === 'telat').length
    const izin = attendanceData.filter(item => item.status === 'izin').length
    const total = attendanceData.length

    return { hadir, telat, izin, total }
  }

  const stats = getStats()

  const exportToExcel = () => {
    // Siapkan data untuk export
    const dataToExport = filteredAttendanceData.map(item => {
      // Hitung work time category seperti di Excel contoh
      const getWorkTimeCategory = (jamMasuk: string) => {
        if (jamMasuk === '-' || !jamMasuk) return ''
        
        const [hours, minutes] = jamMasuk.split(':').map(Number)
        const totalMinutes = hours * 60 + minutes
        
        // Kategori seperti di contoh Excel
        if (totalMinutes <= 540) return '<09:00' // <= 09:00
        else if (totalMinutes <= 570) return '09:01 - 09:30' // <= 09:30
        else if (totalMinutes <= 600) return '09:31 - 10:00' // <= 10:00
        else return '10:00'
      }
      
      // Hitung lembur jika ada
      const calculateOvertime = (jamPulang: string) => {
        if (jamPulang === '-' || !jamPulang) return ''
        
        const [hours, minutes] = jamPulang.split(':').map(Number)
        const totalMinutes = hours * 60 + minutes
        
        // Jika pulang setelah 18:00
        if (totalMinutes > 1080) { // 18:00 = 1080 menit
          const overtimeMinutes = totalMinutes - 1080
          const overtimeHours = Math.floor(overtimeMinutes / 60)
          const overtimeMins = overtimeMinutes % 60
          return `${overtimeHours.toString().padStart(2, '0')}:${overtimeMins.toString().padStart(2, '0')}:00`
        }
        return ''
      }
      
      // Hitung rata-rata jam kerja
      const calculateWorkDuration = (jamMasuk: string, jamPulang: string) => {
        if (jamMasuk === '-' || !jamMasuk || jamPulang === '-' || !jamPulang) return ''
        
        const parseTime = (timeStr: string) => {
          const [hours, minutes] = timeStr.split(':').map(Number)
          return hours * 60 + minutes
        }
        
        const start = parseTime(jamMasuk)
        const end = parseTime(jamPulang)
        
        if (end <= start) return ''
        
        const durationMinutes = end - start
        const hours = Math.floor(durationMinutes / 60)
        const minutes = durationMinutes % 60
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
      }
      
      const workTimeCategory = getWorkTimeCategory(item.jamMasuk)
      const overtime = calculateOvertime(item.jamPulang)
      const workDuration = calculateWorkDuration(item.jamMasuk, item.jamPulang)
      
      return {
        "DIVISI": item.divisi || '-',
        "DEPARTEMEN": item.departemen || '-',
        "NAMA": item.nama,
        "Date": new Date(item.tanggal_absen).toLocaleDateString('en-GB'), // Format dd/mm/yyyy
        "Clock In": item.jamMasuk,
        "Clock Out": item.jamPulang,
        "Work Time": workTimeCategory,
        "LEMBUR": overtime,
        "Rata - rata jam kerja": workDuration,
        "Keterangan": item.keteranganIzin || (item.status === 'izin' ? 'Izin' : '')
      }
    })
    
    // Buat worksheet dan workbook
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Absensi")
    
    // Generate excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
    })
    
    // Format tanggal untuk nama file
    const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-')
    
    saveAs(blob, `absensi_${formattedDate}.xlsx`)
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
                <h1 className="text-2xl font-bold text-[#25a298]">Data Absensi</h1>
                <p className="text-sm text-slate-500">Kelola absensi dan pengajuan izin karyawan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-300 ${
                activeTab === 'data'
                  ? 'text-[#25a298] border-b-2 border-[#25a298]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Absensi
            </button>
            <button
              onClick={() => setActiveTab('pengajuan')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-300 ${
                activeTab === 'pengajuan'
                  ? 'text-[#25a298] border-b-2 border-[#25a298]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pengajuan Izin
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'data' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {formatDate(selectedDate)}
                    </h2>
                    <p className="text-sm text-slate-500">Rekap absensi harian</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] transition-all duration-200"
                    />
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Cari nama, NIK, atau unit kerja..."
                        value={searchData}
                        onChange={(e) => setSearchData(e.target.value)}
                        className="pl-10 pr-4 py-2 w-80 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] transition-all duration-200"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                        🔍
                      </div>
                    </div>
                    <button
                      onClick={exportToExcel}
                      disabled={filteredAttendanceData.length === 0}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                        filteredAttendanceData.length === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-primary-500 text-white hover:bg-primary-600'
                      }`}
                    >
                      <span>Export Excel</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Hadir</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.hadir}</p>
                      </div>
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">✅</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Terlambat</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.telat}</p>
                      </div>
                      <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">⏰</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Izin</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.izin}</p>
                      </div>
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">📝</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Total</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                      </div>
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                        <span className="text-lg text-[#25a298]">👥</span>
                      </div>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#25a298]"></div>
                    <p className="mt-2 text-slate-600">Memuat data absensi...</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit Kerja</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Jam Masuk</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Jam Pulang</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {paginatedAttendanceData.map((item, index) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors duration-150">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{startDataIndex + index + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{item.nama}</div>
                                <div className="text-xs text-slate-500">{item.nik}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.unit_kerja}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.jamMasuk}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.jamPulang}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {getStatusText(item.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => handleViewDetail(item)}
                                  className="text-[#25a298] hover:text-[#1f8a80] transition-colors duration-200 font-medium"
                                >
                                  Detail
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {filteredAttendanceData.length === 0 && !loading && (
                      <div className="px-6 py-8 text-center">
                        <div className="text-slate-500">
                          <p className="text-lg">📊</p>
                          <p className="mt-2">Tidak ada data absensi untuk tanggal ini</p>
                          <p className="text-sm mt-1">Pastikan karyawan sudah melakukan clock in/out</p>
                        </div>
                      </div>
                    )}

                    {totalDataPages > 1 && (
                      <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                          Menampilkan {paginatedAttendanceData.length > 0 ? startDataIndex + 1 : 0}-{startDataIndex + paginatedAttendanceData.length} dari {filteredAttendanceData.length} absensi
                        </p>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleDataPageChange(currentDataPage - 1)}
                            disabled={currentDataPage === 1}
                            className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Sebelumnya
                          </button>
                          {Array.from({ length: totalDataPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => handleDataPageChange(page)}
                              className={`px-3 py-1 rounded-lg transition-colors duration-200 ${
                                currentDataPage === page
                                  ? 'bg-[#25a298] text-white'
                                  : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button 
                            onClick={() => handleDataPageChange(currentDataPage + 1)}
                            disabled={currentDataPage === totalDataPages}
                            className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Selanjutnya
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pengajuan' && <PengajuanIzin />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Absensi
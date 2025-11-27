import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { leaveAPI } from '../../services/api'

interface AttendanceDetail {
  id: number
  nama: string
  nik: string
  jabatan: string
  departemen: string
  divisi: string
  unit_kerja: string
  tanggal_absen: string
  waktu_masuk: string
  waktu_keluar: string
  foto_masuk: string
  foto_keluar: string
  status: string
  location: string
}

interface LeaveData {
  jenis_izin: string
  tanggal_mulai: string
  tanggal_selesai: string
  keterangan: string
}

const DetailAbsensi: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [attendance, setAttendance] = useState<AttendanceDetail | null>(null)
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (location.state?.attendance) {
      const att = location.state.attendance
      setAttendance({
        id: att.id,
        nama: att.nama,
        nik: att.nik,
        jabatan: att.jabatan,
        departemen: att.departemen,
        divisi: att.divisi,
        unit_kerja: att.unit_kerja,
        tanggal_absen: att.tanggal_absen || new Date().toISOString().split('T')[0],
        waktu_masuk: att.jamMasuk,
        waktu_keluar: att.jamPulang,
        foto_masuk: att.foto_masuk || '',
        foto_keluar: att.foto_keluar || '',
        status: att.status,
        location: att.lokasi || '-'
      })
      fetchLeaveData(att.nik, att.tanggal_absen)
    }
  }, [location])

  const fetchLeaveData = async (nik: string, tanggal: string) => {
    try {
      const response = await leaveAPI.getAllLeaves()
      const leaves = response?.data?.leaves || []
      
      const leave = leaves.find((l: any) => 
        l.nik === nik && 
        l.status === 'approved' &&
        new Date(tanggal) >= new Date(l.start_date) &&
        new Date(tanggal) <= new Date(l.end_date)
      )

      if (leave) {
        setLeaveData({
          jenis_izin: leave.leave_type || leave.jenis_izin || '-',
          tanggal_mulai: leave.start_date,
          tanggal_selesai: leave.end_date,
          keterangan: leave.reason || leave.keterangan || '-'
        })
      }
    } catch (error) {
      console.error('Error fetching leave data:', error)
    } finally {
      setLoading(false)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'tepat_waktu': return 'bg-green-100 text-green-800 border-green-200'
      case 'telat': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'izin': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#25a298]"></div>
          <p className="mt-2 text-slate-600">Memuat data detail...</p>
        </div>
      </div>
    )
  }

  if (!attendance) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Data tidak ditemukan</p>
          <button 
            onClick={() => navigate('/attendance')}
            className="mt-4 text-[#25a298] hover:text-[#1f8a80]"
          >
            Kembali ke Absensi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/attendance')}
                className="flex items-center space-x-2 text-slate-600 hover:text-[#25a298] transition-colors duration-200"
              >
                <span>←</span>
                <span>Kembali</span>
              </button>
              <div className="w-px h-6 bg-slate-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-[#25a298]">Detail Absensi</h1>
                <p className="text-sm text-slate-500">Informasi lengkap karyawan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Data Karyawan */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-[#25a298] to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg font-bold">
                  {attendance.nama.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{attendance.nama}</h2>
                <p className="text-slate-600">{attendance.jabatan} • {attendance.departemen}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">NIK</label>
                  <p className="text-slate-900 font-medium">{attendance.nik}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Jabatan</label>
                  <p className="text-slate-900 font-medium">{attendance.jabatan}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Divisi</label>
                  <p className="text-slate-900 font-medium">{attendance.divisi}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Departemen</label>
                  <p className="text-slate-900 font-medium">{attendance.departemen}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Unit Kerja</label>
                  <p className="text-slate-900 font-medium">{attendance.unit_kerja}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Lokasi Absen</label>
                  <p className="text-slate-900 font-medium">{attendance.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Absensi */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
              <span className="w-2 h-2 bg-[#25a298] rounded-full mr-3"></span>
              Data Absensi
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal Absensi</label>
                <p className="text-slate-900 font-medium">{formatDate(attendance.tanggal_absen)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(attendance.status)}`}>
                  {getStatusText(attendance.status)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Waktu Masuk</label>
                  <p className="text-slate-900 font-medium text-lg">{attendance.waktu_masuk}</p>
                </div>
                {attendance.foto_masuk && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Foto Masuk</label>
                    <img 
                      src={attendance.foto_masuk} 
                      alt="Foto masuk" 
                      className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Waktu Keluar</label>
                  <p className="text-slate-900 font-medium text-lg">{attendance.waktu_keluar}</p>
                </div>
                {attendance.foto_keluar && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Foto Keluar</label>
                    <img 
                      src={attendance.foto_keluar} 
                      alt="Foto keluar" 
                      className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Izin */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-3"></span>
              Data Izin
            </h3>

            {leaveData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Jenis Izin</label>
                    <p className="text-slate-900 font-medium capitalize">{leaveData.jenis_izin}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal Mulai</label>
                    <p className="text-slate-900 font-medium">{formatDate(leaveData.tanggal_mulai)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal Selesai</label>
                    <p className="text-slate-900 font-medium">{formatDate(leaveData.tanggal_selesai)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Keterangan</label>
                    <p className="text-slate-900 font-medium">{leaveData.keterangan}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-slate-400 text-lg mb-2">—</div>
                <p className="text-slate-500">Tidak ada data izin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailAbsensi
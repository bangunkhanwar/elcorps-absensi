import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

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
  status: 'tepat_waktu' | 'telat_masuk' | 'pulang_cepat' | 'telat_masuk_pulang_cepat' | 'tidak_lengkap' | 'izin' | 'alpha' | string
  location: string
}

// 🔹 Fungsi helper untuk capitalize setiap kata (sama seperti di HomeScreen)
const toTitleCase = (str: string) => {
  if (!str) return ''
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

const DetailAbsensi: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [attendance, setAttendance] = useState<AttendanceDetail | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
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
        location: att.lokasi || '-',
      })
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [location])

  const handleImageClick = (imageUrl: string) => {
    setPreviewImage(imageUrl)
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
      case 'tepat_waktu':              return 'bg-green-100 text-green-800 border-green-200'
      case 'telat_masuk':              return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pulang_cepat':             return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'telat_masuk_pulang_cepat': return 'bg-red-100 text-red-800 border-red-200'
      case 'tidak_lengkap':            return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'izin':                     return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'alpha':                    return 'bg-red-100 text-red-800 border-red-200'
      default:                         return 'bg-gray-100 text-gray-800 border-gray-200'
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
      default:                         return status
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Data Karyawan & Data Izin */}
          <div className="lg:col-span-5 space-y-6">
            {/* Data Karyawan */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#25a298] to-teal-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {attendance.nama.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  {/* 🔹 Nama dengan capitalize each word */}
                  <h2 className="text-xl font-bold text-slate-900">{toTitleCase(attendance.nama)}</h2>
                  {/* 🔹 Jabatan & departemen juga capitalize */}
                  <p className="text-slate-600">
                    {toTitleCase(attendance.jabatan)} • {toTitleCase(attendance.departemen)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">NIK</label>
                    <p className="text-slate-900 font-medium">{attendance.nik}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Jabatan</label>
                    {/* 🔹 Capitalize */}
                    <p className="text-slate-900 font-medium">{toTitleCase(attendance.jabatan)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Divisi</label>
                    {/* 🔹 Capitalize */}
                    <p className="text-slate-900 font-medium">{toTitleCase(attendance.divisi)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Departemen</label>
                    {/* 🔹 Capitalize */}
                    <p className="text-slate-900 font-medium">{toTitleCase(attendance.departemen)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Unit Kerja</label>
                    {/* 🔹 Capitalize */}
                    <p className="text-slate-900 font-medium">{toTitleCase(attendance.unit_kerja)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Data Absensi (tidak diubah) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <span className="w-2 h-2 bg-[#25a298] rounded-full mr-3"></span>
                Data Absensi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4 pb-4 border-b border-slate-100">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal Absensi</label>
                  <p className="text-slate-900 font-medium text-lg">{formatDate(attendance.tanggal_absen)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Status Kehadiran</label>
                  <span className={`inline-flex px-4 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(attendance.status)}`}>
                    {getStatusText(attendance.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <label className="block text-sm font-medium text-slate-500 mb-1">Waktu Masuk</label>
                    <p className="text-[#25a298] font-bold text-2xl">{attendance.waktu_masuk}</p>
                  </div>
                  {attendance.foto_masuk && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-3">Foto Presensi Masuk</label>
                      <div className="relative group">
                        <img
                          src={`${import.meta.env.VITE_API_URL || window.location.origin}/uploads/attendance/${attendance.foto_masuk}?t=${Date.now()}`}
                          alt="Foto masuk"
                          loading="lazy"
                          onClick={() => handleImageClick(`${import.meta.env.VITE_API_URL || window.location.origin}/uploads/attendance/${attendance.foto_masuk}?t=${Date.now()}`)}
                          className="w-full aspect-square object-cover object-bottom rounded-2xl border-2 border-slate-200 shadow-sm transition-transform duration-200 group-hover:scale-[1.02] cursor-pointer"
                        />
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5 pointer-events-none"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <label className="block text-sm font-medium text-slate-500 mb-1">Waktu Keluar</label>
                    <p className="text-[#25a298] font-bold text-2xl">{attendance.waktu_keluar || '--:--'}</p>
                  </div>
                  {attendance.foto_keluar && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-3">Foto Presensi Keluar</label>
                      <div className="relative group">
                        <img
                          src={`${import.meta.env.VITE_API_URL || window.location.origin}/uploads/attendance/${attendance.foto_keluar}?t=${Date.now()}`}
                          alt="Foto keluar"
                          loading="lazy"
                          onClick={() => handleImageClick(`${import.meta.env.VITE_API_URL || window.location.origin}/uploads/attendance/${attendance.foto_keluar}?t=${Date.now()}`)}
                          className="w-full aspect-square object-cover object-bottom rounded-2xl border-2 border-slate-200 shadow-sm transition-transform duration-200 group-hover:scale-[1.02] cursor-pointer"
                        />
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5 pointer-events-none"></div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Modal Preview Gambar */}
                {previewImage && (
                  <div 
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                  >
                    <div className="relative max-w-4xl max-h-full">
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewImage(null)
                        }}
                        className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailAbsensi
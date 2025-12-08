import React, { useState, useEffect } from 'react'
import { leaveAPI } from '../../services/api'

interface LeaveRequest {
  id: number
  no: number
  nama: string
  unit_kerja: string
  nik: string
  jabatan: string
  departemen: string
  divisi: string
  statusIzin: 'sakit' | 'cuti' | 'lainnya'
  status: 'pending' | 'approved' | 'rejected'
  tanggalMulai: string
  tanggalSelesai: string
  keterangan: string
  lampiran?: string
}

const PengajuanIzin: React.FC = () => {
  const [selectedLeaveDate, setSelectedLeaveDate] = useState<string>(() => {
    return sessionStorage.getItem("selectedLeaveDatePengajuan") 
      || new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    sessionStorage.setItem("selectedLeaveDatePengajuan", selectedLeaveDate);
  }, [selectedLeaveDate]);

  const [searchPengajuan, setSearchPengajuan] = useState('')
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [currentPengajuanPage, setCurrentPengajuanPage] = useState(() => {
    return parseInt(sessionStorage.getItem('absensiPengajuanPage') || '1')
  })
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    sessionStorage.setItem('absensiPengajuanPage', currentPengajuanPage.toString())
  }, [currentPengajuanPage])

  useEffect(() => {
    fetchLeaveRequests()
  }, [selectedLeaveDate])

 const fetchLeaveRequests = async () => {
    try {
      const response = await leaveAPI.getAllLeaves()
      const leaves = response?.data?.leaves || []
      
      console.log('📋 Data leaves dari API:', leaves)

      // PERBAIKAN: Filter dengan konversi timezone yang benar
      const filteredLeaves = leaves.filter((leave: any) => {
        const selectedDate = new Date(selectedLeaveDate)
        const startDate = new Date(leave.start_date)
        const endDate = new Date(leave.end_date)
        
        // Konversi ke tanggal lokal Indonesia (UTC+7)
        const selectedLocal = new Date(selectedDate.getTime() + (7 * 60 * 60 * 1000))
        const startLocal = new Date(startDate.getTime() + (7 * 60 * 60 * 1000))  
        const endLocal = new Date(endDate.getTime() + (7 * 60 * 60 * 1000))
        
        // Bandingkan hanya bagian tanggal (tanpa waktu)
        const selectedDateStr = selectedLocal.toISOString().split('T')[0]
        const startDateStr = startLocal.toISOString().split('T')[0]
        const endDateStr = endLocal.toISOString().split('T')[0]
        
        console.log('🔍 Comparing dates:', { 
          selectedDate: selectedDateStr, 
          startDate: startDateStr, 
          endDate: endDateStr 
        })
        
        return selectedDateStr >= startDateStr && selectedDateStr <= endDateStr
      })

      console.log('✅ Data setelah filter:', filteredLeaves)

      const data = filteredLeaves.map((leave: any, index: number) => {
        return {
          id: leave.id,
          no: index + 1,
          nama: leave.nama || '-',
          unit_kerja: leave.unit_kerja || '-',
          nik: leave.nik || '-',
          jabatan: leave.jabatan || '-',
          departemen: leave.departemen || '-',
          divisi: leave.divisi || '-',
          statusIzin: leave.jenis_izin as 'sakit' | 'cuti' | 'lainnya',
          status: leave.status as 'pending' | 'approved' | 'rejected',
          tanggalMulai: leave.start_date,
          tanggalSelesai: leave.end_date,
          keterangan: leave.keterangan || 'Tidak ada keterangan',
          lampiran: leave.lampiran || ''
        }
      })
      
      console.log('🎯 Data yang akan ditampilkan:', data)
      setLeaveRequests(data)
    } catch (error: any) {
      console.error('Error fetching leave requests:', error)
      setLeaveRequests([])
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

  const filteredLeaveRequests = leaveRequests
    .filter(request =>
      request.nama.toLowerCase().includes(searchPengajuan.toLowerCase()) ||
      request.nik.toLowerCase().includes(searchPengajuan.toLowerCase()) ||
      request.unit_kerja.toLowerCase().includes(searchPengajuan.toLowerCase())
    )
    .sort((a, b) => a.nama.localeCompare(b.nama))

  const totalPengajuanPages = Math.ceil(filteredLeaveRequests.length / itemsPerPage)
  const startPengajuanIndex = (currentPengajuanPage - 1) * itemsPerPage
  const paginatedLeaveRequests = filteredLeaveRequests.slice(startPengajuanIndex, startPengajuanIndex + itemsPerPage)

  const handlePengajuanPageChange = (newPage: number) => {
    setCurrentPengajuanPage(newPage)
  }

  const handleApproveLeave = async (id: number) => {
    try {
      await leaveAPI.updateStatus(id, 'approved')
      fetchLeaveRequests()
      setShowDetailModal(false)
      alert('Pengajuan izin disetujui')
    } catch (error: any) {
      alert('Gagal menyetujui pengajuan izin')
    }
  }

  const handleRejectLeave = async (id: number) => {
    try {
      await leaveAPI.updateStatus(id, 'rejected')
      fetchLeaveRequests()
      setShowDetailModal(false)
      alert('Pengajuan izin ditolak')
    } catch (error: any) {
      alert('Gagal menolak pengajuan izin')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sakit': return 'bg-orange-100 text-orange-800'
      case 'cuti': return 'bg-purple-100 text-purple-800'
      case 'lainnya': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sakit': return 'Sakit'
      case 'cuti': return 'Cuti'
      case 'lainnya': return 'Lainnya'
      default: return status
    }
  }

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getApprovalStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu'
      case 'approved': return 'Disetujui'
      case 'rejected': return 'Ditolak'
      default: return status
    }
  }

  const openDetailModal = (request: LeaveRequest) => {
    setSelectedRequest(request)
    setShowDetailModal(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {formatDate(selectedLeaveDate)}
          </h2>
          <p className="text-sm text-slate-500">Kelola permohonan izin karyawan</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedLeaveDate}
            onChange={(e) => setSelectedLeaveDate(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] transition-all duration-200"
          />
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama, NIK, atau unit kerja..."
              value={searchPengajuan}
              onChange={(e) => setSearchPengajuan(e.target.value)}
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] transition-all duration-200"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              🔍
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit Kerja</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">NIK</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Jabatan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Departemen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Jenis Izin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedLeaveRequests.map((request, index) => (
                <tr key={request.id} className="hover:bg-slate-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{startPengajuanIndex + index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{request.nama}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{request.unit_kerja}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{request.nik}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{request.jabatan}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{request.departemen}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.statusIzin)}`}>
                      {getStatusText(request.statusIzin)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getApprovalStatusColor(request.status)}`}>
                      {getApprovalStatusText(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => openDetailModal(request)}
                      className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPengajuanPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Menampilkan {paginatedLeaveRequests.length > 0 ? startPengajuanIndex + 1 : 0}-{startPengajuanIndex + paginatedLeaveRequests.length} dari {filteredLeaveRequests.length} pengajuan
            </p>
            <div className="flex space-x-2">
              <button 
                onClick={() => handlePengajuanPageChange(currentPengajuanPage - 1)}
                disabled={currentPengajuanPage === 1}
                className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              {Array.from({ length: totalPengajuanPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePengajuanPageChange(page)}
                  className={`px-3 py-1 rounded-lg transition-colors duration-200 ${
                    currentPengajuanPage === page
                      ? 'bg-[#25a298] text-white'
                      : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button 
                onClick={() => handlePengajuanPageChange(currentPengajuanPage + 1)}
                disabled={currentPengajuanPage === totalPengajuanPages}
                className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col transform transition-all duration-300 scale-100 max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-primary-500 px-4 py-3 rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                  <span className="text-white text-sm">📋</span>
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">Detail Pengajuan Izin</h1>
                  <p className="text-white/80 text-xs">Informasi lengkap pengajuan izin</p>
                </div>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              <div className="space-y-4">
                {/* Data Karyawan */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">👤</span>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-800">Data Karyawan</h2>
                      <p className="text-gray-600 text-xs">Informasi identitas karyawan</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={selectedRequest.nama}
                            readOnly
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            🪪
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Jabatan</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={selectedRequest.jabatan}
                            readOnly
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            📊
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Divisi</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={selectedRequest.divisi}
                            readOnly
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            🏢
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">NIK</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={selectedRequest.nik}
                            readOnly
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            🆔
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Departemen</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={selectedRequest.departemen}
                            readOnly
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            🏛️
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Kerja</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={selectedRequest.unit_kerja}
                            readOnly
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            📍
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Izin */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">📅</span>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-800">Data Izin</h2>
                      <p className="text-gray-600 text-xs">Informasi pengajuan izin</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Izin</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={getStatusText(selectedRequest.statusIzin)}
                            readOnly
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            🏷️
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Mulai</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formatDate(selectedRequest.tanggalMulai)}
                            readOnly
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            📅
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                        <div className="relative">
                          <span className={`inline-flex w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 pl-10 items-center ${getApprovalStatusColor(selectedRequest.status)}`}>
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                              📊
                            </div>
                            {getApprovalStatusText(selectedRequest.status)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Selesai</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formatDate(selectedRequest.tanggalSelesai)}
                            readOnly
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            📅
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Keterangan */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">📝</span>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-800">Keterangan</h2>
                      <p className="text-gray-600 text-xs">Alasan pengajuan izin</p>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-start space-x-3">
                      <div className="flex-1">
                        <p className="text-sm text-amber-800 font-medium whitespace-pre-wrap">
                          {selectedRequest.keterangan || 'Tidak ada keterangan'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lampiran */}
                {selectedRequest.lampiran ? (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">📎</span>
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-800">Lampiran</h2>
                        <p className="text-gray-600 text-xs">Dokumen pendukung</p>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-lg">📷</span>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm font-medium text-purple-800">File Terlampir</p>
                          <p className="text-xs text-purple-600 mt-1">Dokumen pendukung yang diupload</p>
                        </div>
                        
                        <div className="w-full max-w-xs">
                          <img 
                            src={selectedRequest.lampiran} 
                            alt="Lampiran" 
                            className="w-full h-auto rounded-lg border-2 border-purple-300 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                            onClick={() => window.open(selectedRequest.lampiran, '_blank')}
                          />
                        </div>
                        
                        <button
                          onClick={() => window.open(selectedRequest.lampiran, '_blank')}
                          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors duration-200 flex items-center space-x-2"
                        >
                          <span>👁️</span>
                          <span>Lihat Full Size</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gradient-to-r from-slate-400 to-gray-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">📎</span>
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-800">Lampiran</h2>
                        <p className="text-gray-600 text-xs">Dokumen pendukung</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 text-center">
                      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-gray-500 text-xl">📄</span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">Tidak ada lampiran</p>
                      <p className="text-xs text-gray-500 mt-1">User tidak mengupload dokumen pendukung</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            {selectedRequest.status === 'pending' && (
              <div className="bg-white px-4 py-3 rounded-b-xl border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-1 text-gray-600 text-xs">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Tinjau pengajuan izin sebelum mengambil keputusan</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(false)}
                      className="px-4 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 border border-gray-300"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectLeave(selectedRequest.id)}
                      className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-1"
                    >
                      <span>❌</span>
                      <span>Tolak</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveLeave(selectedRequest.id)}
                      className="px-4 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-1"
                    >
                      <span>✅</span>
                      <span>Setujui</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedRequest.status !== 'pending' && (
              <div className="bg-white px-4 py-3 rounded-b-xl border-t border-gray-200">
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 border border-gray-300"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PengajuanIzin
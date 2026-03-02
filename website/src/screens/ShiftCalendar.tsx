import React, { useState } from 'react'

interface Shift {
  id: number
  kode_shift: string
  nama_shift: string
  jam_masuk: string
  jam_keluar: string
  toleransi_telat_minutes: number
  is_active: boolean
  is_default: boolean
}

interface Employee {
  id: number
  nama: string
  nik: string
  email: string
  jabatan: string
  departemen: string
  divisi: string
  unit_kerja_id: number
  shift_id: number
  nama_shift: string
  jam_masuk: string
  jam_keluar: string
  nama_unit: string
  timezone?: string
}

interface ShiftCalendarProps {
  employees: Employee[]
  shifts: Shift[]
  employeeShifts: { [key: number]: Shift }
  searchData: string
  setSearchData: (search: string) => void
  selectedUnit: number | null
  selectedUnitName: string
  currentPage: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
  loading?: boolean
}

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({
  employees,
  shifts,
  employeeShifts,
  searchData,
  setSearchData,
  selectedUnit,
  selectedUnitName,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  loading = false
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return ''
    return timeString.substring(0, 5)
  }

  const getWeekDates = () => {
    const dates = []
    const current = new Date(selectedDate)
    const startOfWeek = new Date(current)
    startOfWeek.setDate(current.getDate() - current.getDay())
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + (direction === 'prev' ? -7 : 7))
    setSelectedDate(current.toISOString().split('T')[0])
  }

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short'
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getShiftStats = () => {
    const stats: {[key: string]: number} = {}
    shifts.forEach(shift => {
      stats[shift.kode_shift] = 0
    })
    
    Object.values(employeeShifts).forEach(shift => {
      if (shift && stats[shift.kode_shift] !== undefined) {
        stats[shift.kode_shift]++
      }
    })
    
    return stats
  }

  const paginateKalender = (pageNumber: number) => setCurrentPage(pageNumber)
  const nextPageKalender = () => currentPage < totalPagesKalender && setCurrentPage(currentPage + 1)
  const prevPageKalender = () => currentPage > 1 && setCurrentPage(currentPage - 1)

  const filteredEmployees = employees.filter(employee =>
    employee.nama.toLowerCase().includes(searchData.toLowerCase()) ||
    employee.nik.toLowerCase().includes(searchData.toLowerCase()) ||
    employee.jabatan.toLowerCase().includes(searchData.toLowerCase()) ||
    (employee.nama_shift && employee.nama_shift.toLowerCase().includes(searchData.toLowerCase()))
  )

  const indexOfLastItemKalender = currentPage * itemsPerPage
  const indexOfFirstItemKalender = indexOfLastItemKalender - itemsPerPage
  const currentEmployeesKalender = filteredEmployees.slice(indexOfFirstItemKalender, indexOfLastItemKalender)
  const totalPagesKalender = Math.ceil(filteredEmployees.length / itemsPerPage)

  const weekDates = getWeekDates()
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const shiftStats = getShiftStats()

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        {/* Bagian kiri: Judul dan deskripsi */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
            Kalender Shift Mingguan
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Jadwal shift {selectedUnitName && `- ${selectedUnitName}`}
          </p>
        </div>

        {/* Bagian kanan: Kontrol dan pencarian */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Tombol dan navigasi mingguan */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={goToToday}
              className="px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Hari Ini
            </button>
            <div className="flex border border-slate-300 rounded-lg overflow-hidden">
              <button
                onClick={() => navigateWeek('prev')}
                className="px-3 sm:px-4 py-2 hover:bg-slate-50 transition-colors"
                aria-label="Minggu sebelumnya"
              >
                ←
              </button>
              <div className="w-px bg-slate-300"></div>
              <button
                onClick={() => navigateWeek('next')}
                className="px-3 sm:px-4 py-2 hover:bg-slate-50 transition-colors"
                aria-label="Minggu berikutnya"
              >
                →
              </button>
            </div>
          </div>

          {/* Pencarian - konsisten dengan halaman lain */}
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari nama atau NIK..."
              value={searchData}
              onChange={(e) => setSearchData(e.target.value)}
              className="pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 w-full sm:w-64 lg:w-80 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] transition-all duration-200 text-sm"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {shifts.filter(shift => shift.is_active).map((shift) => (
          <div key={shift.id} className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{shift.nama_shift}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{shiftStats[shift.kode_shift] || 0}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatTimeForDisplay(shift.jam_masuk)} - {formatTimeForDisplay(shift.jam_keluar)}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                shift.is_default ? 'bg-green-50' : 'bg-blue-50'
              }`}>
                <span className={`text-lg ${
                  shift.is_default ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {shift.kode_shift}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-20 min-w-[180px] sm:min-w-40">
                        Karyawan
                      </th>
                      {weekDates.map((date, index) => (
                        <th 
                          key={index}
                          className={`px-3 sm:px-4 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[110px] sm:min-w-32 ${
                            isToday(date) ? 'bg-[#25a298] text-white' : ''
                          }`}
                        >
                          <div className="text-xs">{dayNames[index]}</div>
                          <div className={`text-xs sm:text-sm font-normal mt-1 ${
                            isToday(date) ? 'text-white' : 'text-slate-600'
                          }`}>
                            {formatDate(date)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {currentEmployeesKalender.length > 0 ? (
                      currentEmployeesKalender.map((employee) => (
                        <tr key={employee.id} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 min-w-[180px] sm:min-w-40">
                            <div className="text-sm font-medium text-slate-900">{employee.nama}</div>
                            <div className="text-xs text-slate-500">{employee.nik} • {employee.jabatan}</div>
                            <div className="text-xs text-slate-400">
                              {employee.nama_unit}
                              {employee.timezone && (
                                <span className="ml-1 text-xs text-slate-500">
                                  ({employee.timezone === 'Asia/Jakarta' ? 'WIB' : 
                                    employee.timezone === 'Asia/Makassar' ? 'WITA' : 
                                    employee.timezone === 'Asia/Jayapura' ? 'WIT' : 
                                    employee.timezone})
                                </span>
                              )}
                            </div>
                          </td>
                          {weekDates.map((date, index) => (
                            <td key={index} className="px-3 sm:px-4 py-4 text-center min-w-[110px] sm:min-w-32">
                              {employeeShifts[employee.id] ? (
                                <div className="flex flex-col items-center">
                                  <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                                    employeeShifts[employee.id].is_default 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {employeeShifts[employee.id].kode_shift}
                                  </span>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {formatTimeForDisplay(employeeShifts[employee.id].jam_masuk)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-300 text-sm">-</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-500">
                          {searchData ? 'Tidak ada karyawan yang sesuai' : 'Tidak ada karyawan di unit ini'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>`

        {totalPagesKalender > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              {/* Info Penampilan Data */}
              <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-left w-full sm:w-auto">
                Menampilkan <span className="font-medium text-[#25a298]">{currentEmployeesKalender.length > 0 ? indexOfFirstItemKalender + 1 : 0}</span>-<span className="font-medium text-[#25a298]">{Math.min(indexOfLastItemKalender, filteredEmployees.length)}</span> dari <span className="font-medium text-[#25a298]">{filteredEmployees.length}</span> karyawan
              </p>
              
              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
                {/* Desktop Pagination (tampil di semua layar) */}
                <div className="hidden sm:flex items-center space-x-1 sm:space-x-2">
                  <button 
                    onClick={prevPageKalender}
                    disabled={currentPage === 1}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[60px]"
                    aria-label="Halaman sebelumnya"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden xs:inline">Sebelumnya</span>
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPagesKalender) }, (_, i) => {
                      let pageNum;
                      if (totalPagesKalender <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPagesKalender - 2) {
                        pageNum = totalPagesKalender - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => paginateKalender(pageNum)}
                          className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors duration-200 font-medium ${
                            currentPage === pageNum
                              ? 'bg-[#25a298] text-white shadow-sm'
                              : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                          aria-label={`Halaman ${pageNum}`}
                          aria-current={currentPage === pageNum ? "page" : undefined}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button 
                    onClick={nextPageKalender}
                    disabled={currentPage === totalPagesKalender}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[60px]"
                    aria-label="Halaman berikutnya"
                  >
                    <span className="hidden xs:inline">Selanjutnya</span>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                {/* Mobile Pagination (hanya tampil di mobile) */}
                <div className="flex sm:hidden items-center justify-between w-full max-w-xs mx-auto">
                  <button 
                    onClick={prevPageKalender}
                    disabled={currentPage === 1}
                    className="px-4 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center flex-1 justify-center mr-2"
                    aria-label="Halaman sebelumnya"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Prev
                  </button>
                  
                  <div className="flex items-center space-x-2 mx-2">
                    <span className="text-sm font-medium text-[#25a298] px-3 py-1.5 bg-slate-50 rounded-lg">
                      {currentPage} / {totalPagesKalender}
                    </span>
                  </div>
                  
                  <button 
                    onClick={nextPageKalender}
                    disabled={currentPage === totalPagesKalender}
                    className="px-4 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center flex-1 justify-center ml-2"
                    aria-label="Halaman berikutnya"
                  >
                    Next
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShiftCalendar
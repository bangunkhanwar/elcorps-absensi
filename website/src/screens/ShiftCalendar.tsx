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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Kalender Shift Mingguan
          </h2>
          <p className="text-sm text-slate-500">Jadwal shift {selectedUnitName && `- ${selectedUnitName}`}</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Hari Ini
          </button>
          <div className="flex border border-slate-300 rounded-lg overflow-hidden">
            <button
              onClick={() => navigateWeek('prev')}
              className="px-4 py-2 hover:bg-slate-50 transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => navigateWeek('next')}
              className="px-4 py-2 hover:bg-slate-50 transition-colors"
            >
              →
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama atau NIK..."
              value={searchData}
              onChange={(e) => setSearchData(e.target.value)}
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] transition-all duration-200"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
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
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 min-w-40">
                  Karyawan
                </th>
                {weekDates.map((date, index) => (
                  <th 
                    key={index}
                    className={`px-4 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider min-w-32 ${
                      isToday(date) ? 'bg-[#25a298] text-white' : ''
                    }`}
                  >
                    <div>{dayNames[index]}</div>
                    <div className={`text-sm font-normal mt-1 ${
                      isToday(date) ? 'text-white' : 'text-slate-600'
                    }`}>
                      {formatDate(date)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentEmployeesKalender.length > 0 ? (
                currentEmployeesKalender.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
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
                      <td key={index} className="px-4 py-4 text-center">
                        {employeeShifts[employee.id] ? (
                          <div className="flex flex-col items-center">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
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

        {totalPagesKalender > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Menampilkan {currentEmployeesKalender.length > 0 ? indexOfFirstItemKalender + 1 : 0}-{Math.min(indexOfLastItemKalender, filteredEmployees.length)} dari {filteredEmployees.length} karyawan
            </p>
            <div className="flex space-x-2">
              <button 
                onClick={prevPageKalender}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              {Array.from({ length: totalPagesKalender }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => paginateKalender(page)}
                  className={`px-3 py-1 rounded-lg transition-colors duration-200 ${
                    currentPage === page
                      ? 'bg-[#25a298] text-white'
                      : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button 
                onClick={nextPageKalender}
                disabled={currentPage === totalPagesKalender}
                className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShiftCalendar
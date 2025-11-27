import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, shiftAPI } from '../services/api'

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
}

const ShiftManagement: React.FC = () => {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<number | null>(() => {
    const saved = localStorage.getItem('selectedUnit')
    return saved ? parseInt(saved) : null
  })
  const [selectedUnitName, setSelectedUnitName] = useState<string>(() => {
    return localStorage.getItem('selectedUnitName') || ''
  })
  const [user, setUser] = useState<any>(null)
  const [units, setUnits] = useState<any[]>([])
  
  const [activeTab, setActiveTab] = useState<'pengaturan' | 'kalender'>(() => {
    return (sessionStorage.getItem('shiftActiveTab') as 'pengaturan' | 'kalender') || 'pengaturan'
  })
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [searchData, setSearchData] = useState('')
  
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  const [searchUnit, setSearchUnit] = useState('')
  const unitDropdownRef = useRef<HTMLDivElement>(null)
  const unitSearchRef = useRef<HTMLInputElement>(null)

  const [employeeShifts, setEmployeeShifts] = useState<{[key: number]: Shift}>({})
  const [pendingChanges, setPendingChanges] = useState<{[key: number]: number}>({})

  useEffect(() => {
    sessionStorage.setItem('shiftActiveTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    fetchUserProfile()
    
    const handleClickOutside = (event: MouseEvent) => {
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) {
        setShowUnitDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (showUnitDropdown && unitSearchRef.current) {
      unitSearchRef.current.focus()
    }
  }, [showUnitDropdown])

  useEffect(() => {
    if (selectedUnit) {
      localStorage.setItem('selectedUnit', selectedUnit.toString())
    }
    if (selectedUnitName) {
      localStorage.setItem('selectedUnitName', selectedUnitName)
    }
  }, [selectedUnit, selectedUnitName])

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile()
      setUser(response.data.user)
      
      await fetchUnits()
      
      if (response.data.user.role === 'leader_store' && response.data.user.unit_kerja_id) {
        const unitId = response.data.user.unit_kerja_id
        const unitName = response.data.user.unit_kerja || ''
        setSelectedUnit(unitId)
        setSelectedUnitName(unitName)
        fetchData(unitId)
      } else if (selectedUnit) {
        fetchData(selectedUnit)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchUnits = async () => {
    try {
      const response = await authAPI.getAllUnitKerja()
      setUnits(response.data)
    } catch (error) {
      console.error('Error fetching units:', error)
      setUnits([])
    }
  }

  const fetchData = async (unitId: number) => {
    if (!unitId) return;
    
    try {
      setLoading(true)
      
      const [employeesRes, shiftsRes] = await Promise.allSettled([
        authAPI.getEmployeesByUnit(unitId),
        shiftAPI.getShiftsByUnit(unitId)
      ])
      
      if (employeesRes.status === 'fulfilled') {
        const employeesData = employeesRes.value.data || []
        const sortedEmployees = employeesData.sort((a: Employee, b: Employee) => 
          a.nama.localeCompare(b.nama)
        )
        setEmployees(sortedEmployees)
        
        const shiftsMap: {[key: number]: Shift} = {}
        sortedEmployees.forEach((emp: Employee) => {
          if (emp.shift_id) {
            const shift = shifts.find(s => s.id === emp.shift_id)
            if (shift) {
              shiftsMap[emp.id] = shift
            }
          }
        })
        setEmployeeShifts(shiftsMap)
      } else {
        setEmployees([])
        setEmployeeShifts({})
      }
      
      if (shiftsRes.status === 'fulfilled') {
        setShifts(shiftsRes.value.data || [])
      } else {
        setShifts([])
      }
      
    } catch (error) {
      console.error('Error in fetchData:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateEmployeeShift = async (employeeId: number, shiftId: number) => {
    try {
      await shiftAPI.updateEmployeeShift(employeeId, shiftId)
      
      const shift = shifts.find(s => s.id === shiftId)
      if (shift) {
        setEmployeeShifts(prev => ({
          ...prev,
          [employeeId]: shift
        }))
      }
      
      setPendingChanges(prev => {
        const newChanges = {...prev}
        delete newChanges[employeeId]
        return newChanges
      })
      
    } catch (error: any) {
      console.error('Error updating shift:', error)
      alert(`Gagal mengupdate shift: ${error.response?.data?.error || error.message}`)
    }
  }

  const handleUnitSelect = (unitId: number, unitName: string) => {
    setSelectedUnit(unitId)
    setSelectedUnitName(unitName)
    setShowUnitDropdown(false)
    setSearchUnit('')
    fetchData(unitId)
  }

  const resetUnitSelection = () => {
    setSelectedUnit(null)
    setSelectedUnitName('')
    setEmployees([])
    setShifts([])
    setEmployeeShifts({})
    setPendingChanges({})
    setSearchUnit('')
    localStorage.removeItem('selectedUnit')
    localStorage.removeItem('selectedUnitName')
  }

  const resetUnitSearch = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchUnit('')
    if (unitSearchRef.current) {
      unitSearchRef.current.focus()
    }
  }

  const handleShiftChange = (employeeId: number, shiftId: number) => {
    setPendingChanges(prev => ({
      ...prev,
      [employeeId]: shiftId
    }))
    
    const shift = shifts.find(s => s.id === shiftId)
    if (shift) {
      setEmployeeShifts(prev => ({
        ...prev,
        [employeeId]: shift
      }))
    }
  }

  const saveAllChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      alert('Tidak ada perubahan yang perlu disimpan')
      return
    }

    try {
      setLoading(true)
      const promises = Object.entries(pendingChanges).map(([employeeId, shiftId]) =>
        updateEmployeeShift(Number(employeeId), shiftId)
      )
      
      await Promise.all(promises)
      alert('Semua perubahan berhasil disimpan!')
      
    } catch (error) {
      console.error('Error saving changes:', error)
      alert('Terjadi kesalahan saat menyimpan perubahan')
    } finally {
      setLoading(false)
    }
  }

  // Calendar functions
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

  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return ''
    // Format dari "09:00:00" menjadi "09:00"
    return timeString.substring(0, 5)
  }

  const filteredUnits = units.filter(unit =>
    unit.nama_unit.toLowerCase().includes(searchUnit.toLowerCase()) ||
    (unit.kode_unit && unit.kode_unit.toLowerCase().includes(searchUnit.toLowerCase()))
  )

  const filteredEmployees = employees.filter(employee =>
    employee.nama.toLowerCase().includes(searchData.toLowerCase()) ||
    employee.nik.toLowerCase().includes(searchData.toLowerCase()) ||
    employee.jabatan.toLowerCase().includes(searchData.toLowerCase()) ||
    (employee.nama_shift && employee.nama_shift.toLowerCase().includes(searchData.toLowerCase()))
  )

  const weekDates = getWeekDates()
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  // Stats for calendar view
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

  const shiftStats = getShiftStats()

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
                <h1 className="text-2xl font-bold text-[#25a298]">Pengaturan Shift</h1>
                <p className="text-sm text-slate-500">Kelola jadwal shift karyawan</p>
              </div>
            </div>
            
            {Object.keys(pendingChanges).length > 0 && (
              <button
                onClick={saveAllChanges}
                disabled={loading}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Menyimpan...' : `Simpan ${Object.keys(pendingChanges).length} Perubahan`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Unit Selection */}
        {user?.role === 'hr' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="relative" ref={unitDropdownRef}>
                  <div
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white cursor-pointer flex justify-between items-center hover:border-slate-400 transition-colors"
                    onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                  >
                    <span className={selectedUnitName ? "text-slate-900" : "text-slate-500"}>
                      {selectedUnitName || "Pilih Unit Kerja..."}
                    </span>
                    <span className="text-slate-400 transform transition-transform">
                      {showUnitDropdown ? '▲' : '▼'}
                    </span>
                  </div>

                  {showUnitDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                      <div className="p-2 border-b border-slate-200">
                        <div className="relative">
                          <input
                            ref={unitSearchRef}
                            type="text"
                            placeholder="Cari unit kerja..."
                            value={searchUnit}
                            onChange={(e) => setSearchUnit(e.target.value)}
                            className="w-full px-3 py-2 pl-3 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] text-sm"
                          />
                          {searchUnit && (
                            <button
                              onClick={resetUnitSearch}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto">
                        {filteredUnits.length > 0 ? (
                          filteredUnits.map((unit) => (
                            <div
                              key={unit.id}
                              className={`px-4 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0 ${
                                selectedUnit === unit.id ? 'bg-[#25a298] text-white hover:bg-[#1f8a80]' : ''
                              }`}
                              onClick={() => handleUnitSelect(unit.id, unit.nama_unit)}
                            >
                              <div className="text-sm font-medium">{unit.nama_unit}</div>
                              {unit.kode_unit && (
                                <div className={`text-xs ${selectedUnit === unit.id ? 'text-blue-100' : 'text-slate-500'}`}>
                                  {unit.kode_unit}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-center text-slate-500 text-sm">
                            {searchUnit ? 'Tidak ada unit yang sesuai dengan pencarian' : 'Tidak ada unit kerja tersedia'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedUnitName && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <p className="text-green-800 text-sm">
                      <span className="font-medium">Unit:</span> {selectedUnitName}
                    </p>
                  </div>
                )}
                
                {selectedUnit && (
                  <button
                    onClick={resetUnitSelection}
                    className="px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm transition-colors whitespace-nowrap"
                  >
                    Reset Unit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {user?.role === 'leader_store' && selectedUnit && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 mb-6">
            <p className="text-blue-700 text-sm">
              Anda mengelola shift untuk unit: <strong>{selectedUnitName}</strong>
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('pengaturan')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-300 ${
                activeTab === 'pengaturan'
                  ? 'text-[#25a298] border-b-2 border-[#25a298]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pengaturan Shift
            </button>
            <button
              onClick={() => setActiveTab('kalender')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-300 ${
                activeTab === 'kalender'
                  ? 'text-[#25a298] border-b-2 border-[#25a298]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Kalender Shift
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'pengaturan' && (
              <div>
                {/* Shift Summary */}
                {selectedUnit && shifts.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Shift Tersedia</h3>
                    <div className="flex flex-wrap gap-3">
                      {shifts.filter(shift => shift.is_active).map((shift) => (
                        <div key={shift.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                          <div className={`w-3 h-3 rounded-full ${
                            shift.is_default ? 'bg-green-500' : 'bg-blue-500'
                          }`}></div>
                          <span className="text-sm font-medium">{shift.nama_shift}</span>
                          <span className="text-xs text-slate-500">
                            ({formatTimeForDisplay(shift.jam_masuk)} - {formatTimeForDisplay(shift.jam_keluar)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Employee List */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Daftar Karyawan {selectedUnitName && `- ${selectedUnitName}`}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {filteredEmployees.length} karyawan
                          {Object.keys(pendingChanges).length > 0 && (
                            <span className="ml-2 text-orange-600 font-medium">
                              ({Object.keys(pendingChanges).length} perubahan)
                            </span>
                          )}
                        </p>
                      </div>
                      
                      {selectedUnit && (
                        <div className="w-full sm:w-64">
                          <input
                            type="text"
                            placeholder="Cari nama, NIK, jabatan..."
                            value={searchData}
                            onChange={(e) => setSearchData(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#25a298]"></div>
                      <p className="mt-2 text-slate-600 text-sm">Memuat data...</p>
                    </div>
                  ) : !selectedUnit ? (
                    <div className="p-8 text-center">
                      <p className="text-slate-500">Pilih unit kerja terlebih dahulu</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-12">No</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nama</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">NIK</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Jabatan</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Unit Kerja</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Shift</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((employee, index) => (
                              <tr 
                                key={employee.id} 
                                className={`hover:bg-slate-50 border-b border-slate-100 ${
                                  pendingChanges[employee.id] ? 'bg-yellow-50 hover:bg-yellow-100' : ''
                                }`}
                              >
                                <td className="px-4 py-3 text-center">
                                  <div className="text-sm font-medium text-slate-900">{index + 1}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-slate-900">{employee.nama}</div>
                                  <div className="text-xs text-slate-500">{employee.email}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="text-sm text-slate-600">{employee.nik}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="text-sm text-slate-600">{employee.jabatan}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="text-sm text-slate-600">{employee.nama_unit}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {employeeShifts[employee.id] ? (
                                    <div>
                                      <div className="text-sm font-medium text-slate-900">
                                        {employeeShifts[employee.id].nama_shift}
                                        {pendingChanges[employee.id] && (
                                          <span className="ml-1 text-xs text-orange-600">*</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {formatTimeForDisplay(employeeShifts[employee.id].jam_masuk)} - {formatTimeForDisplay(employeeShifts[employee.id].jam_keluar)}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-sm">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <select
                                    value={employeeShifts[employee.id]?.id || ''}
                                    onChange={(e) => handleShiftChange(employee.id, Number(e.target.value))}
                                    className="text-sm border border-slate-300 rounded px-3 py-1 focus:outline-none focus:ring-1 focus:ring-[#25a298] focus:border-[#25a298]"
                                  >
                                    <option value="">Pilih Shift</option>
                                    {shifts.filter(shift => shift.is_active).map((shift) => (
                                      <option key={shift.id} value={shift.id}>
                                        {shift.nama_shift} ({formatTimeForDisplay(shift.jam_masuk)} - {formatTimeForDisplay(shift.jam_keluar)})
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-6 py-6 text-center text-sm text-slate-500">
                                {searchData ? 'Tidak ada karyawan yang sesuai' : 'Tidak ada karyawan di unit ini'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'kalender' && (
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

                {/* Shift Stats */}
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

                {/* Calendar Grid */}
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
                        {filteredEmployees.slice(0, 10).map((employee) => (
                          <tr key={employee.id} className="hover:bg-slate-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                              <div className="text-sm font-medium text-slate-900">{employee.nama}</div>
                              <div className="text-xs text-slate-500">{employee.nik} • {employee.jabatan}</div>
                              <div className="text-xs text-slate-400">{employee.nama_unit}</div>
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
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredEmployees.length === 0 && (
                    <div className="px-6 py-8 text-center">
                      <div className="text-slate-500">
                        <p className="text-lg">👥</p>
                        <p className="mt-2">Tidak ada karyawan yang sesuai</p>
                      </div>
                    </div>
                  )}

                  {filteredEmployees.length > 10 && (
                    <div className="px-6 py-4 border-t border-slate-200 text-center">
                      <p className="text-sm text-slate-500">
                        Menampilkan 10 dari {filteredEmployees.length} karyawan
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShiftManagement
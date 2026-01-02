import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, shiftAPI, settingsAPI } from '../services/api'
import ShiftCalendar from './ShiftCalendar'
import ShiftModal from './ShiftModal'

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
  const [searchData, setSearchData] = useState('')
  
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  const [searchUnit, setSearchUnit] = useState('')
  const unitDropdownRef = useRef<HTMLDivElement>(null)
  const unitSearchRef = useRef<HTMLInputElement>(null)

  const [employeeShifts, setEmployeeShifts] = useState<{[key: number]: Shift}>({})
  const [pendingChanges, setPendingChanges] = useState<{[key: number]: number}>({})

  // State untuk modal shift
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [shiftForm, setShiftForm] = useState({
    kode_shift: '',
    nama_shift: '',
    jam_masuk: '',
    jam_keluar: '',
    toleransi_telat_minutes: 5,
    is_default: false
  })

  const [savingShift, setSavingShift] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [currentPageKalender, setCurrentPageKalender] = useState(1)
  const itemsPerPage = 10

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

  useEffect(() => {
    setCurrentPage(1)
    setCurrentPageKalender(1)
  }, [searchData, selectedUnit])

  // PERBAIKAN: useEffect untuk sinkronisasi employeeShifts dengan data terbaru
  useEffect(() => {
    if (employees.length > 0 && shifts.length > 0) {
      const updatedShiftsMap: {[key: number]: Shift} = {}
      employees.forEach(employee => {
        if (employee.shift_id) {
          const shift = shifts.find(s => s.id === employee.shift_id)
          if (shift) {
            updatedShiftsMap[employee.id] = shift
          }
        }
      })
      setEmployeeShifts(updatedShiftsMap)
    }
  }, [employees, shifts])

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile()
      const userData = response.data.user
      setUser(userData)
      
      console.log('👤 User profile loaded:', {
        id: userData.id,
        nama: userData.nama,
        role: userData.role,
        jabatan: userData.jabatan,
        unit_kerja_id: userData.unit_kerja_id,
        unit_kerja: userData.unit_kerja,
        website_access: userData.website_access,
        website_privileges: userData.website_privileges
      })
      
      await fetchUnits()
      
      // HR: bisa pilih unit mana saja
      if (userData.role === 'hr') {
        if (selectedUnit) {
          fetchData(selectedUnit)
        }
      } 
      // Leader (karyawan dengan website_access=true): otomatis pilih unit mereka
      else if (userData.website_access === true && userData.unit_kerja_id) {
        const unitId = userData.unit_kerja_id
        const unitName = userData.unit_kerja || ''
        
        console.log('📍 Auto-selecting unit for leader:', { 
          unitId, 
          unitName,
          userUnitId: userData.unit_kerja_id 
        })
        
        setSelectedUnit(unitId)
        setSelectedUnitName(unitName)
        fetchData(unitId)
      }
      // Fallback: jika ada selectedUnit sebelumnya (untuk kompatibilitas)
      else if (selectedUnit) {
        fetchData(selectedUnit)
      } else {
        console.warn('⚠️ No unit selected and user is not a leader with website_access')
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
      
      // PERBAIKAN: Simpan data employees dan shifts
      let employeesData: Employee[] = []
      let shiftsData: Shift[] = []

      if (employeesRes.status === 'fulfilled') {
        employeesData = employeesRes.value.data || []
        const sortedEmployees = employeesData.sort((a: Employee, b: Employee) => 
          a.nama.localeCompare(b.nama)
        )
        setEmployees(sortedEmployees)
        employeesData = sortedEmployees
      } else {
        setEmployees([])
      }
      
      if (shiftsRes.status === 'fulfilled') {
        shiftsData = shiftsRes.value.data || []
        setShifts(shiftsData)
      } else {
        setShifts([])
      }

      // PERBAIKAN: Build employee shifts mapping dengan data yang sudah di-fetch
      const shiftsMap: {[key: number]: Shift} = {}
      employeesData.forEach((emp: Employee) => {
        if (emp.shift_id) {
          const shift = shiftsData.find(s => s.id === emp.shift_id)
          if (shift) {
            shiftsMap[emp.id] = shift
          }
        }
      })
      setEmployeeShifts(shiftsMap)
      
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
        
        // PERBAIKAN: Update juga employee state
        setEmployees(prev => prev.map(emp => 
          emp.id === employeeId 
            ? { ...emp, shift_id: shiftId, nama_shift: shift.nama_shift, jam_masuk: shift.jam_masuk, jam_keluar: shift.jam_keluar }
            : emp
        ))
      }
      
      setPendingChanges(prev => {
        const newChanges = {...prev}
        delete newChanges[employeeId]
        return newChanges
      })
      
    } catch (error: any) {
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
      
      // PERBAIKAN: Update juga employee state untuk konsistensi
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, shift_id: shiftId, nama_shift: shift.nama_shift, jam_masuk: shift.jam_masuk, jam_keluar: shift.jam_keluar }
          : emp
      ))
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
      alert('Terjadi kesalahan saat menyimpan perubahan')
    } finally {
      setLoading(false)
    }
  }

  // Shift Management Functions
  const openAddShiftModal = () => {
    setEditingShift(null)
    setShiftForm({
      kode_shift: '',
      nama_shift: '',
      jam_masuk: '',
      jam_keluar: '',
      toleransi_telat_minutes: 5,
      is_default: false
    })
    setShowShiftModal(true)
  }

  const openEditShiftModal = (shift: Shift) => {
    setEditingShift(shift)
    setShiftForm({
      kode_shift: shift.kode_shift,
      nama_shift: shift.nama_shift,
      jam_masuk: shift.jam_masuk.substring(0, 5),
      jam_keluar: shift.jam_keluar.substring(0, 5),
      toleransi_telat_minutes: shift.toleransi_telat_minutes,
      is_default: shift.is_default
    })
    setShowShiftModal(true)
  }

  const saveShift = async () => {
    if (!selectedUnit) {
      alert('Pilih unit kerja terlebih dahulu')
      return
    }

    try {
      setSavingShift(true)
      const shiftData = {
        ...shiftForm,
        unit_kerja_id: selectedUnit,
        jam_masuk: `${shiftForm.jam_masuk}:00`,
        jam_keluar: `${shiftForm.jam_keluar}:00`
      }

      let savedShift
      if (editingShift) {
        const response = await settingsAPI.updateShift(editingShift.id, shiftData)
        savedShift = response.data.shift
      } else {
        const response = await settingsAPI.createShift(shiftData)
        savedShift = response.data
      }

      // Jika shift dijadikan default, update semua karyawan di unit ini
      if (shiftForm.is_default && savedShift) {
        try {
          // PERBAIKAN: Gunakan fungsi update massal
          await authAPI.updateAllEmployeesShift(selectedUnit, savedShift.id)
          
          // PERBAIKAN: Update local state secara langsung
          const newEmployeeShifts: {[key: number]: Shift} = {}
          const updatedEmployees = employees.map(emp => {
            newEmployeeShifts[emp.id] = savedShift
            return {
              ...emp,
              shift_id: savedShift.id,
              nama_shift: savedShift.nama_shift,
              jam_masuk: savedShift.jam_masuk,
              jam_keluar: savedShift.jam_keluar
            }
          })
          
          setEmployees(updatedEmployees)
          setEmployeeShifts(newEmployeeShifts)
          
          alert('Shift berhasil disimpan dan semua karyawan di unit ini telah diupdate ke shift default!')
        } catch (error: any) {
          console.error('Error updating employees to default shift:', error)
          alert('Shift berhasil disimpan, tetapi gagal mengupdate semua karyawan ke shift default')
        }
      } else {
        alert(editingShift ? 'Shift berhasil diperbarui!' : 'Shift berhasil ditambahkan!')
      }

      setShowShiftModal(false)
      fetchData(selectedUnit) // Refresh data untuk konsistensi
    } catch (error: any) {
      alert(`Gagal menyimpan shift: ${error.response?.data?.error || error.message}`)
    } finally {
      setSavingShift(false)
    }
  }

  const deleteShift = async (shiftId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus shift ini?')) {
      return
    }

    try {
      await shiftAPI.deleteShift(shiftId)
      alert('Shift berhasil dihapus!')
      if (selectedUnit) {
        fetchData(selectedUnit)
      }
    } catch (error: any) {
      alert(`Gagal menghapus shift: ${error.response?.data?.error || error.message}`)
    }
  }

  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return ''
    return timeString.substring(0, 5)
  }

  // Pagination functions
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1)
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1)

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

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)

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
            
            <div className="flex items-center space-x-3">
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
                {selectedUnit && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-slate-900">Shift Tersedia</h3>
                      {user?.role === 'hr' && (
                        <button
                          onClick={openAddShiftModal}
                          className="px-3 py-1 bg-[#25a298] hover:bg-[#1f8a80] text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          + Tambah Shift
                        </button>
                      )}
                    </div>
                    {shifts.filter(shift => shift.is_active).length > 0 ? (
                      <div className="space-y-2">
                        {shifts.filter(shift => shift.is_active).map((shift) => (
                          <div key={shift.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                shift.is_default ? 'bg-green-500' : 'bg-blue-500'
                              }`}></div>
                              <span className="text-sm font-medium">{shift.nama_shift}</span>
                              <span className="text-xs text-slate-500">
                                ({formatTimeForDisplay(shift.jam_masuk)} - {formatTimeForDisplay(shift.jam_keluar)})
                              </span>
                              {shift.is_default && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            {user?.role === 'hr' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditShiftModal(shift)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteShift(shift.id)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                  Hapus
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-500">Belum ada shift yang dibuat untuk unit ini.</p>
                      </div>
                    )}
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
                        <div className="relative w-full sm:w-64">
                          <input
                            type="text"
                            placeholder="Cari nama, NIK, jabatan..."
                            value={searchData}
                            onChange={(e) => setSearchData(e.target.value)}
                            className="pl-9 sm:pl-10 pr-3 py-2 w-full rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] text-sm"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
                            🔍
                          </div>
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
                    <>
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
                            {currentEmployees.length > 0 ? (
                              currentEmployees.map((employee, index) => (
                                <tr 
                                  key={employee.id} 
                                  className={`hover:bg-slate-50 border-b border-slate-100 ${
                                    pendingChanges[employee.id] ? 'bg-yellow-50 hover:bg-yellow-100' : ''
                                  }`}
                                >
                                  <td className="px-4 py-3 text-center">
                                    <div className="text-sm font-medium text-slate-900">{indexOfFirstItem + index + 1}</div>
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
                                      disabled={shifts.filter(shift => shift.is_active).length === 0}
                                      className={`text-sm border border-slate-300 rounded px-3 py-1 focus:outline-none focus:ring-1 focus:ring-[#25a298] focus:border-[#25a298] ${
                                        shifts.filter(shift => shift.is_active).length === 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                                      }`}
                                    >
                                      <option value="">Pilih Shift</option>
                                      {shifts.filter(shift => shift.is_active).map((shift) => (
                                        <option key={shift.id} value={shift.id}>
                                          {shift.nama_shift} ({formatTimeForDisplay(shift.jam_masuk)} - {formatTimeForDisplay(shift.jam_keluar)})
                                          {shift.is_default && ' (Default)'}
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

                      {totalPages > 1 && (
                        <div className="px-4 sm:px-6 py-4 border-t border-slate-200">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                            {/* Info Penampilan Data */}
                            <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-left w-full sm:w-auto">
                              Menampilkan <span className="font-medium text-[#25a298]">{currentEmployees.length > 0 ? indexOfFirstItem + 1 : 0}</span>-<span className="font-medium text-[#25a298]">{Math.min(indexOfLastItem, filteredEmployees.length)}</span> dari <span className="font-medium text-[#25a298]">{filteredEmployees.length}</span> karyawan
                            </p>
                            
                            {/* Pagination */}
                            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
                              {/* Desktop Pagination (tampil di semua layar) */}
                              <div className="hidden sm:flex items-center space-x-1 sm:space-x-2">
                                <button 
                                  onClick={prevPage}
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
                                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                      pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                      pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                      pageNum = totalPages - 4 + i;
                                    } else {
                                      pageNum = currentPage - 2 + i;
                                    }
                                    
                                    return (
                                      <button
                                        key={pageNum}
                                        onClick={() => paginate(pageNum)}
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
                                  onClick={nextPage}
                                  disabled={currentPage === totalPages}
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
                                  onClick={prevPage}
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
                                    {currentPage} / {totalPages}
                                  </span>
                                </div>
                                
                                <button 
                                  onClick={nextPage}
                                  disabled={currentPage === totalPages}
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
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'kalender' && (
              <ShiftCalendar
                employees={employees}
                shifts={shifts}
                employeeShifts={employeeShifts}
                searchData={searchData}
                setSearchData={setSearchData}
                selectedUnit={selectedUnit}
                selectedUnitName={selectedUnitName}
                currentPage={currentPageKalender}
                setCurrentPage={setCurrentPageKalender}
                itemsPerPage={itemsPerPage}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>

      <ShiftModal
        show={showShiftModal}
        editingShift={editingShift}
        shiftForm={shiftForm}
        setShiftForm={setShiftForm}
        onClose={() => setShowShiftModal(false)}
        onSave={saveShift}
        saving={savingShift}
      />
    </div>
  )
}

export default ShiftManagement
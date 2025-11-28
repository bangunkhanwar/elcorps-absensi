import React, { useState, useEffect, useRef } from 'react'
import { shiftAPI } from '../../services/api'

interface EmployeeForm {
  email: string
  password: string
  nik: string
  nama: string
  jabatan: string
  departemen: string
  divisi: string
  unit_kerja: string
  role: string
  shift_id: number | null
}

interface Shift {
  id: number
  kode_shift: string
  nama_shift: string
  jam_masuk: string
  jam_keluar: string
  is_default: boolean
  unit_kerja_id: number
}

interface Props {
  showEditModal: boolean
  setShowEditModal: (show: boolean) => void
  selectedEmployee: any
  formData: EmployeeForm
  setFormData: (data: EmployeeForm) => void
  handleEdit: (e: React.FormEvent, shift_id: number | null) => void
  message: string
  unitKerjaList: any[]
}

const EditKaryawan: React.FC<Props> = ({
  showEditModal,
  setShowEditModal,
  selectedEmployee,
  formData,
  setFormData,
  handleEdit,
  message,
  unitKerjaList
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Inisialisasi form data dengan data dari selectedEmployee
  useEffect(() => {
    if (selectedEmployee && showEditModal) {
      // Pastikan formData sudah di-set dengan nilai yang benar
      console.log('Selected employee unit kerja:', selectedEmployee.nama_unit)
    }
  }, [selectedEmployee, showEditModal])

  // Fetch shifts ketika modal dibuka atau selectedEmployee berubah
  useEffect(() => {
    const fetchData = async () => {
      if (!showEditModal || !selectedEmployee) return

      try {
        setLoadingShifts(true)
        
        if (unitKerjaList && unitKerjaList.length > 0) {
          const employeeUnit = unitKerjaList.find((unit: any) => unit.nama_unit === selectedEmployee.unit_kerja)
          const unitId = employeeUnit ? employeeUnit.id : (unitKerjaList[0]?.id || null)
          
          if (unitId) {
            const shiftsResponse = await shiftAPI.getShiftsByUnit(unitId)
            const shiftsData = shiftsResponse.data || []
            setShifts(shiftsData)

            if (!selectedEmployee.shift_id) {
              const defaultShift = shiftsData.find((shift: Shift) => shift.is_default) || shiftsData[0]
              if (defaultShift) {
                setFormData(prev => ({
                  ...prev,
                  shift_id: defaultShift.id
                }))
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching shifts:', error)
      } finally {
        setLoadingShifts(false)
      }
    }

    fetchData()
  }, [showEditModal, selectedEmployee, unitKerjaList])

  // Update shift ketika unit berubah
  useEffect(() => {
    const updateShiftForUnit = async () => {
      if (!formData.unit_kerja) return

      try {
        setLoadingShifts(true)
        const selectedUnit = unitKerjaList.find(unit => unit.nama_unit === formData.unit_kerja)
        if (!selectedUnit) {
          console.log('Unit kerja tidak ditemukan:', formData.unit_kerja)
          return
        }

        const shiftsResponse = await shiftAPI.getShiftsByUnit(selectedUnit.id)
        const unitShifts = shiftsResponse.data || []
        setShifts(unitShifts)
        
        // Jika shift_id belum ada atau tidak valid, set ke default
        if (!formData.shift_id || !unitShifts.some(shift => shift.id === formData.shift_id)) {
          const defaultShift = unitShifts.find((shift: Shift) => shift.is_default) || unitShifts[0]
          if (defaultShift) {
            setFormData(prev => ({
              ...prev,
              shift_id: defaultShift.id
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching shifts for unit:', error)
      } finally {
        setLoadingShifts(false)
      }
    }

    if (formData.unit_kerja && unitKerjaList && unitKerjaList.length > 0) {
      updateShiftForUnit()
    }
  }, [formData.unit_kerja, unitKerjaList])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)
    
    try {
      await handleEdit(e, formData.shift_id)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Searchable dropdown states
  const [openJabatan, setOpenJabatan] = useState(false)
  const [searchJabatan, setSearchJabatan] = useState("")
  const [openDepartemen, setOpenDepartemen] = useState(false)
  const [searchDepartemen, setSearchDepartemen] = useState("")
  const [openDivisi, setOpenDivisi] = useState(false)
  const [searchDivisi, setSearchDivisi] = useState("")
  const [openUnit, setOpenUnit] = useState(false)
  const [searchUnit, setSearchUnit] = useState("")
  const [openShift, setOpenShift] = useState(false)
  const [searchShift, setSearchShift] = useState("")

  const jabatanOptions = ["Director", "Store Leader", "Staff"]
  const departemenOptions = ["HR & GA", "Finance & Accounting", "IT & Technology", "Operations"]
  const divisiOptions = ["Strategi Support", "HR & GA", "Sales Marketing"]
  const unitOptions = unitKerjaList ? unitKerjaList.map(unit => unit.nama_unit) : []

  const filteredJabatan = jabatanOptions.filter(opt => opt.toLowerCase().includes(searchJabatan.toLowerCase())).sort()
  const filteredDepartemen = departemenOptions.filter(opt => opt.toLowerCase().includes(searchDepartemen.toLowerCase())).sort()
  const filteredDivisi = divisiOptions.filter(opt => opt.toLowerCase().includes(searchDivisi.toLowerCase())).sort()
  const filteredUnits = unitOptions.filter(opt => opt.toLowerCase().includes(searchUnit.toLowerCase())).sort()
  const filteredShifts = shifts.filter(shift => shift.nama_shift.toLowerCase().includes(searchShift.toLowerCase())).sort()

  // refs for click-outside
  const jabatanRef = useRef<HTMLDivElement>(null)
  const departemenRef = useRef<HTMLDivElement>(null)
  const divisiRef = useRef<HTMLDivElement>(null)
  const unitRef = useRef<HTMLDivElement>(null)
  const shiftRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const refs = [jabatanRef, departemenRef, divisiRef, unitRef, shiftRef]
      const states = [setOpenJabatan, setOpenDepartemen, setOpenDivisi, setOpenUnit, setOpenShift]
      
      refs.forEach((ref, index) => {
        if (ref.current && !ref.current.contains(target)) {
          states[index](false)
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!showEditModal) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-3 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <span className="text-white text-sm">✏️</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Edit Data Karyawan</h1>
              <p className="text-white/80 text-xs">Update informasi karyawan - {selectedEmployee?.nama}</p>
            </div>
          </div>
        </div>

        {/* Message Alert - Konsisten dengan TambahKaryawan */}
        {message && (
          <div className={`mx-4 mt-3 p-2 rounded-lg border-l-4 text-xs ${
            message.includes('berhasil') 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-400' 
              : 'bg-rose-50 text-rose-800 border-rose-400'
          }`}>
            <div className="flex items-center space-x-1">
              <span>{message.includes('berhasil') ? '✅' : '⚠️'}</span>
              <span>{message}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🔐</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Informasi Akun</h2>
                  <p className="text-gray-600 text-xs">Kredensial login untuk sistem</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white pl-10"
                        placeholder="Masukan email"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">📧</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Role Sistem</label>
                    <div className="relative">
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none pl-10"
                      >
                        <option value="karyawan">Karyawan - Akses Mobile App</option>
                        <option value="hr">HR/Admin - Akses Website & Mobile</option>
                      </select>
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">🏷️</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Password Baru</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white pl-10 pr-10"
                        placeholder="Kosongkan jika tidak diubah"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">🔒</div>
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                      >
                        {showPassword ? '👁️' : '🙈'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></span>
                      Biarkan kosong jika tidak ingin mengubah password
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">👤</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Data Pribadi</h2>
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
                        name="nama"
                        value={formData.nama}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white pl-10"
                        placeholder="Masukkan nama lengkap"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">🪪</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor Induk Karyawan</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="nik"
                        value={formData.nik}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white pl-10"
                        placeholder="Masukan NIK"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">🆔</div>
                    </div>
                  </div>

                  <div ref={jabatanRef}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Jabatan</label>
                    <div className="relative">
                      <div
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white cursor-pointer pl-10 flex justify-between items-center"
                        onClick={() => { setOpenJabatan(!openJabatan); setSearchJabatan('') }}
                      >
                        <span>{formData.jabatan || "Pilih Jabatan"}</span>
                        <span className="text-gray-400">▼</span>
                      </div>
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">📊</div>

                      {openJabatan && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow">
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-xs border-b border-gray-300 focus:outline-none rounded-t-lg"
                            placeholder="Cari jabatan..."
                            value={searchJabatan}
                            onChange={(e) => setSearchJabatan(e.target.value)}
                            autoFocus
                          />
                          <div className="max-h-48 overflow-y-auto text-xs">
                            {filteredJabatan.length > 0 ? filteredJabatan.map((opt) => (
                              <div
                                key={opt}
                                className="px-3 py-2 hover:bg-green-100 cursor-pointer"
                                onClick={() => {
                                  handleInputChange({ target: { name: 'jabatan', value: opt } } as any)
                                  setOpenJabatan(false)
                                  setSearchJabatan('')
                                }}
                              >
                                {opt}
                              </div>
                            )) : <div className="px-3 py-2 text-gray-400">Tidak ada hasil</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div ref={departemenRef}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Departemen</label>
                    <div className="relative">
                      <div
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white cursor-pointer pl-10 flex justify-between items-center"
                        onClick={() => { setOpenDepartemen(!openDepartemen); setSearchDepartemen('') }}
                      >
                        <span>{formData.departemen || "Pilih Departemen"}</span>
                        <span className="text-gray-400">▼</span>
                      </div>
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">🏛️</div>

                      {openDepartemen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow">
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-xs border-b border-gray-300 focus:outline-none rounded-t-lg"
                            placeholder="Cari departemen..."
                            value={searchDepartemen}
                            onChange={(e) => setSearchDepartemen(e.target.value)}
                            autoFocus
                          />
                          <div className="max-h-48 overflow-y-auto text-xs">
                            {filteredDepartemen.length > 0 ? filteredDepartemen.map((opt) => (
                              <div
                                key={opt}
                                className="px-3 py-2 hover:bg-green-100 cursor-pointer"
                                onClick={() => {
                                  handleInputChange({ target: { name: 'departemen', value: opt } } as any)
                                  setOpenDepartemen(false)
                                  setSearchDepartemen('')
                                }}
                              >
                                {opt}
                              </div>
                            )) : <div className="px-3 py-2 text-gray-400">Tidak ada hasil</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div ref={divisiRef}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Divisi</label>
                    <div className="relative">
                      <div
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white cursor-pointer pl-10 flex justify-between items-center"
                        onClick={() => { setOpenDivisi(!openDivisi); setSearchDivisi('') }}
                      >
                        <span>{formData.divisi || "Pilih Divisi"}</span>
                        <span className="text-gray-400">▼</span>
                      </div>
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">🏢</div>

                      {openDivisi && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow">
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-xs border-b border-gray-300 focus:outline-none rounded-t-lg"
                            placeholder="Cari divisi..."
                            value={searchDivisi}
                            onChange={(e) => setSearchDivisi(e.target.value)}
                            autoFocus
                          />
                          <div className="max-h-48 overflow-y-auto text-xs">
                            {filteredDivisi.length > 0 ? filteredDivisi.map((opt) => (
                              <div
                                key={opt}
                                className="px-3 py-2 hover:bg-green-100 cursor-pointer"
                                onClick={() => {
                                  handleInputChange({ target: { name: 'divisi', value: opt } } as any)
                                  setOpenDivisi(false)
                                  setSearchDivisi('')
                                }}
                              >
                                {opt}
                              </div>
                            )) : <div className="px-3 py-2 text-gray-400">Tidak ada hasil</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div ref={unitRef}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Kerja</label>
                    <div className="relative">
                      <div
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white cursor-pointer pl-10 flex justify-between items-center"
                        onClick={() => { setOpenUnit(!openUnit); setSearchUnit('') }}
                      >
                        <span>{formData.unit_kerja || "Pilih Unit Kerja"}</span>
                        <span className="text-gray-400">▼</span>
                      </div>
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">📍</div>

                      {openUnit && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow">
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-xs border-b border-gray-300 focus:outline-none rounded-t-lg"
                            placeholder="Cari unit kerja..."
                            value={searchUnit}
                            onChange={(e) => setSearchUnit(e.target.value)}
                            autoFocus
                          />
                          <div className="max-h-48 overflow-y-auto text-xs">
                            {filteredUnits.length > 0 ? filteredUnits.map((opt) => (
                              <div
                                key={opt}
                                className="px-3 py-2 hover:bg-green-100 cursor-pointer"
                                onClick={() => {
                                  handleInputChange({ target: { name: 'unit_kerja', value: opt } } as any)
                                  setOpenUnit(false)
                                  setSearchUnit('')
                                }}
                              >
                                {opt}
                              </div>
                            )) : <div className="px-3 py-2 text-gray-400">Tidak ada hasil</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shift Selection */}
                  <div ref={shiftRef}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Shift</label>
                    <div className="relative">
                      <div
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white cursor-pointer pl-10 flex justify-between items-center"
                        onClick={() => {
                          if (formData.unit_kerja && shifts.length > 0) {
                            setOpenShift(!openShift)
                            setSearchShift('')
                          }
                        }}
                      >
                        <span>
                          {formData.shift_id 
                            ? shifts.find(s => s.id === formData.shift_id)?.nama_shift || 'Pilih Shift'
                            : loadingShifts ? 'Memuat shift...' : (formData.unit_kerja ? 'Pilih Shift' : 'Pilih Unit Kerja terlebih dahulu')
                          }
                        </span>
                        <span className="text-gray-400">▼</span>
                      </div>
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">⏰</div>

                      {openShift && formData.unit_kerja && shifts.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow">
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-xs border-b border-gray-300 focus:outline-none rounded-t-lg"
                            placeholder="Cari shift..."
                            value={searchShift}
                            onChange={(e) => setSearchShift(e.target.value)}
                            autoFocus
                          />
                          <div className="max-h-48 overflow-y-auto text-xs">
                            {filteredShifts.length > 0 ? filteredShifts.map((shift) => (
                              <div
                                key={shift.id}
                                className={`px-3 py-2 hover:bg-green-100 cursor-pointer ${
                                  shift.is_default ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                }`}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, shift_id: shift.id }))
                                  setOpenShift(false)
                                  setSearchShift('')
                                }}
                              >
                                <div className="font-medium">{shift.nama_shift}</div>
                                <div className="text-xs text-slate-500">
                                  {shift.jam_masuk} - {shift.jam_keluar}
                                  {shift.is_default && <span className="ml-2 text-blue-600">(Default)</span>}
                                </div>
                              </div>
                            )) : <div className="px-3 py-2 text-gray-400">Tidak ada shift tersedia</div>}
                          </div>
                        </div>
                      )}
                    </div>
                    {formData.shift_id && (
                      <p className="text-xs text-green-600 mt-1">
                        Shift terpilih: {shifts.find(s => s.id === formData.shift_id)?.nama_shift}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-white px-4 py-3 rounded-b-xl border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-1 text-gray-600 text-xs">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <span>Perubahan akan langsung tersimpan di database</span>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium border border-gray-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formData.shift_id || loadingShifts || !formData.unit_kerja || submitLoading}
                className="px-4 py-2 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>💾</span>
                <span>{submitLoading ? 'Mengupdate...' : (loadingShifts ? 'Memuat...' : 'Update')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditKaryawan
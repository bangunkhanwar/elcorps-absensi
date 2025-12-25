import React, { useState, useEffect, useRef } from 'react'

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
}

interface Props {
  showModal: boolean
  setShowModal: (show: boolean) => void
  formData: EmployeeForm
  setFormData: (data: EmployeeForm) => void
  handleSubmit: (e: React.FormEvent) => void
  message: string
  unitKerjaList: any[]
  // TAMBAH PROPS BARU DI INTERFACE
  jabatanOptions: string[]
  departemenOptions: string[]
  divisiOptions: string[]
}

const TambahKaryawan: React.FC<Props> = ({
  showModal,
  setShowModal,
  formData,
  setFormData,
  handleSubmit:_,
  message,
  unitKerjaList,
  // PROPS BARU - PERBAIKI TYPO
  jabatanOptions = [],
  departemenOptions = [],
  divisiOptions = []  // ← PERBAIKI: dari "dvisiOption" menjadi "divisiOptions"
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

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

  // Fungsi handleSubmit yang diperbaiki dengan token
  const handleSubmitFixed = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)
    
    try {
      if (!formData.unit_kerja) {
        alert('Unit kerja harus dipilih')
        return
      }

      const selectedUnit = unitKerjaList.find(unit => unit.nama_unit === formData.unit_kerja)
      
      if (!selectedUnit) {
        alert('Unit kerja tidak valid')
        return
      }

      // Ambil token dari localStorage
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Token tidak ditemukan. Silakan login ulang.')
        return
      }

      const payload = {
        nama: formData.nama,
        nik: formData.nik,
        email: formData.email,
        password: formData.password,
        jabatan: formData.jabatan,
        departemen: formData.departemen,
        divisi: formData.divisi,
        role: formData.role,
        unit_kerja_id: selectedUnit.id
      }

      console.log('Data yang dikirim:', payload)

      // Kirim dengan token di header
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        console.log('✅ Register success:', result)
        setFormData({
          email: '',
          password: '',
          nik: '',
          nama: '',
          jabatan: '',
          departemen: '',
          divisi: '',
          unit_kerja: '',
          role: 'karyawan'
        })
        setShowModal(false)
        window.location.reload()
      } else {
        console.error('❌ Register error:', result)
        alert(`Gagal mendaftarkan karyawan: ${result.message || 'Unknown error'}`)
      }
      
    } catch (error) {
      console.error('❌ Register error:', error)
      alert('Terjadi kesalahan jaringan')
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

  
  const unitOptions = unitKerjaList ? unitKerjaList.map(unit => unit.nama_unit) : []

  // SEKARANG SEMUA DATA DARI PROPS - TIDAK ADA HARCODE
  const filteredJabatan = jabatanOptions.filter(opt => opt.toLowerCase().includes(searchJabatan.toLowerCase())).sort()
  const filteredDepartemen = departemenOptions.filter(opt => opt.toLowerCase().includes(searchDepartemen.toLowerCase())).sort()
  const filteredDivisi = divisiOptions.filter(opt => opt.toLowerCase().includes(searchDivisi.toLowerCase())).sort()
  const filteredUnits = unitOptions.filter(opt => opt.toLowerCase().includes(searchUnit.toLowerCase())).sort()

  // refs for click-outside
  const jabatanRef = useRef<HTMLDivElement>(null)
  const departemenRef = useRef<HTMLDivElement>(null)
  const divisiRef = useRef<HTMLDivElement>(null)
  const unitRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const refs = [jabatanRef, departemenRef, divisiRef, unitRef]
      const states = [setOpenJabatan, setOpenDepartemen, setOpenDivisi, setOpenUnit]
      
      refs.forEach((ref, index) => {
        if (ref.current && !ref.current.contains(target)) {
          states[index](false)
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!showModal) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-3 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <span className="text-white text-sm">👨‍💼</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Tambah Karyawan Baru</h1>
              <p className="text-white/80 text-xs">Buat akun baru</p>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mx-4 mt-3 p-2 rounded-lg border-l-4 text-xs ${
            message.includes('berhasil') ? 'bg-emerald-50 text-emerald-800 border-emerald-400' : 'bg-rose-50 text-rose-800 border-rose-400'
          }`}>
            <div className="flex items-center space-x-1">
              <span>{message.includes('berhasil') ? '✅' : '⚠️'}</span>
              <span>{message}</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          <form onSubmit={handleSubmitFixed} className="space-y-4">
            {/* Account Information */}
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Password Akun</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white pl-10 pr-10"
                        placeholder="Minimal 8 karakter"
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
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>
                      Password akan dienkripsi secara aman
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
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
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-white px-4 py-3 rounded-b-xl border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-1 text-gray-600 text-xs">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              <span>Semua data akan disimpan</span>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium border border-gray-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitFixed}
                disabled={!formData.unit_kerja || submitLoading}
                className="px-4 py-2 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>💾</span>
                <span>{submitLoading ? 'Menyimpan...' : 'Simpan'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TambahKaryawan
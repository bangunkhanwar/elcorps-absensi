import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../../services/api'
import TambahKaryawan from './TambahKaryawan'
import EditKaryawan from './EditKaryawan'
import HapusKaryawan from './Hapuskaryawan'

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
  shift_id?: number | null
}

interface Employee {
  id: number
  no: number
  nama: string
  email: string
  nik: string
  jabatan: string
  departemen: string
  divisi: string
  unit_kerja: string
  nama_unit: string
  role: string
  shift_id: number | null
  nama_shift: string
}

interface MasterData {
  jabatan: string[];
  departemen: string[];
  divisi: string[];
}

const DataKaryawan: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation() // Tambahkan useLocation untuk membaca query params
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState<EmployeeForm>({
    email: '',
    password: '',
    nik: '',
    nama: '',
    jabatan: '',
    departemen: '',
    divisi: '',
    unit_kerja: '',
    role: 'karyawan',
    shift_id: null
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [unitKerjaList, setUnitKerjaList] = useState<any[]>([])

  const [masterData, setMasterData] = useState<MasterData>({
    jabatan: [],
    departemen: [],
    divisi: []
  })
  
  // State untuk active filter
  const [activeFilters, setActiveFilters] = useState<{
    role: string | null;
  }>({
    role: null
  })
  
  // Get current page from localStorage or default to 1
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem('dataKaryawanCurrentPage')
    return savedPage ? parseInt(savedPage) : 1
  })
  
  const itemsPerPage = 10

  // Baca query parameters saat komponen mount
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search)
    const roleParam = queryParams.get('role')
    
    if (roleParam) {
      // Set active filter berdasarkan query parameter
      setActiveFilters(prev => ({
        ...prev,
        role: roleParam
      }))
    } 
    
    
  }, [location.search])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        await Promise.all([
          fetchUnitKerja(),
          fetchMasterData(),  
          fetchEmployees()
        ])
      } catch (error) {
        console.error('❌ Error loading data:', error)
        setMessage('Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filter employees berdasarkan searchTerm dan activeFilters
  useEffect(() => {
    filterEmployees()
  }, [searchTerm, employees, activeFilters])

  // Save current page to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dataKaryawanCurrentPage', currentPage.toString())
  }, [currentPage])

  const fetchUnitKerja = async () => {
    try {
      const response = await authAPI.getAllUnitKerja()
      setUnitKerjaList(response.data || [])
    } catch (error: any) {
      console.error('❌ Gagal memuat data unit kerja:', error)
      setUnitKerjaList([])
    }
  }

  const fetchMasterData = async () => {
    try {
      const response = await authAPI.getMasterData()
      setMasterData({
        jabatan: response.data.jabatan || [],
        departemen: response.data.departemen || [],
        divisi: response.data.divisi || []
      })
    } catch (error: any) {
      console.error('❌ Gagal memuat data master:', error)
      setMasterData({ jabatan: [], departemen: [], divisi: [] })
    }
  }

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await authAPI.getAllUsers()
      console.log('👥 Employees Raw Data:', response.data)
      
      // Process employees data
      const employeesData = response.data.users
        .map((user: any, index: number) => {
          let finalNamaUnit = user.nama_unit || '-'

          return {
            id: user.id,
            no: index + 1,
            nama: user.nama,
            email: user.email,
            nik: user.nik,
            jabatan: user.jabatan || '-',
            departemen: user.departemen || '-',
            divisi: user.divisi || '-',
            unit_kerja_id: user.unit_kerja_id || null,
            nama_unit: finalNamaUnit,
            role: user.role,
            shift_id: user.shift_id || null,
            nama_shift: user.nama_shift || '-'
          }
        })
        .sort((a: Employee, b: Employee) => a.nama.localeCompare(b.nama))
      
      console.log('✅ Processed Employees:', employeesData)
      setEmployees(employeesData)
      setFilteredEmployees(employeesData)
    } catch (error: any) {
      console.error('❌ Error fetching employees:', error)
      setMessage(error.response?.data?.error || 'Gagal memuat data karyawan')
    } finally {
      setLoading(false)
    }
  }

  const filterEmployees = () => {
    let filtered = [...employees]

    // Terapkan filter berdasarkan activeFilters
    if (activeFilters.role) {
      filtered = filtered.filter(employee => 
        employee.role === activeFilters.role
      )
    }

    // Terapkan search term
    if (searchTerm) {
      filtered = filtered.filter(employee =>
        employee.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.nik.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.jabatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.departemen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.divisi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.nama_unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.nama_shift.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredEmployees(filtered)
    setCurrentPage(1)
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setMessage('')
      
      if (!formData.unit_kerja) {
        setMessage('Harap pilih unit kerja terlebih dahulu')
        return
      }
      
      const userData = {
        nama: formData.nama,
        nik: formData.nik,
        email: formData.email,
        password: formData.password,
        jabatan: formData.jabatan,
        departemen: formData.departemen,
        divisi: formData.divisi,
        unit_kerja_id: formData.unit_kerja,
        role: formData.role,
        shift_id: formData.shift_id,
        koordinat_lokasi: '',
        foto_profile: ''
      }

      console.log('📤 Sending data to register:', userData)
      await authAPI.register(userData)
      
      setMessage('Karyawan berhasil ditambahkan!')
      setShowModal(false)
      
      setFormData({
        email: '',
        password: '',
        nik: '',
        nama: '',
        jabatan: '',
        departemen: '',
        divisi: '',
        unit_kerja: '',
        role: 'karyawan',
      })

      fetchEmployees()

    } catch (error: any) {
      console.error('❌ Register error:', error)
      setMessage(error.response?.data?.error || 'Gagal menambah karyawan')
    }
  }

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      email: employee.email,
      password: '',
      nik: employee.nik,
      nama: employee.nama,
      jabatan: employee.jabatan,
      departemen: employee.departemen,
      divisi: employee.divisi,
      unit_kerja: employee.nama_unit,
      role: employee.role,
      shift_id: employee.shift_id
    })
    setShowEditModal(true)
  }

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowDeleteModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) return
    
    try {
      const selectedUnit = unitKerjaList.find(unit => unit.nama_unit === formData.unit_kerja)
      
      const updateData: any = {
        nama: formData.nama,
        nik: formData.nik,
        email: formData.email,
        jabatan: formData.jabatan,
        departemen: formData.departemen,
        divisi: formData.divisi,
        unit_kerja_id: selectedUnit ? selectedUnit.id : null,
        role: formData.role,
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      await authAPI.updateUser(selectedEmployee.id, updateData)
      setMessage('Karyawan berhasil diupdate!')
      setShowEditModal(false)
      setSelectedEmployee(null)
      fetchEmployees()
    } catch (error: any) {
      console.error('Update error:', error)
      setMessage(error.response?.data?.error || 'Gagal mengupdate karyawan')
    }
  }

  const confirmDelete = async () => {
    if (!selectedEmployee) return
    
    try {
      await authAPI.deleteUser(selectedEmployee.id)
      setMessage('Karyawan berhasil dihapus!')
      setShowDeleteModal(false)
      setSelectedEmployee(null)
      fetchEmployees()
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Gagal menghapus karyawan')
    }
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Tampilkan judul berdasarkan filter

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
                <h1 className="text-xl font-bold text-[#25a298]">Data Karyawan</h1>
                <p className="text-sm text-slate-500">Kelola informasi dan akun karyawan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-4 p-4 rounded-xl text-center font-medium ${
            message.includes('berhasil') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">Daftar {activeFilters.role === 'hr' ? 'Admin HR' : 'Karyawan'}</h2>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <input
                    type="text"
                    placeholder={`Cari ${activeFilters.role === 'hr' ? 'admin' : 'karyawan'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full sm:w-64 lg:w-72 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] transition-all duration-200"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                    🔍
                  </div>
                </div>
                
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-[#25a298] hover:bg-[#1f8a80] text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:ring-offset-2 flex items-center justify-center space-x-2 text-sm sm:text-base w-full sm:w-auto"
                >
                  <span className="text-lg">+</span>
                  <span>Tambah Karyawan</span>
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#25a298]"></div>
              <p className="mt-2 text-slate-600">Memuat data karyawan...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No</th>  
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">NIK</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Jabatan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Departemen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Divisi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit kerja</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Shift</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentEmployees.length > 0 ? (
                      currentEmployees.map((employee, index) => (
                        <tr key={employee.id} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{indexOfFirstItem + index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-slate-900">{employee.nama}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{employee.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{employee.nik}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{employee.jabatan}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{employee.departemen}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{employee.divisi}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {employee.nama_unit === '-' ? (
                              <span className="text-red-500 italic">Belum diatur</span>
                            ) : (
                              employee.nama_unit
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{employee.nama_shift}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              employee.role === 'hr' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {employee.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleEdit(employee)}
                                className="text-[#25a298] hover:text-[#1f8a80] transition-colors duration-200"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(employee)}
                                className="text-red-600 hover:text-red-800 transition-colors duration-200"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="px-6 py-8 text-center text-sm text-slate-500">
                          {searchTerm 
                            ? 'Tidak ada data yang sesuai dengan pencarian' 
                            : activeFilters.role === 'hr'
                              ? 'Tidak ada data Admin HR'
                              : 'Tidak ada data karyawan'
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-4 sm:px-6 py-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  {/* Info Penampilan Data */}
                  <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-left w-full sm:w-auto">
                    Menampilkan <span className="font-medium text-[#25a298]">{currentEmployees.length > 0 ? indexOfFirstItem + 1 : 0}</span>-<span className="font-medium text-[#25a298]">{Math.min(indexOfLastItem, filteredEmployees.length)}</span> dari <span className="font-medium text-[#25a298]">{filteredEmployees.length}</span> {activeFilters.role === 'hr' ? 'admin' : 'karyawan'}
                  </p>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
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
                          <span className="hidden xs:inline">Prev</span>
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
                          <span className="hidden xs:inline">Next</span>
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
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <TambahKaryawan
        showModal={showModal}
        setShowModal={setShowModal}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        message={message}
        unitKerjaList={unitKerjaList}
        jabatanOptions={masterData.jabatan}
        departemenOptions={masterData.departemen}
        divisiOptions={masterData.divisi}
      />

      <EditKaryawan
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        selectedEmployee={selectedEmployee}
        formData={formData}
        setFormData={setFormData}
        handleEdit={handleEditSubmit}
        message={message}
        unitKerjaList={unitKerjaList}
        jabatanOptions={masterData.jabatan}
        departemenOptions={masterData.departemen}
        divisiOptions={masterData.divisi}
      />

      <HapusKaryawan
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        selectedEmployee={selectedEmployee}
        handleDelete={confirmDelete}
        message={message}
      />
    </div>
  )
}

export default DataKaryawan
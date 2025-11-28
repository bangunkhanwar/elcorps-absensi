import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../../services/api'
import TambahKaryawan from './TambahKaryawan'
import EditKaryawan from './EditKaryawan'
import HapusKaryawan from './HapusKaryawan'

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

const DataKaryawan: React.FC = () => {
  const navigate = useNavigate()
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
  
  // Get current page from localStorage or default to 1
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem('dataKaryawanCurrentPage')
    return savedPage ? parseInt(savedPage) : 1
  })
  
  const itemsPerPage = 10

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        await fetchUnitKerja()
        await fetchEmployees()
      } catch (error) {
        console.error('❌ Error loading data:', error)
        setMessage('Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    filterEmployees()
  }, [searchTerm, employees])

  // Save current page to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dataKaryawanCurrentPage', currentPage.toString())
  }, [currentPage])

  const fetchUnitKerja = async () => {
    try {
      const response = await authAPI.getAllUnitKerja()
      console.log('📦 Unit Kerja Data:', response.data)
      setUnitKerjaList(response.data || [])
    } catch (error: any) {
      console.error('❌ Gagal memuat data unit kerja:', error)
      setUnitKerjaList([])
    }
  }

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await authAPI.getAllUsers()
      console.log('👥 Employees Raw Data:', response.data)
      
      // Process employees data - gunakan nama_unit dari API
      const employeesData = response.data.users
        .map((user: any, index: number) => {
          // Gunakan nama_unit langsung dari API response
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
    if (!searchTerm) {
      setFilteredEmployees(employees)
      return
    }

    const filtered = employees.filter(employee =>
      employee.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.nik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.jabatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.departemen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.nama_unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.nama_shift.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredEmployees(filtered)
    setCurrentPage(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setMessage('')
      
      if (!formData.shift_id) {
        setMessage('Harap pilih shift terlebih dahulu')
        return
      }

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
        shift_id: null
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

  const handleEditSubmit = async (e: React.FormEvent, shift_id: number | null) => {
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
        shift_id: shift_id
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
                <h1 className="text-2xl font-bold text-[#25a298]">Data Karyawan</h1>
                <p className="text-sm text-slate-500">Kelola informasi dan akun karyawan</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#25a298] hover:bg-[#1f8a80] text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:ring-offset-2 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Tambah Karyawan</span>
            </button>
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
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">Daftar Karyawan</h2>
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Cari nama, email, NIK, jabatan, shift..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] transition-colors duration-200"
                />
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
                        <td colSpan={10} className="px-6 py-8 text-center text-sm text-slate-500">
                          {searchTerm ? 'Tidak ada data yang sesuai dengan pencarian' : 'Tidak ada data karyawan'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Menampilkan {currentEmployees.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, filteredEmployees.length)} dari {filteredEmployees.length} karyawan
                </p>
                {totalPages > 1 && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sebelumnya
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
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
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Selanjutnya
                    </button>
                  </div>
                )}
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
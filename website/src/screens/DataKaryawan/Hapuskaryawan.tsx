import React from 'react'

interface Employee {
  id: number
  no: number
  nama: string
  email: string
  nik: string
  jabatan: string
  departemen: string
  divisi: string
  nama_unit: string
  role: string
}

interface Props {
  showDeleteModal: boolean
  setShowDeleteModal: (show: boolean) => void
  selectedEmployee: Employee | null
  handleDelete: () => void
  message: string
}

const HapusKaryawan: React.FC<Props> = ({
  showDeleteModal,
  setShowDeleteModal,
  selectedEmployee,
  handleDelete,
  message
}) => {
  if (!showDeleteModal) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm transform transition-all duration-300 scale-100">
        {/* Modal Header */}
        <div className="bg-red-600 px-4 py-3 rounded-t-xl">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <span className="text-white text-sm">🗑️</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Hapus Karyawan</h1>
            </div>
          </div>
        </div>

        {/* Message Alert */}
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

        {/* Modal Body */}
        <div className="p-4">
          {selectedEmployee && (
            <div className="space-y-3">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Hapus {selectedEmployee.nama}?
                </h3>
                <p className="text-gray-600 text-xs">
                  Data akan dihapus permanen
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">NIK:</span>
                    <span className="font-semibold text-gray-900">{selectedEmployee.nik}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">Jabatan:</span>
                    <span className="font-semibold text-gray-900">{selectedEmployee.jabatan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">Unit:</span>
                    <span className="font-semibold text-gray-900">{selectedEmployee.nama_unit}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <div className="flex items-start space-x-1">
                  <span className="text-amber-600 text-xs">⚠️</span>
                  <p className="text-amber-800 text-xs">
                    Tidak dapat dikembalikan
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-4 py-3 rounded-b-xl border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-3 py-2 text-xs bg-white hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors duration-200 border border-gray-300"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
            >
              <span>🗑️</span>
              <span>Hapus</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HapusKaryawan
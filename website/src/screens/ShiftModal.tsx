import React from 'react'

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

interface ShiftForm {
  kode_shift: string
  nama_shift: string
  jam_masuk: string
  jam_keluar: string
  toleransi_telat_minutes: number
  is_default: boolean
}

interface ShiftModalProps {
  show: boolean
  editingShift: Shift | null
  shiftForm: ShiftForm
  setShiftForm: (form: ShiftForm) => void
  onClose: () => void
  onSave: () => void
  saving?: boolean
}

const ShiftModal: React.FC<ShiftModalProps> = ({
  show,
  editingShift,
  shiftForm,
  setShiftForm,
  onClose,
  onSave,
  saving = false
}) => {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingShift ? 'Edit Shift' : 'Tambah Shift Baru'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kode Shift</label>
              <input
                type="text"
                value={shiftForm.kode_shift}
                onChange={(e) => setShiftForm({...shiftForm, kode_shift: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298]"
                placeholder="Contoh: S1, S2, HO"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Shift</label>
              <input
                type="text"
                value={shiftForm.nama_shift}
                onChange={(e) => setShiftForm({...shiftForm, nama_shift: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298]"
                placeholder="Contoh: Shift Pagi, Shift HO"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jam Masuk</label>
                <input
                  type="time"
                  value={shiftForm.jam_masuk}
                  onChange={(e) => setShiftForm({...shiftForm, jam_masuk: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jam Keluar</label>
                <input
                  type="time"
                  value={shiftForm.jam_keluar}
                  onChange={(e) => setShiftForm({...shiftForm, jam_keluar: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298]"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Toleransi Keterlambatan (menit)
              </label>
              <input
                type="number"
                value={shiftForm.toleransi_telat_minutes}
                onChange={(e) => setShiftForm({...shiftForm, toleransi_telat_minutes: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298]"
                min="0"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={shiftForm.is_default}
                onChange={(e) => setShiftForm({...shiftForm, is_default: e.target.checked})}
                className="h-4 w-4 text-[#25a298] focus:ring-[#25a298] border-slate-300 rounded"
              />
              <label className="ml-2 block text-sm text-slate-700">
                Jadikan shift default untuk unit ini
                {shiftForm.is_default && (
                  <span className="ml-1 text-xs text-orange-600">
                    (Semua karyawan di unit ini akan diupdate ke shift ini)
                  </span>
                )}
              </label>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-4 py-2 bg-[#25a298] hover:bg-[#1f8a80] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : (editingShift ? 'Update' : 'Simpan')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShiftModal
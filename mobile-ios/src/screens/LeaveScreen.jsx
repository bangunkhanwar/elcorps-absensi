import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Upload, X, Camera, File, AlertCircle, CheckCircle } from 'lucide-react';
import { leaveAPI } from '../services/api';
import Header from '../components/Header';

const LeaveScreen = () => {
  const navigate = useNavigate();
  
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const userObj = JSON.parse(userData);
        setUser(userObj);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const leaveTypes = [
    { id: 'sakit', label: 'Sakit', icon: '💊' },
    { id: 'cuti', label: 'Cuti', icon: '📍' },
    { id: 'lainnya', label: 'Lainnya', icon: '📝' },
  ];

  // Format tanggal untuk tampilan
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File terlalu besar. Maksimal 5MB');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Hanya file JPG, PNG, atau PDF yang diizinkan');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      setAttachment(file);
    }
  };

  // Handle ambil foto
  const handleTakePhoto = () => {
    setShowAttachmentModal(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user'; // Kamera depan
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target.result);
        };
        reader.readAsDataURL(file);
        setAttachment(file);
      }
    };
    
    input.click();
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!leaveType || !startDate || !endDate || description.length < 10) {
      alert('Harap isi semua data dengan benar. Keterangan minimal 10 karakter.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('jenis_izin', leaveType.toLowerCase());
      formData.append('keterangan', description);
      
      if (attachment) {
        formData.append('lampiran', attachment);
      }

      const response = await leaveAPI.apply(formData);
      
      if (response.data.success) {
        alert('Pengajuan izin berhasil dikirim!');
        navigate('/');
      } else {
        alert(response.data.message || 'Gagal mengajukan izin');
      }
    } catch (error) {
      console.error('Error submitting leave:', error);
      alert(error.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // Hitung durasi
  const calculateDuration = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const isFormValid = leaveType && startDate && endDate && description.length >= 10;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40">
        <div className="bg-primary py-4 px-4 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-4"
              >
                <ArrowLeft className="text-white" size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Pengajuan Izin</h1>
                <p className="text-white/80 text-sm mt-1">
                  {user?.nama || 'Loading...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/history-leave')}
              className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition"
            >
              <Calendar className="text-white" size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Form Container */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Form Pengajuan Izin
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Isi form di bawah untuk mengajukan izin
          </p>

          {/* Jenis Izin */}
          <div className="mb-6">
            <label className="text-lg font-semibold text-gray-800 mb-3 block">
              Jenis Izin <span className="text-red-500">*</span>
            </label>
            <button
              onClick={() => setShowLeaveTypeModal(true)}
              className="w-full border-2 border-gray-300 rounded-xl p-4 flex justify-between items-center hover:border-emerald-500 transition"
            >
              <span className={leaveType ? 'text-gray-800' : 'text-gray-400'}>
                {leaveType || 'Pilih Jenis Izin'}
              </span>
              <span className="text-gray-400">▼</span>
            </button>
          </div>

          {/* Tanggal Mulai */}
          <div className="mb-6">
            <label className="text-lg font-semibold text-gray-800 mb-3 block">
              Tanggal Mulai <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl p-4 text-gray-800 hover:border-emerald-500 transition"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Tanggal Selesai */}
          <div className="mb-6">
            <label className="text-lg font-semibold text-gray-800 mb-3 block">
              Tanggal Selesai <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl p-4 text-gray-800 hover:border-emerald-500 transition"
              min={startDate || new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Durasi */}
          {startDate && endDate && (
            <div className="mb-6">
              <label className="text-lg font-semibold text-gray-800 mb-3 block">
                Durasi Izin
              </label>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-green-800 text-center font-semibold text-lg">
                  {calculateDuration()} Hari
                </p>
              </div>
            </div>
          )}

          {/* Keterangan */}
          <div className="mb-6">
            <label className="text-lg font-semibold text-gray-800 mb-3 block">
              Keterangan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan alasan pengajuan izin..."
              className="w-full border-2 border-gray-300 rounded-xl p-4 h-32 text-gray-800 placeholder-gray-400 hover:border-emerald-500 transition"
              rows={4}
            />
            <p className={`text-sm mt-2 ${description.length < 10 && description.length > 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {description.length}/10 karakter {description.length < 10 && description.length > 0 ? '- Minimal 10 karakter' : ''}
            </p>
          </div>

          {/* Lampiran */}
          <div className="mb-6">
            <label className="text-lg font-semibold text-gray-800 mb-3 block">
              Lampiran
            </label>

            {attachment ? (
              <div className="border-2 border-green-500 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {attachment.type === 'application/pdf' ? (
                      <File className="text-green-600 mr-2" size={24} />
                    ) : (
                      <img src={filePreview} alt="Preview" className="w-10 h-10 rounded-lg mr-2 object-cover" />
                    )}
                    <div>
                      <p className="text-green-700 font-semibold">
                        {attachment.type === 'application/pdf' ? 'PDF Terlampir' : 'Foto Terlampir'}
                      </p>
                      <p className="text-gray-600 text-sm">{attachment.name}</p>
                    </div>
                  </div>
                  <button onClick={() => {
                    setAttachment(null);
                    setFilePreview(null);
                  }} className="text-red-500 hover:text-red-700">
                    <X size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setShowAttachmentModal(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center hover:border-emerald-500 transition"
                >
                  <Upload size={48} className="text-gray-400 mb-3" />
                  <p className="text-gray-500 font-semibold">Upload Bukti Pendukung</p>
                  <p className="text-gray-400 text-sm mt-1 text-center">
                    Surat sakit, dokumen, atau foto lainnya
                  </p>
                  <p className="text-emerald-600 font-semibold mt-2">Pilih File</p>
                </button>
              </div>
            )}
          </div>

          {/* Informasi */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start">
              <AlertCircle className="text-blue-500 mr-2 flex-shrink-0 mt-1" size={20} />
              <p className="text-blue-800">
                Pastikan semua data yang diisi sudah benar. Pengajuan izin akan diproses dalam 1-2 hari kerja.
              </p>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex space-x-3 mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex-1 bg-gray-200 rounded-xl py-4 text-gray-700 font-semibold text-lg hover:bg-gray-300 transition"
            disabled={loading}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
            className={`flex-1 rounded-xl py-4 font-semibold text-lg transition ${isFormValid && !loading ? 
              'bg-primary hover:bg-primary-dark text-white' : 
              'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            {loading ? 'Mengirim...' : 'Ajukan Izin'}
          </button>
        </div>
      </div>

      {/* Modal Jenis Izin */}
      {showLeaveTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Pilih Jenis Izin</h2>
              <button onClick={() => setShowLeaveTypeModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              {leaveTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setLeaveType(type.label);
                    setShowLeaveTypeModal(false);
                  }}
                  className={`w-full flex items-center p-4 rounded-xl transition ${leaveType === type.label ? 
                    'bg-emerald-600 text-white' : 
                    'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                >
                  <span className="text-2xl mr-3">{type.icon}</span>
                  <span className="text-lg font-semibold">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Menu Lampiran */}
      {showAttachmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-center">Pilih Lampiran</h3>
            
            <div className="space-y-3">
              <button
                onClick={handleTakePhoto}
                className="w-full flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <Camera className="text-blue-600 mr-3" size={24} />
                <span className="text-gray-800 font-medium">Ambil Foto dari Kamera</span>
              </button>
              
              <label className="block w-full">
                <div className="w-full flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition cursor-pointer">
                  <Upload className="text-purple-600 mr-3" size={24} />
                  <span className="text-gray-800 font-medium">Upload File dari Device</span>
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={() => setShowAttachmentModal(false)}
              className="w-full mt-6 py-3 text-red-500 font-semibold hover:text-red-700"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveScreen;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Upload, X, Camera, File, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { leaveAPI, getMediaUrl } from '../services/api';
import { useModal } from '../context/ModalContext';
import { useNotifications } from '../hooks/useNotifications';
import Header from '../components/Header';

const LeaveScreen = () => {
  const navigate = useNavigate();
  const { refresh: refreshNotifications } = useNotifications();
  
  const { showSuccess, showError, showConfirmation } = useModal();
  const [activeTab, setActiveTab] = useState('my-leave'); // 'my-leave' | 'team-approval'
  const [teamApprovals, setTeamApprovals] = useState([]);
  const [isHR, setIsHR] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [hasSubordinates, setHasSubordinates] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null); // { file, previewUrl }
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    fetchTeamApprovals();
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    setBalanceError('');
    try {
      const res = await leaveAPI.getBalance();
      if (res.success) {
        setBalance(res.data);
      } else {
        setBalanceError('Saldo cuti belum tersedia');
      }
    } catch (e) {
      console.log('Error fetching balance:', e);
      setBalanceError(e.message || 'Gagal memuat saldo cuti');
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchTeamApprovals = async () => {
    try {
      const res = await leaveAPI.getTeamApprovals();
      if (res.success) {
        // Sort items by created_at descending (newest first)
        const sortedData = [...res.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setTeamApprovals(sortedData);
        setIsHR(res.isHR);
        setIsSupervisor(res.isSupervisor);
        
        // Approval tab harus muncul untuk supervisor maupun HR.
        setHasSubordinates(res.isSupervisor || res.isHR);
      }
    } catch (err) {
      console.log('User has no subordinate access');
      setHasSubordinates(false);
    }
  };

  const handleAction = async (izin_id, action) => {
    const actionText = action === 'approved' ? 'menyetujui' : 'menolak';
    showConfirmation(
      'Konfirmasi Tindakan',
      `Apakah Anda yakin ingin ${actionText} izin ini?`,
      async () => {
        setLoading(true);
        try {
          const res = await leaveAPI.action({ izin_id, action });
          if (res.success) {
            showSuccess(`Berhasil di-${action}`);
            refreshNotifications();
            fetchTeamApprovals(); // Refresh list
          }
        } catch (error) {
          showError(error.message || "Terjadi kesalahan");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // Cleanup ObjectURL
  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment]);

  const leaveTypes = [
    { id: 'sakit', label: 'Sakit', icon: '💊' },
    { id: 'cuti', label: 'Cuti', icon: '📍' },
    { id: 'lainnya', label: 'Lainnya', icon: '📝' },
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return showError('File terlalu besar. Maksimal 5MB');
      
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      setAttachment({ file, previewUrl });
      setShowAttachmentModal(false);
    }
  };

  const openCamera = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        setAttachment({ file, previewUrl });
        setShowAttachmentModal(false);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!leaveType || !startDate || !endDate || description.length < 10) {
      return showError('Harap isi semua data dengan benar. Keterangan minimal 10 karakter.');
    }

    if (leaveType.toLowerCase() === 'cuti') {
      const durasi = calculateDuration();
      if (!balance) {
        return showError('Saldo cuti belum dimuat. Silakan coba lagi sebentar.');
      }
      if (durasi > balance.saldo_sisa) {
        return showError(`Saldo cuti tidak cukup. Sisa: ${balance.saldo_sisa} hari, Diajukan: ${durasi} hari.`);
      }
    }

    setLoading(true);
    try {
      let fileUrl = null;
      
      // 1. Upload file if exists
      if (attachment?.file) {
        const uploadData = new FormData();
        uploadData.append('file', attachment.file);
        const uploadRes = await leaveAPI.upload(uploadData);
        if (uploadRes.success) {
          fileUrl = uploadRes.relativePath || uploadRes.fileUrl;
        } else {
          throw new Error(uploadRes.error || 'Gagal mengunggah lampiran');
        }
      }

      // 2. Apply for leave with the file URL
      const leavePayload = {
        start_date: startDate,
        end_date: endDate,
        jenis_izin: leaveType.toLowerCase(),
        keterangan: description,
        lampiran: fileUrl
      };

      const response = await leaveAPI.apply(leavePayload);
      if (response.success) {
        showSuccess('Pengajuan izin berhasil dikirim!', () => navigate('/'));
        refreshNotifications();
      }
    } catch (error) {
      showError(error.message || 'Terjadi kesalahan saat pengajuan');
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

  const renderAttachment = (lampiran) => {
    const fileUrl = getMediaUrl(lampiran);
    if (!fileUrl) return null;
    
    // Check if it's an image
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileUrl);
    
    if (isImage) {
      return (
        <div className="mt-3">
          <p className="text-gray-600 text-xs mb-2 font-semibold">Lampiran Bukti:</p>
          <div className="cursor-pointer" onClick={() => setSelectedImage(fileUrl)}>
            <img 
              src={fileUrl} 
              alt="Lampiran" 
              className="w-full h-40 object-cover rounded-xl border border-gray-200 shadow-sm hover:opacity-90 transition"
              onError={(e) => {
                e.target.style.display = 'none';
                // Show link instead if image fails
                const link = e.target.parentElement.nextSibling;
                if (link) link.style.display = 'flex';
              }}
            />
          </div>
          <button
            onClick={() => setSelectedImage(fileUrl)}
            style={{ display: 'none' }}
            className="w-full flex items-center p-3 bg-blue-50 text-blue-700 rounded-xl font-semibold hover:bg-blue-100 transition"
          >
            <FileText size={18} className="mr-2" />
            <span>Lihat Lampiran</span>
          </button>
        </div>
      );
    }

    return (
      <div className="mt-3">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center p-3 bg-blue-50 text-blue-700 rounded-xl font-semibold hover:bg-blue-100 transition"
        >
          <FileText size={18} className="mr-2" />
          <span>Lihat Dokumen Pendukung</span>
        </a>
      </div>
    );
  };

  const ImageModal = ({ url, onClose }) => {
    if (!url) return null;
    return (
      <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col p-4 animate-fade-in" onClick={onClose}>
        <div className="flex justify-end p-2">
          <button className="text-white p-2 bg-white/10 rounded-full"><X size={32} /></button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <img 
            src={url} 
            alt="Preview" 
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()} 
          />
        </div>
      </div>
    );
  };

  const isFormValid = leaveType && startDate && endDate && description.length >= 10;

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto no-scrollbar">
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

      {/* Tabs */}
      {hasSubordinates && (
        <div className="p-4 bg-white shadow-sm flex space-x-2">
          <button
            onClick={() => setActiveTab('my-leave')}
            className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'my-leave' ? 'bg-primary text-white shadow-md' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <FileText size={20} />
            <span>Izin Saya</span>
          </button>
          <button
            onClick={() => setActiveTab('team-approval')}
            className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'team-approval' ? 'bg-primary text-white shadow-md' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <CheckCircle size={20} />
            <span>Approval Tim</span>
          </button>
        </div>
      )}

      <div className="p-4">
        {activeTab === 'my-leave' ? (
          <>
            {/* Saldo Cuti */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-4 flex flex-col items-center">
              {balanceLoading ? (
                <>
                  <h3 className="text-gray-500 font-semibold mb-2">Memuat saldo cuti...</h3>
                  <div className="text-4xl font-black text-primary">—</div>
                </>
              ) : balance ? (
                <>
                  <h3 className="text-gray-500 font-semibold mb-2">Sisa Saldo Cuti Anda</h3>
                  <div className="text-5xl font-black text-primary">{balance.saldo_sisa} <span className="text-lg text-gray-500 font-medium">Hari</span></div>
                  <div className="w-full mt-4 flex justify-between text-sm text-gray-400 font-medium border-t border-gray-100 pt-3">
                    <span>Total Hak: {balance.saldo_awal} Hari</span>
                    <span>Terpakai: {balance.saldo_terpakai} Hari</span>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-red-600 font-semibold mb-2">Saldo Cuti Tidak Tersedia</h3>
                  <div className="text-4xl font-black text-red-400">0 <span className="text-lg text-gray-500 font-medium">Hari</span></div>
                  <p className="text-sm text-red-500 mt-3 text-center font-semibold">{balanceError || 'Data saldo cuti belum berhasil dimuat.'}</p>
                </>
              )}
            </div>

            {/* Form Container */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              {/* <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
                Form Pengajuan Izin
              </h2> */}
              {/* ... (existing form content) ... */}
              {/* <p className="text-gray-600 text-center mb-6">
                Isi form di bawah untuk mengajukan izin
              </p> */}

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
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-xl p-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] transition appearance-none bg-white"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <Calendar size={20} />
                  </div>
                </div>
              </div>

              {/* Tanggal Selesai */}
              <div className="mb-6">
                <label className="text-lg font-semibold text-gray-800 mb-3 block">
                  Tanggal Selesai <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-xl p-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#25a298] focus:border-[#25a298] transition appearance-none bg-white"
                    min={startDate || new Date().toISOString().split('T')[0]}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <Calendar size={20} />
                  </div>
                </div>
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
                        {attachment.file.type === 'application/pdf' ? (
                          <File className="text-green-600 mr-2" size={24} />
                        ) : (
                          <img src={attachment.previewUrl} alt="Preview" className="w-10 h-10 rounded-lg mr-2 object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-green-700 font-semibold truncate">
                            {attachment.file.type === 'application/pdf' ? 'PDF Terlampir' : 'Foto Terlampir'}
                          </p>
                          <p className="text-gray-600 text-sm truncate">{attachment.file.name}</p>
                        </div>
                      </div>
                      <button onClick={() => setAttachment(null)} className="text-red-500 hover:text-red-700 ml-2">
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
                  <p className="text-blue-800 text-sm">
                    Pastikan semua data yang diisi sudah benar. Pengajuan izin akan diproses dalam 2-3 hari kerja.
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
                disabled={!isFormValid || loading || !!balanceError}
                className={`flex-1 rounded-xl py-4 font-semibold text-lg transition ${isFormValid && !loading && !balanceError ? 
                  'bg-primary hover:bg-primary-dark text-white' : 
                  'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                {loading ? 'Mengirim...' : 'Ajukan Izin'}
              </button>
            </div>
          </>
        ) : (
          /* TAB: APPROVAL TIM */
          <div className="space-y-4">
             <h2 className="text-xl font-bold text-gray-800 mb-4 px-2">Menunggu Persetujuan</h2>
             
             {teamApprovals.length === 0 && (
               <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Tidak ada izin yang perlu diproses.</p>
               </div>
             )}

             {teamApprovals.map(approval => {
               // Logic tombol
               const canApproveAtasan = !isHR && approval.approval_atasan === 'pending' && approval.status === 'pending';
               const canApproveHR = isHR && approval.approval_atasan === 'approved' && approval.approval_hr === 'pending' && approval.status === 'pending';
               const canRejectHR = isHR && approval.approval_hr === 'pending' && approval.status === 'pending';
               const showActions = canApproveAtasan || canApproveHR || canRejectHR;

               return (
               <div key={approval.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
                  <div className="flex justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{approval.nama}</h3>
                      <p className="text-sm text-gray-500 font-medium">{approval.nama_jabatan || 'Staff'}</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-700 px-4 py-1.5 rounded-full text-xs font-bold h-fit shadow-sm">
                      {approval.jenis_izin.toUpperCase()}
                    </span>
                  </div>

                  {/* Dual Approval Badges */}
                  <div className="flex gap-2 mb-4">
                    <div className={`flex-1 py-1 px-2 rounded-lg text-center text-xs font-bold border ${approval.approval_atasan === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : approval.approval_atasan === 'rejected' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      Atasan: {(approval.approval_atasan || 'pending').toUpperCase()}
                    </div>
                    <div className={`flex-1 py-1 px-2 rounded-lg text-center text-xs font-bold border ${approval.approval_hr === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : approval.approval_hr === 'rejected' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      HR: {(approval.approval_hr || 'pending').toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl mb-5 text-sm text-gray-700 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Mulai:</span>
                      <span className="font-bold">{new Date(approval.start_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Selesai:</span>
                      <span className="font-bold">{new Date(approval.end_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                    </div>
                    <div className="border-t border-gray-200 my-2 pt-2">
                      <p className="italic text-gray-600">"{approval.keterangan}"</p>
                    </div>
                    {approval.expired_at && approval.status === 'pending' && (
                      <div className="flex items-center text-red-500 font-bold bg-red-50 p-2 rounded-lg mt-3">
                        <Clock size={16} className="mr-2"/>
                        <span>Batas Approval: {new Date(approval.expired_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</span>
                      </div>
                    )}

                    {renderAttachment(approval.lampiran)}
                  </div>

                  {/* Action Buttons */}
                  {showActions ? (
                    <div className="flex space-x-3">
                      {(canApproveAtasan || canRejectHR) && (
                        <button 
                          onClick={() => handleAction(approval.id, 'rejected')}
                          className="flex-1 flex items-center justify-center space-x-2 py-3.5 border-2 border-red-500 text-red-500 rounded-xl font-bold hover:bg-red-50 transition"
                        >
                          <XCircle size={20} /> <span>Tolak</span>
                        </button>
                      )}
                      {(canApproveAtasan || canApproveHR) && (
                        <button 
                          onClick={() => handleAction(approval.id, 'approved')}
                          className="flex-1 flex items-center justify-center space-x-2 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition"
                        >
                          <CheckCircle size={20} /> <span>Setujui</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3 px-4 bg-gray-100 rounded-xl">
                      <p className="text-gray-500 font-bold text-sm">
                        {approval.status === 'pending' 
                          ? (isHR ? 'Menunggu Approval Atasan' : 'Menunggu Approval HR') 
                          : `Status Final: ${approval.status.toUpperCase()}`}
                      </p>
                    </div>
                  )}
               </div>
             )})}
          </div>
        )}
      </div>

      {/* Modal Jenis Izin */}
      {showLeaveTypeModal && (
        <div className="fixed inset-0 top-0 left-0 w-full h-full bg-black/50 flex items-end justify-center z-[60]">
          <div className="bg-white rounded-t-3xl p-6 w-full max-h-[70vh] overflow-y-auto no-scrollbar animate-slide-up shadow-2xl">
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
        <div className="fixed inset-0 top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold mb-6 text-center text-gray-800">Pilih Lampiran</h3>
            
            <div className="space-y-4">
              <button
                onClick={openCamera}
                className="w-full flex items-center p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition"
              >
                <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mr-4">
                  <Camera className="text-white" size={24} />
                </div>
                <span className="text-gray-800 font-semibold text-lg">Ambil Foto</span>
              </button>
              
              <label className="block w-full">
                <div className="w-full flex items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition cursor-pointer">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                    <Upload className="text-white" size={24} />
                  </div>
                  <span className="text-gray-800 font-semibold text-lg">Pilih File</span>
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
              className="w-full mt-8 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Image Preview */}
      {selectedImage && (
        <ImageModal 
          url={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}


    </div>
  );
};

export default LeaveScreen;
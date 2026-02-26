import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, LogOut, Menu, Camera, AlertCircle, X } from 'lucide-react';
import { attendanceAPI } from '../services/api';
import { useLocation } from '../hooks/useLocation';
import { formatDate, formatTime, formatTimeShort } from '../utils/formatters';
import { syncTimeWithServer, getTrueDate } from '../utils/timeSync';
import CameraWithWatermark from '../components/CameraWithWatermark';
import logo from '../assets/logo.png';

const HomeScreen = () => {
  const navigate = useNavigate();

  // State Utama
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockInStatus, setClockInStatus] = useState('Belum Clock In');
  const [user, setUser] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);

  // State Lokasi
  const [unitKerjaData, setUnitKerjaData] = useState(null);

  // State Modal & Foto
  const [showMenu, setShowMenu] = useState(false);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  
  // Custom Camera States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState('in'); // 'in' or 'out'

  const [clockInPhoto, setClockInPhoto] = useState(null); // Stores { file, previewUrl }
  const [clockOutPhoto, setClockOutPhoto] = useState(null); // Stores { file, previewUrl }
  const [loading, setLoading] = useState(false);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState('prompt'); // granted, denied, prompt
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1); // 1: Welcome, 2: Location, 3: Camera, 4: Notifications

  // Hook for Location
  const { location: currentLocation, status: locationStatus, permissionStatus: locPermissionStatus, refresh: refreshLocation } = useLocation(unitKerjaData);

  useEffect(() => {
    const init = async () => {
      await syncTimeWithServer();
      loadUserData();
      checkTodayAttendance();
      checkCameraPermissionStatus();
    };

    init();

    // Re-sync on focus/resume
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncTimeWithServer();
      }
    };

    // Check if first login to show onboarding
    const isFirst = localStorage.getItem('isFirstLogin');
    const isCompleted = localStorage.getItem('onboarding_completed');
    
    if (isFirst === 'true' && !isCompleted) {
      setShowOnboarding(true);
    }

    const timer = setInterval(() => setCurrentTime(getTrueDate()), 1000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleCompleteOnboarding = () => {
    localStorage.removeItem('isFirstLogin');
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const requestNotificationPermission = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          // Register service worker if not already
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
          }
        }
      }
      setOnboardingStep(prev => prev + 1);
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setOnboardingStep(prev => prev + 1);
    }
  };

  const handleRequestLocation = async () => {
    refreshLocation();
    setOnboardingStep(prev => prev + 1);
  };

  const handleRequestCamera = async () => {
    await requestPermissions();
    setOnboardingStep(prev => prev + 1);
  };

  const checkCameraPermissionStatus = async () => {
    try {
      // Chrome/Android support
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' });
        setCameraPermissionStatus(result.state);
        result.onchange = () => setCameraPermissionStatus(result.state);
      }
    } catch (e) {
      console.log("Camera permission query not supported");
    }
  };

  const requestPermissions = async () => {
    try {
      // Trigger camera prompt
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCameraPermissionStatus('granted');
    } catch (err) {
      setCameraPermissionStatus('denied');
    }
  };

  // Cleanup ObjectURLs
  useEffect(() => {
    return () => {
      if (clockInPhoto?.previewUrl) URL.revokeObjectURL(clockInPhoto.previewUrl);
      if (clockOutPhoto?.previewUrl) URL.revokeObjectURL(clockOutPhoto.previewUrl);
    };
  }, [clockInPhoto, clockOutPhoto]);

  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      // Tambahkan timestamp agar browser tidak mengambil dari cache
      const cacheBuster = new Date().getTime();
      const response = await attendanceAPI.getToday(`?t=${cacheBuster}`);
      console.log("[PWA-Debug] API Response:", response);
      
      if (response.success && response.data) {
        const data = response.data;
        if (data.unit_kerja) {
          setUnitKerjaData({
            latitude: parseFloat(data.unit_kerja.latitude),
            longitude: parseFloat(data.unit_kerja.longitude),
            radius_meter: data.unit_kerja.radius_meter,
            nama_unit: data.unit_kerja.nama_unit
          });
        }

        // VERIFIKASI KETAT: Hanya set absen jika waktu_masuk benar-benar ada
        if (data.waktu_masuk !== undefined && data.waktu_masuk !== null) {
          console.log("[PWA-Debug] Data absen ditemukan di DB.");
          setTodayAttendance(data);
          setClockInStatus(data.waktu_keluar ? 'Sudah Clock Out' : 'Sudah Clock In');
        } else {
          console.log("[PWA-Debug] Database kosong untuk hari ini.");
          setTodayAttendance(null);
          setClockInStatus('Belum Clock In');
        }
      } else {
        // Jika response.data.data adalah null, berarti belum absen
        setClockInStatus('Belum Clock In');
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
      setClockInStatus('Belum Clock In');
      setTodayAttendance(null);
    }
  };

  const openCustomCamera = (type) => {
    setCameraType(type);
    setShowCamera(true);
  };

  const handleCapture = (captureData) => {
    if (cameraType === 'in') {
      if (clockInPhoto?.previewUrl) URL.revokeObjectURL(clockInPhoto.previewUrl);
      setClockInPhoto(captureData);
    } else {
      if (clockOutPhoto?.previewUrl) URL.revokeObjectURL(clockOutPhoto.previewUrl);
      setClockOutPhoto(captureData);
    }
    setShowCamera(false);
  };

  // --- PERBAIKAN LOGIC CLOCK IN ---
  const handleClockIn = async () => {
    if (!clockInPhoto?.file) return alert('Harap mengambil foto terlebih dahulu');
    if (!currentLocation) return alert('Lokasi tidak terdeteksi.');

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('latitude', currentLocation.latitude);
      formData.append('longitude', currentLocation.longitude);
      formData.append('foto_masuk', clockInPhoto.file);

      const response = await attendanceAPI.checkIn(formData);
      if (response.success) {
        setShowClockInModal(false);
        setClockInPhoto(null);
        // Khusus error ini, kita fetch ulang untuk sinkronisasi
        checkTodayAttendance();
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!clockOutPhoto?.file) return alert('Harap mengambil foto terlebih dahulu');
    if (!currentLocation) return alert('Lokasi tidak terdeteksi.');

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('latitude', currentLocation.latitude);
      formData.append('longitude', currentLocation.longitude);
      formData.append('foto_keluar', clockOutPhoto.file);

      const response = await attendanceAPI.checkOut(formData);
      if (response.success) {
        setShowClockOutModal(false);
        setClockOutPhoto(null);
        alert('Clock out berhasil!');
        checkTodayAttendance();
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom Camera Overlay */}
      {showCamera && (
        <CameraWithWatermark
          title={cameraType === 'in' ? "Foto Clock In" : "Foto Clock Out"}
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Logo dan Menu */}
      <div className="sticky top-0 z-50 bg-primary rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between px-6 py-6">
          <img src={logo} alt="Absensi Karyawan" className="h-12 object-contain" />
          <button onClick={() => setShowMenu(true)} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition">
            <Menu className="text-white" size={28} />
          </button>
        </div>
      </div>
      <div className="p-3 space-y-4">
        
      {/* Informasi Karyawan */}
      <div className="bg-white rounded-xl shadow p-4 flex-shrink-0">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {user?.nama || 'Bangun Chaerudin Anwar'}
          </h2>
          <p className="text-sm text-gray-600">
            {user?.nik || '52510.3138'}
          </p>
          <p className="text-sm text-gray-600 truncate">
            {user?.jabatan || 'Staff Of Programmer'}
          </p>
        </div>

        <div className="border-t border-gray-200 pt-1">
          <h3 className="text-base font-semibold text-primary mb-1">
            Informasi Karyawan
          </h3>

          <div className="space-y-1">
            <div className="flex justify-between items-center gap-2">
              <p className="text-sm text-gray-600">Departemen</p>
              <p className="text-sm font-medium text-gray-700 truncate text-right">
                {user?.departemen || 'IT & Technology'}
              </p>
            </div>

            <div className="flex justify-between items-center gap-2">
              <p className="text-sm text-gray-600">Divisi</p>
              <p className="text-sm font-medium text-gray-700 truncate text-right">
                {user?.divisi || 'Strategic Support'}
              </p>
            </div>

            <div className="flex justify-between items-center gap-2">

              <p className="text-sm text-gray-600">Lokasi Kerja</p>
              <p className="text-sm font-medium text-gray-700 truncate text-right">
                {user?.unit_kerja || 'Head Office'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Waktu dan Tanggal */}
      <div className="bg-white rounded-xl shadow p-4 mt-3 text-gray-900">
        <h3 className="text-center text-base font-semibold mb-1">
          {formatDate(currentTime)}
        </h3>

        <div className="flex items-center justify-center">
          <span className="text-2xl font-bold tracking-wider">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      {/* Status Absensi */}
      <div className="bg-white rounded-xl shadow p-3 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800 mb-2 text-center">
          Status: <span className={clockInStatus === 'Belum Clock In' ? 'text-red-600' : 
            clockInStatus === 'Sudah Clock In' ? 'text-yellow-600' : 'text-green-600'}>
            {clockInStatus}
          </span>
        </h3>

        {/* Tombol Absensi */}
        <div className="space-y-3">
          <button
            onClick={() => {
              if (locationStatus === 'out_of_radius') {
                return alert('Anda berada di luar radius unit kerja.');
              }
              setShowClockInModal(true);
            }}
            disabled={clockInStatus !== 'Belum Clock In'}
            className={`w-full py-3 rounded-lg font-bold text-base flex items-center justify-center space-x-2 transition
              ${clockInStatus === 'Belum Clock In' ? 
                'bg-primary hover:bg-primary-dark text-white' : 
                'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            <Camera size={20} />
            <span>CLOCK IN</span>
          </button>

          <button
            onClick={() => setShowClockOutModal(true)}
            disabled={clockInStatus !== 'Sudah Clock In'}
            className={`w-full py-3 rounded-lg font-bold text-base flex items-center justify-center space-x-2 transition
              ${clockInStatus === 'Sudah Clock In' ? 
                'bg-primary hover:bg-primary-dark text-white' : 
                'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            <Camera size={20} />
            <span>CLOCK OUT</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 border border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition flex items-center justify-center space-x-2"
          >
            <LogOut size={18} />
            <span>LOGOUT</span>
          </button>
        </div>
      </div>
    </div>

      {/* Modal Menu */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMenu(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Menu</h2>
                <button onClick={() => setShowMenu(false)} className="text-gray-500"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <button onClick={() => navigate('/attendance')} className="w-full flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center mr-3"><Calendar className="text-white" size={20} /></div>
                    <div className="text-left"><p className="font-semibold text-gray-800">Riwayat Absensi</p></div>
                  </div>
                </button>
                <button onClick={() => navigate('/leave')} className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3"><AlertCircle className="text-white" size={20} /></div>
                    <div className="text-left"><p className="font-semibold text-gray-800">Pengajuan Izin</p></div>
                  </div>
                </button>
                <button onClick={handleLogout} className="w-full mt-4 py-3 bg-gray-100 text-red-600 rounded-xl font-semibold flex items-center justify-center gap-2">
                  <LogOut size={20} /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clock In */}
      {showClockInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4">
              <h2 className="text-lg font-bold text-gray-800 text-center mb-4">Konfirmasi Clock In</h2>

            <div className="mb-4">
              <p className="text-gray-700 font-semibold mb-2 text-center text-sm">Foto Clock In</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-36 flex items-center justify-center bg-gray-50 overflow-hidden">
                {clockInPhoto?.previewUrl ? (
                  <img 
                    src={clockInPhoto.previewUrl} 
                    alt="Clock In" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <Camera size={32} className="mx-auto mb-1" />
                    <p className="text-xs">Ambil Foto</p>
                    <p className="text-xs">untuk Clock In</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => openCustomCamera('in')}
                className="w-full mt-2 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition text-sm"
              >
                {clockInPhoto?.previewUrl ? 'Ambil Ulang Foto' : 'Buka Kamera'}
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowClockInModal(false);
                  if (clockInPhoto?.previewUrl) URL.revokeObjectURL(clockInPhoto.previewUrl);
                  setClockInPhoto(null);
                }}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleClockIn}
                disabled={!clockInPhoto?.file || loading}
                className={`flex-1 py-2.5 rounded-lg font-semibold transition text-sm ${
                  clockInPhoto?.file && !loading 
                    ? 'bg-primary hover:bg-primary-dark text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Modal Clock Out */}
      {showClockOutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-center items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Konfirmasi Clock Out</h2>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 font-semibold mb-3 text-center">Foto Clock Out</p>
                <div className="border-2 border-dashed border-gray-300 rounded-xl h-48 flex items-center justify-center bg-gray-50 overflow-hidden">
                  {clockOutPhoto?.previewUrl ? (
                    <img src={clockOutPhoto.previewUrl} alt="Clock Out" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Camera size={48} className="mx-auto mb-2" />
                      <p>Ambil Foto untuk</p>
                      <p>Clock Out</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openCustomCamera('out')}
                  className="w-full mt-3 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition"
                >
                  {clockOutPhoto?.previewUrl ? 'Ambil Ulang Foto' : 'Buka Kamera'}
                </button>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowClockOutModal(false);
                    if (clockOutPhoto?.previewUrl) URL.revokeObjectURL(clockOutPhoto.previewUrl);
                    setClockOutPhoto(null);
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={!clockOutPhoto?.file || loading}
                  className={`flex-1 py-3 rounded-xl font-semibold transition ${clockOutPhoto?.file && !loading ? 
                    'bg-primary hover:bg-primary-dark text-white' : 
                    'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  {loading ? 'Memproses...' : 'Konfirmasi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Onboarding Perizinan */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col p-8 overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto">
            {onboardingStep === 1 && (
              <div className="text-center animate-fade-in">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <img src={logo} alt="Logo" className="w-16 h-12 object-contain" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Selamat Datang!</h2>
                <p className="text-gray-600 mb-8">
                  Untuk menggunakan aplikasi absensi elcorps, kami memerlukan beberapa izin dari perangkat Anda.
                </p>
                <button 
                  onClick={() => setOnboardingStep(2)}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg"
                >
                  Mulai Pengaturan
                </button>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="text-center animate-fade-in">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="text-blue-600" size={48} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Izin Lokasi</h2>
                <p className="text-gray-600 mb-8">
                  Kami memerlukan lokasi Anda untuk memverifikasi bahwa Anda berada di area unit kerja saat melakukan absensi.
                </p>
                <button 
                  onClick={handleRequestLocation}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg"
                >
                  Izinkan Lokasi
                </button>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="text-center animate-fade-in">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Camera className="text-emerald-600" size={48} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Izin Kamera</h2>
                <p className="text-gray-600 mb-8">
                  Kamera digunakan untuk mengambil foto absensi sebagai bukti kehadiran yang valid.
                </p>
                <button 
                  onClick={handleRequestCamera}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg"
                >
                  Izinkan Kamera
                </button>
              </div>
            )}

            {onboardingStep === 4 && (
              <div className="text-center animate-fade-in">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="text-orange-600" size={48} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Notifikasi Push</h2>
                <p className="text-gray-600 mb-8">
                  Aktifkan notifikasi agar Anda mendapatkan pengingat jadwal absensi dan info penting lainnya.
                </p>
                <button 
                  onClick={requestNotificationPermission}
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg"
                >
                  Aktifkan Notifikasi
                </button>
                <button 
                  onClick={() => setOnboardingStep(5)}
                  className="mt-4 text-gray-500 font-medium"
                >
                  Lewati untuk saat ini
                </button>
              </div>
            )}

            {onboardingStep === 5 && (
              <div className="text-center animate-fade-in">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <X className="text-white rotate-45" size={48} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Semua Siap!</h2>
                <p className="text-gray-600 mb-8">
                  Terima kasih. Anda sekarang sudah bisa mulai menggunakan aplikasi untuk absensi harian.
                </p>
                <button 
                  onClick={handleCompleteOnboarding}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg"
                >
                  Masuk ke Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default HomeScreen;

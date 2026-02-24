import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, LogOut, Menu, Camera, AlertCircle, X } from 'lucide-react';
import { attendanceAPI } from '../services/api';
import { useLocation } from '../hooks/useLocation';
import { formatDate, formatTime, formatTimeShort } from '../utils/formatters';
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
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('waiting');
  const [unitKerjaData, setUnitKerjaData] = useState(null);

  // State Modal & Foto
  const [showMenu, setShowMenu] = useState(false);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  
  // Custom Camera States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState('in'); // 'in' or 'out'

  const [user, setUser] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [clockInPhoto, setClockInPhoto] = useState(null); // Stores { file, previewUrl }
  const [clockOutPhoto, setClockOutPhoto] = useState(null); // Stores { file, previewUrl }
  const [loading, setLoading] = useState(false);
  const [unitKerjaData, setUnitKerjaData] = useState(null);

  // Hook for Location
  const { location: currentLocation, status: locationStatus } = useLocation(unitKerjaData);

  useEffect(() => {
    loadUserData();
    checkTodayAttendance();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

    setIsProcessing(true);

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
      setIsProcessing(false);
    }
  };

  const handleClockOut = async () => {
    if (!clockOutPhoto?.file) return alert('Harap mengambil foto terlebih dahulu');
    if (!currentLocation) return alert('Lokasi tidak terdeteksi.');

    setIsProcessing(true);

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
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
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
              <p className="text-s text-gray-600">Departemen</p>
              <p className="text-sm font-medium text-gray-700 truncate text-right">
                {user?.departemen || 'IT & Technology'}
              </p>
            </div>

            <div className="flex justify-between items-center gap-2">
              <p className="text-s text-gray-600">Divisi</p>
              <p className="text-sm font-medium text-gray-700 truncate text-right">
                {user?.divisi || 'Strategic Support'}
              </p>
            </div>

            <div className="flex justify-between items-center gap-2">
              <p className="text-s text-gray-600">Lokasi Kerja</p>
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

        {/* Status Lokasi */}
        <div
          className={`mt-4 rounded-lg p-3 border
            ${
              locationStatus === 'granted'
                ? 'bg-green-50 border-green-200'
                : locationStatus === 'out_of_radius'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}
        >
          <div className="flex items-center justify-center text-center gap-2">
            <MapPin
              className={`shrink-0 ${
                locationStatus === 'granted'
                  ? 'text-green-600'
                  : locationStatus === 'out_of_radius'
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
              size={18}
            />

            <div>
              <p className="text-sm font-medium">
                {locationStatus === 'granted'
                  ? 'Lokasi terdeteksi - Siap untuk absensi'
                  : locationStatus === 'out_of_radius'
                  ? 'Lokasi di luar radius'
                  : locationStatus === 'denied'
                  ? 'Izin lokasi ditolak'
                  : locationStatus === 'gps_off'
                  ? 'GPS tidak aktif'
                  : 'Mendeteksi lokasi...'}
              </p>

              {locationStatus === 'granted' && currentLocation && (
                <p className="text-xs text-gray-600 mt-1">
                  Lat: {parseFloat(currentLocation.latitude).toFixed(6)}, Lng:{' '}
                  {parseFloat(currentLocation.longitude).toFixed(6)}
                </p>
              )}
            </div>
          </div>
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

      {/* Info Absensi Hari Ini */}
      {todayAttendance && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Absensi Hari Ini</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-gray-600 text-xs">Clock In</p>
              <p className="text-base font-bold text-gray-800">
                {formatTimeShort(todayAttendance.waktu_masuk)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-gray-600 text-xs">Clock Out</p>
              <p className="text-base font-bold text-gray-800">
                {formatTimeShort(todayAttendance.waktu_keluar)}
              </p>
            </div>
            <div className="col-span-2">
              <div className={`px-3 py-1.5 rounded-lg text-center font-medium text-sm ${
                todayAttendance.status === 'Tepat Waktu' ? 'bg-green-100 text-green-800' :
                todayAttendance.status === 'Terlambat' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                Status: {todayAttendance.status?.toUpperCase() || 'BELUM'}
              </div>
            </div>
          </div>
        </div>
      )}
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

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600 font-medium">Lokasi Kerja:</p>
                  <p className="text-gray-800 font-semibold">{user?.unit_kerja || 'Head Office'}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600 font-medium">Jam Clock Out:</p>
                  <p className="text-gray-800 font-semibold">{formatTime(new Date())}</p>
                </div>
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

    </div>
  );
};

export default HomeScreen;

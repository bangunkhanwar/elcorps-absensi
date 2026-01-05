import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, MapPin, LogOut, Menu, X, Camera, Loader, AlertCircle } from 'lucide-react';
import { attendanceAPI } from '../services/api';
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
  const [clockInPhoto, setClockInPhoto] = useState(null);
  const [clockOutPhoto, setClockOutPhoto] = useState(null);

  // State Loading Proses (Baru)
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadUserData();
    checkTodayAttendance();

    // Update waktu setiap detik
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      getCurrentLocation();
    }
  }, [user]);

  // --- LOGIKA LOKASI (GPS) ---
  const getCurrentLocation = () => {
    setLocationStatus('loading');

    if (!navigator.geolocation) {
      setLocationStatus('error');
      alert('Browser tidak mendukung geolocation');
      return;
    }

    const highAccuracyOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 10000
    };

    const lowAccuracyOptions = {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 30000
    };

    const handleSuccess = (position) => {
      const location = {
        latitude: position.coords.latitude.toString(),
        longitude: position.coords.longitude.toString(),
        accuracy: position.coords.accuracy
      };
      console.log("Lokasi ditemukan:", location);
      setCurrentLocation(location);
      checkLocationRadius(location);
    };

    const handleError = (error) => {
      console.error('Error getting location:', error);
      if (error.code === error.PERMISSION_DENIED) {
        setLocationStatus('denied');
        alert('Izin lokasi ditolak. Mohon aktifkan izin lokasi browser.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setLocationStatus('gps_off');
      } else if (error.code === error.TIMEOUT) {
        setLocationStatus('timeout');
      } else {
        setLocationStatus('error');
      }
    };

    // Percobaan 1: High Accuracy
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (error) => {
        // Jika gagal, coba low accuracy (jaringan/wifi)
        if (error.code === 2 || error.code === 3) {
          console.warn('GPS High Accuracy gagal, mencoba Low Accuracy...');
          navigator.geolocation.getCurrentPosition(
            handleSuccess,
            (finalError) => {
              handleError(finalError);
              alert('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
            },
            lowAccuracyOptions
          );
        } else {
          handleError(error);
        }
      },
      highAccuracyOptions
    );
  };

  const checkLocationRadius = (location) => {
    if (!unitKerjaData) {
      setLocationStatus('granted'); // Fallback jika data unit belum load
      return;
    }

    const distance = calculateDistance(
      parseFloat(location.latitude),
      parseFloat(location.longitude),
      unitKerjaData.latitude,
      unitKerjaData.longitude
    );

    // console.log(`Jarak: ${distance} meter, Radius Izin: ${unitKerjaData.radius_meter}`);

    if (distance > unitKerjaData.radius_meter) {
      setLocationStatus('out_of_radius');
    } else {
      setLocationStatus('granted');
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radius bumi (meter)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // --- LOGIKA DATA USER & ATTENDANCE ---
  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getToday();
      
      // Debugging: Cek apa isi respon dari server saat halaman dibuka
      console.log("DEBUG Data Hari Ini:", response.data);

      // PERBAIKAN: 
      // Hapus pengecekan 'response.data.success' karena backend tidak mengirim key tersebut.
      // Cukup cek apakah 'response.data.data' ada isinya (tidak null).
      if (response.data && response.data.data) {
        setTodayAttendance(response.data.data);

        // Ambil data unit kerja (Backend mengirimnya di root response, bukan di dalam data)
        const unitData = response.data.unit_kerja || response.data.data.unit_kerja;
        
        if (unitData) {
          setUnitKerjaData({
            latitude: parseFloat(unitData.latitude),
            longitude: parseFloat(unitData.longitude),
            radius_meter: unitData.radius_meter,
            nama_unit: unitData.nama_unit
          });
        }

        // Tentukan status tombol berdasarkan data yang ada di database
        if (!response.data.data.waktu_keluar) {
          setClockInStatus('Sudah Clock In');
        } else {
          setClockInStatus('Sudah Clock Out');
        }
      } else {
        // Jika response.data.data adalah null, berarti belum absen
        setClockInStatus('Belum Clock In');
        
        // Tetap ambil data unit kerja meskipun belum absen (agar bisa validasi radius)
        if (response.data && response.data.unit_kerja) {
           const unitData = response.data.unit_kerja;
           setUnitKerjaData({
            latitude: parseFloat(unitData.latitude),
            longitude: parseFloat(unitData.longitude),
            radius_meter: unitData.radius_meter,
            nama_unit: unitData.nama_unit
          });
        }
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
      // Jangan reset status sembarangan jika error koneksi, biarkan status sebelumnya
      // atau tampilkan notifikasi error kecil
    }
  };

  // --- LOGIKA KAMERA (PERBAIKAN: DIRECT CAMERA) ---
  const openCamera = (type) => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      // PERBAIKAN UTAMA: capture="user" memaksa kamera depan di mobile
      input.setAttribute('capture', 'user');

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const photoUrl = event.target.result;
            if (type === 'in') {
              setClockInPhoto(photoUrl);
            } else {
              setClockOutPhoto(photoUrl);
            }
            resolve(file);
          };
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };

      input.click();
    });
  };

  // --- LOGIKA CLOCK IN (PERBAIKAN: LOADING & ERROR) ---
  const handleClockInButton = () => {
    if (clockInStatus !== 'Belum Clock In') return;

    if (locationStatus === 'out_of_radius') {
      alert('Anda berada di luar radius kantor. Silakan mendekat ke lokasi kantor.');
      return;
    }

    setShowClockInModal(true);
  };

  // --- PERBAIKAN LOGIC CLOCK IN ---
  const handleClockIn = async () => {
    if (!clockInPhoto) {
      alert('Harap mengambil foto selfie terlebih dahulu');
      return;
    }

    if (!currentLocation) {
      alert('Lokasi tidak terdeteksi. Pastikan GPS aktif.');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('latitude', currentLocation.latitude);
      formData.append('longitude', currentLocation.longitude);

      const response = await fetch(clockInPhoto);
      const blob = await response.blob();
      formData.append('foto_masuk', blob, 'clockin.jpg');

      const responseAPI = await attendanceAPI.checkIn(formData);

      // Cek respon sukses (201 Created atau success: true)
      if (responseAPI.status === 201 || responseAPI.data.success) {
        alert('Clock In Berhasil!');
        setShowClockInModal(false);
        setClockInPhoto(null);

        // --- UPDATE STATE LANGSUNG DARI RESPON (Tanpa Fetch Ulang) ---
        setClockInStatus('Sudah Clock In');

        // Backend mengirim data attendance terbaru di responseAPI.data.attendance
        if (responseAPI.data.attendance) {
          setTodayAttendance(responseAPI.data.attendance);
        }

        // HAPUS atau COMMENT baris ini agar status tidak tertimpa jika server lambat
        // checkTodayAttendance(); 
      } else {
        console.error('API Logic Error:', responseAPI.data);
        alert(`Gagal Clock In: ${responseAPI.data.message || responseAPI.data.error || 'Terjadi kesalahan'}`);
      }
    } catch (error) {
      console.error('Clock in Exception:', error);

      const responseData = error.response?.data;
      const serverMessage = responseData?.error || responseData?.message || error.message || '';

      // Handle jika errornya "Sudah Check-In"
      if (error.response?.status === 400 &&
        (serverMessage.toLowerCase().includes('sudah check-in') || serverMessage.toLowerCase().includes('already'))) {

        alert('Sistem mendeteksi Anda sudah melakukan Clock In. Data diperbarui.');
        setClockInStatus('Sudah Clock In');
        setShowClockInModal(false);
        setClockInPhoto(null);
        // Khusus error ini, kita fetch ulang untuk sinkronisasi
        checkTodayAttendance();
      }
      else {
        alert(`Gagal Clock In: ${serverMessage}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- PERBAIKAN LOGIC CLOCK OUT ---
  const handleClockOut = async () => {
    if (!clockOutPhoto) {
      alert('Harap mengambil foto selfie terlebih dahulu');
      return;
    }

    if (!currentLocation) {
      alert('Lokasi tidak terdeteksi. Pastikan GPS aktif.');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('latitude', currentLocation.latitude);
      formData.append('longitude', currentLocation.longitude);

      const response = await fetch(clockOutPhoto);
      const blob = await response.blob();
      formData.append('foto_keluar', blob, 'clockout.jpg');

      const responseAPI = await attendanceAPI.checkOut(formData);

      if (responseAPI.status === 200 || responseAPI.data.success) {
        alert('Clock Out Berhasil!');
        setShowClockOutModal(false);
        setClockOutPhoto(null);

        // --- UPDATE STATE LANGSUNG ---
        setClockInStatus('Sudah Clock Out');

        // Update data attendance di layar dengan data dari respon checkout
        if (responseAPI.data.attendance) {
          setTodayAttendance(responseAPI.data.attendance);
        }

        // checkTodayAttendance(); // Jangan dipanggil untuk menghindari lag/overwrite
      } else {
        console.error('API Error:', responseAPI.data);
        alert(`Gagal Clock Out: ${responseAPI.data.message || responseAPI.data.error}`);
      }
    } catch (error) {
      console.error('Clock out Exception:', error);
      const msg = error.response?.data?.message || error.response?.data?.error || error.message;
      alert(`Error: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Logout & Formatters
  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">

      {/* --- COMPONENT LOADING OVERLAY --- */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce-slow">
            <Loader className="animate-spin text-primary mb-3" size={48} />
            <h3 className="text-lg font-bold text-gray-800">Sedang Memproses...</h3>
            <p className="text-sm text-gray-500">Mohon tunggu, jangan tutup aplikasi</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-primary rounded-b-3xl shadow-lg">
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
            <h2 className="text-lg font-semibold text-gray-900 truncate">{user?.nama || 'Nama Karyawan'}</h2>
            <p className="text-sm text-gray-600">{user?.nik || '-'}</p>
            <p className="text-sm text-gray-600 truncate">{user?.jabatan || '-'}</p>
          </div>
          <div className="border-t border-gray-200 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between items-center gap-2">
                <p className="text-xs text-gray-600">Departemen</p>
                <p className="text-sm font-medium text-gray-700 truncate">{user?.departemen || '-'}</p>
              </div>
              <div className="flex justify-between items-center gap-2">
                <p className="text-xs text-gray-600">Lokasi Kerja</p>
                <p className="text-sm font-medium text-gray-700 truncate">{user?.unit_kerja || 'Head Office'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Waktu & Tombol */}
        <div className="bg-white rounded-xl shadow p-4 mt-3 text-gray-900">
          <h3 className="text-center text-base font-semibold mb-1">{formatDate(currentTime)}</h3>
          <div className="flex items-center justify-center">
            <span className="text-2xl font-bold tracking-wider">{formatTime(currentTime)}</span>
          </div>

          {/* Status Lokasi */}
          <div className={`mt-4 rounded-lg p-3 border text-center transition-colors duration-300
            ${locationStatus === 'granted' ? 'bg-green-50 border-green-200' :
              locationStatus === 'out_of_radius' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>

            <div className="flex items-center justify-center gap-2">
              <MapPin size={18} className={locationStatus === 'granted' ? 'text-green-600' : 'text-red-500'} />
              <div>
                <p className="text-sm font-medium">
                  {locationStatus === 'granted' ? 'Lokasi Valid - Siap Absen' :
                    locationStatus === 'out_of_radius' ? 'Anda di luar radius kantor' :
                      locationStatus === 'loading' ? 'Mencari Lokasi...' : 'Lokasi tidak ditemukan'}
                </p>
              </div>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="space-y-3 mt-4">
            <button
              onClick={handleClockInButton}
              disabled={clockInStatus !== 'Belum Clock In' || isProcessing}
              className={`w-full py-3 rounded-lg font-bold text-base flex items-center justify-center space-x-2 transition text-white
              ${clockInStatus === 'Belum Clock In' ? 'bg-primary hover:bg-primary-dark' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              <Camera size={20} />
              <span>CLOCK IN</span>
            </button>

            <button
              onClick={() => setShowClockOutModal(true)}
              disabled={clockInStatus !== 'Sudah Clock In' || isProcessing}
              className={`w-full py-3 rounded-lg font-bold text-base flex items-center justify-center space-x-2 transition text-white
              ${clockInStatus === 'Sudah Clock In' ? 'bg-primary hover:bg-primary-dark' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              <Camera size={20} />
              <span>CLOCK OUT</span>
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
                  {todayAttendance.waktu_masuk ? new Date(`2000-01-01T${todayAttendance.waktu_masuk}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-gray-600 text-xs">Clock Out</p>
                <p className="text-base font-bold text-gray-800">
                  {todayAttendance.waktu_keluar ? new Date(`2000-01-01T${todayAttendance.waktu_keluar}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </p>
              </div>
              <div className="col-span-2">
                <div className={`px-3 py-1.5 rounded-lg text-center font-medium text-sm ${todayAttendance.status === 'ontime' ? 'bg-green-100 text-green-800' :
                    todayAttendance.status === 'telat' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center bg-gray-50 overflow-hidden">
                  {clockInPhoto ? (
                    <img src={clockInPhoto} alt="Clock In" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Camera size={32} className="mx-auto mb-1" />
                      <p className="text-xs">Wajib Foto Selfie</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => openCamera('in')}
                  className="w-full mt-2 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm flex items-center justify-center"
                >
                  <Camera size={16} className="mr-2" />
                  {clockInPhoto ? 'Ambil Ulang Foto' : 'Buka Kamera'}
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => { setShowClockInModal(false); setClockInPhoto(null); }}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleClockIn}
                  disabled={!clockInPhoto || isProcessing}
                  className={`flex-1 py-2.5 rounded-lg font-semibold text-sm text-white
                    ${clockInPhoto && !isProcessing ? 'bg-primary hover:bg-emerald-700' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  Kirim Absen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clock Out */}
      {showClockOutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-4">
            <h2 className="text-lg font-bold text-center mb-4">Konfirmasi Clock Out</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center bg-gray-50 overflow-hidden mb-3">
              {clockOutPhoto ? (
                <img src={clockOutPhoto} alt="Out" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400">
                  <Camera size={32} className="mx-auto mb-1" />
                  <p className="text-xs">Wajib Foto Selfie</p>
                </div>
              )}
            </div>
            <button onClick={() => openCamera('out')} className="w-full py-2 bg-blue-600 text-white rounded-lg mb-4 text-sm font-semibold flex items-center justify-center">
              <Camera size={16} className="mr-2" />
              {clockOutPhoto ? 'Ambil Ulang Foto' : 'Buka Kamera'}
            </button>
            <div className="flex space-x-2">
              <button onClick={() => setShowClockOutModal(false)} disabled={isProcessing} className="flex-1 py-2 bg-gray-200 rounded-lg font-semibold text-sm">Batal</button>
              <button onClick={handleClockOut} disabled={!clockOutPhoto || isProcessing} className={`flex-1 py-2 rounded-lg font-semibold text-sm text-white ${clockOutPhoto && !isProcessing ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300'}`}>Clock Out</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomeScreen;
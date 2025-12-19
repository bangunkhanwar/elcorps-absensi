import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, User, MapPin, LogOut, Menu, X, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { attendanceAPI, authAPI } from '../services/api';
import logo from '../assets/logo.png';


const HomeScreen = () => {
  const navigate = useNavigate();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockInStatus, setClockInStatus] = useState('Belum Clock In');
  const [showMenu, setShowMenu] = useState(false);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [user, setUser] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [clockInPhoto, setClockInPhoto] = useState(null);
  const [clockOutPhoto, setClockOutPhoto] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('waiting');
  const [loading, setLoading] = useState(false);
  const [unitKerjaData, setUnitKerjaData] = useState(null);

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

  // Fungsi untuk mendapatkan lokasi
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
            accuracy: position.coords.accuracy
          };
          setCurrentLocation(location);
          checkLocationRadius(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus('denied');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setLocationStatus('gps_off');
          } else {
            setLocationStatus('error');
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationStatus('error');
      alert('Browser tidak mendukung geolocation');
    }
  };

  // Fungsi untuk cek radius lokasi
  const checkLocationRadius = (location) => {
    if (!unitKerjaData) {
      setLocationStatus('waiting');
      return;
    }

    const distance = calculateDistance(
      parseFloat(location.latitude),
      parseFloat(location.longitude),
      unitKerjaData.latitude,
      unitKerjaData.longitude
    );

    if (distance > unitKerjaData.radius_meter) {
      setLocationStatus('out_of_radius');
    } else {
      setLocationStatus('granted');
    }
  };

  // Fungsi menghitung jarak
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radius bumi dalam meter
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Load user data dari localStorage
  const loadUserData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Cek attendance hari ini
  const checkTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getToday();
      
      if (response.data.success && response.data.data) {
        setTodayAttendance(response.data.data);
        
        if (response.data.data.unit_kerja) {
          setUnitKerjaData({
            latitude: parseFloat(response.data.data.unit_kerja.latitude),
            longitude: parseFloat(response.data.data.unit_kerja.longitude),
            radius_meter: response.data.data.unit_kerja.radius_meter,
            nama_unit: response.data.data.unit_kerja.nama_unit
          });
        }
        
        if (!response.data.data.waktu_keluar) {
          setClockInStatus('Sudah Clock In');
        } else {
          setClockInStatus('Sudah Clock Out');
        }
      } else {
        setClockInStatus('Belum Clock In');
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
      setClockInStatus('Belum Clock In');
    }
  };

  // Fungsi ambil foto untuk PWA
  const openCamera = (type) => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Untuk kamera belakang
      
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

  // Handle Clock In
  const handleClockInButton = () => {
    if (clockInStatus !== 'Belum Clock In') return;
    
    if (locationStatus === 'out_of_radius') {
      alert('Anda berada di luar radius unit kerja. Silakan datang ke lokasi yang ditentukan untuk melakukan Clock In.');
      return;
    }
    
    setShowClockInModal(true);
  };

  const handleClockIn = async () => {
    if (!clockInPhoto) {
      alert('Harap mengambil foto terlebih dahulu');
      return;
    }

    if (!currentLocation) {
      alert('Lokasi tidak terdeteksi. Pastikan GPS aktif dan izin lokasi diberikan.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('latitude', currentLocation.latitude);
      formData.append('longitude', currentLocation.longitude);
      
      // Convert dataURL to Blob
      const response = await fetch(clockInPhoto);
      const blob = await response.blob();
      formData.append('foto_masuk', blob, 'clockin.jpg');

      const responseAPI = await attendanceAPI.checkIn(formData);
      
      if (responseAPI.data.success) {
        setShowClockInModal(false);
        setClockInStatus('Sudah Clock In');
        setClockInPhoto(null);
        alert('Clock in berhasil!');
        checkTodayAttendance();
      } else {
        alert(responseAPI.data.message || 'Clock in gagal');
      }
    } catch (error) {
      console.error('Clock in error:', error);
      alert(error.message || 'Terjadi kesalahan saat clock in');
    } finally {
      setLoading(false);
    }
  };

  // Handle Clock Out
  const handleClockOut = async () => {
    if (!clockOutPhoto) {
      alert('Harap mengambil foto terlebih dahulu');
      return;
    }

    if (!currentLocation) {
      alert('Lokasi tidak terdeteksi. Pastikan GPS aktif dan izin lokasi diberikan.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('latitude', currentLocation.latitude);
      formData.append('longitude', currentLocation.longitude);
      
      // Convert dataURL to Blob
      const response = await fetch(clockOutPhoto);
      const blob = await response.blob();
      formData.append('foto_keluar', blob, 'clockout.jpg');

      const responseAPI = await attendanceAPI.checkOut(formData);
      
      if (responseAPI.data.success) {
        setShowClockOutModal(false);
        setClockInStatus('Sudah Clock Out');
        setClockOutPhoto(null);
        alert('Clock out berhasil!');
        checkTodayAttendance();
      } else {
        alert(responseAPI.data.message || 'Clock out gagal');
      }
    } catch (error) {
      console.error('Clock out error:', error);
      alert(error.message || 'Terjadi kesalahan saat clock out');
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Format tanggal
  const formatDate = (date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format waktu
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours} : ${minutes} : ${seconds}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Logo dan Menu */}
      <div className="sticky top-0 z-50 bg-primary rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between px-6 py-6">
          <img
            src={logo}
            alt="Absensi Karyawan"
            className="h-12 object-contain"
          />

          <button
            onClick={() => setShowMenu(true)}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
          >
            <Menu className="text-white" size={28} />
          </button>
        </div>
      </div>
    <div className="p-3 space-y-4">
      
    {/* Informasi Karyawan */}
    <div className="bg-white rounded-xl shadow p-4 flex-shrink-0">
      {/* Header Karyawan */}
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

      {/* Detail Informasi */}
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
          onClick={handleClockInButton}
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
              {todayAttendance.waktu_masuk ? 
                new Date(`2000-01-01T${todayAttendance.waktu_masuk}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 
                '-'
              }
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-gray-600 text-xs">Clock Out</p>
            <p className="text-base font-bold text-gray-800">
              {todayAttendance.waktu_keluar ? 
                new Date(`2000-01-01T${todayAttendance.waktu_keluar}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 
                '-'
              }
            </p>
          </div>
          <div className="col-span-2">
            <div className={`px-3 py-1.5 rounded-lg text-center font-medium text-sm ${
              todayAttendance.status === 'ontime' ? 'bg-green-100 text-green-800' :
              todayAttendance.status === 'telat' ? 'bg-yellow-100 text-yellow-800' :
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 w-full text-center">
                  Menu</h2>
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate('/attendance');
                  }}
                  className="w-full flex items-center justify-between p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center mr-3">
                      <Calendar className="text-white" size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">Riwayat Absensi</p>
                      <p className="text-sm text-gray-600">Lihat history kehadiran</p>
                    </div>
                  </div>
                  <span className="text-emerald-600">→</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate('/leave');
                  }}
                  className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <AlertCircle className="text-white" size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">Pengajuan Izin</p>
                      <p className="text-sm text-gray-600">Ajukan cuti atau izin</p>
                    </div>
                  </div>
                  <span className="text-blue-600">→</span>
                </button>
              </div>

              <button
                onClick={() => setShowMenu(false)}
                className="w-full mt-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Tutup Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clock In */}
      {showClockInModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
        <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl">
          <div className="p-4">
            <div className="flex justify-center items-center mb-3">
              <h2 className="text-lg font-bold text-gray-800"> Konfirmasi Clock In</h2>
            </div>

            <div className="space-y-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-gray-600 text-xs">Lokasi Kerja:</p>
                <p className="text-gray-800 font-semibold text-sm truncate">
                  {user?.unit_kerja_nama || user?.unit_kerja || 'Head Office'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-gray-600 text-xs">Jam Clock In:</p>
                <p className="text-gray-800 font-semibold text-sm">{formatTime(new Date())}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 font-semibold mb-2 text-center text-sm">Foto Clock In</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-36 flex items-center justify-center bg-gray-50">
                {clockInPhoto ? (
                  <img 
                    src={clockInPhoto} 
                    alt="Clock In" 
                    className="w-full h-full object-cover rounded-lg" 
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
                onClick={() => openCamera('in')}
                className="w-full mt-2 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition text-sm"
              >
                {clockInPhoto ? 'Ambil Ulang Foto' : 'Buka Kamera'}
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowClockInModal(false);
                  setClockInPhoto(null);
                }}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleClockIn}
                disabled={!clockInPhoto || loading}
                className={`flex-1 py-2.5 rounded-lg font-semibold transition text-sm ${
                  clockInPhoto && !loading 
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
                <button onClick={() => setShowClockOutModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
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
                <div className="border-2 border-dashed border-gray-300 rounded-xl h-48 flex items-center justify-center bg-gray-50">
                  {clockOutPhoto ? (
                    <img src={clockOutPhoto} alt="Clock Out" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Camera size={48} className="mx-auto mb-2" />
                      <p>Ambil Foto untuk</p>
                      <p>Clock Out</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openCamera('out')}
                  className="w-full mt-3 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition"
                >
                  {clockOutPhoto ? 'Ambil Ulang Foto' : 'Buka Kamera'}
                </button>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowClockOutModal(false);
                    setClockOutPhoto(null);
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={!clockOutPhoto || loading}
                  className={`flex-1 py-3 rounded-xl font-semibold transition ${clockOutPhoto && !loading ? 
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
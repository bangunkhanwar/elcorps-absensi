import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, User, MapPin, LogOut, Menu, X, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { attendanceAPI, authAPI } from '../services/api';
import Header from '../components/Header';

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
      {/* Header */}
      <Header title="Dashboard" />
      
      {/* Logo dan Menu */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-3">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Absensi Karyawan</h1>
              <p className="text-white/80 text-sm">PWA Mobile</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowMenu(true)}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
          >
            <Menu className="text-white" size={28} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Informasi Karyawan */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mr-4">
              <User className="text-emerald-600" size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user?.nama || 'Bangun Chaerudin Anwar'}</h2>
              <p className="text-gray-600">{user?.nik || '52510.3138'}</p>
              <p className="text-gray-600">{user?.jabatan || 'Staff Of Programmer'}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-emerald-600 mb-3">Informasi Karyawan</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Departemen:</p>
                <p className="font-medium">{user?.departemen || 'ICT'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Divisi:</p>
                <p className="font-medium">{user?.divisi || 'Strategic Support'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600 text-sm">Lokasi Kerja:</p>
                <p className="font-medium">{user?.unit_kerja || 'Head Office'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Waktu dan Tanggal */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-white p-6 shadow-lg">
          <h3 className="text-center text-lg font-semibold mb-2">{formatDate(currentTime)}</h3>
          <div className="flex items-center justify-center space-x-2">
            <Clock size={24} />
            <span className="text-3xl font-bold tracking-wider">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Status Lokasi */}
        <div className={`rounded-xl p-4 border ${locationStatus === 'granted' ? 'bg-green-50 border-green-200' : 
          locationStatus === 'out_of_radius' ? 'bg-yellow-50 border-yellow-200' : 
          'bg-red-50 border-red-200'}`}>
          <div className="flex items-center">
            <MapPin className={`mr-2 ${locationStatus === 'granted' ? 'text-green-600' : 
              locationStatus === 'out_of_radius' ? 'text-yellow-600' : 'text-red-600'}`} size={20} />
            <div>
              <p className="font-medium">
                {locationStatus === 'granted' ? '📍 Lokasi terdeteksi - Siap untuk absensi' :
                 locationStatus === 'out_of_radius' ? '📍 Lokasi di luar radius' :
                 locationStatus === 'denied' ? '📍 Izin lokasi ditolak' :
                 locationStatus === 'gps_off' ? '📍 GPS tidak aktif' :
                 '📍 Mendeteksi lokasi...'}
              </p>
              {locationStatus === 'granted' && currentLocation && (
                <p className="text-sm text-gray-600 mt-1">
                  Lat: {parseFloat(currentLocation.latitude).toFixed(6)}, Lng: {parseFloat(currentLocation.longitude).toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Absensi */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            Status: <span className={clockInStatus === 'Belum Clock In' ? 'text-red-600' : 
              clockInStatus === 'Sudah Clock In' ? 'text-yellow-600' : 'text-green-600'}>
              {clockInStatus}
            </span>
          </h3>

          {/* Tombol Absensi */}
          <div className="space-y-4">
            <button
              onClick={handleClockInButton}
              disabled={clockInStatus !== 'Belum Clock In'}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 transition
                ${clockInStatus === 'Belum Clock In' ? 
                  'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white' : 
                  'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              <Camera size={24} />
              <span>CLOCK IN</span>
            </button>

            <button
              onClick={() => setShowClockOutModal(true)}
              disabled={clockInStatus !== 'Sudah Clock In'}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 transition
                ${clockInStatus === 'Sudah Clock In' ? 
                  'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white' : 
                  'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              <Camera size={24} />
              <span>CLOCK OUT</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-3 border-2 border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition flex items-center justify-center space-x-2"
            >
              <LogOut size={20} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>

        {/* Info Absensi Hari Ini */}
        {todayAttendance && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Absensi Hari Ini</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600 text-sm">Clock In</p>
                <p className="text-lg font-bold text-gray-800">
                  {todayAttendance.waktu_masuk ? 
                    new Date(`2000-01-01T${todayAttendance.waktu_masuk}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 
                    '-'
                  }
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600 text-sm">Clock Out</p>
                <p className="text-lg font-bold text-gray-800">
                  {todayAttendance.waktu_keluar ? 
                    new Date(`2000-01-01T${todayAttendance.waktu_keluar}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 
                    '-'
                  }
                </p>
              </div>
              <div className="col-span-2">
                <div className={`px-4 py-2 rounded-lg text-center font-medium ${
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
                <h2 className="text-2xl font-bold text-gray-800">Menu</h2>
                <button onClick={() => setShowMenu(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Konfirmasi Clock In</h2>
                <button onClick={() => setShowClockInModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600 font-medium">Lokasi Kerja:</p>
                  <p className="text-gray-800 font-semibold">{user?.unit_kerja || 'Head Office'}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600 font-medium">Jam Clock In:</p>
                  <p className="text-gray-800 font-semibold">{formatTime(new Date())}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 font-semibold mb-3 text-center">Foto Clock In</p>
                <div className="border-2 border-dashed border-gray-300 rounded-xl h-48 flex items-center justify-center bg-gray-50">
                  {clockInPhoto ? (
                    <img src={clockInPhoto} alt="Clock In" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Camera size={48} className="mx-auto mb-2" />
                      <p>Ambil Foto untuk</p>
                      <p>Clock In</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openCamera('in')}
                  className="w-full mt-3 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
                >
                  {clockInPhoto ? 'Ambil Ulang Foto' : 'Buka Kamera'}
                </button>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowClockInModal(false);
                    setClockInPhoto(null);
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleClockIn}
                  disabled={!clockInPhoto || loading}
                  className={`flex-1 py-3 rounded-xl font-semibold transition ${clockInPhoto && !loading ? 
                    'bg-green-600 hover:bg-green-700 text-white' : 
                    'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
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
              <div className="flex justify-between items-center mb-4">
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
                  className="w-full mt-3 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
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
                    'bg-blue-600 hover:bg-blue-700 text-white' : 
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
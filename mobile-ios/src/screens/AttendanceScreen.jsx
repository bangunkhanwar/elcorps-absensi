import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { attendanceAPI } from '../services/api';
import Header from '../components/Header';

const AttendanceScreen = () => {
  const navigate = useNavigate();
  
  const [selectedFilter, setSelectedFilter] = useState('semua');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserDataAndAttendance();
  }, [selectedMonth, selectedYear]);

  const loadUserDataAndAttendance = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const userObj = JSON.parse(userData);
        setUser(userObj);
        await fetchAttendanceHistory(userObj.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async (userId) => {
    try {
      const params = {
        month: selectedMonth + 1,
        year: selectedYear
      };
      
      const response = await attendanceAPI.getUserAttendance(userId, params);
      
      if (response.data.success) {
        setAttendanceData(response.data.data || []);
      } else {
        setAttendanceData([]);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      alert('Gagal mengambil data absensi: ' + error.message);
    }
  };

  // Fungsi untuk menghitung status
  const calculateStatus = (waktuMasuk, waktuKeluar, statusFromDB) => {
    if (statusFromDB === 'izin' || statusFromDB === 'Izin') return 'Izin';
    if (!waktuMasuk) return 'Tidak Hadir';

    const jamMasuk = new Date(`2000-01-01T${waktuMasuk}`);
    const batasTelat = new Date(`2000-01-01T09:00:00`);

    return jamMasuk <= batasTelat ? 'Tepat Waktu' : 'Terlambat';
  };

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = [2023, 2024, 2025, 2026, 2027];

  const filterOptions = [
    { value: 'semua', label: 'Semua' },
    { value: 'tepat-waktu', label: 'Tepat Waktu' },
    { value: 'terlambat', label: 'Terlambat' },
    { value: 'tidak-hadir', label: 'Tidak Hadir/Izin' },
  ];

  // Filter data
  const filteredData = attendanceData.filter(item => {
    const status = calculateStatus(item.waktu_masuk, item.waktu_keluar, item.status);

    if (selectedFilter === 'semua') return true;
    if (selectedFilter === 'tepat-waktu') return status === 'Tepat Waktu';
    if (selectedFilter === 'terlambat') return status === 'Terlambat';
    if (selectedFilter === 'tidak-hadir') return status === 'Tidak Hadir' || status === 'Izin';
    return false;
  });

  // Format tanggal
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format waktu
  const formatTime = (timeString) => {
    if (!timeString) return '-';
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Warna status
  const getStatusColor = (status) => {
    switch (status) {
      case 'Tepat Waktu': return 'bg-green-100 text-green-800';
      case 'Terlambat': return 'bg-yellow-100 text-yellow-800';
      case 'Tidak Hadir': return 'bg-red-100 text-red-800';
      case 'Izin': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40">
        <div className="bg-primary py-4 px-4 rounded-b-3xl shadow-lg">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-4"
            >
              <ArrowLeft className="text-white" size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Riwayat Absensi</h1>
              <p className="text-white/80 text-sm mt-1">
                {user?.nama}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Filter Data</h2>
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center bg-primary rounded-lg px-4 py-2 text-white font-semibold hover:bg-primary-dark transition"
          >
            <Filter size={16} className="mr-2" />
            Filter
          </button>
        </div>

        {/* Quick Filter Buttons */}
        <div className="overflow-x-auto mb-4">
          <div className="flex space-x-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedFilter(option.value)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition ${selectedFilter === option.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Period */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-blue-800 text-center font-medium">
            Periode: {months[selectedMonth]} {selectedYear}
          </p>
        </div>
      </div>

      {/* Attendance List */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
            <p className="text-gray-500 text-lg font-semibold">Memuat data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map((item) => {
              const status = calculateStatus(item.waktu_masuk, item.waktu_keluar, item.status);
              
              return (
                <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  {/* Date Header */}
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {formatDate(item.tanggal_absen)}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>

                  {/* Time Information */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-600 text-sm">Clock In</p>
                      <p className="text-gray-800 font-bold text-lg">
                        {formatTime(item.waktu_masuk)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-600 text-sm">Clock Out</p>
                      <p className="text-gray-800 font-bold text-lg">
                        {formatTime(item.waktu_keluar)}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin size={16} className="mr-2" />
                    <span>{item.location || 'Lokasi tidak tersedia'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Calendar size={64} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-semibold">Tidak ada data absensi</p>
            <p className="text-gray-400 text-center mt-2">
              Tidak ada riwayat absensi untuk filter yang dipilih
            </p>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Filter Riwayat</h2>
              <button onClick={() => setShowFilterModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle size={24} />
              </button>
            </div>

            {/* Month Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Bulan</h3>
              <div className="overflow-x-auto">
                <div className="flex space-x-2 pb-2">
                  {months.map((month, index) => (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(index)}
                      className={`px-4 py-3 rounded-lg whitespace-nowrap transition ${selectedMonth === index
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Year Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Tahun</h3>
              <div className="overflow-x-auto">
                <div className="flex space-x-2 pb-2">
                  {years.map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-4 py-3 rounded-lg whitespace-nowrap transition ${selectedYear === year
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Filter */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Status</h3>
              <div className="grid grid-cols-2 gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedFilter(option.value)}
                    className={`px-4 py-3 rounded-lg transition ${selectedFilter === option.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                className="flex-1 bg-gray-200 rounded-xl py-4 text-gray-700 font-semibold hover:bg-gray-300 transition"
                onClick={() => {
                  setSelectedFilter('semua');
                  setSelectedMonth(new Date().getMonth());
                  setSelectedYear(new Date().getFullYear());
                }}
              >
                Reset
              </button>
              <button
                className="flex-1 bg-primary rounded-xl py-4 text-white font-semibold hover:bg-emerald-700 transition"
                onClick={() => setShowFilterModal(false)}
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceScreen;
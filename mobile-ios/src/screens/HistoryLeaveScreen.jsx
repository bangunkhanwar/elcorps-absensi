import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Calendar, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { leaveAPI } from '../services/api';

const HistoryLeaveScreen = () => {
  const navigate = useNavigate();
  
  const [selectedFilter, setSelectedFilter] = useState('semua');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState(null);
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserDataAndLeaves();
  }, [selectedMonth, selectedYear]);

  const loadUserDataAndLeaves = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const userObj = JSON.parse(userData);
        setUser(userObj);
        await fetchLeaveHistory();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveHistory = async () => {
    try {
      const response = await leaveAPI.getMyLeaves();
      
      if (response.data.success) {
        const allLeaves = response.data.leaves || [];
        
        // Filter berdasarkan bulan dan tahun yang dipilih
        const filteredData = allLeaves.filter((item) => {
          const startDate = new Date(item.start_date);
          const endDate = new Date(item.end_date);
          const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
          const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 0);

          return (
            (startDate >= selectedMonthStart && startDate <= selectedMonthEnd) ||
            (endDate >= selectedMonthStart && endDate <= selectedMonthEnd) ||
            (startDate <= selectedMonthStart && endDate >= selectedMonthEnd)
          );
        });

        // Sort by date (newest first)
        filteredData.sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setLeaveData(filteredData);
      } else {
        setLeaveData([]);
      }
    } catch (error) {
      console.error('Error fetching leave data:', error);
      alert('Gagal mengambil data izin: ' + error.message);
    }
  };

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = [2023, 2024, 2025, 2026, 2027];

  const filterOptions = [
    { value: 'semua', label: 'Semua Status' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
    { value: 'sakit', label: 'Sakit' },
    { value: 'cuti', label: 'Cuti' },
    { value: 'lainnya', label: 'Lainnya' },
  ];

  // Filter data
  const filteredData = leaveData.filter((item) => {
    if (selectedFilter === 'semua') return true;
    if (selectedFilter === 'pending') return item.status?.toLowerCase() === 'pending';
    if (selectedFilter === 'approved') return item.status?.toLowerCase() === 'approved';
    if (selectedFilter === 'rejected') return item.status?.toLowerCase() === 'rejected';
    if (selectedFilter === 'sakit') return item.jenis_izin?.toLowerCase() === 'sakit';
    if (selectedFilter === 'cuti') return item.jenis_izin?.toLowerCase() === 'cuti';
    if (selectedFilter === 'lainnya') return item.jenis_izin?.toLowerCase() === 'lainnya';
    return false;
  });

  // Format tanggal
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Hitung durasi
  const calculateDuration = (startDateStr, endDateStr) => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Warna status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Icon jenis izin
  const getLeaveIcon = (jenisIzin) => {
    switch (jenisIzin?.toLowerCase()) {
      case 'sakit': return '💊';
      case 'cuti': return '📍';
      case 'izin': return '📝';
      default: return '📄';
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
              <h1 className="text-2xl font-bold text-white">Riwayat Izin</h1>
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

        {/* Selected Period */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-blue-800 text-center font-medium">
            Periode: {months[selectedMonth]} {selectedYear}
          </p>
        </div>
      </div>

      {/* Leave List */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-500 text-lg font-semibold">Memuat data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map((item) => {
              const duration = calculateDuration(item.start_date, item.end_date);
              const isSameDay = new Date(item.start_date).toDateString() === new Date(item.end_date).toDateString();
              
              return (
                <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{getLeaveIcon(item.jenis_izin)}</span>
                      <h3 className="font-semibold text-gray-800 capitalize">
                        {item.jenis_izin || '-'}
                      </h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                      {item.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>

                  {/* Tanggal Pengajuan */}
                  <div className="mb-3">
                    <p className="text-gray-600 text-sm">Diajukan:</p>
                    <p className="text-gray-800 font-medium text-sm">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>

                  {/* Periode Izin */}
                  <div className="mb-3">
                    <p className="text-gray-600 text-sm">Periode Izin:</p>
                    <div className="flex items-center mt-1">
                      <p className="text-gray-800 font-medium text-sm">
                        {isSameDay ? 
                          formatDate(item.start_date) : 
                          `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`
                        }
                      </p>
                      {!isSameDay && (
                        <span className="ml-2 bg-blue-50 px-2 py-1 rounded-full">
                          <p className="text-blue-700 text-xs font-medium">
                            {duration} hari
                          </p>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Keterangan */}
                  {item.keterangan && (
                    <div className="mb-3">
                      <p className="text-gray-600 text-sm">Keterangan:</p>
                      <p className="text-gray-800 text-sm mt-1 bg-gray-50 p-2 rounded-lg">
                        {item.keterangan}
                      </p>
                    </div>
                  )}

                  {/* Lampiran */}
                  {item.lampiran && (
                    <div>
                      <p className="text-gray-600 text-sm">Lampiran:</p>
                      <a
                        href={item.lampiran}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center mt-1 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                      >
                        <FileText className="text-blue-600 mr-2" size={16} />
                        <span className="text-blue-600 font-medium text-sm flex-1">
                          Lihat Lampiran
                        </span>
                        <span className="text-blue-600">→</span>
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <FileText size={64} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-semibold text-center">
              {selectedFilter === 'semua'
                ? `Tidak ada riwayat izin pada ${months[selectedMonth]} ${selectedYear}`
                : `Tidak ada data dengan filter yang dipilih`
              }
            </p>
            <p className="text-gray-400 text-center mt-2 text-sm">
              Semua pengajuan izin akan ditampilkan di sini
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

export default HistoryLeaveScreen;
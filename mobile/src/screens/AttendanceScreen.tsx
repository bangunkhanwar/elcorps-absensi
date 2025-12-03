import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AttendanceScreen({ navigation }: any) {
  const [selectedFilter, setSelectedFilter] = useState('semua');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user data and attendance history
  useEffect(() => {
    loadUserDataAndAttendance();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserDataAndAttendance();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserDataAndAttendance = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const userObj = JSON.parse(userData);
        setUser(userObj);
        await fetchAttendanceHistory(userObj.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async (userId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const serverIP = await AsyncStorage.getItem('server_ip') || '10.2.200.185';
      
      console.log('Fetching attendance from server:', serverIP);

      const response = await fetch(
        `http://${serverIP}:5000/api/attendance/user/${userId}?month=${selectedMonth + 1}&year=${selectedYear}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      setAttendanceData(data);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      Alert.alert('Error', 'Gagal mengambil data absensi: ' + error.message);
    }
  };

  // Tambahkan fungsi calculateStatus
  const calculateStatus = (waktuMasuk: string | null, waktuKeluar: string | null, statusFromDB: string) => {
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

  // Update filteredData dengan calculateStatus
  const filteredData = attendanceData.filter(item => {
    const status = calculateStatus(item.waktu_masuk, item.waktu_keluar, item.status);
    
    if (selectedFilter === 'semua') return true;
    if (selectedFilter === 'tepat-waktu') return status === 'Tepat Waktu';
    if (selectedFilter === 'terlambat') return status === 'Terlambat';
    if (selectedFilter === 'tidak-hadir') return status === 'Tidak Hadir' || status === 'Izin';
    return false;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Update getStatusColor untuk menangani Izin
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Tepat Waktu': return 'bg-green-100 text-green-800';
      case 'Terlambat': return 'bg-yellow-100 text-yellow-800';
      case 'Tidak Hadir': return 'bg-red-100 text-red-800';
      case 'Izin': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary py-6 px-4">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => {
              navigation.navigate('Home', { showMenuModal: true });
            }}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-bold">Riwayat Absensi</Text>
            <Text className="text-white opacity-90">{user?.nama}</Text>
          </View>
        </View>
      </View>

      {/* Filter Section */}
      <View className="bg-white p-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-semibold text-gray-800">Filter Data</Text>
          <TouchableOpacity 
            onPress={() => setShowFilterModal(true)}
            className="flex-row items-center bg-primary rounded-lg px-4 py-2"
          >
            <Ionicons name="filter" size={16} color="white" />
            <Text className="text-white ml-2 font-semibold">Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row space-x-2">
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSelectedFilter(option.value)}
                className={`px-4 py-2 rounded-full ${
                  selectedFilter === option.value 
                    ? 'bg-primary' 
                    : 'bg-gray-200'
                }`}
              >
                <Text className={
                  selectedFilter === option.value 
                    ? 'text-white font-semibold' 
                    : 'text-gray-700'
                }>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Selected Period */}
        <View className="bg-blue-50 rounded-lg p-3">
          <Text className="text-blue-800 text-center font-medium">
            Periode: {months[selectedMonth]} {selectedYear}
          </Text>
        </View>
      </View>

      {/* Attendance List */}
      <ScrollView className="flex-1 p-4">
        {loading ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="refresh" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-semibold mt-4">
              Memuat data...
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {filteredData.map((item) => {
              const status = calculateStatus(item.waktu_masuk, item.waktu_keluar, item.status);
              return (
                <View key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
                  {/* Date Header */}
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-lg font-semibold text-gray-800">
                      {formatDate(item.tanggal_absen)}
                    </Text>
                    <View className={`px-3 py-1 rounded-full ${getStatusColor(status)}`}>
                      <Text className="font-semibold text-sm">{status}</Text>
                    </View>
                  </View>

                  {/* Time Information */}
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-1">
                      <Text className="text-gray-600 text-sm">Clock In</Text>
                      <Text className="text-gray-800 font-semibold text-lg">
                        {formatTime(item.waktu_masuk)}
                      </Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-gray-400">-</Text>
                    </View>
                    <View className="flex-1 items-end">
                      <Text className="text-gray-600 text-sm">Clock Out</Text>
                      <Text className="text-gray-800 font-semibold text-lg">
                        {formatTime(item.waktu_keluar)}
                      </Text>
                    </View>
                  </View>

                  {/* Location */}
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text className="text-gray-600 ml-2 text-sm">{item.location || 'Lokasi tidak tersedia'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {!loading && filteredData.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-semibold mt-4">
              Tidak ada data absensi
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              Tidak ada riwayat absensi untuk filter yang dipilih
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-3/4">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">Filter Riwayat</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Month Selection */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Bulan</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-2">
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      onPress={() => setSelectedMonth(index)}
                      className={`px-4 py-3 rounded-lg ${
                        selectedMonth === index 
                          ? 'bg-primary' 
                          : 'bg-gray-100'
                      }`}
                    >
                      <Text className={
                        selectedMonth === index 
                          ? 'text-white font-semibold' 
                          : 'text-gray-700'
                      }>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Year Selection */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Tahun</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-2">
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      onPress={() => setSelectedYear(year)}
                      className={`px-4 py-3 rounded-lg ${
                        selectedYear === year 
                          ? 'bg-primary' 
                          : 'bg-gray-100'
                      }`}
                    >
                      <Text className={
                        selectedYear === year 
                          ? 'text-white font-semibold' 
                          : 'text-gray-700'
                      }>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Status Filter */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Status</Text>
              <View className="flex-row flex-wrap -mx-1">
                {filterOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSelectedFilter(option.value)}
                    className={`mx-1 mb-2 px-4 py-3 rounded-lg flex-1 min-w-[45%] ${
                      selectedFilter === option.value 
                        ? 'bg-primary' 
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text className={
                      selectedFilter === option.value 
                        ? 'text-white font-semibold text-center' 
                        : 'text-gray-700 text-center'
                    }>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row space-x-3">
              <TouchableOpacity 
                className="flex-1 bg-gray-200 rounded-xl py-4"
                onPress={() => {
                  setSelectedFilter('semua');
                  setSelectedMonth(new Date().getMonth());
                  setSelectedYear(new Date().getFullYear());
                }}
              >
                <Text className="text-gray-700 text-center font-semibold">
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-1 bg-primary rounded-xl py-4"
                onPress={() => setShowFilterModal(false)}
              >
                <Text className="text-white text-center font-semibold">
                  Terapkan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
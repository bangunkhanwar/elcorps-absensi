import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Image, Platform, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { StyleSheet } from 'react-native';

export default function LeaveScreen({ navigation }: any) {
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState('');
  const [tempDate, setTempDate] = useState(new Date());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
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

  const formatDateForDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateForAPI = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDateSelect = (field: string) => {
    setShowDatePicker(field);

    if (field === 'start' && startDate) {
      setTempDate(startDate);
    } else if (field === 'end' && endDate) {
      setTempDate(endDate);
    } else {
      setTempDate(new Date());
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker('');
    }

    if (selectedDate) {
      setTempDate(selectedDate);

      if (Platform.OS === 'android') {
        if (showDatePicker === 'start') {
          setStartDate(selectedDate);
          if (!endDate || selectedDate > endDate) {
            setEndDate(selectedDate);
          }
        } else if (showDatePicker === 'end') {
          setEndDate(selectedDate);
        }
      }
    }
  };

  const handleConfirmDate = () => {
    if (showDatePicker === 'start') {
      setStartDate(tempDate);
      if (!endDate || tempDate > endDate) {
        setEndDate(tempDate);
      }
    } else if (showDatePicker === 'end') {
      setEndDate(tempDate);
    }
    setShowDatePicker('');
  };

  const handleCancelDate = () => {
    setShowDatePicker('');
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const serverIP = await AsyncStorage.getItem('server_ip') || '10.1.10.219';

      console.log('🔍 Token:', token ? 'exists' : 'missing');
      console.log('🔍 Server IP:', serverIP);

      const leaveData = {
        start_date: formatDateForAPI(startDate),
        end_date: formatDateForAPI(endDate),
        jenis_izin: leaveType.toLowerCase(),
        keterangan: description,
        lampiran: attachment,
      };

      console.log('📤 Submitting leave data:', leaveData);

      const response = await fetch(`http://${serverIP}:5000/api/leave/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveData),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Leave submission result:', result);

      Alert.alert(
        'Sukses',
        'Pengajuan izin berhasil dikirim!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home', { showMenuModal: true })
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ Error submitting leave:', error);
      Alert.alert('Error', 'Gagal mengajukan izin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = leaveType && startDate && endDate && description.length >= 10 && !loading;

  return (
    <View style={styles.container}>
      {/* Status Bar untuk iOS */}
      {Platform.OS === 'ios' && (
        <View style={styles.iosStatusBar} />
      )}

      {/* Status Bar untuk Android */}
      {Platform.OS === 'android' && (
        <StatusBar backgroundColor="#25a298" barStyle="light-content" />
      )}
      <SafeAreaView style={styles.safeArea}
        edges={
<<<<<<< HEAD
          Platform.OS === 'ios'
=======
          Platform.OS === 'ios' 
>>>>>>> 4902f588f8444b0dcd79c17ff2b22b2db382eefb
            ? ['left', 'right', 'bottom'] // iOS: hanya kiri, kanan, bawah
            : ['top', 'left', 'right', 'bottom'] // Android: semua sisi
        }>
        {/* Header */}
        <StatusBar backgroundColor="#25a298" barStyle="light-content" />

        <View className="bg-primary py-4 px-4 rounded-b-3xl shadow-lg">
<<<<<<< HEAD
          <View className="flex-row items-center justify-between">
            {/* Left: Back button + title */}
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center mr-4"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View>
                <Text className="text-2xl font-bold text-white">Pengajuan Izin</Text>
                <Text className="text-white/80 text-sm mt-1">
                  {user?.nama || 'Loading...'}
                </Text>
              </View>
            </View>
            {/* Right: Menu icon */}
            <TouchableOpacity
              className="items-center justify-center ml-4"
              onPress={() => navigation.navigate('HistoryLeave')}
              style={{ width: 40, height: 40 }}
            >
              <Ionicons
                name="hourglass-outline"
                size={38}
                color="white"
              />
            </TouchableOpacity>
=======
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center mr-4"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Pengajuan Izin</Text>
              <Text className="text-white/80 text-sm mt-1">
                {user?.nama || 'Loading...'}
              </Text>
            </View>
>>>>>>> 4902f588f8444b0dcd79c17ff2b22b2db382eefb
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Form Container */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">
              Form Pengajuan Izin
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              Isi form di bawah untuk mengajukan izin
            </Text>

            {/* Jenis Izin */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">
                Jenis Izin <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                className="border-2 border-gray-300 rounded-xl p-4 flex-row justify-between items-center"
                onPress={() => setShowLeaveTypeModal(true)}
              >
                <Text className={`${leaveType ? 'text-gray-800' : 'text-gray-400'}`}>
                  {leaveType || 'Pilih Jenis Izin'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Tanggal Mulai */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">
                Tanggal Mulai <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                className="border-2 border-gray-300 rounded-xl p-4 flex-row justify-between items-center"
                onPress={() => handleDateSelect('start')}
              >
                <Text className={`${startDate ? 'text-gray-800' : 'text-gray-400'}`}>
                  {formatDateForDisplay(startDate) || 'Pilih Tanggal Mulai'}
                </Text>
                <Ionicons name="calendar" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Tanggal Selesai */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">
                Tanggal Selesai <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                className="border-2 border-gray-300 rounded-xl p-4 flex-row justify-between items-center"
                onPress={() => handleDateSelect('end')}
              >
                <Text className={`${endDate ? 'text-gray-800' : 'text-gray-400'}`}>
                  {formatDateForDisplay(endDate) || 'Pilih Tanggal Selesai'}
                </Text>
                <Ionicons name="calendar" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Durasi */}
            {startDate && endDate && (
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-800 mb-3">
                  Durasi Izin
                </Text>
                <View className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <Text className="text-green-800 text-center font-semibold">
                    {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1)} Hari
                  </Text>
                </View>
              </View>
            )}

            {/* Keterangan */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">
                Keterangan <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="border-2 border-gray-300 rounded-xl p-4 h-32 text-gray-800"
                placeholder="Jelaskan alasan pengajuan izin..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
              <Text className={`text-sm mt-2 ${description.length < 10 && description.length > 0 ? 'text-red-500' : 'text-gray-500'
                }`}>
                {description.length}/10 karakter {description.length < 10 && description.length > 0 ? '- Minimal 10 karakter' : ''}
              </Text>
            </View>

            {/* Lampiran */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">
                Lampiran
              </Text>

              {attachment ? (
                <View className="border-2 border-green-500 rounded-xl p-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <Ionicons name="document-attach" size={24} color="#10B981" />
                      <Text className="text-green-700 font-semibold ml-2">
                        File Terlampir
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setAttachment(null)}>
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <Image
                    source={{ uri: attachment }}
                    className="w-full h-40 rounded-lg"
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <TouchableOpacity
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 items-center justify-center"
                  onPress={() => {
                    setAttachment('https://via.placeholder.com/300x200');
                  }}
                >
                  <Ionicons name="cloud-upload" size={48} color="#9CA3AF" />
                  <Text className="text-gray-500 text-center mt-3 font-semibold">
                    Upload Bukti Pendukung
                  </Text>
                  <Text className="text-gray-400 text-center mt-1 text-sm">
                    Surat sakit, dokumen, atau foto lainnya
                  </Text>
                  <Text className="text-primary font-semibold mt-2">
                    Pilih File
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Informasi */}
            <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text className="text-blue-800 ml-2 flex-1">
                  Pastikan semua data yang diisi sudah benar. Pengajuan izin akan diproses dalam 1-2 hari kerja.
                </Text>
              </View>
            </View>
          </View>

          {/* Tombol Aksi */}
          <View className="flex-row space-x-3 mb-8">
            <TouchableOpacity
              className="flex-1 bg-gray-200 rounded-xl py-4"
              onPress={() => navigation.navigate('Home', { showMenuModal: true })}
              disabled={loading}
            >
              <Text className="text-gray-700 text-center font-semibold text-lg">
                Batal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary rounded-xl py-4"
              onPress={handleSubmit}
              disabled={!isFormValid}
            >
              <Text className={`text-center font-semibold text-lg ${!isFormValid ? 'text-gray-400' : 'text-white'
                }`}>
                {loading ? 'Mengirim...' : 'Ajukan Izin'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Date Picker Modal for iOS */}
        {Platform.OS === 'ios' && showDatePicker !== '' && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={showDatePicker !== ''}
            onRequestClose={handleCancelDate}
          >
            <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white rounded-t-3xl p-6">
                {/* Header dengan tombol Cancel dan Done */}
                <View className="flex-row justify-between items-center mb-4">
                  <TouchableOpacity onPress={handleCancelDate}>
                    <Text className="text-blue-500 text-lg font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <Text className="text-lg font-semibold text-gray-800">
                    {showDatePicker === 'start' ? 'Tanggal Mulai' : 'Tanggal Selesai'}
                  </Text>
                  <TouchableOpacity onPress={handleConfirmDate}>
                    <Text className="text-blue-500 text-lg font-semibold">Done</Text>
                  </TouchableOpacity>
                </View>

                {/* DateTimePicker dengan mode spinner */}
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  minimumDate={showDatePicker === 'end' && startDate ? startDate : new Date()}
                  style={{ height: 200 }}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Date Picker for Android */}
        {Platform.OS === 'android' && showDatePicker !== '' && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            onChange={onDateChange}
            minimumDate={showDatePicker === 'end' && startDate ? startDate : new Date()}
          />
        )}

        {/* Modal Jenis Izin */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showLeaveTypeModal}
          onRequestClose={() => setShowLeaveTypeModal(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl p-6 max-h-3/4">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-gray-800">Pilih Jenis Izin</Text>
                <TouchableOpacity onPress={() => setShowLeaveTypeModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {leaveTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    className={`flex-row items-center p-4 rounded-xl mb-2 ${leaveType === type.label ? 'bg-primary' : 'bg-gray-100'
                      }`}
                    onPress={() => {
                      setLeaveType(type.label);
                      setShowLeaveTypeModal(false);
                    }}
                  >
                    <Text className="text-2xl mr-3">{type.icon}</Text>
                    <Text className={`text-lg font-semibold ${leaveType === type.label ? 'text-white' : 'text-gray-800'
                      }`}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white', // Background utama putih
  },
  iosStatusBar: {
    backgroundColor: '#25a298', // Warna primary (hijau) untuk status bar iOS
    height: Platform.OS === 'ios' ? Constants.statusBarHeight : 0,
    width: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'white', // Background putih untuk konten di bawah status bar
  },
});
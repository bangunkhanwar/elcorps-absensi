import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Image, Alert, Linking, Platform, StatusBar as RNStatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { attendanceAPI } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import Constants from 'expo-constants';
import { StyleSheet } from 'react-native';

// Define route params type
type RootStackParamList = {
  Home: { showMenuModal?: boolean };
};

type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  iosStatusBar: {
    backgroundColor: '#25a298',
    height: Platform.OS === 'ios' ? Constants.statusBarHeight : 0,
    width: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
});

// Fungsi untuk menghitung jarak antara dua koordinat (meter)
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function HomeScreen({ navigation }: any) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockInStatus, setClockInStatus] = useState('Belum Clock In');
  const [showMenu, setShowMenu] = useState(false);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [clockInPhoto, setClockInPhoto] = useState<string | null>(null);
  const [clockOutPhoto, setClockOutPhoto] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: string, longitude: string } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'waiting' | 'granted' | 'denied' | 'gps_off' | 'error' | 'out_of_radius'>('waiting');
  const [showLoading, setShowLoading] = useState(false);
  const [showGPSModal, setShowGPSModal] = useState(false);
  const [unitKerjaData, setUnitKerjaData] = useState<{
    latitude: number;
    longitude: number;
    radius_meter: number;
    nama_unit: string;
  } | null>(null);

  const route = useRoute<HomeScreenRouteProp>();

  useEffect(() => {
    if (route.params?.showMenuModal) {
      setShowMenu(true);
      navigation.setParams({ showMenuModal: false });
    }
  }, [route.params, navigation]);

  // Load user data & attendance on mount
  useEffect(() => {
    loadUserData();
    checkTodayAttendance();

    // Timer jam
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cek lokasi hanya setelah user sudah dimuat
  useEffect(() => {
    if (user) {
      setLocationStatus('waiting');
      getCurrentLocation();
    }
  }, [user]);

  // Polling lokasi jika belum granted
  useEffect(() => {
    let locationPolling: NodeJS.Timeout | null = null;
    
    // Hanya polling jika status bukan 'granted' atau 'out_of_radius' dan user sudah ada
    if ((locationStatus === 'waiting' || locationStatus === 'error') && user) {
      locationPolling = setInterval(async () => {
        console.log('🔄 Polling lokasi...');
        await getCurrentLocation();
      }, 10000);
    }
    
    return () => {
      if (locationPolling) clearInterval(locationPolling);
    };
  }, [locationStatus, user]);

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return null;
      }

      setLocationStatus('waiting');
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData = {
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      };

      setCurrentLocation(locationData);

      // --- CEK RADIUS berdasarkan data unit kerja yang benar ---
      // Gunakan data unitKerjaData dari state, bukan dari user
      if (!unitKerjaData) {
        console.log('⚠️ Data unit kerja belum tersedia');
        setLocationStatus('error');
        return locationData;
      }

      const distance = getDistanceFromLatLonInMeters(
        parseFloat(locationData.latitude),
        parseFloat(locationData.longitude),
        unitKerjaData.latitude,
        unitKerjaData.longitude
      );

      console.log('📍 Distance calculation:', {
        userLocation: locationData,
        unitLocation: { 
          latitude: unitKerjaData.latitude, 
          longitude: unitKerjaData.longitude,
          nama_unit: unitKerjaData.nama_unit
        },
        distance: Math.round(distance),
        allowedRadius: unitKerjaData.radius_meter,
        unitName: unitKerjaData.nama_unit
      });

      if (distance > unitKerjaData.radius_meter) {
        console.log('❌ Diluar radius:', Math.round(distance), '>', unitKerjaData.radius_meter);
        setLocationStatus('out_of_radius');
      } else {
        console.log('✅ Dalam radius:', Math.round(distance), '<=', unitKerjaData.radius_meter);
        setLocationStatus('granted');
      }

      return locationData;
    } catch (error: any) {
      if (
        error &&
        error.message &&
        error.message.includes('Location request failed due to unsatisfied device settings')
      ) {
        setLocationStatus('gps_off');
        setShowGPSModal(true);
        return null;
      }
      setLocationStatus('error');
      console.error('Error getting location:', error);
      return null;
    }
  };

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Log untuk debugging
        console.log('👤 User loaded from AsyncStorage:', {
          id: parsedUser.id,
          nama: parsedUser.nama,
          unit_kerja_id: parsedUser.unit_kerja_id,
          unit_kerja: parsedUser.unit_kerja
        });
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getToday();
      
      console.log('📅 Today attendance response:', response.data);
      
      // PERBAIKAN: Ambil data unit kerja dari response API
      if (response.data.unit_kerja) {
        const unitData = {
          latitude: parseFloat(response.data.unit_kerja.latitude),
          longitude: parseFloat(response.data.unit_kerja.longitude),
          radius_meter: response.data.unit_kerja.radius_meter,
          nama_unit: response.data.unit_kerja.nama_unit
        };
        
        setUnitKerjaData(unitData);
        
        console.log('🏢 Unit kerja data set:', unitData);
        
        // Update user dengan data unit kerja yang benar
        setUser((prev: any) => ({
          ...prev,
          latitude: response.data.unit_kerja.latitude,
          longitude: response.data.unit_kerja.longitude,
          radius_meter: response.data.unit_kerja.radius_meter,
          unit_kerja: response.data.unit_kerja.nama_unit
        }));
        
        // Simpan ke AsyncStorage untuk konsistensi
        try {
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            const updatedUser = {
              ...parsedUser,
              latitude: response.data.unit_kerja.latitude,
              longitude: response.data.unit_kerja.longitude,
              radius_meter: response.data.unit_kerja.radius_meter,
              unit_kerja: response.data.unit_kerja.nama_unit
            };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (storageError) {
          console.log('Error updating user in storage:', storageError);
        }
      } else {
        console.log('⚠️ Tidak ada data unit_kerja dalam response');
      }
      
      if (response.data.data) {
        setTodayAttendance(response.data.data);
        if (!response.data.data.waktu_keluar) {
          setClockInStatus('Sudah Clock In');
        } else {
          setClockInStatus('Sudah Clock Out');
        }
      } else {
        setClockInStatus('Belum Clock In');
      }
    } catch (error: any) {
      console.log('Error checking attendance:', error.response?.data?.error || error.message);
      setClockInStatus('Belum Clock In');
    }
  };

  const openCamera = async (type: 'in' | 'out') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Izin Kamera Ditolak',
          'Izin kamera diperlukan untuk mengambil foto absensi.',
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const mediaTypeImages = ImagePicker.MediaTypeOptions?.Images ?? 'photo';
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: mediaTypeImages,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets[0].uri) {
        const fileUri = result.assets[0].uri;
        if (type === 'in') {
          setClockInPhoto(fileUri);
        } else {
          setClockOutPhoto(fileUri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal membuka kamera. Pastikan izin kamera sudah diberikan.');
      console.log('Camera error:', error);
    }
  };

  // Fungsi untuk menangani klik tombol Clock In
  const handleClockInButton = () => {
    if (clockInStatus !== 'Belum Clock In') return;
    
    if (locationStatus === 'out_of_radius') {
      Alert.alert(
        'Lokasi di Luar Radius',
        'Anda berada di luar radius unit kerja. Silakan datang ke lokasi yang ditentukan untuk melakukan Clock In.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    setShowClockInModal(true);
  };

  const handleClockIn = async () => {
    if (!clockInPhoto) {
      Alert.alert('Error', 'Harap mengambil foto terlebih dahulu');
      return;
    }

    setShowLoading(true);
    try {
      // Dapatkan lokasi
      const location = await getCurrentLocation();
      if (!location) {
        setShowLoading(false);
        Alert.alert(
          'Lokasi Tidak Terdeteksi',
          'Tidak dapat mendapatkan lokasi Anda. Pastikan GPS aktif dan memiliki sinyal yang baik.'
        );
        return;
      }

      // Kirim data sebagai FormData
      const formData = new FormData();
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);
      // Ambil nama file dari uri
      const fileName = clockInPhoto?.split('/').pop() || 'clockin.jpg';
      formData.append('foto_masuk', {
        uri: clockInPhoto,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      const response = await attendanceAPI.checkIn(formData);

      setShowClockInModal(false);
      setClockInStatus('Sudah Clock In');
      setClockInPhoto(null);
      Alert.alert('Success', 'Clock in berhasil!');
      checkTodayAttendance();
    } catch (error: any) {
      console.error('❌ Clock in error:', error);

      let errorMessage = 'Clock in gagal';

      if (error.isTimeout) {
        errorMessage = error.message;
      } else if (error.isNetworkError) {
        errorMessage = error.message;
      } else if (error.isBadRequest) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        // Error dari backend
        const backendError = error.response.data.error;

        if (backendError.includes('di luar radius')) {
          errorMessage = 'Anda berada di luar area unit kerja. Silakan datang ke lokasi yang ditentukan.';
        } else if (backendError.includes('Koordinat lokasi tidak terdeteksi')) {
          errorMessage = 'Lokasi tidak terdeteksi. Pastikan GPS aktif dan izin lokasi diberikan.';
        } else if (backendError.includes('Format koordinat tidak valid')) {
          errorMessage = 'Format lokasi tidak valid. Silakan coba lagi.';
        } else if (backendError.includes('belum memiliki koordinat')) {
          errorMessage = 'Unit kerja Anda belum dikonfigurasi. Hubungi HR.';
        } else if (backendError.includes('sudah check-in')) {
          errorMessage = 'Anda sudah melakukan clock in hari ini.';
        } else {
          errorMessage = backendError;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setShowLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!clockOutPhoto) {
      Alert.alert('Error', 'Harap mengambil foto terlebih dahulu');
      return;
    }

    setShowLoading(true);
    try {
      // Dapatkan lokasi
      const location = await getCurrentLocation();
      if (!location) {
        setShowLoading(false);
        Alert.alert(
          'Lokasi Tidak Terdeteksi',
          'Tidak dapat mendapatkan lokasi Anda. Pastikan GPS aktif dan memiliki sinyal yang baik.'
        );
        return;
      }

      // Kirim data sebagai FormData
      const formData = new FormData();
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);
      const fileName = clockOutPhoto?.split('/').pop() || 'clockout.jpg';
      formData.append('foto_keluar', {
        uri: clockOutPhoto,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      const response = await attendanceAPI.checkOut(formData);

      setShowClockOutModal(false);
      setClockInStatus('Sudah Clock Out');
      setClockOutPhoto(null);
      Alert.alert('Success', 'Clock out berhasil!');
      checkTodayAttendance();
    } catch (error: any) {
      console.error('❌ Clock out error:', error);

      let errorMessage = 'Clock out gagal';

      if (error.isTimeout) {
        errorMessage = error.message;
      } else if (error.isNetworkError) {
        errorMessage = error.message;
      } else if (error.isBadRequest) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        const backendError = error.response.data.error;

        if (backendError.includes('belum check-in')) {
          errorMessage = 'Anda belum melakukan clock in hari ini.';
        } else if (backendError.includes('sudah check-out')) {
          errorMessage = 'Anda sudah melakukan clock out hari ini.';
        } else {
          errorMessage = backendError;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setShowLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    navigation.replace('Login');
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours} . ${minutes} . ${seconds}`;
  };

  return (
    <>
      {/* Modal GPS Reminder */}
      <Modal
        visible={showGPSModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGPSModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 16, alignItems: 'center', width: 320 }}>
            <Ionicons name="location" size={48} color="#25a298" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
              GPS Belum Aktif
            </Text>
            <Text style={{ fontSize: 16, color: '#333', marginBottom: 16, textAlign: 'center' }}>
              Untuk absensi, silakan aktifkan GPS pada perangkat Anda dan coba lagi.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#25a298', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 }}
              onPress={() => setShowGPSModal(false)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Loading Indicator */}
      <Modal
        visible={showLoading}
        transparent
        animationType="fade"
        onRequestClose={() => { }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 16, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#25a298" />
            <Text style={{ marginTop: 16, fontSize: 16, color: '#333', fontWeight: 'bold' }}>Memproses absensi...</Text>
          </View>
        </View>
      </Modal>

      {/* Status Bar untuk iOS */}
      {Platform.OS === 'ios' && (
        <View style={styles.iosStatusBar} />
      )}

      {/* Status Bar untuk Android */}
      {Platform.OS === 'android' && (
        <RNStatusBar backgroundColor="#25a298" barStyle="light-content" />
      )}

      <SafeAreaView style={styles.safeArea}
        edges={
          Platform.OS === 'ios'
            ? ['left', 'right', 'bottom']
            : ['top', 'left', 'right', 'bottom']
        }>

        <View className='flex-1 bg-white'>
          <View className="flex-row items-center justify-between px-6 bg-primary rounded-b-3xl shadow-lg">
            <Image
              source={require('../../assets/logo.png')}
              className="w-32 h-20"
              resizeMode="contain"
              style={{ marginRight: 8 }}
            />
            <TouchableOpacity
              className="items-center justify-center"
              onPress={() => setShowMenu(true)}
              style={{ width: 40, height: 40 }}
            >
              <Ionicons
                name="menu"
                size={42}
                color="white"
              />
            </TouchableOpacity>
          </View>

          <View className="flex-1 bg-white p-6 content-center">
            {/* Header dengan informasi karyawan */}
            <View className="mb-6">
              {/* Tombol menu di pojok kanan atas */}
              <View className="mb-4">
                <Text className="text-xl font-bold text-gray-800">{user?.nama || 'Bangun Chaerudin Anwar'}</Text>
                <Text className="text-gray-600">{user?.nik || '52510.3138'}</Text>
                <Text className="text-gray-600">{user?.jabatan || 'Staff Of Programmer'}</Text>
              </View>

              {/* Garis pemisah setelah Staff Of Programmer */}
              <View className="border-t border-gray-200 pt-4 mb-4">
                <Text className="text-lg font-semibold mb-2 text-primary">Informasi Karyawan</Text>
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-gray-600">Departemen:</Text>
                    <Text className="text-gray-600">Divisi:</Text>
                    <Text className="text-gray-600">Lokasi Kerja:</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-800 font-medium">{user?.departemen || '-'}</Text>
                    <Text className="text-gray-800 font-medium">{user?.divisi || '-'}</Text>
                    <Text className="text-gray-800 font-medium">{user?.unit_kerja || '-' }</Text>
                  </View>
                </View>
              </View>

              {/* Garis pemisah setelah Informasi Karyawan */}
              <View className="border-t border-gray-200 pt-4 mb-4">
                <Text className="text-lg font-semibold mb-2 text-center">{formatDate(currentTime)}</Text>
                <Text className="text-3xl font-bold text-gray-800 mb-4 text-center">{formatTime(currentTime)}</Text>

                <View className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
                  <Text className="text-center text-yellow-800 font-medium">
                    {locationStatus === 'granted'
                      ? '📍 Lokasi terdeteksi - Siap untuk absensi'
                      : locationStatus === 'denied'
                        ? '📍 Izin lokasi ditolak - Buka pengaturan untuk mengaktifkan'
                        : locationStatus === 'gps_off'
                          ? '📍 GPS tidak aktif - Silakan aktifkan GPS'
                          : locationStatus === 'out_of_radius'
                            ? '📍 Lokasi di luar radius' // REVISI: tanpa nama unit kerja
                            : locationStatus === 'error'
                              ? '📍 Error deteksi lokasi - Coba lagi'
                              : '📍 Mendeteksi lokasi...'
                    }
                  </Text>
                </View>
              </View>

              {/* Garis pemisah setelah waktu dan lokasi */}
              <View className="border-t border-gray-200 pt-4">
                <Text className="text-lg font-semibold mb-2 text-center">Status: {clockInStatus}</Text>

                {/* Container untuk tombol dengan spacing yang konsisten */}
                <View className="space-y-3">
                  {/* REVISI: Tombol Clock In selalu aktif (warna primary) */}
                  <TouchableOpacity
                    className={`rounded-lg py-4 ${clockInStatus === 'Belum Clock In' ? 'bg-primary' : 'bg-gray-400'}`}
                    onPress={handleClockInButton}
                    disabled={clockInStatus !== 'Belum Clock In'}
                  >
                    <Text className="text-white text-center font-semibold text-lg">
                      Clock In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`rounded-lg py-4 ${clockInStatus === 'Sudah Clock In' ? 'bg-primary' : 'bg-gray-400'}`}
                    onPress={() => clockInStatus === 'Sudah Clock In' && setShowClockOutModal(true)}
                    disabled={clockInStatus !== 'Sudah Clock In'}
                  >
                    <Text className="text-white text-center font-semibold text-lg">
                      Clock Out
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-white rounded-lg py-3 border border-gray-300"
                    onPress={handleLogout}
                  >
                    <Text className="text-red-500 text-center font-semibold text-lg">
                      Logout
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Modal Menu */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
      >
        <SafeAreaView className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-white rounded-2xl p-8 w-80 shadow-2xl">
            {/* Header Modal */}
            <View className="items-center mb-6">
              <View className="bg-primary w-16 h-16 rounded-full items-center justify-center mb-3">
                <Text className="text-2xl">📋</Text>
              </View>
              <Text className="text-2xl font-bold text-black">Menu</Text>
              <Text className="text-primary text-center mt-2">Pilih menu yang diinginkan</Text>
            </View>

            {/* Garis pemisah dekoratif */}
            <View className="border-t border-primary mb-6"></View>

            {/* Tombol Menu */}
            <View className="space-y-4">
              <TouchableOpacity
                className="bg-white border border-primary rounded-xl py-5 px-4"
                onPress={() => {
                  setShowMenu(false);
                  setTimeout(() => {
                    navigation.navigate('Attendance');
                  }, 100);
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="bg-primary w-10 h-10 rounded-lg items-center justify-center mr-3">
                      <Text className="text-white font-bold text-lg">📊</Text>
                    </View>
                    <View>
                      <Text className="text-black font-semibold text-lg">
                        Riwayat Absensi
                      </Text>
                      <Text className="text-primary text-sm">
                        Lihat history kehadiran
                      </Text>
                    </View>
                  </View>
                  <Text className="text-primary text-xl">›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white border border-primary rounded-xl py-5 px-4"
                onPress={() => {
                  setShowMenu(false);
                  setTimeout(() => {
                    navigation.navigate('Leave');
                  }, 100);
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="bg-primary w-10 h-10 rounded-lg items-center justify-center mr-3">
                      <Text className="text-white font-bold text-lg">📝</Text>
                    </View>
                    <View>
                      <Text className="text-black font-semibold text-lg">
                        Pengajuan Izin
                      </Text>
                      <Text className="text-primary text-sm">
                        Ajukan cuti atau izin
                      </Text>
                    </View>
                  </View>
                  <Text className="text-primary text-xl">›</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Garis pemisah sebelum tombol tutup */}
            <View className="border-t border-primary my-6"></View>

            {/* Tombol Tutup */}
            <TouchableOpacity
              className="bg-primary border border-gray-200 rounded-xl py-4"
              onPress={() => setShowMenu(false)}
            >
              <Text className="text-white text-center font-semibold text-lg">
                Tutup Menu
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Konfirmasi Clock In */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showClockInModal}
        onRequestClose={() => setShowClockInModal(false)}
      >
        <SafeAreaView className="flex-1 justify-center items-center bg-black/70">
          <View className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            {/* Header Modal */}
            <View className="items-center mb-4">
              <View className="bg-green-100 w-16 h-16 rounded-full items-center justify-center mb-3">
                <Text className="text-2xl">📸</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-800">Konfirmasi Clock In</Text>
              <Text className="text-gray-500 text-center mt-2">Pastikan data absensi sudah benar</Text>
            </View>

            {/* Informasi Absensi */}
            <View className="space-y-3 mb-6">
              <View className="flex-row justify-between items-center bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 font-medium">Lokasi Kerja:</Text>
                <Text className="text-gray-800 font-semibold">{user?.unit_kerja || '-'}</Text>
              </View>

              <View className="flex-row justify-between items-center bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 font-medium">Jam Clock In:</Text>
                <Text className="text-gray-800 font-semibold">{formatTime(new Date())}</Text>
              </View>
            </View>

            {/* Area Foto */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-3 text-center">Foto Clock In</Text>
              <View className="border-2 border-dashed border-gray-300 rounded-xl h-40 items-center justify-center bg-gray-50">
                {clockInPhoto ? (
                  <Image
                    source={{ uri: clockInPhoto }}
                    className="w-full h-full rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-gray-400 text-center">
                    📷{'\n'}Ambil Foto untuk{'\n'}Clock In
                  </Text>
                )}
              </View>
              <TouchableOpacity
                className="bg-primary rounded-lg py-3 mt-3"
                onPress={() => openCamera('in')}
              >
                <Text className="text-white text-center font-semibold">
                  {clockInPhoto ? 'Ambil Ulang Foto' : 'Buka Kamera'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tombol Aksi */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-3"
                onPress={() => {
                  setShowClockInModal(false);
                  setClockInPhoto(null);
                }}
              >
                <Text className="text-gray-700 text-center font-semibold">
                  Batal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-green-500 rounded-xl py-3"
                onPress={handleClockIn}
                disabled={!clockInPhoto}
                style={{ opacity: clockInPhoto ? 1 : 0.5 }}
              >
                <Text className="text-white text-center font-semibold">
                  Konfirmasi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Konfirmasi Clock Out */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showClockOutModal}
        onRequestClose={() => setShowClockOutModal(false)}
      >
        <SafeAreaView className="flex-1 justify-center items-center bg-black/70">
          <View className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            {/* Header Modal */}
            <View className="items-center mb-4">
              <View className="bg-blue-100 w-16 h-16 rounded-full items-center justify-center mb-3">
                <Text className="text-2xl">📸</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-800">Konfirmasi Clock Out</Text>
              <Text className="text-gray-500 text-center mt-2">Pastikan data absensi sudah benar</Text>
            </View>

            {/* Informasi Absensi */}
            <View className="space-y-3 mb-6">
              <View className="flex-row justify-between items-center bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 font-medium">Lokasi Kerja:</Text>
                <Text className="text-gray-800 font-semibold">{user?.unit_kerja || '-'}</Text>
              </View>

              <View className="flex-row justify-between items-center bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 font-medium">Jam Clock Out:</Text>
                <Text className="text-gray-800 font-semibold">{formatTime(new Date())}</Text>
              </View>
            </View>

            {/* Area Foto */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-3 text-center">Foto Clock Out</Text>
              <View className="border-2 border-dashed border-gray-300 rounded-xl h-40 items-center justify-center bg-gray-50">
                {clockOutPhoto ? (
                  <Image
                    source={{ uri: clockOutPhoto }}
                    className="w-full h-full rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-gray-400 text-center">
                    📷{'\n'}Ambil Foto untuk{'\n'}Clock Out
                  </Text>
                )}
              </View>
              <TouchableOpacity
                className="bg-primary rounded-lg py-3 mt-3"
                onPress={() => openCamera('out')}
              >
                <Text className="text-white text-center font-semibold">
                  {clockOutPhoto ? 'Ambil Ulang Foto' : 'Buka Kamera'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tombol Aksi */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-3"
                onPress={() => {
                  setShowClockOutModal(false);
                  setClockOutPhoto(null);
                }}
              >
                <Text className="text-gray-700 text-center font-semibold">
                  Batal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-blue-500 rounded-xl py-3"
                onPress={handleClockOut}
                disabled={!clockOutPhoto}
                style={{ opacity: clockOutPhoto ? 1 : 0.5 }}
              >
                <Text className="text-white text-center font-semibold">
                  Konfirmasi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  )
}
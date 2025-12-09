import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let API_BASE_URL;

if (Platform.OS === 'web') {
  API_BASE_URL = 'http://localhost:5000/api';
} else {
  // Default IP - bisa diubah via settings
  API_BASE_URL = 'http://192.168.100.9:5000/api';
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // PERBAIKAN: 60 detik untuk upload foto
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

const initializeApi = async () => {
  if (Platform.OS === 'web') return;

  try {
    const manualIP = await AsyncStorage.getItem('manual_server_ip');
    if (manualIP) {
      const newBaseURL = `http://${manualIP}:5000/api`;
      api.defaults.baseURL = newBaseURL;
      console.log('✅ Server IP diubah ke:', newBaseURL);
    }
  } catch (error) {
    console.log('❌ Gagal load manual IP:', error);
  }
};

initializeApi();

export const updateServerIP = async (ipAddress) => {
  try {
    await AsyncStorage.setItem('manual_server_ip', ipAddress);
    const newBaseURL = `http://${ipAddress}:5000/api`;
    api.defaults.baseURL = newBaseURL;
    console.log('✅ Server IP diperbarui:', newBaseURL);
    return true;
  } catch (error) {
    console.log('❌ Gagal update server IP:', error);
    return false;
  }
};

// Interceptor Request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Log request untuk debugging
      console.log('📤 Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        data: config.data ? (config.data instanceof FormData ? '[FormData]' : config.data) : null,
        timeout: config.timeout
      });
      
    } catch (error) {
      console.log('❌ Error request interceptor:', error);
    }
    return config;
  },
  (error) => {
    console.log('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor Response dengan retry logic
api.interceptors.response.use(
  (response) => {
    console.log('📥 Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.log('❌ API Error Detail:', {
      message: error.message,
      code: error.code,
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      data: error.response?.data,
      timeout: error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NO'
    });
    
    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        message: 'Koneksi timeout. Periksa koneksi internet Anda.',
        isTimeout: true
      });
    }
    
    // Handle network error
    if (!error.response) {
      return Promise.reject({
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet atau IP server.',
        isNetworkError: true
      });
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log('🔒 Token expired, clearing storage...');
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      } catch (storageError) {
        console.log('Error clearing storage:', storageError);
      }
      
      return Promise.reject({
        message: 'Sesi telah berakhir. Silakan login kembali.',
        isUnauthorized: true
      });
    }
    
    // Handle 400 Bad Request (misal: di luar radius)
    if (error.response?.status === 400) {
      const backendError = error.response?.data?.error || 'Permintaan tidak valid';
      return Promise.reject({
        message: backendError,
        isBadRequest: true,
        backendError: backendError
      });
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      return Promise.reject({
        message: 'Akses ditolak. Anda tidak memiliki izin.',
        isForbidden: true
      });
    }
    
    // Default error
    return Promise.reject({
      message: error.response?.data?.error || 'Terjadi kesalahan pada server',
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', { ...credentials, login_type: 'mobile' }),
  getProfile: () => api.get('/auth/me'),
};

export const attendanceAPI = {
  checkIn: (data) => {
    console.log('📸 Uploading check-in data...');
    if (data instanceof FormData) {
      return api.post('/attendance/checkin', data, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        timeout: 90000, // 90 detik khusus untuk upload foto
      });
    }
    return api.post('/attendance/checkin', data);
  },
  
  checkOut: (data) => {
    console.log('📸 Uploading check-out data...');
    if (data instanceof FormData) {
      return api.post('/attendance/checkout', data, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        timeout: 90000, // 90 detik khusus untuk upload foto
      });
    }
    return api.post('/attendance/checkout', data);
  },
  
  getToday: () => {
    console.log('🔄 Fetching today attendance...');
    return api.get('/attendance/today');
  },
  
  getHistory: (startDate, endDate) => {
    console.log('📊 Fetching attendance history...');
    return api.get(`/attendance/history?startDate=${startDate}&endDate=${endDate}`);
  },
  
  // Tambahan: Get unit kerja info
  getUnitInfo: (unitId) => {
    console.log('🏢 Fetching unit kerja info...');
    return api.get(`/attendance/unit-info/${unitId}`);
  }
};

export const leaveAPI = {
  apply: (data) => api.post('/leave/apply', data),
  getMyLeaves: () => api.get('/leave/my-leaves'),
};

// Tambahan: API untuk update lokasi unit kerja (jika diperlukan)
export const unitAPI = {
  getMyUnit: () => api.get('/unit/my-unit'),
  updateLocation: (data) => api.post('/unit/update-location', data),
};

export default api;
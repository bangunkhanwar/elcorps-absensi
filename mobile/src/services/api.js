import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let API_BASE_URL;

if (Platform.OS === 'web') {
  API_BASE_URL = 'http://localhost:5000/api';
} else {
  API_BASE_URL = 'http://192.168.100.9:5000/api';
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

const initializeApi = async () => {
  if (Platform.OS === 'web') return;

  try {
    const manualIP = await AsyncStorage.getItem('manual_server_ip');
    if (manualIP) {
      api.defaults.baseURL = `http://${manualIP}:5000/api`;
      console.log('✅ Using manual IP:', manualIP);
    }
  } catch (error) {
    console.log('❌ Failed to load manual IP:', error);
  }
};

initializeApi();

export const updateServerIP = async (ipAddress) => {
  try {
    await AsyncStorage.setItem('manual_server_ip', ipAddress);
    api.defaults.baseURL = `http://${ipAddress}:5000/api`;
    console.log('✅ Server IP updated to:', ipAddress);
    return true;
  } catch (error) {
    console.log('❌ Failed to update server IP:', error);
    return false;
  }
};

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('❌ API Error:', {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status
    });
    
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('token');
      AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', { ...credentials, login_type: 'mobile' }),
  getProfile: () => api.get('/auth/me'),
};

export const attendanceAPI = {
  checkIn: (data) => {
    if (data instanceof FormData) {
      return api.post('/attendance/checkin', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/attendance/checkin', data);
  },
  checkOut: (data) => {
    if (data instanceof FormData) {
      return api.post('/attendance/checkout', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/attendance/checkout', data);
  },
  getToday: () => api.get('/attendance/today'),
  getHistory: (startDate, endDate) => 
    api.get(`/attendance/history?startDate=${startDate}&endDate=${endDate}`),
};

export const leaveAPI = {
  apply: (data) => api.post('/leave/apply', data),
  getMyLeaves: () => api.get('/leave/my-leaves'),
};

export default api;
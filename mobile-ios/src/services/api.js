import axios from 'axios';

// Prioritize manual IP from localStorage if exists
const getInitialBaseURL = () => {
  // const manualIP = localStorage.getItem('manual_server_ip');
  const manualIP = 'elsa.elhijab.com';
  if (manualIP) return `https://${manualIP}/api`;
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getInitialBaseURL(),
  timeout: 15000, // 15 seconds is better for mobile UX than 60s
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
});

// Update server IP at runtime
export const updateServerIP = async (ipAddress) => {
  try {
    localStorage.setItem('manual_server_ip', ipAddress);
    const newBaseURL = `http://${ipAddress}:5000/api`;
    api.defaults.baseURL = newBaseURL;
    console.log('✅ Server IP updated:', newBaseURL);
    return true;
  } catch (error) {
    console.error('❌ Failed to update server IP:', error);
    return false;
  }
};

// Request Interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized Error & Data Handling
api.interceptors.response.use(
  (response) => response.data, // Directly return data property
  async (error) => {
    const { response } = error;
    
    // 1. Handle 401 Unauthorized (Auto Logout)
    if (response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('Sesi berakhir. Silakan login kembali.'));
    }
    
    // 2. Handle 400 Bad Request (e.g. Zod Validation)
    if (response?.status === 400) {
      const data = response.data;
      if (data.details && typeof data.details === 'object') {
        const firstErrorField = Object.keys(data.details).find(k => k !== '_errors');
        const message = data.details[firstErrorField]?._errors?.[0] || 'Data tidak valid';
        return Promise.reject(new Error(message));
      }
      return Promise.reject(new Error(data.error || 'Permintaan tidak valid'));
    }
    
    // 3. Network / Timeout / Server Error
    const errorMessage = response?.data?.error || error.message || 'Terjadi kesalahan pada server';
    return Promise.reject(new Error(errorMessage));
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', { ...credentials, login_type: 'mobile' }),
  getProfile: () => api.get('/auth/me'),
};

export const attendanceAPI = {
  checkIn: (formData) => api.post('/attendance/checkin', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  checkOut: (formData) => api.post('/attendance/checkout', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getToday: (queryString = '') => api.get(`/attendance/today${queryString}`),
  getServerTime: () => api.get('/attendance/server-time'),
  getUserAttendance: (userId, params) => api.get('/attendance/history', { params }),
};

export const leaveAPI = {
  apply: (formData) => api.post('/leave/apply', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyLeaves: () => api.get('/leave/my-leaves'),
  upload: (formData) => api.post('/leave/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export default api;

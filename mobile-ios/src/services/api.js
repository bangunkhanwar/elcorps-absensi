import axios from 'axios';

// Prioritize manual IP from localStorage if exists
const getInitialBaseURL = () => {
  const manualIP = 'sb32k63z-5000.asse.devtunnels.ms';
  // const manualIP = 'elsa.elhijab.com';
  if (manualIP) return `https://${manualIP}/api`;
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getInitialBaseURL(),
  timeout: 60000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Fungsi untuk mengubah server IP
export const updateServerIP = async (ipAddress) => {
  try {
    localStorage.setItem('manual_server_ip', ipAddress);
    const newBaseURL = `http://${ipAddress}:5000/api`;
    api.defaults.baseURL = newBaseURL;
    console.log('✅ Server IP diperbarui:', newBaseURL);
    return true;
  } catch (error) {
    console.log('❌ Gagal update server IP:', error);
    return false;
  }
};

export const checkServerHealth = async (ip = null) => {
  const baseURL = ip ? `http://${ip}:5000` : api.defaults.baseURL.replace('/api', '');
  try {
    const response = await axios.get(`${baseURL}/api/health`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const systemAPI = {
  health: () => api.get('/health'),
  getConfig: () => api.get('/config'),
};

// Interceptor Request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      console.log('📤 Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
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

// Interceptor Response
api.interceptors.response.use(
  (response) => {
    console.log('📥 Response Data:', response.data);
    console.log('📥 Response:', {
      status: response.status,
      url: response.config.url
    });
    return response.data;
  },
  
  async (error) => {
    const originalRequest = error.config;
    
    console.log('❌ API Error Detail:', {
      message: error.message,
      code: error.code,
      url: originalRequest?.url,
      status: error.response?.status
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } catch (storageError) {
        console.log('Error clearing storage:', storageError);
      }
      
      return Promise.reject({
        message: 'Sesi telah berakhir. Silakan login kembali.',
        isUnauthorized: true
      });
    }
    
    // Handle 400 Bad Request
    if (error.response?.status === 400) {
      const backendError = error.response?.data?.error || 'Permintaan tidak valid';
      return Promise.reject({
        message: backendError,
        isBadRequest: true
      });
    }
    
    // Default error
    return Promise.reject({
      message: error.response?.data?.error || 'Terjadi kesalahan pada server',
      status: error.response?.status
    });
  }
);

// API endpoints untuk auth
export const authAPI = {
  login: (credentials) => api.post('/auth/login', { 
    ...credentials, 
    login_type: 'mobile' 
  }),
  getProfile: () => api.get('/auth/me'),
};

// API endpoints untuk attendance
export const attendanceAPI = {
  checkIn: (data) => {
    console.log('📸 Uploading check-in data...');
    // Untuk PWA, kita akan menggunakan FormData untuk upload
    if (data instanceof FormData) {
      return api.post('/attendance/checkin', data, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        timeout: 90000,
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
        timeout: 90000,
      });
    }
    return api.post('/attendance/checkout', data);
  },
  
  getToday: (params = '') => {
    console.log('🔄 Fetching today attendance...');
    if (typeof params === 'string' && params.startsWith('?')) {
      return api.get(`/attendance/today${params}`);
    }
    return api.get('/attendance/today', { params });
  },
  
  getHistory: (params) => {
    console.log('📊 Fetching attendance history...');
    return api.get('/attendance/history', { params });
  },
  
  getUserAttendance: (userId, params) => {
    return api.get(`/attendance/user/${userId}`, { params });
  },
  
  getServerTime: () => {
    return api.get('/attendance/server-time');
  }
};
// API endpoints untuk leave
export const leaveAPI = {
  apply: (data) => api.post('/leave/apply', data),
  getMyLeaves: () => api.get('/leave/my-leaves'),
  getTeamApprovals: () => api.get('/leave/team-approval'),
  action: (data) => api.post('/leave/action', data),
  getBalance: () => api.get('/leave/balance'),
  upload: (formData) => api.post('/leave/upload', formData, {
    headers: { 
      'Content-Type': 'multipart/form-data'
    }
  })
};

export const getMediaUrl = (path) => {
  if (!path || path === '{}' || typeof path !== 'string') return null;

  let mediaPath = path;

  // Handle if path is already a full URL
  if (path.startsWith('http')) {
    try {
      const url = new URL(path);
      const uploadsPrefix = '/uploads/leave/';
      const idx = url.pathname.indexOf(uploadsPrefix);

      if (idx !== -1) {
        mediaPath = url.pathname.slice(idx + 1); // remove leading slash for join below
      } else {
        const pathParts = url.pathname.split('/').filter(Boolean);
        mediaPath = pathParts.slice(-3).join('/');
      }
    } catch (e) {
      // Not a valid URL, treat as filename
    }
  }

  const cleanedPath = mediaPath.replace(/^\/+/, '');
  if (cleanedPath.startsWith('uploads/leave/')) {
    return `${api.defaults.baseURL.replace('/api', '')}/${cleanedPath}`;
  }

  if (cleanedPath.includes('/')) {
    return `${api.defaults.baseURL.replace('/api', '')}/uploads/leave/${cleanedPath}`;
  }

  const baseUrl = api.defaults.baseURL.replace('/api', '');
  return `${baseUrl}/uploads/leave/${cleanedPath}`;
};

// API endpoints untuk notifications
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  getVapidKey: () => api.get('/notifications/vapid-key'),
  subscribe: (subscription) => api.post('/notifications/subscribe', subscription),
};

// API endpoints untuk overtime
export const overtimeAPI = {
  apply: (data) => api.post('/overtime/apply', data),
  getMyOvertime: () => api.get('/overtime/my-overtime'),
  getTeamApprovals: () => api.get('/overtime/team-approval'),
  action: (data) => api.post('/overtime/action', data),
  getDayOffBalance: () => api.get('/overtime/day-off-balance'),
  claimDayOff: (data) => api.post('/overtime/claim-day-off', data),
};

export default api;
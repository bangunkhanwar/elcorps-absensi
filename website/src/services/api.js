import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor untuk menambahkan token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor untuk handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authAPI = {
  login: (credentials) => api.post('/auth/login', { ...credentials, login_type: 'website' }),
  getProfile: () => api.get('/auth/me'),
  register: (userData) => api.post('/auth/register', userData),
  getAllUsers: () => api.get('/auth/users'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  getEmployeesByUnit: (unitId) => api.get(`/auth/unit/${unitId}/employees`),
  getUnitKerjaByNama: (namaUnit) => api.get(`/auth/unit-kerja/nama/${namaUnit}`),
  getAllUnitKerja: () => api.get('/auth/unit-kerja'),
  getStoreLeaders: () => api.get('/auth/store-leaders'),
  getLeaderPrivileges: (leaderId) => api.get(`/auth/store-leaders/${leaderId}/privileges`),
  updateLeaderPrivileges: (leaderId, privileges) => 
    api.put(`/auth/store-leaders/${leaderId}/privileges`, { privileges }),
  getStoreEmployees: (unitId) => api.get(`/auth/unit/${unitId}/store-employees`),
  // Tambahkan fungsi baru untuk update massal shift
  updateAllEmployeesShift: (unitId, shiftId) => 
    api.put(`/auth/unit/${unitId}/update-all-shifts`, { shift_id: shiftId }),
};

// Attendance services
export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/checkin', data),
  checkOut: (data) => api.post('/attendance/checkout', data),
  getToday: () => api.get('/attendance/today'),
  getHistory: (startDate, endDate) => 
    api.get(`/attendance/history?startDate=${startDate}&endDate=${endDate}`),
  getAll: (startDate, endDate) => 
    api.get(`/attendance/all?startDate=${startDate}&endDate=${endDate}`),
  getTodayAll: () => api.get('/attendance/today-all'),
  getStoreStats: (unitId) => api.get(`/attendance/store/${unitId}/stats`),
};

// Leave services
export const leaveAPI = {
  apply: (data) => api.post('/leave/apply', data),
  getMyLeaves: () => api.get('/leave/my-leaves'),
  getAllLeaves: () => api.get('/leave/all'),
  getPendingLeaves: () => api.get('/leave/pending'),
  updateStatus: (id, status) => api.patch(`/leave/${id}/status`, { status }),
};

// Shift services
export const shiftAPI = {
  getShiftsByUnit: (unitId) => api.get(`/shifts/unit/${unitId}`),
  updateEmployeeShift: (employeeId, shiftId) => 
    api.put(`/auth/employees/${employeeId}/shift`, { shift_id: shiftId }),
  createShift: (data) => api.post('/shifts', data),
  updateShift: (id, data) => api.put(`/shifts/${id}`, data),
  deleteShift: (id) => api.delete(`/shifts/${id}`),
};

// Settings services
export const settingsAPI = {
  getUnitKerja: () => api.get('/unit-kerja'),
  createUnitKerja: (data) => api.post('/unit-kerja', data),
  updateUnitKerja: (id, data) => api.put(`/unit-kerja/${id}`, data),
  getShifts: () => api.get('/shifts'),
  createShift: (data) => api.post('/shifts', data),
  updateShift: (id, data) => api.put(`/shifts/${id}`, data),
};

export const reportsAPI = {
  getMonthlyReport: (month, unitId) => 
    api.get('/reports/monthly', { 
      params: { 
        month, 
        unit_kerja_id: unitId !== 'all' ? unitId : undefined 
      } 
    }),
  exportMonthlyReport: (month, unitId) =>
    api.get('/reports/monthly/export', {
      params: {
        month,
        unit_kerja_id: unitId !== 'all' ? unitId : undefined
      },
      responseType: 'blob'
    })
}

export default api;
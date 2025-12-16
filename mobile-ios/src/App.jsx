import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import LeaveScreen from './screens/LeaveScreen';
import HistoryLeaveScreen from './screens/HistoryLeaveScreen';
import SettingScreen from './screens/SettingScreen';
import PrivateRoute from './components/PrivateRoute';

function App() {
  useEffect(() => {
    // Register service worker untuk PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
          console.log('Service Worker registration failed:', error);
        });
      });
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginScreen />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <PrivateRoute>
            <HomeScreen />
          </PrivateRoute>
        } />
        
        <Route path="/attendance" element={
          <PrivateRoute>
            <AttendanceScreen />
          </PrivateRoute>
        } />
        
        <Route path="/leave" element={
          <PrivateRoute>
            <LeaveScreen />
          </PrivateRoute>
        } />
        
        <Route path="/history-leave" element={
          <PrivateRoute>
            <HistoryLeaveScreen />
          </PrivateRoute>
        } />
        
        <Route path="/settings" element={
          <PrivateRoute>
            <SettingScreen />
          </PrivateRoute>
        } />
        
        {/* Tambahkan rute untuk link di LoginScreen */}
        <Route path="/forgot-password" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Lupa Password</h1>
              <p className="text-gray-600 mb-6">Fitur ini sedang dalam pengembangan.</p>
              <button 
                onClick={() => window.history.back()}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                ← Kembali ke Login
              </button>
            </div>
          </div>
        } />
        
        <Route path="/server-settings" element={<Navigate to="/settings" replace />} />
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
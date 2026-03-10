import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import LeaveScreen from './screens/LeaveScreen';
import HistoryLeaveScreen from './screens/HistoryLeaveScreen';
import NotificationScreen from './screens/NotificationScreen';
import PrivateRoute from './components/PrivateRoute';

function App() {
  useEffect(() => {
    // Register service worker untuk PWA (Web Push)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
          console.log('✅ Service Worker registered:', reg.scope);
        }).catch(error => {
          console.log('❌ Service Worker registration failed:', error);
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
        
        <Route path="/notifications" element={
          <PrivateRoute>
            <NotificationScreen />
          </PrivateRoute>
        } />

        
        {/* Tambahkan rute untuk link di LoginScreen */}
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        

        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
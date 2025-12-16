import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
        try {
        const token = localStorage.getItem('token');
        console.log('🔍 PrivateRoute - Token dari localStorage:', token);
        
        if (!token) {
            console.log('❌ PrivateRoute - Token tidak ditemukan');
            setIsAuthenticated(false);
            return;
        }
        
        // Token valid jika panjangnya > 10 karakter
        if (token.length > 10) {
            console.log('✅ PrivateRoute - Token valid, mengizinkan akses');
            setIsAuthenticated(true);
        } else {
            console.log('❌ PrivateRoute - Token tidak valid (terlalu pendek)');
            setIsAuthenticated(false);
        }
        } catch (error) {
        console.error('PrivateRoute error:', error);
        setIsAuthenticated(false);
        } finally {
        setLoading(false);
        }
    };
    
    checkAuth();
    }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memeriksa otentikasi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('PrivateRoute - Redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('PrivateRoute - Rendering protected content');
  return children;
};

export default PrivateRoute;
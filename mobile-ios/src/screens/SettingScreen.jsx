import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Server, Info, Wrench, Wifi, Shield, RefreshCw } from 'lucide-react';
import { updateServerIP } from '../services/api';

const SettingScreen = () => {
  const navigate = useNavigate();
  
  const [ipAddress, setIpAddress] = useState('');
  const [currentIP, setCurrentIP] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Get current server IP from localStorage or API base URL
    const savedIP = localStorage.getItem('manual_server_ip');
    if (savedIP) {
      setCurrentIP(savedIP);
      setIpAddress(savedIP);
    }
    
    // Get current API base URL
    const apiBaseURL = localStorage.getItem('api_base_url') || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    console.log('Current API Base URL:', apiBaseURL);
  }, []);

  const handleSaveIP = async () => {
    if (!ipAddress) {
      alert('Harap masukkan alamat IP server');
      return;
    }

    // Validasi format IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      alert('Harap masukkan alamat IP yang valid (contoh: 192.168.1.100)');
      return;
    }

    setLoading(true);
    try {
      const success = await updateServerIP(ipAddress);
      if (success) {
        setCurrentIP(ipAddress);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        // Simpan ke localStorage
        localStorage.setItem('manual_server_ip', ipAddress);
        localStorage.setItem('api_base_url', `http://${ipAddress}:5000/api`);
        
        // Reset form setelah beberapa detik
        setTimeout(() => {
          setIpAddress('');
        }, 2000);
      } else {
        alert('Gagal mengupdate alamat IP server');
      }
    } catch (error) {
      console.error('Error saving IP:', error);
      alert('Terjadi kesalahan saat menyimpan IP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = () => {
    setIpAddress('');
    localStorage.removeItem('manual_server_ip');
    localStorage.setItem('api_base_url', import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
    setCurrentIP('');
    alert('IP server telah direset ke default (localhost)');
  };

  const handleTestConnection = async () => {
    const testIP = ipAddress || currentIP || 'localhost';
    setLoading(true);
    
    try {
      const response = await fetch(`http://${testIP}:5000/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        alert(`✅ Koneksi berhasil ke ${testIP}:5000\nServer siap digunakan!`);
      } else {
        alert(`⚠️ Server merespons dengan status: ${response.status}\nPeriksa apakah backend berjalan.`);
      }
    } catch (error) {
      alert(`❌ Tidak dapat terhubung ke ${testIP}:5000\nPastikan:\n1. Backend berjalan\n2. Port 5000 terbuka\n3. IP benar`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-primary rounded-b-3xl shadow-lg">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-4 hover:bg-white/30 transition"
            >
              <ArrowLeft className="text-white" size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Konfigurasi Server</h1>
              <p className="text-white/80 text-sm mt-1">
                Atur alamat IP server backend Anda
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Success Message */}
        {showSuccess && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="font-semibold">IP server berhasil diperbarui!</span>
            </div>
          </div>
        )}

        {/* Current IP Info */}
        {currentIP && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mr-3">
                  <Wifi className="text-emerald-600" size={20} />
                </div>
                <div>
                  <p className="text-emerald-800 font-semibold">IP Server Saat Ini</p>
                  <p className="text-emerald-900 font-bold text-lg">{currentIP}</p>
                </div>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Wifi size={16} />
                    <span>Test Koneksi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* IP Input Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
              <Server className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Alamat IP Server</h2>
              <p className="text-gray-500 text-sm">Masukkan alamat IP komputer Anda</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                IP Address
              </label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 bg-gray-50 focus:ring-2 focus:ring-primary outline-none transition"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSaveIP}
                disabled={loading || !ipAddress}
                className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center space-x-2 ${
                  ipAddress && !loading
                    ? 'bg-primary hover:bg-primary-dark text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Server size={20} />
                    <span>Simpan IP Server</span>
                  </>
                )}
              </button>

              <button
                onClick={handleResetToDefault}
                className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center"
              >
                <RefreshCw size={18} className="mr-2" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* How to Find IP */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center mb-4">
            <Info className="text-blue-600 mr-3" size={24} />
            <h3 className="text-blue-800 font-bold text-lg">Cara Menemukan IP Komputer</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white/80 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center mr-2 text-sm">1</span>
                Windows
              </h4>
              <p className="text-gray-700 text-sm ml-8">
                Buka <span className="font-mono bg-gray-100 px-2 py-1 rounded">CMD</span> → ketik <span className="font-mono bg-gray-100 px-2 py-1 rounded">ipconfig</span> → cari <span className="font-semibold text-blue-600">"IPv4 Address"</span>
              </p>
            </div>

            <div className="bg-white/80 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center mr-2 text-sm">2</span>
                MacOS / Linux
              </h4>
              <p className="text-gray-700 text-sm ml-8">
                Buka <span className="font-mono bg-gray-100 px-2 py-1 rounded">Terminal</span> → ketik <span className="font-mono bg-gray-100 px-2 py-1 rounded">ifconfig</span> → cari <span className="font-semibold text-blue-600">"inet"</span> (bukan 127.0.0.1)
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start">
                <Shield className="text-yellow-600 mr-2 mt-0.5" size={18} />
                <div>
                  <p className="text-yellow-800 font-semibold">Penting!</p>
                  <p className="text-yellow-700 text-sm">
                    Kedua perangkat harus berada di jaringan WiFi yang sama
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Server Info */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-300">
          <h3 className="text-gray-800 font-bold text-lg mb-4">Informasi Server</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4">
              <p className="text-gray-600 text-sm">Port Backend</p>
              <p className="text-gray-800 font-bold text-lg">5000</p>
            </div>
            
            <div className="bg-white rounded-xl p-4">
              <p className="text-gray-600 text-sm">Port PWA</p>
              <p className="text-gray-800 font-bold text-lg">5174</p>
            </div>
            
            <div className="bg-white rounded-xl p-4">
              <p className="text-gray-600 text-sm">Database</p>
              <p className="text-gray-800 font-bold text-lg">PostgreSQL</p>
            </div>
            
            <div className="bg-white rounded-xl p-4">
              <p className="text-gray-600 text-sm">Backend</p>
              <p className="text-gray-800 font-bold text-lg">Node.js</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-gray-800 font-bold text-lg mb-4">Aksi Cepat</h3>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestConnection}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition flex items-center"
            >
              <Wifi size={16} className="mr-2" />
              Test Koneksi
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition flex items-center"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh Aplikasi
            </button>
            
            <button
              onClick={() => {
                localStorage.clear();
                alert('Semua data lokal telah dihapus');
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* Version Info */}
        <div className="text-center pt-4">
          <p className="text-gray-500 text-sm">
            PWA Mobile v1.0 • Backend API v1.0
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Sistem Absensi Karyawan • ELCORPS
          </p>
        </div>
      </div>

      {/* Custom Animation */}
      <style jsx="true">{`
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SettingScreen;
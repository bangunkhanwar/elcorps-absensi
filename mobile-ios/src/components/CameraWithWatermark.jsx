import React, { useEffect, useState } from 'react';
import { Camera, X, RefreshCw, MapPin, AlertCircle } from 'lucide-react';
import { formatDate, formatTime } from '../utils/formatters';
import { getTrueDate } from '../utils/timeSync';

const CameraWithWatermark = ({ onCapture, onClose, title = "Ambil Foto", initialLocation = null }) => {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null); // Ref for immediate access in cleanup
  const [stream, setStream] = useState(null);
  const [location, setLocation] = useState(initialLocation ? { lat: parseFloat(initialLocation.latitude), lng: parseFloat(initialLocation.longitude) } : null);
  const [address, setAddress] = useState("Mencari alamat...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const watchId = React.useRef(null);
  const retryCount = React.useRef(0);
  const MAX_RETRIES = 2;

  // 1. Camera & Location Lifecycle Management
  useEffect(() => {
    const init = async () => {
      await startCamera();
      
      if (initialLocation) {
        const lat = parseFloat(initialLocation.latitude);
        const lng = parseFloat(initialLocation.longitude);
        setLocation({ lat, lng });
        reverseGeocode(lat, lng);
      } else {
        startTrackingLocation();
      }
    };

    init();

    // Handle when user switches apps or tabs
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
        stopTrackingLocation();
      } else {
        if (!streamRef.current) startCamera();
        if (!watchId.current && !initialLocation) startTrackingLocation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopCamera();
      stopTrackingLocation();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Run only once on mount

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setLoading(false);
    } catch (err) {
      console.error("Camera Error:", err);
      setError("Kamera tidak dapat diakses. Pastikan izin diberikan di pengaturan browser.");
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startTrackingLocation = () => {
    // 1. Android/Chrome Security Check (Geolocation requires HTTPS)
    if (window.isSecureContext === false && window.location.hostname !== 'localhost') {
      setError("Akses lokasi diblokir: Situs tidak aman (HTTPS diperlukan).");
      return;
    }

    if (!navigator.geolocation) {
      setError("Browser Anda tidak mendukung GPS.");
      return;
    }

    const highAccuracyOptions = {
      enableHighAccuracy: true,
      timeout: 20000, // Android needs more time sometimes
      maximumAge: 0
    };

    const standardOptions = {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000
    };

    const handleSuccess = (pos) => {
      retryCount.current = 0;
      const { latitude, longitude } = pos.coords;
      setLocation(prev => {
        // Only update address if location changed significantly (approx 10m)
        if (!prev || Math.abs(prev.lat - latitude) > 0.0001 || Math.abs(prev.lng - longitude) > 0.0001) {
          reverseGeocode(latitude, longitude);
        }
        return { lat: latitude, lng: longitude };
      });
      setError(null);
    };

    const handleError = (err) => {
      console.error("Geo Error:", err);
      
      // Fallback: If High Accuracy times out, try standard accuracy
      if (err.code === err.TIMEOUT && highAccuracyOptions.enableHighAccuracy) {
        console.warn("[Camera-Geo] High accuracy timeout, trying standard accuracy...");
        navigator.geolocation.getCurrentPosition(handleSuccess, (standardErr) => {
          // Final Final Error Handling
          if (standardErr.code === 1) {
            setError("Izin GPS ditolak. Mohon izinkan akses lokasi di browser.");
          } else if (standardErr.code === 3) {
            setError("Gagal mendapatkan lokasi (Timeout). Pastikan Anda berada di tempat terbuka atau aktifkan GPS.");
          } else {
            setError("Masalah koneksi GPS. Pastikan GPS perangkat aktif.");
          }
        }, standardOptions);
        return;
      }

      if (err.code === 1) {
        setError("Izin GPS ditolak. Mohon izinkan akses lokasi di browser.");
      } else if (err.code === 3) {
        setError("Gagal mendapatkan lokasi (Timeout). Pastikan Anda berada di tempat terbuka atau aktifkan GPS.");
      } else {
        setError("Masalah koneksi GPS. Pastikan GPS perangkat aktif.");
      }
    };

    // Use watchPosition for continuous updates and better accuracy over time
    watchId.current = navigator.geolocation.watchPosition(handleSuccess, handleError, highAccuracyOptions);
  };

  const stopTrackingLocation = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  // 2. Reverse Geocoding via Nominatim (OSM)
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      
      const addr = data.address || {};
      
      // Extract specific components
      const road = addr.road || addr.pedestrian || "";
      const kelurahan = addr.village || addr.suburb || addr.neighbourhood || "";
      const kecamatan = addr.city_district || addr.district || "";
      const kota = addr.city || addr.town || addr.municipality || "";
      const provinsi = addr.state || "";

      // Format: Jalan, Kelurahan, Kecamatan, Kota, Provinsi
      const parts = [road, kelurahan, kecamatan, kota, provinsi].filter(p => p !== "");
      const displayAddress = parts.join(', ');
      
      setAddress(displayAddress || data.display_name || "Alamat tidak ditemukan");
    } catch (err) {
      setAddress("Gagal mengambil alamat teks");
    }
  };

  // 3. Capture and Render Watermark to Canvas
  const capturePhoto = () => {
    if (!videoRef.current || !location) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally because front camera is mirrored
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

    // Watermark Configuration
    const padding = 20;
    const fontSize = Math.floor(canvas.width * 0.025); // Responsive font size
    ctx.font = `bold ${fontSize}px monospace`;
    
    const maxTextWidth = canvas.width - (padding * 2);
    
    // Function to wrap text into multiple lines
    const wrapText = (text, maxWidth) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    const now = getTrueDate();
    // Custom Format: 26 Februari 2026
    const tanggalStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const waktuStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':');
    
    const dateLine = `Tanggal: ${tanggalStr}`;
    const timeLine = `Waktu: ${waktuStr}`;
    const addressLines = wrapText(`Tempat: ${address}`, maxTextWidth);
    
    // Combine all lines
    const allLines = [dateLine, timeLine, ...addressLines];

    // Measure text for background box
    const lineHeight = fontSize + 10;
    const boxHeight = (allLines.length * lineHeight) + padding;
    
    // Draw semi-transparent background box at bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);

    // Draw text
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'bottom';
    
    // Draw lines from bottom to top
    allLines.reverse().forEach((line, index) => {
      ctx.fillText(line, padding, canvas.height - padding - (index * lineHeight));
    });

    // Output Result
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Convert to Blob for Server Upload
    canvas.toBlob((blob) => {
      onCapture({
        previewUrl: dataUrl,
        file: new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      });
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white absolute top-0 left-0 right-0 z-10">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
          <X size={28} />
        </button>
        <h2 className="font-bold text-lg">{title}</h2>
        <div className="w-10"></div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <RefreshCw className="animate-spin mb-4" size={48} />
            <p>Menyiapkan Kamera & GPS...</p>
          </div>
        )}
        
        {error && (
          <div className="p-6 text-center text-white">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={64} />
            <p className="text-xl font-bold">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-primary rounded-lg">
              Coba Lagi
            </button>
          </div>
        )}

        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover mirror"
          style={{ transform: 'scaleX(-1)' }} // Mirror view for user
        />
        
        {/* Face Guide Overlay */}
        {!loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-full max-w-[260px] aspect-[3/4] flex items-center justify-center">
              {/* Face Frame SVG */}
              <svg 
                viewBox="0 0 200 260" 
                className="w-full h-full text-white/60"
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round"
                strokeDasharray="10 6"
              >
                {/* Main Face Oval */}
                <ellipse cx="100" cy="110" rx="70" ry="95" />
                
                {/* Eye Level Guide (Optional, subtle) */}
                <path d="M60,100 L140,100" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                
                {/* Chin/Neck Guide */}
                <path d="M70,230 Q100,240 130,230" strokeWidth="2" />
                
                {/* Corners / Scan Brackets */}
                <path d="M10,40 L10,10 L40,10" strokeWidth="3" strokeDasharray="0" />
                <path d="M160,10 L190,10 L190,40" strokeWidth="3" strokeDasharray="0" />
                <path d="M10,220 L10,250 L40,250" strokeWidth="3" strokeDasharray="0" />
                <path d="M160,250 L190,250 L190,220" strokeWidth="3" strokeDasharray="0" />
              </svg>
              
              {/* Instruction Text */}
              <div className="absolute bottom-[-40px] left-0 right-0 text-center">
                <p className="text-white text-xs font-bold uppercase tracking-widest bg-black/50 py-1.5 px-4 rounded-full backdrop-blur-sm border border-white/10">
                  POSISIKAN WAJAH DI DALAM OVAL
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom Controls */}
      <div className="h-32 bg-black flex items-center justify-center px-10">
        <button
          onClick={capturePhoto}
          disabled={loading || !location}
          className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition active:scale-90 ${
            (loading || !location) ? 'opacity-50' : 'bg-white/20'
          }`}
        >
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <Camera size={32} className="text-black" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default CameraWithWatermark;

import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, RefreshCw, MapPin, AlertCircle } from 'lucide-react';
import { formatDate, formatTime } from '../utils/formatters';

const CameraWithWatermark = ({ onCapture, onClose, title = "Ambil Foto" }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("Mencari alamat...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Start Camera and Get Location
  useEffect(() => {
    startCamera();
    getLocation();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setLoading(false);
    } catch (err) {
      console.error("Camera Error:", err);
      setError("Gagal mengakses kamera. Pastikan izin diberikan.");
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lng: longitude });
          reverseGeocode(latitude, longitude);
        },
        (err) => {
          console.error("Geo Error:", err);
          setError("Gagal mendapatkan lokasi GPS.");
        },
        { enableHighAccuracy: true }
      );
    }
  };

  // 2. Reverse Geocoding via Nominatim (OSM)
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      setAddress(data.display_name || "Alamat tidak ditemukan");
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
    ctx.font = `${fontSize}px monospace`;
    
    const lines = [
      `${formatDate(new Date())} | ${formatTime(new Date())}`,
      `Lat: ${location.lat.toFixed(6)} Long: ${location.lng.toFixed(6)}`,
      `Alamat: ${address}`
    ];

    // Measure text for background box
    const boxHeight = (lines.length * (fontSize + 10)) + padding;
    
    // Draw semi-transparent background box at bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);

    // Draw text
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'bottom';
    
    lines.reverse().forEach((line, index) => {
      ctx.fillText(line, padding, canvas.height - padding - (index * (fontSize + 8)));
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
        
        {/* Real-time Overlay Preview */}
        {!loading && !error && (
          <div className="absolute bottom-32 left-4 right-4 bg-black/40 p-3 rounded-lg border border-white/20 text-white text-xs font-mono">
            <div className="flex items-center mb-1 text-primary-light">
              <MapPin size={12} className="mr-1" />
              <span>LIVE GPS DATA</span>
            </div>
            <p>{location ? `${location.lat}, ${location.lng}` : 'Menunggu GPS...'}</p>
            <p className="truncate">{address}</p>
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

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, ImageBackground, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { captureRef } from 'react-native-view-shot'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function AttendanceScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState("Mencari lokasi...");
  
  // State Foto
  const [photo, setPhoto] = useState<any>(null); // Foto mentah dari kamera
  const [isProcessing, setIsProcessing] = useState(false); // Loading saat proses watermark
  
  const [userName, setUserName] = useState("User");
  
  const cameraRef = useRef<any>(null);
  const snapshotRef = useRef<View>(null); // Ref untuk mengambil gambar

  // 1. Ambil Izin & Lokasi saat buka
  useEffect(() => {
    (async () => {
      // Izin
      if (!permission?.granted) await requestPermission();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress("Lokasi Ditolak");
        return;
      }

      // Lokasi & Reverse Geocode
      try {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
        
        let reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });

        if (reverseGeocode.length > 0) {
          let item = reverseGeocode[0];
          setAddress(`${item.street || item.name || ''}, ${item.city || ''}`);
        }
      } catch (e) {
        setAddress("Gagal memuat GPS");
      }

      const name = await AsyncStorage.getItem('userName');
      if (name) setUserName(name);
    })();
  }, []);

  // 2. Ambil Foto
  const takePicture = async () => {
    if (cameraRef.current) {
      const options = { quality: 0.5, base64: false, skipProcessing: true };
      const data = await cameraRef.current.takePictureAsync(options);
      setPhoto(data); 
      // Kita tidak langsung upload, tapi tampilkan dulu di layar untuk di-snapshot
    }
  };

  // 3. Fungsi Finalisasi (Snapshot Tampilan -> Upload)
  const processAndSubmit = async () => {
    if (!snapshotRef.current) return;
    
    setIsProcessing(true);
    try {
      // Tunggu sebentar agar UI render sempurna
      await new Promise(r => setTimeout(r, 500));

      // Ambil screenshot dari komponen 'snapshotRef'
      const finalUri = await captureRef(snapshotRef, {
        format: "jpg",
        quality: 0.8,
        result: "tmpfile" // Simpan ke file temporary
      });

      console.log("FOTO FINAL SIAP UPLOAD:", finalUri);

      // --- DISINI KODE UPLOAD API ---
      // const formData = new FormData();
      // formData.append('photo', { uri: finalUri, name: 'absen.jpg', type: 'image/jpeg' } as any);
      // await api.post('/attendance', formData);

      Alert.alert("Berhasil", "Absensi Terkirim!");
      setPhoto(null); // Reset ke kamera
    } catch (error) {
      console.error(error);
      Alert.alert("Gagal", "Gagal memproses gambar");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission?.granted) {
    return <View style={styles.center}><Text>Butuh Izin Kamera</Text></View>;
  }

  // --- RENDER ---
  return (
    <View style={styles.container}>
      
      {photo ? (
        // === TAMPILAN PREVIEW (FOTO SUDAH DIAMBIL) ===
        <View style={styles.fullScreen}>
          
          {/* AREA INI YANG AKAN DIJADIKAN GAMBAR FINAL (FOTO + TEKS) */}
          {/* collapsable={false} PENTING untuk Android agar View tidak hilang */}
          <View ref={snapshotRef} collapsable={false} style={styles.snapshotContainer}>
            <ImageBackground 
              source={{ uri: photo.uri }} 
              style={styles.imageBg} 
              resizeMode="cover"
            >
              {/* Overlay Hitam Transparan di Bawah */}
              <View style={styles.watermarkContainer}>
                <Text style={styles.wmTitle}>ELCORPS ABSENSI</Text>
                <View style={styles.wmRow}><Text style={styles.wmLabel}>Nama</Text><Text style={styles.wmValue}>: {userName}</Text></View>
                <View style={styles.wmRow}><Text style={styles.wmLabel}>Waktu</Text><Text style={styles.wmValue}>: {new Date().toLocaleString('id-ID')}</Text></View>
                <View style={styles.wmRow}><Text style={styles.wmLabel}>Lokasi</Text><Text style={styles.wmValue}>: {address}</Text></View>
                {location && <Text style={styles.wmCoords}>{location.coords.latitude}, {location.coords.longitude}</Text>}
              </View>
            </ImageBackground>
          </View>

          {/* TOMBOL AKSI (DILUAR snapshotRef AGAR TIDAK IKUT TERFOTO) */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setPhoto(null)}>
              <Text style={styles.btnText}>Ulangi</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.btn, styles.btnSubmit]} onPress={processAndSubmit} disabled={isProcessing}>
              {isProcessing ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Kirim Absen</Text>}
            </TouchableOpacity>
          </View>

        </View>
      ) : (
        // === TAMPILAN KAMERA ===
        <CameraView style={styles.camera} facing="front" ref={cameraRef}>
          <View style={styles.cameraUi}>
            <View style={styles.tagLocation}><Text style={styles.tagText}>{address}</Text></View>
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullScreen: { flex: 1 },
  
  // Style untuk Snapshot Area
  snapshotContainer: { 
    flex: 1, 
    backgroundColor: '#000',
    position: 'relative', // Pastikan relative
  },
  imageBg: { 
    flex: 1, 
    width: '100%', 
    height: '100%', 
    justifyContent: 'flex-end' // Posisikan watermark di bawah
  },
  
  // Style Watermark (Dibuat agar terbaca jelas)
  watermarkContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Hitam agak gelap biar tulisan putih terbaca
    padding: 15,
    paddingBottom: 20,
    width: '100%',
  },
  wmTitle: { color: '#FFD700', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  wmRow: { flexDirection: 'row', marginBottom: 2 },
  wmLabel: { color: '#ddd', width: 60, fontSize: 12 },
  wmValue: { color: '#fff', flex: 1, fontSize: 12, fontWeight: '500' },
  wmCoords: { color: '#aaa', fontSize: 10, marginTop: 3 },

  // Style Tombol Aksi
  actionContainer: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
    zIndex: 10
  },
  btn: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, minWidth: 120, alignItems: 'center' },
  btnCancel: { backgroundColor: '#FF3B30' },
  btnSubmit: { backgroundColor: '#34C759' },
  btnText: { color: 'white', fontWeight: 'bold' },

  // Style Kamera
  camera: { flex: 1 },
  cameraUi: { flex: 1, justifyContent: 'space-between', padding: 20 },
  tagLocation: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8, marginTop: 40 },
  tagText: { color: 'white', fontSize: 12 },
  captureBtn: { alignSelf: 'center', marginBottom: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white' },
});
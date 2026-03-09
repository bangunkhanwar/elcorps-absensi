# Audit & Validasi Sistem Absensi Karyawan (Elcorps Absensi)

**Peran:** Senior Full-Stack Engineer & Product Manager  
**Skala Target:** 400-600 Karyawan Aktif  
**Server:** VPS 2 Core, 8GB RAM

---

## 1. Evaluasi Arsitektur & Efisiensi Sistem

### Analisis Kompresi Gambar (Sharp.js) vs CPU 2 Core
*   **Masalah:** Menggunakan `sharp` di backend untuk kompresi gambar 3-5MB saat lonjakan (peak traffic) sangat berisiko. Meskipun cepat, `sharp` adalah proses CPU-intensive. 100 request serentak di menit yang sama dapat menyebabkan CPU mencapai 100%, mengakibatkan *Context Switching* yang melambatkan *Event Loop* Node.js.
*   **Risiko:** API lambat merespons (high latency), 502 Bad Gateway dari Nginx, dan server berpotensi crash.
*   **Solusi:** **Kompresi Wajib di Frontend.** Gambar harus dikompresi di browser/HP user (menjadi ~100-300KB) menggunakan Canvas API sebelum dikirim. Ini telah diimplementasikan di `CameraWithWatermark.jsx`. Server hanya menerima file kecil, menghemat bandwidth dan 100% membebaskan CPU dari beban rendering.

### Konfigurasi Optimal (PM2 & PostgreSQL)
*   **PM2 Cluster Mode:** Wajib jalankan dengan `pm2 start server.js -i max`. Untuk 2 Core, ini akan membuat 2 instance proses yang membagi beban secara merata.
*   **Database Pooling:** Atur `max: 20-30` koneksi per instance pada konfigurasi `pg pool`. Dengan RAM 8GB, database dapat dengan nyaman menangani total 40-60 koneksi aktif tanpa menghabiskan resource.

---

## 2. Validasi Alur Bisnis (Business Logic)

### Operasional HRD & Edge Cases
*   **Validasi Keamanan Jam:** Backend tidak boleh percaya jam dari HP user. Gunakan waktu server (`CURRENT_TIMESTAMP`) untuk mencatat `waktu_masuk` dan `waktu_keluar`.
*   **GPS Accuracy:** Tangkap parameter `accuracy` dari browser. Jika akurasi lokasi > 100 meter, sistem harus memperingatkan user untuk mencari sinyal GPS yang lebih baik guna mencegah manipulasi lokasi di dalam gedung.
*   **Blank Spot:** UI harus memiliki *loading indicator* yang jelas (sudah ditambahkan: "Mencari GPS...") dan menangkap error upload agar user tahu jika pengiriman gagal karena sinyal lemah.

---

## 3. Keamanan & Anti-Fraud (Celah & Solusi)

| Celah Fraud | Solusi Teknis |
| :--- | :--- |
| **Fake GPS (Android)** | Backend mencatat koordinat asli. Lakukan audit via Dashboard HRD dengan fitur "Peta Sebaran". Akurasi 0 meter yang konstan patut dicurigai. |
| **Virtual Camera / Galeri** | Gunakan komponen kamera custom (seperti `CameraWithWatermark.jsx`) yang mematikan opsi "Upload from Gallery" dan memaksa pengambilan foto secara live. |
| **Manipulasi Jam HP** | **Wajib:** Backend mengabaikan input waktu dari frontend dan menggunakan jam server internal. |
| **API Spoofing (Postman)** | Pastikan validasi Token JWT ketat di setiap request dan validasi Geofencing dilakukan di sisi server (Backend). |

---

## 4. Rekomendasi Fitur (Roadmap Product Manager)

### Fitur Esensial (Prioritas Tinggi)
1.  **Export Laporan (Excel/CSV):** Kebutuhan utama HRD untuk proses Payroll bulanan. Tanpa ini, data hanya menjadi angka diam.
2.  **Hierarki Approval Bertingkat:** (Sudah diimplementasikan). Membagi beban kerja HRD ke para Supervisor/Manager divisi untuk menyetujui izin timnya masing-masing.
3.  **Audit Trail:** Mencatat siapa yang menyetujui izin (`acted_by_user_id`) dan kapan (`acted_at`) untuk pertanggungjawaban data.

### Fitur yang Harus Ditunda/Direvisi
1.  **Face Recognition (AI):** Hindari memproses pengenalan wajah di server 2 Core. Jika sangat dibutuhkan, gunakan API pihak ketiga (AWS Rekognition / Google Vision) agar tidak membakar CPU server lokal.
2.  **Live Tracking:** Jangan kirim lokasi user secara berkala (background tracking). Ini boros baterai HP user dan akan membebani penyimpanan database PostgreSQL Anda secara eksponensial.
3.  **Realtime WebSocket (Socket.io):** Untuk jumlah user < 1000, Push Notification (VAPID) yang kita buat jauh lebih efisien daripada menjaga ribuan koneksi socket yang haus RAM.

---

**Status Proyek Saat Ini:**  
✅ Database Hierarki (Jabatan & Izin Bertingkat) - **READY**  
✅ Image Optimization (Frontend & Backend) - **READY**  
✅ Web Push Notification (VAPID) - **READY**  
✅ Preview Lampiran & Foto Absen - **READY**  

**Rekomendasi Langkah Selanjutnya:**  
Implementasi fitur **Export to Excel** untuk Admin HRD di sisi website.

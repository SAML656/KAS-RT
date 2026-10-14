# Sistem Informasi & Transparansi Kas RT 01 / RW 02

Aplikasi manajemen dan transparansi pencatatan kas warga berbasis web (HTML5, Vanilla CSS, JavaScript, PHP, dan MySQL). Dirancang untuk memudahkan pengelolaan arus kas masuk/keluar, pengelolaan kategori/folder kegiatan RT, pengarsipan berkas catatan, serta penerimaan aspirasi dan usulan warga secara terbuka.

---

## ✨ Fitur Utama

- **Dashboard Keuangan Real-Time:** Menampilkan ringkasan total saldo kas, total pemasukan, total pengeluaran, dan visualisasi diagram kas.
- **Manajemen Kategori / Folder Kegiatan:** Pengelompokan dana per bidang (Iuran Warga, Operasional RT, Kebersihan & Keamanan, Pembangunan Fasilitas, Sosial, Liburan/Wisata, Acara).
- **Pencatatan Transaksi Kas:** Pencatatan arus kas masuk (`i`) dan kas keluar (`o`) dengan tanggal, sumber dana, nominal, dan keterangan lengkap.
- **Arsip Digital & Berkas Riwayat:** Folder explorer terstruktur untuk rekap transaksi per periode/kegiatan (status Draf atau Final).
- **Usulan & Aspirasi Warga:** Warga dapat mengirimkan aspirasi, usulan perbaikan, atau kegiatan langsung dari portal web, dengan tanggapan status transparan dari pengurus.
- **Ekspor Laporan (Excel & PDF/Cetak):** Ekspor rekapitulasi data kas ke format lembar kerja Excel (`.xlsx`) dan cetak formal ber-kop RT.
- **Mode Keamanan Admin:** Akses pengurus menggunakan verifikasi email terdaftar (SHA-256) serta autentikasi sesi aman.

---

## 🛠️ Arsitektur & Teknologi

- **Frontend:** HTML5, Modern Responsive CSS (Glassmorphism & Clean Typography), Vanilla JavaScript (State Store & Reactive UI).
- **Backend API:** PHP Native (REST-like endpoints dengan format respon JSON).
- **Database:** MySQL / MariaDB (Mendukung soft delete dan indexing performa).
- **Library Pendukung:** `SheetJS` (xlsx.full.min.js) untuk ekspor Excel client-side.

---

## 🚀 Panduan Instalasi Lokal (XAMPP)

### 1. Kloning Repositori
```bash
git clone https://github.com/SAML656/KAS_RT.git
cd KAS_RT
```

### 2. Konfigurasi Database
1. Buka folder `api/`.
2. Salin template konfigurasi `config.example.php` menjadi `config.php`:
   ```bash
   cp api/config.example.php api/config.php
   ```
3. Sesuaikan koneksi database MySQL di file `api/config.php` (secara default untuk XAMPP: host `127.0.0.1`, user `root`, password kosong).

### 3. Migrasi Skema Database
Pastikan layanan Apache & MySQL di XAMPP sudah berjalan, lalu jalankan perintah instalasi otomatis melalui terminal:
```bash
php api/install.php
```
*Atau impor berkas `api/schema.sql` langsung melalui phpMyAdmin.*

### 4. Menjalankan Aplikasi
Pindahkan folder project ke direktori `htdocs` XAMPP (contoh: `C:/xampp/htdocs/kas_rt`), lalu buka di browser:
```
http://localhost/kas_rt/
```

---

## 🔒 Catatan Keamanan
File `api/config.php` yang memuat kredensial koneksi database asli telah diabaikan (`.gitignore`) demi menjaga keamanan informasi rahasia. Jangan pernah mengunggah kredensial atau password produksi langsung ke repositori publik.

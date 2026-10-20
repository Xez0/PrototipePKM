# Repositori Video Pembelajaran Mandiri - UPTD SMP Negeri 7 Kota Tangerang Selatan

Prototipe aplikasi web pembelajaran mandiri untuk kegiatan **Pengabdian kepada Masyarakat (PkM) Mahasiswa**  
Program Studi S-1 Teknik Informatika, Fakultas Ilmu Komputer, Universitas Pamulang (UNPAM)  
Tahun Akademik 2026/2027

---

## 📌 Identitas Program & Kemitraan Sekolah

* **Judul Kegiatan:**  
  *Pendampingan Pembuatan dan Pemanfaatan Website Repositori Video Pembelajaran untuk Meningkatkan Efisiensi Akses Bahan Ajar di UPTD SMPN 7 Kota Tangerang Selatan*
* **Mitra Kerjasama:**  
  UPTD SMP Negeri 7 Kota Tangerang Selatan  
  *(Jl. Cicentang Pulo, RT.006/RW.001, Kelurahan Rawa Buntu, Kecamatan Serpong, Kota Tangerang Selatan, Banten 15318)*
* **Dosen Pembimbing PkM:**  
  Kecitaan Harefa, S.Kom., M.Kom. (NIDN: 0421049102)
* **Ketua Pelaksana:**  
  Luckemeraldo Jardel Frits Putra Wagania (NIM: 241011400431 / Kelas: 05TPLM003)
* **Sasaran Pemanfaat:**  
  Dewan Guru Mata Pelajaran Kelas 7, 8, dan 9 serta seluruh peserta didik SMPN 7 Kota Tangerang Selatan.

---

## 🏛️ Arsitektur Aplikasi & Keputusan Teknologi

Aplikasi ini dibangun menggunakan arsitektur **Single Page Application (SPA)** berbasis standar web terbuka (*Web Standards: HTML5, CSS3, dan Vanilla JavaScript ES6+*) dengan alasan teknis dan operasional lingkungan sekolah:

1. **Zero Runtime Dependency (Tanpa Instalasi Server Berat):**
   * Dapat dijalankan langsung di laboratorium komputer sekolah, Chromebook dinas, maupun smartphone siswa tanpa memerlukan proses kompilasi `node_modules` atau server backend berbayar.
2. **Penyimpanan Berkas Video Lokal (IndexedDB Binary Storage):**
   * Berbeda dengan LocalStorage yang terbatas 5 MB, aplikasi memanfaatkan **IndexedDB API** peramban untuk menyimpan berkas video asli (`.mp4`, `.webm`) berukuran ratusan megabita hingga gigabita langsung di penyimpanan lokal komputer guru/sekolah.
   * Siswa dapat memutar materi ajar secara offline di jaringan lokal lab sekolah tanpa bergantung pada akses internet YouTube.
3. **Penyimpanan Metadata & Sinkronisasi Cepat:**
   * Metadata materi, capaian pembelajaran (CP), catatan siswa, dan status penyelesaian tersimpan terstruktur serta dapat diekspor menjadi berkas cadangan JSON resmi sekolah.
4. **Desain Bersih & Ramah Pengguna (Human-Centered Design):**
   * Menghilangkan kerumitan formulir yang membingungkan bagi dewan guru senior. Antarmuka dibuat bersih, berjarak nyaman, dengan tipografi yang jelas dan kontras rasio tinggi (WCAG AA).

---

## ✨ Fitur-Fitur Utama Sistem

### 1. Halaman Siswa & Katalog Publik Bebas Distraksi
* **Katalog Berjenjang:** Pembagian materi jelas berdasarkan Kelas 7, Kelas 8, dan Kelas 9 serta rumpun mata pelajaran (MIPA, Informatika, Bahasa, dan IPS/PPKn).
* **Pencarian Cerdas Instan:** Pencarian materi berdasarkan judul bab, nama guru pengampu, atau topik pelajaran.
* **Tanda Selesai Dipelajari:** Penanda mandiri bagi siswa untuk mengingat materi apa saja yang sudah dipahami.

### 2. Portal & Ruang Pengelolaan Dewan Guru
* **Akses Terpisah (Role Separation):** Alur masuk terdedikasi untuk dewan guru pengampu dengan opsi Masuk Cepat (Akun Demo) untuk kemudahan peninjauan prototipe.
* **Formulir Unggah Sangat Sederhana (3 Langkah Inti):**
  1. Pilih sumber video: **Berkas dari Laptop/HP** atau **Tautan YouTube**.
  2. Masukkan Judul Materi Pembelajaran.
  3. Pilih Jenjang Kelas dan Mata Pelajaran, lalu klik Simpan.
* **Manajemen Repositori:** Tabel kelola materi yang rapi untuk mempratinjau hasil tayang atau menghapus materi lama.
* **Cadangan & Pemulihan Data:** Fitur ekspor/impor JSON untuk mengamankan data materi antarperangkat komputer sekolah.

### 3. Pemutar Video Pembelajaran Fokus (Theatre Mode)
* **Dukungan Ganda (Dual-Source Playback):** Memutar file video lokal dari IndexedDB via Object URL Blob secara mulus, atau memutar tautan YouTube edukatif.
* **Navigasi Bab Instan:** Siswa dapat mengulang bagian materi tertentu yang sulit langsung dengan mengeklik daftar bab tanpa harus memuat ulang video.
* **Pengatur Kecepatan:** Kecepatan putar fleksibel (0.75x hingga 1.5x) untuk memfasilitasi repetisi konsep.
* **Rangkuman Guru & Capaian Pembelajaran:** Ringkasan materi inti resmi dari guru pengampu serta target Capaian Pembelajaran Kurikulum Merdeka Fase D.

### 4. Modul Lembar Belajar Cetak / PDF Resmi Sekolah
* Menghasilkan dokumen cetak resmi terisolasi lengkap dengan Kop UPTD SMP Negeri 7 Kota Tangerang Selatan, Capaian Pembelajaran Kurikulum Merdeka, rangkuman materi dari dewan guru, lembar refleksi mandiri, serta kolom tanda tangan guru pengampu dan orang tua murid.

---

## ⌨️ Pintasan Keyboard Pintar

| Tombol | Fungsi Cepat |
| :---: | :--- |
| `/` atau `K` | Langsung memusatkan kursor ke kotak pencarian katalog materi |
| `G` | Buka Portal Masuk Dewan Guru / Ruang Pengelolaan Guru |
| `T` | Beralih tema tampilan (Mode Terang Sekolah / Mode Gelap Malam) |
| `P` | Buka dialog cetak lembar modul PDF resmi saat materi sedang diputar |
| `Esc` | Menutup pemutar video fokus |

---

## 🚀 Panduan Menjalankan Prototipe

Aplikasi ini dapat dibuka secara langsung tanpa proses instalasi dependensi tambahan:

### Cara 1: Buka Langsung di Peramban
* Buka berkas `index.html` menggunakan peramban modern (Google Chrome, Microsoft Edge, Mozilla Firefox, atau Safari).

### Cara 2: Menjalankan Server Lokal (Opsional)
Jika ingin menguji fitur Service Worker atau protokol HTTP lokal:
```bash
python -m http.server 8877
```
Buka peramban pada alamat `http://localhost:8877`.

---

## 👥 Tim Pelaksana PkM (Universitas Pamulang)

* **Dosen Pembimbing:** Kecitaan Harefa, S.Kom., M.Kom. (NIDN: 0421049102)
* **Ketua Pelaksana:** Luckemeraldo Jardel Frits Putra Wagania (NIM: 241011400431)
* **Program Studi:** S-1 Teknik Informatika
* **Fakultas:** Ilmu Komputer, Universitas Pamulang

---

© 2026 UPTD SMP Negeri 7 Kota Tangerang Selatan & Tim PkM S-1 Teknik Informatika Universitas Pamulang. Seluruh hak cipta dilindungi.

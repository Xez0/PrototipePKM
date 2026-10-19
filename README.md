# Repositori Video Pembelajaran - SMP Negeri 7 Kota Tangerang Selatan

Prototipe aplikasi web untuk kegiatan **Pengabdian kepada Masyarakat (PkM) Mahasiswa**  
Program Studi S-1 Teknik Informatika, Fakultas Ilmu Komputer, Universitas Pamulang (UNPAM)  
Tahun Akademik 2026/2027 Ganjil

---

## 📌 Identitas Program & Dokumen Resmi

* **Judul Kegiatan:**  
  *Pendampingan Pembuatan dan Pemanfaatan Website Repositori Video Pembelajaran untuk Meningkatkan Efisiensi Akses Bahan Ajar di SMPN 7*
* **Mitra Kerjasama:**  
  UPTD SMP Negeri 7 Kota Tangerang Selatan  
  *(Jl. Cicentang Pulo, RT.006/RW.001, Kelurahan Rawa Buntu, Kecamatan Serpong, Kota Tangerang Selatan, Banten 15318)*
* **Dosen Pembimbing PkM:**  
  Kecitaan Harefa, S.Kom., M.Kom. (NIDN: 0421049102)
* **Ketua Pelaksana Mahasiswa:**  
  Luckemeraldo Jardel Frits Putra Wagania (NIM: 241011400431 / Kelas: 05TPLM003)
* **Sasaran Pemanfaat:**  
  Perwakilan Dewan Guru Mata Pelajaran Kelas 7, 8, dan 9 (15–20 guru) serta ±800 peserta didik SMPN 7.

---

## 🎨 Redesain dengan Linear Design System (`awesome-design-md`) & `taste-skill v2`

Aplikasi telah direkayasa ulang secara menyeluruh menggunakan bahasa desain **Linear** (`linear.app`) dari koleksi `awesome-design-md` dan lulus standar anti-slop `taste-skill v2`:

1. **Palet Warna Linear (Obsidian Dark & Clean Light):**
   * *Dark Mode (Bawaan):* Canvas obsidian `#08090a`, permukaan panel `#0f1011` / `#141516`, garis hairline halus `#23252a`.
   * *Light Mode:* Canvas bersih `#ffffff`, permukaan panel `#f8f9fa`, garis hairline `#e5e7eb`.
   * *Aksen Khas Linear:* Lavender-indigo `#5e6ad2`, hover `#828fff`, dan hijau semantik sukses `#27a644`.
   * *Pintasan Tema:* Tekan tombol `T` pada keyboard untuk beralih mode seketika.
2. **Kaidah Anti-Slop `taste-skill`:**
   * Menghilangkan gradasi latar murahan (*generic gradient*) dan teks kliping warna-warni (*gradient text*).
   * Menghilangkan bayangan mengambang (*blurry rest drop shadows*), digantikan oleh permukaan datar (*flat tone steps*) berbatas hairline rapi.
   * Skala tipografi terstandarisasi (Inter Display 56px, Heading 24px, Subhead 18px, Body 16px, Caption 13px) dengan pelacakan negatif (*negative letter-spacing*).
   * Tidak ada teks di bawah 13px dan kontras rasio memenuhi standar aksesibilitas WCAG AA (4.5:1+).
   * Animasi transisi masuk halus (*micro-interactions motion layer*) dengan dukungan penuh `prefers-reduced-motion`.

---

## 🛠️ Perbaikan & Penyempurnaan Fungsi (Functional Audit & Fixes)

1. **Pemutar Video & Navigasi Bab Bebas Distraksi:**
   * **Instant Chapter Seeking:** Navigasi bab kini menggunakan **YouTube postMessage API** (`seekTo` & `playVideo`), sehingga melompat ke menit/bab tertentu terjadi seketika **tanpa memuat ulang (*reload*) iframe** dan tanpa layar hitam/flicker.
   * **Pemutar Ganda (Dual-Source Player):** Mendukung mode YouTube dan **Mode Lab Offline (HTML5 Video)** dengan satu klik tombol. Jika YouTube dibatasi oleh firewall/jaringan lab sekolah, materi langsung diputar via video player HTML5 lokal.
   * **Pencegahan Kebocoran Audio:** Saat modal ditutup via tombol silang, klik latar belakang, atau tombol `ESC`, sinyal `pauseVideo` seketika dikirim dan container dibersihkan sehingga suara video tidak tertinggal di latar belakang.
   * **Pengatur Kecepatan:** Dilengkapi opsi kecepatan putar `0.75x`, `1.0x (Normal)`, `1.25x`, dan `1.5x` untuk repetisi kilat.
2. **Lembar Belajar Cetak / PDF Resmi SMPN 7:**
   * Menggantikan unduhan file `.txt` sederhana dengan **Lembar Kerja & Rangkuman Resmi Sekolah** format cetak (`@media print` dan `window.print()`).
   * Dokumen cetak dilengkapi Kop Surat resmi SMPN 7 Tangsel, Capaian Pembelajaran (CP) Kurikulum Merdeka, rangkuman rumus guru, catatan pribadi siswa, serta kolom tanda tangan orang tua dan guru pengampu.
3. **Panel Guru (CRUD Penuh: Tambah, Edit, Hapus, & Cadangan):**
   * **Fitur Edit Materi:** Guru kini dapat memperbarui judul materi, kelas, nama guru, NIP, tautan video, capaian pembelajaran, bab, dan rangkuman tanpa perlu menghapus dari awal.
   * **Pencarian di Tabel Guru:** Memudahkan bapak/ibu guru menyaring materi ajar di tabel manajemen.
   * **Ekstraksi YouTube & Thumbnail Otomatis:** Sistem mendeteksi ID video dari berbagai format tautan (`youtu.be`, `watch?v=`, `shorts`) dan menghasilkan thumbnail presisi tinggi secara otomatis.
   * **Parser Bab Tahan Banting:** Mendukung penulisan format `mm:ss - Judul Bab` secara fleksibel dengan regex.
   * **Ekspor & Impor Cadangan:** Mendukung ekspor file JSON sebagai cadangan data sekolah dan pemulihan kapan saja.
4. **Pelacak Progres Belajar Siswa:**
   * Menampilkan bilah progres belajar interaktif (*"X dari Y materi selesai dipelajari"*).
   * Tombol "Tandai Selesai" langsung memperbarui lencana centang pada kartu dan persentase capaian di bagian atas.
   * Fitur "Salin Catatan" untuk menyalin catatan rumus langsung ke clipboard ponsel/laptop siswa.

---

## ⌨️ Pintasan Keyboard (Linear Power User)

| Tombol | Fungsi |
| :---: | :--- |
| `/` atau `K` | Langsung memusatkan kursor ke kotak Pencarian Cerdas |
| `G` | Membuka Panel Guru (Teacher Management Portal) |
| `T` | Mengganti tema (Linear Dark Obsidian <-> Linear Clean Light) |
| `P` | Membuka dialog Cetak / Simpan PDF Lembar Belajar (saat video aktif) |
| `Esc` | Menutup jendela modal pemutar video atau Panel Guru |

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi ini bersifat *zero-dependency* dan dapat dijalankan langsung di browser apa pun:

1. **Akses Langsung:**
   * Buka file `index.html` langsung di browser (Google Chrome, Microsoft Edge, Mozilla Firefox, atau Safari).
2. **Menjalankan Dev Server Lokal:**
   ```bash
   python -m http.server 8877
   ```
   Lalu buka peramban di `http://localhost:8877`.

---

© 2026 UPTD SMP Negeri 7 Kota Tangerang Selatan & Tim PkM S-1 Teknik Informatika Universitas Pamulang.

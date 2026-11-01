# 📑 LAPORAN AUDIT END-TO-END (E2E), KEAMANAN SISTEM, & EVALUASI DESAIN (ANTI-SLOP)
**Target:** `C:\Users\DELL\Downloads\tugas-kuliah\prototipe-pkm-smpn7`  
**Proyek:** Repositori Video Pembelajaran Mandiri — UPTD SMP Negeri 7 Kota Tangerang Selatan (PkM UNPAM 2026/2027)  
**Tipe Pemeriksaan:** Full Codebase Static Analysis, Architecture & E2E Flow Audit, Security Vulnerability Assessment (OWASP Top 10), serta Design Taste & Anti-Slop Evaluation.  
**Pedoman Audit yang Digunakan:** `/design-taste-frontend`, `/antislop`, `/antislop-ui`, `/awesome-design-md`, `/frontend-design`, `/impeccable`, `/ui-ux-pro-max`, `/ui-styling`.  
**Status Tindakan:** **HANYA AUDIT & LAPORAN** — Tidak ada satu pun kode sumber atau konfigurasi yang diubah/diedit selama proses ini.

---

## 🧭 RINGKASAN EKSEKUTIF HASIL AUDIT

Berdasarkan audit mendalam secara menyeluruh terhadap seluruh komponen berkas (`HTML`, `CSS`, `JS`, `Node.js Native Server`, `Vercel Serverless Functions`, `Supabase Integration`, dan konfigurasi autentikasi), prototipe ini memiliki konsep dan visi operasional sekolah yang sangat mulia dan terstruktur. Namun, ditemukan **kelemahan fatal di sektor keamanan**, **ambiguitas arsitektur sinkronisasi**, serta **beberapa elemen antarmuka yang sangat mencerminkan template default AI (AI Slop)**.

| Pilar Audit | Skor / Status | Temuan Utama |
| :--- | :---: | :--- |
| **Keamanan Sistem (Security)** | 🚨 **KRITIS (F)** | • Kunci rahasia Google OAuth (`client_secret`) dan Live Refresh Token dengan scope destruktif (`youtube.force-ssl`) tersimpan terbuka di disk.<br>• Server `server.js` dan konfigurasi Vercel mengekspos seluruh isi root folder secara statis (kredensial bisa diunduh siapa saja).<br>• RCE via `eval()` pada endpoint `/api/reset`.<br>• Endpoint penghapusan YouTube (`/api/youtube-delete`) dan manipulasi data (`/api/videos`) tanpa autentikasi sama sekali.<br>• Kerentanan DOM XSS pada interpolasi `v.id`, `v.subject`, dan atribut HTML. |
| **Arsitektur & E2E Flow** | ⚠️ **PERLU PERBAIKAN (C)** | • Dual-backend divergence (`server.js` lokal vs Vercel Serverless di `api/`). Di Vercel, fungsi POST/PUT/DELETE hanya merespons dummy 200 tanpa persistensi disk.<br>• Fragmentasi penyimpanan: File video lokal yang diunggah guru saat offline tersimpan di IndexedDB browser laptop guru saja, sehingga siswa di perangkat lain tidak bisa memutarnya (fallback NASA).<br>• Ada file mockup yatim piatu (`portal-guru-form.html`) dengan stack Tailwind CDN yang terisolasi dari aplikasi utama. |
| **Desain & Anti-Slop (UI/UX)** | ⚠️ **CUKUP DENGAN TELLS (B-)** | • **AI Tell 1:** Judul Hero menggunakan aksen warna 2-kata klise (`hero-title-accent`).<br>• **AI Tell 2:** Metrik fiktif `100% Bebas Iklan` dicampur dengan metrik kuantitatif faktual.<br>• **AI Tell 3:** Teks monumen raksasa di footer (`SMPN 7 TANGSEL × INFORMATIKA UNPAM`) ala galeri Awwwards yang terlalu berlebihan untuk konteks sekolah negeri.<br>• **AI Tell 4:** Anarki skala tipografi: terdeteksi 12 ukuran font berbeda di satu halaman (seharusnya maksimal 5 skala utama).<br>• **AI Tell 5:** Format FAQ tumpuk bergaya SaaS yang terasa seperti hasil prompt instan. |

---

## 🔴 BAGIAN 1: AUDIT KEAMANAN (SECURITY VULNERABILITIES)

### 1.1. [SEV-1 KRITIS] Kebocoran Kredensial Google OAuth 2.0 & Token Permanen YouTube
* **Lokasi Berkas:**
  - `google-oauth-config.json` (baris 2–5)
  - `data/youtube-token.json` (baris 2–5)
  - `api/youtube-token.json` (baris 2–5)
* **Temuan:**
  Berkas `google-oauth-config.json` memuat `client_id` dan `client_secret` secara gamblang:
  ```json
  "client_id": "609447982110-***REDACTED***.apps.googleusercontent.com",
  "client_secret": "GOCSPX-***REDACTED***",
  "channel_email": "xezman88@gmail.com"
  ```
  Lebih berbahaya lagi, berkas `data/youtube-token.json` dan `api/youtube-token.json` memuat **Live Refresh Token** dan **Access Token** yang valid dengan scope:
  `"scope": "https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube.upload"`
* **Dampak Risiko:**
  Scope `youtube.force-ssl` memberikan **kontrol penuh (Full Admin Access)** atas akun YouTube yang terhubung. Penyerang yang mendapatkan token ini dapat menghapus seluruh video pada channel, mengubah informasi channel, mengunggah video berbahaya, maupun membajak akun.
* **Solusi Perbaikan:**
  1. **Segera cabut (Revoke)** kredensial `client_secret` ini melalui Google Cloud Console (APIs & Services > Credentials), buat OAuth Client Secret baru.
  2. Pindahkan seluruh kredensial ke **Environment Variables** (`.env` yang tidak di-commit ke Git):
     `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.
  3. Jangan pernah menyimpan `youtube-token.json` di dalam folder proyek publik. Gunakan Secret Manager (atau Environment Variable di Vercel/VPS).

---

### 1.2. [SEV-1 KRITIS] Static File Server Mengekspos Seluruh Isi Direktori Proyek
* **Lokasi Berkas:**
  - `server.js` (baris 618–674)
  - `vercel.json` (baris 2)
* **Temuan:**
  Pada `server.js`, fungsi penyaji file statis mengarahkan permintaan langsung ke `ROOT_DIR`:
  ```javascript
  let filePath = path.join(ROOT_DIR, pathname === "/" ? "index.html" : pathname);
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(ROOT_DIR)) { ... }
  fs.stat(normalizedPath, ...);
  ```
  Pada `vercel.json`:
  ```json
  { "outputDirectory": ".", "cleanUrls": true }
  ```
* **Dampak Risiko:**
  Siapa pun yang membuka browser atau mengirim cURL dapat mengunduh berkas sensitif langsung:
  - `http://localhost:8877/google-oauth-config.json` -> mengembalikan Client Secret.
  - `http://localhost:8877/data/youtube-token.json` -> mengembalikan Refresh Token.
  - `http://localhost:8877/server.js` -> mengembalikan seluruh kode backend.
  - `http://localhost:8877/PRD-GOOGLE-STITCH.md` -> mengembalikan dokumen internal.
* **Solusi Perbaikan:**
  1. Isolasi berkas publik ke dalam subdirektori khusus `public/` (hanya `index.html`, `assets/`, `css/`, `js/`).
  2. Di `server.js`, batasi penyajian file statis hanya dari folder `public/`, dan tolak secara tegas ekstensi `.json`, `.md`, `.env*`, `.git*`, `.js` (di luar folder js/ publik).
  3. Di `vercel.json`, atur `outputDirectory: "public"` atau tentukan `routes` whitelist khusus untuk aset publik.

---

### 1.3. [SEV-2 TINGGI] Remote Code Execution (RCE) via `eval()` pada Endpoint `/api/reset`
* **Lokasi Berkas:** `server.js` (baris 601–615)
* **Temuan:**
  Pada handler rute `/api/reset`:
  ```javascript
  if (pathname === "/api/reset" && method === "POST") {
    const dataJs = fs.readFileSync(path.join(ROOT_DIR, "js", "data.js"), "utf8");
    const match = dataJs.match(/const INITIAL_VIDEO_DATA = (\[[\s\S]*?\]);\s*window/);
    if (match) {
      const defaultData = eval(match[1]); // <-- EVALUATION KODE MENTAH DARI FILE
      writeVideos(defaultData);
      ...
    }
  }
  ```
* **Dampak Risiko:**
  Penggunaan `eval()` di lingkungan Node.js server adalah anti-pattern berbahaya. Jika penyerang mampu memanipulasi isi `data.js` (misalnya melalui celah upload atau eksploitasi dependensi), instruksi kode arbitrer akan dieksekusi langsung oleh server dengan hak akses Node.js.
* **Solusi Perbaikan:**
  Simpan data default awal dalam format murni `data/initial-videos.json` dan gunakan `JSON.parse()`. Hindari mengekstrak array JavaScript dari string menggunakan regex dan `eval()`.

---

### 1.4. [SEV-2 TINGGI] Unauthenticated Destructive Endpoints (`/api/youtube-delete` & CRUD)
* **Lokasi Berkas:**
  - `server.js` (baris 388–482 & 542–595)
  - `api/youtube-delete.js` (baris 20–100)
* **Temuan:**
  Endpoint `/api/youtube-delete`, `DELETE /api/videos/:id`, `PUT /api/videos/:id`, dan `POST /api/videos` **sama sekali tidak memeriksa header Authorization, session cookie, maupun API key**.
* **Dampak Risiko:**
  Siapa pun di jaringan sekolah (atau di internet jika dideploy ke Vercel) dapat mengirimkan HTTP request sederhana:
  ```bash
  curl -X POST https://pkm-five.vercel.app/api/youtube-delete -H "Content-Type: application/json" -d '{"youtubeVideoId":"..."}'
  ```
  Dan video pada channel YouTube resmi sekolah akan **dihapus secara permanen** oleh server tanpa konfirmasi hak akses dewan guru. Begitu pula data materi di `/api/videos` bisa dihapus atau diubah oleh siswa yang iseng.
* **Solusi Perbaikan:**
  1. Pasang middleware verifikasi token autentikasi (JWT / HMAC Session Token) pada seluruh rute mutasi (`POST`, `PUT`, `DELETE`).
  2. Hanya proses permintaan jika token berasal dari sesi Dewan Guru yang valid.

---

### 1.5. [SEV-2 TINGGI] Unrestricted File Upload & Potensi Stored XSS
* **Lokasi Berkas:** `server.js` (baris 103–187)
* **Temuan:**
  Pada `handleFileUpload`:
  ```javascript
  const ext = path.extname(originalName) || ".mp4";
  const safeName = `video-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const savePath = path.join(UPLOADS_DIR, safeName);
  fs.writeFileSync(savePath, fileContent);
  ```
  - Ekstensi file diambil langsung dari `originalName` tanpa validasi whitelist (misal: jika pengguna mengunggah file bernama `exploit.html` atau `malicious.svg`, ekstensi `.html` atau `.svg` tetap dipertahankan).
  - Folder `uploads/` disajikan langsung oleh web server statis dengan MIME type otomatis (`text/html`, `image/svg+xml`).
  - Tidak ada batas memori saat mengumpulkan chunk multipart (`chunks.push(chunk)`), sehingga kiriman berkas raksasa dapat menyebabkan crash Node.js (Denial of Service / Out of Memory).
* **Dampak Risiko:**
  Penyerang dapat mengunggah file HTML/SVG berbahaya ke `/api/upload`, kemudian membuka `/uploads/video-xxxx.html`. Script penyerang akan berjalan di origin aplikasi, mencuri session token dan data localStorage siswa/guru (Stored Cross-Site Scripting).
* **Solusi Perbaikan:**
  1. Terapkan ekstensi whitelist ketat: hanya izinkan `.mp4`, `.webm`. Tolak keras `.html`, `.htm`, `.svg`, `.js`, `.php`.
  2. Verifikasi Magic Bytes berkas (bukan hanya membaca ekstensi string).
  3. Atur header respons pada `/uploads/`: `Content-Disposition: attachment` atau `Content-Security-Policy: default-src 'none'`.
  4. Batasi ukuran maksimal stream upload (misal: maksimal 500 MB) dan batalkan koneksi jika melebihi kuota.

---

### 1.6. [SEV-3 MENENGAH] Multiple DOM-based Cross-Site Scripting (XSS) Vectors
* **Lokasi Berkas:**
  - `js/app.js` (baris 1360, 1366, 1376, 1808, 1819)
  - `js/player.js` (baris 370)
* **Temuan:**
  1. **Interpolasi ID Materi Tanpa Sanitasi:**
     Di `app.js`:
     ```javascript
     onclick="App.openVideoById('${v.id}')"
     ```
     Jika properti `id` sebuah video memuat karakter `'` (misalnya disuntikkan via manipulasi payload API atau sinkronisasi Supabase dengan payload `id: "smpn7-x');alert(document.domain);//"`), string akan keluar dari pembatas fungsi dan mengeksekusi JavaScript.
  2. **Interpolasi Properti Subjek pada Event Handler `onerror`:**
     Di `app.js` (baris 1819):
     ```javascript
     onerror="this.onerror=null; this.src=App.getCoverBySubject('${v.subject}');"
     ```
     `v.subject` dimasukkan mentah ke dalam inline attribute event handler.
  3. **Interpolasi Atribut `title` pada Bab Video:**
     Di `player.js` (baris 370):
     ```javascript
     title="Ulangi penjelasan dari menit ${ch.time}">
     ```
     Jika `ch.time` memuat karakter kutip dua (`"`), atribut HTML `title` akan tertutup prematur dan memungkinkan injeksi event handler (`" onmouseover="...`).
* **Solusi Perbaikan:**
  Gunakan delegasi event modern (`data-video-id="..."` dengan `addEventListener`) alih-alih merangkai inline string `onclick="..."`, dan pastikan semua variabel yang dimasukkan ke dalam atribut HTML melalui fungsi `escapeHtml()`.

---

### 1.7. [SEV-3 MENENGAH] Mock Authentication & Password Ignored (Client-Side Only)
* **Lokasi Berkas:** `js/storage.js` (baris 157–198)
* **Temuan:**
  Fungsi `AuthManager.login(identifier, password)`:
  ```javascript
  const pass = (password || "").trim(); // Password tidak pernah dicek!
  ...
  else {
    teacherData = { ...this.defaultTeacher };
    teacherData.name = rawId; // Semua string nama diterima sebagai guru valid!
  }
  sessionStorage.setItem(STORAGE_KEYS.TEACHER_SESSION, JSON.stringify(teacherData));
  return { success: true, teacher: teacherData };
  ```
* **Dampak Risiko:**
  Kata sandi sama sekali tidak diverifikasi. Siswa mana pun yang mengetikkan nama apa saja di kolom login akan langsung masuk ke Dashboard Guru dengan hak kelola materi penuh di browser.
* **Solusi Perbaikan:**
  Meskipun ini adalah prototipe, verifikasi kredensial minimal harus dilakukan (misal: pencocokan hash PIN atau otentikasi via backend/Supabase Auth), dan status login tidak boleh hanya mengandalkan session storage lokal yang tidak divalidasi oleh server.

---

### 1.8. [SEV-3 MENENGAH] Supabase Anonymous Key Hardcoded dengan Hak Akses Hapus Penuh
* **Lokasi Berkas:** `js/storage.js` (baris 221–224 & 693)
* **Temuan:**
  Kunci anonim Supabase dipasang di client:
  ```javascript
  SUPABASE_CONFIG: {
    url: "https://cblawulqssslvjtpygmw.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
  Di dalam fungsi `resetToDefault`:
  ```javascript
  await this.supabaseClient.from("videos").delete().neq("id", "none");
  ```
* **Dampak Risiko:**
  Jika tabel `videos` di Supabase tidak dilindungi **Row Level Security (RLS)** dengan policy yang ketat, siapa pun yang membuka Developer Tools browser dapat menjalankan perintah `supabase.from('videos').delete().neq('id', 'none')` dan menghapus seluruh database materi sekolah secara instan.
* **Solusi Perbaikan:**
  Aktifkan RLS pada Supabase:
  - Policy `SELECT`: izinkan untuk peran `anon` (publik).
  - Policy `INSERT`, `UPDATE`, `DELETE`: hanya izinkan untuk peran terautentikasi (`authenticated`) yang memegang token dewan guru.

---

## 🟡 BAGIAN 2: AUDIT LOGIKA SISTEM, INTEGRASI & E2E (FUNCTIONAL & ARCHITECTURAL BUGS)

### 2.1. Divergensi Arsitektur Server Lokal (`server.js`) vs Vercel Serverless (`api/videos.js`)
* **Kondisi Saat Ini:**
  Proyek memiliki dua implementasi backend yang berbeda arah:
  1. `server.js` (Node.js lokal): Menyimpan materi ke berkas fisik `data/videos.json` dan file video ke folder `uploads/`.
  2. `api/videos.js` (Vercel Serverless): Pada metode `POST`, `PUT`, dan `DELETE`, kode secara eksplisit **hanya mengembalikan JSON dummy** (`"Operasi materi berhasil disinkronkan"`) tanpa menulis apa pun karena sistem file Vercel bersifat read-only.
* **Kelemahan & Masalah:**
  Jika pengguna menjalankan aplikasi di Vercel, mereka sepenuhnya bergantung pada koneksi client-side ke Supabase. Jika Supabase down atau diblokir oleh jaringan sekolah/firewall, penambahan atau perubahan materi oleh guru akan tampak berhasil di layar (mendapat toast sukses), namun data **hilang permanen** begitu tab browser ditutup atau di-refresh oleh pengguna lain.
* **Solusi:**
  Satukan arsitektur API. Buat adapter persistensi tunggal: baik lokal maupun serverless harus merujuk ke database yang sama (misal: Supabase PostgreSQL via server-side client, atau SQLite/Postgres), bukan file JSON lokal di satu sisi dan dummy response di sisi lain.

---

### 2.2. Masalah Ketersediaan Video Berkas Lokal (IndexedDB vs Multi-User)
* **Kondisi Saat Ini:**
  Aplikasi mempromosikan fitur *Zero-Server / Local Storage IndexedDB*. Ketika guru mengunggah file video MP4 dari laptopnya, binary file disimpan di IndexedDB browser tersebut.
* **Kelemahan & Masalah:**
  IndexedDB adalah penyimpanan lokal yang terikat pada satu browser di satu komputer.
  - Guru mengunggah video di Laptop Guru A.
  - Siswa membuka web di HP atau Komputer Lab B.
  - Metadata video muncul di katalog siswa (karena tersinkron via Supabase/JSON), namun **berkas videonya tidak ada di IndexedDB siswa**.
  - Saat siswa mengklik tombol tonton, player mendeteksi tidak ada Blob, lalu otomatis memutar video fallback NASA (`assets/join-nasa-s-mission-to-mars-student.mp4`).
* **Solusi:**
  Beri label yang jujur pada antarmuka:
  - Jika video diunggah sebagai file lokal, sistem harus secara eksplisit menyatakan *"Video ini disimpan di komputer lokal Lab Komputer. Untuk akses dari rumah siswa, gunakan opsi Tautan YouTube atau aktifkan sinkronisasi server sekolah."*
  - Atau, pastikan proses upload otomatis mengalirkan berkas ke object storage sekolah (misal: Supabase Storage Bucket atau direktori `/uploads/` server terpusat) sebelum materi dipublikasikan ke katalog siswa.

---

### 2.3. Adanya Berkas Mockup Yatim Piatu (`portal-guru-form.html`)
* **Kondisi Saat Ini:**
  Di root folder terdapat berkas `portal-guru-form.html` berukuran 33 KB. Berkas ini menggunakan Tailwind CDN (`https://cdn.tailwindcss.com`), ikon Material Symbols, dan palet warna Material 3 (`#ffdbc7`, `#904d00`, `#b0c6ff`).
* **Kelemahan & Masalah:**
  Berkas ini tidak dipanggil dari `index.html`, tidak memiliki integrasi JS ke `app.js`, dan memakai sistem desain yang bertabrakan 100% dengan `css/design-system.css`. Keberadaannya membingungkan pengembang dan peninjau PkM mengenai mana formulir guru yang sebenarnya aktif (di `index.html` sendiri sudah ada form 3-step bawaan).
* **Solusi:**
  Pindahkan `portal-guru-form.html` ke folder `docs/archive/` atau `design-mockups/`, atau hapus jika desainnya sudah sepenuhnya diintegrasikan ke dalam `index.html`.

---

### 2.4. Penanganan Balapan Data (Race Condition) pada Auto-Seed Supabase
* **Kondisi Saat Ini:**
  Di `js/storage.js` (baris 280–293):
  Jika `fetchFromSupabase()` mendeteksi bahwa tabel `videos` di cloud kosong (0 baris), client akan otomatis melakukan seeding data awal:
  ```javascript
  await this.supabaseClient.from("videos").insert(cleanAll);
  ```
* **Kelemahan & Masalah:**
  Jika ada 5 siswa atau guru yang membuka website secara bersamaan untuk pertama kali saat database masih kosong, kelima browser tersebut akan mendeteksi `data.length === 0` dan semuanya akan mengeksekusi `insert(cleanAll)`. Akibatnya, materi awal akan terduplikasi sebanyak 5 kali (35 video duplikat).
* **Solusi:**
  Inisialisasi data (seeding) harus dilakukan satu kali saja melalui migrasi database server/admin script SQL di Supabase dashboard, bukan oleh browser pengunjung secara reaktif.

---

## 🎨 BAGIAN 3: AUDIT DESAIN & ANTI-SLOP ("DESAIN YANG KELIHATAN AI BANGET")

Menggunakan pedoman dari skills `/antislop`, `/antislop-ui`, `/design-taste-frontend`, `/frontend-design`, `/impeccable`, `/ui-ux-pro-max`, dan `/awesome-design-md`, berikut adalah elemen-elemen antarmuka yang sangat tercium sebagai "AI Slop" (ciri khas buatan AI tanpa pertimbangan konteks nyata sekolah):

### 3.1. [AI Tell 1] Dua Warna pada Judul Hero (Dual-Tone Title Accent)
* **Temuan di Kode:** `index.html` (baris 86–88)
  ```html
  <h1 class="hero-title">
    Belajar Mandiri <span class="hero-title-accent">Bebas Distraksi</span>
  </h1>
  ```
* **Mengapa Terlihat AI Slop?**
  Pedoman `frontend-design` secara spesifik menyatakan:
  > *"Avoid these default typographic treatments; they are the commonest tells of a generated page: Accenting just a single word or phrase in a headline, like putting one word in italic/bold or a different color."*
  Hampir 90% landing page hasil generate LLM (v0, bolt, lovable) selalu membagi headline menjadi 2 bagian: teks gelap + teks aksen (sering kali dengan garis bawah dekoratif).
* **Solusi:**
  Gunakan bobot dan tipografi yang utuh untuk seluruh judul tanpa memecahnya menjadi pewarnaan dual-tone artifisial:
  ```html
  <h1 class="hero-title">Repositori Video Pembelajaran Mandiri</h1>
  <p class="hero-lead">Bahan ajar digital terarah untuk peserta didik UPTD SMP Negeri 7 Kota Tangerang Selatan.</p>
  ```

---

### 3.2. [AI Tell 2] Metrik Fiktif & Pemanis "100% Bebas Iklan" pada Grid Angka
* **Temuan di Kode:** `index.html` (baris 117–120)
  ```html
  <div class="stat-item">
    <span class="stat-number">100%</span>
    <span class="stat-label">Bebas Iklan & Terarah</span>
  </div>
  ```
* **Mengapa Terlihat AI Slop?**
  Sesuai pedoman `design-taste-frontend` dan `awesome-design-md`:
  Metrik angka (metrics track) dibuat untuk menampilkan data numerik faktual (misal: 7 Video, 7 Mata Pelajaran, 7 Dewan Guru). Menyisipkan angka "100%" dengan label slogan pemasaran (*"Bebas Iklan & Terarah"*) di samping data riil adalah trik klise AI untuk mengisi kekosongan kolom grid (filler card/slop metric).
* **Solusi:**
  Hapus kolom 100% tersebut atau ganti dengan metrik progres riil siswa yang dihitung dinamis:
  ```html
  <div class="stat-item">
    <span class="stat-number" id="statCompletedVideos">0</span>
    <span class="stat-label">Materi Telah Kamu Selesaikan</span>
  </div>
  ```

---

### 3.3. [AI Tell 3] Banner Monumen Megah di Footer (`SMPN 7 TANGSEL × INFORMATIKA UNPAM`)
* **Temuan di Kode:** `index.html` (baris 1106–1112)
  ```html
  <div class="footer-statement-banner">
    <div class="footer-monument-stack">
      <span class="footer-monument-line">SMPN 7 TANGSEL</span>
      <span class="footer-monument-cross">×</span>
      <span class="footer-monument-line">INFORMATIKA UNPAM</span>
    </div>
  </div>
  ```
* **Mengapa Terlihat AI Slop?**
  Pola ini disalin dari tren tipografi poster brutalist/editorial di Awwwards (yang diadopsi oleh tasteskill direction `monument-statement`). Namun, ketika diterapkan pada sebuah **situs resmi sekolah menengah pertama negeri di Indonesia**, tipografi raksasa dengan tanda silang kolaborasi (`BRAND × BRAND`) terasa sangat ganjil, janggal, dan tidak mencerminkan identitas scholastic institusi pendidikan formal.
* **Solusi:**
  Ganti dengan tanda kemitraan resmi yang bersahaja dan proporsional:
  Gunakan layout dua kolom resmi: Kiri memuat nama sekolah dan alamat dinas, kanan memuat surat kemitraan PkM Prodi Teknik Informatika UNPAM dengan logo universitas dan nomor SK pengabdian masyarakat.

---

### 3.4. [AI Tell 4] Anarki Skala Tipografi (Terdeteksi 12 Ukuran Font)
* **Temuan di Audit Inspector:** Berkas `.taste-skill/inspect/report.json` mencatat peringatan resmi:
  > *"12 different font sizes (12, 13, 14, 15, 16, 17, 18, 20, 24, 44, 48, 52). A page needs about five: display, heading, lead, body, small."*
* **Mengapa Terlihat AI Slop?**
  AI cenderung membuat kelas CSS ad-hoc dengan ukuran font sembarangan (misal: font 13px, font 15px, font 17px, font 44px) setiap kali membuat komponen baru, alih-alih merujuk pada skala modular desain sistem. Hal ini menyebabkan ritme vertikal halaman terasa tidak harmonis saat discroll.
* **Solusi:**
  Kunci skala tipografi hanya ke dalam 5 token baku di `css/design-system.css`:
  - `--text-display`: `36px` (hanya untuk judul utama katalog/hero desktop)
  - `--text-h1`: `24px` (judul seksi dan nama halaman tonton)
  - `--text-h2`: `18px` (judul kartu video dan sub-seksi)
  - `--text-body`: `16px` (seluruh teks isi bacaan, tabel guru, dan deskripsi)
  - `--text-caption`: `13px` (label tanggal, durasi, dan badge)

---

### 3.5. [AI Tell 5] Format FAQ Tumpuk Bergaya Brosur Startup (Band-per-Question)
* **Temuan di Kode:** `index.html` (baris 250–332)
  Menampilkan 4 blok band horizontal warna berselang-seling (`faq-band-alt-1` dan `faq-band-alt-2`) dengan tag chip (`Fokus Belajar`, `Akses Fleksibel`, `Diferensiasi Belajar`, `Kemudahan Guru`).
* **Mengapa Terlihat AI Slop?**
  Pertanyaan dan jawabannya berbunyi sangat formalistik dan terkesan seperti teks laporan pertanggungjawaban yang dipaksakan masuk ke beranda siswa (misalnya: *"Bagaimana platform mengakomodasi keberagaman gaya belajar siswa?"*). Siswa SMP tidak membaca teks teori diferensiasi belajar semacam ini di beranda depan.
* **Solusi:**
  Ubah bagian ini menjadi **Panduan Cepat Belajar untuk Siswa & Guru** dengan tata letak ringkas 3 kolom langkah (misal: *"1. Pilih Kelas & Mapel"*, *"2. Tonton Penjelasan Guru & Ulangi Menit Sulit"*, *"3. Kerjakan Latihan Mandiri"*). Simpan penjelasan metodologi PkM di halaman terpisah atau dokumen proposal.

---

### 3.6. [AI Tell 6] Inkonsistensi Desain Antar Berkas (Design Token Drift)
* **Temuan:**
  - `DESIGN.md` mendefinisikan warna primer `#122B5C`, aksen `#D97706`.
  - `css/design-system.css` mendefinisikan aksen `#b45309`, background `#f8fafc`.
  - `portal-guru-form.html` mendefinisikan warna `#00163f`, secondary `#904d00`, dan surface `#f7f9fb`.
* **Kelemahan:**
  Ketidaksinkronan ini membuktikan bahwa beberapa bagian kode dibuat secara terpisah oleh prompt AI yang berbeda tanpa ada satu sumber kebenaran (Single Source of Truth) yang konsisten.
* **Solusi:**
  Pusatkan semua warna dan variabel ke `css/design-system.css` dan hapus variabel Tailwind yang bertabrakan di berkas mockup.

---

## 🛠️ BAGIAN 4: PANDUAN SOLUSI & REMEDIASI KODE DETAIL

Berikut adalah ringkasan solusi teknis yang siap Anda eksekusi saat fase perbaikan nanti:

### 1. Remediasi Keamanan Google OAuth & Server
```javascript
// Ganti getGoogleOAuthConfig di server.js dan api/youtube-init.js dengan pembacaan murni ENV:
function getGoogleOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:8877",
    channelEmail: process.env.GOOGLE_CHANNEL_EMAIL
  };
}
```
* **Langkah:** Tambahkan `google-oauth-config.json` dan `*token*.json` ke `.gitignore`, dan hapus berkas-berkas tersebut dari riwayat Git jika pernah ter-track.

### 2. Membatasi Static File Serving di `server.js`
```javascript
// Hanya izinkan akses file di dalam subdirektori publik dan tolak file sensitif:
const PUBLIC_DIR = path.join(ROOT_DIR, "public"); // atau buat whitelist file
if (pathname.endsWith(".json") || pathname.endsWith(".md") || pathname.includes("server.js")) {
  res.writeHead(403, { "Content-Type": "text/plain" });
  return res.end("Akses ke berkas sistem dilarang.");
}
```

### 3. Menghapus `eval()` pada `/api/reset`
```javascript
// Simpan initial data murni di data/initial-videos.json:
if (pathname === "/api/reset" && method === "POST") {
  const initialPath = path.join(ROOT_DIR, "data", "initial-videos.json");
  const defaultData = JSON.parse(fs.readFileSync(initialPath, "utf8"));
  writeVideos(defaultData);
  return sendJson(res, 200, { success: true, count: defaultData.length, data: defaultData });
}
```

### 4. Memperbaiki DOM XSS di `js/app.js` & `js/player.js`
Gunakan event delegation dengan `dataset`:
```javascript
// Alih-alih: onclick="App.openVideoById('${v.id}')"
// Gunakan:
`<article class="video-card" data-video-id="${escapeHtml(v.id)}">`
// Lalu di event listener container:
gridContainer.addEventListener("click", (e) => {
  const card = e.target.closest("[data-video-id]");
  if (card) App.openVideoById(card.dataset.videoId);
});
```

### 5. Mengaktifkan Row Level Security (RLS) di Supabase
Jalankan query SQL ini di Supabase SQL Editor:
```sql
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Publik (Siswa & Guru) hanya boleh membaca:
CREATE POLICY "Public Read Access" ON videos
  FOR SELECT USING (true);

-- Hanya pengguna terautentikasi (Dewan Guru) yang boleh memodifikasi:
CREATE POLICY "Teacher Write Access" ON videos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
```

---

## 📊 BAGIAN 5: MATRIKS PRIORITAS TINDAKAN (ACTION PLAN)

| Prioritas | Masalah | Tindakan Perbaikan | Estimasi Waktu |
| :---: | :--- | :--- | :---: |
| 🔴 **P0 (Urgent)** | Secret OAuth & Token YouTube bocor di disk | Revoke kredensial di Google Cloud Console, pindahkan ke `.env`, hapus file token dari public root. | 30 Menit |
| 🔴 **P0 (Urgent)** | Static file server mengekspos semua file proyek | Pasang pencegah akses file `.json`, `.md`, `.env` di `server.js` dan perbaiki `vercel.json`. | 20 Menit |
| 🟠 **P1 (High)** | Endpoint delete YouTube tanpa autentikasi | Pasang proteksi password / secret token pada endpoint `/api/youtube-delete` dan `/api/videos`. | 45 Menit |
| 🟠 **P1 (High)** | Bahaya `eval()` di `server.js` | Ganti pembacaan `eval(data.js)` dengan `JSON.parse("initial-videos.json")`. | 15 Menit |
| 🟡 **P2 (Medium)** | Kerentanan DOM XSS pada interpolasi string | Lakukan escaping pada semua atribut HTML dan gunakan event listener delegasi untuk `v.id`. | 45 Menit |
| 🟡 **P2 (Medium)** | AI Slop pada Hero, Metrik, & Footer | Hapus teks dual-tone hero, hapus metrik fiktif 100%, ganti footer monumen raksasa dengan footer resmi sekolah. | 30 Menit |
| 🟢 **P3 (Low)** | Berkas duplikat `portal-guru-form.html` | Rapikan dan arsipkan berkas mockup yang tidak terpakai agar struktur repositori bersih. | 10 Menit |

---
*Laporan ini disusun secara independen dan objektif untuk memastikan prototipe PkM UPTD SMP Negeri 7 Tangerang Selatan siap secara teknis, aman dari eksploitasi, dan memiliki kualitas desain antarmuka yang bernas dan berwibawa.*


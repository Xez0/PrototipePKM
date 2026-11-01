/* ==========================================================================
   MANAJEMEN DATA, INDEXEDDB VIDEO, & AUTENTIKASI GURU
   UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN
   Penyimpanan Video (IndexedDB untuk File Lokal & LocalStorage untuk Metadata),
   Autentikasi Dewan Guru, Catatan Belajar Siswa, & Pelacak Progres
   ========================================================================== */

const STORAGE_KEYS = {
  VIDEOS: "smpn7_repo_videos_v6",
  STUDENT_NOTES: "smpn7_repo_student_notes_v4",
  WATCH_PROGRESS: "smpn7_repo_watch_progress_v4",
  THEME_PREF: "smpn7_repo_theme_pref_v4",
  TEACHER_SESSION: "smpn7_teacher_session_v4"
};

// ==========================================================================
// 1. INDEXEDDB MANAGER (UNTUK FILE VIDEO ASLI DARI KOMPUTER GURU)
// ==========================================================================
const VideoDB = {
  dbName: "SMPN7_VideoStorageDB",
  storeName: "video_blobs",
  dbPromise: null,

  // Buka atau Buat Database IndexedDB
  getDB: function () {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => {
        console.error("Gagal membuka IndexedDB:", e);
        reject(e);
      };
    });

    return this.dbPromise;
  },

  // Simpan File Video Binary (Blob / File)
  saveVideoFile: async function (id, file) {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.put({ id, file, updated: Date.now() });

        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e);
      });
    } catch (err) {
      console.error("Gagal menyimpan file video ke IndexedDB:", err);
      return false;
    }
  },

  // Ambil File Video Binary untuk Diputar di Browser
  getVideoFile: async function (id) {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.get(id);

        req.onsuccess = () => {
          if (req.result && req.result.file) {
            resolve(req.result.file);
          } else {
            resolve(null);
          }
        };
        req.onerror = (e) => reject(e);
      });
    } catch (err) {
      console.error("Gagal mengambil file video dari IndexedDB:", err);
      return null;
    }
  },

  // Hapus File Video dari IndexedDB saat Materi Dihapus
  deleteVideoFile: async function (id) {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.delete(id);

        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e);
      });
    } catch (err) {
      console.error("Gagal menghapus file video dari IndexedDB:", err);
      return false;
    }
  }
};
window.VideoDB = VideoDB;

// ==========================================================================
// 2. AUTHENTICATION MANAGER (KHUSUS DEWAN GURU SMPN 7)
// ==========================================================================
const AuthManager = {
  TEACHER_SECRET_TOKEN: "smpn7-guru-auth-token-2026",

  // Akun Resmi Terdaftar Dewan Guru
  teachers: [
    {
      id: "budi",
      name: "Budi Santoso, S.Kom.",
      nip: "19840915 200902 1 003",
      email: "budi.santoso@smpn7tangsel.sch.id",
      subject: "Informatika",
      role: "Dewan Guru SMPN 7 Tangsel",
      validPasswords: ["guru7smpn", "budi123", "smpn7tangsel"]
    },
    {
      id: "hadi",
      name: "Hadi",
      nip: "19850612 201001 1 008",
      email: "hadi@smpn7tangsel.sch.id",
      subject: "Informatika",
      role: "Dewan Guru SMPN 7 Tangsel",
      validPasswords: ["guru7smpn", "hadi123", "smpn7tangsel"]
    }
  ],

  // Fallback master password untuk seluruh dewan guru sekolah jika login via NIP terdaftar
  masterPasswords: ["guru7smpn", "smpn7tangsel", "unpam2026"],

  // Helper Format NIP Standar Indonesia (18 Digit: YYYYMMDD YYYYMM X XXX)
  formatNip: function (input) {
    if (!input) return "";
    const clean = input.replace(/\D/g, "");
    if (clean.length === 18) {
      return `${clean.slice(0, 8)} ${clean.slice(8, 14)} ${clean.slice(14, 15)} ${clean.slice(15)}`;
    }
    return input.trim();
  },

  isLoggedIn: function () {
    const raw = sessionStorage.getItem(STORAGE_KEYS.TEACHER_SESSION);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      return !!(data && data.token === this.TEACHER_SECRET_TOKEN);
    } catch (e) {
      return false;
    }
  },

  getTeacher: function () {
    const raw = sessionStorage.getItem(STORAGE_KEYS.TEACHER_SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  getAuthToken: function () {
    const teacher = this.getTeacher();
    return (teacher && teacher.token) ? teacher.token : this.TEACHER_SECRET_TOKEN;
  },

  login: function (identifier, password) {
    const rawId = (identifier || "").trim();
    const id = rawId.toLowerCase();
    const cleanDigits = rawId.replace(/\D/g, "");
    const pass = (password || "").trim();

    if (!rawId) {
      return { success: false, message: "Nomor NIP, Nama Akun, atau Email Guru wajib diisi." };
    }
    if (!pass) {
      return { success: false, message: "Kata sandi atau PIN guru wajib diisi." };
    }

    // Cari akun guru yang cocok
    let matchedTeacher = this.teachers.find(t => 
      t.id === id || 
      t.nip.replace(/\D/g, "") === cleanDigits || 
      t.email.toLowerCase() === id ||
      t.name.toLowerCase() === id
    );

    // Jika tidak ditemukan di akun spesifik, periksa apakah NIP valid 18 digit
    if (!matchedTeacher && cleanDigits.length === 18) {
      matchedTeacher = {
        name: "Dewan Guru SMPN 7",
        nip: this.formatNip(cleanDigits),
        email: `guru.${cleanDigits.slice(0, 8)}@smpn7tangsel.sch.id`,
        subject: "Mata Pelajaran",
        role: "Dewan Guru SMPN 7 Tangsel",
        validPasswords: this.masterPasswords
      };
    }

    if (!matchedTeacher) {
      return { 
        success: false, 
        message: "Akun guru tidak terdaftar. Masukkan NIP terdaftar (19840915 200902 1 003) atau akun demo 'hadi'." 
      };
    }

    // Verifikasi kata sandi / PIN
    const isValidPass = (matchedTeacher.validPasswords && matchedTeacher.validPasswords.includes(pass)) ||
                        this.masterPasswords.includes(pass);

    if (!isValidPass) {
      return { 
        success: false, 
        message: "Kata sandi atau PIN salah. Silakan coba kembali (Sandi resmi: guru7smpn)." 
      };
    }

    const sessionData = {
      name: matchedTeacher.name,
      nip: matchedTeacher.nip,
      email: matchedTeacher.email,
      subject: matchedTeacher.subject,
      role: matchedTeacher.role,
      token: this.TEACHER_SECRET_TOKEN,
      loginTime: new Date().toISOString()
    };

    sessionStorage.setItem(STORAGE_KEYS.TEACHER_SESSION, JSON.stringify(sessionData));
    return { success: true, teacher: sessionData };
  },

  // Masuk Instan (Khusus Akun Demo Guru: Hadi)
  loginFastDemo: function () {
    const hadi = this.teachers.find(t => t.id === "hadi") || this.teachers[0];
    const sessionData = {
      name: hadi.name,
      nip: hadi.nip,
      email: hadi.email,
      subject: hadi.subject,
      role: hadi.role,
      token: this.TEACHER_SECRET_TOKEN,
      isDemo: true,
      loginTime: new Date().toISOString()
    };
    sessionStorage.setItem(STORAGE_KEYS.TEACHER_SESSION, JSON.stringify(sessionData));
    return { success: true, teacher: sessionData };
  },

  logout: function () {
    sessionStorage.removeItem(STORAGE_KEYS.TEACHER_SESSION);
    return true;
  }
};
window.AuthManager = AuthManager;


// ==========================================================================
// 3. REPO STORAGE (METADATA VIDEO & FITUR BELAJAR SISWA)
// ==========================================================================
const RepoStorage = {
  isServerOnline: false,

  SUPABASE_CONFIG: {
    url: "https://cblawulqssslvjtpygmw.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGF3dWxxc3NzbHZqdHB5Z213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjc4NjksImV4cCI6MjEwODk0Mzg2OX0.m5xcLaybO1JlVXNRx8hIoWz-AIC9yIbE4z8ov6W0nIE"
  },
  supabaseClient: null,

  // Inisialisasi Sinkronisasi Cloud Supabase & Realtime
  initSupabase: async function () {
    if (this.supabaseClient) {
      return await this.fetchFromSupabase();
    }
    if (window.supabase && typeof window.supabase.createClient === "function") {
      try {
        this.supabaseClient = window.supabase.createClient(
          this.SUPABASE_CONFIG.url,
          this.SUPABASE_CONFIG.anonKey
        );
        const cloudVideos = await this.fetchFromSupabase();
        this.subscribeRealtime();
        if (cloudVideos) return cloudVideos;
      } catch (err) {
        console.warn("[SUPABASE] Inisialisasi client gagal:", err);
      }
    }
    return null;
  },

  // Ambil Data Terkini dari Supabase Cloud
  fetchFromSupabase: async function () {
    if (!this.supabaseClient) {
      if (window.supabase && typeof window.supabase.createClient === "function") {
        this.supabaseClient = window.supabase.createClient(
          this.SUPABASE_CONFIG.url,
          this.SUPABASE_CONFIG.anonKey
        );
      } else {
        return null;
      }
    }
    try {
      const { data, error } = await this.supabaseClient
        .from("videos")
        .select("*")
        .order("publishedAt", { ascending: false });

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          const enrichedData = data.map(v => {
            const isSchool = (v.sourceType === "youtube_upload" || v.sourceType === "local" || v.uploadedBySchool === true);
            return {
              ...v,
              uploadedBySchool: isSchool,
              uploadMethod: isSchool ? "file_upload" : "url_embed"
            };
          });
          this.isServerOnline = true;
          this.saveVideos(enrichedData);
          this.updateSyncUI("online");
          return enrichedData;
        } else if (window.INITIAL_VIDEO_DATA && window.INITIAL_VIDEO_DATA.length > 0) {
          // Hanya jika tabel cloud kosong pertama kali (0 baris), inisialisasi materi kurikulum awal
          console.log("[SUPABASE SEED] Tabel cloud kosong, melakukan inisialisasi materi otomatis...");
          try {
            const cleanAll = window.INITIAL_VIDEO_DATA.map(v => this.cleanPayloadForSupabase(v));
            await this.supabaseClient.from("videos").insert(cleanAll);
            this.isServerOnline = true;
            this.saveVideos(window.INITIAL_VIDEO_DATA);
            this.updateSyncUI("online");
            return window.INITIAL_VIDEO_DATA;
          } catch (seedAllErr) {
            console.warn("[SUPABASE SEED ERROR]:", seedAllErr);
          }
        }
      }
    } catch (err) {
      console.warn("[SUPABASE] Gagal mengambil data materi dari cloud:", err);
    }
    return null;
  },

  // Berlangganan (Subscribe) Realtime Multi-Device
  subscribeRealtime: function () {
    if (!this.supabaseClient) return;
    try {
      this.supabaseClient
        .channel("public:videos")
        .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, async (payload) => {
          console.log("[SUPABASE REALTIME] Perubahan data multi-device:", payload.eventType);
          await this.fetchFromSupabase();
          if (window.App) {
            if (typeof App.renderStats === "function") App.renderStats();
            if (typeof App.renderVideoGrid === "function") App.renderVideoGrid();
            if (typeof App.renderTeacherTable === "function") App.renderTeacherTable();
            if (typeof App.initFeaturedRotation === "function") App.initFeaturedRotation();
          }
        })
        .subscribe();
    } catch (err) {
      console.warn("[SUPABASE] Gagal mengaktifkan realtime channel:", err);
    }
  },

  // Cek Status & Sinkronisasi Data Otomatis dari Backend Server / Supabase
  syncWithBackend: async function () {
    // Cek status ketersediaan server backend Node.js (untuk unggah berkas fisik)
    try {
      const statusRes = await fetch("/api/status", { method: "GET", cache: "no-store" });
      if (statusRes.ok) {
        const statusJson = await statusRes.json().catch(() => ({}));
        this.isServerOnline = (statusJson.status === "online" && statusJson.canUploadFiles !== false);
      } else {
        this.isServerOnline = false;
      }
    } catch (e) {
      this.isServerOnline = false;
    }

    // 1. Coba sinkronkan dengan Supabase Cloud (Prioritas Utama untuk multi-device realtime)
    const supabaseData = await this.initSupabase();
    if (supabaseData) {
      this.updateSyncUI(this.isServerOnline ? "online" : "offline");
      return supabaseData;
    }

    // 2. Fallback jika ada server internal Node.js
    if (this.isServerOnline) {
      try {
        const res = await fetch("/api/videos", { method: "GET", cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if ((json.success || json.status === "ok") && Array.isArray(json.data) && json.data.length > 0) {
            this.saveVideos(json.data);
            this.updateSyncUI("online");
            return json.data;
          }
        }
      } catch (e) {}
    }

    this.updateSyncUI("offline");
    return this.getVideos();
  },

  updateSyncUI: function (status) {
    const badge = document.getElementById("serverSyncBadge");
    const dot = document.getElementById("syncDotIndicator");
    const text = document.getElementById("syncStatusText");
    if (!badge || !dot || !text) return;

    if (status === "online") {
      dot.className = "sync-dot online";
      text.textContent = "Tersimpan Otomatis di Server Sekolah";
      badge.title = "Data materi terhubung aktif dan tersimpan permanen di server sekolah";
    } else {
      dot.className = "sync-dot offline";
      text.textContent = "Mode Mandiri (Tersimpan Lokal)";
      badge.title = "Server sedang offline atau diakses langsung, data tersimpan di peramban ini";
    }
  },

  // Inisialisasi Data Video
  getVideos: function () {
    const raw = localStorage.getItem(STORAGE_KEYS.VIDEOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(INITIAL_VIDEO_DATA));
      return INITIAL_VIDEO_DATA;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_VIDEO_DATA;
    } catch (e) {
      console.error("Gagal membaca data video lokal:", e);
      return INITIAL_VIDEO_DATA;
    }
  },

  // Ambil Satu Video Berdasarkan ID
  getVideoById: function (id) {
    if (!id) return null;
    const list = this.getVideos();
    return list.find(v => v.id === id) || null;
  },

  // Simpan Seluruh Array Video
  saveVideos: function (videos) {
    try {
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
      return true;
    } catch (e) {
      console.error("Gagal menyimpan ke LocalStorage:", e);
      return false;
    }
  },

  // Format Tanggal dan Hari Bahasa Indonesia (Contoh: Rabu, 21 Okt 2026)
  formatDate: function (dateStr) {
    if (!dateStr) return "Terbaru";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  },

  // Format Tanggal, Hari, dan Jam Lengkap (Contoh: Rabu, 21 Okt 2026 14:30 WIB)
  formatDateTime: function (dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${hours}:${minutes} WIB`;
  },

  // Sanitasi Objek agar Sesuai Skema Tabel 'videos' Supabase (Cegah error PGRST204)
  cleanPayloadForSupabase: function (videoObj) {
    const allowed = [
      "id", "title", "grade", "subject", "category", "teacher", "teacherNip",
      "duration", "embedUrl", "thumbnail", "sourceType", "publishedAt",
      "description", "learningOutcome", "pdfContent", "chapters", "quizUrl"
    ];
    const clean = {};
    for (const key of allowed) {
      if (videoObj[key] !== undefined && videoObj[key] !== null) {
        clean[key] = videoObj[key];
      }
    }
    if (!clean.category) clean.category = "Umum";
    if (!clean.learningOutcome) clean.learningOutcome = "";
    if (!clean.pdfContent) clean.pdfContent = "";
    if (!clean.quizUrl) clean.quizUrl = "";
    if (!Array.isArray(clean.chapters)) clean.chapters = [];
    return clean;
  },

  // Tambah Video Baru (Mendukung File Lokal & Tautan YouTube)
  addVideo: async function (newVideo, videoFile = null) {
    const videoId = "smpn7-" + Date.now().toString(36);

    let videoWithId = {
      ...newVideo,
      id: videoId,
      publishedAt: newVideo.publishedAt || new Date().toISOString()
    };

    // Jika sumber bukan youtube dan file lokal disertakan
    if (newVideo.sourceType !== "youtube" && newVideo.sourceType !== "youtube_upload" && videoFile && videoFile instanceof Blob) {
      videoWithId.sourceType = "local";
      videoWithId.uploadedBySchool = true;
      videoWithId.uploadMethod = "file_upload";
      videoWithId.fileName = videoFile.name || "video-materi.mp4";
      videoWithId.fileSize = (videoFile.size / (1024 * 1024)).toFixed(1) + " MB";
      
      // Validasi: Berkas video komputer WAJIB berhasil diunggah ke server repositori backend
      // agar berkas fisiknya dapat diakses oleh siswa di perangkat lain (HP / Laptop)
      let uploadSuccess = false;
      const formData = new FormData();
      formData.append("file", videoFile, videoFile.name || "video-materi.mp4");

      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + AuthManager.getAuthToken()
          },
          body: formData
        });

        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          if (uploadJson.success && uploadJson.url) {
            videoWithId.embedUrl = uploadJson.url;
            uploadSuccess = true;
          } else {
            throw new Error(uploadJson.error || "Gagal memperoleh tautan berkas dari server.");
          }
        } else {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || `Server repositori menolak unggahan (HTTP ${uploadRes.status}).`);
        }
      } catch (err) {
        console.error("[UPLOAD DITOLAK]:", err.message || err);
        throw new Error(err.message || "Server offline: Berkas video hanya bisa diunggah saat server aktif. Gunakan Tautan YouTube.");
      }

      if (!uploadSuccess || !videoWithId.embedUrl) {
        throw new Error("Gagal mengunggah berkas video ke server repositori sekolah. Pastikan server backend SMPN 7 aktif.");
      }

      // Berhasil diunggah ke server: simpan salinan di IndexedDB untuk cache lokal perangkat guru
      try {
        await VideoDB.saveVideoFile(videoId, videoFile);
      } catch (e) {
        console.warn("[INDEXEDDB] Gagal simpan cache lokal guru:", e);
      }
    } else if (newVideo.sourceType === "youtube_upload") {
      videoWithId.sourceType = "youtube_upload";
      videoWithId.uploadedBySchool = true;
      videoWithId.uploadMethod = "file_upload";
    } else {
      videoWithId.sourceType = "youtube";
      videoWithId.uploadedBySchool = false;
      videoWithId.uploadMethod = "url_embed";
    }

    // Pastikan Supabase client siap sebelum simpan
    if (!this.supabaseClient) {
      await this.initSupabase();
    }

    // Simpan ke Supabase Cloud jika client aktif (Tersinkron ke SEMUA pengguna secara realtime)
    if (this.supabaseClient) {
      try {
        const cleanPayload = this.cleanPayloadForSupabase(videoWithId);
        const { error } = await this.supabaseClient.from("videos").insert([cleanPayload]);
        if (error) {
          console.error("[SUPABASE CLOUD ERROR]:", error.message || error);
        } else {
          console.log("[SUPABASE CLOUD SUCCESS] Video tersimpan secara realtime untuk semua orang:", videoId);
        }
      } catch (err) {
        console.error("[SUPABASE EXCEPTION]:", err);
      }
    }

    // Simpan ke Backend lokal jika server online
    if (this.isServerOnline) {
      try {
        await fetch("/api/videos", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer " + AuthManager.getAuthToken()
          },
          body: JSON.stringify(videoWithId)
        });
      } catch (err) {
        console.warn("[SYNC] Gagal POST ke /api/videos, fallback lokal:", err);
      }
    }

    const videos = this.getVideos();
    videos.unshift(videoWithId);
    this.saveVideos(videos);
    return videoWithId;
  },

  // Perbarui Video yang Ada
  updateVideo: async function (id, updatedData, videoFile = null) {
    let videos = this.getVideos();
    const index = videos.findIndex(v => v.id === id);
    if (index === -1) return false;

    let mergedData = { ...updatedData };

    if (videoFile && videoFile instanceof Blob) {
      mergedData.sourceType = "local";
      mergedData.fileName = videoFile.name || "video-materi.mp4";
      mergedData.fileSize = (videoFile.size / (1024 * 1024)).toFixed(1) + " MB";

      let uploadSuccess = false;
      const formData = new FormData();
      formData.append("file", videoFile, videoFile.name || "video-materi.mp4");

      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + AuthManager.getAuthToken()
          },
          body: formData
        });

        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          if (uploadJson.success && uploadJson.url) {
            mergedData.embedUrl = uploadJson.url;
            uploadSuccess = true;
          } else {
            throw new Error(uploadJson.error || "Gagal memperoleh tautan berkas dari server.");
          }
        } else {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || `Server menolak unggahan berkas (HTTP ${uploadRes.status}).`);
        }
      } catch (err) {
        console.error("[UPDATE FILE REJECTED]:", err.message || err);
        throw new Error(err.message || "Server repositori sekolah sedang offline. Berkas video tidak dapat diperbarui saat offline.");
      }

      if (!uploadSuccess || !mergedData.embedUrl) {
        throw new Error("Gagal mengunggah pembaruan berkas video ke server repositori sekolah.");
      }

      try {
        await VideoDB.saveVideoFile(id, videoFile);
      } catch (e) {
        console.warn("[INDEXEDDB] Gagal simpan cache lokal guru:", e);
      }
    }

    const finalVideo = {
      ...videos[index],
      ...mergedData,
      id,
      updatedAt: new Date().toISOString()
    };

    // Pastikan Supabase client siap
    if (!this.supabaseClient) {
      await this.initSupabase();
    }

    // Perbarui di Supabase Cloud jika client aktif (Tersinkron ke SEMUA pengguna)
    if (this.supabaseClient) {
      try {
        const cleanPayload = this.cleanPayloadForSupabase(finalVideo);
        const { id: _ignoredId, ...updatePayload } = cleanPayload;
        const { error } = await this.supabaseClient.from("videos").update(updatePayload).eq("id", id);
        if (error) {
          console.error("[SUPABASE] Gagal perbarui video di cloud:", error.message || error);
        } else {
          console.log("[SUPABASE] Berhasil memperbarui data materi di cloud untuk semua pengguna:", id);
        }
      } catch (err) {
        console.error("[SUPABASE] Error update:", err);
      }
    }

    if (this.isServerOnline) {
      try {
        await fetch(`/api/videos/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + AuthManager.getAuthToken()
          },
          body: JSON.stringify(finalVideo)
        });
      } catch (err) {
        console.warn("[SYNC] Gagal PUT ke /api/videos, fallback lokal:", err);
      }
    }

    videos[index] = finalVideo;
    this.saveVideos(videos);
    return true;
  },

  // Hapus Video (Hapus dari Supabase, YouTube Channel jika milik sekolah, Backend, LocalStorage, dan IndexedDB)
  deleteVideo: async function (id, options = {}) {
    let videos = this.getVideos();
    const target = videos.find(v => v.id === id);
    if (target && target.sourceType === "local") {
      await VideoDB.deleteVideoFile(id);
    }

    // Periksa apakah video ini diunggah ke channel YouTube resmi sekolah kita
    // Video dari URL eksternal (bukan channel sekolah) TIDAK BOLEH dikirim ke API YouTube
    const isSchoolUpload = target && (
      target.sourceType === "youtube_upload" ||
      target.uploadedBySchool === true ||
      target.uploadMethod === "file_upload"
    );

    if (isSchoolUpload && target.embedUrl && !options.skipYouTube) {
      const ytId = this.extractYouTubeId(target.embedUrl);
      if (ytId) {
        console.log("[DELETE] Menghapus video dari channel YouTube resmi sekolah:", ytId);
        try {
          fetch("/api/youtube-delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + AuthManager.getAuthToken()
            },
            body: JSON.stringify({ youtubeVideoId: ytId })
          }).then(res => res.json()).then(resData => {
            if (resData && resData.success) {
              console.log("[YOUTUBE API] Video berhasil dihapus dari channel YouTube sekolah:", ytId);
            }
          }).catch(ytErr => {
            console.warn("[YOUTUBE API] Hapus video YouTube dilewati:", ytErr);
          });
        } catch (e) {}
      }
    } else {
      console.log("[DELETE] Materi bersumber dari tautan/URL eksternal, hanya dihapus dari database sekolah (tidak menyentuh YouTube).");
    }

    // Pastikan Supabase client siap
    if (!this.supabaseClient) {
      await this.initSupabase();
    }

    // Hapus dari Supabase Cloud jika client aktif
    if (this.supabaseClient) {
      try {
        const { error } = await this.supabaseClient.from("videos").delete().eq("id", id);
        if (error) console.warn("[SUPABASE] Gagal hapus video dari cloud:", error);
      } catch (err) {
        console.warn("[SUPABASE] Error delete:", err);
      }
    }

    if (this.isServerOnline) {
      try {
        await fetch(`/api/videos/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: {
            "Authorization": "Bearer " + AuthManager.getAuthToken()
          }
        });
      } catch (err) {
        console.warn("[SYNC] Gagal DELETE /api/videos:", err);
      }
    }

    videos = videos.filter(v => v.id !== id);
    this.saveVideos(videos);
    return true;
  },

  // Pulihkan Video yang Dihapus (Aksi Urungkan / Undo)
  restoreVideo: async function (video) {
    if (!video || !video.id) return false;
    let videos = this.getVideos();
    const exists = videos.some(v => v.id === video.id);
    if (!exists) {
      videos.unshift(video);
      this.saveVideos(videos);
      if (this.supabaseClient) {
        try {
          const clean = this.cleanPayloadForSupabase(video);
          await this.supabaseClient.from("videos").insert([clean]);
        } catch (e) {}
      }
      if (this.isServerOnline) {
        try {
          await fetch("/api/videos", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + AuthManager.getAuthToken()
            },
            body: JSON.stringify(video)
          });
        } catch (e) {}
      }
    }
    return true;
  },

  // Reset Kembali ke Data Standar SMPN 7
  resetToDefault: async function () {
    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from("videos").delete().neq("id", "none");
        await this.supabaseClient.from("videos").insert(INITIAL_VIDEO_DATA);
      } catch (e) {
        console.warn("[SUPABASE] Gagal reset cloud:", e);
      }
    }
    if (this.isServerOnline) {
      try {
        await fetch("/api/reset", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + AuthManager.getAuthToken()
          }
        });
      } catch (e) {}
    }
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(INITIAL_VIDEO_DATA));
    return INITIAL_VIDEO_DATA;
  },

  // Catatan Pribadi Siswa
  getStudentNotes: function (videoId) {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_NOTES);
    if (!raw) return "";
    try {
      const notes = JSON.parse(raw);
      return notes[videoId] || "";
    } catch (e) {
      return "";
    }
  },

  saveStudentNotes: function (videoId, text) {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_NOTES);
    let notes = {};
    if (raw) {
      try {
        notes = JSON.parse(raw);
      } catch (e) {
        notes = {};
      }
    }
    notes[videoId] = text;
    localStorage.setItem(STORAGE_KEYS.STUDENT_NOTES, JSON.stringify(notes));
    return true;
  },

  // Pelacakan Status Selesai Belajar
  isCompleted: function (videoId) {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS);
    if (!raw) return false;
    try {
      const progress = JSON.parse(raw);
      return !!progress[videoId];
    } catch (e) {
      return false;
    }
  },

  toggleCompleted: function (videoId) {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS);
    let progress = {};
    if (raw) {
      try {
        progress = JSON.parse(raw);
      } catch (e) {
        progress = {};
      }
    }
    progress[videoId] = !progress[videoId];
    localStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(progress));
    return progress[videoId];
  },

  getCompletedCount: function () {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS);
    if (!raw) return 0;
    try {
      const progress = JSON.parse(raw);
      return Object.values(progress).filter(Boolean).length;
    } catch (e) {
      return 0;
    }
  },

  // Preferensi Tema
  getTheme: function () {
    return localStorage.getItem(STORAGE_KEYS.THEME_PREF) || "light";
  },

  setTheme: function (theme) {
    localStorage.setItem(STORAGE_KEYS.THEME_PREF, theme);
    document.documentElement.setAttribute("data-theme", theme);
  },

  // Kalkulasi Statistik Hero & Progres
  getStatistics: function () {
    const videos = this.getVideos();
    const subjects = new Set(videos.map(v => v.subject));
    const teachers = new Set(videos.map(v => v.teacher));
    const completed = this.getCompletedCount();
    const percent = videos.length > 0 ? Math.round((completed / videos.length) * 100) : 0;

    return {
      totalVideos: videos.length,
      totalSubjects: subjects.size,
      totalTeachers: teachers.size,
      completedVideos: completed,
      progressPercent: percent
    };
  },

  // Helper Ekstraksi ID & URL Embed YouTube
  extractYouTubeId: function (url) {
    if (!url || typeof url !== "string") return "";
    const cleanUrl = url.trim();
    // Validasi domain YouTube yang sah
    const isYt = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(cleanUrl) || cleanUrl.includes("youtube-nocookie.com");
    if (!isYt) return "";

    let videoId = "";
    if (cleanUrl.includes("youtu.be/")) {
      videoId = cleanUrl.split("youtu.be/")[1].split("?")[0].split("&")[0];
    } else if (cleanUrl.includes("v=")) {
      try {
        const queryPart = cleanUrl.split("?")[1];
        if (queryPart) {
          const params = new URLSearchParams(queryPart);
          videoId = params.get("v") || "";
        }
      } catch (e) {
        videoId = "";
      }
    } else if (cleanUrl.includes("/embed/")) {
      videoId = cleanUrl.split("/embed/")[1].split("?")[0].split("&")[0];
    } else if (cleanUrl.includes("shorts/")) {
      videoId = cleanUrl.split("shorts/")[1].split("?")[0].split("&")[0];
    }
    videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
    return videoId.length >= 6 ? videoId : "";
  },

  formatVideoEmbedUrl: function (url) {
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`;
    }
    return url;
  },

  getThumbnailUrl: function (url, defaultImg) {
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return defaultImg || "assets/cover-matematika.svg";
  },

  // ==========================================================================
  // 4. CADANGAN & PEMULIHAN DATA RESMI SEKOLAH (JSON BACKUP / RESTORE)
  // ==========================================================================
  exportData: function () {
    try {
      const videos = this.getVideos();
      const exportPayload = {
        app: "Repositori Video Pembelajaran SMPN 7 Tangsel",
        version: "1.0",
        school: "UPTD SMP Negeri 7 Kota Tangerang Selatan",
        exportedAt: new Date().toISOString(),
        totalVideos: videos.length,
        videos: videos
      };
      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      a.href = url;
      a.download = `cadangan-materi-smpn7-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.App && typeof App.showToast === "function") {
        App.showToast("Cadangan data materi (JSON) berhasil diunduh.", "success");
      }
    } catch (err) {
      console.error("Gagal mengekspor data cadangan:", err);
      if (window.App && typeof App.showToast === "function") {
        App.showToast("Gagal mengekspor cadangan data.", "danger");
      }
    }
  },

  importData: function (file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsed = JSON.parse(content);
        let videoList = null;
        if (Array.isArray(parsed)) {
          videoList = parsed;
        } else if (parsed && Array.isArray(parsed.videos)) {
          videoList = parsed.videos;
        }

        if (!videoList || !Array.isArray(videoList) || videoList.length === 0) {
          throw new Error("Berkas JSON cadangan tidak memuat daftar video materi yang valid.");
        }

        // Validasi struktur minimal tiap item video
        const validVideos = videoList.filter(item => item && typeof item === "object" && item.id && item.title && item.subject);
        if (validVideos.length === 0) {
          throw new Error("Tidak ditemukan materi pembelajaran yang valid dalam berkas cadangan.");
        }

        this.saveVideos(validVideos);
        if (window.App) {
          App.showToast(`Berhasil memulihkan ${validVideos.length} materi dari cadangan!`, "success");
          if (typeof App.renderStats === "function") App.renderStats();
          if (typeof App.renderVideoGrid === "function") App.renderVideoGrid();
          if (typeof App.renderTeacherTable === "function") App.renderTeacherTable();
        }
      } catch (err) {
        console.error("Gagal memulihkan cadangan:", err);
        if (window.App && typeof App.showToast === "function") {
          App.showToast(err.message || "Gagal memproses berkas cadangan JSON.", "danger");
        }
      }
    };
    reader.onerror = () => {
      if (window.App && typeof App.showToast === "function") {
        App.showToast("Gagal membaca berkas cadangan dari perangkat Anda.", "danger");
      }
    };
    reader.readAsText(file);
  }
};
window.RepoStorage = RepoStorage;


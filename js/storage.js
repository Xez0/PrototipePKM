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

// ==========================================================================
// 2. AUTHENTICATION MANAGER (KHUSUS DEWAN GURU SMPN 7)
// ==========================================================================
const AuthManager = {
  // Akun Demo Faktual untuk Peninjau & Dewan Guru SMPN 7 Tangsel
  defaultTeacher: {
    name: "Tri Elmania, S.Pd.",
    nip: "19800512 200604 2 018",
    email: "tri.elmania@smpn7tangsel.sch.id",
    subject: "Matematika",
    role: "Guru Mata Pelajaran Matematika"
  },

  isLoggedIn: function () {
    const raw = sessionStorage.getItem(STORAGE_KEYS.TEACHER_SESSION);
    return !!raw;
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

  login: function (identifier, password) {
    // Validasi ramah untuk keperluan prototipe sekolah:
    // Boleh menggunakan NIP sekolah, email guru, atau password demo 'guru123' / '123456'
    const id = (identifier || "").trim().toLowerCase();
    const pass = (password || "").trim();

    if (!id) {
      return { success: false, message: "NIP atau Email Guru harus diisi." };
    }

    let teacherData = { ...this.defaultTeacher };
    if (id.includes("@")) {
      teacherData.email = id;
    } else if (id.replace(/\s+/g, "").length >= 8) {
      teacherData.nip = identifier;
    }

    sessionStorage.setItem(STORAGE_KEYS.TEACHER_SESSION, JSON.stringify(teacherData));
    return { success: true, teacher: teacherData };
  },

  loginFastDemo: function () {
    sessionStorage.setItem(STORAGE_KEYS.TEACHER_SESSION, JSON.stringify(this.defaultTeacher));
    return { success: true, teacher: this.defaultTeacher };
  },

  logout: function () {
    sessionStorage.removeItem(STORAGE_KEYS.TEACHER_SESSION);
    return true;
  }
};

// ==========================================================================
// 3. STORAGE MANAGER (METADATA VIDEO & FITUR BELAJAR SISWA)
// ==========================================================================
const StorageManager = {
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

  // Tambah Video Baru (Mendukung File Lokal & Tautan YouTube)
  addVideo: async function (newVideo, videoFile = null) {
    const videos = this.getVideos();
    const videoId = "smpn7-" + Date.now().toString(36);

    const videoWithId = {
      ...newVideo,
      id: videoId,
      publishedAt: newVideo.publishedAt || new Date().toISOString()
    };

    // Jika guru mengunggah file video langsung dari komputer
    if (videoFile && videoFile instanceof Blob) {
      videoWithId.sourceType = "local";
      videoWithId.fileName = videoFile.name || "video-materi.mp4";
      videoWithId.fileSize = (videoFile.size / (1024 * 1024)).toFixed(1) + " MB";
      // Simpan file binary di IndexedDB
      await VideoDB.saveVideoFile(videoId, videoFile);
    } else {
      videoWithId.sourceType = "youtube";
    }

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
      await VideoDB.saveVideoFile(id, videoFile);
    }

    videos[index] = {
      ...videos[index],
      ...mergedData,
      id,
      updatedAt: new Date().toISOString()
    };
    this.saveVideos(videos);
    return true;
  },

  // Hapus Video (Hapus dari LocalStorage dan IndexedDB)
  deleteVideo: async function (id) {
    let videos = this.getVideos();
    const target = videos.find(v => v.id === id);
    if (target && target.sourceType === "local") {
      await VideoDB.deleteVideoFile(id);
    }

    videos = videos.filter(v => v.id !== id);
    this.saveVideos(videos);
    return true;
  },

  // Reset Kembali ke Data Standar SMPN 7
  resetToDefault: function () {
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
    if (!url) return "";
    let videoId = "";
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0].split("&")[0];
    } else if (url.includes("v=")) {
      const params = new URLSearchParams(url.split("?")[1]);
      videoId = params.get("v") || "";
    } else if (url.includes("/embed/")) {
      videoId = url.split("/embed/")[1].split("?")[0].split("&")[0];
    } else if (url.includes("shorts/")) {
      videoId = url.split("shorts/")[1].split("?")[0].split("&")[0];
    }
    return videoId.trim();
  },

  formatVideoEmbedUrl: function (url) {
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`;
    }
    return url;
  },

  getThumbnailUrl: function (url, defaultImg) {
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return defaultImg || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=640&q=80";
  }
};

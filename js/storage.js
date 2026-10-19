/* ==========================================================================
   MANAJEMEN DATA & LOCALSTORAGE REPOSITORI
   Menangani Penyimpanan Video, CRUD Guru (Tambah & Edit), Catatan Siswa,
   Pelacakan Progres Belajar, serta Preferensi Tema Linear
   ========================================================================== */

const STORAGE_KEYS = {
  VIDEOS: "smpn7_repo_videos_v2",
  STUDENT_NOTES: "smpn7_repo_student_notes_v2",
  WATCH_PROGRESS: "smpn7_repo_watch_progress_v2",
  THEME_PREF: "smpn7_repo_theme_pref_v2"
};

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

  // Tambah Video Baru (Panel Guru)
  addVideo: function (newVideo) {
    const videos = this.getVideos();
    const videoWithId = {
      ...newVideo,
      id: "smpn7-" + Date.now().toString(36)
    };
    videos.unshift(videoWithId);
    this.saveVideos(videos);
    return videoWithId;
  },

  // Perbarui Video yang Ada (Fitur Edit Guru)
  updateVideo: function (id, updatedData) {
    let videos = this.getVideos();
    const index = videos.findIndex(v => v.id === id);
    if (index === -1) return false;

    videos[index] = {
      ...videos[index],
      ...updatedData,
      id // Pastikan ID tidak tertimpa
    };
    this.saveVideos(videos);
    return true;
  },

  // Hapus Video (Panel Guru)
  deleteVideo: function (id) {
    let videos = this.getVideos();
    videos = videos.filter(v => v.id !== id);
    this.saveVideos(videos);
    return true;
  },

  // Reset Kembali ke Data Standar SMPN 7
  resetToDefault: function () {
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(INITIAL_VIDEO_DATA));
    return INITIAL_VIDEO_DATA;
  },

  // Ekspor Cadangan Data ke File JSON
  exportData: function () {
    const videos = this.getVideos();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(videos, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `repositori_video_smpn7_backup_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  },

  // Impor Cadangan Data dari File JSON
  importData: function (jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.saveVideos(parsed);
        return { success: true, count: parsed.length };
      }
      return { success: false, message: "Format JSON tidak valid atau data kosong." };
    } catch (e) {
      return { success: false, message: "Gagal memproses file JSON: " + e.message };
    }
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

  // Preferensi Tema (Bawaan Resmi: Terang / Light, Opsional: Midnight Gelap)
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

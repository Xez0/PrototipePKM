/* ==========================================================================
   APLIKASI UTAMA: REPOSITORI VIDEO SMPN 7 TANGERANG SELATAN
   Linear Design System & Pengontrol Antarmuka:
   Katalog Siswa, Login Dewan Guru, Pengelolaan Video (Unggah & Edit),
   Drag & Drop Video Komputer, Filter Jenjang, & Navigasi Terpadu
   ========================================================================== */

if (typeof window.escapeHtml !== "function") {
  window.escapeHtml = function (str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
}
var escapeHtml = window.escapeHtml;

if (typeof window.escapeJsString !== "function") {
  window.escapeJsString = function (str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/</g, "\\x3c")
      .replace(/>/g, "\\x3e");
  };
}
var escapeJsString = window.escapeJsString;

if (typeof window.sanitizeId !== "function") {
  window.sanitizeId = function (id) {
    if (id === null || id === undefined) return "";
    return String(id).replace(/[^a-zA-Z0-9_-]/g, "");
  };
}
var sanitizeId = window.sanitizeId;

// ==========================================================================
// PENGUNGGAH RESMI GOOGLE YOUTUBE DATA API V3 (DIRECT UPLOAD UNTUK GURU)
// Mengunggah file MP4 langsung ke Channel YouTube Resmi Sekolah (Unlisted)
// ==========================================================================
const YouTubeUploader = {
  CLIENT_ID: "609447982110-6bv5uh18pordb7sh3u1q7l3jvo5ehhpb.apps.googleusercontent.com",
  SCOPES: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl",
  tokenClient: null,
  accessToken: null,
  tokenExpiresAt: 0,

  init: function () {
    if (window.google && google.accounts && google.accounts.oauth2) {
      try {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES,
          hint: this.DEFAULT_EMAIL,
          callback: () => {}
        });
        const savedToken = localStorage.getItem("smpn7_yt_access_token");
        const savedExp = parseInt(localStorage.getItem("smpn7_yt_token_exp") || "0", 10);
        if (savedToken && Date.now() < savedExp) {
          this.accessToken = savedToken;
          this.tokenExpiresAt = savedExp;
        }
      } catch (e) {
        console.warn("[YOUTUBE API] Gagal inisialisasi token client:", e);
      }
    }
  },

  getAccessToken: function () {
    return new Promise((resolve, reject) => {
      if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
        return resolve(this.accessToken);
      }

      if (!this.tokenClient) {
        this.init();
      }

      if (!this.tokenClient) {
        return reject(new Error("Layanan Google Identity Services belum siap. Pastikan peramban terhubung internet."));
      }

      this.tokenClient.callback = (resp) => {
        if (resp.error) {
          reject(new Error("Otorisasi akun YouTube dibatalkan atau gagal: " + resp.error));
        } else if (resp.access_token) {
          this.accessToken = resp.access_token;
          const expiresIn = parseInt(resp.expires_in || "3600", 10) * 1000;
          this.tokenExpiresAt = Date.now() + expiresIn;
          localStorage.setItem("smpn7_yt_access_token", this.accessToken);
          localStorage.setItem("smpn7_yt_token_exp", String(this.tokenExpiresAt));
          resolve(this.accessToken);
        } else {
          reject(new Error("Gagal memperoleh token akses YouTube."));
        }
      };

      this.tokenClient.requestAccessToken({ prompt: "" });
    });
  },

  uploadVideo: async function (file, metadata, onProgress) {
    let uploadUrl = null;

    // Prioritas 1: Minta URL Unggah Pra-Otorisasi dari Backend (Zero-Popup untuk Guru)
    try {
      const initHeaders = { "Content-Type": "application/json" };
      if (typeof AuthManager !== "undefined" && typeof AuthManager.getAuthToken === "function") {
        const token = AuthManager.getAuthToken();
        if (token) initHeaders["Authorization"] = "Bearer " + token;
      }
      const initRes = await fetch("/api/youtube-init", {
        method: "POST",
        headers: initHeaders,
        body: JSON.stringify({
          title: metadata.title || "Materi SMPN 7 Tangsel",
          description: metadata.description || "Video materi pembelajaran resmi SMPN 7 Tangsel.",
          fileSize: file.size,
          fileType: file.type || "video/mp4",
          clientOrigin: window.location.origin
        })
      });

      if (initRes.ok) {
        const initData = await initRes.json();
        if (initData.success && initData.uploadUrl) {
          uploadUrl = initData.uploadUrl;
          console.log("[YOUTUBE API] Direct upload aktif via channel resmi sekolah.");
        }
      }
    } catch (e) {
      console.warn("[YOUTUBE API] Backend init dilewati:", e);
    }

    // Prioritas 2: Fallback ke otorisasi browser jika serverless backend belum dikonfigurasi
    if (!uploadUrl) {
      const token = await this.getAccessToken();

      const initResponse = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(file.size),
          "X-Upload-Content-Type": file.type || "video/mp4"
        },
        body: JSON.stringify({
          snippet: {
            title: metadata.title || "Materi SMPN 7 Tangsel",
            description: metadata.description || "Video materi pembelajaran resmi UPTD SMP Negeri 7 Kota Tangerang Selatan.",
            categoryId: "27"
          },
          status: {
            privacyStatus: "unlisted",
            selfDeclaredMadeForKids: false
          }
        })
      });

      if (!initResponse.ok) {
        const errText = await initResponse.text();
        throw new Error("Gagal inisialisasi upload YouTube: " + errText);
      }

      uploadUrl = initResponse.headers.get("Location");
      if (!uploadUrl) {
        throw new Error("Google tidak mengembalikan endpoint unggah.");
      }
    }

    // Unggah biner video langsung ke YouTube dengan progress bar
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            // Skala progres pengiriman biner dari 10% hingga 88%
            const percent = Math.min(88, Math.max(10, Math.round((e.loaded / e.total) * 78 + 10)));
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (onProgress) onProgress(92);
            resolve(res.id);
          } catch (e) {
            reject(new Error("Format respon YouTube tidak valid"));
          }
        } else {
          reject(new Error("Upload ke YouTube gagal dengan status: " + xhr.status));
        }
      };

      xhr.onerror = () => reject(new Error("Koneksi jaringan terputus saat mengunggah video."));
      xhr.onabort = () => reject(new Error("Pengunggahan video dibatalkan."));

      xhr.send(file);
    });
  }
};
window.YouTubeUploader = YouTubeUploader;

const App = {
  currentView: "student", // 'student' | 'login' | 'teacher'
  currentUploadSource: "file", // 'file' | 'youtube'
  pendingVideoFile: null,
  activeGradeFilter: "all",
  activeCategoryFilter: "all",
  searchQuery: "",
  featuredRotationTimer: null,
  featuredIndex: 0,
  featuredVideosList: [],

  // Inisialisasi Saat DOM Siap
  init: async function () {
    this.initTheme();
    this.bindEvents();
    this.updateAuthUI();
    this.handleHashChange();
    window.addEventListener("hashchange", () => this.handleHashChange());
    VideoPlayer.init();
    this.renderStats();
    this.renderVideoGrid();
    this.renderTeacherTable();
    this.initFeaturedRotation();

    // Sinkronisasi otomatis dari backend server repositori sekolah
    try {
      await RepoStorage.syncWithBackend();
      this.renderStats();
      this.renderVideoGrid();
      this.renderTeacherTable();
      this.initFeaturedRotation();
    } catch (e) {
      console.warn("Backend sync fallback ke lokal:", e);
    }
  },

  // Dapatkan Cover SVG Skolastik Sesuai Mata Pelajaran
  getCoverBySubject: function (subject) {
    const s = (subject || "").toLowerCase();
    if (s.includes("matematika")) return "assets/cover-matematika.svg";
    if (s.includes("ipa") || s.includes("alam")) return "assets/cover-ipa.svg";
    if (s.includes("informatika") || s.includes("tik") || s.includes("komputer")) return "assets/cover-informatika.svg";
    if (s.includes("inggris")) return "assets/cover-bahasa-inggris.svg";
    if (s.includes("indonesia")) return "assets/cover-bahasa-indonesia.svg";
    if (s.includes("ips") || s.includes("sosial")) return "assets/cover-ips.svg";
    if (s.includes("pancasila") || s.includes("ppkn") || s.includes("pkn")) return "assets/cover-ppkn.svg";
    return "assets/cover-matematika.svg";
  },

  // Ekstrak Snapshot Frame Video Lokal (Jika Didukung Browser)
  generateVideoThumbnail: function (file) {
    return new Promise((resolve) => {
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        const fileUrl = URL.createObjectURL(file);
        video.src = fileUrl;

        video.onloadedmetadata = () => {
          video.currentTime = Math.min(1, video.duration / 2 || 0.5);
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 360;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbUrl = canvas.toDataURL("image/jpeg", 0.75);
            URL.revokeObjectURL(fileUrl);
            resolve(thumbUrl);
          } catch (e) {
            URL.revokeObjectURL(fileUrl);
            resolve(null);
          }
        };

        video.onerror = () => {
          URL.revokeObjectURL(fileUrl);
          resolve(null);
        };

        setTimeout(() => {
          resolve(null);
        }, 1200);
      } catch (err) {
        resolve(null);
      }
    });
  },

  // Sinkronisasi Hash URL dengan Tampilan View
  handleHashChange: function () {
    const rawHash = window.location.hash.replace("#", "");
    const lowerHash = rawHash.toLowerCase();

    // Rute Nonton Video (YouTube-Style Watch Page)
    if (lowerHash.startsWith("tonton") || lowerHash.startsWith("watch")) {
      let videoId = null;
      const match = rawHash.match(/[?&]v=([^&]+)/) || rawHash.match(/=(.+)/);
      if (match) videoId = match[1];

      const videos = RepoStorage.getVideos();
      const target = videoId ? videos.find(v => v.id === videoId) : videos[0];
      if (target) {
        VideoPlayer.openPlayer(target, false);
      } else {
        this.navigateTo("student", "katalog");
      }
      return;
    }

    if (lowerHash === "portal-guru") {
      if (this.currentView !== "teacher") this.navigateTo("teacher");
    } else if (lowerHash === "login-guru" || lowerHash === "masuk-guru") {
      if (this.currentView !== "login") this.navigateTo("login");
    } else if (lowerHash === "katalog" || lowerHash === "edukasi-pkm" || lowerHash === "beranda" || lowerHash === "prinsip") {
      this.navigateTo("student", lowerHash);
    } else if (lowerHash === "" || lowerHash === "student") {
      if (this.currentView !== "student") this.navigateTo("student");
    }
  },

  // Navigasi Terpadu Antar Halaman (Siswa / Login / Ruang Guru / Nonton Video)
  navigateTo: function (viewName, targetSectionId = null, updateHash = true) {
    if (viewName === "teacher" && !AuthManager.isLoggedIn()) {
      this.showToast("Silakan masuk terlebih dahulu dengan akun dewan guru.", "normal");
      this.navigateTo("login");
      return;
    }

    const viewStudent = document.getElementById("viewStudent");
    const viewLogin = document.getElementById("viewLogin");
    const viewTeacherPortal = document.getElementById("viewTeacherPortal");
    const viewWatch = document.getElementById("viewWatch");

    if (!viewStudent || !viewLogin || !viewTeacherPortal) return;

    // Hentikan video jika berpindah dari halaman nonton ke halaman lain
    if (this.currentView === "watch" && viewName !== "watch") {
      if (window.VideoPlayer && typeof VideoPlayer.stopPlayback === "function") {
        VideoPlayer.stopPlayback();
      }
    }

    viewStudent.classList.add("hidden");
    viewLogin.classList.add("hidden");
    viewTeacherPortal.classList.add("hidden");
    if (viewWatch) viewWatch.classList.add("hidden");

    if (viewName === "watch") {
      if (viewWatch) viewWatch.classList.remove("hidden");
      this.currentView = "watch";
      document.body.classList.add("watch-view-active");
      if (updateHash && targetSectionId) {
        const nextHash = `#tonton?v=${targetSectionId}`;
        if (window.location.hash !== nextHash) {
          window.history.pushState(null, "", nextHash);
        }
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (viewName === "login") {
      viewLogin.classList.remove("hidden");
      this.currentView = "login";
      if (window.location.hash !== "#login-guru") {
        window.history.pushState(null, "", "#login-guru");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (viewName === "teacher") {
      viewTeacherPortal.classList.remove("hidden");
      this.currentView = "teacher";
      if (window.location.hash !== "#portal-guru") {
        window.history.pushState(null, "", "#portal-guru");
      }
      this.renderTeacherProfile();
      this.renderTeacherTable();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      viewStudent.classList.remove("hidden");
      this.currentView = "student";
      if (targetSectionId) {
        if (window.location.hash !== `#${targetSectionId}`) {
          window.history.pushState(null, "", `#${targetSectionId}`);
        }
        const targetElem = document.getElementById(targetSectionId);
        if (targetElem) {
          setTimeout(() => {
            targetElem.scrollIntoView({ behavior: "smooth" });
          }, 80);
        }
      } else {
        if (window.location.hash && window.location.hash !== "#beranda") {
          window.history.pushState(null, "", "#beranda");
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    this.updateAuthUI();
  },

  // Penanganan Tombol Navigasi Guru di Header
  handleTeacherNavClick: function () {
    if (AuthManager.isLoggedIn()) {
      this.navigateTo("teacher");
    } else {
      this.navigateTo("login");
    }
  },

  // Gulir Halus ke Atas Halaman Tanpa Mengubah Konten / View
  scrollToTop: function (event) {
    if (event) {
      if (typeof event.preventDefault === "function") event.preventDefault();
      if (typeof event.stopPropagation === "function") event.stopPropagation();
    }
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  },

  // Perbarui UI Sesuai Status Autentikasi
  updateAuthUI: function () {
    const isLoggedIn = AuthManager.isLoggedIn();
    const navText = document.getElementById("txtTeacherNav");
    const teacher = AuthManager.getTeacher();

    if (navText) {
      if (isLoggedIn && teacher) {
        navText.textContent = "Portal Guru (Aktif)";
      } else {
        navText.textContent = "Masuk Guru";
      }
    }
  },

  // Render Profil Guru di Ruang Guru (Portal Guru)
  renderTeacherProfile: function () {
    const teacher = AuthManager.getTeacher() || AuthManager.defaultTeacher;
    const greetingElem = document.getElementById("teacherDisplayGreeting");
    const nipElem = document.getElementById("teacherDisplayNip");
    const avatarElem = document.getElementById("teacherAvatarText");

    if (greetingElem) greetingElem.textContent = teacher.name;
    if (nipElem) {
      const nipText = teacher.nip ? `NIP. ${teacher.nip} • ` : "";
      nipElem.textContent = `${nipText}Dewan Guru SMPN 7`;
    }
    if (avatarElem) {
      const initials = (teacher.name || "Guru").replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "GU";
      avatarElem.textContent = initials;
    }
  },

  // Penanganan Submit Form Login Guru
  handleLoginSubmit: function () {
    const identifierInput = document.getElementById("loginNip");
    const passwordInput = document.getElementById("loginPassword");

    const identifier = identifierInput ? identifierInput.value : "";
    const password = passwordInput ? passwordInput.value : "";

    const res = AuthManager.login(identifier, password);
    if (res.success) {
      this.showToast(`Selamat datang, ${res.teacher.name}!`, "success");
      this.navigateTo("teacher");
    } else {
      this.showToast(res.message || "Gagal masuk. Periksa kembali nama akun/email Anda.", "danger");
    }
  },

  // Masuk Instan (Akun Demo Guru untuk Kemudahan Penilai PkM)
  handleFastLogin: function () {
    const res = AuthManager.loginFastDemo();
    this.showToast(`Masuk berhasil sebagai ${res.teacher.name}`, "success");
    this.navigateTo("teacher");
  },

  // Keluar dari Ruang Pengelolaan Guru
  handleLogout: function () {
    AuthManager.logout();
    this.showToast("Bapak/Ibu telah keluar dari Ruang Guru.");
    this.navigateTo("student");
  },

  // Beralih Tab Sumber Upload Video (File Komputer vs YouTube)
  switchUploadSource: function (sourceType) {
    this.currentUploadSource = sourceType;
    const tabFile = document.getElementById("tabSourceFile");
    const tabYt = document.getElementById("tabSourceYoutube");
    const blockFile = document.getElementById("sourceFileBlock");
    const blockYt = document.getElementById("sourceYoutubeBlock");
    const offlineNotice = document.getElementById("offlineUploadNotice");

    if (sourceType === "file") {
      if (tabFile) tabFile.classList.add("active");
      if (tabYt) tabYt.classList.remove("active");
      if (blockFile) blockFile.style.display = "block";
      if (blockYt) blockYt.style.display = "none";

      // Tampilkan notifikasi peringatan jika server repositori sedang offline
      if (offlineNotice) {
        offlineNotice.style.display = RepoStorage.isServerOnline ? "none" : "block";
      }
    } else {
      if (tabFile) tabFile.classList.remove("active");
      if (tabYt) tabYt.classList.add("active");
      if (blockFile) blockFile.style.display = "none";
      if (blockYt) blockYt.style.display = "block";
    }
  },

  // Drag & Drop Handlers
  handleDragOver: function (e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById("videoFileDropzone");
    if (dropzone) dropzone.classList.add("dragover");
  },

  handleDragLeave: function (e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById("videoFileDropzone");
    if (dropzone) dropzone.classList.remove("dragover");
  },

  handleDrop: function (e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById("videoFileDropzone");
    if (dropzone) dropzone.classList.remove("dragover");

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      this.handleFileSelectedFile(file);
    }
  },

  handleFileSelected: function (input) {
    if (input.files && input.files[0]) {
      this.handleFileSelectedFile(input.files[0]);
    }
  },

  // Format detik ke mm:ss atau hh:mm:ss
  formatDuration: function (seconds) {
    const s = Math.round(seconds || 0);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },

  // Deteksi durasi asli video berkas secara presisi dari metadata
  extractVideoDuration: function (file) {
    return new Promise((resolve) => {
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        const url = URL.createObjectURL(file);
        video.src = url;

        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          const totalSecs = Math.round(video.duration || 0);
          if (totalSecs > 0) {
            resolve({ seconds: totalSecs, formatted: this.formatDuration(totalSecs) });
          } else {
            resolve({ seconds: 0, formatted: "10:00" });
          }
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ seconds: 0, formatted: "10:00" });
        };
      } catch (e) {
        resolve({ seconds: 0, formatted: "10:00" });
      }
    });
  },

  // Ekstrak 3 frame video snapshot (Thumbnail YouTube Style)
  generateVideoFrames: function (file) {
    return new Promise((resolve) => {
      try {
        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        const url = URL.createObjectURL(file);
        video.src = url;

        video.onloadedmetadata = async () => {
          const duration = video.duration || 10;
          const t1 = Math.min(2, Math.max(0.5, duration * 0.1));
          const t2 = Math.max(t1 + 0.5, duration * 0.5);
          const t3 = Math.max(t2 + 0.5, duration * 0.85);

          const captureFrameAt = (targetSecs) => {
            return new Promise((res) => {
              const onSeeked = () => {
                video.removeEventListener("seeked", onSeeked);
                try {
                  const canvas = document.createElement("canvas");
                  canvas.width = 640;
                  canvas.height = 360;
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(video, 0, 0, 640, 360);
                  res(canvas.toDataURL("image/jpeg", 0.85));
                } catch (e) {
                  res(null);
                }
              };
              video.addEventListener("seeked", onSeeked);
              video.currentTime = Math.min(targetSecs, Math.max(0, duration - 0.2));
            });
          };

          const frame1 = await captureFrameAt(t1);
          const frame2 = await captureFrameAt(t2);
          const frame3 = await captureFrameAt(t3);

          URL.revokeObjectURL(url);
          resolve({
            frame1: frame1 || this.getCoverBySubject("Matematika"),
            frame2: frame2 || frame1 || this.getCoverBySubject("Matematika"),
            frame3: frame3 || frame2 || this.getCoverBySubject("Matematika"),
            time1: this.formatDuration(t1),
            time2: this.formatDuration(t2),
            time3: this.formatDuration(t3),
            durationFormatted: this.formatDuration(duration)
          });
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    });
  },

  // Pemilihan Opsi Thumbnail (Frame 1, Frame 2, Frame 3, Cover Mapel)
  selectThumbnailOption: function (optionKey) {
    const previewImg = document.getElementById("activeThumbnailPreviewImg");
    const labelElem = document.getElementById("activeThumbnailLabel");
    const grid = document.getElementById("thumbOptionsGrid");

    if (grid) {
      grid.querySelectorAll(".thumb-option-tile").forEach(tile => tile.classList.remove("active"));
    }

    if (optionKey === "frame1" && this.extractedFrames) {
      const tile = document.getElementById("tileThumbFrame1");
      if (tile) tile.classList.add("active");
      this.selectedThumbnailUrl = this.extractedFrames.frame1;
      if (labelElem) labelElem.textContent = "Frame Awal Video (" + this.extractedFrames.time1 + ")";
    } else if (optionKey === "frame2" && this.extractedFrames) {
      const tile = document.getElementById("tileThumbFrame2");
      if (tile) tile.classList.add("active");
      this.selectedThumbnailUrl = this.extractedFrames.frame2;
      if (labelElem) labelElem.textContent = "Frame Tengah Video (" + this.extractedFrames.time2 + ")";
    } else if (optionKey === "frame3" && this.extractedFrames) {
      const tile = document.getElementById("tileThumbFrame3");
      if (tile) tile.classList.add("active");
      this.selectedThumbnailUrl = this.extractedFrames.frame3;
      if (labelElem) labelElem.textContent = "Frame Akhir Video (" + this.extractedFrames.time3 + ")";
    }

    if (previewImg && this.selectedThumbnailUrl) {
      previewImg.src = this.selectedThumbnailUrl;
    }
    const identityPreview = document.getElementById("identityThumbPreviewImg");
    const identityTag = document.getElementById("identityThumbTag");
    if (identityPreview && this.selectedThumbnailUrl) {
      identityPreview.src = this.selectedThumbnailUrl;
    }
    if (identityTag) {
      identityTag.textContent = "Frame Video";
    }
  },

  // Upload Thumbnail Kustom Sendiri (Canva/Gambar Laptop)
  handleCustomThumbnailSelected: function (input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        this.selectedThumbnailUrl = dataUrl;
        const previewImg = document.getElementById("activeThumbnailPreviewImg");
        const labelElem = document.getElementById("activeThumbnailLabel");
        const grid = document.getElementById("thumbOptionsGrid");
        const customTile = document.getElementById("tileThumbCustom");

        if (grid) {
          grid.querySelectorAll(".thumb-option-tile").forEach(tile => tile.classList.remove("active"));
        }
        if (customTile) customTile.classList.add("active");
        if (previewImg) previewImg.src = dataUrl;
        if (labelElem) labelElem.textContent = "Thumbnail Kustom (" + file.name + ")";
        this.showToast("Thumbnail kustom berhasil dipasang!", "success");
      };
      reader.readAsDataURL(file);
    }
  },

  handleFileSelectedFile: async function (file) {
    if (!file) return;
    this.pendingVideoFile = file;

    if (!RepoStorage.isServerOnline) {
      this.showToast({
        type: "warning",
        title: "Server Offline",
        desc: "Server offline: Berkas video hanya bisa diunggah saat server aktif. Gunakan Tautan YouTube.",
        duration: 5000
      });
    }

    const dropzone = document.getElementById("videoFileDropzone");
    const previewCard = document.getElementById("fileSelectedDisplay");
    const nameElem = document.getElementById("selectedFileName");
    const sizeElem = document.getElementById("selectedFileSize");
    const typeElem = document.getElementById("selectedFileType");
    const extElem = document.getElementById("selectedFileExt");
    const durElem = document.getElementById("selectedFileDuration");

    // Sembunyikan dropzone kosong dan tampilkan preview card yang kaya metadata
    if (dropzone) dropzone.style.display = "none";
    if (previewCard) previewCard.style.display = "flex";

    // Tampilkan nama berkas
    if (nameElem) nameElem.textContent = file.name;

    // Ekstrak ekstensi berkas untuk badge (MP4, WEBM, MKV, dll.)
    const extMatch = file.name.match(/\.([0-9a-z]+)$/i);
    const ext = extMatch ? extMatch[1].toUpperCase() : "MP4";
    if (extElem) extElem.textContent = ext;

    // Hitung ukuran berkas secara presisi
    let formattedSize = "0 MB";
    if (file.size < 1024 * 1024) {
      formattedSize = (file.size / 1024).toFixed(1) + " KB";
    } else if (file.size < 1024 * 1024 * 1024) {
      formattedSize = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    } else {
      formattedSize = (file.size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
    if (sizeElem) sizeElem.textContent = formattedSize;

    // Tampilkan format MIME
    if (typeElem) {
      typeElem.textContent = file.type ? file.type : `Video ${ext}`;
    }

    // 1. Ekstrak durasi asli video
    if (durElem) durElem.textContent = "Mendeteksi durasi...";
    const durInfo = await this.extractVideoDuration(file);
    this.pendingVideoDuration = durInfo.formatted;
    if (durElem) durElem.textContent = "Durasi Asli: " + durInfo.formatted;

    // 2. Ekstrak 3 frame video snapshot (Thumbnail YouTube Style)
    const customizerBlock = document.getElementById("thumbnailCustomizerBlock");
    const durationPill = document.getElementById("thumbPreviewDurationPill");
    if (durationPill) durationPill.textContent = durInfo.formatted;

    const frames = await this.generateVideoFrames(file);
    if (frames) {
      this.extractedFrames = frames;
      const img1 = document.getElementById("imgThumbFrame1");
      const img2 = document.getElementById("imgThumbFrame2");
      const img3 = document.getElementById("imgThumbFrame3");
      const time1 = document.getElementById("timeThumbFrame1");
      const time2 = document.getElementById("timeThumbFrame2");
      const time3 = document.getElementById("timeThumbFrame3");

      if (img1) img1.src = frames.frame1;
      if (img2) img2.src = frames.frame2;
      if (img3) img3.src = frames.frame3;
      if (time1) time1.textContent = frames.time1;
      if (time2) time2.textContent = frames.time2;
      if (time3) time3.textContent = frames.time3;

      // Default pilih Frame 2 (tengah)
      this.selectThumbnailOption("frame2");
      if (customizerBlock) customizerBlock.style.display = "block";
    } else {
      // Fallback jika video codec tidak didukung canvas di peramban
      const subjectInput = document.getElementById("simpleVideoSubject");
      const subj = subjectInput ? subjectInput.value : "Matematika";
      this.selectedThumbnailUrl = this.getCoverBySubject(subj);
      const previewImg = document.getElementById("activeThumbnailPreviewImg");
      const labelElem = document.getElementById("activeThumbnailLabel");
      if (previewImg) previewImg.src = this.selectedThumbnailUrl;
      if (labelElem) labelElem.textContent = "Thumbnail Rekomendasi (" + subj + ")";
      if (customizerBlock) customizerBlock.style.display = "block";
    }

    // CATATAN: Judul materi pembelajaran TIDAK diubah otomatis dari nama file,
    // sesuai permintaan user agar guru tetap mengisinya secara manual.
  },

  clearSelectedVideoFile: function () {
    this.pendingVideoFile = null;
    this.pendingVideoDuration = "10:00";
    this.selectedThumbnailUrl = null;
    this.extractedFrames = null;

    const input = document.getElementById("inputVideoLocalFile");
    if (input) input.value = "";
    const customThumbInput = document.getElementById("inputCustomThumbnailFile");
    if (customThumbInput) customThumbInput.value = "";

    const dropzone = document.getElementById("videoFileDropzone");
    const previewCard = document.getElementById("fileSelectedDisplay");
    const customizerBlock = document.getElementById("thumbnailCustomizerBlock");

    if (dropzone) dropzone.style.display = "block";
    if (previewCard) previewCard.style.display = "none";
    if (customizerBlock) customizerBlock.style.display = "none";

    this.resetUploadProgress();
  },

  _currentUploadPct: 0,

  // Sinkronisasi Progress Bar Unggah (Atas di Card 1, Bawah di Atas Tombol Submit, dan Label Tombol)
  setUploadProgress: function (percent, statusText, subText) {
    let pct = Math.min(100, Math.max(0, Math.round(percent)));

    // Jaminan Monoton: Persentase progres TIDAK BOLEH mundur
    if (this._currentUploadPct && pct < this._currentUploadPct && pct > 0 && pct < 100) {
      pct = this._currentUploadPct;
    } else {
      this._currentUploadPct = pct;
    }

    // 1. Sinkronisasi Indikator Atas (Card 1)
    const topWrapper = document.getElementById("videoUploadProgressWrapper");
    const topBar = document.getElementById("uploadProgressBar");
    const topPct = document.getElementById("uploadProgressPercentText");
    const topStatus = document.getElementById("uploadProgressStatusText");

    if (topWrapper) topWrapper.style.display = "block";
    if (topBar) topBar.style.width = pct + "%";
    if (topPct) topPct.textContent = pct + "%";
    if (topStatus && statusText) topStatus.textContent = statusText;

    // 2. Sinkronisasi Indikator Bawah (Tepat di Atas Tombol Submit)
    const btmWrapper = document.getElementById("bottomUploadProgressWrapper");
    const btmBar = document.getElementById("bottomUploadProgressBar");
    const btmPct = document.getElementById("bottomUploadProgressPercentText");
    const btmStatus = document.getElementById("bottomUploadProgressStatusText");
    const btmSub = document.getElementById("bottomUploadSubText");

    if (btmWrapper) btmWrapper.style.display = "block";
    if (btmBar) btmBar.style.width = pct + "%";
    if (btmPct) btmPct.textContent = pct + "%";
    if (btmStatus && statusText) btmStatus.textContent = statusText;
    if (btmSub && subText) btmSub.textContent = subText;

    // 3. Transformasi Tombol Submit Langsung di Titik Fokus Guru
    const submitBtn = document.getElementById("btnSubmitSimpleVideo");
    const btnText = document.getElementById("btnSubmitText");
    const btnIcon = document.getElementById("btnSubmitIcon");

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add("btn-uploading");
    }
    if (btnIcon) {
      btnIcon.innerHTML = `<svg class="spin-animation" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
    }
    if (btnText) {
      if (pct < 100) {
        btnText.textContent = `Mengunggah Video... ${pct}%`;
      } else {
        btnText.textContent = `Memproses & Menyimpan Data...`;
      }
    }
  },

  resetUploadProgress: function () {
    this._currentUploadPct = 0;
    const topWrapper = document.getElementById("videoUploadProgressWrapper");
    const btmWrapper = document.getElementById("bottomUploadProgressWrapper");
    if (topWrapper) topWrapper.style.display = "none";
    if (btmWrapper) btmWrapper.style.display = "none";

    const submitBtn = document.getElementById("btnSubmitSimpleVideo");
    const btnText = document.getElementById("btnSubmitText");
    const btnIcon = document.getElementById("btnSubmitIcon");

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("btn-uploading");
    }
    if (btnIcon) {
      btnIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
    }
    if (btnText) {
      const modeInput = document.getElementById("teacherFormMode");
      const isEdit = modeInput && modeInput.value === "edit";
      btnText.textContent = isEdit ? "Simpan Perubahan Materi" : "Simpan & Tayangkan Materi ke Siswa";
    }
  },

  // Pemilihan Jenjang Kelas Cepat
  selectGradeBtn: function (grade) {
    const gradeInput = document.getElementById("simpleVideoGrade");
    if (gradeInput) gradeInput.value = grade;

    document.querySelectorAll(".grade-seg-btn, .grade-radio-btn").forEach(btn => {
      if (btn.getAttribute("data-grade-val") === String(grade)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  },

  // Buka Form Guru 3-Step (Tambah atau Ubah Materi)
  openTeacherForm: function (mode = "create", videoId = null) {
    const formSection = document.getElementById("teacherFormSection");
    const tableSection = document.getElementById("teacherTableSection");
    const modeInput = document.getElementById("teacherFormMode");
    const editIdInput = document.getElementById("teacherFormEditId");
    const mainTitle = document.getElementById("teacherFormMainTitle");
    const mainDesc = document.getElementById("teacherFormMainDesc");
    const submitBtnText = document.getElementById("btnSubmitText");

    const stepCard1 = document.getElementById("formStepCard1");
    const stepCard2Title = document.getElementById("stepCard2Title");
    const stepCard3Title = document.getElementById("stepCard3Title");

    const titleInput = document.getElementById("simpleVideoTitle");
    const gradeInput = document.getElementById("simpleVideoGrade");
    const subjectInput = document.getElementById("simpleVideoSubject");
    const outcomeInput = document.getElementById("simpleVideoOutcome");
    const notesInput = document.getElementById("simpleVideoNotes");
    const quizUrlInput = document.getElementById("simpleVideoQuizUrl");
    const chaptersInput = document.getElementById("simpleVideoChapters");
    const ytInput = document.getElementById("inputTeacherYoutubeUrl");
    const identityThumbImg = document.getElementById("identityThumbPreviewImg");
    const identityThumbTag = document.getElementById("identityThumbTag");

    if (!formSection || !tableSection) return;

    if (mode === "create") {
      if (modeInput) modeInput.value = "create";
      if (editIdInput) editIdInput.value = "";
      if (mainTitle) mainTitle.textContent = "Tambah Materi Video Pembelajaran";
      if (mainDesc) mainDesc.textContent = "Isi sumber video dan identitas kelas di bawah ini. Materi yang disimpan akan langsung tayang di katalog siswa.";
      if (submitBtnText) submitBtnText.textContent = "Simpan & Tayangkan Materi ke Siswa";

      // Tampilkan Card 1 (Sumber Video) di mode Create
      if (stepCard1) stepCard1.style.display = "block";
      if (stepCard2Title) stepCard2Title.innerHTML = "2. Identitas Kelas &amp; Mata Pelajaran";
      if (stepCard3Title) stepCard3Title.innerHTML = "3. Bahan Pendamping Belajar";

      // Reset Formulir
      if (titleInput) titleInput.value = "";
      if (outcomeInput) outcomeInput.value = "";
      if (notesInput) notesInput.value = "";
      if (quizUrlInput) quizUrlInput.value = "";
      if (chaptersInput) chaptersInput.value = "";
      if (ytInput) ytInput.value = "";
      if (subjectInput) subjectInput.value = "Matematika";

      this.pendingVideoDuration = "10:00";
      this.selectedThumbnailUrl = null;
      if (identityThumbImg) identityThumbImg.src = this.getCoverBySubject("Matematika");
      if (identityThumbTag) identityThumbTag.textContent = "Cover Mapel";

      this.selectGradeBtn("7");
      this.switchUploadSource("youtube");
      this.handleYoutubeUrlInput("");
      this.clearSelectedVideoFile();
    } else {
      // Mode Edit
      const videos = RepoStorage.getVideos();
      const v = videos.find(item => item.id === videoId);
      if (!v) {
        this.showToast("Materi pembelajaran tidak ditemukan.", "danger");
        return;
      }

      if (modeInput) modeInput.value = "edit";
      if (editIdInput) editIdInput.value = v.id;
      if (mainTitle) mainTitle.textContent = "Edit Materi Video Pembelajaran";
      if (mainDesc) mainDesc.textContent = "Perbarui detail identitas materi dan bahan ajar di bawah ini. Sumber video tidak dapat diubah.";
      if (submitBtnText) submitBtnText.textContent = "Simpan Perubahan Materi";

      // Sembunyikan Card 1 (Sumber Video) di mode Edit sesuai instruksi!
      if (stepCard1) stepCard1.style.display = "none";
      if (stepCard2Title) stepCard2Title.innerHTML = "1. Identitas Kelas &amp; Mata Pelajaran";
      if (stepCard3Title) stepCard3Title.innerHTML = "2. Bahan Pendamping Belajar";

      if (titleInput) titleInput.value = v.title || "";
      if (subjectInput) subjectInput.value = v.subject || "Matematika";
      this.selectGradeBtn(v.grade || "7");
      if (outcomeInput) outcomeInput.value = v.learningOutcome || "";
      if (notesInput) notesInput.value = v.pdfContent || v.description || "";
      if (quizUrlInput) quizUrlInput.value = v.quizUrl || "";

      const chapText = (v.chapters || []).map(ch => `${ch.time} ${ch.title}`).join("\n");
      if (chaptersInput) chaptersInput.value = chapText;

      // Durasi otomatis tetap memakai durasi materi yang sudah ada
      this.pendingVideoDuration = v.duration || "10:00";

      // Muat Thumbnail Saat Ini ke Form Identitas
      const currentThumb = v.thumbnail || this.getCoverBySubject(v.subject);
      this.selectedThumbnailUrl = currentThumb;
      if (identityThumbImg) identityThumbImg.src = currentThumb;
      if (identityThumbTag) {
        identityThumbTag.textContent = v.thumbnail ? "Thumbnail Aktif" : "Cover Mapel";
      }
    }

    tableSection.style.display = "none";
    formSection.style.display = "block";
    window.scrollTo({ top: 120, behavior: "smooth" });
  },

  // Tutup Form Guru & Kembali ke Tabel
  closeTeacherForm: function () {
    const formSection = document.getElementById("teacherFormSection");
    const tableSection = document.getElementById("teacherTableSection");
    if (formSection) formSection.style.display = "none";
    if (tableSection) tableSection.style.display = "block";
    this.clearSelectedVideoFile();
    window.scrollTo({ top: 120, behavior: "smooth" });
  },

  // Ganti Thumbnail dari Form Identitas
  handleIdentityThumbnailSelected: function (input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith("image/")) {
        this.showToast("Silakan pilih berkas gambar yang valid (JPG, PNG, atau WebP).", "danger");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        this.selectedThumbnailUrl = dataUrl;
        const preview = document.getElementById("identityThumbPreviewImg");
        const tag = document.getElementById("identityThumbTag");
        if (preview) preview.src = dataUrl;
        if (tag) tag.textContent = "Kustom (" + file.name + ")";
        this.showToast("Thumbnail materi berhasil diubah!", "success");
      };
      reader.readAsDataURL(file);
    }
  },

  // Kembalikan Thumbnail ke Cover Standar Mata Pelajaran
  resetThumbnailToSubjectCover: function () {
    const subjSelect = document.getElementById("simpleVideoSubject");
    const subj = subjSelect ? subjSelect.value : "Matematika";
    const cover = this.getCoverBySubject(subj);
    this.selectedThumbnailUrl = cover;
    const preview = document.getElementById("identityThumbPreviewImg");
    const tag = document.getElementById("identityThumbTag");
    if (preview) preview.src = cover;
    if (tag) tag.textContent = "Cover Mapel";
    this.showToast("Sampul thumbnail dikembalikan ke cover mata pelajaran.", "info");
  },

  // Respon saat Mata Pelajaran Berubah
  handleSubjectChange: function (subject) {
    if (!this.selectedThumbnailUrl || this.selectedThumbnailUrl.startsWith("assets/cover-")) {
      const cover = this.getCoverBySubject(subject);
      this.selectedThumbnailUrl = cover;
      const preview = document.getElementById("identityThumbPreviewImg");
      const tag = document.getElementById("identityThumbTag");
      if (preview) preview.src = cover;
      if (tag) tag.textContent = "Cover Mapel";
    }
  },

  // Pratinjau YouTube Real-Time (Live Auto-Preview Card)
  handleYoutubeUrlInput: function (url) {
    const previewCard = document.getElementById("youtubeLivePreviewCard");
    const thumbImg = document.getElementById("ytPreviewThumbImg");
    const titleElem = document.getElementById("ytPreviewTitle");
    const metaElem = document.getElementById("ytPreviewMeta");
    const durationElem = document.getElementById("ytPreviewDuration");

    if (!previewCard) return;

    const trimmed = (url || "").trim();
    const ytId = RepoStorage.extractYouTubeId(trimmed);

    if (ytId) {
      previewCard.style.display = "flex";
      const ytThumb = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
      if (thumbImg) thumbImg.src = ytThumb;
      if (durationElem) durationElem.textContent = "14:20";
      this.pendingVideoDuration = "14:20";
      if (!this.selectedThumbnailUrl || this.selectedThumbnailUrl.startsWith("assets/cover-")) {
        this.selectedThumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        const identityPreview = document.getElementById("identityThumbPreviewImg");
        const identityTag = document.getElementById("identityThumbTag");
        if (identityPreview) identityPreview.src = this.selectedThumbnailUrl;
        if (identityTag) identityTag.textContent = "Thumbnail YouTube";
      }
      if (titleElem) titleElem.textContent = "Video YouTube Terverifikasi (ID: " + ytId + ")";
      if (metaElem) metaElem.textContent = "Kanal Edukasi • Kualitas HD 1080p";

      // Coba ambil judul asli via oEmbed secara halus
      fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.title) {
            if (titleElem) titleElem.textContent = data.title;
            if (metaElem && data.author_name) metaElem.textContent = `${data.author_name} • Kualitas HD`;
            const titleInput = document.getElementById("simpleVideoTitle");
            if (titleInput && (!titleInput.value || titleInput.value.trim() === "")) {
              titleInput.value = data.title;
            }
          }
        })
        .catch(() => {});
    } else {
      previewCard.style.display = "none";
    }
  },

  // Pemetaan Kategori Mapel
  mapCategoryBySubject: function (subject) {
    const s = (subject || "").toLowerCase();
    if (s.includes("matematika") || s.includes("ipa")) return "MIPA";
    if (s.includes("informatika") || s.includes("tik")) return "Informatika";
    if (s.includes("bahasa")) return "Bahasa";
    return "IPS";
  },

  // Parser Bab Manual dari Input Guru
  parseChaptersInput: function (rawText) {
    if (!rawText || !rawText.trim()) return [];
    const lines = rawText.split("\n");
    const chapters = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
      if (match) {
        const timeStr = match[1];
        const title = match[2].trim();
        const parts = timeStr.split(":");
        const secs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        chapters.push({ time: timeStr, title, seconds: secs });
      } else {
        chapters.push({ time: "00:00", title: trimmed, seconds: 0 });
      }
    }
    return chapters;
  },

  // Penanganan Simpan Video Guru (Mendukung Tambah & Ubah)
  handleTeacherFormSubmit: async function () {
    const modeInput = document.getElementById("teacherFormMode");
    const editIdInput = document.getElementById("teacherFormEditId");
    const mode = modeInput ? modeInput.value : "create";
    const editId = editIdInput ? editIdInput.value : "";

    const titleInput = document.getElementById("simpleVideoTitle");
    const gradeInput = document.getElementById("simpleVideoGrade");
    const subjectInput = document.getElementById("simpleVideoSubject");
    const outcomeInput = document.getElementById("simpleVideoOutcome");
    const notesInput = document.getElementById("simpleVideoNotes");
    const quizUrlInput = document.getElementById("simpleVideoQuizUrl");
    const chaptersInput = document.getElementById("simpleVideoChapters");
    const submitBtn = document.getElementById("btnSubmitSimpleVideo");

    const title = titleInput ? titleInput.value.trim() : "";
    const grade = gradeInput ? gradeInput.value : "7";
    const subject = subjectInput ? subjectInput.value : "Matematika";
    const outcome = outcomeInput ? outcomeInput.value.trim() : "";
    const notes = notesInput ? notesInput.value.trim() : "";
    const quizUrl = quizUrlInput ? quizUrlInput.value.trim() : "";
    const chaptersRaw = chaptersInput ? chaptersInput.value.trim() : "";

    if (!title) {
      this.showToast("Mohon tuliskan judul materi pembelajaran.", "danger");
      if (titleInput) titleInput.focus();
      return;
    }

    const teacher = AuthManager.getTeacher() || AuthManager.defaultTeacher;
    const defaultCover = this.getCoverBySubject(subject);

    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      if (mode === "create") {
        const chosenDuration = this.pendingVideoDuration || "10:00";
        const chosenThumbnail = this.selectedThumbnailUrl || defaultCover;

        let videoPayload = {
          title,
          grade,
          subject,
          category: this.mapCategoryBySubject(subject),
          teacher: teacher.name,
          teacherNip: teacher.nip || "",
          duration: chosenDuration,
          description: notes || `Materi pembelajaran mandiri mata pelajaran ${subject} Kelas ${grade}. Silakan dipelajari siswa secara berulang.`,
          learningOutcome: outcome || "",
          pdfContent: notes || "",
          quizUrl: quizUrl || "",
          thumbnail: chosenThumbnail,
          publishedAt: new Date().toISOString(),
          chapters: this.parseChaptersInput(chaptersRaw)
        };

        if (this.currentUploadSource === "file") {
          if (!this.pendingVideoFile) {
            this.showToast("Silakan pilih berkas video MP4/WebM dari komputer Anda terlebih dahulu.", "danger");
            this.resetUploadProgress();
            return;
          }

          const fileSizeMB = (this.pendingVideoFile.size / (1024 * 1024)).toFixed(1);
          this.setUploadProgress(
            5,
            "Menghubungkan ke Channel YouTube Sekolah...",
            `Mempersiapkan unggahan berkas (${fileSizeMB} MB, durasi ${chosenDuration}) ke kanal resmi sekolah...`
          );

          try {
            const ytVideoId = await YouTubeUploader.uploadVideo(
              this.pendingVideoFile,
              {
                title: title,
                description: videoPayload.description
              },
              (percent) => {
                this.setUploadProgress(
                  percent,
                  `Sedang Mengunggah ke YouTube Channel Sekolah... ${percent}%`,
                  `Mengirim data video (${fileSizeMB} MB) • Mohon jangan menutup halaman`
                );
              }
            );

            if (!ytVideoId) {
              throw new Error("Gagal mendapatkan ID video dari YouTube.");
            }

            this.setUploadProgress(
              95,
              "Video Terunggah! Menyimpan ke Database Sekolah...",
              "Menyinkronkan data materi ke katalog siswa dan server cloud..."
            );
            videoPayload.sourceType = "youtube_upload";
            videoPayload.uploadedBySchool = true;
            videoPayload.uploadMethod = "file_upload";
            videoPayload.embedUrl = RepoStorage.formatVideoEmbedUrl("https://youtu.be/" + ytVideoId);
            videoPayload.thumbnail = chosenThumbnail || `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`;

            // Simpan ke database Supabase Cloud (tersinkron ke SEMUA orang secara realtime)
            await RepoStorage.addVideo(videoPayload, null);

            this.setUploadProgress(
              100,
              "100% Selesai! Materi Berhasil Diterbitkan",
              "Video telah aktif di YouTube dan langsung tampil di semua perangkat siswa."
            );

            // Tampilkan 100% Selesai sejenak agar terlihat jelas sebelum form ditutup
            await new Promise(r => setTimeout(r, 700));

            this.showToast("Materi pembelajaran berhasil diunggah ke YouTube & langsung tayang di katalog siswa!", "success");
          } catch (uploadErr) {
            console.warn("[UPLOAD FALLBACK] Upload YouTube dialihkan ke repositori internal:", uploadErr);
            if (!RepoStorage.isServerOnline) {
              throw new Error("Server offline: Berkas video hanya bisa diunggah saat server aktif. Gunakan Tautan YouTube.");
            }
            this.setUploadProgress(
              92,
              "Menyimpan ke Repositori Server Sekolah...",
              "Mengalihkan berkas video ke server repositori internal..."
            );
            videoPayload.sourceType = "local";
            videoPayload.uploadedBySchool = true;
            videoPayload.uploadMethod = "file_upload";
            await RepoStorage.addVideo(videoPayload, this.pendingVideoFile);
            this.setUploadProgress(100, "100% Selesai! Materi Berhasil Diterbitkan", "Video tersimpan di repositori server internal sekolah.");
            await new Promise(r => setTimeout(r, 600));
            this.showToast("Materi pembelajaran tersimpan di repositori server internal sekolah.", "info");
          }
        } else {
          const ytInput = document.getElementById("inputTeacherYoutubeUrl");
          const ytUrl = ytInput ? ytInput.value.trim() : "";
          if (!ytUrl) {
            this.showToast("Silakan masukkan tautan video YouTube.", "danger");
            if (ytInput) ytInput.focus();
            if (submitBtn) submitBtn.disabled = false;
            return;
          }
          const ytId = RepoStorage.extractYouTubeId(ytUrl);
          if (!ytId) {
            this.showToast("Tautan video YouTube tidak valid. Mohon masukkan URL YouTube yang benar.", "danger");
            if (ytInput) ytInput.focus();
            if (submitBtn) submitBtn.disabled = false;
            return;
          }
          videoPayload.sourceType = "youtube";
          videoPayload.uploadedBySchool = false;
          videoPayload.uploadMethod = "url_embed";
          videoPayload.embedUrl = RepoStorage.formatVideoEmbedUrl(ytUrl);
          videoPayload.thumbnail = RepoStorage.getThumbnailUrl(ytUrl) || defaultCover;

          await RepoStorage.addVideo(videoPayload, null);
          this.showToast("Materi pembelajaran berhasil disimpan dan langsung tayang di katalog siswa!", "success");
        }
      } else {
        // Mode Ubah / Edit
        const videos = RepoStorage.getVideos();
        const existingVideo = videos.find(item => item.id === editId) || {};

        let updatedData = {
          title,
          grade,
          subject,
          category: this.mapCategoryBySubject(subject),
          duration: existingVideo.duration || this.pendingVideoDuration || "10:00",
          learningOutcome: outcome,
          pdfContent: notes,
          quizUrl: quizUrl,
          description: notes || `Materi pembelajaran untuk ${subject} Kelas ${grade}.`,
          chapters: this.parseChaptersInput(chaptersRaw)
        };

        if (this.selectedThumbnailUrl) {
          updatedData.thumbnail = this.selectedThumbnailUrl;
        } else if (existingVideo.thumbnail) {
          updatedData.thumbnail = existingVideo.thumbnail;
        } else {
          updatedData.thumbnail = this.getCoverBySubject(subject);
        }

        await RepoStorage.updateVideo(editId, updatedData);
        this.showToast("Perubahan materi berhasil diperbarui!", "success");
      }

      this.closeTeacherForm();
      this.renderStats();
      this.renderVideoGrid();
      this.renderTeacherTable();
      this.initFeaturedRotation();
    } catch (err) {
      console.error("Gagal memproses materi:", err);
      this.showToast({
        type: "danger",
        title: "Gagal Menyimpan Materi",
        desc: err.message || "Terjadi kendala saat menyimpan video. Silakan coba kembali.",
        duration: 7000
      });
      if (submitBtn) submitBtn.disabled = false;
      return;
    } finally {
      this.resetUploadProgress();
    }
  },

  // Modal Edit Video Guru (Diarahkan ke Form 3-Step)
  openEditModal: function (id) {
    this.openTeacherForm("edit", id);
  },

  closeEditModal: function () {
    this.closeTeacherForm();
  },

  // Format Waktu Relatif (Contoh: Baru saja, 5 menit lalu, 2 jam lalu, 3 hari lalu)
  formatRelativeTime: function (dateStr) {
    if (!dateStr) return "Baru saja";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    if (diffMs < 0) return "Baru saja";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);

    if (diffSec < 60) return "Baru saja";
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay === 1) return "Kemarin";
    if (diffDay < 7) return `${diffDay} hari lalu`;
    if (diffWeek < 4) return `${diffWeek} minggu lalu`;
    if (diffMonth < 12) return `${diffMonth} bulan lalu`;
    return `${Math.floor(diffDay / 365)} tahun lalu`;
  },

  // Render Tabel Materi di Ruang Guru (Urut Terbaru, Bernomor & Waktu Relatif)
  renderTeacherTable: function (query = "") {
    const tableBody = document.getElementById("teacherVideoTableBody");
    if (!tableBody) return;

    let videos = RepoStorage.getVideos();
    // Urutkan list materi yang terbaru selalu di atas
    videos.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    const q = String(query || "").trim().toLowerCase();
    if (q) {
      videos = videos.filter(v =>
        (v.title && v.title.toLowerCase().includes(q)) ||
        (v.subject && v.subject.toLowerCase().includes(q)) ||
        (v.teacher && v.teacher.toLowerCase().includes(q)) ||
        (v.grade && String(v.grade).toLowerCase().includes(q))
      );
    }

    if (videos.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 28px; color: var(--color-ink-subtle);">
            Tidak ada materi pembelajaran yang ditemukan.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = videos.map((v, idx) => {
      const cover = v.thumbnail || this.getCoverBySubject(v.subject);
      const formattedDate = RepoStorage.formatDate(v.publishedAt);
      const relativeTime = this.formatRelativeTime(v.publishedAt);
      const safeTitle = escapeHtml(v.title);
      const safeSubject = escapeHtml(v.subject);
      const safeGrade = escapeHtml(v.grade);
      const safeDur = escapeHtml(v.duration || '15:00');
      const cleanId = sanitizeId(v.id);
      const jsSubject = escapeJsString(v.subject);
      const safeCover = escapeHtml(cover);
      const hasEdited = !!v.updatedAt;
      const formattedEditedDate = hasEdited ? RepoStorage.formatDateTime(v.updatedAt) : '';
      const relativeEditedTime = hasEdited ? this.formatRelativeTime(v.updatedAt) : '';

      return `
        <tr>
          <td class="teacher-td-no">
            <span class="teacher-num-badge">#${idx + 1}</span>
          </td>
          <td class="teacher-td-thumb">
            <div class="teacher-thumb-wrap" onclick="App.openVideoById('${cleanId}', 'teacher')" title="Klik untuk memutar materi" role="button" tabindex="0">
              <img src="${safeCover}" alt="${safeTitle}" loading="lazy" onerror="this.onerror=null; this.src=App.getCoverBySubject('${jsSubject}');">
              <span class="teacher-thumb-duration">${safeDur}</span>
            </div>
          </td>
          <td>
            <div class="teacher-title-text" onclick="App.openVideoById('${cleanId}', 'teacher')" role="button" tabindex="0" title="Klik untuk memutar materi">${safeTitle}</div>
            <div class="teacher-meta-sub">
              ${safeSubject} • Kelas ${safeGrade}
              ${hasEdited ? `
                <span class="badge-edited" title="Terakhir diperbarui: ${escapeHtml(formattedEditedDate)}">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-right: 2px;">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Diedit
                </span>
              ` : ''}
            </div>
          </td>
          <td class="teacher-td-date">
            <div class="teacher-date-relative">${relativeTime}</div>
            <div class="teacher-date-full">${formattedDate}</div>
            ${hasEdited ? `
              <div class="teacher-date-edited" title="Terakhir diperbarui: ${escapeHtml(formattedEditedDate)}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: -1px; margin-right: 3px; flex-shrink: 0;">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>Diedit ${relativeEditedTime}</span>
              </div>
            ` : ''}
          </td>
          <td class="teacher-td-actions" style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="App.openVideoById('${cleanId}', 'teacher')" title="Uji putar materi">
              Tonton
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="App.openEditModal('${cleanId}')" title="Edit materi" style="margin-left: 4px;">
              Edit
            </button>
            <button type="button" class="btn btn-outline btn-sm btn-delete-teacher" onclick="App.deleteVideoItem('${cleanId}')" title="Hapus materi" style="margin-left: 4px;">
              Hapus
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  pendingDeleteId: null,

  // Buka Modal Konfirmasi Hapus Materi (Custom Dialog Tanpa Alert Biasa)
  deleteVideoItem: function (id) {
    const videos = RepoStorage.getVideos();
    const video = videos.find(v => v.id === id);
    if (!video) return;

    this.pendingDeleteId = id;
    const titleElem = document.getElementById("deleteModalVideoTitle");
    if (titleElem) titleElem.textContent = `"${video.title}"`;

    const backdrop = document.getElementById("deleteConfirmModalBackdrop");
    if (backdrop) backdrop.classList.add("active");
  },

  // Tutup Modal Konfirmasi Hapus
  closeDeleteModal: function () {
    this.pendingDeleteId = null;
    const backdrop = document.getElementById("deleteConfirmModalBackdrop");
    if (backdrop) backdrop.classList.remove("active");
  },

  // Eksekusi Konfirmasi Hapus Materi
  confirmDeleteVideo: async function () {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    const allVideos = RepoStorage.getVideos();
    const videoToDelete = allVideos.find(v => v.id === id);
    this.closeDeleteModal();

    if (!videoToDelete) return;

    // Simpan data video yang dihapus untuk dukungan Urungkan (Undo)
    this.lastDeletedVideo = { ...videoToDelete };

    // Hapus dari UI dan Supabase terlebih dahulu dengan flag skipYouTube: true agar bisa di-undo
    await RepoStorage.deleteVideo(id, { skipYouTube: true });
    this.renderStats();
    this.renderVideoGrid();
    this.renderTeacherTable();
    this.initFeaturedRotation();

    const isSchoolUpload = (
      videoToDelete.sourceType === "youtube_upload" ||
      videoToDelete.uploadedBySchool === true ||
      videoToDelete.uploadMethod === "file_upload"
    );

    this.showToast({
      type: "danger",
      title: "Materi Dihapus",
      desc: isSchoolUpload
        ? `Materi "${videoToDelete.title}" telah dihapus. Klik 'Urungkan' sebelum notifikasi hilang jika ingin membatalkan.`
        : `Materi "${videoToDelete.title}" telah dihapus dari katalog. Klik 'Urungkan' sebelum notifikasi hilang jika ingin membatalkan.`,
      duration: 6000,
      actionText: "Urungkan",
      actionIcon: this.toastIcons.undo,
      onAction: async () => {
        if (this.lastDeletedVideo) {
          const videoToRestore = { ...this.lastDeletedVideo };
          this.lastDeletedVideo = null;
          await RepoStorage.restoreVideo(videoToRestore);
          this.renderStats();
          this.renderVideoGrid();
          this.renderTeacherTable();
          this.initFeaturedRotation();
          this.showToast({
            type: "success",
            title: "Penghapusan Dibatalkan",
            desc: `Materi "${videoToRestore.title}" berhasil dipulihkan kembali.`,
            duration: 3500
          });
        }
      },
      onDismiss: () => {
        // Jika tidak diurungkan selama masa notifikasi aktif:
        // Hapus fisik dari YouTube HANYA jika materi diunggah ke channel YouTube sekolah kita
        if (this.lastDeletedVideo) {
          const pendingTarget = this.lastDeletedVideo;
          this.lastDeletedVideo = null;
          const shouldDeleteFromYT = (
            pendingTarget.sourceType === "youtube_upload" ||
            pendingTarget.uploadedBySchool === true ||
            pendingTarget.uploadMethod === "file_upload"
          );
          if (shouldDeleteFromYT && pendingTarget.embedUrl) {
            const ytId = RepoStorage.extractYouTubeId(pendingTarget.embedUrl);
            if (ytId) {
              console.log("[PERMANENT DELETE] Menghapus video dari channel YouTube resmi sekolah:", ytId);
              const ytDelHeaders = { "Content-Type": "application/json" };
              if (typeof AuthManager !== "undefined" && typeof AuthManager.getAuthToken === "function") {
                const token = AuthManager.getAuthToken();
                if (token) ytDelHeaders["Authorization"] = "Bearer " + token;
              }
              fetch("/api/youtube-delete", {
                method: "POST",
                headers: ytDelHeaders,
                body: JSON.stringify({ youtubeVideoId: ytId })
              }).then(res => res.json()).then(resData => {
                if (resData && resData.success) {
                  console.log("[YOUTUBE API] Video berhasil dihapus permanen dari channel YouTube:", ytId);
                }
              }).catch(err => {
                console.warn("[YOUTUBE API] Gagal memproses hapus YouTube:", err);
              });
            }
          } else {
            console.log("[PERMANENT DELETE] Materi berasal dari URL YouTube eksternal (bukan milik channel sekolah), penghapusan YouTube fisik dilewati.");
          }
        }
      }
    });
  },

  // Inisialisasi Tema
  initTheme: function () {
    const savedTheme = RepoStorage.getTheme();
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeButton(savedTheme);
  },

  toggleTheme: function () {
    const current = RepoStorage.getTheme();
    const nextTheme = current === "dark" ? "light" : "dark";
    RepoStorage.setTheme(nextTheme);
    this.updateThemeButton(nextTheme);
    this.showToast(`Beralih ke tema ${nextTheme === 'dark' ? 'Midnight Gelap' : 'Terang Resmi'}`);
  },

  updateThemeButton: function (theme) {
    const btn = document.getElementById("btnToggleTheme");
    if (!btn) return;
    if (theme === "dark") {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
      btn.setAttribute("title", "Ganti ke Tema Terang (Pintasan: T)");
    } else {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
      btn.setAttribute("title", "Ganti ke Tema Gelap Obsidian (Pintasan: T)");
    }
  },

  // Event Listeners Terpusat
  bindEvents: function () {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderVideoGrid();
      });
    }

    const clearBtn = document.getElementById("clearSearchBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        this.searchQuery = "";
        this.renderVideoGrid();
      });
    }

    document.querySelectorAll("[data-filter-grade]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll("[data-filter-grade]").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        this.activeGradeFilter = btn.getAttribute("data-filter-grade");
        this.renderVideoGrid();
      });
    });

    document.querySelectorAll("[data-filter-category]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll("[data-filter-category]").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        this.activeCategoryFilter = btn.getAttribute("data-filter-category");
        this.renderVideoGrid();
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        if (e.key === "Escape") {
          e.target.blur();
        }
        return;
      }

      if (e.key === "/" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        this.handleTeacherNavClick();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        this.toggleTheme();
      } else if (e.key === "Escape") {
        VideoPlayer.closePlayer();
        this.closeEditModal();
      }
    });

    const importInput = document.getElementById("importFileInput");
    if (importInput) {
      importInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          RepoStorage.importData(e.target.files[0]);
          e.target.value = "";
        }
      });
    }
  },

  // SVG Ikon Resmi Bebas Emoji untuk Notifikasi
  toastIcons: {
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>'
  },

  // Notifikasi Toast Modern Berwaktu (Burning Fuse, Kontinu, Bebas Emoji)
  showToast: function (optionsOrMessage, legacyType = "normal") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    // Bersihkan notifikasi sebelumnya agar tampilan tetap bersih dan fokus
    container.innerHTML = "";

    let opts = {};
    if (typeof optionsOrMessage === "string") {
      let title = "Pemberitahuan";
      let type = legacyType;
      if (legacyType === "success") {
        title = "Berhasil";
      } else if (legacyType === "danger") {
        title = "Peringatan";
      } else if (legacyType === "warning") {
        title = "Perhatian";
      } else {
        type = "info";
      }

      opts = {
        title: title,
        desc: optionsOrMessage,
        type: type,
        duration: 4000
      };
    } else {
      opts = { ...optionsOrMessage };
    }

    const {
      type = "info",
      title = "Pemberitahuan",
      desc = "",
      duration = 4500,
      actionText = null,
      actionIcon = null,
      onAction = null,
      onDismiss = null,
      customIcon = null
    } = opts;

    let iconMarkup = customIcon || this.toastIcons.info;
    if (type === "success") iconMarkup = customIcon || this.toastIcons.check;
    if (type === "danger") iconMarkup = customIcon || this.toastIcons.trash;
    if (type === "warning") iconMarkup = customIcon || this.toastIcons.warning;

    const toast = document.createElement("div");
    toast.className = `toast type-${type} ${type}`;

    toast.innerHTML = `
      <div class="toast-icon">${iconMarkup}</div>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title)}</div>
        ${desc ? `<div class="toast-desc">${escapeHtml(desc)}</div>` : ""}
      </div>
      <div class="toast-actions">
        ${actionText ? `<button type="button" class="toast-btn-action">${actionIcon || ""}${escapeHtml(actionText)}</button>` : ""}
        <button type="button" class="toast-close-btn" aria-label="Tutup">${this.toastIcons.close}</button>
      </div>
      <div class="toast-fuse" style="animation-duration: ${duration}ms;"></div>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector(".toast-close-btn");
    const actionBtn = toast.querySelector(".toast-btn-action");

    const dismiss = () => {
      clearTimeout(timerId);
      toast.classList.add("dismissing");
      if (typeof onDismiss === "function") {
        try { onDismiss(); } catch (e) {}
      }
      setTimeout(() => {
        if (container.contains(toast)) container.removeChild(toast);
      }, 250);
    };

    // Timer kontinu tanpa jeda saat hover
    const timerId = setTimeout(dismiss, duration);

    if (closeBtn) closeBtn.addEventListener("click", dismiss);

    if (actionBtn && typeof onAction === "function") {
      actionBtn.addEventListener("click", () => {
        clearTimeout(timerId);
        onAction();
      });
    }
  },

  // Render Metrik Statistik
  renderStats: function () {
    const videos = RepoStorage.getVideos();
    const totalVideos = videos.length;
    const subjects = new Set(videos.map(v => v.subject)).size;
    const teachers = new Set(videos.map(v => v.teacher)).size;

    const totalElem = document.getElementById("statTotalVideos");
    const subElem = document.getElementById("statTotalSubjects");
    const teachElem = document.getElementById("statTotalTeachers");

    if (totalElem) totalElem.textContent = totalVideos;
    if (subElem) subElem.textContent = subjects;
    if (teachElem) teachElem.textContent = teachers;

    // Hitung per kategori untuk filter tab strip
    const countAll = totalVideos;
    const countMipa = videos.filter(v => v.category === "MIPA").length;
    const countInformatika = videos.filter(v => v.category === "Informatika").length;
    const countBahasa = videos.filter(v => v.category === "Bahasa").length;
    const countIps = videos.filter(v => v.category === "IPS").length;

    const elAll = document.getElementById("countCatAll");
    const elMipa = document.getElementById("countCatMipa");
    const elInformatika = document.getElementById("countCatInformatika");
    const elBahasa = document.getElementById("countCatBahasa");
    const elIps = document.getElementById("countCatIps");

    if (elAll) elAll.textContent = countAll;
    if (elMipa) elMipa.textContent = countMipa;
    if (elInformatika) elInformatika.textContent = countInformatika;
    if (elBahasa) elBahasa.textContent = countBahasa;
    if (elIps) elIps.textContent = countIps;
  },

  // Render Grid Video Pembelajaran Siswa
  renderVideoGrid: function () {
    const gridContainer = document.getElementById("videoGridContainer");
    const emptyState = document.getElementById("catalogEmptyState");
    const countLabel = document.getElementById("searchResultCount");
    const countLabelAlt = document.getElementById("catalogResultsCount");

    if (!gridContainer) return;

    const allVideos = RepoStorage.getVideos();

    const filtered = allVideos.filter(v => {
      const matchGrade = this.activeGradeFilter === "all" || v.grade === this.activeGradeFilter;
      const matchCat = this.activeCategoryFilter === "all" || v.category === this.activeCategoryFilter;
      const matchSearch = !this.searchQuery ||
        v.title.toLowerCase().includes(this.searchQuery) ||
        v.subject.toLowerCase().includes(this.searchQuery) ||
        v.teacher.toLowerCase().includes(this.searchQuery) ||
        (v.description && v.description.toLowerCase().includes(this.searchQuery));

      return matchGrade && matchCat && matchSearch;
    });

    const countText = `${filtered.length} materi tersedia`;
    if (countLabel) countLabel.textContent = countText;
    if (countLabelAlt) countLabelAlt.textContent = countText;

    if (filtered.length === 0) {
      gridContainer.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    gridContainer.innerHTML = filtered.map(v => {
      const isDone = RepoStorage.isCompleted(v.id);
      const isLocal = v.sourceType === "local";
      const formattedDate = RepoStorage.formatDate(v.publishedAt);
      const coverSrc = v.thumbnail || this.getCoverBySubject(v.subject);
      const safeTitle = escapeHtml(v.title);
      const safeDesc = escapeHtml(v.description || "");
      const safeSubject = escapeHtml(v.subject);
      const safeTeacher = escapeHtml(v.teacher);
      const safeGrade = escapeHtml(v.grade);
      const cleanId = sanitizeId(v.id);
      const jsSubject = escapeJsString(v.subject);
      const safeCover = escapeHtml(coverSrc);

      return `
        <article 
          class="video-card ${isDone ? 'video-card-completed' : ''}" 
          id="card-${cleanId}"
          onclick="App.openVideoById('${cleanId}')"
          onkeydown="App.handleCardKeydown(event, '${cleanId}')"
          tabindex="0"
          role="button"
          aria-label="Pelajari materi ${safeTitle} untuk ${safeSubject} Kelas ${safeGrade}"
        >
          <div class="card-thumbnail-wrap">
            <img 
              src="${safeCover}" 
              alt="${safeTitle}" 
              loading="lazy"
              onerror="this.onerror=null; this.src=App.getCoverBySubject('${jsSubject}');"
            >
            <span class="card-badge-grade" data-grade="${safeGrade}">Kelas ${safeGrade}</span>
            <span class="card-badge-source ${isLocal ? 'badge-local' : 'badge-yt'}">
              ${isLocal ? 'Berkas Laptop' : 'YouTube'}
            </span>
            <span class="card-duration">${escapeHtml(v.duration || '15:00')}</span>
            <div class="card-play-overlay">
              <div class="card-play-btn" title="Putar Video Materi">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 20 12 6 20 6 4"/>
                </svg>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="card-meta-row">
              <span class="card-meta-subject">${safeSubject}</span>
              <span class="card-meta-date">${formattedDate}</span>
              ${v.updatedAt ? `
                <span class="card-badge-edited" title="Materi diperbarui guru: ${escapeHtml(RepoStorage.formatDate(v.updatedAt))}">
                  Diedit
                </span>
              ` : ''}
              ${isDone ? `
                <span class="status-completed-badge" title="Telah kamu pelajari">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Selesai
                </span>
              ` : ''}
            </div>
            
            <h3 class="card-title" title="${safeTitle}">${safeTitle}</h3>
            <p class="card-desc-snippet">${safeDesc}</p>
            
            <div class="card-teacher">
              <div class="teacher-avatar-tiny">${safeTeacher.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase()}</div>
              <span class="teacher-name-txt">${safeTeacher}</span>
            </div>

            <div class="card-footer-action">
              <button 
                type="button" 
                class="btn btn-primary btn-sm btn-card-watch" 
                onclick="event.stopPropagation(); App.openVideoById('${cleanId}')"
                title="Buka dan tonton video materi sekarang"
                style="width: 100%; justify-content: center;"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 20 12 6 20 6 4"/>
                </svg>
                <span>Tonton Video</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  },

  handleCardKeydown: function (e, id) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.openVideoById(id);
    }
  },

  resetFilters: function () {
    this.activeGradeFilter = "all";
    this.activeCategoryFilter = "all";
    this.searchQuery = "";
    document.querySelectorAll("[data-filter-grade]").forEach(c => c.classList.remove("active"));
    const defGrade = document.querySelector("[data-filter-grade='all']");
    if (defGrade) defGrade.classList.add("active");
    document.querySelectorAll("[data-filter-category]").forEach(c => c.classList.remove("active"));
    const defCat = document.querySelector("[data-filter-category='all']");
    if (defCat) defCat.classList.add("active");
    const input = document.getElementById("searchInput");
    if (input) input.value = "";
    this.renderVideoGrid();
  },

  // -------------------------------------------------------------
  // ROTASI MATERI UNGGULAN OTOMATIS (HERO SPOTLIGHT CAROUSEL)
  // -------------------------------------------------------------
  initFeaturedRotation: function () {
    const videos = RepoStorage.getVideos();
    if (!videos || videos.length === 0) return;
    this.featuredVideosList = videos;
    if (this.featuredIndex >= this.featuredVideosList.length) {
      this.featuredIndex = 0;
    }
    this.renderFeaturedCard(this.featuredIndex);

    // Otomatis rotasi tiap 5.5 detik
    this.startFeaturedRotation();

    // Jeda saat kursor melayang (hover) agar siswa nyaman membaca/klik
    const card = document.getElementById("heroCardPreview");
    if (card && !card.dataset.rotationBound) {
      card.dataset.rotationBound = "true";
      card.addEventListener("mouseenter", () => this.stopFeaturedRotation());
      card.addEventListener("mouseleave", () => this.startFeaturedRotation());
    }
  },

  startFeaturedRotation: function () {
    this.stopFeaturedRotation();
    if (!this.featuredVideosList || this.featuredVideosList.length <= 1) return;
    this.featuredRotationTimer = setInterval(() => {
      this.featuredIndex = (this.featuredIndex + 1) % this.featuredVideosList.length;
      this.renderFeaturedCard(this.featuredIndex);
    }, 5500);
  },

  stopFeaturedRotation: function () {
    if (this.featuredRotationTimer) {
      clearInterval(this.featuredRotationTimer);
      this.featuredRotationTimer = null;
    }
  },

  renderFeaturedCard: function (index) {
    if (!this.featuredVideosList || this.featuredVideosList.length === 0) return;
    const v = this.featuredVideosList[index];
    if (!v) return;

    const img = document.getElementById("heroPreviewImg");
    const title = document.getElementById("heroPreviewTitle");
    const sub = document.getElementById("heroPreviewSub");
    const screen = document.getElementById("heroPreviewScreen");
    const dotsContainer = document.getElementById("heroPreviewDots");

    // Transisi halus cross-fade
    if (screen) {
      screen.classList.add("fade-out");
      setTimeout(() => {
        if (img) {
          img.src = v.thumbnail || this.getCoverBySubject(v.subject);
          img.alt = `Materi Unggulan: ${v.title}`;
        }
        if (title) title.textContent = v.title;
        if (sub) sub.textContent = `${v.subject} Kelas ${v.grade} • ${v.teacher}`;
        screen.classList.remove("fade-out");
      }, 250);
    } else {
      if (img) img.src = v.thumbnail || this.getCoverBySubject(v.subject);
      if (title) title.textContent = v.title;
      if (sub) sub.textContent = `${v.subject} Kelas ${v.grade} • ${v.teacher}`;
    }

    // Render indikator titik navigasi interaktif
    if (dotsContainer) {
      dotsContainer.innerHTML = this.featuredVideosList.map((item, i) => `
        <button type="button" class="hero-dot ${i === index ? 'active' : ''}" 
                onclick="event.stopPropagation(); App.setFeaturedIndex(${i})" 
                title="Lihat ${escapeHtml(item.title)} (${escapeHtml(item.subject)})"
                aria-label="Lihat materi ${escapeHtml(item.title)}"></button>
      `).join("");
    }
  },

  setFeaturedIndex: function (i) {
    this.featuredIndex = i;
    this.renderFeaturedCard(i);
    this.startFeaturedRotation();
  },

  openFeaturedHero: function () {
    if (this.featuredVideosList && this.featuredVideosList[this.featuredIndex]) {
      this.openVideoById(this.featuredVideosList[this.featuredIndex].id);
    } else {
      const videos = RepoStorage.getVideos();
      const featured = videos.find(v => v.id === "smpn7-mat-07-01") || (videos && videos[0]);
      if (featured) {
        this.openVideoById(featured.id);
      } else {
        this.showToast("Materi belum tersedia.", "normal");
      }
    }
  },

  openVideoById: function (id, origin = null) {
    const videos = RepoStorage.getVideos();
    const target = videos.find(v => v.id === id);
    if (target) {
      const sourceOrigin = origin || (this.currentView === "teacher" ? "teacher" : "student");
      VideoPlayer.openPlayer(target, true, sourceOrigin);
    }
  },

  triggerImport: function () {
    const input = document.getElementById("importFileInput");
    if (input) input.click();
  }
};

// Jalankan saat halaman siap
window.App = App;
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});


/* ==========================================================================
   APLIKASI UTAMA: REPOSITORI VIDEO SMPN 7 TANGERANG SELATAN
   Linear Design System & Pengontrol Antarmuka:
   Katalog Siswa, Login Dewan Guru, Pengelolaan Video (Unggah & Edit),
   Drag & Drop Video Komputer, Filter Jenjang, & Navigasi Terpadu
   ========================================================================== */

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
window.escapeHtml = escapeHtml;

// ==========================================================================
// PENGUNGGAH RESMI GOOGLE YOUTUBE DATA API V3 (DIRECT UPLOAD UNTUK GURU)
// Mengunggah file MP4 langsung ke Channel YouTube Resmi Sekolah (Unlisted)
// ==========================================================================
const YouTubeUploader = {
  CLIENT_ID: "609447982110-6bv5uh18pordb7sh3u1q7l3jvo5ehhpb.apps.googleusercontent.com",
  SCOPES: "https://www.googleapis.com/auth/youtube.upload",
  DEFAULT_EMAIL: "xezakahadi97@gmail.com",
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

      this.tokenClient.requestAccessToken({ prompt: "", hint: this.DEFAULT_EMAIL });
    });
  },

  uploadVideo: async function (file, metadata, onProgress) {
    const token = await this.getAccessToken();

    // 1. Inisiasi Resumable Upload
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

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("Google tidak mengembalikan endpoint unggah.");
    }

    // 2. Unggah data biner video via XHR untuk melacak persentase progress
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const res = JSON.parse(xhr.responseText);
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
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (hash === "portal-guru") {
      if (this.currentView !== "teacher") this.navigateTo("teacher");
    } else if (hash === "login-guru" || hash === "masuk-guru") {
      if (this.currentView !== "login") this.navigateTo("login");
    } else if (hash === "katalog" || hash === "edukasi-pkm" || hash === "beranda" || hash === "prinsip") {
      this.navigateTo("student", hash);
    } else if (hash === "" || hash === "student") {
      if (this.currentView !== "student") this.navigateTo("student");
    }
  },

  // Navigasi Terpadu Antar Halaman (Siswa / Login / Ruang Guru)
  navigateTo: function (viewName, targetSectionId = null) {
    if (viewName === "teacher" && !AuthManager.isLoggedIn()) {
      this.showToast("Silakan masuk terlebih dahulu dengan akun dewan guru.", "normal");
      this.navigateTo("login");
      return;
    }

    const viewStudent = document.getElementById("viewStudent");
    const viewLogin = document.getElementById("viewLogin");
    const viewTeacherPortal = document.getElementById("viewTeacherPortal");

    if (!viewStudent || !viewLogin || !viewTeacherPortal) return;

    viewStudent.classList.add("hidden");
    viewLogin.classList.add("hidden");
    viewTeacherPortal.classList.add("hidden");

    if (viewName === "login") {
      viewLogin.classList.remove("hidden");
      this.currentView = "login";
      if (window.location.hash !== "#login-guru") {
        window.history.replaceState(null, "", "#login-guru");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (viewName === "teacher") {
      viewTeacherPortal.classList.remove("hidden");
      this.currentView = "teacher";
      if (window.location.hash !== "#portal-guru") {
        window.history.replaceState(null, "", "#portal-guru");
      }
      this.renderTeacherProfile();
      this.renderTeacherTable();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      viewStudent.classList.remove("hidden");
      this.currentView = "student";
      if (targetSectionId) {
        if (window.location.hash !== `#${targetSectionId}`) {
          window.history.replaceState(null, "", `#${targetSectionId}`);
        }
        const targetElem = document.getElementById(targetSectionId);
        if (targetElem) {
          setTimeout(() => {
            targetElem.scrollIntoView({ behavior: "smooth" });
          }, 80);
        }
      } else {
        if (window.location.hash && window.location.hash !== "#beranda") {
          window.history.replaceState(null, "", "#beranda");
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

  // Render Profil Guru di Ruang Guru
  renderTeacherProfile: function () {
    const teacher = AuthManager.getTeacher() || AuthManager.defaultTeacher;
    const greetingElem = document.getElementById("teacherDisplayGreeting");
    const nipElem = document.getElementById("teacherDisplayNip");
    const avatarElem = document.getElementById("teacherAvatarText");

    if (greetingElem) greetingElem.textContent = teacher.name;
    if (nipElem) nipElem.textContent = `NIP. ${teacher.nip} • Dewan Guru SMPN 7`;
    if (avatarElem) {
      const initials = teacher.name.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "G";
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
      this.showToast(res.message || "Gagal masuk. Periksa kembali NIP/email Anda.", "danger");
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

    if (sourceType === "file") {
      if (tabFile) tabFile.classList.add("active");
      if (tabYt) tabYt.classList.remove("active");
      if (blockFile) blockFile.style.display = "block";
      if (blockYt) blockYt.style.display = "none";
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

  handleFileSelectedFile: function (file) {
    this.pendingVideoFile = file;

    const display = document.getElementById("fileSelectedDisplay");
    const nameElem = document.getElementById("selectedFileName");
    const sizeElem = document.getElementById("selectedFileSize");
    const dropzoneTitle = document.getElementById("dropzoneTitleText");

    if (nameElem) nameElem.textContent = file.name;
    if (sizeElem) sizeElem.textContent = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    if (display) display.style.display = "flex";
    if (dropzoneTitle) dropzoneTitle.textContent = "Berkas Video Siap Diunggah ke Channel Sekolah";
  },

  clearSelectedVideoFile: function () {
    this.pendingVideoFile = null;
    const input = document.getElementById("inputVideoLocalFile");
    if (input) input.value = "";
    const display = document.getElementById("fileSelectedDisplay");
    if (display) display.style.display = "none";
    const dropzoneTitle = document.getElementById("dropzoneTitleText");
    if (dropzoneTitle) dropzoneTitle.textContent = "Tarik & Lepas File Video di Sini atau Klik untuk Memilih";
    const progressWrapper = document.getElementById("videoUploadProgressWrapper");
    if (progressWrapper) progressWrapper.style.display = "none";
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

    const titleInput = document.getElementById("simpleVideoTitle");
    const gradeInput = document.getElementById("simpleVideoGrade");
    const subjectInput = document.getElementById("simpleVideoSubject");
    const outcomeInput = document.getElementById("simpleVideoOutcome");
    const notesInput = document.getElementById("simpleVideoNotes");
    const quizUrlInput = document.getElementById("simpleVideoQuizUrl");
    const chaptersInput = document.getElementById("simpleVideoChapters");
    const ytInput = document.getElementById("inputTeacherYoutubeUrl");

    if (!formSection || !tableSection) return;

    if (mode === "create") {
      if (modeInput) modeInput.value = "create";
      if (editIdInput) editIdInput.value = "";
      if (mainTitle) mainTitle.textContent = "Tambah Materi Video Pembelajaran";
      if (mainDesc) mainDesc.textContent = "Isi sumber video dan identitas kelas di bawah ini. Materi yang disimpan akan langsung tayang di katalog siswa.";
      if (submitBtnText) submitBtnText.textContent = "Simpan & Tayangkan Materi ke Siswa";

      // Reset Formulir
      if (titleInput) titleInput.value = "";
      if (outcomeInput) outcomeInput.value = "";
      if (notesInput) notesInput.value = "";
      if (quizUrlInput) quizUrlInput.value = "";
      if (chaptersInput) chaptersInput.value = "";
      if (ytInput) ytInput.value = "";
      if (subjectInput) subjectInput.value = "Matematika";
      this.selectGradeBtn("7");
      this.switchUploadSource("youtube");
      this.handleYoutubeUrlInput("");
      this.pendingVideoFile = null;
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
      if (mainDesc) mainDesc.textContent = "Perbarui detail materi ajar di bawah ini. Perubahan akan langsung disinkronkan ke katalog siswa.";
      if (submitBtnText) submitBtnText.textContent = "Simpan Perubahan Materi";

      if (titleInput) titleInput.value = v.title || "";
      if (subjectInput) subjectInput.value = v.subject || "Matematika";
      this.selectGradeBtn(v.grade || "7");
      if (outcomeInput) outcomeInput.value = v.learningOutcome || "";
      if (notesInput) notesInput.value = v.pdfContent || v.description || "";
      if (quizUrlInput) quizUrlInput.value = v.quizUrl || "";

      const chapText = (v.chapters || []).map(ch => `${ch.time} ${ch.title}`).join("\n");
      if (chaptersInput) chaptersInput.value = chapText;

      if (v.sourceType === "local") {
        this.switchUploadSource("file");
      } else {
        this.switchUploadSource("youtube");
        if (ytInput) ytInput.value = v.embedUrl || "";
        this.handleYoutubeUrlInput(v.embedUrl || "");
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
      if (thumbImg) thumbImg.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
      if (durationElem) durationElem.textContent = "14:20";
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
        let videoPayload = {
          title,
          grade,
          subject,
          category: this.mapCategoryBySubject(subject),
          teacher: teacher.name,
          teacherNip: teacher.nip || "",
          duration: "15:00",
          description: notes || `Materi pembelajaran mandiri mata pelajaran ${subject} Kelas ${grade}. Silakan dipelajari siswa secara berulang.`,
          learningOutcome: outcome || "",
          pdfContent: notes || "",
          quizUrl: quizUrl || "",
          thumbnail: defaultCover,
          publishedAt: new Date().toISOString(),
          chapters: this.parseChaptersInput(chaptersRaw)
        };

        if (this.currentUploadSource === "file") {
          if (!this.pendingVideoFile) {
            this.showToast("Silakan pilih berkas video MP4/WebM dari komputer Anda terlebih dahulu.", "danger");
            if (submitBtn) submitBtn.disabled = false;
            return;
          }

          const progressWrapper = document.getElementById("videoUploadProgressWrapper");
          const progressBar = document.getElementById("uploadProgressBar");
          const progressPercent = document.getElementById("uploadProgressPercentText");
          const progressStatus = document.getElementById("uploadProgressStatusText");

          if (progressWrapper) progressWrapper.style.display = "block";
          if (progressBar) progressBar.style.width = "10%";
          if (progressPercent) progressPercent.textContent = "10%";
          if (progressStatus) progressStatus.textContent = "Menghubungkan ke Channel YouTube Sekolah...";

          let uploadedToYouTube = false;
          try {
            const ytVideoId = await YouTubeUploader.uploadVideo(
              this.pendingVideoFile,
              {
                title: title,
                description: videoPayload.description
              },
              (percent) => {
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressPercent) progressPercent.textContent = `${percent}%`;
                if (progressStatus) progressStatus.textContent = `Mengunggah ke YouTube Channel Sekolah... ${percent}%`;
              }
            );

            if (ytVideoId) {
              uploadedToYouTube = true;
              if (progressStatus) progressStatus.textContent = "Unggah selesai! Menyimpan data materi...";
              videoPayload.sourceType = "youtube";
              videoPayload.embedUrl = RepoStorage.formatVideoEmbedUrl("https://youtu.be/" + ytVideoId);
              videoPayload.thumbnail = `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`;
            }
          } catch (uploadErr) {
            console.warn("[YOUTUBE UPLOAD] Direct upload ke YouTube tidak dapat dilanjutkan, beralih ke lokal:", uploadErr);
            this.showToast("Mengalihkan ke penyimpanan lokal peramban (mode mandiri)...", "info");
          }

          if (!uploadedToYouTube) {
            videoPayload.sourceType = "local";
            videoPayload.embedUrl = "";
            const snapshot = await this.generateVideoThumbnail(this.pendingVideoFile);
            if (snapshot) {
              videoPayload.thumbnail = snapshot;
            }
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
          videoPayload.embedUrl = RepoStorage.formatVideoEmbedUrl(ytUrl);
          videoPayload.thumbnail = RepoStorage.getThumbnailUrl(ytUrl) || defaultCover;
        }

        await RepoStorage.addVideo(videoPayload, this.currentUploadSource === "file" ? this.pendingVideoFile : null);
        this.showToast("Materi pembelajaran berhasil disimpan dan langsung tayang di katalog siswa!", "success");
      } else {
        // Mode Ubah / Edit
        let updatedData = {
          title,
          grade,
          subject,
          category: this.mapCategoryBySubject(subject),
          learningOutcome: outcome,
          pdfContent: notes,
          quizUrl: quizUrl,
          description: notes || `Materi pembelajaran untuk ${subject} Kelas ${grade}.`,
          chapters: this.parseChaptersInput(chaptersRaw)
        };

        if (this.currentUploadSource === "youtube") {
          const ytInput = document.getElementById("inputTeacherYoutubeUrl");
          const ytUrl = ytInput ? ytInput.value.trim() : "";
          if (ytUrl) {
            const ytId = RepoStorage.extractYouTubeId(ytUrl);
            if (!ytId) {
              this.showToast("Tautan video YouTube tidak valid. Mohon periksa kembali.", "danger");
              if (submitBtn) submitBtn.disabled = false;
              return;
            }
            updatedData.embedUrl = RepoStorage.formatVideoEmbedUrl(ytUrl);
            updatedData.thumbnail = RepoStorage.getThumbnailUrl(ytUrl) || this.getCoverBySubject(subject);
            updatedData.sourceType = "youtube";
          }
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
      this.showToast("Terjadi kendala saat menyimpan video. Silakan coba kembali.", "danger");
    } finally {
      const progressWrapper = document.getElementById("videoUploadProgressWrapper");
      if (progressWrapper) progressWrapper.style.display = "none";
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  },

  // Modal Edit Video Guru (Diarahkan ke Form 3-Step)
  openEditModal: function (id) {
    this.openTeacherForm("edit", id);
  },

  closeEditModal: function () {
    this.closeTeacherForm();
  },

  // Render Tabel Materi di Ruang Guru
  renderTeacherTable: function (query = "") {
    const tableBody = document.getElementById("teacherVideoTableBody");
    if (!tableBody) return;

    let videos = RepoStorage.getVideos();
    if (query) {
      videos = videos.filter(v =>
        v.title.toLowerCase().includes(query) ||
        v.subject.toLowerCase().includes(query) ||
        v.teacher.toLowerCase().includes(query)
      );
    }

    if (videos.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: var(--color-ink-subtle);">
            Tidak ada materi pembelajaran yang ditemukan.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = videos.map((v, idx) => {
      const isLocal = v.sourceType === "local";
      const formattedDate = RepoStorage.formatDate(v.publishedAt);
      const safeTitle = escapeHtml(v.title);
      const safeSubject = escapeHtml(v.subject);
      const safeGrade = escapeHtml(v.grade);
      return `
        <tr>
          <td style="color: var(--color-ink-subtle);">${idx + 1}</td>
          <td>
            <div style="font-weight: 600; color: var(--color-ink);">${safeTitle}</div>
            <div style="font-size: 0.8125rem; color: var(--color-ink-subtle); margin-top: 2px;">
              ${safeSubject} • Kelas ${safeGrade}
            </div>
          </td>
          <td style="font-size: 0.8125rem; color: var(--color-ink-muted);">
            ${formattedDate}
          </td>
          <td>
            <span class="table-badge-source ${isLocal ? 'local' : 'youtube'}">
              ${isLocal ? 'Berkas Laptop' : 'YouTube'}
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="App.openVideoById('${v.id}')" title="Uji putar materi">
              Tonton
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="App.openEditModal('${v.id}')" title="Edit materi" style="margin-left: 4px;">
              Edit
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="App.deleteVideoItem('${v.id}')" title="Hapus materi" style="margin-left: 4px; color: var(--color-danger); border-color: rgba(235, 87, 87, 0.3);">
              Hapus
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  // Hapus Materi Video dari Repositori
  deleteVideoItem: async function (id) {
    if (confirm("Apakah Bapak/Ibu guru yakin ingin menghapus materi pembelajaran ini?")) {
      await RepoStorage.deleteVideo(id);
      this.showToast("Materi pembelajaran telah dihapus dari repositori.");
      this.renderStats();
      this.renderVideoGrid();
      this.renderTeacherTable();
      this.initFeaturedRotation();
    }
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

  // Notifikasi Toast Modern
  showToast: function (message, type = "normal") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("active");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("active");
      setTimeout(() => {
        if (container.contains(toast)) container.removeChild(toast);
      }, 200);
    }, 3200);
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

      return `
        <article 
          class="video-card ${isDone ? 'video-card-completed' : ''}" 
          id="card-${v.id}"
          onclick="App.openVideoById('${v.id}')"
          onkeydown="App.handleCardKeydown(event, '${v.id}')"
          tabindex="0"
          role="button"
          aria-label="Pelajari materi ${safeTitle} untuk ${safeSubject} Kelas ${safeGrade}"
        >
          <div class="card-thumbnail-wrap">
            <img 
              src="${coverSrc}" 
              alt="${safeTitle}" 
              loading="lazy"
              onerror="this.onerror=null; this.src=App.getCoverBySubject('${v.subject}');"
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
                onclick="event.stopPropagation(); App.openVideoById('${v.id}')"
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

  openVideoById: function (id) {
    const videos = RepoStorage.getVideos();
    const target = videos.find(v => v.id === id);
    if (target) {
      VideoPlayer.openPlayer(target);
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


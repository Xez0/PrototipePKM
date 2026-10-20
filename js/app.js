/* ==========================================================================
   APLIKASI UTAMA: REPOSITORI VIDEO SMPN 7 TANGERANG SELATAN
   Linear Design System & Pengontrol Navigasi:
   Katalog Siswa, Login Guru Mandiri, Ruang Unggah Video Berkas Lokal & YouTube,
   Pencarian Cerdas, Filter Jenjang, & Pelacak Progres Belajar
   ========================================================================== */

const App = {
  currentView: "student", // 'student' | 'login' | 'teacher'
  currentUploadSource: "file", // 'file' | 'youtube'
  pendingVideoFile: null,
  activeGradeFilter: "all",
  activeCategoryFilter: "all",
  searchQuery: "",

  // Inisialisasi Saat DOM Siap
  init: function () {
    this.initTheme();
    this.bindEvents();
    this.updateAuthUI();
    this.handleHashChange();
    window.addEventListener("hashchange", () => this.handleHashChange());
    this.renderStats();
    this.renderVideoGrid();
    this.renderTeacherTable();
  },

  // Sinkronisasi Hash URL dengan Tampilan View
  handleHashChange: function () {
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (hash === "portal-guru") {
      this.navigateTo("teacher");
    } else if (hash === "login-guru" || hash === "masuk-guru") {
      this.navigateTo("login");
    } else if (hash === "katalog" || hash === "edukasi-pkm" || hash === "beranda") {
      this.navigateTo("student", hash);
    } else {
      // Tampilan default: siswa
      this.navigateTo("student");
    }
  },

  // Navigasi Terpadu Antar Halaman (Siswa / Login / Ruang Guru)
  navigateTo: function (viewName, targetSectionId = null) {
    // Proteksi Ruang Pengelolaan Guru: Harus login terlebih dahulu
    if (viewName === "teacher" && !AuthManager.isLoggedIn()) {
      this.showToast("Silakan masuk terlebih dahulu dengan akun dewan guru.", "normal");
      this.navigateTo("login");
      return;
    }

    const viewStudent = document.getElementById("viewStudent");
    const viewLogin = document.getElementById("viewLogin");
    const viewTeacherPortal = document.getElementById("viewTeacherPortal");

    if (!viewStudent || !viewLogin || !viewTeacherPortal) return;

    // Sembunyikan semua view
    viewStudent.classList.add("hidden");
    viewLogin.classList.add("hidden");
    viewTeacherPortal.classList.add("hidden");

    if (viewName === "login") {
      viewLogin.classList.remove("hidden");
      this.currentView = "login";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (viewName === "teacher") {
      viewTeacherPortal.classList.remove("hidden");
      this.currentView = "teacher";
      this.renderTeacherProfile();
      this.renderTeacherTable();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Default: Student View
      viewStudent.classList.remove("hidden");
      this.currentView = "student";
      if (targetSectionId) {
        const targetElem = document.getElementById(targetSectionId);
        if (targetElem) {
          setTimeout(() => {
            targetElem.scrollIntoView({ behavior: "smooth" });
          }, 80);
        }
      } else {
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

  // Render Profil Guru di Tampilan Ruang Guru
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
      if (identifierInput) identifierInput.value = "";
      if (passwordInput) passwordInput.value = "";
      this.navigateTo("teacher");
    } else {
      this.showToast(res.message, "danger");
    }
  },

  // Masuk Instan (Akun Demo Guru untuk Kemudahan Penguji PkM)
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

  // Penanganan File Video Dipilih dari Komputer
  handleFileSelected: function (input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.pendingVideoFile = file;

      const display = document.getElementById("fileSelectedDisplay");
      const nameElem = document.getElementById("selectedFileName");
      const sizeElem = document.getElementById("selectedFileSize");
      const dropzoneTitle = document.getElementById("dropzoneTitleText");

      if (nameElem) nameElem.textContent = file.name;
      if (sizeElem) sizeElem.textContent = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      if (display) display.style.display = "flex";
      if (dropzoneTitle) dropzoneTitle.textContent = "Berkas Video Siap Ditayangkan";
    }
  },

  // Pemilihan Jenjang Kelas Cepat (Radio Button Sederhana)
  selectGradeBtn: function (grade) {
    const gradeInput = document.getElementById("simpleVideoGrade");
    if (gradeInput) gradeInput.value = grade;

    document.querySelectorAll(".grade-radio-btn").forEach(btn => {
      if (btn.getAttribute("data-grade-val") === grade) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  },

  // Pemetaan Kategori Mapel
  mapCategoryBySubject: function (subject) {
    const s = (subject || "").toLowerCase();
    if (s.includes("matematika") || s.includes("ipa")) return "MIPA";
    if (s.includes("informatika") || s.includes("tik")) return "Informatika";
    if (s.includes("bahasa")) return "Bahasa";
    return "IPS";
  },

  // Penanganan Simpan Video Guru (Form Sederhana Ramah Guru)
  handleTeacherFormSubmit: async function () {
    const titleInput = document.getElementById("simpleVideoTitle");
    const gradeInput = document.getElementById("simpleVideoGrade");
    const subjectInput = document.getElementById("simpleVideoSubject");
    const notesInput = document.getElementById("simpleVideoNotes");
    const submitBtn = document.getElementById("btnSubmitSimpleVideo");

    const title = titleInput ? titleInput.value.trim() : "";
    const grade = gradeInput ? gradeInput.value : "7";
    const subject = subjectInput ? subjectInput.value : "Matematika";
    const notes = notesInput ? notesInput.value.trim() : "";

    if (!title) {
      this.showToast("Mohon tuliskan judul materi pembelajaran.", "danger");
      if (titleInput) titleInput.focus();
      return;
    }

    const teacher = AuthManager.getTeacher() || AuthManager.defaultTeacher;
    let videoPayload = {
      title,
      grade,
      subject,
      category: this.mapCategoryBySubject(subject),
      teacher: teacher.name,
      teacherNip: teacher.nip || "",
      duration: "15:00",
      description: notes || `Materi pembelajaran mandiri untuk mata pelajaran ${subject} Kelas ${grade}. Silakan dipelajari siswa secara berulang.`,
      learningOutcome: `Peserta didik menguasai materi ${title} dengan baik secara mandiri melalui tayangan video pembelajaran.`,
      chapters: [
        { time: "00:00", title: "Pembahasan Inti Materi", seconds: 0 }
      ],
      pdfTitle: `Rangkuman_${subject.replace(/[^a-zA-Z0-9]/g, "_")}_Kelas${grade}.pdf`,
      pdfContent: `Rangkuman belajar materi ${title} (${subject} Kelas ${grade}). Disediakan oleh ${teacher.name} untuk pendalaman mandiri peserta didik UPTD SMP Negeri 7 Kota Tangerang Selatan.`
    };

    if (this.currentUploadSource === "file") {
      if (!this.pendingVideoFile) {
        this.showToast("Silakan pilih berkas video MP4 dari komputer Anda terlebih dahulu.", "danger");
        return;
      }
      videoPayload.embedUrl = "";
      videoPayload.thumbnail = "assets/hero-mockup.webp";
    } else {
      const ytInput = document.getElementById("inputTeacherYoutubeUrl");
      const ytUrl = ytInput ? ytInput.value.trim() : "";
      if (!ytUrl) {
        this.showToast("Silakan masukkan tautan video YouTube.", "danger");
        if (ytInput) ytInput.focus();
        return;
      }
      videoPayload.embedUrl = StorageManager.formatVideoEmbedUrl(ytUrl);
      videoPayload.thumbnail = StorageManager.getThumbnailUrl(ytUrl);
    }

    // Tampilkan Status Simpan
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Menyimpan ke Repositori...";
    }

    try {
      await StorageManager.addVideo(videoPayload, this.currentUploadSource === "file" ? this.pendingVideoFile : null);
      this.showToast("Materi pembelajaran berhasil disimpan dan langsung tayang di katalog siswa!", "success");

      // Reset Formulir
      if (titleInput) titleInput.value = "";
      if (notesInput) notesInput.value = "";
      const ytInput = document.getElementById("inputTeacherYoutubeUrl");
      if (ytInput) ytInput.value = "";
      const fileInput = document.getElementById("inputVideoLocalFile");
      if (fileInput) fileInput.value = "";
      this.pendingVideoFile = null;

      const fileDisplay = document.getElementById("fileSelectedDisplay");
      if (fileDisplay) fileDisplay.style.display = "none";
      const dropzoneTitle = document.getElementById("dropzoneTitleText");
      if (dropzoneTitle) dropzoneTitle.textContent = "Klik untuk Memilih File Video dari Laptop / HP";

      // Sinkronisasi data ke tampilan
      this.renderStats();
      this.renderVideoGrid();
      this.renderTeacherTable();
    } catch (err) {
      console.error("Gagal menyimpan materi:", err);
      this.showToast("Terjadi kendala saat menyimpan video. Silakan coba kembali.", "danger");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Simpan & Tayangkan Materi ke Siswa";
      }
    }
  },

  // Render Tabel Materi di Ruang Guru
  renderTeacherTable: function (query = "") {
    const tableBody = document.getElementById("teacherVideoTableBody");
    if (!tableBody) return;

    let videos = StorageManager.getVideos();
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
      return `
        <tr>
          <td style="color: var(--color-ink-subtle);">${idx + 1}</td>
          <td>
            <div style="font-weight: 600; color: var(--color-ink);">${v.title}</div>
            <div style="font-size: 0.775rem; color: var(--color-ink-subtle); margin-top: 2px;">
              ${v.subject} • Kelas ${v.grade}
            </div>
          </td>
          <td>
            <span class="table-badge-source ${isLocal ? 'local' : 'youtube'}">
              ${isLocal ? 'Berkas Laptop' : 'YouTube'}
            </span>
          </td>
          <td style="font-size: 0.8125rem; color: var(--color-ink-muted);">${v.teacher}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="App.openVideoById('${v.id}')" title="Uji putar materi">
              Putar Video
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="App.deleteVideoItem('${v.id}')" title="Hapus materi" style="margin-left: 6px; color: var(--color-danger); border-color: rgba(235, 87, 87, 0.3);">
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
      await StorageManager.deleteVideo(id);
      this.showToast("Materi pembelajaran telah dihapus dari repositori.");
      this.renderStats();
      this.renderVideoGrid();
      this.renderTeacherTable();
    }
  },

  // Inisialisasi Tema
  initTheme: function () {
    const savedTheme = StorageManager.getTheme();
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeButton(savedTheme);
  },

  toggleTheme: function () {
    const current = StorageManager.getTheme();
    const nextTheme = current === "dark" ? "light" : "dark";
    StorageManager.setTheme(nextTheme);
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
    // 1. Pencarian Cerdas di Katalog Siswa
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderVideoGrid();
      });
    }

    // 2. Tombol Reset / Clear Search
    const clearBtn = document.getElementById("clearSearchBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        this.searchQuery = "";
        this.renderVideoGrid();
      });
    }

    // 3. Filter Jenjang Kelas
    const gradeChips = document.querySelectorAll("[data-filter-grade]");
    gradeChips.forEach(chip => {
      chip.addEventListener("click", () => {
        gradeChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.activeGradeFilter = chip.getAttribute("data-filter-grade");
        this.renderVideoGrid();
      });
    });

    // 4. Filter Kategori Mapel
    const catChips = document.querySelectorAll("[data-filter-category]");
    catChips.forEach(chip => {
      chip.addEventListener("click", () => {
        catChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.activeCategoryFilter = chip.getAttribute("data-filter-category");
        this.renderVideoGrid();
      });
    });

    // 5. Navigasi Tab dalam Theatre Modal
    const tabBtns = document.querySelectorAll(".theatre-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        tabBtns.forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".theatre-tab-pane").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add("active");
      });
    });

    // 6. Input Catatan Mandiri Siswa
    const notesInput = document.getElementById("studentNotesInput");
    if (notesInput) {
      notesInput.addEventListener("input", (e) => {
        VideoPlayer.handleNotesInput(e.target.value);
      });
    }

    // 7. Pintasan Keyboard Linear
    document.addEventListener("keydown", (e) => {
      const tag = e.target.tagName.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";

      if (e.key === "Escape") {
        VideoPlayer.closePlayer();
        return;
      }

      if (!isInput) {
        if (e.key === "/" || e.key === "k" || e.key === "K") {
          e.preventDefault();
          if (searchInput && this.currentView === "student") {
            searchInput.focus();
            searchInput.select();
          }
        } else if (e.key === "g" || e.key === "G") {
          e.preventDefault();
          this.handleTeacherNavClick();
        } else if (e.key === "t" || e.key === "T") {
          e.preventDefault();
          this.toggleTheme();
        } else if (e.key === "p" || e.key === "P") {
          if (VideoPlayer.currentVideo) {
            e.preventDefault();
            VideoPlayer.openPrintSummary();
          }
        }
      }
    });

    // 8. Impor File Cadangan
    const importInput = document.getElementById("importFileInput");
    if (importInput) {
      importInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const res = StorageManager.importData(event.target.result);
          if (res.success) {
            this.showToast(`Berhasil memulihkan ${res.count} materi video!`, "success");
            this.renderStats();
            this.renderVideoGrid();
            this.renderTeacherTable();
          } else {
            this.showToast(res.message, "danger");
          }
        };
        reader.readAsText(file);
      });
    }
  },

  // Perbarui Counter Statistik Hero & Progres Siswa
  renderStats: function () {
    const stats = StorageManager.getStatistics();
    const statVideos = document.getElementById("statTotalVideos");
    const statSubjects = document.getElementById("statTotalSubjects");
    const statTeachers = document.getElementById("statTotalTeachers");

    if (statVideos) statVideos.textContent = stats.totalVideos;
    if (statSubjects) statSubjects.textContent = stats.totalSubjects;
    if (statTeachers) statTeachers.textContent = stats.totalTeachers;

    const progressFill = document.getElementById("userProgressFill");
    const progressText = document.getElementById("userProgressText");
    const progressPercent = document.getElementById("userProgressPercent");

    if (progressFill) progressFill.style.width = `${stats.progressPercent}%`;
    if (progressText) progressText.textContent = `${stats.completedVideos} dari ${stats.totalVideos} materi selesai dipelajari`;
    if (progressPercent) progressPercent.textContent = `${stats.progressPercent}%`;

    this.updateCategoryChipCounts();
  },

  updateCategoryChipCounts: function () {
    const videos = StorageManager.getVideos();
    const counts = {
      all: videos.length,
      MIPA: videos.filter(v => v.category === "MIPA").length,
      Informatika: videos.filter(v => v.category === "Informatika").length,
      Bahasa: videos.filter(v => v.category === "Bahasa").length,
      IPS: videos.filter(v => v.category === "IPS").length
    };

    document.querySelectorAll("[data-chip-count]").forEach(span => {
      const cat = span.getAttribute("data-chip-count");
      if (counts[cat] !== undefined) {
        span.textContent = counts[cat];
      }
    });
  },

  // Render Grid Video Siswa
  renderVideoGrid: function () {
    const gridContainer = document.getElementById("videoGridContainer");
    if (!gridContainer) return;

    const allVideos = StorageManager.getVideos();
    const filtered = allVideos.filter(v => {
      const matchGrade = this.activeGradeFilter === "all" || v.grade === this.activeGradeFilter;
      const matchCat = this.activeCategoryFilter === "all" || v.category === this.activeCategoryFilter;
      const query = this.searchQuery;
      const matchSearch = !query ||
        v.title.toLowerCase().includes(query) ||
        v.subject.toLowerCase().includes(query) ||
        v.teacher.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query);

      return matchGrade && matchCat && matchSearch;
    });

    const resultCountElem = document.getElementById("searchResultCount");
    if (resultCountElem) {
      resultCountElem.textContent = `${filtered.length} materi ditemukan`;
    }

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3 class="empty-title">Materi Tidak Ditemukan</h3>
          <p class="empty-desc">Coba sesuaikan kata kunci pencarian atau ubah pilihan jenjang kelas dan kelompok mapel.</p>
          <button type="button" class="btn btn-secondary btn-sm" onclick="App.resetFilters()">Tampilkan Semua Materi</button>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = filtered.map(v => {
      const isDone = StorageManager.isCompleted(v.id);
      const isLocal = v.sourceType === "local";
      return `
        <article 
          class="video-card ${isDone ? 'video-card-completed' : ''}" 
          id="card-${v.id}"
          onclick="App.openVideoById('${v.id}')"
          onkeydown="App.handleCardKeydown(event, '${v.id}')"
          tabindex="0"
          role="button"
          aria-label="Pelajari materi ${v.title} untuk ${v.subject} Kelas ${v.grade}"
        >
          <div class="card-thumbnail-wrap">
            <img src="${v.thumbnail || 'assets/hero-mockup.webp'}" alt="${v.title}" loading="lazy">
            <span class="card-badge-grade" data-grade="${v.grade}">Kelas ${v.grade}</span>
            <span class="card-badge-source ${isLocal ? 'badge-local' : 'badge-yt'}">
              ${isLocal ? 'Berkas Laptop' : 'YouTube'}
            </span>
            <span class="card-duration">${v.duration || '15:00'}</span>
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
              <span class="card-meta-subject">${v.subject}</span>
              ${isDone ? `
                <span class="status-completed-badge" title="Telah kamu pelajari mandiri">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Selesai
                </span>
              ` : `
                <span class="status-unwatched-badge">Materi Baru</span>
              `}
            </div>
            
            <h3 class="card-title" title="${v.title}">${v.title}</h3>
            <p class="card-desc-snippet">${v.description}</p>
            
            <div class="card-teacher">
              <div class="teacher-avatar-tiny">${v.teacher.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase()}</div>
              <span class="teacher-name-txt">${v.teacher}</span>
            </div>

            <div class="card-footer-action">
              <button 
                type="button" 
                class="btn btn-primary btn-sm btn-card-watch" 
                onclick="event.stopPropagation(); App.openVideoById('${v.id}')"
                title="Buka dan tonton video materi sekarang"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 20 12 6 20 6 4"/>
                </svg>
                <span>Tonton Video</span>
              </button>
              
              <button 
                type="button" 
                class="btn btn-secondary btn-sm btn-card-print" 
                onclick="event.stopPropagation(); App.openAndPrint('${v.id}')"
                title="Cetak lembar rangkuman & modul belajar resmi SMPN 7"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span>Cetak PDF</span>
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

  openVideoById: function (id) {
    const videos = StorageManager.getVideos();
    const target = videos.find(v => v.id === id);
    if (target) {
      VideoPlayer.openPlayer(target);
    }
  },

  openAndPrint: function (id) {
    const videos = StorageManager.getVideos();
    const target = videos.find(v => v.id === id);
    if (target) {
      VideoPlayer.currentVideo = target;
      VideoPlayer.openPrintSummary();
    }
  },

  openFeaturedHero: function () {
    const videos = StorageManager.getVideos();
    if (videos.length > 0) {
      VideoPlayer.openPlayer(videos[0]);
    }
  },

  triggerImport: function () {
    const input = document.getElementById("importFileInput");
    if (input) input.click();
  },

  toggleFaq: function (cardElement) {
    const isOpen = cardElement.classList.contains("open");
    document.querySelectorAll(".faq-card").forEach(c => c.classList.remove("open"));
    if (!isOpen) {
      cardElement.classList.add("open");
    }
  },

  showToast: function (msg, type = "normal") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${msg}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add("active"), 10);
    setTimeout(() => {
      toast.classList.remove("active");
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

/* ==========================================================================
   APLIKASI UTAMA: REPOSITORI VIDEO SMPN 7 TANGERANG SELATAN
   Linear Design System & Pengontrol Interaksi:
   Pencarian Cerdas, Filter Jenjang/Mapel, Pelacak Progres Belajar Siswa,
   Panel Guru Penuh (Tambah, Edit, Hapus, Ekspor/Impor), & Pintasan Keyboard
   ========================================================================== */

const App = {
  activeGradeFilter: "all",
  activeCategoryFilter: "all",
  searchQuery: "",
  editingVideoId: null, // ID materi yang sedang diedit di Panel Guru

  // Inisialisasi Saat DOM Siap
  init: function () {
    this.initTheme();
    this.bindEvents();
    this.renderStats();
    this.renderVideoGrid();
  },

  // Inisialisasi & Sinkronisasi Tema Linear
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
    this.showToast(`Beralih ke tema ${nextTheme === 'dark' ? 'Midnight Gelap (Belajar Malam)' : 'Terang Resmi (Sekolah)'}`);
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
    // 1. Pencarian Cerdas
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

    // 5. Form Tambah / Edit Video Guru
    const addVideoForm = document.getElementById("addVideoForm");
    if (addVideoForm) {
      addVideoForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleTeacherFormSubmit();
      });
    }

    // 6. Pencarian di Tabel Panel Guru
    const teacherSearchInput = document.getElementById("teacherSearchInput");
    if (teacherSearchInput) {
      teacherSearchInput.addEventListener("input", (e) => {
        this.renderTeacherTable(e.target.value.toLowerCase().trim());
      });
    }

    // 7. Navigasi Tab dalam Theatre Modal
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

    // 8. Input Catatan Siswa
    const notesInput = document.getElementById("studentNotesInput");
    if (notesInput) {
      notesInput.addEventListener("input", (e) => {
        VideoPlayer.handleNotesInput(e.target.value);
      });
    }

    // 9. Pintasan Keyboard Linear (Power User & Guru)
    document.addEventListener("keydown", (e) => {
      // Abaikan jika user sedang mengetik di input / textarea
      const tag = e.target.tagName.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";

      if (e.key === "Escape") {
        VideoPlayer.closePlayer();
        this.closeTeacherModal();
        return;
      }

      if (!isInput) {
        if (e.key === "/" || e.key === "k" || e.key === "K") {
          e.preventDefault();
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        } else if (e.key === "g" || e.key === "G") {
          e.preventDefault();
          this.openTeacherModal();
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

    // 10. Impor File Cadangan
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

    // Perbarui Progress Strip Siswa
    const progressFill = document.getElementById("userProgressFill");
    const progressText = document.getElementById("userProgressText");
    const progressPercent = document.getElementById("userProgressPercent");

    if (progressFill) progressFill.style.width = `${stats.progressPercent}%`;
    if (progressText) progressText.textContent = `${stats.completedVideos} dari ${stats.totalVideos} materi selesai dipelajari`;
    if (progressPercent) progressPercent.textContent = `${stats.progressPercent}%`;

    // Perbarui jumlah badge pada filter kategori
    this.updateCategoryChipCounts();
  },

  // Perbarui Jumlah Materi pada Filter Chip
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

  // Filter dan Render Grid Video Siswa
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
          <button class="btn btn-secondary btn-sm" onclick="App.resetFilters()">Tampilkan Semua Materi</button>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = filtered.map(v => {
      const isDone = StorageManager.isCompleted(v.id);
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
            <img src="${v.thumbnail}" alt="${v.title}" loading="lazy">
            <span class="card-badge-grade" data-grade="${v.grade}">Kelas ${v.grade}</span>
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

            <!-- Tombol Aksi Langsung (Antislop: Jelas, Nyata, dan Langsung Merespons) -->
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

  // Navigasi Keyboard pada Kartu Video (Pintasan Enter & Spasi)
  handleCardKeydown: function (e, id) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.openVideoById(id);
    }
  },

  // Reset Filter
  resetFilters: function () {
    this.activeGradeFilter = "all";
    this.activeCategoryFilter = "all";
    this.searchQuery = "";
    document.querySelectorAll("[data-filter-grade]").forEach(c => c.classList.remove("active"));
    document.querySelector("[data-filter-grade='all']").classList.add("active");
    document.querySelectorAll("[data-filter-category]").forEach(c => c.classList.remove("active"));
    document.querySelector("[data-filter-category='all']").classList.add("active");
    const input = document.getElementById("searchInput");
    if (input) input.value = "";
    this.renderVideoGrid();
  },

  // Buka Video Spesifik
  openVideoById: function (id) {
    const videos = StorageManager.getVideos();
    const target = videos.find(v => v.id === id);
    if (target) {
      VideoPlayer.openPlayer(target);
    }
  },

  // Buka & Langsung Cetak Lembar Belajar Resmi
  openAndPrint: function (id) {
    const videos = StorageManager.getVideos();
    const target = videos.find(v => v.id === id);
    if (target) {
      VideoPlayer.currentVideo = target;
      VideoPlayer.openPrintSummary();
    }
  },

  // Buka Video Populer di Hero
  openFeaturedHero: function () {
    const videos = StorageManager.getVideos();
    if (videos.length > 0) {
      VideoPlayer.openPlayer(videos[0]);
    }
  },

  // ============================================================
  // PANEL GURU (CRUD LENGKAP: TAMBAH, EDIT, HAPUS, & CADANGAN)
  // ============================================================
  openTeacherModal: function () {
    this.resetTeacherForm();
    this.renderTeacherTable();
    const modal = document.getElementById("teacherModalBackdrop");
    if (modal) modal.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  closeTeacherModal: function () {
    const modal = document.getElementById("teacherModalBackdrop");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "auto";
    this.resetTeacherForm();
  },

  resetTeacherForm: function () {
    this.editingVideoId = null;
    const form = document.getElementById("addVideoForm");
    if (form) form.reset();
    const submitBtn = document.getElementById("btnSubmitTeacherForm");
    if (submitBtn) submitBtn.textContent = "Simpan Materi Baru ke Repositori SMPN 7";
    const titleHeader = document.getElementById("teacherFormTitle");
    if (titleHeader) titleHeader.textContent = "+ Unggah Materi Pembelajaran Baru";
    const cancelEditBtn = document.getElementById("btnCancelEditVideo");
    if (cancelEditBtn) cancelEditBtn.style.display = "none";
  },

  // Siapkan Form untuk Mode Edit
  openEditModal: function (id) {
    const videos = StorageManager.getVideos();
    const video = videos.find(v => v.id === id);
    if (!video) return;

    this.editingVideoId = id;
    document.getElementById("inputVideoTitle").value = video.title || "";
    document.getElementById("selectGrade").value = video.grade || "7";
    document.getElementById("selectCategory").value = video.category || "MIPA";
    document.getElementById("inputSubject").value = video.subject || "";
    document.getElementById("inputTeacher").value = video.teacher || "";
    document.getElementById("inputTeacherNip").value = video.teacherNip || "";
    document.getElementById("inputVideoUrl").value = video.embedUrl || "";
    document.getElementById("inputOutcome").value = video.learningOutcome || "";
    document.getElementById("inputDescription").value = video.description || "";
    document.getElementById("inputPdfContent").value = video.pdfContent || "";

    // Format chapters ke format textarea
    if (video.chapters && video.chapters.length > 0) {
      document.getElementById("inputChapters").value = video.chapters
        .map(ch => `${ch.time} - ${ch.title}`)
        .join("\n");
    } else {
      document.getElementById("inputChapters").value = "";
    }

    const submitBtn = document.getElementById("btnSubmitTeacherForm");
    if (submitBtn) submitBtn.textContent = "Simpan Perubahan Materi (Perbarui)";
    const titleHeader = document.getElementById("teacherFormTitle");
    if (titleHeader) titleHeader.textContent = "Perbarui Data Materi Pembelajaran";
    const cancelEditBtn = document.getElementById("btnCancelEditVideo");
    if (cancelEditBtn) cancelEditBtn.style.display = "inline-flex";

    // Scroll form ke tampilan
    document.getElementById("teacherPortalScrollBody").scrollTo({ top: 0, behavior: "smooth" });
  },

  // Batalkan Mode Edit
  cancelEdit: function () {
    this.resetTeacherForm();
  },

  // Submit Penambahan atau Perubahan Materi oleh Guru
  handleTeacherFormSubmit: function () {
    const title = document.getElementById("inputVideoTitle").value.trim();
    const grade = document.getElementById("selectGrade").value;
    const subject = document.getElementById("inputSubject").value.trim();
    const category = document.getElementById("selectCategory").value;
    const teacher = document.getElementById("inputTeacher").value.trim();
    const teacherNip = (document.getElementById("inputTeacherNip")?.value || "").trim();
    const rawUrl = document.getElementById("inputVideoUrl").value.trim();
    const description = document.getElementById("inputDescription").value.trim();
    const learningOutcome = document.getElementById("inputOutcome").value.trim();
    const pdfContent = document.getElementById("inputPdfContent").value.trim();
    const rawChapters = document.getElementById("inputChapters").value.trim();

    if (!title || !subject || !teacher || !rawUrl) {
      this.showToast("Mohon lengkapi judul, mapel, nama guru, dan tautan video.", "danger");
      return;
    }

    // Ekstraksi Embed & Thumbnail
    const embedUrl = StorageManager.formatVideoEmbedUrl(rawUrl);
    const thumbnail = StorageManager.getThumbnailUrl(rawUrl);

    // Parsing bab timecode dengan regex tahan banting
    let parsedChapters = [];
    if (rawChapters) {
      const lines = rawChapters.split("\n");
      lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;
        // Tangkap mm:ss atau hh:mm:ss
        const match = cleanLine.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-:]?\s*(.+)$/);
        if (match) {
          const time = match[1];
          const chTitle = match[2].trim();
          const parts = time.split(":").map(Number);
          let seconds = 0;
          if (parts.length === 2) {
            seconds = parts[0] * 60 + parts[1];
          } else if (parts.length === 3) {
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
          parsedChapters.push({ time, title: chTitle, seconds });
        }
      });
    }

    const payload = {
      title,
      grade,
      subject,
      category,
      teacher,
      teacherNip,
      duration: "15:00",
      embedUrl,
      fallbackVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnail,
      description: description || "Materi video pembelajaran mandiri untuk peserta didik SMPN 7 Tangsel.",
      learningOutcome: learningOutcome || "Peserta didik memahami capaian kompetensi materi melalui video pembelajaran mandiri.",
      pdfTitle: `Rangkuman_${subject.replace(/[^a-zA-Z0-9]/g, '_')}_Kelas${grade}.pdf`,
      pdfContent: pdfContent || `Rangkuman materi ${subject} Kelas ${grade}. Silakan dipelajari untuk persiapan asesmen ulangan.`,
      chapters: parsedChapters.length > 0 ? parsedChapters : [
        { time: "00:00", title: "Materi Pembuka & Konsep", seconds: 0 }
      ]
    };

    if (this.editingVideoId) {
      // Mode Edit
      StorageManager.updateVideo(this.editingVideoId, payload);
      this.showToast("Materi pembelajaran berhasil diperbarui!", "success");
    } else {
      // Mode Tambah Baru
      StorageManager.addVideo(payload);
      this.showToast("Materi video baru berhasil ditambahkan!", "success");
    }

    this.resetTeacherForm();
    this.renderStats();
    this.renderVideoGrid();
    this.renderTeacherTable();
  },

  // Render Tabel Kelola Video Guru dengan Fitur Filter Cepat
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
          <td colspan="4" style="text-align: center; padding: 24px; color: var(--color-ink-subtle);">
            Tidak ada materi yang sesuai dengan pencarian.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = videos.map((v, idx) => `
      <tr>
        <td style="font-family: var(--font-sans); color: var(--color-ink-subtle);">${idx + 1}</td>
        <td>
          <div style="font-weight: 600; color: var(--color-ink);">${v.title}</div>
          <div style="font-size: 0.775rem; color: var(--color-ink-subtle); margin-top: 2px;">
            ${v.subject} • Kelas ${v.grade} • ${v.chapters ? v.chapters.length : 0} Bab
          </div>
        </td>
        <td style="font-size: 0.8125rem; color: var(--color-ink-muted);">${v.teacher}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="App.openVideoById('${v.id}'); App.closeTeacherModal();" title="Pratinjau video">
            Pratinjau
          </button>
          <button class="btn btn-outline btn-sm" onclick="App.openEditModal('${v.id}')" title="Edit materi ini" style="margin-left: 4px;">
            Edit
          </button>
          <button class="btn btn-outline btn-sm" onclick="App.deleteVideoItem('${v.id}')" title="Hapus materi" style="margin-left: 4px; color: var(--color-danger); border-color: rgba(235, 87, 87, 0.3);">
            Hapus
          </button>
        </td>
      </tr>
    `).join("");
  },

  // Hapus Video dari Database
  deleteVideoItem: function (id) {
    if (confirm("Apakah Bapak/Ibu guru yakin ingin menghapus materi video ini dari repositori?")) {
      StorageManager.deleteVideo(id);
      this.showToast("Materi video telah dihapus dari repositori.");
      this.renderStats();
      this.renderVideoGrid();
      this.renderTeacherTable();
    }
  },

  // Reset ke Data Standar
  handleResetDefault: function () {
    if (confirm("Kembalikan data repositori ke sampel materi standar SMPN 7 Tangsel?")) {
      StorageManager.resetToDefault();
      this.showToast("Data repositori berhasil direset ke standar awal.", "success");
      this.renderStats();
      this.renderVideoGrid();
      this.renderTeacherTable();
    }
  },

  triggerImport: function () {
    const input = document.getElementById("importFileInput");
    if (input) input.click();
  },

  // Accordion FAQ Toggle
  toggleFaq: function (cardElement) {
    const isOpen = cardElement.classList.contains("open");
    document.querySelectorAll(".faq-card").forEach(c => c.classList.remove("open"));
    if (!isOpen) {
      cardElement.classList.add("open");
    }
  },

  // Toast Notifikasi Praktis
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

// Jalankan saat DOM siap
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

/* ==========================================================================
   KONTROL PEMUTAR VIDEO BEBAS DISTRAKSI (THEATRE MODE)
   UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN
   Pemutar Ganda (YouTube Edukatif & File Video Lokal IndexedDB), 
   Lompatan Bab Repetisi Manual, & Rangkuman Materi Skolastik Bersih
   ========================================================================== */

const VideoPlayer = {
  currentVideo: null,
  currentMode: "youtube", // 'youtube' atau 'html5'
  activeChapterIndex: 0,
  activeBlobUrl: null,

  // Inisialisasi Event Listener Tab Modal
  init: function () {
    const tabBtns = document.querySelectorAll(".theatre-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        this.switchTab(targetTab);
      });
    });
  },

  // Beralih Antar Tab Sidebar (Bab vs Rangkuman)
  switchTab: function (tabId) {
    document.querySelectorAll(".theatre-tab-btn").forEach(b => {
      if (b.getAttribute("data-tab") === tabId) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });

    document.querySelectorAll(".theatre-tab-pane").forEach(pane => {
      if (pane.id === tabId) {
        pane.classList.add("active");
      } else {
        pane.classList.remove("active");
      }
    });
  },

  // Buka Pemutar Video Fokus
  openPlayer: function (video, forceMode = null) {
    this.currentVideo = video;
    this.activeChapterIndex = 0;

    // Tentukan mode pemutar otomatis berdasarkan sumber video
    if (forceMode) {
      this.currentMode = forceMode;
    } else if (video.sourceType === "local" || !video.embedUrl) {
      this.currentMode = "html5";
    } else {
      this.currentMode = "youtube";
    }

    const modal = document.getElementById("theatreModal");
    const backdrop = document.getElementById("theatreModalBackdrop");
    if (!modal || !backdrop) return;

    // Set Judul & Metadata Skolastik
    const titleElem = document.getElementById("modalVideoTitle");
    const teacherElem = document.getElementById("modalTeacherName");
    const nipElem = document.getElementById("modalTeacherNip");
    const subjectGradeElem = document.getElementById("modalSubjectGrade");
    const descElem = document.getElementById("modalDescription");
    const outcomeElem = document.getElementById("modalLearningOutcome");
    const summaryElem = document.getElementById("modalTeacherSummary");

    if (titleElem) titleElem.textContent = video.title;
    if (teacherElem) teacherElem.textContent = video.teacher;
    if (nipElem) nipElem.textContent = video.teacherNip ? `NIP. ${video.teacherNip}` : "Dewan Guru SMPN 7 Tangsel";
    if (subjectGradeElem) subjectGradeElem.textContent = `${video.subject} • Kelas ${video.grade}`;
    if (descElem) descElem.textContent = video.description || "";

    // Cek Ketersediaan Bab & Rangkuman (Opsional)
    const chapters = Array.isArray(video.chapters) ? video.chapters : [];
    const hasChapters = chapters.length > 0;
    const outcome = (video.learningOutcome || "").trim();
    const summary = (video.pdfContent || "").trim();
    const hasOutcome = outcome.length > 0;
    const hasSummary = summary.length > 0;
    const hasNotes = hasOutcome || hasSummary;

    if (outcomeElem) outcomeElem.textContent = outcome;
    if (summaryElem) summaryElem.textContent = summary;

    const boxOutcome = document.getElementById("boxLearningOutcomeWrap");
    const boxSummary = document.getElementById("boxTeacherSummaryWrap");
    if (boxOutcome) boxOutcome.style.display = hasOutcome ? "block" : "none";
    if (boxSummary) boxSummary.style.display = hasSummary ? "block" : "none";

    // Atur Tampilan Sidebar Adaptif
    const sidebar = document.getElementById("theatreSidebar");
    const contentGrid = document.querySelector(".theatre-content-grid");
    const btnChapters = document.getElementById("btnTabChapters");
    const btnNotes = document.getElementById("btnTabTeacherNotes");

    if (!hasChapters && !hasNotes) {
      // Tidak ada bab maupun rangkuman: Tampilkan pemutar video lebar penuh
      if (sidebar) sidebar.style.display = "none";
      if (contentGrid) contentGrid.classList.add("no-sidebar");
    } else {
      if (sidebar) sidebar.style.display = "flex";
      if (contentGrid) contentGrid.classList.remove("no-sidebar");

      if (hasChapters && !hasNotes) {
        if (btnChapters) btnChapters.style.display = "flex";
        if (btnNotes) btnNotes.style.display = "none";
        this.switchTab("tabChapters");
      } else if (!hasChapters && hasNotes) {
        if (btnChapters) btnChapters.style.display = "none";
        if (btnNotes) btnNotes.style.display = "flex";
        this.switchTab("tabTeacherNotes");
      } else {
        if (btnChapters) btnChapters.style.display = "flex";
        if (btnNotes) btnNotes.style.display = "flex";
        this.switchTab("tabChapters");
      }
    }

    // Render Pemutar Video
    this.renderActivePlayer();

    // Render Daftar Bab
    this.renderChapters(chapters);

    // Set Status Selesai Belajar
    this.updateCompletionButton();

    // Buka Modal
    backdrop.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  // Render Pemutar Video (File Komputer vs YouTube)
  renderActivePlayer: async function () {
    const playerContainer = document.getElementById("modalPlayerContainer");
    if (!playerContainer || !this.currentVideo) return;

    const v = this.currentVideo;

    // Bersihkan URL blob lama jika ada
    if (this.activeBlobUrl) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
    }

    if (this.currentMode === "html5" || v.sourceType === "local" || !v.embedUrl) {
      let videoSrc = "";
      if (v.sourceType === "local") {
        const blob = await VideoDB.getVideoFile(v.id);
        if (blob) {
          this.activeBlobUrl = URL.createObjectURL(blob);
          videoSrc = this.activeBlobUrl;
        }
      }

      if (!videoSrc) {
        videoSrc = v.fallbackVideoUrl || "assets/join-nasa-s-mission-to-mars-student.mp4";
      }

      playerContainer.innerHTML = `
        <video 
          id="activeHtml5Video" 
          controls 
          autoplay 
          playsinline
          style="width: 100%; height: 100%; max-height: 520px; background: #000; border-radius: var(--radius-md);"
          poster="${v.thumbnail || App.getCoverBySubject(v.subject)}">
          <source src="${videoSrc}">
          Browser Anda tidak mendukung pemutar video HTML5.
        </video>
      `;

      const modeLabel = document.getElementById("playerModeLabel");
      if (modeLabel) {
        modeLabel.textContent = v.sourceType === "local" 
          ? `Berkas Komputer (${v.fileName || 'Video Lokal'})` 
          : "Pemutar Video Mandiri";
      }
    } else if (this.currentMode === "youtube" && v.embedUrl) {
      let embedSrc = v.embedUrl;
      if (!embedSrc.includes("enablejsapi=1")) {
        const sep = embedSrc.includes("?") ? "&" : "?";
        embedSrc = `${embedSrc}${sep}enablejsapi=1&rel=0&modestbranding=1`;
      }

      playerContainer.innerHTML = `
        <iframe 
          id="activeVideoIframe"
          src="${embedSrc}" 
          title="${v.title}" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `;

      const modeLabel = document.getElementById("playerModeLabel");
      if (modeLabel) {
        modeLabel.textContent = "Mode YouTube (Bebas Iklan)";
      }
    }
  },

  // Beralih Antara Mode YouTube dan HTML5
  togglePlayerMode: function () {
    if (!this.currentVideo) return;
    if (this.currentVideo.sourceType === "local") {
      App.showToast("Materi ini adalah berkas video komputer lokal.");
      return;
    }
    this.currentMode = this.currentMode === "youtube" ? "html5" : "youtube";
    this.renderActivePlayer();
    App.showToast(`Beralih ke ${this.currentMode === "youtube" ? "Mode YouTube" : "Mode Pemutar Mandiri"}`);
  },

  // Tutup Modal & Hentikan Pemutaran
  closePlayer: function () {
    if (this.activeBlobUrl) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
    }

    const iframe = document.getElementById("activeVideoIframe");
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "stopVideo", args: [] }), "*");
      } catch (e) {}
    }

    const video = document.getElementById("activeHtml5Video");
    if (video) {
      video.pause();
    }

    const backdrop = document.getElementById("theatreModalBackdrop");
    const playerContainer = document.getElementById("modalPlayerContainer");
    if (backdrop) backdrop.classList.remove("active");
    if (playerContainer) playerContainer.innerHTML = "";
    document.body.style.overflow = "auto";
    this.currentVideo = null;
  },

  // Render Daftar Bab Repetisi Manual
  renderChapters: function (chapters) {
    const listElem = document.getElementById("chapterListContainer");
    if (!listElem) return;

    if (!chapters || chapters.length === 0) {
      listElem.innerHTML = `<p style="padding: 12px; font-size: 0.8125rem; color: var(--color-ink-subtle);">Materi ini tidak memiliki pembagian bab terpisah.</p>`;
      return;
    }

    listElem.innerHTML = chapters.map((ch, idx) => `
      <div 
        class="chapter-item ${idx === this.activeChapterIndex ? 'active-chapter' : ''}" 
        onclick="VideoPlayer.jumpToChapter(${ch.seconds}, ${idx})"
        title="Ulangi penjelasan dari menit ${ch.time}">
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
          <span style="font-family: var(--font-sans); font-size: 0.75rem; color: var(--color-ink-subtle);">#${idx + 1}</span>
          <span style="font-weight: 500; font-size: 0.875rem; color: var(--color-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${ch.title}
          </span>
        </div>
        <span class="chapter-time">${ch.time}</span>
      </div>
    `).join("");
  },

  // Lompat ke Menit Bab
  jumpToChapter: function (seconds, index = 0) {
    if (!this.currentVideo) return;
    this.activeChapterIndex = index;

    if (this.currentMode === "youtube") {
      const iframe = document.getElementById("activeVideoIframe");
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true]
        }), "*");
        iframe.contentWindow.postMessage(JSON.stringify({
          event: "command",
          func: "playVideo",
          args: []
        }), "*");
      }
    } else {
      const video = document.getElementById("activeHtml5Video");
      if (video) {
        video.currentTime = seconds;
        video.play();
      }
    }

    this.renderChapters(this.currentVideo.chapters || []);
    const ch = (this.currentVideo.chapters && this.currentVideo.chapters[index]) ? this.currentVideo.chapters[index].title : "Bab";
    App.showToast(`Lompat ke bab: ${ch}`);
  },

  // Pengatur Kecepatan Putar
  setPlaybackSpeed: function (speed) {
    const numSpeed = parseFloat(speed);
    if (this.currentMode === "youtube") {
      const iframe = document.getElementById("activeVideoIframe");
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: "command",
          func: "setPlaybackRate",
          args: [numSpeed]
        }), "*");
      }
    } else {
      const video = document.getElementById("activeHtml5Video");
      if (video) video.playbackRate = numSpeed;
    }
    App.showToast(`Kecepatan putar: ${speed}x`);
  },

  // Tandai Selesai / Belum Selesai
  toggleCompletion: function () {
    if (!this.currentVideo) return;
    const isDone = RepoStorage.toggleCompleted(this.currentVideo.id);
    this.updateCompletionButton();
    App.renderVideoGrid();
    App.renderStats();
    App.showToast(isDone ? "Materi ditandai telah dipelajari." : "Tanda belajar dibatalkan.");
  },

  updateCompletionButton: function () {
    if (!this.currentVideo) return;
    const btn = document.getElementById("btnToggleComplete");
    if (!btn) return;

    const isDone = RepoStorage.isCompleted(this.currentVideo.id);
    if (isDone) {
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Selesai Dipelajari
      `;
      btn.className = "btn btn-primary btn-sm";
      btn.style.backgroundColor = "var(--color-success)";
      btn.style.borderColor = "var(--color-success)";
    } else {
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
        Tandai Selesai
      `;
      btn.className = "btn btn-outline btn-sm";
      btn.style.backgroundColor = "";
      btn.style.borderColor = "";
    }
  }
};
window.VideoPlayer = VideoPlayer;


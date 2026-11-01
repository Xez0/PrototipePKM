/* ==========================================================================
   KONTROL HALAMAN TONTON VIDEO (YOUTUBE-STYLE WATCH VIEW)
   UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN
   Pemutar YouTube Edukatif & File Video Lokal Bebas Distraksi,
   Bab Pembelajaran, Capaian Pembelajaran, Rangkuman Dewan Guru,
   & Rekomendasi Materi Terkait (Sidebar)
   ========================================================================== */

const VideoPlayer = {
  currentVideo: null,
  currentMode: "youtube", // 'youtube' atau 'html5'
  originView: "student", // 'student' atau 'teacher'
  activeChapterIndex: 0,
  activeBlobUrl: null,

  init: function () {
    const onFsChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      this.updateFullscreenButtonText(isFull);
      const frame = document.querySelector(".watch-player-frame");
      if (frame) {
        if (isFull) {
          frame.classList.add("is-fullscreen-mode");
        } else {
          frame.classList.remove("is-fullscreen-mode");
        }
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("mozfullscreenchange", onFsChange);
    document.addEventListener("MSFullscreenChange", onFsChange);
  },

  // Buka Halaman Tonton Video (YouTube-Style Watch View)
  openPlayer: function (videoOrId, updateHash = true, originView = null) {
    let video = videoOrId;
    if (typeof videoOrId === "string") {
      const all = RepoStorage.getVideos();
      video = all.find(v => v.id === videoOrId);
    }

    if (!video) return;
    this.currentVideo = video;
    this.activeChapterIndex = 0;

    // Catat halaman asal untuk navigasi kembali yang mulus (tidak membuat guru merasa logout)
    if (originView) {
      this.originView = originView;
    } else if (window.App && App.currentView === "teacher") {
      this.originView = "teacher";
    } else if (this.originView === "teacher" && window.AuthManager && AuthManager.isLoggedIn()) {
      // Pertahankan origin guru jika sedang menavigasi video dari sidebar rekomendasi
      this.originView = "teacher";
    } else if (window.AuthManager && AuthManager.isLoggedIn() && (!window.App || App.currentView !== "student")) {
      this.originView = "teacher";
    } else {
      this.originView = "student";
    }

    // Tentukan mode pemutar otomatis
    if (video.sourceType === "local" || !video.embedUrl) {
      this.currentMode = "html5";
    } else {
      this.currentMode = "youtube";
    }

    // Navigasi ke View Watch di Router Aplikasi
    if (window.App && typeof App.navigateTo === "function") {
      App.navigateTo("watch", video.id, updateHash);
    }

    // Perbarui Tombol Navigasi Kembali & Chip Status Sesuai Konteks
    const backBtn = document.getElementById("btnWatchBack");
    const backText = document.getElementById("watchBackText");
    const chipDot = document.getElementById("watchTopChipDot");
    const chipText = document.getElementById("watchTopChipText");

    if (this.originView === "teacher") {
      if (backText) backText.textContent = "Kembali ke Portal Guru";
      if (backBtn) {
        backBtn.setAttribute("aria-label", "Kembali ke Portal Guru");
        backBtn.setAttribute("title", "Kembali ke Manajemen Materi Dewan Guru SMPN 7");
        backBtn.classList.add("btn-watch-back-teacher");
      }
      if (chipText) chipText.textContent = "Mode Peninjauan Guru";
      if (chipDot) chipDot.className = "watch-top-chip-dot mode-teacher";
    } else {
      if (backText) backText.textContent = "Kembali ke Katalog Bahan Ajar";
      if (backBtn) {
        backBtn.setAttribute("aria-label", "Kembali ke Katalog Bahan Ajar");
        backBtn.setAttribute("title", "Kembali ke Katalog Bahan Ajar Siswa");
        backBtn.classList.remove("btn-watch-back-teacher");
      }
      if (chipText) chipText.textContent = "Repositori Digital SMPN 7";
      if (chipDot) chipDot.className = "watch-top-chip-dot";
    }

    // Set Badges
    const subjectBadge = document.getElementById("watchSubjectBadge");
    const gradeBadge = document.getElementById("watchGradeBadge");

    if (subjectBadge) subjectBadge.textContent = video.subject;
    if (gradeBadge) gradeBadge.textContent = `Kelas ${video.grade}`;

    // Set Judul & Profil Guru
    const titleElem = document.getElementById("watchVideoTitle");
    const teacherNameElem = document.getElementById("watchTeacherName");
    const teacherNipElem = document.getElementById("watchTeacherNip");
    const teacherAvatarElem = document.getElementById("watchTeacherAvatar");

    if (titleElem) titleElem.textContent = video.title;
    if (teacherNameElem) teacherNameElem.textContent = video.teacher;
    if (teacherNipElem) {
      teacherNipElem.textContent = "Dewan Guru SMPN 7 Kota Tangerang Selatan";
    }
    if (teacherAvatarElem) {
      const initials = (video.teacher || "Guru")
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 2)
        .toUpperCase() || "G";
      teacherAvatarElem.textContent = initials;
    }

    // Set Info Waktu & Deskripsi
    const publishDateElem = document.getElementById("watchPublishDate");
    const durationElem = document.getElementById("watchDurationText");
    const descElem = document.getElementById("watchDescriptionText");

    if (publishDateElem) {
      publishDateElem.textContent = `Ditayangkan: ${RepoStorage.formatDate(video.publishedAt)}`;
    }
    if (durationElem) {
      durationElem.textContent = `Durasi: ${video.duration || '15:00'}`;
    }
    if (descElem) {
      descElem.textContent = video.description || "Materi pembelajaran mandiri SMP Negeri 7 Kota Tangerang Selatan.";
    }

    // Cek Kuis / Asesmen Mandiri
    const quizBtn = document.getElementById("btnWatchQuiz");
    const quizUrl = (video.quizUrl || "").trim();
    if (quizBtn) {
      if (quizUrl) {
        quizBtn.style.display = "inline-flex";
        quizBtn.href = quizUrl;
      } else {
        quizBtn.style.display = "none";
      }
    }

    // Cek Capaian Pembelajaran (CP)
    const outcomeSec = document.getElementById("watchOutcomeSection");
    const outcomeText = document.getElementById("watchOutcomeText");
    const outcome = (video.learningOutcome || "").trim();
    if (outcomeSec && outcomeText) {
      if (outcome) {
        outcomeText.textContent = outcome;
        outcomeSec.style.display = "block";
      } else {
        outcomeSec.style.display = "none";
      }
    }

    // Cek Rangkuman Guru
    const summarySec = document.getElementById("watchSummarySection");
    const summaryText = document.getElementById("watchSummaryText");
    const summary = (video.pdfContent || "").trim();
    if (summarySec && summaryText) {
      if (summary) {
        summaryText.textContent = summary;
        summarySec.style.display = "block";
      } else {
        summarySec.style.display = "none";
      }
    }

    // Cek Bab Video
    const chapters = Array.isArray(video.chapters) ? video.chapters : [];
    const chaptersSec = document.getElementById("watchChaptersSection");
    if (chaptersSec) {
      if (chapters.length > 0) {
        chaptersSec.style.display = "block";
        this.renderChapters(chapters);
      } else {
        chaptersSec.style.display = "none";
      }
    }

    // Set Status Selesai Belajar
    this.updateCompletionButton();

    // Render Pemutar Video
    this.renderActivePlayer();

    // Render Materi Terkait Lainnya (Sidebar)
    this.renderRelatedVideos(video.id);

    // Scroll mulus ke atas
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // Render Pemutar Video Aktif (YouTube Iframe vs File HTML5)
  renderActivePlayer: async function () {
    const playerContainer = document.getElementById("watchPlayerContainer");
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
          style="width: 100%; height: 100%; background: #000;"
          poster="${v.thumbnail || App.getCoverBySubject(v.subject)}">
          <source src="${videoSrc}">
          Browser Anda tidak mendukung pemutar video HTML5.
        </video>
      `;
    } else if (this.currentMode === "youtube" && v.embedUrl) {
      const ytId = RepoStorage.extractYouTubeId(v.embedUrl);
      let embedSrc = "";
      if (ytId) {
        embedSrc = `https://www.youtube.com/embed/${ytId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;
      } else {
        embedSrc = v.embedUrl.replace("youtube-nocookie.com", "youtube.com");
        const sep = embedSrc.includes("?") ? "&" : "?";
        embedSrc = `${embedSrc}${sep}playsinline=1`;
      }

      playerContainer.innerHTML = `
        <iframe 
          id="activeVideoIframe"
          src="${embedSrc}" 
          title="${escapeHtml(v.title)}" 
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen>
        </iframe>
      `;
    }
  },

  // Mulai Pemutaran Video Langsung (1-Tap di Mobile / Touch)
  startPlayback: function () {
    const overlay = document.getElementById("watchPlayOverlay");
    if (overlay) {
      overlay.classList.add("hidden");
      overlay.style.display = "none";
    }

    if (this.currentMode === "youtube") {
      const iframe = document.getElementById("activeVideoIframe");
      if (iframe) {
        if (iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage(JSON.stringify({
              event: "command",
              func: "playVideo",
              args: []
            }), "*");
          } catch (e) {}
        }
        if (!iframe.src.includes("autoplay=1")) {
          const sep = iframe.src.includes("?") ? "&" : "?";
          iframe.src = `${iframe.src}${sep}autoplay=1`;
        }
      }
    } else {
      const video = document.getElementById("activeHtml5Video");
      if (video) {
        video.play().catch(e => console.log("Video playback note:", e));
      }
    }
  },

  // Render Daftar Rekomendasi Materi Terkait (Sidebar YouTube)
  renderRelatedVideos: function (currentVideoId) {
    const listElem = document.getElementById("watchRelatedList");
    if (!listElem) return;

    const allVideos = RepoStorage.getVideos();
    const current = this.currentVideo;

    // Urutkan: Mapel yang sama terlebih dahulu, lalu materi lainnya
    const related = allVideos.filter(v => v.id !== currentVideoId).sort((a, b) => {
      if (current) {
        if (a.subject === current.subject && b.subject !== current.subject) return -1;
        if (b.subject === current.subject && a.subject !== current.subject) return 1;
      }
      return 0;
    });

    if (related.length === 0) {
      listElem.innerHTML = `
        <p style="padding: 16px; font-size: 0.8125rem; color: var(--color-ink-subtle); text-align: center;">
          Belum ada materi pembelajaran terkait lainnya.
        </p>
      `;
      return;
    }

    listElem.innerHTML = related.map(v => {
      const cover = v.thumbnail || App.getCoverBySubject(v.subject);
      const safeTitle = escapeHtml(v.title);
      const safeTeacher = escapeHtml(v.teacher);
      const safeSubject = escapeHtml(v.subject);
      const safeGrade = escapeHtml(v.grade);
      const safeDur = escapeHtml(v.duration || '15:00');

      return `
        <div 
          class="watch-related-card" 
          onclick="VideoPlayer.openPlayer('${v.id}', true)"
          role="button"
          tabindex="0"
          title="Tonton materi: ${safeTitle}"
        >
          <div class="watch-related-thumb">
            <img 
              src="${cover}" 
              alt="${safeTitle}" 
              loading="lazy"
              onerror="this.onerror=null; this.src=App.getCoverBySubject('${v.subject}');"
            >
            <span class="watch-related-duration">${safeDur}</span>
          </div>
          <div class="watch-related-info">
            <span class="watch-related-badge">${safeSubject} • Kls ${safeGrade}</span>
            <h4 class="watch-related-title">${safeTitle}</h4>
            <span class="watch-related-teacher">${safeTeacher}</span>
          </div>
        </div>
      `;
    }).join("");
  },

  // Render Bab Video (Timestamps)
  renderChapters: function (chapters) {
    const listElem = document.getElementById("watchChaptersList");
    if (!listElem) return;

    listElem.innerHTML = chapters.map((ch, idx) => `
      <div 
        class="watch-chapter-row ${idx === this.activeChapterIndex ? 'active' : ''}" 
        onclick="VideoPlayer.jumpToChapter(${ch.seconds}, ${idx})"
        title="Ulangi penjelasan dari menit ${ch.time}">
        <span class="watch-chapter-title">
          <span class="watch-chapter-badge-num">#${idx + 1}</span>
          ${escapeHtml(ch.title)}
        </span>
        <span class="watch-chapter-time">${escapeHtml(ch.time)}</span>
      </div>
    `).join("");
  },

  // Lompat ke Bab / Menit Video
  jumpToChapter: function (seconds, index = 0) {
    if (!this.currentVideo) return;
    this.activeChapterIndex = index;

    const overlay = document.getElementById("watchPlayOverlay");
    if (overlay) {
      overlay.classList.add("hidden");
      overlay.style.display = "none";
    }

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
    const ch = (this.currentVideo.chapters && this.currentVideo.chapters[index])
      ? this.currentVideo.chapters[index].title
      : "Bab";
    App.showToast(`Lompat ke menit: ${ch}`);
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

  // Update Tampilan Tombol Selesai
  updateCompletionButton: function () {
    if (!this.currentVideo) return;
    const btn = document.getElementById("btnWatchComplete");
    const txt = document.getElementById("txtWatchComplete");
    if (!btn) return;

    const isDone = RepoStorage.isCompleted(this.currentVideo.id);
    if (isDone) {
      btn.className = "btn btn-primary btn-watch-action";
      btn.style.backgroundColor = "var(--color-success)";
      btn.style.borderColor = "var(--color-success)";
      btn.style.color = "#ffffff";
      if (txt) txt.textContent = "Selesai Dipelajari ✓";
    } else {
      btn.className = "btn btn-outline btn-watch-action";
      btn.style.backgroundColor = "";
      btn.style.borderColor = "";
      btn.style.color = "";
      if (txt) txt.textContent = "Tandai Selesai";
    }
  },

  // Hentikan Pemutaran Video
  stopPlayback: function () {
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
      try { video.pause(); } catch (e) {}
    }

    const playerContainer = document.getElementById("watchPlayerContainer");
    if (playerContainer) playerContainer.innerHTML = "";
    this.currentVideo = null;

    if (document.body) {
      document.body.classList.remove("watch-view-active");
    }

    // Keluar dari fullscreen jika sedang aktif saat navigasi keluar
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (e) {}
    }
  },

  // Putar Layar Penuh Horisontal (YouTube Mobile Fullscreen Style)
  toggleFullscreenLandscape: async function () {
    const frame = document.querySelector(".watch-player-frame");
    if (!frame) return;

    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);

    if (!isFull) {
      try {
        if (frame.requestFullscreen) {
          await frame.requestFullscreen();
        } else if (frame.webkitRequestFullscreen) {
          await frame.webkitRequestFullscreen();
        } else if (frame.mozRequestFullScreen) {
          await frame.mozRequestFullScreen();
        } else if (frame.msRequestFullscreen) {
          await frame.msRequestFullscreen();
        }
      } catch (err) {
        // Fullscreen API may be blocked or restricted
      }

      // Kunci orientasi ke landscape di perangkat mobile (misal Android Chrome)
      if (window.screen && screen.orientation && typeof screen.orientation.lock === "function") {
        try {
          await screen.orientation.lock("landscape");
        } catch (e) {}
      }
      this.updateFullscreenButtonText(true);
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      } catch (err) {}

      if (window.screen && screen.orientation && typeof screen.orientation.unlock === "function") {
        try {
          screen.orientation.unlock();
        } catch (e) {}
      }
      this.updateFullscreenButtonText(false);
    }
  },

  // Update Teks Tombol Layar Penuh
  updateFullscreenButtonText: function (isFull) {
    const txt = document.getElementById("txtWatchFullscreen");
    if (txt) {
      txt.textContent = isFull ? "Keluar Layar Penuh" : "Layar Penuh";
    }
  },

  // Navigasi Kembali saat dalam tampilan landscape mobile atau fullscreen
  exitLandscapeOrBack: function () {
    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    if (isFull) {
      this.toggleFullscreenLandscape();
    } else {
      this.backToCatalog();
    }
  },

  // Kembali ke Halaman Sebelumnya (Katalog Siswa atau Portal Guru)
  backToCatalog: function () {
    this.stopPlayback();
    if (window.App && typeof App.navigateTo === "function") {
      if (this.originView === "teacher") {
        App.navigateTo("teacher");
      } else {
        App.navigateTo("student", "katalog");
      }
    }
  },

  // Kompatibilitas Tutup Player
  closePlayer: function () {
    this.backToCatalog();
  }
};

window.VideoPlayer = VideoPlayer;

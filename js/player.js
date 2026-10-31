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
  activeChapterIndex: 0,
  activeBlobUrl: null,

  init: function () {
    // Siap digunakan
  },

  // Buka Halaman Tonton Video (YouTube-Style Watch View)
  openPlayer: function (videoOrId, updateHash = true) {
    let video = videoOrId;
    if (typeof videoOrId === "string") {
      const all = RepoStorage.getVideos();
      video = all.find(v => v.id === videoOrId);
    }

    if (!video) return;
    this.currentVideo = video;
    this.activeChapterIndex = 0;

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

    // Set Breadcrumbs & Badges
    const crumbSubject = document.getElementById("watchBreadcrumbSubject");
    const crumbTitle = document.getElementById("watchBreadcrumbTitle");
    const subjectBadge = document.getElementById("watchSubjectBadge");
    const gradeBadge = document.getElementById("watchGradeBadge");
    const sourceBadge = document.getElementById("watchSourceBadge");

    if (crumbSubject) crumbSubject.textContent = video.subject;
    if (crumbTitle) crumbTitle.textContent = video.title;
    if (subjectBadge) subjectBadge.textContent = video.subject;
    if (gradeBadge) gradeBadge.textContent = `Kelas ${video.grade}`;
    if (sourceBadge) {
      sourceBadge.textContent = video.sourceType === "local" ? "Berkas Laptop" : "YouTube Resmi";
    }

    // Set Judul & Profil Guru
    const titleElem = document.getElementById("watchVideoTitle");
    const teacherNameElem = document.getElementById("watchTeacherName");
    const teacherNipElem = document.getElementById("watchTeacherNip");
    const teacherAvatarElem = document.getElementById("watchTeacherAvatar");

    if (titleElem) titleElem.textContent = video.title;
    if (teacherNameElem) teacherNameElem.textContent = video.teacher;
    if (teacherNipElem) {
      teacherNipElem.textContent = video.teacherNip
        ? `NIP. ${video.teacherNip} • Dewan Guru SMPN 7`
        : "Dewan Guru SMPN 7 Tangsel";
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
  },

  // Kembali ke Katalog Bahan Ajar
  backToCatalog: function () {
    this.stopPlayback();
    if (window.App && typeof App.navigateTo === "function") {
      App.navigateTo("student", "katalog");
    }
  },

  // Kompatibilitas Tutup Player
  closePlayer: function () {
    this.backToCatalog();
  }
};

window.VideoPlayer = VideoPlayer;

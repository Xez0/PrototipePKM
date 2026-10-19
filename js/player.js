/* ==========================================================================
   KONTROL PEMUTAR VIDEO BEBAS DISTRAKSI (THEATRE MODE)
   Pemutar Ganda (YouTube JS-API & HTML5 Lab), Seeking Bab Instan Tanpa Reload,
   Penyimpanan Catatan Siswa, & Lembar Rangkuman Belajar Cetak/PDF Resmi
   ========================================================================== */

const VideoPlayer = {
  currentVideo: null,
  currentMode: "youtube", // 'youtube' atau 'html5'
  notesSaveTimer: null,
  activeChapterIndex: 0,

  // Buka Modal Pemutar Video
  openPlayer: function (video, forceMode = "youtube") {
    this.currentVideo = video;
    this.currentMode = forceMode;
    this.activeChapterIndex = 0;

    const modal = document.getElementById("theatreModal");
    const backdrop = document.getElementById("theatreModalBackdrop");
    if (!modal || !backdrop) return;

    // Set Judul & Info Dasar
    document.getElementById("modalVideoTitle").textContent = video.title;
    document.getElementById("modalTeacherName").textContent = video.teacher;
    document.getElementById("modalTeacherNip").textContent = video.teacherNip ? `NIP. ${video.teacherNip}` : "Dewan Guru SMPN 7 Tangsel";
    document.getElementById("modalSubjectGrade").textContent = `${video.subject} • Kelas ${video.grade}`;
    document.getElementById("modalDescription").textContent = video.description;
    document.getElementById("modalLearningOutcome").textContent = video.learningOutcome;

    // Render Iframe atau Video HTML5
    this.renderActivePlayer();

    // Render Daftar Bab / Timecode (Untuk Repetisi Siswa)
    this.renderChapters(video.chapters || []);

    // Muat Catatan Pribadi Siswa
    const notesInput = document.getElementById("studentNotesInput");
    if (notesInput) {
      notesInput.value = StorageManager.getStudentNotes(video.id);
      document.getElementById("notesSavedStatus").textContent = "Tersimpan di perangkat ini";
    }

    // Set Status Selesai Belajar
    this.updateCompletionButton();

    // Tampilkan Modal
    backdrop.classList.add("active");
    document.body.style.overflow = "hidden"; // Kunci scroll halaman
  },

  // Render Player Sesuai Mode (YouTube Embed API vs HTML5 Video)
  renderActivePlayer: function () {
    const playerContainer = document.getElementById("modalPlayerContainer");
    if (!playerContainer || !this.currentVideo) return;

    const v = this.currentVideo;

    if (this.currentMode === "youtube" && v.embedUrl) {
      // Pastikan URL embed memiliki parameter enablejsapi=1
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
    } else {
      // Mode Lab Offline HTML5 (Jaminan 100% jalan bila YouTube terblokir sekolah)
      const src = v.fallbackVideoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
      playerContainer.innerHTML = `
        <video 
          id="activeHtml5Video" 
          controls 
          autoplay 
          preload="metadata"
          poster="${v.thumbnail}">
          <source src="${src}" type="video/mp4">
          Browser Anda tidak mendukung pemutar video HTML5.
        </video>
      `;
    }

    // Perbarui label status mode player
    const modeLabel = document.getElementById("playerModeLabel");
    if (modeLabel) {
      modeLabel.textContent = this.currentMode === "youtube" ? "Mode YouTube (Online)" : "Mode Lab Offline (HTML5)";
    }
  },

  // Beralih Antara Mode YouTube dan HTML5
  togglePlayerMode: function () {
    if (!this.currentVideo) return;
    this.currentMode = this.currentMode === "youtube" ? "html5" : "youtube";
    this.renderActivePlayer();
    App.showToast(`Beralih ke ${this.currentMode === "youtube" ? "Mode YouTube" : "Mode Lab Offline (HTML5)"}`);
  },

  // Tutup Modal & Hentikan Audio/Video Seketika
  closePlayer: function () {
    // Kirim sinyal pause ke iframe YouTube
    const iframe = document.getElementById("activeVideoIframe");
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "stopVideo", args: [] }), "*");
      } catch (e) {}
    }

    // Hentikan video HTML5
    const video = document.getElementById("activeHtml5Video");
    if (video) {
      video.pause();
    }

    const backdrop = document.getElementById("theatreModalBackdrop");
    const playerContainer = document.getElementById("modalPlayerContainer");
    if (backdrop) backdrop.classList.remove("active");
    if (playerContainer) playerContainer.innerHTML = ""; // Bersihkan DOM untuk mencegah audio bocor
    document.body.style.overflow = "auto";
    this.currentVideo = null;
  },

  // Render Daftar Bab untuk Repetisi Bagian Tertentu
  renderChapters: function (chapters) {
    const listElem = document.getElementById("chapterListContainer");
    if (!listElem) return;

    if (!chapters || chapters.length === 0) {
      listElem.innerHTML = `<p style="padding: 12px; font-size: 0.8125rem; color: var(--color-ink-subtle);">Belum ada penanda bab pada materi ini.</p>`;
      return;
    }

    listElem.innerHTML = chapters.map((ch, idx) => `
      <div 
        class="chapter-item ${idx === this.activeChapterIndex ? 'active-chapter' : ''}" 
        onclick="VideoPlayer.jumpToChapter(${ch.seconds}, ${idx})"
        title="Putar dari menit ${ch.time}">
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

  // Lompat ke Detik Tertentu Secara Instan (Tanpa Reload Iframe)
  jumpToChapter: function (seconds, index = 0) {
    if (!this.currentVideo) return;
    this.activeChapterIndex = index;

    if (this.currentMode === "youtube") {
      const iframe = document.getElementById("activeVideoIframe");
      if (iframe && iframe.contentWindow) {
        // Kirim perintah seekTo via YouTube Iframe API
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
      } else {
        // Fallback jika iframe belum siap
        let baseUrl = this.currentVideo.embedUrl.split("?")[0];
        iframe.src = `${baseUrl}?start=${seconds}&autoplay=1&enablejsapi=1&rel=0&modestbranding=1`;
      }
    } else {
      // Mode HTML5
      const video = document.getElementById("activeHtml5Video");
      if (video) {
        video.currentTime = seconds;
        video.play();
      }
    }

    // Perbarui highlight bab
    this.renderChapters(this.currentVideo.chapters || []);
    const ch = (this.currentVideo.chapters && this.currentVideo.chapters[index]) ? this.currentVideo.chapters[index].title : "Bab";
    App.showToast(`Memutar: ${ch}`);
  },

  // Atur Kecepatan Putar
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
    App.showToast(`Kecepatan video diubah ke ${speed}x`);
  },

  // Simpan Catatan Siswa Otomatis (Debounced)
  handleNotesInput: function (text) {
    if (!this.currentVideo) return;
    const statusElem = document.getElementById("notesSavedStatus");
    if (statusElem) statusElem.textContent = "Menyimpan catatan...";

    clearTimeout(this.notesSaveTimer);
    this.notesSaveTimer = setTimeout(() => {
      StorageManager.saveStudentNotes(this.currentVideo.id, text);
      if (statusElem) statusElem.textContent = "Catatan tersimpan otomatis";
    }, 500);
  },

  // Salin Catatan Siswa ke Clipboard
  copyStudentNotes: function () {
    if (!this.currentVideo) return;
    const notes = StorageManager.getStudentNotes(this.currentVideo.id);
    if (!notes.trim()) {
      App.showToast("Belum ada catatan yang ditulis.", "danger");
      return;
    }
    navigator.clipboard.writeText(notes).then(() => {
      App.showToast("Catatan berhasil disalin ke clipboard!");
    }).catch(() => {
      App.showToast("Gagal menyalin catatan.", "danger");
    });
  },

  // Buka Dialog Cetak / Simpan PDF Lembar Belajar Resmi SMPN 7
  openPrintSummary: function () {
    if (!this.currentVideo) return;
    const v = this.currentVideo;
    const studentNotes = StorageManager.getStudentNotes(v.id) || "Tidak ada catatan tambahan.";

    let container = document.getElementById("printableSheetContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "printableSheetContainer";
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #111; max-width: 800px; margin: 0 auto; line-height: 1.5;">
        <!-- KOP SURAT RESMI SEKOLAH -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 18px;">
          <img src="assets/logo-smpn7.svg" alt="Logo SMPN 7 Tangsel" style="width: 70px; height: 70px;">
          <div style="text-align: center; flex: 1; padding: 0 16px;">
            <h4 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase;">PEMERINTAH KOTA TANGERANG SELATAN</h4>
            <h4 style="margin: 0; font-size: 13pt; font-weight: bold; text-transform: uppercase;">DINAS PENDIDIKAN DAN KEBUDAYAAN</h4>
            <h3 style="margin: 2px 0; font-size: 16pt; font-weight: 800; text-transform: uppercase;">UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN</h3>
            <p style="margin: 0; font-size: 9pt; color: #333;">Jl. Cicentang Pulo, RT.006/RW.001, Kel. Rawa Buntu, Kec. Serpong, Kota Tangerang Selatan, Banten 15318</p>
          </div>
        </div>

        <!-- JUDUL DOKUMEN -->
        <div style="text-align: center; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-decoration: underline;">LEMBAR RANGKUMAN MATERI & BELAJAR MANDIRI</h2>
          <p style="margin: 2px 0; font-size: 10pt; font-weight: 600;">Kurikulum Merdeka - Tahun Ajaran 2026/2027</p>
        </div>

        <!-- TABEL METADATA PELAJARAN -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10.5pt;">
          <tr>
            <td style="width: 25%; font-weight: bold; padding: 4px 0;">Mata Pelajaran</td>
            <td style="width: 2%;">:</td>
            <td style="width: 73%;">${v.subject}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px 0;">Jenjang / Kelas</td>
            <td>:</td>
            <td>Kelas ${v.grade} (Fase D SMP)</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px 0;">Topik / Pokok Bahasan</td>
            <td>:</td>
            <td style="font-weight: bold;">${v.title}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px 0;">Guru Pengampu</td>
            <td>:</td>
            <td>${v.teacher} ${v.teacherNip ? `(NIP. ${v.teacherNip})` : ''}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px 0;">Tanggal Belajar</td>
            <td>:</td>
            <td>${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</td>
          </tr>
        </table>

        <!-- CAPAIAN PEMBELAJARAN -->
        <div style="margin-bottom: 16px; border: 1px solid #999; padding: 10px; border-radius: 4px;">
          <h4 style="margin: 0 0 6px 0; font-size: 11pt; font-weight: bold;">I. Capaian Pembelajaran (CP) / Indikator Materi</h4>
          <p style="margin: 0; font-size: 10pt; text-align: justify;">${v.learningOutcome}</p>
        </div>

        <!-- RANGKUMAN GURU -->
        <div style="margin-bottom: 16px;">
          <h4 style="margin: 0 0 6px 0; font-size: 11pt; font-weight: bold;">II. Rangkuman Materi Pembelajaran</h4>
          <div style="font-size: 10pt; white-space: pre-line; background: #fafafa; padding: 12px; border: 1px solid #ccc; border-radius: 4px;">
            ${v.pdfContent || v.description}
          </div>
        </div>

        <!-- CATATAN MANDIRI SISWA -->
        <div style="margin-bottom: 24px;">
          <h4 style="margin: 0 0 6px 0; font-size: 11pt; font-weight: bold;">III. Catatan & Poin Penting Peserta Didik</h4>
          <div style="font-size: 10pt; white-space: pre-line; border: 1px dashed #666; padding: 12px; min-height: 80px; border-radius: 4px;">
            ${studentNotes}
          </div>
        </div>

        <!-- KOLOM TANDA TANGAN -->
        <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 10.5pt;">
          <div style="text-align: center; width: 40%;">
            <p style="margin: 0 0 50px 0;">Mengetahui,<br>Orang Tua / Wali Siswa</p>
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">( .................................................. )</p>
          </div>
          <div style="text-align: center; width: 40%;">
            <p style="margin: 0 0 50px 0;">Tangerang Selatan, ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}<br>Guru Pengampu,</p>
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">${v.teacher}</p>
            <p style="margin: 0; font-size: 9pt;">${v.teacherNip ? `NIP. ${v.teacherNip}` : 'NIP Sekolah'}</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 8pt; color: #777; padding-top: 8px;">
          Dicetak melalui Repositori Video Pembelajaran Mandiri SMPN 7 Tangsel • Program PkM Mahasiswa Teknik Informatika S-1 UNPAM
        </div>
      </div>
    `;

    // Jalankan cetak browser (Simpan sebagai PDF atau cetak fisik)
    window.print();
  },

  // Toggle Selesai Dipelajari
  toggleCompletion: function () {
    if (!this.currentVideo) return;
    const isDone = StorageManager.toggleCompleted(this.currentVideo.id);
    this.updateCompletionButton();
    App.renderVideoGrid(); // Perbarui lencana centang pada grid
    App.renderStats(); // Perbarui persentase progres
    App.showToast(isDone ? "Hebat! Materi telah ditandai selesai dipelajari." : "Status materi diubah ke belum ditonton.");
  },

  // Perbarui Tampilan Tombol Selesai
  updateCompletionButton: function () {
    if (!this.currentVideo) return;
    const btn = document.getElementById("btnToggleComplete");
    if (!btn) return;

    const isDone = StorageManager.isCompleted(this.currentVideo.id);
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

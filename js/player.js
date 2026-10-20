/* ==========================================================================
   KONTROL PEMUTAR VIDEO BEBAS DISTRAKSI (THEATRE MODE)
   UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN
   Pemutar Ganda (YouTube JS-API & HTML5 Offline Lab), Lompatan Bab Instan,
   Rangkuman Resmi Guru, & Mesin Cetak PDF Dokumen Sekolah Anti-Glitch
   ========================================================================== */

const VideoPlayer = {
  currentVideo: null,
  currentMode: "youtube", // 'youtube' atau 'html5'
  activeChapterIndex: 0,
  activeBlobUrl: null,

  // Buka Pemutar Video Fokus
  openPlayer: function (video, forceMode = "youtube") {
    this.currentVideo = video;
    this.currentMode = forceMode;
    this.activeChapterIndex = 0;

    const modal = document.getElementById("theatreModal");
    const backdrop = document.getElementById("theatreModalBackdrop");
    if (!modal || !backdrop) return;

    // Set Judul & Informasi Skolastik
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
    if (descElem) descElem.textContent = video.description;
    if (outcomeElem) outcomeElem.textContent = video.learningOutcome;
    if (summaryElem) summaryElem.textContent = video.pdfContent || video.description;

    // Render Pemutar Video
    this.renderActivePlayer();

    // Render Daftar Bab Repetisi
    this.renderChapters(video.chapters || []);

    // Set Status Selesai Belajar
    this.updateCompletionButton();

    // Tampilkan Modal
    backdrop.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  // Render Pemutar Video (File Komputer vs YouTube vs Fallback)
  renderActivePlayer: async function () {
    const playerContainer = document.getElementById("modalPlayerContainer");
    if (!playerContainer || !this.currentVideo) return;

    const v = this.currentVideo;

    // Bersihkan URL blob lama jika ada
    if (this.activeBlobUrl) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
    }

    if (v.sourceType === "local") {
      // Ambil file asli dari IndexedDB
      const blob = await VideoDB.getVideoFile(v.id);
      let videoSrc = "";
      if (blob) {
        this.activeBlobUrl = URL.createObjectURL(blob);
        videoSrc = this.activeBlobUrl;
      } else if (v.fallbackVideoUrl) {
        videoSrc = v.fallbackVideoUrl;
      } else {
        videoSrc = "assets/join-nasa-s-mission-to-mars-student.mp4";
      }

      playerContainer.innerHTML = `
        <video 
          id="activeHtml5Video" 
          controls 
          autoplay 
          playsinline
          style="width: 100%; height: 100%; max-height: 520px; background: #000; border-radius: var(--radius-md);"
          poster="${v.thumbnail || ''}">
          <source src="${videoSrc}">
          Browser Anda tidak mendukung pemutar video HTML5.
        </video>
      `;

      const modeLabel = document.getElementById("playerModeLabel");
      if (modeLabel) {
        modeLabel.textContent = `File Video Komputer (${v.fileName || 'MP4'})`;
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
        modeLabel.textContent = "Mode YouTube (Online)";
      }
    } else {
      // Mode Lab Offline HTML5
      const src = v.fallbackVideoUrl || "assets/join-nasa-s-mission-to-mars-student.mp4";
      playerContainer.innerHTML = `
        <video 
          id="activeHtml5Video" 
          controls 
          autoplay 
          playsinline
          style="width: 100%; height: 100%; max-height: 520px; background: #000; border-radius: var(--radius-md);"
          poster="${v.thumbnail || ''}">
          <source src="${src}">
          Browser Anda tidak mendukung pemutar video HTML5.
        </video>
      `;

      const modeLabel = document.getElementById("playerModeLabel");
      if (modeLabel) {
        modeLabel.textContent = "Mode Lab Offline (HTML5)";
      }
    }
  },

  // Beralih Antara Mode YouTube dan HTML5
  togglePlayerMode: function () {
    if (!this.currentVideo) return;
    if (this.currentVideo.sourceType === "local") {
      App.showToast("Materi ini adalah file video komputer lokal.");
      return;
    }
    this.currentMode = this.currentMode === "youtube" ? "html5" : "youtube";
    this.renderActivePlayer();
    App.showToast(`Beralih ke ${this.currentMode === "youtube" ? "Mode YouTube" : "Mode Lab Offline (HTML5)"}`);
  },

  // Tutup Modal & Hentikan Audio/Video Seketika
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
        title="Ulangi penjelasan bab dari menit ${ch.time}">
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

  // Lompat ke Detik Tertentu Secara Instan
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
      } else {
        let baseUrl = this.currentVideo.embedUrl.split("?")[0];
        iframe.src = `${baseUrl}?start=${seconds}&autoplay=1&enablejsapi=1&rel=0&modestbranding=1`;
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
    App.showToast(`Kecepatan video: ${speed}x`);
  },

  // Buka Dialog Cetak / Simpan PDF Lembar Belajar Resmi SMPN 7 (Tanpa Merusak Tampilan Layar)
  openPrintSummary: function () {
    if (!this.currentVideo) return;
    const v = this.currentVideo;

    // Gunakan hidden iframe agar cetak terisolasi dan tidak merusak layout layar/modal
    let printFrame = document.getElementById("hiddenPrintIframe");
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "hiddenPrintIframe";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "none";
      printFrame.style.visibility = "hidden";
      document.body.appendChild(printFrame);
    }

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Lembar Belajar - ${v.title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 10.5pt;
            line-height: 1.5;
          }
          .kop-surat {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px double #000000;
            padding-bottom: 10px;
            margin-bottom: 16px;
          }
          .kop-logo {
            width: 72px;
            height: 72px;
          }
          .kop-text {
            flex: 1;
            text-align: center;
            padding: 0 12px;
          }
          .kop-text h4 {
            margin: 0;
            font-size: 11pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .kop-text h3 {
            margin: 2px 0;
            font-size: 14pt;
            font-weight: 800;
            text-transform: uppercase;
          }
          .kop-text p {
            margin: 2px 0 0 0;
            font-size: 8.5pt;
            color: #374151;
          }
          .doc-title {
            text-align: center;
            margin-bottom: 16px;
          }
          .doc-title h2 {
            margin: 0;
            font-size: 12pt;
            font-weight: 800;
            text-decoration: underline;
            text-transform: uppercase;
          }
          .doc-title span {
            font-size: 9.5pt;
            color: #4b5563;
          }
          table.meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 10pt;
          }
          table.meta-table td {
            padding: 3px 0;
            vertical-align: top;
          }
          .section-box {
            margin-bottom: 16px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 10px 14px;
            background-color: #f9fafb;
          }
          .section-title {
            font-size: 10.5pt;
            font-weight: 700;
            margin: 0 0 6px 0;
            color: #0b1e4f;
            text-transform: uppercase;
          }
          .section-body {
            font-size: 9.5pt;
            line-height: 1.5;
            white-space: pre-line;
            color: #1f2937;
          }
          .worksheet-box {
            margin-bottom: 16px;
            border: 1px dashed #6b7280;
            border-radius: 4px;
            padding: 12px 14px;
            background-color: #ffffff;
            min-height: 90px;
          }
          .ttd-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 28px;
            page-break-inside: avoid;
          }
          .ttd-col {
            width: 42%;
            text-align: center;
            font-size: 10pt;
          }
          .ttd-space {
            height: 55px;
          }
          .footer-note {
            text-align: center;
            margin-top: 24px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb; /* taste-skill-ignore */
            font-size: 8pt;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="kop-surat">
          <img src="assets/logo-smpn7.svg" alt="Logo SMPN 7 Tangsel" class="kop-logo">
          <div class="kop-text">
            <h4>PEMERINTAH KOTA TANGERANG SELATAN</h4>
            <h4>DINAS PENDIDIKAN DAN KEBUDAYAAN</h4>
            <h3>UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN</h3>
            <p>Jl. Cicentang Pulo RT.006/RW.001, Kel. Rawa Buntu, Kec. Serpong, Kota Tangerang Selatan, Banten 15318 • Website: smpn7tangsel.sch.id</p>
          </div>
        </div>

        <div class="doc-title">
          <h2>LEMBAR MODUL RANGKUMAN &amp; BELAJAR MANDIRI</h2>
          <span>Kurikulum Merdeka (Fase D SMP) • Tahun Ajaran 2026/2027</span>
        </div>

        <table class="meta-table">
          <tr>
            <td style="width: 25%; font-weight: bold;">Mata Pelajaran</td>
            <td style="width: 2%;">:</td>
            <td style="width: 73%; font-weight: bold;">${v.subject}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Jenjang / Fase</td>
            <td>:</td>
            <td>Kelas ${v.grade} (Fase D SMP Negeri 7 Tangerang Selatan)</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Topik Pokok Bahasan</td>
            <td>:</td>
            <td>${v.title}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Guru Pengampu</td>
            <td>:</td>
            <td>${v.teacher} ${v.teacherNip ? `(NIP. ${v.teacherNip})` : ''}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Tanggal Akses</td>
            <td>:</td>
            <td>${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
          </tr>
        </table>

        <div class="section-box">
          <div class="section-title">I. Capaian Pembelajaran (CP) / Indikator Materi</div>
          <div class="section-body">${v.learningOutcome}</div>
        </div>

        <div class="section-box" style="background-color: #ffffff;">
          <div class="section-title">II. Rangkuman Materi Pembelajaran dari Dewan Guru</div>
          <div class="section-body">${v.pdfContent || v.description}</div>
        </div>

        <div class="section-title" style="margin-top: 14px;">III. Lembar Catatan &amp; Refleksi Mandiri Peserta Didik</div>
        <div class="worksheet-box">
          <p style="margin: 0 0 6px 0; font-size: 8.5pt; color: #6b7280; font-style: italic;">
            Tuliskan rumus penting, istilah baru, atau poin yang ingin kamu tanyakan ke bapak/ibu guru pada pertemuan tatap muka berikutnya:
          </p>
          <div style="font-size: 9.5pt; color: #111827; white-space: pre-line;">
            ${StorageManager.getStudentNotes(v.id) || ''}
          </div>
        </div>

        <div class="ttd-grid">
          <div class="ttd-col">
            <p style="margin: 0;">Mengetahui,<br>Orang Tua / Wali Murid</p>
            <div class="ttd-space"></div>
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">( .................................................... )</p>
          </div>
          <div class="ttd-col">
            <p style="margin: 0;">Tangerang Selatan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>Guru Pengampu,</p>
            <div class="ttd-space"></div>
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">${v.teacher}</p>
            <p style="margin: 0; font-size: 8.5pt; color: #4b5563;">${v.teacherNip ? `NIP. ${v.teacherNip}` : 'Dewan Guru SMPN 7 Tangsel'}</p>
          </div>
        </div>

        <div class="footer-note">
          Dokumen resmi bahan ajar mandiri digital UPTD SMP Negeri 7 Kota Tangerang Selatan • Kemitraan Program PkM S-1 Teknik Informatika Universitas Pamulang
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Trigger print pada iframe secara terisolasi
    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    }, 200);
  },

  // Toggle Selesai Dipelajari
  toggleCompletion: function () {
    if (!this.currentVideo) return;
    const isDone = StorageManager.toggleCompleted(this.currentVideo.id);
    this.updateCompletionButton();
    App.renderVideoGrid();
    App.renderStats();
    App.showToast(isDone ? "Materi ditandai selesai dipelajari." : "Status materi diubah ke belum ditonton.");
  },

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

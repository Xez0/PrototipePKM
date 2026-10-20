/* ==========================================================================
   DATA MATERI VIDEO PEMBELAJARAN RESMI: UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN
   Kurikulum Merdeka (Fase D: Kelas 7, 8, dan 9)
   Data Faktual Dewan Guru, Capaian Pembelajaran Resmi, & Cover Skolastik
   ========================================================================== */

const INITIAL_VIDEO_DATA = [
  {
    id: "smpn7-mat-07-01",
    title: "Konsep Dasar Aljabar: Variabel, Koefisien, & Suku Sejenis",
    grade: "7",
    subject: "Matematika",
    category: "MIPA",
    teacher: "Tri Elmania, S.Pd.",
    teacherNip: "19800512 200604 2 018",
    duration: "14:20",
    embedUrl: "https://www.youtube-nocookie.com/embed/aircAruvnKk?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "assets/join-nasa-s-mission-to-mars-student.mp4",
    thumbnail: "assets/cover-matematika.svg",
    description: "Pendalaman konsep aljabar dasar untuk siswa Kelas 7 SMPN 7 Tangsel. Memahami perbedaan konstanta, variabel, dan cara mengelompokkan suku sejenis untuk persiapan asesmen formatif semester.",
    learningOutcome: "Peserta didik dapat menyatakan suatu situasi ke dalam bentuk aljabar, mengidentifikasi unsur-unsur aljabar, dan menyederhanakan bentuk aljabar dengan operasi penjumlahan serta pengurangan.",
    pdfTitle: "Rangkuman_Aljabar_Kelas7_SMPN7.pdf",
    pdfContent: "RANGKUMAN MATERI MATEMATIKA KELAS 7 - UPTD SMPN 7 TANGSEL\nBAB: BENTUK ALJABAR\n\n1. Variabel: Lambang pengganti suatu bilangan yang belum diketahui nilainya secara pasti (contoh: x, y, a, b).\n2. Koefisien: Faktor pengali konstanta dari suatu variabel (pada 5x, angka 5 adalah koefisien dari x).\n3. Konstanta: Suku dari bentuk aljabar yang berupa bilangan mandiri dan tidak memuat variabel (pada 5x + 7, angka 7 adalah konstanta).\n4. Suku Sejenis: Suku-suku yang memiliki variabel dengan pangkat yang sama persis (misal: 3x² dan -7x²).\n\nKaidah Kunci Ulangan: Hanya suku-suku sejenis yang boleh dijumlahkan atau dikurangkan!",
    chapters: [
      { time: "00:00", title: "Pengantar Aljabar & Masalah Konkret", seconds: 0 },
      { time: "02:45", title: "Mengenal Variabel dan Konstanta", seconds: 165 },
      { time: "06:10", title: "Menentukan Koefisien Bentuk Aljabar", seconds: 370 },
      { time: "09:30", title: "Mengidentifikasi Suku Sejenis", seconds: 570 },
      { time: "12:15", title: "Latihan Soal Uji Kompetensi", seconds: 735 }
    ]
  },
  {
    id: "smpn7-ipa-08-01",
    title: "Sistem Pencernaan Manusia: Enzim & Jalur Penyerapan Nutrisi",
    grade: "8",
    subject: "Ilmu Pengetahuan Alam (IPA)",
    category: "MIPA",
    teacher: "Agus Supratman, S.Pd.",
    teacherNip: "19780315 200501 1 009",
    duration: "18:05",
    embedUrl: "https://www.youtube-nocookie.com/embed/fNk_zzaMoSs?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "assets/join-nasa-s-mission-to-mars-student.mp4",
    thumbnail: "assets/cover-ipa.svg",
    description: "Visualisasi mendalam organ pencernaan manusia dari rongga mulut hingga usus besar. Dilengkapi fungsi enzim amilase, pepsin, tripsin, dan lipase yang diujikan dalam asesmen sumatif sekolah.",
    learningOutcome: "Peserta didik dapat menganalisis keterkaitan struktur organ pencernaan dengan fungsinya serta mekanisme kerja enzim pencernaan dalam metabolisme tubuh manusia.",
    pdfTitle: "Tabel_Enzim_Pencernaan_Kelas8_SMPN7.pdf",
    pdfContent: "MODUL IPA BIOLOGI KELAS 8 - UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN\nSISTEM PENCERNAAN & ENZIM\n\n1. Mulut: Mengunyah mekanik + Kimiawi oleh Enzim Ptialin (Amilase) merombak amilum menjadi maltosa.\n2. Lambung: Menghasilkan Asam Klorida (HCl), Enzim Pepsin (Protein -> Pepton), dan Renin (mengendapkan kasein susu).\n3. Usus Halus: Terjadi pencernaan kimiawi intensif dari getah pankreas (Amilase, Tripsin, Lipase) dan getah empedu hati.\n4. Usus Besar: Penyerapan air kembali dan pembusukan sisa makanan oleh bakteri menguntungkan E. coli.",
    chapters: [
      { time: "00:00", title: "Pencernaan Mekanik vs Kimiawi", seconds: 0 },
      { time: "03:15", title: "Rongga Mulut & Peran Ptialin", seconds: 195 },
      { time: "07:20", title: "Lambung dan Fungsi Asam Klorida (HCl)", seconds: 440 },
      { time: "11:45", title: "Enzim Pankreas & Penyerapan di Usus Halus", seconds: 705 },
      { time: "15:30", title: "Fungsi Usus Besar & Penyakit Pencernaan", seconds: 930 }
    ]
  },
  {
    id: "smpn7-inf-08-01",
    title: "Logika Algoritma: Simbol Flowchart & Struktur Percabangan",
    grade: "8",
    subject: "Informatika",
    category: "Informatika",
    teacher: "Riana Nurmayanti, S.Kom.",
    teacherNip: "19860924 201101 2 012",
    duration: "16:40",
    embedUrl: "https://www.youtube-nocookie.com/embed/m2Ux2PnJe6E?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "assets/join-nasa-s-mission-to-mars-student.mp4",
    thumbnail: "assets/cover-informatika.svg",
    description: "Materi berpikir komputasional (*computational thinking*) untuk siswa SMP. Mempelajari cara merancang solusi terstruktur dengan simbol flowchart baku dan logika percabangan kondisional (If-Else).",
    learningOutcome: "Peserta didik mampu memahami konsep berpikir komputasional dengan memodelkan masalah sehari-hari ke dalam flowchart menggunakan struktur sekuensial dan percabangan.",
    pdfTitle: "Lembar_Kerja_Flowchart_Informatika_SMPN7.pdf",
    pdfContent: "PANDUAN PRAKTIKUM INFORMATIKA KELAS 8\nUPTD SMP NEGERI 7 KOTA TANGERANG SELATAN\n\nSimbol Utama Diagram Alir (Flowchart):\n- Oval (Terminator): Titik Mulai (Start) atau Selesai (End)\n- Persegi Panjang (Process): Proses perhitungan atau pemrosesan instruksi\n- Belah Ketupat (Decision): Pengambilan keputusan kondisi (True / False)\n- Jajar Genjang (Input/Output): Pembacaan input data atau penayangan hasil\n\nStudi Kasus Lab Komputer: Logika kelulusan nilai KKM sekolah (Nilai >= 75).",
    chapters: [
      { time: "00:00", title: "Pengantar Berpikir Komputasional", seconds: 0 },
      { time: "03:40", title: "Mengenal 4 Simbol Baku Flowchart", seconds: 220 },
      { time: "08:10", title: "Logika Percabangan If-Else Kondisional", seconds: 490 },
      { time: "12:30", title: "Studi Kasus Penentuan Kelulusan KKM", seconds: 750 },
      { time: "15:00", title: "Latihan Praktik Mandiri Siswa", seconds: 900 }
    ]
  },
  {
    id: "smpn7-eng-09-01",
    title: "Procedure Text: Generic Structure, Goal, & Imperative Verbs",
    grade: "9",
    subject: "Bahasa Inggris",
    category: "Bahasa",
    teacher: "Agung Firmansyah, S.S.",
    teacherNip: "19850410 201001 1 015",
    duration: "12:50",
    embedUrl: "https://www.youtube-nocookie.com/embed/6p4ElkZ1H1c?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "assets/join-nasa-s-mission-to-mars-student.mp4",
    thumbnail: "assets/cover-bahasa-inggris.svg",
    description: "Mempersiapkan siswa Kelas 9 menghadapi asesmen akhir jenjang sekolah. Membedah susunan Goal, Materials/Ingredients, dan Steps serta kata kerja perintah (*imperative sentences*) dalam resep dan manual.",
    learningOutcome: "Peserta didik dapat mengidentifikasi fungsi sosial, struktur teks prosedur, dan unsur kebahasaan kalimat imperatif serta urutan temporal dalam teks lisan dan tulis.",
    pdfTitle: "Procedure_Text_Grade9_SMPN7.pdf",
    pdfContent: "ENGLISH SUMMARY GRADE 9 - UPTD SMPN 7 TANGERANG SELATAN\nGENRE: PROCEDURE TEXT\n\n1. Purpose: To explain how something is made or done through a sequence of steps.\n2. Generic Structure:\n   - Goal/Aim: Stated in the title (e.g., How to Operate a Computer).\n   - Materials/Ingredients: List of things needed.\n   - Steps/Methods: Numbered action instructions.\n3. Language Features:\n   - Simple Present Tense\n   - Imperative Sentences (Turn on the power, Click the icon)\n   - Action Verbs (insert, press, select, connect)\n   - Connectives of Sequence (First, Next, Then, Finally)",
    chapters: [
      { time: "00:00", title: "Purpose of Procedure Text", seconds: 0 },
      { time: "02:30", title: "Goal, Materials, & Steps Structure", seconds: 150 },
      { time: "06:15", title: "Imperative Verbs & Connectives", seconds: 375 },
      { time: "09:40", title: "Sample Text Analysis & Exam Tips", seconds: 580 }
    ]
  },
  {
    id: "smpn7-ind-07-01",
    title: "Teks Deskripsi: Menangkap Objek Melalui Cerapan Panca Indra",
    grade: "7",
    subject: "Bahasa Indonesia",
    category: "Bahasa",
    teacher: "Sudarman, M.Pd.",
    teacherNip: "19741108 200003 1 003",
    duration: "13:15",
    embedUrl: "https://www.youtube-nocookie.com/embed/wW1lY5jwn3k?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "assets/join-nasa-s-mission-to-mars-student.mp4",
    thumbnail: "assets/cover-bahasa-indonesia.svg",
    description: "Belajar melukiskan keindahan objek, tempat wisata, atau lingkungan sekolah SMPN 7 secara rinci sehingga pembaca seolah-olah melihat, mendengar, dan merasakan langsung suasana yang digambarkan.",
    learningOutcome: "Peserta didik mampu memahami gagasan, informasi, dan suasana dalam teks deskripsi dengan mengidentifikasi cerapan panca indra dan gaya bahasa yang digunakan.",
    pdfTitle: "Panduan_Teks_Deskripsi_Kelas7_SMPN7.pdf",
    pdfContent: "BAHASA INDONESIA KELAS 7 - UPTD SMPN 7 TANGSEL\nBAB: TEKS DESKRIPSI\n\nCiri Utama Teks Deskripsi:\n1. Menggambarkan objek secara terperinci (fisik, suasana, sifat).\n2. Melibatkan cerapan panca indra (penglihatan, pendengaran, penciuman, perabaan, pengecapan).\n3. Membuat pembaca merasakan langsung objek yang dideskripsikan.\n\nStruktur Teks:\n- Identifikasi / Gambaran Umum: Nama objek, lokasi, sejarah singkat.\n- Deskripsi Bagian: Perincian bagian-bagian fisik objek.\n- Simpulan / Kesan Pribadi: Penutup dan tanggapan emosional penulis.",
    chapters: [
      { time: "00:00", title: "Definisi & Ciri Teks Deskripsi", seconds: 0 },
      { time: "03:10", title: "Pemanfaatan Cerapan Panca Indra", seconds: 190 },
      { time: "06:50", title: "Struktur Identifikasi dan Deskripsi Bagian", seconds: 410 },
      { time: "10:15", title: "Contoh Objek: Lingkungan SMPN 7 Tangsel", seconds: 615 }
    ]
  },
  {
    id: "smpn7-ips-09-01",
    title: "Perubahan Sosial Budaya & Tantangan Globalisasi Remaja",
    grade: "9",
    subject: "Ilmu Pengetahuan Sosial (IPS)",
    category: "IPS",
    teacher: "Dadang Sobari, S.E., Gr.",
    teacherNip: "19830718 200902 1 004",
    duration: "15:45",
    embedUrl: "https://www.youtube-nocookie.com/embed/6p4ElkZ1H1c?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "assets/join-nasa-s-mission-to-mars-student.mp4",
    thumbnail: "assets/cover-ips.svg",
    description: "Analisis kritis dampak positif dan tantangan globalisasi bagi remaja sekolah. Membahas sikap selektif terhadap pengaruh budaya luar serta pentingnya melestarikan kearifan lokal di Tangerang Selatan.",
    learningOutcome: "Peserta didik memahami perubahan sosial budaya sebagai dampak globalisasi serta memiliki sikap kritis dan selektif terhadap pengaruh budaya luar.",
    pdfTitle: "Rangkuman_IPS_Globalisasi_Kelas9_SMPN7.pdf",
    pdfContent: "RANGKUMAN IPS KELAS 9 - UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN\nBAB: PERUBAHAN SOSIAL BUDAYA DAN GLOBALISASI\n\nBentuk Globalisasi:\n1. Bidang IPTEK: Komunikasi digital, internet, repositori pembelajaran mandiri sekolah.\n2. Bidang Ekonomi: Pasar bebas, e-commerce, kemudahan transaksi non-tunai.\n3. Bidang Komunikasi: Media sosial, pertukaran informasi kilat lintas benua.\n4. Bidang Budaya: Akulturasi, gaya hidup, kuliner modern.\n\nUpaya Menghadapi Globalisasi:\n- Memperkokoh jati diri dan nilai-nilai luhur Pancasila.\n- Menyaring budaya asing dengan nilai kearifan lokal Tangerang Selatan.\n- Memanfaatkan teknologi digital untuk kemandirian belajar.",
    chapters: [
      { time: "00:00", title: "Pengertian Perubahan Sosial & Globalisasi", seconds: 0 },
      { time: "03:50", title: "Dampak Positif IPTEK di Lingkungan Sekolah", seconds: 230 },
      { time: "08:15", title: "Tantangan Konsumerisme & Pergeseran Nilai", seconds: 495 },
      { time: "12:00", title: "Sikap Selektif Pelajar SMPN 7 Tangsel", seconds: 720 }
    ]
  },
  {
    id: "smpn7-ppkn-07-01",
    title: "Norma & Keadilan: Ketaatan Hukum dalam Masyarakat",
    grade: "7",
    subject: "Pendidikan Pancasila (PPKn)",
    category: "IPS",
    teacher: "Epi Suhaepi, S.Pd.",
    teacherNip: "19760822 200212 1 005",
    duration: "14:10",
    embedUrl: "https://www.youtube-nocookie.com/embed/aircAruvnKk?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "assets/join-nasa-s-mission-to-mars-student.mp4",
    thumbnail: "assets/cover-ppkn.svg",
    description: "Mempelajari empat macam norma yang berlaku dalam kehidupan bermasyarakat (agama, kesusilaan, kesopanan, dan hukum) serta penerapannya dalam tata tertib sekolah UPTD SMPN 7 Tangsel.",
    learningOutcome: "Peserta didik mampu mengidentifikasi macam-macam norma, menjelaskan pentingnya norma hukum dalam mewujudkan keadilan, dan mempraktikkan perilaku taat norma dalam kehidupan sehari-hari.",
    pdfTitle: "Norma_Keadilan_PPKn_Kelas7_SMPN7.pdf",
    pdfContent: "PENDIDIKAN PANCASILA KELAS 7 - UPTD SMPN 7 TANGSEL\nBAB: NORMA DAN KEADILAN\n\n4 Macam Norma dalam Masyarakat:\n1. Norma Agama: Bersumber dari wahyu Tuhan Yang Maha Esa. Sanksi: Dosa di akhirat.\n2. Norma Kesusilaan: Bersumber dari hati nurani manusia. Sanksi: Rasa bersalah dan penyesalan.\n3. Norma Kesopanan: Bersumber dari pergaulan dan adat istiadat setempat. Sanksi: Dicemooh atau dikucilkan.\n4. Norma Hukum: Dibuat oleh lembaga resmi berwenang (negara). Bersifat memaksa dan tegas. Sanksi: Hukuman denda atau penjara.\n\nKomitmen Pelajar SMPN 7: Menaati tata tertib sekolah sebagai wujud ketaatan norma hukum.",
    chapters: [
      { time: "00:00", title: "Pengertian Norma dalam Masyarakat", seconds: 0 },
      { time: "03:20", title: "Empat Macam Norma & Sumbernya", seconds: 200 },
      { time: "07:45", title: "Perbedaan Sanksi Norma Kesopanan & Hukum", seconds: 465 },
      { time: "11:10", title: "Penerapan Tata Tertib di SMPN 7 Tangsel", seconds: 670 }
    ]
  }
];

/* ==========================================================================
   DATA AWAL MATERI VIDEO PEMBELAJARAN: SMP NEGERI 7 TANGERANG SELATAN
   Kurikulum Merdeka - Jenjang Kelas 7, 8, dan 9
   Dilengkapi tautan YouTube embed resmi & fallback MP4 Lab Sekolah
   ========================================================================== */

const INITIAL_VIDEO_DATA = [
  {
    id: "smpn7-mat-07-01",
    title: "Konsep Dasar Aljabar: Variabel, Koefisien, dan Suku Sejenis",
    grade: "7",
    subject: "Matematika",
    category: "MIPA",
    teacher: "Dra. Hj. Nurjanah, M.Pd.",
    teacherNip: "19750812 200212 2 003",
    duration: "14:20",
    // Embed dengan parameter JS API untuk instan seeking tanpa reload
    embedUrl: "https://www.youtube-nocookie.com/embed/aircAruvnKk?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=640&q=80",
    description: "Pembahasan tuntas konsep aljabar dasar untuk siswa Kelas 7. Memahami perbedaan konstanta, variabel, dan cara mengelompokkan suku sejenis dalam persiapan asesmen formatif semester.",
    learningOutcome: "Peserta didik dapat menyatakan suatu situasi ke dalam bentuk aljabar, mengidentifikasi unsur-unsur aljabar, dan menyederhanakan bentuk aljabar dengan operasi dasar penjumlahan serta pengurangan.",
    pdfTitle: "Rangkuman_Aljabar_Kelas7_SMPN7.pdf",
    pdfContent: "RANGKUMAN MATERI MATEMATIKA KELAS 7 - UPTD SMPN 7 TANGSEL\nBAB: BENTUK ALJABAR\n\n1. Variabel: Lambang pengganti suatu bilangan yang belum diketahui nilainya secara pasti (contoh: x, y, a, b).\n2. Koefisien: Faktor pengali konstanta dari suatu variabel (pada 5x, angka 5 adalah koefisien dari x).\n3. Konstanta: Suku dari bentuk aljabar yang berupa bilangan mandiri dan tidak memuat variabel (pada 5x + 7, angka 7 adalah konstanta).\n4. Suku Sejenis: Suku-suku yang memiliki variabel dengan pangkat yang sama persis (misal: 3x² dan -7x²).\n\nKaidah Kunci Ulangan: Hanya suku-suku sejenis yang boleh dijumlahkan atau dikurangkan!",
    chapters: [
      { time: "00:00", title: "Pengantar & Masalah Kehidupan Sehari-hari", seconds: 0 },
      { time: "02:15", title: "Mengenal Variabel dan Konstanta", seconds: 135 },
      { time: "05:40", title: "Identifikasi Koefisien pada Suku Aljabar", seconds: 340 },
      { time: "08:50", title: "Trik Cepat Menemukan Suku Sejenis", seconds: 530 },
      { time: "11:30", title: "Latihan Soal & Trik Ulangan Semester", seconds: 690 }
    ]
  },
  {
    id: "smpn7-ipa-08-01",
    title: "Sistem Pencernaan Manusia: Enzim dan Jalur Penyerapan Nutrisi",
    grade: "8",
    subject: "Ilmu Pengetahuan Alam (IPA)",
    category: "MIPA",
    teacher: "Agus Wahyudi, S.Si., M.Pd.",
    teacherNip: "19820315 200801 1 012",
    duration: "18:05",
    embedUrl: "https://www.youtube-nocookie.com/embed/fNk_zzaMoSs?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=640&q=80",
    description: "Visualisasi mendalam organ pencernaan mulai dari rongga mulut hingga usus besar. Dilengkapi tabel enzim amilase, pepsin, tripsin, dan lipase yang diujikan dalam asesmen sumatif.",
    learningOutcome: "Peserta didik dapat menganalisis keterkaitan struktur organ pencernaan dengan fungsinya serta kelainan/penyakit yang berhubungan dengan sistem pencernaan manusia.",
    pdfTitle: "Tabel_Enzim_Pencernaan_Kelas8.pdf",
    pdfContent: "MODUL IPA BIOLOGI KELAS 8 - UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN\nSISTEM PENCERNAAN & ENZIM\n\n1. Mulut: Mengunyah mekanik + Kimiawi oleh Enzim Ptialin (Amilase) merombak amilum menjadi maltosa.\n2. Lambung: Menghasilkan Asam Klorida (HCl), Enzim Pepsin (Protein -> Pepton), dan Renin (mengendapkan kasein susu).\n3. Usus Halus: Terjadi pencernaan kimiawi intensif dari getah pankreas (Amilase, Tripsin, Lipase) dan getah empedu hati.\n4. Usus Besar: Penyerapan air kembali dan pembusukan sisa makanan oleh bakteri menguntungkan E. coli.",
    chapters: [
      { time: "00:00", title: "Pencernaan Mekanik vs Kimiawi", seconds: 0 },
      { time: "03:10", title: "Rongga Mulut & Peran Kelenjar Ludah", seconds: 190 },
      { time: "07:05", title: "Lambung dan Fungsi Asam Klorida (HCl)", seconds: 425 },
      { time: "11:20", title: "Getah Pankreas & Enzim Kunci Usus Halus", seconds: 680 },
      { time: "15:10", title: "Penyerapan Air di Usus Besar & Penyakit", seconds: 910 }
    ]
  },
  {
    id: "smpn7-inf-08-01",
    title: "Algoritma Pemrograman: Logika Percabangan (If-Else) & Flowchart",
    grade: "8",
    subject: "Informatika",
    category: "Informatika",
    teacher: "Budi Setiawan, S.Kom., M.Kom.",
    teacherNip: "19881104 201503 1 004",
    duration: "16:40",
    embedUrl: "https://www.youtube-nocookie.com/embed/m2Ux2PnJe6E?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=640&q=80",
    description: "Materi computational thinking untuk siswa SMP. Belajar menerjemahkan keputusan logis ke dalam simbol diagram alir (flowchart) standar internasional.",
    learningOutcome: "Peserta didik mampu memahami konsep berpikir komputasional dengan memodelkan masalah sehari-hari ke dalam flowchart menggunakan struktur sekuensial dan percabangan kondisional.",
    pdfTitle: "Lembar_Kerja_Flowchart_Informatika_SMPN7.pdf",
    pdfContent: "PANDUAN PRAKTIKUM INFORMATIKA KELAS 8\nUPTD SMP NEGERI 7 KOTA TANGERANG SELATAN\n\nSimbol Utama Diagram Alir (Flowchart):\n- Oval (Terminator): Titik Mulai (Start) atau Selesai (End)\n- Persegi Panjang (Process): Proses komputasi / penugasan nilai\n- Belah Ketupat (Decision): Pengambilan keputusan kondisi (True / False)\n- Jajar Genjang (Input/Output): Pembacaan input atau penayangan output\n\nStudi Kasus Lab: Logika penentuan kelulusan ulangan (KKM Nilai >= 75).",
    chapters: [
      { time: "00:00", title: "Apa itu Berpikir Komputasional?", seconds: 0 },
      { time: "03:20", title: "Mengenal Simbol Baku Flowchart", seconds: 200 },
      { time: "07:30", title: "Studi Kasus Logika Nilai KKM 75", seconds: 450 },
      { time: "11:50", title: "Mencegah Loop Tak Terhingga (Infinite Loop)", seconds: 710 },
      { time: "14:20", title: "Tugas Mandiri Pembuatan Diagram", seconds: 860 }
    ]
  },
  {
    id: "smpn7-eng-09-01",
    title: "Procedure Text: Structure, Language Features, and Recipe Analysis",
    grade: "9",
    subject: "Bahasa Inggris",
    category: "Bahasa",
    teacher: "Siti Rahmawati, S.Pd., M.Hum.",
    teacherNip: "19850620 200902 2 007",
    duration: "12:50",
    embedUrl: "https://www.youtube-nocookie.com/embed/6p4ElkZ1H1c?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=640&q=80",
    description: "Mempersiapkan siswa Kelas 9 menghadapi asesmen akhir jenjang. Membedah susunan Goal, Materials/Ingredients, dan Steps serta kata hubung temporal (First, Next, Finally).",
    learningOutcome: "Students can identify the communicative purpose, generic structure, and imperative language features of spoken and written procedure texts.",
    pdfTitle: "Procedure_Text_CheatSheet_Grade9.pdf",
    pdfContent: "ENGLISH SUMMARY GRADE 9 - UPTD SMPN 7 TANGERANG SELATAN\nGENRE: PROCEDURE TEXT\n\n1. Purpose: To explain how something is made or done through a sequence of steps.\n2. Generic Structure:\n   - Goal/Aim: Stated in the title (e.g., How to Operate a Blender).\n   - Materials/Ingredients: List of things needed.\n   - Steps/Methods: Numbered action instructions.\n3. Language Features:\n   - Simple Present Tense\n   - Imperative Sentences (Cut the fruit, Boil the water)\n   - Action Verbs (pour, mix, stir, blend)\n   - Connectives of Sequence (First, Second, Then, After that, Finally)",
    chapters: [
      { time: "00:00", title: "Introduction & Social Function", seconds: 0 },
      { time: "02:15", title: "Three Generic Structures of Procedure", seconds: 135 },
      { time: "05:50", title: "Imperative Verbs & Action Words", seconds: 350 },
      { time: "09:00", title: "Sample Text Analysis & Exam Practice", seconds: 540 }
    ]
  },
  {
    id: "smpn7-ind-07-01",
    title: "Teks Deskripsi: Menangkap Objek Melalui Cerapan Panca Indra",
    grade: "7",
    subject: "Bahasa Indonesia",
    category: "Bahasa",
    teacher: "Dewi Lestari, S.Pd.",
    teacherNip: "19900114 201903 2 011",
    duration: "13:15",
    embedUrl: "https://www.youtube-nocookie.com/embed/wW1lY5jwn3k?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=640&q=80",
    description: "Belajar melukiskan keindahan objek, tempat wisata, atau lingkungan sekolah SMPN 7 secara rinci sehingga pembaca seolah-olah melihat, mendengar, dan merasakan langsung.",
    learningOutcome: "Peserta didik mampu memahami informasi berupa gagasan, pikiran, atau pesan dari teks deskripsi lisan dan visual untuk menemukan makna yang tersurat maupun tersirat.",
    pdfTitle: "Panduan_Menulis_Teks_Deskripsi_SMPN7.pdf",
    pdfContent: "BAHASA INDONESIA KELAS 7 - SMPN 7 TANGSEL\nTEKS DESKRIPSI\n\nCiri Utama Teks Deskripsi:\n1. Menggambarkan objek secara terperinci (fisik, suasana, sifat).\n2. Melibatkan cerapan panca indra (penglihatan, pendengaran, penciuman, perabaan, pengecapan).\n3. Membuat pembaca merasakan langsung objek yang dideskripsikan.\n\nStruktur Teks:\n- Identifikasi / Gambaran Umum: Nama objek, lokasi, sejarah singkat.\n- Deskripsi Bagian: Perincian bagian-bagian fisik objek.\n- Simpulan / Kesan Pribadi: Penutup dan tanggapan emosional penulis.",
    chapters: [
      { time: "00:00", title: "Definisi & Ciri Teks Deskripsi", seconds: 0 },
      { time: "02:50", title: "Peran Kalimat Panca Indra", seconds: 170 },
      { time: "06:20", title: "Struktur Identifikasi dan Deskripsi Bagian", seconds: 380 },
      { time: "09:50", title: "Contoh Objek: Fasilitas SMPN 7 Tangsel", seconds: 590 }
    ]
  },
  {
    id: "smpn7-ips-09-01",
    title: "Globalisasi dan Perubahan Sosial Budaya di Era Digital",
    grade: "9",
    subject: "Ilmu Pengetahuan Sosial (IPS)",
    category: "IPS",
    teacher: "Drs. Bambang Sudarsono",
    teacherNip: "19700422 199802 1 002",
    duration: "15:45",
    embedUrl: "https://www.youtube-nocookie.com/embed/Z1BCujX3pw8?enablejsapi=1&rel=0&modestbranding=1",
    fallbackVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=640&q=80",
    description: "Analisis kritis dampak positif dan tantangan globalisasi bagi remaja. Mengkaji fenomena westernisasi, konsumerisme, dan pentingnya melestarikan kearifan lokal di Tangerang Selatan.",
    learningOutcome: "Peserta didik memahami perubahan sosial budaya sebagai dampak globalisasi serta memiliki sikap kritis dan selektif terhadap pengaruh budaya luar.",
    pdfTitle: "Rangkuman_IPS_Globalisasi_Kelas9.pdf",
    pdfContent: "RANGKUMAN IPS KELAS 9 - UPTD SMP NEGERI 7 KOTA TANGERANG SELATAN\nBAB: PERUBAHAN SOSIAL BUDAYA DAN GLOBALISASI\n\nBentuk Globalisasi:\n1. Bidang IPTEK: Komunikasi digital, internet, repositori pembelajaran mandiri sekolah.\n2. Bidang Ekonomi: Pasar bebas, e-commerce, kemudahan transaksi non-tunai.\n3. Bidang Komunikasi: Media sosial, pertukaran informasi kilat lintas benua.\n4. Bidang Budaya: Akulturasi, gaya hidup, kuliner modern.\n\nUpaya Menghadapi Globalisasi:\n- Memperkokoh jati diri dan nilai-nilai luhur Pancasila.\n- Menyaring budaya asing dengan nilai kearifan lokal Tangerang Selatan.\n- Memanfaatkan teknologi digital untuk kemandirian belajar.",
    chapters: [
      { time: "00:00", title: "Pengertian Globalisasi & Faktor Pendorong", seconds: 0 },
      { time: "03:45", title: "Empat Bidang Utama Globalisasi", seconds: 225 },
      { time: "08:10", title: "Dampak Positif vs Ancaman Pergeseran Nilai", seconds: 490 },
      { time: "11:40", title: "Sikap Kritis Pelajar SMPN 7 Tangsel", seconds: 700 }
    ]
  }
];

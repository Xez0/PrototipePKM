---
version: 2.0
name: SMPN7-Scholastic-Ledger
description: >-
  An editorial, zero-slop scholastic interface for UPTD SMP Negeri 7 Kota Tangerang Selatan.
  Synthesizes Cal.com/Linear structural precision (awesome-design-md) with Achromatic Ledger
  restraint (design-taste-frontend), Impeccable craft-floor rules, UI/UX Pro Max accessibility
  standards, and Anti-Slop hard gates. Surface elevation relies on 1px hairlines and tonal steps
  (#F8FAFC canvas, #FFFFFF sheet) rather than soft shadows or glassmorphism. Color is kept under
  3% of pixels: deep institutional navy (#122B5C) for the single primary action, warm amber (#D97706)
  for active curriculum highlights, and emerald (#15803D) strictly for server auto-sync and
  completed states.

colors:
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  surface-subtle: "#F1F5F9"
  surface-Active: "#E2E8F0"
  surface-dark: "#0B132B"
  ink: "#0A0F1D"
  body: "#334155"
  muted: "#64748B"
  hairline: "#E2E8F0"
  hairline-strong: "#CBD5E1"
  primary: "#122B5C"
  primary-hover: "#1E3A8A"
  on-primary: "#FFFFFF"
  accent-amber: "#D97706"
  status-online: "#15803D"
  status-danger: "#B91C1C"

typography:
  display-lg:
    fontFamily: "Bricolage Grotesque, Plus Jakarta Sans, sans-serif"
    fontSize: "36px"
    fontWeight: "700"
    lineHeight: "1.15"
    letterSpacing: "-0.025em"
  title-lg:
    fontFamily: "Bricolage Grotesque, Plus Jakarta Sans, sans-serif"
    fontSize: "24px"
    fontWeight: "700"
    lineHeight: "1.25"
    letterSpacing: "-0.02em"
  title-md:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "18px"
    fontWeight: "600"
    lineHeight: "1.35"
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "1.55"
    letterSpacing: "0"
  label-sm:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "14px"
    fontWeight: "600"
    lineHeight: "1.4"
    letterSpacing: "0"
  mono-num:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "13px"
    fontWeight: "500"
    lineHeight: "1.4"
    letterSpacing: "0"

rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  pill: "9999px"

spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
---

# Sistem Desain: Scholastic Achromatic Ledger — SMPN 7 Tangerang Selatan

## 1. Prinsip Anti-Slop & Craft Floor (Wajib Ditaati)
1. **Dilarang Menggunakan Kicker / Eyebrow di Atas Judul:** Jangan pernah menaruh badge/pill kecil berhuruf kapital di atas judul halaman atau seksi. Biarkan judul (`h1`/`h2`) berbicara langsung dengan bobot tipografinya.
2. **Dilarang Membuat Kartu KPI dengan Ikon di Dalam Kotak Warna-warni:** Angka ringkasan ditampilkan secara tipografis (`tabular-nums`) di atas bidang datar berbatas garis tipis `1px solid #E2E8F0`, bukan kartu mengambang dengan ikon warna-warni.
3. **Dilarang Menumpuk Pill/Badge Pelangi di Dalam Tabel (No Pill Soup):** Satu baris tabel maksimal memiliki penanda kelas/mapel yang tenang (monokrom/tint tipis). Jangan menaruh 4–5 badge warna-warni berbeda di setiap baris.
4. **Dilarang Menambahkan Elemen Navigasi Fiktif:** Header hanya memuat identitas nyata aplikasi (*SMP Negeri 7 Tangerang Selatan*, *Katalog Bahan Ajar*, *Prinsip Mandiri*, sakelar tema, dan *Portal Guru*). Jangan menambah lonceng notifikasi palsu, menu "Jadwal Pelajaran", atau banner helpdesk fiktif.
5. **Permukaan Datar & Tegas (Flat Hairline Surfaces):** Tidak ada `linear-gradient`, tidak ada `backdrop-filter: blur()`, dan tidak ada bayangan kabur yang berlebihan. Pemisahan antar blok murni menggunakan perbedaan warna latar (`#F8FAFC` vs `#FFFFFF`) dan garis batas `1px solid #E2E8F0`.
6. **Ramah Guru Senior (Operate Mode):** Ukuran teks isi minimal `16px`, target klik tombol minimal `44px`, dan setiap tombol tindakan di tabel wajib memiliki label teks eksplisit (`Pratinjau`, `Ubah`, `Hapus`).

## 2. Arsitektur Komponen Utama

### A. Command Filter Bar (Katalog Siswa)
Menggantikan tumpukan chip asimetris dengan satu bilah kontrol terpadu (*Single Framed Sheet*):
- **Baris Kontrol Utama:** Input pencarian di kiri (`flex: 1`) menyatu secara horizontal dengan **Segmented Control Kelas** (`Semua Kelas`, `Kelas 7`, `Kelas 8`, `Kelas 9`) di dalam track `#F1F5F9` di sisi kanan.
- **Baris Sub-Filter Mata Pelajaran:** Deretan tab horizontal rata kiri dengan garis bawah aktif `2px solid #122B5C` dan angka jumlah materi dalam format `tabular-nums` di dalam kurung atau badge netral (`Semua Mapel 7`, `Matematika 1`, `IPA 1`, `Informatika 1`, `B. Indonesia 1`, `B. Inggris 1`, `IPS 1`, `PPKn 1`).

### B. Dashboard Tabel Guru (Achromatic Ledger Table)
- **Header Ringkas:** Identitas guru di kiri, status sinkronisasi server (`● Tersimpan Otomatis di Server Sekolah`) + tombol **`+ Tambah Materi Baru`** di kanan.
- **Ringkasan Inline (Typographic Strip):** Satu baris angka jujur di atas tabel (*7 Materi Tayang · 6 Tautan YouTube · 1 Berkas Lokal*), tanpa kartu KPI berikon.
- **Tabel Materi:** Header tabel berlatar `#F8FAFC`, garis pembatas `1px solid #E2E8F0`, angka nomor dan durasi menggunakan `tabular-nums`, serta 3 tombol teks tegas di kolom paling kanan.

### C. Formulir Tambah / Ubah Materi (Focused Sheet Editor)
- Terbuka sebagai tampilan khusus (menggantikan tabel sementara saat guru menambah/mengubah materi) agar tidak terjadi tumpukan vertikal.
- **Pratinjau Instan YouTube:** Menampilkan *thumbnail* asli video, judul, dan status validasi tepat di bawah kolom URL YouTube.
- **Bagian Opsional yang Tenang:** Input *Ringkasan Materi*, *Tautan Latihan Soal (Google Form/Quizizz)*, dan *Menit Bab Video* dikelompokkan dalam panel opsional yang bersih tanpa warna peringatan yang mencolok.

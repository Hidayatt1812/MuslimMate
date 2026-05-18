# MuslimMate

**English** | [Bahasa Indonesia](#bahasa-indonesia)

A comprehensive Islamic companion app built with React Native (Expo). MuslimMate brings together prayer times, Al-Quran reading, dhikr, worship tracking, Quran memorization, and AI-powered Islamic guidance — all in one app.

---

## Table of Contents

- [Features (English)](#features)
  - [Home Dashboard](#1-home-dashboard)
  - [Prayer Times](#2-prayer-times)
  - [Al-Quran](#3-al-quran)
  - [Dhikr & Dua](#4-dhikr--dua)
  - [Qibla Compass](#5-qibla-compass)
  - [Worship Tracker](#6-worship-tracker)
  - [Ramadan Mode](#7-ramadan-mode)
  - [Tahfidz (Memorization)](#8-tahfidz-memorization-mode)
  - [Worship Statistics](#9-worship-statistics)
  - [AI Chat Assistant](#10-ai-chat-assistant)
- [Tech Stack](#tech-stack)
- [APIs Used](#apis-used)
- [Getting Started](#getting-started)
- [Fitur (Bahasa Indonesia)](#fitur)

---

## Features

### 1. Home Dashboard

The main hub for your daily Islamic routine.

- **Next Prayer Countdown** — Live countdown to the next prayer (Fajr, Dhuhr, Asr, Maghrib, Isha)
- **Daily Prayer Checklist** — Track your 5 daily prayers with a progress bar and streak badge
- **Daily Quran Verse** — A random verse from the Quran with Arabic text and Indonesian translation, refreshed daily
- **Last Read Quran** — Resume reading from where you left off
- **Quick Access** — Shortcuts to Qibla, Statistics, Ramadan Mode, and AI Chat
- **Location Display** — Your current city for accurate prayer time calculation

---

### 2. Prayer Times

Full daily prayer schedule based on your GPS location.

- Prayer times for Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha
- Additional times: **Imsak** (pre-dawn) and **Midnight**
- Hijri (Islamic) calendar date display alongside the Gregorian date
- Next prayer highlighted with a live countdown
- Powered by the **Aladhan API** using the KEMENAG Indonesia calculation method

---

### 3. Al-Quran

A complete Quran reading experience with multiple modes.

#### Surah List
- All 114 surahs searchable by English name, Indonesian name, Arabic name, or number
- Metadata per surah: ayah count, Juz, type (Meccan/Medinan)

#### Reader Settings

| Setting | Options |
|---|---|
| Arabic Script | Uthmani (standard) · Naskh (simplified) |
| Display Mode | Normal · Tajweed · Beginner (Pemula) |
| Font Size | 18px – 40px |
| Translation | Toggle Indonesian translation per ayah |

#### Display Modes

**Normal Mode**
- Full Arabic text with Indonesian translation
- Verse bookmarking
- Asbabun Nuzul (historical reasons for revelation) for supported verses

**Tajweed Mode**
- Arabic text color-coded by tajweed rules (Qalqalah, Mad, Ghunnah, Ikhfa, and more)
- Tap any colored word to open a guide panel with:
  - Rule name and category
  - How to pronounce it
  - Step-by-step reading instructions
  - Arabic examples
  - YouTube tutorial link
  - Previous/next rule navigation

**Beginner (Pemula) Mode**
- Word-by-word Arabic breakdown with Latin transliteration below each word
- Full transliteration line
- Reading tips for beginners
- Ideal for those learning to read Arabic

#### Audio Playback
- **Single ayah** — Play any individual verse
- **Full surah playback** — Play all verses sequentially with:
  - Auto-advance to the next ayah
  - Auto-scroll to the currently playing ayah
  - Floating player bar with Prev / Next / Stop controls
  - Current ayah indicator (e.g., Ayat 3 / 286)
- Multiple renowned reciters available (e.g., Abdul Rahman Al-Sudais)
- Settings (script, mode, font size, translation, reciter) accessible directly inside the reader

---

### 4. Dhikr & Dua

Three-tab section for daily remembrance and supplication.

#### Dhikr Tab
- Collection of Islamic adhkaar (remembrances) with:
  - Arabic text, Latin transliteration, Indonesian translation
  - Repetition target and category badge (Morning, Evening, Prayer, General, Special)
  - Supporting hadith reference

#### Dua Tab
- Duas from the Quran and Sunnah with Arabic text, transliteration, translation, and source reference

#### Tasbih Tab (Counter)
- **Circular progress ring** — Fills as you count toward your target
- **Tap to count** — Tap the center to increment
- **Haptic feedback** — Vibration on each tap (toggleable)
- **Multi-round tracking** — Shows completed rounds
- **Dhikr selector chips** — Switch between dhikrs instantly
- **Reset button** — Restart the counter

---

### 5. Qibla Compass

GPS-powered Qibla direction finder.

- **Live compass** — SVG compass rose with cardinal directions
- **Qibla needle** — Green arrow pointing toward the Kaaba in Mecca
- **Accuracy indicator** — Confirms when you are facing the Qibla (green) or need to adjust (gold)
- **Degree display** — Shows both the Qibla angle and current device heading
- **GPS coordinates** — Displays the current latitude/longitude used for calculation

---

### 6. Worship Tracker

Daily habit tracker with a gamification system.

- **5 prayer checkboxes** — Log each of the 5 daily prayers
- **Quran & Dhikr toggles** — Track additional daily habits
- **Daily score** — Up to 7 points per day (5 prayers + Quran + Dhikr)
- **Streak counter** — Consecutive days active
- **7-day bar chart** — Visual overview of the past week
- **Level system** based on your streak:

| Level | Name | Days Required |
|---|---|---|
| 1 | Pemula (Beginner) | 0 – 9 days |
| 2 | Murid (Student) | 10 – 29 days |
| 3 | Santri | 30 – 59 days |
| 4 | Hafidz | 60 – 99 days |
| 5 | Ulama (Scholar) | 100+ days |

- **Achievement badges** unlocked at 7 days, 30 days, and 100 days

---

### 7. Ramadan Mode

Ramadan-specific tracking and schedule.

- Current Ramadan day number and overall progress bar
- Today's schedule: **Imsak**, **Fajr**, and **Iftar** times
- Daily log — Did you fast today? Did you pray Tarawih?
- Total fasting days counter for the month
- **Dua Buka Puasa** — Breaking-fast supplication with Arabic text and Indonesian translation

---

### 8. Tahfidz (Memorization) Mode

A structured tool for memorizing the Quran.

- **Create a memorization plan** — Choose a surah and set a daily ayah target
- **Plan overview** — Progress bar, memorized/total ayahs, daily target
- **Study session with 4 modes**:

| Mode | Description |
|---|---|
| Read | Display ayahs normally for reading |
| Listen / Loop | Play audio on repeat (configurable loop count) |
| Hide | Hide Arabic text to test recall from memory |
| Test | Self-testing mode |

- Audio playback per ayah with loop controls
- Mark ayahs as memorized and track progress over time

---

### 9. Worship Statistics

Analytics dashboard for your worship habits.

- **Summary cards** — Current streak, total active days, longest streak ever
- **Weekly prayer chart** — 7-day bar graph of prayer completion
- **Per-prayer completion rate** — Progress bar for each of the 5 prayers (X/7 days)
- **Weekly insights** — Average prayers per day, days Quran was read, days Dhikr was completed, total prayers this week (out of 35)

---

### 10. AI Chat Assistant

An AI-powered Islamic Q&A assistant.

- Built on an OpenAI-compatible API (configurable endpoint and model)
- System-prompted to answer questions based on the Quran and Hadith
- **Suggested questions** for quick start
- **Conversation history** — Maintains context for natural dialogue (last 10 messages)
- Message timestamps and typing indicator while the AI processes your question

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo) |
| Navigation | Expo Router (file-based) |
| Storage | AsyncStorage |
| Audio | expo-av |
| Location | expo-location |
| Compass | expo-sensors |
| Haptics | expo-haptics |
| UI Icons | @expo/vector-icons (Ionicons) |
| Language | TypeScript |

---

## APIs Used

| API | Purpose |
|---|---|
| [Aladhan API](https://aladhan.com/prayer-times-api) | Prayer times worldwide |
| [Al-Quran Cloud API](https://alquran.cloud/api) | Quran text, translations, multiple scripts |
| [EveryAyah CDN](https://everyayah.com) | Quranic audio from multiple reciters |
| OpenAI-compatible API | AI Islamic chat assistant |
| Device GPS | Prayer times & Qibla calculation |
| Device Compass | Qibla direction needle |

---

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd MuslimMate

# Install dependencies
npm install

# Start the development server
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone, or run on an Android emulator / iOS simulator.

> **Note:** For the AI Chat feature, an OpenAI-compatible API key and endpoint must be configured in the app settings.

---

## Permissions Required

| Permission | Used For |
|---|---|
| Location (Fine / Coarse) | Prayer times, Qibla direction |
| Compass / Sensors | Qibla compass needle |
| Vibration | Tasbih counter haptic feedback |

---

---

# Bahasa Indonesia

**[English](#muslimmate)** | Bahasa Indonesia

MuslimMate adalah aplikasi pendamping Islami lengkap yang dibangun dengan React Native (Expo). Menggabungkan waktu sholat, baca Al-Quran, dzikir, pelacak ibadah, hafalan Quran, dan panduan Islami berbasis AI — semua dalam satu aplikasi.

---

## Daftar Isi (Indonesia)

- [Fitur](#fitur)
  - [Beranda (Dashboard)](#1-beranda-dashboard)
  - [Jadwal Sholat](#2-jadwal-sholat)
  - [Al-Quran](#3-al-quran-1)
  - [Dzikir & Doa](#4-dzikir--doa)
  - [Kompas Kiblat](#5-kompas-kiblat)
  - [Tracker Ibadah](#6-tracker-ibadah)
  - [Mode Ramadhan](#7-mode-ramadhan)
  - [Tahfidz (Hafalan)](#8-tahfidz-mode-hafalan)
  - [Statistik Ibadah](#9-statistik-ibadah)
  - [Asisten AI](#10-asisten-ai)
- [Teknologi](#teknologi)
- [API yang Digunakan](#api-yang-digunakan)
- [Cara Menjalankan](#cara-menjalankan)

---

## Fitur

### 1. Beranda (Dashboard)

Pusat utama untuk rutinitas Islami harian Anda.

- **Hitung Mundur Sholat Berikutnya** — Hitungan mundur langsung ke sholat berikutnya (Subuh, Dzuhur, Ashar, Maghrib, Isya)
- **Checklist Sholat Harian** — Catat kelima sholat wajib harian dengan progress bar dan badge streak
- **Ayat Harian** — Ayat Al-Quran acak dengan teks Arab dan terjemahan Indonesia, diperbarui setiap hari
- **Terakhir Dibaca** — Lanjutkan membaca dari posisi terakhir di Al-Quran
- **Akses Cepat** — Pintasan ke Kiblat, Statistik, Mode Ramadhan, dan Obrolan AI
- **Lokasi** — Menampilkan kota Anda untuk kalkulasi waktu sholat yang akurat

---

### 2. Jadwal Sholat

Jadwal sholat harian lengkap berdasarkan lokasi GPS Anda.

- Waktu sholat: Subuh, Terbit, Dzuhur, Ashar, Maghrib, dan Isya
- Waktu tambahan: **Imsak** dan **Tengah Malam**
- Tampilan tanggal Hijriah (kalender Islam) dan Masehi
- Sholat berikutnya disorot dengan hitung mundur langsung
- Menggunakan **Aladhan API** dengan metode perhitungan KEMENAG Indonesia

---

### 3. Al-Quran

Pengalaman membaca Al-Quran lengkap dengan berbagai mode tampilan.

#### Daftar Surah
- Semua 114 surah bisa dicari berdasarkan nama Inggris, Indonesia, Arab, atau nomor surah
- Informasi tiap surah: jumlah ayat, Juz, jenis (Makkiyah/Madaniyah)

#### Pengaturan Bacaan

| Pengaturan | Pilihan |
|---|---|
| Script Arab | Utsmani (standar) · Naskh (sederhana) |
| Mode Tampilan | Normal · Tajwid · Pemula |
| Ukuran Font | 18px – 40px |
| Terjemahan | Aktifkan/nonaktifkan terjemahan Indonesia per ayat |

#### Mode Tampilan

**Mode Normal**
- Teks Arab lengkap dengan terjemahan Indonesia
- Simpan ayat favorit sebagai bookmark
- Asbabun Nuzul (latar belakang turunnya ayat) untuk ayat-ayat tertentu

**Mode Tajwid**
- Teks Arab diwarnai sesuai hukum tajwid (Qalqalah, Mad, Ghunnah, Ikhfa, dan lainnya)
- Ketuk kata berwarna untuk membuka panel panduan yang berisi:
  - Nama dan kategori hukum tajwid
  - Cara membacanya
  - Langkah-langkah bacaan
  - Contoh dalam bahasa Arab
  - Link tutorial YouTube
  - Navigasi ke hukum tajwid sebelumnya/berikutnya

**Mode Pemula**
- Kata per kata dengan transliterasi Latin di bawah setiap kata
- Baris transliterasi lengkap
- Tips membaca untuk pemula
- Cocok untuk yang sedang belajar membaca huruf Arab

#### Pemutaran Audio
- **Satu ayat** — Putar ayat tertentu secara individual
- **Seluruh surah** — Putar semua ayat secara berurutan dengan:
  - Lanjut otomatis ke ayat berikutnya
  - Scroll otomatis ke ayat yang sedang diputar
  - Floating player bar dengan kontrol Prev / Next / Stop
  - Indikator ayat saat ini (contoh: Ayat 3 / 286)
- Pilihan beberapa qari ternama (contoh: Abdurrahman Al-Sudais)
- Pengaturan (script, mode, ukuran font, terjemahan, qari) dapat diakses langsung dari dalam halaman baca

---

### 4. Dzikir & Doa

Tiga tab untuk dzikir dan doa harian.

#### Tab Dzikir
- Kumpulan dzikir Islami dengan:
  - Teks Arab, transliterasi Latin, terjemahan Indonesia
  - Target pengulangan dan badge kategori (Pagi, Petang, Sholat, Umum, Khusus)
  - Referensi hadis pendukung

#### Tab Doa
- Doa-doa dari Al-Quran dan Sunnah lengkap dengan teks Arab, transliterasi, terjemahan, dan sumber hadis

#### Tab Tasbih (Penghitung)
- **Cincin progress melingkar** — Terisi seiring hitungan mendekati target
- **Ketuk untuk menghitung** — Ketuk lingkaran tengah untuk menambah hitungan
- **Getaran (haptic)** — Umpan balik getar setiap ketukan (bisa dimatikan)
- **Pelacak putaran** — Menampilkan jumlah putaran yang sudah selesai
- **Chip pilihan dzikir** — Ganti dzikir secara instan
- **Tombol reset** — Mulai ulang hitungan

---

### 5. Kompas Kiblat

Penunjuk arah kiblat berbasis GPS.

- **Kompas langsung** — Tampilan kompas SVG dengan arah mata angin (U/T/S/B)
- **Jarum kiblat** — Panah hijau yang menunjuk ke arah Ka'bah di Mekkah
- **Indikator akurasi** — Konfirmasi jika sudah menghadap kiblat (hijau) atau perlu penyesuaian (emas)
- **Tampilan derajat** — Menampilkan sudut kiblat dan arah perangkat saat ini
- **Koordinat GPS** — Menampilkan lintang/bujur yang digunakan untuk perhitungan

---

### 6. Tracker Ibadah

Pelacak kebiasaan ibadah harian dengan sistem gamifikasi.

- **5 checkbox sholat** — Catat masing-masing sholat wajib harian
- **Toggle Quran & Dzikir** — Pantau kebiasaan ibadah tambahan
- **Skor harian** — Hingga 7 poin per hari (5 sholat + Quran + Dzikir)
- **Hitung streak** — Hari berturut-turut yang aktif beribadah
- **Grafik 7 hari** — Tampilan visual perkembangan seminggu terakhir
- **Sistem level** berdasarkan streak Anda:

| Level | Nama | Syarat |
|---|---|---|
| 1 | Pemula | 0 – 9 hari |
| 2 | Murid | 10 – 29 hari |
| 3 | Santri | 30 – 59 hari |
| 4 | Hafidz | 60 – 99 hari |
| 5 | Ulama | 100+ hari |

- **Lencana pencapaian** terbuka pada 7 hari, 30 hari, dan 100 hari

---

### 7. Mode Ramadhan

Fitur khusus untuk bulan Ramadhan.

- Hari Ramadhan saat ini dan progress bar keseluruhan bulan
- Jadwal hari ini: **Imsak**, **Subuh**, dan **Buka Puasa (Maghrib)**
- Log harian — Apakah Anda berpuasa hari ini? Apakah Anda sholat Tarawih?
- Penghitung total hari puasa selama bulan Ramadhan
- **Doa Buka Puasa** — Doa berbuka puasa dengan teks Arab dan terjemahan Indonesia

---

### 8. Tahfidz Mode (Hafalan)

Alat terstruktur untuk menghafal Al-Quran.

- **Buat rencana hafalan** — Pilih surah dan tentukan target ayat per hari
- **Ringkasan rencana** — Progress bar, ayat yang dihafal/total, target harian
- **Sesi belajar dengan 4 mode**:

| Mode | Keterangan |
|---|---|
| Baca | Tampilkan ayat untuk dibaca biasa |
| Dengar / Loop | Putar audio berulang kali (jumlah ulang bisa diatur) |
| Sembunyikan | Sembunyikan teks Arab untuk menguji hafalan |
| Tes | Mode ujian mandiri |

- Pemutaran audio per ayat dengan kontrol loop
- Tandai ayat sebagai sudah dihafal dan pantau progres dari waktu ke waktu

---

### 9. Statistik Ibadah

Dasbor analitik untuk kebiasaan ibadah Anda.

- **Kartu ringkasan** — Streak saat ini, total hari aktif, streak terpanjang
- **Grafik sholat mingguan** — Grafik batang 7 hari penyelesaian sholat
- **Tingkat penyelesaian per sholat** — Progress bar untuk masing-masing dari 5 sholat (X/7 hari)
- **Insight mingguan** — Rata-rata sholat per hari, hari membaca Quran, hari berdzikir, total sholat minggu ini (dari 35)

---

### 10. Asisten AI

Asisten tanya jawab Islami berbasis kecerdasan buatan.

- Dibangun di atas API yang kompatibel dengan OpenAI (endpoint dan model bisa dikonfigurasi)
- Dirancang untuk menjawab pertanyaan berdasarkan Al-Quran dan Hadis
- **Pertanyaan yang disarankan** untuk memulai dengan cepat
- **Riwayat percakapan** — Menjaga konteks untuk dialog yang alami (10 pesan terakhir)
- Timestamp pesan dan indikator mengetik saat AI memproses pertanyaan Anda

---

## Teknologi

| Lapisan | Teknologi |
|---|---|
| Framework | React Native (Expo) |
| Navigasi | Expo Router (berbasis file) |
| Penyimpanan | AsyncStorage |
| Audio | expo-av |
| Lokasi | expo-location |
| Kompas | expo-sensors |
| Haptic | expo-haptics |
| Ikon UI | @expo/vector-icons (Ionicons) |
| Bahasa | TypeScript |

---

## API yang Digunakan

| API | Kegunaan |
|---|---|
| [Aladhan API](https://aladhan.com/prayer-times-api) | Waktu sholat di seluruh dunia |
| [Al-Quran Cloud API](https://alquran.cloud/api) | Teks Quran, terjemahan, berbagai script |
| [EveryAyah CDN](https://everyayah.com) | Audio Quran dari berbagai qari |
| API kompatibel OpenAI | Asisten obrolan AI Islami |
| GPS Perangkat | Perhitungan waktu sholat & kiblat |
| Kompas Perangkat | Jarum kompas kiblat |

---

## Cara Menjalankan

```bash
# Clone repositori
git clone <repo-url>
cd MuslimMate

# Install dependensi
npm install

# Jalankan development server
npx expo start
```

Scan QR code menggunakan aplikasi **Expo Go** di ponsel Anda, atau jalankan di emulator Android / simulator iOS.

> **Catatan:** Untuk fitur Obrolan AI, API key dan endpoint yang kompatibel dengan OpenAI harus dikonfigurasi di pengaturan aplikasi.

---

## Izin yang Diperlukan

| Izin | Digunakan Untuk |
|---|---|
| Lokasi (Fine / Coarse) | Waktu sholat, arah kiblat |
| Kompas / Sensor | Jarum kompas kiblat |
| Getaran | Umpan balik haptic penghitung tasbih |

---

*MuslimMate — Pendamping Islami harian Anda.*

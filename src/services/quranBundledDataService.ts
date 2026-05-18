/**
 * Quran Bundled Data Service
 * ==========================
 * Membaca data Al-Quran yang sudah dibundle langsung di dalam app
 * (assets/quran/quran-data.json).
 *
 * Data tersedia INSTANT tanpa internet setelah menjalankan:
 *   node scripts/download-quran-data.mjs
 *
 * Jika bundle belum tersedia (version === 0), semua fungsi mengembalikan null
 * dan app akan fallback ke API/cache offline seperti biasa.
 */

import type { SurahWithTranslation } from '@/services/quranService';

interface QuranBundle {
  version: number;
  generated: string;
  surahs: Record<string, SurahWithTranslation>;
  translit: Record<string, string[]>;
}

// ─── Lazy load bundle (hanya dimuat sekali ke memori) ─────────────────────────
let _bundle: QuranBundle | null | undefined = undefined; // undefined = belum dicoba load

function loadBundle(): QuranBundle | null {
  if (_bundle !== undefined) return _bundle;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const raw = require('../../assets/quran/quran-data.json') as QuranBundle;
    if (!raw || raw.version === 0 || !raw.surahs) {
      _bundle = null;
      return null;
    }
    _bundle = raw;
    return _bundle;
  } catch {
    _bundle = null;
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Apakah data bundle tersedia dan valid? */
export function isBundleAvailable(): boolean {
  const bundle = loadBundle();
  return bundle !== null && bundle.version > 0;
}

/** Metadata bundle (versi, tanggal generate, jumlah surah). */
export function getBundleInfo(): { version: number; generated: string; surahCount: number } | null {
  const bundle = loadBundle();
  if (!bundle) return null;
  return {
    version:    bundle.version,
    generated:  bundle.generated,
    surahCount: Object.keys(bundle.surahs).length,
  };
}

/**
 * Ambil data surah dari bundle (Arabic + terjemahan Indonesia).
 * Mengembalikan null jika bundle tidak tersedia atau surah tidak ada.
 */
export function getBundledSurah(surahNumber: number): SurahWithTranslation | null {
  const bundle = loadBundle();
  if (!bundle) return null;
  return (bundle.surahs[surahNumber] ?? bundle.surahs[String(surahNumber)]) ?? null;
}

/**
 * Ambil transliterasi Latin surah dari bundle.
 * Mengembalikan null jika bundle tidak tersedia atau surah tidak ada.
 */
export function getBundledTranslit(surahNumber: number): string[] | null {
  const bundle = loadBundle();
  if (!bundle) return null;
  const data = bundle.translit[surahNumber] ?? bundle.translit[String(surahNumber)];
  if (!Array.isArray(data) || data.length === 0) return null;
  return data;
}

/**
 * Cek apakah surah tertentu ada di bundle.
 */
export function isSurahBundled(surahNumber: number): boolean {
  return getBundledSurah(surahNumber) !== null;
}

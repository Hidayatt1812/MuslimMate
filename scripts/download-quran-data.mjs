/**
 * MuslimMate — Quran Bundle Generator
 * =====================================
 * Script ini mendownload seluruh data Al-Quran (114 surah) dan menyimpannya
 * ke assets/quran/quran-data.json agar app bisa berjalan 100% offline.
 *
 * Cara pakai:
 *   node scripts/download-quran-data.mjs
 *
 * Sumber data:
 *   - Teks Arab (Utsmani): api.alquran.cloud
 *   - Terjemahan Indonesia: api.alquran.cloud (Kemenag RI)
 *   - Transliterasi Latin: api.alquran.cloud
 *
 * Output:
 *   assets/quran/quran-data.json (~3–5 MB)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'assets', 'quran', 'quran-data.json');
const TEMP_FILE = OUTPUT_FILE + '.tmp';

const BASE_URL = 'https://api.alquran.cloud/v1';
const TOTAL_SURAHS = 114;
const DELAY_MS = 300; // politeness delay antara request

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const bar = (done, total, width = 30) => {
  const filled = Math.round((done / total) * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + `] ${done}/${total}`;
};

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  ⚠ Retry ${attempt}/${retries}: ${err.message}`);
      await sleep(1000 * attempt);
    }
  }
}

// Konversi response alquran.cloud → format SurahWithTranslation
function buildSurahData(arabicData, translationData) {
  const meta = {
    number:                  arabicData.number,
    name:                    arabicData.name,
    englishName:             arabicData.englishName,
    englishNameTranslation:  arabicData.englishNameTranslation,
    numberOfAyahs:           arabicData.numberOfAyahs,
    revelationType:          arabicData.revelationType,
  };

  const arabicAyahs = arabicData.ayahs.map(a => ({
    number:         a.number,
    text:           a.text,
    numberInSurah:  a.numberInSurah,
    juz:            a.juz,
    manzil:         a.manzil,
    page:           a.page,
    ruku:           a.ruku,
    hizbQuarter:    a.hizbQuarter,
    sajda:          typeof a.sajda === 'object' ? true : !!a.sajda,
  }));

  const translationAyahs = arabicAyahs.map((ayah, i) => ({
    ...ayah,
    text: translationData.ayahs[i]?.text ?? '',
  }));

  return {
    arabic:      { ...meta, ayahs: arabicAyahs },
    translation: { ...meta, ayahs: translationAyahs },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   MuslimMate — Quran Bundle Generator        ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('');

  // Buat dir jika belum ada
  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const bundle = {
    version:   1,
    generated: new Date().toISOString(),
    surahs:    {},
    translit:  {},
  };

  let failed = [];

  // ── Phase 1: Teks Arab + Terjemahan Indonesia ──────────────────────────────
  console.log('Phase 1/2: Mendownload teks Arab + terjemahan Indonesia...\n');

  for (let n = 1; n <= TOTAL_SURAHS; n++) {
    process.stdout.write(`\r  ${bar(n - 1, TOTAL_SURAHS)}  Surah ${n}...        `);

    try {
      const [arabicRes, transRes] = await Promise.all([
        fetchWithRetry(`${BASE_URL}/surah/${n}/quran-uthmani`),
        fetchWithRetry(`${BASE_URL}/surah/${n}/id.indonesian`),
      ]);

      bundle.surahs[n] = buildSurahData(arabicRes.data, transRes.data);
    } catch (err) {
      console.error(`\n  ✗ Surah ${n}: ${err.message}`);
      failed.push({ phase: 1, surah: n, err: err.message });
    }

    await sleep(DELAY_MS);
  }

  process.stdout.write(`\r  ${bar(TOTAL_SURAHS, TOTAL_SURAHS)}  Selesai!          \n\n`);

  // ── Phase 2: Transliterasi Latin ──────────────────────────────────────────
  console.log('Phase 2/2: Mendownload transliterasi Latin...\n');

  for (let n = 1; n <= TOTAL_SURAHS; n++) {
    process.stdout.write(`\r  ${bar(n - 1, TOTAL_SURAHS)}  Surah ${n}...        `);

    try {
      const res = await fetchWithRetry(`${BASE_URL}/surah/${n}/en.transliteration`);
      bundle.translit[n] = res.data.ayahs.map(a => a.text);
    } catch (err) {
      console.error(`\n  ✗ Surah ${n} translit: ${err.message}`);
      failed.push({ phase: 2, surah: n, err: err.message });
      bundle.translit[n] = [];
    }

    await sleep(DELAY_MS);
  }

  process.stdout.write(`\r  ${bar(TOTAL_SURAHS, TOTAL_SURAHS)}  Selesai!          \n\n`);

  // ── Simpan ke file ─────────────────────────────────────────────────────────
  console.log('Menyimpan file...');
  const json = JSON.stringify(bundle);
  fs.writeFileSync(TEMP_FILE, json, 'utf8');
  fs.renameSync(TEMP_FILE, OUTPUT_FILE);

  const sizeKB = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  const surahCount = Object.keys(bundle.surahs).length;
  const translitCount = Object.keys(bundle.translit).length;

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   ✓ Bundle berhasil dibuat!                  ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Surah      : ${surahCount}/114`);
  console.log(`  Translitasi: ${translitCount}/114`);
  console.log(`  Ukuran     : ${sizeKB} KB (${(sizeKB / 1024).toFixed(1)} MB)`);
  console.log(`  File       : assets/quran/quran-data.json`);

  if (failed.length > 0) {
    console.log('');
    console.warn(`  ⚠ ${failed.length} surah gagal didownload:`);
    failed.forEach(f => console.warn(`    - Surah ${f.surah} (phase ${f.phase}): ${f.err}`));
    console.log('');
    console.log('  Jalankan ulang script untuk retry surah yang gagal.');
  }

  console.log('');
  console.log('  App siap digunakan 100% offline!');
  console.log('  Rebuild app (npm run android / ios) agar data terbundle.');
  console.log('');
}

main().catch(err => {
  console.error('\n✗ Fatal error:', err);
  process.exit(1);
});

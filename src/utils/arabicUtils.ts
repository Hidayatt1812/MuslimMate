/**
 * Arabic text and Quran numbering utilities.
 */

/**
 * Zero-pad a number to a given length.
 * e.g. padNumber(5, 3) → "005"
 */
export function padNumber(n: number, length = 3): string {
  return String(n).padStart(length, '0');
}

/**
 * Convert a number to its Arabic-Indic digit representation.
 * e.g. toArabicIndic(5) → "٥"
 */
export function toArabicIndic(n: number): string {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

/**
 * Check if a surah has a Basmallah prefix (all surahs except 1 and 9).
 */
export function hasBasmallah(surahNumber: number): boolean {
  return surahNumber !== 1 && surahNumber !== 9;
}

/**
 * Returns the Basmallah text used as the opener.
 */
export const BASMALLAH_TEXT = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

/**
 * Sanitize a reciter ID for use in file paths.
 */
export function sanitizeReciterId(reciterId: string): string {
  return String(reciterId ?? '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

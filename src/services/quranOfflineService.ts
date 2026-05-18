import * as FileSystem from 'expo-file-system/legacy';

import type { Lang } from '@/constants/i18n';
import { SURAH_LIST } from '@/constants/surah';
import { purgeLegacyQuranOfflineAsyncStorage } from '@/services/storageService';
import {
  getBundledSurah,
  getBundledTranslit,
} from '@/services/quranBundledDataService';
import {
  type ArabicScript,
  type ReciterSyncCapability,
  type SurahWithTranslation,
  type SurahWordByWord,
  type WordTimingSegment,
  DEFAULT_ARABIC_SCRIPT,
  RECITERS,
  fetchReciterWordTimingBySurah,
  fetchSurah,
  fetchSurahTranslit,
  fetchSurahWordByWord,
  getAudioUrl,
  getAyahAudioFallbackUrl,
  getIslamicNetworkAudioUrl,
  getSurahAudioUrl,
  normalizeArabicScript,
} from '@/services/quranService';

// Legacy AsyncStorage keys (from old implementation) that can overflow SQLite.
// New offline cache layout (filesystem JSON + audio files).
const OFFLINE_DATA_DIR = 'muslimmate-quran-data';
const OFFLINE_META_DIR = 'muslimmate-quran-meta';
const OFFLINE_AUDIO_DIR = 'muslimmate-quran-audio';
const OFFLINE_TRANSLATION_CACHE_VERSION = 'v2';
const AUTO_STATUS_FILE = 'auto_status.json';
const AUTO_OFFLINE_SCRIPTS: ArabicScript[] = ['uthmani', 'indopak', 'imlaei'];

let LEGACY_CLEANUP_PROMISE: Promise<void> | null = null;
let LEGACY_CACHE_CLEANED = false;
let AUTO_OFFLINE_SYNC_PROMISE: Promise<OfflineQuranAutoStatus> | null = null;

const uniqueStrings = (items: Array<string | null | undefined>): string[] =>
  Array.from(new Set(items.map(item => String(item ?? '').trim()).filter(Boolean)));

const sanitizeReciterId = (reciterId: string): string =>
  String(reciterId ?? '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');

const getFsRoot = (): string | null => FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

const getDataRootUri = (): string | null => {
  const root = getFsRoot();
  if (!root) return null;
  return `${root}${OFFLINE_DATA_DIR}`;
};

const getMetaRootUri = (): string | null => {
  const root = getFsRoot();
  if (!root) return null;
  return `${root}${OFFLINE_META_DIR}`;
};

const getAudioRootUri = (): string | null => {
  const root = getFsRoot();
  if (!root) return null;
  return `${root}${OFFLINE_AUDIO_DIR}`;
};

const normalizeOfflineLanguage = (language?: string | null): Lang =>
  language === 'en' ? 'en' : 'id';

const getSurahDataUri = (surahNumber: number, script: ArabicScript, language: Lang = 'id'): string | null => {
  const root = getDataRootUri();
  if (!root) return null;
  return `${root}/surah/${language}/${OFFLINE_TRANSLATION_CACHE_VERSION}/${script}/${surahNumber}.json`;
};

const getTranslitDataUri = (surahNumber: number): string | null => {
  const root = getDataRootUri();
  if (!root) return null;
  return `${root}/translit/${surahNumber}.json`;
};

const getWbwDataUri = (surahNumber: number, language: Lang = 'id'): string | null => {
  const root = getDataRootUri();
  if (!root) return null;
  return `${root}/wbw/${language}/${surahNumber}.json`;
};

const getTimingDataUri = (reciterId: string, surahNumber: number): string | null => {
  const root = getDataRootUri();
  if (!root) return null;
  return `${root}/timing/${sanitizeReciterId(reciterId)}/${surahNumber}.json`;
};

const getAutoStatusUri = (): string | null => {
  const root = getMetaRootUri();
  if (!root) return null;
  return `${root}/${AUTO_STATUS_FILE}`;
};

const getAyahOfflineUri = (
  surahNumber: number,
  ayahInSurah: number,
  reciterId: string
): string | null => {
  const root = getAudioRootUri();
  if (!root) return null;
  const safeReciter = sanitizeReciterId(reciterId);
  const s = String(surahNumber).padStart(3, '0');
  const a = String(ayahInSurah).padStart(3, '0');
  return `${root}/${safeReciter}/ayah/${s}${a}.mp3`;
};

const getSurahOfflineUri = (surahNumber: number, reciterId: string): string | null => {
  const root = getAudioRootUri();
  if (!root) return null;
  const safeReciter = sanitizeReciterId(reciterId);
  const s = String(surahNumber).padStart(3, '0');
  return `${root}/${safeReciter}/surah/${s}.mp3`;
};

const ensureParentDirectory = async (fileUri: string): Promise<void> => {
  const idx = fileUri.lastIndexOf('/');
  if (idx <= 0) return;
  const dir = fileUri.slice(0, idx);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
};

const fileHasContent = async (fileUri: string | null): Promise<boolean> => {
  if (!fileUri) return false;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    const size = Number((info as { size?: number }).size ?? 0);
    return !!info.exists && !info.isDirectory && size > 2;
  } catch {
    return false;
  }
};

const isFileAvailable = async (fileUri: string | null): Promise<boolean> => {
  if (!fileUri) return false;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    const size = Number((info as { size?: number }).size ?? 0);
    return !!info.exists && !info.isDirectory && size > 0;
  } catch {
    return false;
  }
};

const readJsonFile = async <T>(fileUri: string | null): Promise<T | null> => {
  if (!fileUri) return null;
  try {
    if (!(await fileHasContent(fileUri))) return null;
    const raw = await FileSystem.readAsStringAsync(fileUri);
    if (!raw?.trim()) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJsonFile = async (fileUri: string | null, payload: unknown): Promise<void> => {
  if (!fileUri) return;
  try {
    await ensureParentDirectory(fileUri);
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload));
  } catch {
    // cache write failure is non-fatal
  }
};

const downloadFirstAvailable = async (
  urls: string[],
  destinationFileUri: string
): Promise<boolean> => {
  const candidates = uniqueStrings(urls);
  if (!candidates.length) return false;
  await ensureParentDirectory(destinationFileUri);
  for (const url of candidates) {
    try {
      await FileSystem.deleteAsync(destinationFileUri, { idempotent: true });
    } catch {
      // try next url
    }
    try {
      await FileSystem.downloadAsync(url, destinationFileUri);
      if (await isFileAvailable(destinationFileUri)) return true;
    } catch {
      // try next url
    }
  }
  return false;
};

const getAyahDownloadCandidates = async (
  surahNumber: number,
  ayahInSurah: number,
  reciterId: string
): Promise<string[]> => {
  const reciter = RECITERS.find(r => r.id === reciterId);
  const primary = getAudioUrl(surahNumber, ayahInSurah, reciterId);
  const islamic = getIslamicNetworkAudioUrl(surahNumber, ayahInSurah, reciterId);
  let quranCom: string | null = null;
  try {
    const fallback = await getAyahAudioFallbackUrl(surahNumber, ayahInSurah, reciterId);
    if (fallback.url && !fallback.usedFallbackReciter) quranCom = fallback.url;
  } catch {
    // optional
  }

  if (reciter?.quranComRecitationId && quranCom) {
    return uniqueStrings([quranCom, primary, islamic]);
  }
  return uniqueStrings([primary, islamic, quranCom]);
};

const getSurahAyahCount = (surahNumber: number): number =>
  SURAH_LIST.find(s => s.number === surahNumber)?.ayahCount ?? 0;

const throwOfflineMissing = (message: string): never => {
  throw new Error(`${message} Data offline belum tersedia. Sambungkan internet lalu coba lagi.`);
};

const ensureLegacyOfflineCleanup = async (): Promise<void> => {
  if (LEGACY_CACHE_CLEANED) return;
  if (LEGACY_CLEANUP_PROMISE) {
    await LEGACY_CLEANUP_PROMISE;
    return;
  }

  LEGACY_CLEANUP_PROMISE = (async () => {
    try {
      await purgeLegacyQuranOfflineAsyncStorage();
      LEGACY_CACHE_CLEANED = true;
    } catch {
      // cleanup best-effort
    }
  })().finally(() => {
    LEGACY_CLEANUP_PROMISE = null;
  });

  await LEGACY_CLEANUP_PROMISE;
};

export type OfflineSurahBundleStatus = {
  surahReady: boolean;
  translitReady: boolean;
  wordByWordReady: boolean;
};

export type OfflineReciterAudioStatus = {
  reciterId: string;
  surahNumber: number;
  mode: 'ayah' | 'surah';
  available: number;
  total: number;
  percent: number;
  fullyAvailable: boolean;
  timingAvailable: boolean;
  capabilityOffline: ReciterSyncCapability;
};

export type OfflineAudioDownloadProgress = {
  current: number;
  total: number;
  label: string;
};

export type OfflineAudioDownloadResult = {
  available: number;
  total: number;
  failed: number;
  timingAvailable: boolean;
  capabilityOffline: ReciterSyncCapability;
};

export type OfflineBundleDownloadProgress = {
  step: 'surah' | 'translit' | 'wordByWord';
  index: number;
  total: number;
  label: string;
};

export type OfflineQuranAutoStatus = {
  running: boolean;
  completed: number;
  total: number;
  allReady: boolean;
  scriptsReady: ArabicScript[];
  updatedAt: string;
};

const isBundleReady = (status: OfflineSurahBundleStatus): boolean =>
  !!status.surahReady && !!status.translitReady && !!status.wordByWordReady;

const getDefaultAutoStatus = (): OfflineQuranAutoStatus => ({
  running: false,
  completed: 0,
  total: SURAH_LIST.length * AUTO_OFFLINE_SCRIPTS.length,
  allReady: false,
  scriptsReady: [],
  updatedAt: '',
});

export async function fetchSurahWithOffline(
  surahNumber: number,
  script: ArabicScript = DEFAULT_ARABIC_SCRIPT,
  language: Lang = 'id'
): Promise<SurahWithTranslation> {
  await ensureLegacyOfflineCleanup();
  const normalizedScript = normalizeArabicScript(script);
  const normalizedLanguage = normalizeOfflineLanguage(language);

  // ── 1. Cek cache file lokal (disimpan saat online pertama kali) ───────────
  const fileUri = getSurahDataUri(surahNumber, normalizedScript, normalizedLanguage);
  const cached = await readJsonFile<SurahWithTranslation>(fileUri);
  if (cached?.arabic?.ayahs?.length && cached?.translation?.ayahs?.length) return cached;

  // ── 2. Fetch dari API (butuh internet) ────────────────────────────────────
  try {
    const data = await fetchSurah(surahNumber, normalizedScript, normalizedLanguage);
    await writeJsonFile(fileUri, data);
    return data;
  } catch (e) {
    const fallback = await readJsonFile<SurahWithTranslation>(fileUri);
    if (fallback?.arabic?.ayahs?.length && fallback?.translation?.ayahs?.length) return fallback;
    if (normalizedLanguage === 'id' && normalizedScript === DEFAULT_ARABIC_SCRIPT) {
      const bundled = getBundledSurah(surahNumber);
      if (bundled?.arabic?.ayahs?.length && bundled?.translation?.ayahs?.length) {
        return bundled;
      }
    }
    return throwOfflineMissing(
      e instanceof Error && e.message ? `${e.message}.` : 'Gagal memuat surah.'
    );
  }
}

export async function fetchSurahTranslitWithOffline(surahNumber: number): Promise<string[]> {
  await ensureLegacyOfflineCleanup();

  // ── 1. Cek bundle bawaan app ──────────────────────────────────────────────
  const bundled = getBundledTranslit(surahNumber);
  if (Array.isArray(bundled) && bundled.length > 0) return bundled;

  // ── 2. Cek cache file lokal ───────────────────────────────────────────────
  const fileUri = getTranslitDataUri(surahNumber);
  const cached = await readJsonFile<string[]>(fileUri);
  if (Array.isArray(cached) && cached.length > 0) return cached;

  // ── 3. Fetch dari API ─────────────────────────────────────────────────────
  try {
    const data = await fetchSurahTranslit(surahNumber);
    await writeJsonFile(fileUri, data);
    return data;
  } catch (e) {
    const fallback = await readJsonFile<string[]>(fileUri);
    if (Array.isArray(fallback) && fallback.length > 0) return fallback;
    return throwOfflineMissing(
      e instanceof Error && e.message ? `${e.message}.` : 'Gagal memuat transliterasi.'
    );
  }
}

export async function fetchSurahWordByWordWithOffline(
  surahNumber: number,
  language: Lang = 'id'
): Promise<SurahWordByWord> {
  await ensureLegacyOfflineCleanup();
  const normalizedLanguage = normalizeOfflineLanguage(language);
  const fileUri = getWbwDataUri(surahNumber, normalizedLanguage);

  const cached = await readJsonFile<SurahWordByWord>(fileUri);
  if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) return cached;

  try {
    const data = await fetchSurahWordByWord(surahNumber, normalizedLanguage);
    await writeJsonFile(fileUri, data);
    return data;
  } catch (e) {
    const fallback = await readJsonFile<SurahWordByWord>(fileUri);
    if (fallback && typeof fallback === 'object' && Object.keys(fallback).length > 0) return fallback;
    return throwOfflineMissing(
      e instanceof Error && e.message ? `${e.message}.` : 'Gagal memuat arti per kata.'
    );
  }
}

export async function fetchReciterWordTimingBySurahWithOffline(
  reciterId: string,
  surahNumber: number
): Promise<Record<number, WordTimingSegment[]>> {
  await ensureLegacyOfflineCleanup();
  const fileUri = getTimingDataUri(reciterId, surahNumber);

  const cached = await readJsonFile<Record<number, WordTimingSegment[]>>(fileUri);
  if (cached && Object.keys(cached).length > 0) return cached;

  try {
    const timing = await fetchReciterWordTimingBySurah(reciterId, surahNumber);
    if (timing && Object.keys(timing).length > 0) {
      await writeJsonFile(fileUri, timing);
      return timing;
    }
    return {};
  } catch {
    const fallback = await readJsonFile<Record<number, WordTimingSegment[]>>(fileUri);
    return fallback ?? {};
  }
}

export async function getOfflineSurahBundleStatus(
  surahNumber: number,
  script: ArabicScript = DEFAULT_ARABIC_SCRIPT
): Promise<OfflineSurahBundleStatus> {
  const normalizedScript = normalizeArabicScript(script);
  return {
    surahReady: await fileHasContent(getSurahDataUri(surahNumber, normalizedScript, 'id')),
    translitReady: await fileHasContent(getTranslitDataUri(surahNumber)),
    wordByWordReady: await fileHasContent(getWbwDataUri(surahNumber, 'id')),
  };
}

export async function getOfflineQuranAutoStatus(): Promise<OfflineQuranAutoStatus> {
  const saved = await readJsonFile<OfflineQuranAutoStatus>(getAutoStatusUri());
  if (!saved) return getDefaultAutoStatus();
  return {
    ...getDefaultAutoStatus(),
    ...saved,
    scriptsReady: Array.isArray(saved.scriptsReady)
      ? saved.scriptsReady.filter((s): s is ArabicScript => AUTO_OFFLINE_SCRIPTS.includes(s as ArabicScript))
      : [],
  };
}

export async function ensureAllSurahContentOfflineAuto(
  onProgress?: (status: OfflineQuranAutoStatus) => void
): Promise<OfflineQuranAutoStatus> {
  await ensureLegacyOfflineCleanup();
  const current = await getOfflineQuranAutoStatus();
  if (current.allReady && !current.running) return current;
  if (AUTO_OFFLINE_SYNC_PROMISE) return AUTO_OFFLINE_SYNC_PROMISE;

  AUTO_OFFLINE_SYNC_PROMISE = (async () => {
    const total = SURAH_LIST.length * AUTO_OFFLINE_SCRIPTS.length;
    let completed = 0;
    const scriptReadyCounter = new Map<ArabicScript, number>();
    AUTO_OFFLINE_SCRIPTS.forEach(script => scriptReadyCounter.set(script, 0));

    const emit = async (running: boolean): Promise<OfflineQuranAutoStatus> => {
      const scriptsReady = AUTO_OFFLINE_SCRIPTS.filter(
        script => (scriptReadyCounter.get(script) ?? 0) >= SURAH_LIST.length
      );
      const payload: OfflineQuranAutoStatus = {
        running,
        completed,
        total,
        allReady: completed >= total,
        scriptsReady,
        updatedAt: new Date().toISOString(),
      };
      await writeJsonFile(getAutoStatusUri(), payload);
      onProgress?.(payload);
      return payload;
    };

    // NOTE: Do NOT emit(true) here with completed:0 — it would visually reset
    // the progress bar. The first real progress update fires from the loop below.

    for (const script of AUTO_OFFLINE_SCRIPTS) {
      let readyCountForScript = 0;
      for (const surah of SURAH_LIST) {
        let status = await getOfflineSurahBundleStatus(surah.number, script);
        if (!isBundleReady(status)) {
          try {
            await downloadSurahBundleForOffline(surah.number, script);
            status = await getOfflineSurahBundleStatus(surah.number, script);
          } catch {
            // continue; it will retry on next app launch
          }
        }
        if (isBundleReady(status)) {
          completed += 1;
          readyCountForScript += 1;
        }
        scriptReadyCounter.set(script, readyCountForScript);
        await emit(true);
      }
    }

    return emit(false);
  })().finally(() => {
    AUTO_OFFLINE_SYNC_PROMISE = null;
  });

  return AUTO_OFFLINE_SYNC_PROMISE;
}

export async function downloadSurahBundleForOffline(
  surahNumber: number,
  script: ArabicScript = DEFAULT_ARABIC_SCRIPT,
  onProgress?: (progress: OfflineBundleDownloadProgress) => void
): Promise<OfflineSurahBundleStatus> {
  const steps: Array<{ step: OfflineBundleDownloadProgress['step']; label: string }> = [
    { step: 'surah', label: 'Menyimpan teks Arab + terjemahan' },
    { step: 'translit', label: 'Menyimpan transliterasi' },
    { step: 'wordByWord', label: 'Menyimpan arti per kata' },
  ];
  onProgress?.({ step: 'surah', index: 0, total: steps.length, label: steps[0].label });
  await fetchSurahWithOffline(surahNumber, script);
  onProgress?.({ step: 'translit', index: 1, total: steps.length, label: steps[1].label });
  await fetchSurahTranslitWithOffline(surahNumber);
  onProgress?.({ step: 'wordByWord', index: 2, total: steps.length, label: steps[2].label });
  await fetchSurahWordByWordWithOffline(surahNumber);
  return getOfflineSurahBundleStatus(surahNumber, script);
}

export async function getOfflineAyahAudioUri(
  surahNumber: number,
  ayahInSurah: number,
  reciterId: string
): Promise<string | null> {
  const fileUri = getAyahOfflineUri(surahNumber, ayahInSurah, reciterId);
  if (!fileUri) return null;
  return (await isFileAvailable(fileUri)) ? fileUri : null;
}

export async function getOfflineSurahAudioUri(
  surahNumber: number,
  reciterId: string
): Promise<string | null> {
  const fileUri = getSurahOfflineUri(surahNumber, reciterId);
  if (!fileUri) return null;
  return (await isFileAvailable(fileUri)) ? fileUri : null;
}

export async function getReciterOfflineAudioStatus(
  reciterId: string,
  surahNumber: number
): Promise<OfflineReciterAudioStatus> {
  const reciter = RECITERS.find(r => r.id === reciterId);
  const isSurahOnly = !!reciter?.surahOnly;
  const includeBasmallah = surahNumber !== 1 && surahNumber !== 9;
  const ayahCount = getSurahAyahCount(surahNumber);
  const total = isSurahOnly ? 1 : ayahCount + (includeBasmallah ? 1 : 0);

  let available = 0;
  if (isSurahOnly) {
    const surahUri = getSurahOfflineUri(surahNumber, reciterId);
    if (await isFileAvailable(surahUri)) available = 1;
  } else {
    if (includeBasmallah) {
      const basmallahUri = getAyahOfflineUri(1, 1, reciterId);
      if (await isFileAvailable(basmallahUri)) available += 1;
    }
    for (let ayah = 1; ayah <= ayahCount; ayah++) {
      const ayahUri = getAyahOfflineUri(surahNumber, ayah, reciterId);
      if (await isFileAvailable(ayahUri)) available += 1;
    }
  }

  const timingAvailable = await fileHasContent(getTimingDataUri(reciterId, surahNumber));
  const capabilityOffline: ReciterSyncCapability = isSurahOnly
    ? 'audio'
    : timingAvailable
      ? 'full'
      : 'follow';
  const percent = total > 0 ? Math.round((available / total) * 100) : 0;
  return {
    reciterId,
    surahNumber,
    mode: isSurahOnly ? 'surah' : 'ayah',
    available,
    total,
    percent,
    fullyAvailable: total > 0 && available >= total,
    timingAvailable,
    capabilityOffline,
  };
}

export async function downloadReciterAudioOfflineForSurah(
  reciterId: string,
  surahNumber: number,
  onProgress?: (progress: OfflineAudioDownloadProgress) => void
): Promise<OfflineAudioDownloadResult> {
  const reciter = RECITERS.find(r => r.id === reciterId);
  if (!reciter) throw new Error('Qari tidak ditemukan.');
  if (!getAudioRootUri()) {
    throw new Error('Perangkat tidak mendukung penyimpanan file offline.');
  }

  let failed = 0;

  if (reciter.surahOnly) {
    const targetUri = getSurahOfflineUri(surahNumber, reciterId);
    if (!targetUri) throw new Error('Gagal menyiapkan direktori audio offline.');
    const surahUrl = getSurahAudioUrl(surahNumber, reciterId);
    if (!surahUrl) throw new Error('URL audio surah qari ini tidak tersedia.');
    onProgress?.({ current: 0, total: 1, label: 'Mengunduh audio surah penuh...' });
    const already = await isFileAvailable(targetUri);
    if (!already) {
      const ok = await downloadFirstAvailable([surahUrl], targetUri);
      if (!ok) failed += 1;
    }
    const status = await getReciterOfflineAudioStatus(reciterId, surahNumber);
    return {
      available: status.available,
      total: status.total,
      failed,
      timingAvailable: status.timingAvailable,
      capabilityOffline: status.capabilityOffline,
    };
  }

  const includeBasmallah = surahNumber !== 1 && surahNumber !== 9;
  const ayahCount = getSurahAyahCount(surahNumber);
  const jobs: Array<{ surah: number; ayah: number; label: string }> = [];
  if (includeBasmallah) jobs.push({ surah: 1, ayah: 1, label: 'Basmalah (1:1)' });
  for (let ayah = 1; ayah <= ayahCount; ayah++) {
    jobs.push({ surah: surahNumber, ayah, label: `Ayat ${ayah}` });
  }

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    onProgress?.({
      current: i,
      total: jobs.length,
      label: `Mengunduh ${job.label}`,
    });
    const fileUri = getAyahOfflineUri(job.surah, job.ayah, reciterId);
    if (!fileUri) {
      failed += 1;
      continue;
    }
    const exists = await isFileAvailable(fileUri);
    if (exists) continue;
    const urls = await getAyahDownloadCandidates(job.surah, job.ayah, reciterId);
    const ok = await downloadFirstAvailable(urls, fileUri);
    if (!ok) failed += 1;
  }

  await fetchReciterWordTimingBySurahWithOffline(reciterId, surahNumber);
  const status = await getReciterOfflineAudioStatus(reciterId, surahNumber);
  return {
    available: status.available,
    total: status.total,
    failed,
    timingAvailable: status.timingAvailable,
    capabilityOffline: status.capabilityOffline,
  };
}

export async function removeReciterOfflineAudioForSurah(
  reciterId: string,
  surahNumber: number
): Promise<void> {
  const reciter = RECITERS.find(r => r.id === reciterId);
  if (!reciter) return;

  if (reciter.surahOnly) {
    const surahUri = getSurahOfflineUri(surahNumber, reciterId);
    if (surahUri) await FileSystem.deleteAsync(surahUri, { idempotent: true });
    return;
  }

  const ayahCount = getSurahAyahCount(surahNumber);
  for (let ayah = 1; ayah <= ayahCount; ayah++) {
    const ayahUri = getAyahOfflineUri(surahNumber, ayah, reciterId);
    if (!ayahUri) continue;
    await FileSystem.deleteAsync(ayahUri, { idempotent: true });
  }
}

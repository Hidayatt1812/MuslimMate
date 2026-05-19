// Quran Foundation Content/Search API via the MuslimMate backend proxy.
// Keep QF_CLIENT_SECRET on the proxy only, never in the Expo/mobile bundle.

import type { Lang } from '@/constants/i18n';

const QF_PROXY_BASE_URL = (process.env.EXPO_PUBLIC_QF_PROXY_BASE_URL ?? '').replace(/\/+$/, '');
const QURAN_COM_API_URL = 'https://api.quran.com/api/v4';
const QURAN_COM_AUDIO_BASE_URL = 'https://verses.quran.com';
const QURAN_COM_SEARCH_URL = `${QURAN_COM_API_URL}/search`;

const QF_TRANSLATION_IDS: Record<Lang, string> = {
  id: '33',
  en: '20',
};

const SURAH_VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53,
  89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18,
  12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17,
  19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4,
  5, 6,
];

export type QFSearchResult = {
  verseKey: string;
  title: string;
  arabic?: string;
};

export type QFVerseResult = {
  verseKey: string;
  arabic: string;
  translation: string;
};

export type QFTranslationComparison = {
  id: string;
  name: string;
  language: string;
  text: string;
};

export type QFAudioReciter = {
  id: number;
  name: string;
  style: string;
};

const TRANSLATION_COMPARE_RESOURCES: Record<Lang, { id: string; name: string; language: string }[]> = {
  id: [
    { id: '33', name: 'Kemenag RI', language: 'Indonesia' },
    { id: '134', name: 'King Fahad Quran Complex', language: 'Indonesia' },
    { id: '141', name: 'The Sabiq Company', language: 'Indonesia' },
    { id: '20', name: 'Saheeh International', language: 'English' },
  ],
  en: [
    { id: '20', name: 'Saheeh International', language: 'English' },
    { id: '85', name: 'M.A.S. Abdel Haleem', language: 'English' },
    { id: '22', name: 'A. Yusuf Ali', language: 'English' },
    { id: '33', name: 'Indonesian Islamic Affairs Ministry', language: 'Indonesian' },
  ],
};

const normalizeLanguage = (language?: string | null): Lang =>
  language === 'en' ? 'en' : 'id';

const getTranslationId = (language?: string | null): string =>
  QF_TRANSLATION_IDS[normalizeLanguage(language)];

function assertProxyConfigured(): void {
  if (!QF_PROXY_BASE_URL) {
    throw new Error('Quran Foundation proxy is not configured. Set EXPO_PUBLIC_QF_PROXY_BASE_URL.');
  }
}

async function proxyFetch(path: string, params?: Record<string, string | number | boolean | undefined>) {
  assertProxyConfigured();
  const url = new URL(`${QF_PROXY_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }

  const res = await fetch(url.toString());
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    const message = stripHtml(data?.error ?? data?.message ?? text);
    throw new Error(`QF proxy ${res.status}: ${path}${message ? ` - ${message}` : ''}`);
  }
  return data;
}

function stripHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const isVerseKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{1,3}:\d{1,3}$/.test(value);

const firstVerseKeyForChapter = (value: unknown): string | null => {
  const chapter = Number(value);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > SURAH_VERSE_COUNTS.length) return null;
  return `${chapter}:1`;
};

const uniqueSearchResults = (items: QFSearchResult[]): QFSearchResult[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.verseKey)) return false;
    seen.add(item.verseKey);
    return true;
  });
};

function normalizeQFSearchResults(data: any): QFSearchResult[] {
  const navigation = Array.isArray(data?.result?.navigation) ? data.result.navigation : [];
  const verses = Array.isArray(data?.result?.verses) ? data.result.verses : [];
  const items = [...verses, ...navigation];

  return uniqueSearchResults(
    items
      .map((item: any): QFSearchResult | null => {
        const type = String(item?.result_type ?? item?.resultType ?? '').toLowerCase();
        const key = isVerseKey(item?.key)
          ? item.key
          : type === 'surah'
            ? firstVerseKeyForChapter(item?.key)
            : null;

        if (!key) return null;
        return {
          verseKey: key,
          title: stripHtml(item?.name),
          arabic: stripHtml(item?.arabic),
        };
      })
      .filter((item: QFSearchResult | null): item is QFSearchResult => Boolean(item))
  );
}

function normalizeQuranComSearchResults(data: any): QFSearchResult[] {
  const rows = Array.isArray(data?.search?.results) ? data.search.results : [];
  return uniqueSearchResults(
    rows
      .map((item: any): QFSearchResult | null => {
        const key = isVerseKey(item?.verse_key) ? item.verse_key : null;
        if (!key) return null;
        const translation = Array.isArray(item?.translations) ? item.translations[0]?.text : '';
        return {
          verseKey: key,
          title: stripHtml(translation || item?.highlighted || item?.text),
          arabic: stripHtml(item?.text),
        };
      })
      .filter((item: QFSearchResult | null): item is QFSearchResult => Boolean(item))
  );
}

async function fetchQuranComSearchFallback(
  query: string,
  language: Lang,
  limit = 12
): Promise<QFSearchResult[]> {
  const url = new URL(QURAN_COM_SEARCH_URL);
  url.searchParams.set('q', query.slice(0, 250));
  url.searchParams.set('size', String(limit));
  url.searchParams.set('page', '0');
  url.searchParams.set('language', normalizeLanguage(language));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Quran.com search ${res.status}`);
  return normalizeQuranComSearchResults(await res.json());
}

async function fetchQuranComVerseByKeyFallback(
  verseKey: string,
  language: Lang
): Promise<QFVerseResult> {
  const url = new URL(`${QURAN_COM_API_URL}/verses/by_key/${verseKey}`);
  url.searchParams.set('translations', getTranslationId(language));
  url.searchParams.set('fields', 'text_uthmani,verse_key');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Quran.com verse ${res.status}`);
  const data = await res.json();
  const verse = data?.verse;
  return {
    verseKey,
    arabic: String(verse?.text_uthmani ?? ''),
    translation: stripHtml(verse?.translations?.[0]?.text),
  };
}

function normalizeTranslationComparisons(
  verse: any,
  resources: { id: string; name: string; language: string }[]
): QFTranslationComparison[] {
  const rows = Array.isArray(verse?.translations) ? verse.translations : [];
  return resources
    .map(resource => {
      const row = rows.find((item: any) => String(item?.resource_id ?? item?.id ?? '') === resource.id);
      const text = stripHtml(row?.text);
      if (!text) return null;
      return {
        ...resource,
        name: stripHtml(row?.resource_name) || resource.name,
        text,
      };
    })
    .filter((item): item is QFTranslationComparison => Boolean(item));
}

async function fetchQuranComVerseTranslationsFallback(
  verseKey: string,
  resources: { id: string; name: string; language: string }[]
): Promise<QFTranslationComparison[]> {
  const url = new URL(`${QURAN_COM_API_URL}/verses/by_key/${verseKey}`);
  url.searchParams.set('translations', resources.map(item => item.id).join(','));
  url.searchParams.set('fields', 'verse_key');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Quran.com translations ${res.status}`);
  const data = await res.json();
  return normalizeTranslationComparisons(data?.verse, resources);
}

function normalizeQuranComAudioUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${QURAN_COM_AUDIO_BASE_URL}/${raw.replace(/^\/+/, '')}`;
}

function verseKeyFromGlobalAyah(globalAyahNumber: number): { surahNum: number; verseNum: number; verseKey: string } {
  let cumulative = 0;
  for (let i = 0; i < SURAH_VERSE_COUNTS.length; i++) {
    const count = SURAH_VERSE_COUNTS[i];
    if (globalAyahNumber <= cumulative + count) {
      const surahNum = i + 1;
      const verseNum = globalAyahNumber - cumulative;
      return { surahNum, verseNum, verseKey: `${surahNum}:${verseNum}` };
    }
    cumulative += count;
  }
  return { surahNum: 1, verseNum: 1, verseKey: '1:1' };
}

export async function fetchQFChapters(language = 'id') {
  return proxyFetch('/content/chapters', { language });
}

export async function fetchQFVersesByChapter(
  chapterNumber: number,
  page = 1,
  language: Lang = 'id'
) {
  return proxyFetch(`/content/verses/by_chapter/${chapterNumber}`, {
    words: 'true',
    translations: getTranslationId(language),
    word_fields: 'text_uthmani,translation_text',
    fields: 'text_uthmani,verse_key,verse_number',
    per_page: 10,
    page,
  });
}

export async function fetchQFVerseByKey(verseKey: string, language: Lang = 'id') {
  return proxyFetch(`/content/verses/by_key/${verseKey}`, {
    words: 'true',
    translations: getTranslationId(language),
    fields: 'text_uthmani,verse_key',
  });
}

export async function fetchQFAudioRecitations(recitationId = 7, chapterNumber = 1) {
  return proxyFetch(`/content/recitations/${recitationId}/by_chapter/${chapterNumber}`);
}

export async function fetchQFTafsir(chapterNumber: number, tafsirId = 169) {
  return proxyFetch(`/content/tafsirs/${tafsirId}/by_chapter/${chapterNumber}`);
}

export async function fetchQFSearch(
  query: string,
  language: Lang = 'id',
  mode: 'quick' | 'advanced' = 'advanced'
): Promise<QFSearchResult[]> {
  const cleaned = query.trim();
  if (!cleaned) return [];
  const translationId = getTranslationId(language);
  let qfError: unknown;

  try {
    const data = await proxyFetch('/search', {
      mode,
      query: cleaned.slice(0, 250),
      language: normalizeLanguage(language),
      page: 1,
      size: 12,
      get_text: '1',
      highlight: '0',
      translation_ids: translationId,
      filter_translations: translationId,
      indexes: mode === 'quick' ? 'quran,translations' : undefined,
      versesResultsNumber: 12,
      navigationalResultsNumber: 4,
    });

    const qfResults = normalizeQFSearchResults(data);
    if (qfResults.length > 0) return qfResults;
  } catch (error) {
    qfError = error;
  }

  try {
    return await fetchQuranComSearchFallback(cleaned, normalizeLanguage(language), 12);
  } catch {
    if (qfError) throw qfError;
    return [];
  }
}

export async function fetchQFDailyVerse(): Promise<{
  arabic: string;
  translation: string;
  reference: string;
}>;
export async function fetchQFDailyVerse(language: Lang): Promise<{
  arabic: string;
  translation: string;
  reference: string;
}>;
export async function fetchQFDailyVerse(language: Lang = 'id'): Promise<{
  arabic: string;
  translation: string;
  reference: string;
}> {
  const lang = normalizeLanguage(language);
  const total = 6236;
  const seed = new Date().getDate() + new Date().getMonth() * 31;
  const ayahNum = (seed % total) + 1;
  const { surahNum, verseKey } = verseKeyFromGlobalAyah(ayahNum);

  const [verseData] = await Promise.all([
    proxyFetch(`/content/verses/by_key/${verseKey}`, {
      translations: getTranslationId(lang),
      fields: 'text_uthmani,verse_key',
    }),
    fetchQFAudioRecitations(7, surahNum).catch(() => null),
    fetchQFTafsirByAyah(verseKey, 169, lang).catch(() => ''),
  ]);

  const verse = verseData?.verse;
  const arabic = String(verse?.text_uthmani ?? '');
  const translation = stripHtml(verse?.translations?.[0]?.text);
  const surahNames: Record<number, string> = {
    1: 'Al-Fatihah',
    2: 'Al-Baqarah',
    3: 'Ali Imran',
    4: 'An-Nisa',
    36: 'Yasin',
    55: 'Ar-Rahman',
    67: 'Al-Mulk',
    112: 'Al-Ikhlas',
  };
  const surahName = surahNames[surahNum] ?? `Surah ${surahNum}`;

  return {
    arabic,
    translation,
    reference: `QS. ${surahName} [${verseKey}]`,
  };
}

export async function fetchQFTafsirByAyah(
  verseKey: string,
  tafsirId = 169,
  language: Lang = 'id'
): Promise<string> {
  try {
    const data = await proxyFetch(`/content/tafsirs/${tafsirId}/by_ayah/${verseKey}`, {
      language: normalizeLanguage(language),
    });
    return stripHtml(data?.tafsir?.text);
  } catch {
    return '';
  }
}

export async function fetchQFVersesByKeys(
  verseKeys: string[],
  language: Lang = 'id'
): Promise<QFVerseResult[]> {
  const translationId = getTranslationId(language);
  const results = await Promise.allSettled(
    verseKeys.map(async key => {
      try {
        const data = await proxyFetch(`/content/verses/by_key/${key}`, {
          translations: translationId,
          fields: 'text_uthmani,verse_key',
        });
        const verse = data?.verse;
        const result = {
          verseKey: key,
          arabic: String(verse?.text_uthmani ?? ''),
          translation: stripHtml(verse?.translations?.[0]?.text),
        };
        if (result.arabic) return result;
      } catch {
        // Quran Foundation prelive can be sparse; keep the UX useful with Quran.com content.
      }
      return fetchQuranComVerseByKeyFallback(key, normalizeLanguage(language));
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<QFVerseResult> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(v => v.arabic);
}

export async function fetchQFVerseTranslationComparisons(
  verseKey: string,
  language: Lang = 'id'
): Promise<QFTranslationComparison[]> {
  const lang = normalizeLanguage(language);
  const resources = TRANSLATION_COMPARE_RESOURCES[lang];
  let qfResults: QFTranslationComparison[] = [];

  try {
    const data = await proxyFetch(`/content/verses/by_key/${verseKey}`, {
      translations: resources.map(item => item.id).join(','),
      fields: 'verse_key',
    });
    qfResults = normalizeTranslationComparisons(data?.verse, resources);
    if (qfResults.length >= resources.length) return qfResults;
  } catch {
    qfResults = [];
  }

  try {
    const fallbackResults = await fetchQuranComVerseTranslationsFallback(verseKey, resources);
    return fallbackResults.length ? fallbackResults : qfResults;
  } catch {
    return qfResults;
  }
}

export async function fetchQFAudioReciters(language: Lang = 'id'): Promise<QFAudioReciter[]> {
  const url = new URL(`${QURAN_COM_API_URL}/resources/recitations`);
  url.searchParams.set('language', normalizeLanguage(language));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Quran.com recitations ${res.status}`);
  const data = await res.json();
  const rows = Array.isArray(data?.recitations) ? data.recitations : [];
  return rows
    .map((item: any): QFAudioReciter | null => {
      const id = Number(item?.id);
      const name = stripHtml(item?.reciter_name ?? item?.name);
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return {
        id,
        name,
        style: stripHtml(item?.style),
      };
    })
    .filter((item: QFAudioReciter | null): item is QFAudioReciter => Boolean(item));
}

export async function fetchQFAyahAudioUrl(
  verseKey: string,
  recitationId = 7
): Promise<string> {
  const url = new URL(`${QURAN_COM_API_URL}/recitations/${recitationId}/by_ayah/${verseKey}`);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Quran.com ayah audio ${res.status}`);
  const data = await res.json();
  const rawUrl = data?.audio_files?.[0]?.url ?? data?.audio_file?.url;
  return normalizeQuranComAudioUrl(rawUrl);
}

export function isQFConfigured(): boolean {
  return Boolean(QF_PROXY_BASE_URL);
}

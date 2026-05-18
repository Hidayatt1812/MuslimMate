// Quran Foundation Content API v4 — Production (full Quran data)
// Docs: https://api-docs.quran.foundation/docs/quickstart/

import type { Lang } from '@/constants/i18n';

const QF_BASE = 'https://apis.quran.foundation';
const QF_TOKEN_URL = 'https://oauth2.quran.foundation/oauth2/token';
const QF_CLIENT_ID = process.env.EXPO_PUBLIC_QF_PROD_CLIENT_ID ?? '';
const QF_CLIENT_SECRET = process.env.EXPO_PUBLIC_QF_PROD_CLIENT_SECRET ?? '';

let _token: { value: string; expiresAt: number } | null = null;

const QF_TRANSLATION_IDS: Record<Lang, string> = {
  id: '33',
  en: '20',
};

const normalizeLanguage = (language?: string | null): Lang =>
  language === 'en' ? 'en' : 'id';

const getTranslationId = (language?: string | null): string =>
  QF_TRANSLATION_IDS[normalizeLanguage(language)];

async function getContentToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt - 30_000) return _token.value;

  const credentials = btoa(`${QF_CLIENT_ID}:${QF_CLIENT_SECRET}`);
  const res = await fetch(QF_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=content',
  });
  if (!res.ok) throw new Error(`QF token error: ${res.status}`);
  const data = await res.json();
  _token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return _token.value;
}

async function apiFetch(path: string, params?: Record<string, string>) {
  const token = await getContentToken();
  const url = new URL(`${QF_BASE}/content/api/v4${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { 'x-auth-token': token, 'x-client-id': QF_CLIENT_ID },
  });
  if (!res.ok) throw new Error(`QF Content API ${res.status}: ${path}`);
  return res.json();
}

export async function fetchQFChapters(language = 'id') {
  return apiFetch('/chapters', { language });
}

export async function fetchQFVersesByChapter(
  chapterNumber: number,
  page = 1,
  language: Lang = 'id'
) {
  return apiFetch(`/verses/by_chapter/${chapterNumber}`, {
    words: 'true',
    translations: getTranslationId(language),
    word_fields: 'text_uthmani,translation_text',
    fields: 'text_uthmani,verse_key,verse_number',
    per_page: '10',
    page: String(page),
  });
}

export async function fetchQFVerseByKey(verseKey: string, language: Lang = 'id') {
  return apiFetch(`/verses/by_key/${verseKey}`, {
    words: 'true',
    translations: getTranslationId(language),
    fields: 'text_uthmani,verse_key',
  });
}

export async function fetchQFAudioRecitations(recitationId = 7) {
  return apiFetch(`/recitations/${recitationId}/by_chapter/1`);
}

export async function fetchQFTafsir(chapterNumber: number, tafsirId = 169) {
  return apiFetch(`/tafsirs/${tafsirId}/by_chapter/${chapterNumber}`);
}

// Returns same shape as quranService.fetchDailyVerse — drop-in replacement
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

  // Convert global ayah number to surah:ayah key
  const surahBoundaries = [
    7,20,13,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
    112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,
    89,59,37,35,38,29,18,45,60,25,100,35,112,78,119,64,77,227,93,88,69,60,
    34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,25,100,
    35,112,10,23,13,11,4,8,3,5,4,7,3,6,3,5,4,5,6,3,7,3,11,5,7,4,7,7,3,5,
    3,4,2,3,3,3,3,2,2,3,1,1,5,4,4,3,2,1,1,1,1,1,
  ];

  let cumulative = 0;
  let surahNum = 1;
  let verseNum = ayahNum;
  for (let i = 0; i < 114; i++) {
    if (ayahNum <= cumulative + surahBoundaries[i]) {
      surahNum = i + 1;
      verseNum = ayahNum - cumulative;
      break;
    }
    cumulative += surahBoundaries[i];
  }

  const verseKey = `${surahNum}:${verseNum}`;
  const data = await apiFetch(`/verses/by_key/${verseKey}`, {
    translations: getTranslationId(lang),
    fields: 'text_uthmani,verse_key',
  });

  const verse = data?.verse;
  const arabic = verse?.text_uthmani ?? '';
  const translation = verse?.translations?.[0]?.text?.replace(/<[^>]+>/g, '') ?? '';
  const surahNames: Record<number, string> = {
    1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali Imran', 4: 'An-Nisa',
    36: 'Yasin', 55: 'Ar-Rahman', 67: 'Al-Mulk', 112: 'Al-Ikhlas',
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
    const data = await apiFetch(`/tafsirs/${tafsirId}/by_ayah/${verseKey}`, { language: normalizeLanguage(language) });
    const raw: string = data?.tafsir?.text ?? '';
    return raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s{2,}/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

export async function fetchQFVersesByKeys(
  verseKeys: string[],
  language: Lang = 'id'
): Promise<Array<{ verseKey: string; arabic: string; translation: string }>> {
  const translationId = getTranslationId(language);
  const results = await Promise.allSettled(
    verseKeys.map(async key => {
      const data = await apiFetch(`/verses/by_key/${key}`, {
        translations: translationId,
        fields: 'text_uthmani,verse_key',
      });
      const verse = data?.verse;
      return {
        verseKey: key,
        arabic: String(verse?.text_uthmani ?? ''),
        translation: String(verse?.translations?.[0]?.text ?? '').replace(/<[^>]+>/g, '').trim(),
      };
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<{ verseKey: string; arabic: string; translation: string }> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(v => v.arabic);
}

export function isQFConfigured(): boolean {
  return Boolean(QF_CLIENT_ID && QF_CLIENT_SECRET);
}

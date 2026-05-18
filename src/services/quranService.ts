import { SURAH_LIST } from '@/constants/surah';
import type { Lang } from '@/constants/i18n';

// Al-Quran Cloud API: https://api.alquran.cloud
const BASE_URL = 'https://api.alquran.cloud/v1';
const QURAN_COM_API = 'https://api.quran.com/api/v4';
const QURANENC_API = 'https://quranenc.com/api/v1';
const QURANENC_INDONESIAN_TRANSLATION_KEY = 'indonesian_affairs';
const SURAH_CACHE = new Map<string, Promise<SurahWithTranslation>>();
const CHAPTER_NAME_CACHE = new Map<string, Promise<Record<number, string>>>();
const TRANSLIT_CACHE = new Map<number, Promise<string[]>>();
const WBW_CACHE = new Map<string, Promise<SurahWordByWord>>();
const TAFSIR_CACHE = new Map<string, Promise<UlamaTafsirInsight[]>>();
const SURAH_INFO_CACHE = new Map<string, Promise<SurahChapterInfo>>();
const TAFSIR_FULL_CACHE = new Map<string, Promise<UlamaTafsirFullInsight | null>>();
const TRANSLATION_CACHE = new Map<string, Promise<string>>();

// EveryAyah CDN — reliable, has Sudais and all major reciters
// URL format: https://everyayah.com/data/{reciterId}/{surah3d}{ayah3d}.mp3
const AUDIO_CDN = 'https://everyayah.com/data';
const QURAN_COM_AUDIO_CDN = 'https://verses.quran.com';
// Islamic Network CDN (alquran.cloud) — backup per-ayah CDN
// URL format: https://cdn.islamic.network/quran/audio/128/{editionId}/{globalAyahNumber}.mp3
const ISLAMIC_NETWORK_CDN = 'https://cdn.islamic.network/quran/audio/128';
const QURAN_COM_RECITATION_PREFIX_CACHE = new Map<number, Promise<string | null>>();
const RECITER_WORD_TIMING_CACHE = new Map<string, Promise<Record<number, WordTimingSegment[]>>>();
const QURAN_COM_RECITATION_PREFIX_BY_ID: Record<number, string> = {
  1: 'AbdulBaset/Mujawwad/mp3/',
  3: 'Sudais/mp3/',
  7: 'Alafasy/mp3/',
  8: 'Minshawi/Mujawwad/mp3/',
  10: 'Shuraym/mp3/',
};

// ─── Script Types ────────────────────────────────────────────────────────────

/** Varian tulisan Arab yang tersedia dari Quran.com Content API */
export type ArabicScript =
  | 'uthmani'
  | 'indopak'
  | 'imlaei';

export const DEFAULT_ARABIC_SCRIPT: ArabicScript = 'uthmani';

const ARABIC_SCRIPT_SET = new Set<ArabicScript>([
  'uthmani',
  'indopak',
  'imlaei',
]);

// Migrasi otomatis dari nilai lama ke 3 pilihan baru
const LEGACY_SCRIPT_MAP: Record<string, ArabicScript> = {
  'quran-uthmani':   'uthmani',
  'uthmani_simple':  'uthmani',
  'uthmani_tajweed': 'uthmani',
  'indopak_nastaleeq': 'indopak',
  'quran-simple':    'imlaei',
  'imlaei_simple':   'imlaei',
  'qpc_hafs':        'uthmani',
  'qpc_nastaleeq':   'indopak',
};

export function normalizeArabicScript(input?: string | null): ArabicScript {
  const value = String(input ?? '').trim();
  if (ARABIC_SCRIPT_SET.has(value as ArabicScript)) return value as ArabicScript;
  if (value in LEGACY_SCRIPT_MAP) return LEGACY_SCRIPT_MAP[value];
  return DEFAULT_ARABIC_SCRIPT;
}

export const ARABIC_SCRIPTS: { id: ArabicScript; name: string; desc: string; sample: string }[] = [
  {
    id: 'uthmani',
    name: 'Utsmani',
    desc: 'Rasm Utsmani standar (tanda baca lengkap)',
    sample: '\u0628\u0650\u0633\u06e1\u0645\u0650 \u0671\u0644\u0644\u064e\u0651\u0647\u0650',
  },
  {
    id: 'indopak',
    name: 'Indopak',
    desc: 'Gaya mushaf Asia Selatan (India/Pakistan)',
    sample: '\u0628\u0650\u0633\u06e1\u0645\u0650 \u0627\u0644\u0644\u0651\u0670\u0647\u0650',
  },
  {
    id: 'imlaei',
    name: 'Imlaei',
    desc: 'Ejaan Arab modern, mudah dibaca',
    sample: '\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650',
  },
];

// ─── Tajwid ──────────────────────────────────────────────────────────────────

export interface TajweedSpan {
  text: string;
  rule: string | null; // null = teks biasa tanpa aturan tajwid
}

/**
 * Warna per aturan tajwid — standar warna mushaf tajwid.
 * Key sesuai class yang dikembalikan API quran-tajweed alquran.cloud.
 */
export const TAJWEED_COLORS: Record<string, string> = {
  // Abu-abu — Hamzah & Lam tidak dibaca penuh
  ham_wasl:         '#909090',
  laam_shamsiyah:   '#909090',
  // Biru — Mad (pemanjangan)
  madda_normal:     '#2196F3',   // Mad Tabi'i (2 harakat)
  madda_permissible:'#00ACC1',   // Mad Ja'iz Munfashil (2-5 harakat)
  madda_necessary:  '#0D47A1',   // Mad Lazim (6 harakat)
  madda_obligatory: '#0D47A1',   // Mad Wajib Muttashil (4-5 harakat)
  madda_prolonged:  '#0D47A1',
  // Oranye — Qalqalah (memantul)
  qalaqah:          '#E65100',
  // Hijau — Idgham (melebur)
  idgham_with_ghunnah: '#2E7D32',
  idgham_wo_ghunnah:   '#558B2F',
  idgham_shafawi:      '#388E3C',
  // Ungu — Ikhfa' (samar)
  ikhafa:           '#7B1FA2',
  ikhafa_shafawi:   '#6A1B9A',
  // Merah — Iqlab (berubah menjadi mim)
  iqlab:            '#C62828',
  // Oranye tua — Ghunnah (dengung)
  ghunnah:          '#E64A19',
};

export const TAJWEED_LABELS: Record<string, string> = {
  ham_wasl:            'Hamzah Washal',
  laam_shamsiyah:      'Lam Syamsiyah',
  madda_normal:        "Mad Tabi'i",
  madda_permissible:   "Mad Ja'iz",
  madda_necessary:     'Mad Lazim',
  madda_obligatory:    'Mad Wajib',
  madda_prolonged:     'Mad Lazim',
  qalaqah:             'Qalqalah',
  ikhafa:              "Ikhfa'",
  ikhafa_shafawi:      "Ikhfa' Syafawi",
  idgham_shafawi:      'Idgham Syafawi',
  idgham_with_ghunnah: 'Idgham + Ghunnah',
  idgham_wo_ghunnah:   'Idgham - Ghunnah',
  iqlab:               'Iqlab',
  ghunnah:             'Ghunnah',
};

/**
 * Panduan lengkap per aturan tajwid — cara membaca, contoh huruf, tips.
 * Digunakan pada panel interaktif saat user mengetuk teks berwarna.
 */
export const TAJWEED_GUIDE: Record<string, {
  label: string;
  color: string;
  category: string;
  how: string;
  steps: string[];
  example: string;
  tip: string;
  youtube: string;
}> = {
  ham_wasl: {
    label: 'Hamzah Washal',
    color: '#909090',
    category: 'Hamzah',
    how: 'Hamzah ini tidak dibaca jika disambung dengan kata sebelumnya.',
    steps: [
      'Jika ada di awal kalimat (setelah waqaf), baca hamzah ini.',
      'Jika disambung (washal) dengan kata sebelumnya, hamzah tidak dibaca — langsung lanjut ke huruf berikutnya.',
    ],
    example: 'ٱ  →  dibaca "A" di awal, hilang di tengah kalimat',
    tip: 'Tanda: terdapat garis kecil di atas alif (ٱ)',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+hamzah+washal+cara+baca',
  },
  laam_shamsiyah: {
    label: 'Lam Syamsiyah',
    color: '#909090',
    category: 'Lam',
    how: 'Huruf "Lam" pada kata "Al" (ال) tidak dibaca, langsung masuk ke huruf berikutnya yang bertasydid.',
    steps: [
      'Ketika "ال" (Al) bertemu 14 huruf syamsiyah: ت ث د ذ ر ز س ش ص ض ط ظ ل ن',
      'Lam tidak dibunyikan. Huruf berikutnya dibaca dobel (tasydid).',
    ],
    example: 'الشَّمْسُ → dibaca "Asy-Syamsu" (bukan "Al-Syamsu")',
    tip: 'Kebalikannya: Lam Qamariyah (lam tetap dibaca) — berlaku untuk huruf selain 14 di atas.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+lam+syamsiyah+qamariyah',
  },
  madda_normal: {
    label: "Mad Tabi'i (Mad Asli)",
    color: '#2196F3',
    category: 'Mad (Pemanjangan)',
    how: 'Panjang bacaan 2 harakat (setara 1 alif / 1 ketukan).',
    steps: [
      'Terjadi pada: Alif (ا) setelah fathah, Waw sukun (وْ) setelah dhammah, Ya sukun (يْ) setelah kasrah.',
      'Baca huruf mad selama 2 harakat — seperti menghitung "satu-dua" dalam hati.',
    ],
    example: 'قَالَ (qaa-la) · يَقُولُ (ya-quu-lu) · قِيلَ (qii-la)',
    tip: 'Mad Tabi\'i adalah dasar semua mad. Jika tidak ada sebab lain, panjang 2 harakat.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+mad+tabi%27i+cara+baca',
  },
  madda_permissible: {
    label: "Mad Ja'iz Munfashil",
    color: '#00ACC1',
    category: 'Mad (Pemanjangan)',
    how: 'Panjang bacaan 2, 4, atau 5 harakat — boleh pilih salah satu, tapi harus konsisten.',
    steps: [
      'Terjadi ketika huruf mad bertemu hamzah (ء/أ/إ) di KATA BERBEDA.',
      'Hafs \'an Ashim (standar Indonesia): baca 4-5 harakat.',
      'Satu pilihan panjang harus dipertahankan sepanjang tilawah.',
    ],
    example: 'إِنَّا أَعْطَيْنَاكَ → mad pada "إِنَّا" sebelum "أَعْطَيْنَاكَ"',
    tip: 'Kata kunci: "Munfashil" = terpisah. Mad dan hamzah ada di kata yang berbeda.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+mad+jaiz+munfashil',
  },
  madda_necessary: {
    label: 'Mad Lazim',
    color: '#0D47A1',
    category: 'Mad (Pemanjangan)',
    how: 'Panjang bacaan WAJIB 6 harakat. Tidak boleh kurang.',
    steps: [
      'Terjadi ketika mad bertemu sukun atau tasydid.',
      'Baca selama 6 harakat — seperti menghitung "satu-dua-tiga-empat-lima-enam".',
    ],
    example: 'وَلَا الضَّالِّينَ → pada "الضَّالِّينَ" (lam bertasydid)',
    tip: '"Lazim" artinya wajib. 6 harakat adalah panjang terpanjang dalam Al-Qur\'an.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+mad+lazim+6+harakat',
  },
  madda_obligatory: {
    label: 'Mad Wajib Muttashil',
    color: '#0D47A1',
    category: 'Mad (Pemanjangan)',
    how: 'Panjang bacaan 4-5 harakat, WAJIB dipanjangkan. Tidak boleh hanya 2 harakat.',
    steps: [
      'Terjadi ketika huruf mad bertemu hamzah (ء) dalam SATU KATA.',
      'Hafs: baca 4 atau 5 harakat (lebih umum 4).',
    ],
    example: 'جَاءَ · سَاءَ · سُوءَ · جِيءَ',
    tip: '"Muttashil" artinya bersambung. Mad dan hamzah ada dalam kata yang sama.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+mad+wajib+muttashil',
  },
  madda_prolonged: {
    label: 'Mad Lazim',
    color: '#0D47A1',
    category: 'Mad (Pemanjangan)',
    how: 'Panjang bacaan WAJIB 6 harakat.',
    steps: ['Sama dengan Mad Lazim — baca 6 harakat tanpa pengurangan.'],
    example: 'حمۤ · الۤمۤ · الۤرٰ',
    tip: 'Sering muncul pada huruf-huruf fawatihus suwar (pembuka surah).',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+mad+lazim+fawatih+suwar',
  },
  qalaqah: {
    label: 'Qalqalah',
    color: '#E65100',
    category: 'Sifat Huruf',
    how: 'Huruf qalqalah dibaca memantul/bergema ketika sukun (mati) atau waqaf.',
    steps: [
      'Huruf qalqalah: ق ط ب ج د (kumpulan: "Qathabujad").',
      'Qalqalah Sughra: huruf sukun di tengah kata → pantulan kecil.',
      'Qalqalah Kubra: huruf sukun di akhir ayah (waqaf) → pantulan lebih kuat.',
      'Bunyi seperti gema singkat "duk" setelah huruf dibunyikan.',
    ],
    example: 'يَقْطَعُونَ (qaf sukun) · وَالْفَجْرِ (jim sukun)',
    tip: 'Makin kuat qalqalah di akhir ayat (kubra). Rasakan getaran di tenggorokan.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+qalqalah+sughra+kubra+cara+baca',
  },
  ikhafa: {
    label: "Ikhfa' Haqiqi",
    color: '#7B1FA2',
    category: 'Nun Mati & Tanwin',
    how: 'Nun mati/tanwin bertemu 15 huruf ikhfa → baca samar dengan ghunnah 2 harakat.',
    steps: [
      '15 huruf ikhfa: ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك',
      'Nun tidak jelas (bukan izhar) dan tidak lebur penuh (bukan idgham).',
      'Posisi mulut disiapkan untuk huruf berikutnya, sambil dengung dari hidung 2 harakat.',
    ],
    example: 'مَنْ كَانَ → nun bertemu kaf',
    tip: 'Bayangkan nun "menghilang samar" sambil mulut sudah siap ke huruf berikutnya.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+ikhfa+haqiqi+cara+baca',
  },
  ikhafa_shafawi: {
    label: "Ikhfa' Syafawi",
    color: '#6A1B9A',
    category: 'Mim Mati',
    how: 'Mim mati bertemu Ba → baca mim samar dengan ghunnah 2 harakat.',
    steps: [
      'Khusus: mim mati (م) bertemu ba (ب).',
      'Bibir hampir menutup (siap membaca ba), tapi mim dibaca samar dengan dengung.',
      'Ghunnah 2 harakat dari hidung.',
    ],
    example: 'تَرْمِيهِم بِحِجَارَةٍ → mim bertemu ba',
    tip: '"Syafawi" berarti bibir — ikhfa\' khusus huruf-huruf bibir (mim-ba).',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+ikhfa+syafawi+mim+mati',
  },
  idgham_shafawi: {
    label: 'Idgham Syafawi',
    color: '#388E3C',
    category: 'Mim Mati',
    how: 'Mim mati bertemu Mim → lebur ke mim berikutnya dengan ghunnah 2 harakat.',
    steps: [
      'Mim mati (م) bertemu mim (م) di kata berikutnya.',
      'Dua mim melebur menjadi satu mim bertasydid.',
      'Baca dengan dengung 2 harakat.',
    ],
    example: 'لَكُمْ مَا كَسَبْتُمْ → mim mati bertemu mim (dengan ghunnah)',
    tip: 'Berbeda dengan ikhfa\' syafawi: ini LEBUR penuh, bukan samar.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+idgham+syafawi+mim+mati',
  },
  idgham_with_ghunnah: {
    label: 'Idgham dengan Ghunnah',
    color: '#2E7D32',
    category: 'Nun Mati & Tanwin',
    how: 'Nun mati/tanwin bertemu ي ن م و → lebur ke huruf berikutnya dengan ghunnah 2 harakat.',
    steps: [
      '4 huruf idgham ghunnah: ي ن م و (singkatan: "Yanmu").',
      'Nun mati/tanwin melebur — tidak dibunyikan sendiri.',
      'Tapi ada dengung (ghunnah) 2 harakat saat masuk ke huruf berikutnya.',
    ],
    example: 'مَن يَعْمَلْ → nun bertemu ya · مِن وَرَاءِ → nun bertemu waw',
    tip: 'Syarat: nun dan huruf idgham BERBEDA KATA. Jika satu kata, baca izhar.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+idgham+bighunnah+nun+mati',
  },
  idgham_wo_ghunnah: {
    label: 'Idgham tanpa Ghunnah',
    color: '#558B2F',
    category: 'Nun Mati & Tanwin',
    how: 'Nun mati/tanwin bertemu ل ر → lebur sempurna TANPA ghunnah.',
    steps: [
      '2 huruf: Lam (ل) dan Ra (ر).',
      'Nun mati melebur penuh ke huruf berikutnya — tidak ada sisa dengung.',
      'Harus beda kata (jika satu kata → baca izhar).',
    ],
    example: 'مِن رَّبِّهِمْ → nun bertemu ra · مِن لَّدُنْهُ → nun bertemu lam',
    tip: 'Lebur SEMPURNA — seperti nun tidak ada. Berbeda dengan ghunnah: tidak ada dengung.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+idgham+bilaghunnah+nun+mati',
  },
  iqlab: {
    label: 'Iqlab',
    color: '#C62828',
    category: 'Nun Mati & Tanwin',
    how: 'Nun mati/tanwin bertemu Ba → ubah menjadi Mim samar dengan ghunnah 2 harakat.',
    steps: [
      'Hanya 1 huruf: Ba (ب).',
      'Nun mati/tanwin "dibalik" menjadi mim (م) samar.',
      'Bibir menutup seperti mim, lalu dengung 2 harakat, lalu bunyikan ba.',
    ],
    example: 'مِنْ بَعْدِ → nun + ba, baca seperti mim samar',
    tip: '"Iqlab" artinya membalik. Tanda di mushaf: huruf mim kecil (م) di atas nun/tanwin.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+iqlab+nun+mati+ba',
  },
  ghunnah: {
    label: 'Ghunnah (Dengung)',
    color: '#E64A19',
    category: 'Sifat Huruf',
    how: 'Nun atau Mim bertasydid → baca dengan dengung 2 harakat dari hidung.',
    steps: [
      'Berlaku pada: Nun tasydid (نّ) dan Mim tasydid (مّ).',
      'Tahan dengung dari rongga hidung selama 2 harakat.',
      'Pastikan udara mengalir dari hidung, bukan mulut.',
    ],
    example: 'إِنَّ (inna) · ثُمَّ (tsumma) · مِمَّا (mimmaa)',
    tip: 'Tutup mulut, sentuh hidung — rasakan getaran. Itulah ghunnah yang benar.',
    youtube: 'https://www.youtube.com/results?search_query=tajwid+ghunnah+dengung+cara+baca',
  },
};

/**
 * Analisis tajwid lokal — bekerja langsung pada teks Arab biasa (quran-uthmani/simple).
 * Tidak bergantung pada API atau font khusus.
 *
 * Aturan yang diimplementasikan:
 *  Hamzah Washal, Lam Syamsiyah, Ghunnah, Qalqalah (Sughra & Kubra),
 *  Mad Tabi'i, Mad Wajib Muttashil, Mad Ja'iz Munfashil, Mad Lazim,
 *  Iqlab, Idgham (dengan/tanpa Ghunnah), Idgham Syafawi,
 *  Ikhfa' Haqiqi, Ikhfa' Syafawi
 */
export function analyzeTajweed(arabicText: string): TajweedSpan[] {
  // ── Unicode constants ──────────────────────────────────────────────────────
  const FATHAH    = '\u064E', KASRAH   = '\u0650', DHAMMAH   = '\u064F';
  const SUKUN     = '\u0652', SUKUN_ALT = '\u06E1', TASHDID  = '\u0651';
  const FATHATAN  = '\u064B', KASRATAN = '\u064D', DHAMMATAN = '\u064C';
  const DAGGER_ALIF = '\u0670';
  const ALIF      = '\u0627', ALIF_WASLA = '\u0671', ALIF_MADDA = '\u0622';
  const WAW       = '\u0648', YA       = '\u064A',  ALIF_MAQSURA = '\u0649';
  const NUN       = '\u0646', MIM      = '\u0645',  BA   = '\u0628';
  const LAM       = '\u0644', RA       = '\u0631';

  // Semua bentuk hamzah
  const isHamza = (ch: string) =>
    ch === '\u0621' || ch === '\u0623' || ch === '\u0625' ||
    ch === '\u0624' || ch === '\u0626';

  const QALQALAH   = new Set(['\u0642','\u0637','\u0628','\u062C','\u062F']); // ق ط ب ج د
  const IDGHAM_G   = new Set([YA, NUN, MIM, WAW]);           // ي ن م و (dengan ghunnah)
  const IDGHAM_B   = new Set([LAM, RA]);                     // ل ر (tanpa ghunnah)
  const IKHFA_SET  = new Set([
    '\u062A','\u062B','\u062C','\u062F','\u0630','\u0632',
    '\u0633','\u0634','\u0635','\u0636','\u0637','\u0638',
    '\u0641','\u0642','\u0643',
  ]);
  const SHAMSIYAH  = new Set([
    '\u062A','\u062B','\u062F','\u0630',RA,'\u0632',
    '\u0633','\u0634','\u0635','\u0636','\u0637','\u0638',
    LAM, NUN,
  ]);

  // Samakan karakter varian lintas mushaf (indopak/qpc/imlaei) untuk analisis aturan.
  const normalizeLetterForRule = (ch: string): string => {
    switch (ch) {
      case '\u06A9': return '\u0643'; // keheh -> kaf
      case '\u06CC': // farsi ya
      case '\u06D2': // bari ya
      case '\u06D3': // hamza bari ya
        return '\u064A';
      case '\u06BA': return '\u0646'; // noon ghunna -> noon
      case '\u06BE': // do chashmi heh
      case '\u06C1': // gol heh
      case '\u06C2':
      case '\u06C0':
        return '\u0647';
      default:
        return ch;
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isDiac = (cp: number) =>
    (cp >= 0x064B && cp <= 0x065F) || cp === 0x0670 ||
    (cp >= 0x0610 && cp <= 0x061A) || (cp >= 0x06D6 && cp <= 0x06ED);

  // Tatweel (U+0640) bukan huruf sejati, jangan jadikan anchor tajwid
  const isArabicLetter = (cp: number) =>
    (cp >= 0x0621 && cp <= 0x06FF) && !isDiac(cp) && cp !== 0x0640;

  // ── Tokenise: tiap huruf + harakatnya, dengan indeks kata ─────────────────
  interface Seg { ch: string; ruleCh: string; diacs: string; isLetter: boolean; wordIdx: number; }
  const segs: Seg[] = [];
  let wordIdx = 0;
  let i = 0;
  while (i < arabicText.length) {
    const cp = arabicText.charCodeAt(i);
    const ch = arabicText[i++];

    // Harakat yatim (tanpa huruf di depannya) — simpan sebagai segmen non-huruf agar teks tidak berubah
    if (isDiac(cp)) {
      segs.push({ ch, ruleCh: ch, diacs: '', isLetter: false, wordIdx });
      continue;
    }

    let diacs = '';
    while (i < arabicText.length && isDiac(arabicText.charCodeAt(i))) diacs += arabicText[i++];

    // Spasi / zero-width joiner = pemisah kata
    if (ch === ' ' || ch === '\u00A0' || ch === '\u200C' || ch === '\u200D') wordIdx++;

    const ruleCh = normalizeLetterForRule(ch);
    const ruleCp = ruleCh.charCodeAt(0);
    segs.push({ ch, ruleCh, diacs, isLetter: isArabicLetter(ruleCp), wordIdx });
  }

  // ── Fase 1: tentukan aturan per segmen ────────────────────────────────────
  const rules: (string | null)[] = new Array(segs.length).fill(null);

  for (let si = 0; si < segs.length; si++) {
    const seg = segs[si];
    if (!seg.isLetter) continue;

    const hasSukun   = seg.diacs.includes(SUKUN) || seg.diacs.includes(SUKUN_ALT);
    const hasTashdid = seg.diacs.includes(TASHDID);
    const hasTanwin  = seg.diacs.includes(FATHATAN) ||
                       seg.diacs.includes(KASRATAN)  ||
                       seg.diacs.includes(DHAMMATAN);

    // Segmen Arab berikutnya + deteksi beda kata
    let nextSi = -1;
    for (let j = si + 1; j < segs.length; j++) {
      if (segs[j].isLetter) { nextSi = j; break; }
    }
    const nextSeg     = nextSi >= 0 ? segs[nextSi] : null;
    const nextCh      = nextSeg?.ruleCh ?? '';
    const nextDiacs   = nextSeg?.diacs ?? '';
    const isDiffWord  = !!nextSeg && nextSeg.wordIdx !== seg.wordIdx;

    // Segmen Arab sebelumnya
    let prevSi = -1;
    for (let j = si - 1; j >= 0; j--) {
      if (segs[j].isLetter) { prevSi = j; break; }
    }
    const prevSeg    = prevSi >= 0 ? segs[prevSi] : null;
    const prevCh     = prevSeg?.ruleCh ?? '';
    const prevDiacs  = prevSeg?.diacs ?? '';
    const prevWordIdx = prevSeg?.wordIdx ?? -1;

    // ── 1. Hamzah Washal (ٱ) ────────────────────────────────────────────────
    if (seg.ruleCh === ALIF_WASLA) {
      rules[si] = 'ham_wasl';
      continue;
    }

    // ── 2. Lam Syamsiyah: "ال" + huruf syamsiyah ────────────────────────────
    // Periksa bahwa LAM ini didahului ALIF/ALIF_WASLA dalam kata yang sama
    if (
      seg.ruleCh === LAM &&
      (prevCh === ALIF || prevCh === ALIF_WASLA) &&
      prevWordIdx === seg.wordIdx &&
      SHAMSIYAH.has(nextCh)
    ) {
      rules[si] = 'laam_shamsiyah';
      continue;
    }

    // ── 3. Ghunnah: ن / م bertasydid ────────────────────────────────────────
    if ((seg.ruleCh === NUN || seg.ruleCh === MIM) && hasTashdid) {
      rules[si] = 'ghunnah';
      continue;
    }

    // Helper: huruf tidak punya harakat sama sekali (potensi mad tanpa sukun eksplisit)
    // Pada quran-simple, و/ي mad sering tidak diberi sukun — hanya extension letter diam
    const noHarakat = !hasSukun && !hasTashdid && !hasTanwin &&
      !seg.diacs.includes(FATHAH) && !seg.diacs.includes(KASRAH) && !seg.diacs.includes(DHAMMAH);

    // ── 4. Qalqalah ─────────────────────────────────────────────────────────
    // Sughra: bersukun eksplisit di tengah/akhir kata
    // Kubra: huruf terakhir ayat (posisi waqaf)
    if (QALQALAH.has(seg.ruleCh)) {
      const isLastOfAyah = nextSi === -1; // tidak ada huruf Arab lagi setelahnya
      if (hasSukun || isLastOfAyah) {
        rules[si] = 'qalaqah';
        continue;
      }
    }

    // ── 5. Mad ──────────────────────────────────────────────────────────────
    // Guard: huruf sebelumnya harus ada dan berada dalam kata yang sama
    const prevSameWord = !!prevSeg && prevSeg.wordIdx === seg.wordIdx;
    // Alif mad: ALIF tanpa harakat sendiri, huruf sebelumnya (kata sama) punya fathah
    const isMadAlif    = seg.ruleCh === ALIF        && noHarakat && prevSameWord && prevDiacs.includes(FATHAH);
    const isMadMadda   = seg.ruleCh === ALIF_MADDA;
    const isMadMaqsura = seg.ruleCh === ALIF_MAQSURA && noHarakat && prevSameWord && prevDiacs.includes(FATHAH);
    const isMadDaggerAlif = seg.diacs.includes(DAGGER_ALIF);
    // Waw/Ya mad: punya sukun eksplisit ATAU tidak punya harakat sama sekali
    // (quran-simple menulis mad waw/ya tanpa sukun — hanya diam secara implisit)
    const isMadWaw = seg.ruleCh === WAW && (hasSukun || noHarakat) && prevSameWord && prevDiacs.includes(DHAMMAH);
    const isMadYa  = seg.ruleCh === YA  && (hasSukun || noHarakat) && prevSameWord && prevDiacs.includes(KASRAH);

    if (isMadAlif || isMadMadda || isMadMaqsura || isMadDaggerAlif || isMadWaw || isMadYa) {
      if (nextSeg && isHamza(nextCh) && !isDiffWord) {
        // Mad Wajib Muttashil: mad + hamzah SATU KATA (4–5 harakat, wajib)
        rules[si] = 'madda_obligatory';
      } else if (nextSeg && isHamza(nextCh) && isDiffWord) {
        // Mad Ja'iz Munfashil: mad + hamzah BEDA KATA (2–5 harakat)
        rules[si] = 'madda_permissible';
      } else if (
        nextSeg &&
        !isDiffWord &&
        (nextDiacs.includes(SUKUN) || nextDiacs.includes(SUKUN_ALT) || nextDiacs.includes(TASHDID))
      ) {
        // Mad Lazim: mad + sukun/tasydid berikutnya (6 harakat, wajib)
        rules[si] = 'madda_necessary';
      } else {
        // Mad Tabi'i: 2 harakat
        rules[si] = 'madda_normal';
      }
      continue;
    }

    // ── 6. Nun Mati / Tanwin ─────────────────────────────────────────────────
    const isNunMati = seg.ruleCh === NUN && hasSukun;
    if (isNunMati || hasTanwin) {
      if (nextSeg) {
        if (nextCh === BA) {
          rules[si] = 'iqlab';
        } else if (IDGHAM_G.has(nextCh) && isDiffWord) {
          rules[si] = 'idgham_with_ghunnah';
        } else if (IDGHAM_B.has(nextCh) && isDiffWord) {
          rules[si] = 'idgham_wo_ghunnah';
        } else if (IKHFA_SET.has(nextCh)) {
          rules[si] = 'ikhafa';
        }
        // IZHAR (ح خ ع غ ء ه) → no color (null)
      }
      continue;
    }

    // ── 7. Mim Mati ──────────────────────────────────────────────────────────
    if (seg.ruleCh === MIM && hasSukun) {
      if (nextCh === BA)                      rules[si] = 'ikhafa_shafawi';
      else if (nextCh === MIM && isDiffWord)  rules[si] = 'idgham_shafawi';
      continue;
    }
  }

  // ── Fase 2: bangun spans dari rules ───────────────────────────────────────
  const spans: TajweedSpan[] = [];
  let cur = '', curRule: string | null = null;

  const flush = () => {
    if (cur) { spans.push({ text: cur, rule: curRule }); cur = ''; curRule = null; }
  };

  for (let si = 0; si < segs.length; si++) {
    const seg  = segs[si];
    const rule = seg.isLetter ? rules[si] : null;

    if (!seg.isLetter) {
      // Spasi / tanda baca: akhiri span warna, tambahkan sebagai teks biasa
      if (curRule !== null) flush();
      cur += seg.ch + seg.diacs;
      continue;
    }

    if (rule !== curRule) flush();
    curRule = rule;
    cur += seg.ch + seg.diacs;
  }
  flush();

  return spans;
}

/** @deprecated Gunakan analyzeTajweed() — API quran-tajweed menggunakan font encoding khusus */
export function parseTajweedText(raw: string): TajweedSpan[] {
  return [{ text: raw, rule: null }];
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Ayah {
  number: number;        // Global ayah number (1–6236)
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: Ayah[];
}

export interface SurahWithTranslation {
  arabic: Surah;
  translation: Surah;
}

export interface PemulaWordMeaning {
  arabic: string;
  translit: string;
  indonesian: string;
}

export type SurahWordByWord = Record<number, PemulaWordMeaning[]>;

export interface UlamaTafsirInsight {
  sourceId: number;
  sourceName: string;
  verseKey: string;
  text: string;
  sourceUrl: string;
}

export interface UlamaTafsirFullInsight {
  sourceId: number;
  sourceName: string;
  verseKey: string;
  textOriginal: string;
  textEnglish: string;
  textIndonesian: string;
  sourceUrl: string;
}

export interface SurahChapterInfo {
  surahNumber: number;
  language: string;
  shortText: string;
  longText: string;
  source: string;
  sourceUrl: string;
}

// ─── Reciters ────────────────────────────────────────────────────────────────

export type ReciterGroup = 'haram' | 'nabawi' | 'lainnya';

export interface Reciter {
  id: string;
  name: string;
  label: string;
  group: ReciterGroup;
  surahAudioBaseUrl?: string;
  surahOnly?: boolean;
  quranComRecitationId?: number;
  /** Edition ID for cdn.islamic.network per-ayah backup CDN */
  islamicNetworkEditionId?: string;
}

export type ReciterSyncCapability = 'full' | 'follow' | 'audio';

export interface WordTimingSegment {
  wordIndex: number;
  startMs: number;
  endMs: number;
}

export const RECITER_GROUPS: Record<ReciterGroup, { title: string; subtitle: string; icon: string; color: string }> = {
  haram:   { title: 'Masjidil Haram',    subtitle: 'Makkah Al-Mukarramah', icon: 'home',        color: '#10B981' },
  nabawi:  { title: 'Masjid Nabawi',     subtitle: 'Madinah Al-Munawwarah', icon: 'star',        color: '#F59E0B' },
  lainnya: { title: 'Qari Internasional', subtitle: 'Mesir, Kuwait & lainnya', icon: 'earth',   color: '#6366F1' },
};

export const RECITERS: Reciter[] = [
  // ── Masjidil Haram ──────────────────────────────────────────────────────────
  {
    id: 'Abdurrahmaan_As-Sudais_192kbps',
    name: 'Abdul Rahman Al-Sudais',
    label: 'Imam Besar Masjidil Haram',
    group: 'haram',
    surahAudioBaseUrl: 'https://server11.mp3quran.net/sds',
    quranComRecitationId: 3,
    islamicNetworkEditionId: 'ar.abdurrahmaansudais',
  },
  {
    id: 'Saud_Al-Shuraym_128kbps',
    name: 'Saud Al-Shuraim',
    label: 'Imam Masjidil Haram',
    group: 'haram',
    surahAudioBaseUrl: 'https://server7.mp3quran.net/shur',
    quranComRecitationId: 10,
    islamicNetworkEditionId: 'ar.saoodashuraym',
  },
  {
    id: 'Maher_AlMuaiqly_128kbps',
    name: 'Maher Al-Muaiqly',
    label: 'Imam Masjidil Haram',
    group: 'haram',
    surahAudioBaseUrl: 'https://server12.mp3quran.net/maher/Almusshaf-Al-Mojawwad',
    islamicNetworkEditionId: 'ar.maher',
  },
  {
    id: 'Khalid_Al-Ghamdi_128kbps',
    name: 'Khalid Al-Ghamdi',
    label: 'Imam Masjidil Haram',
    group: 'haram',
    surahAudioBaseUrl: 'https://server7.mp3quran.net/s_gmd',
  },
  {
    id: 'Yasser_Ad-Dussary_128kbps',
    name: 'Yasser Al-Dosari',
    label: 'Imam Masjidil Haram',
    group: 'haram',
    surahAudioBaseUrl: 'https://server11.mp3quran.net/yasser',
    islamicNetworkEditionId: 'ar.yassersalamahaldossary',
  },
  {
    id: 'Abdullaah_3awwaad_Al-Juhaynee_128kbps',
    name: 'Abdullah Al-Juhany',
    label: 'Imam Masjidil Haram',
    group: 'haram',
    surahAudioBaseUrl: 'https://server13.mp3quran.net/jhn',
  },
  {
    id: 'Bandar_Balilah_surah',
    name: 'Sheikh Bandar Balilah',
    label: 'Imam Masjidil Haram (surah penuh)',
    group: 'haram',
    surahAudioBaseUrl: 'https://server6.mp3quran.net/balilah',
    surahOnly: true,
  },
  // ── Masjid Nabawi ───────────────────────────────────────────────────────────
  {
    id: 'Ali_Hudhaify_128kbps',
    name: 'Ali Hudhaifi',
    label: 'Imam Masjid Nabawi',
    group: 'nabawi',
    surahAudioBaseUrl: 'https://server9.mp3quran.net/hthfi/Rewayat-Sho-bah-A-n-Asim',
    islamicNetworkEditionId: 'ar.hudhaify',
  },
  {
    id: 'Salah_Al-Budayr_128kbps',
    name: 'Salah Al-Budair',
    label: 'Imam Masjid Nabawi',
    group: 'nabawi',
    surahAudioBaseUrl: 'https://server6.mp3quran.net/s_bud',
  },
  // ── Internasional ───────────────────────────────────────────────────────────
  {
    id: 'Alafasy_128kbps',
    name: 'Mishary Rashid Alafasy',
    label: 'Kuwait',
    group: 'lainnya',
    surahAudioBaseUrl: 'https://server8.mp3quran.net/afs',
    quranComRecitationId: 7,
    islamicNetworkEditionId: 'ar.alafasy',
  },
  {
    id: 'Abdul_Basit_Murattal_192kbps',
    name: 'Abdul Basit (Murattal)',
    label: 'Mesir',
    group: 'lainnya',
    surahAudioBaseUrl: 'https://server7.mp3quran.net/basit',
    quranComRecitationId: 1,
    islamicNetworkEditionId: 'ar.abdulbasit',
  },
  {
    id: 'Husary_128kbps',
    name: 'Mahmoud Khalil Al-Husary',
    label: 'Mesir',
    group: 'lainnya',
    surahAudioBaseUrl: 'https://server13.mp3quran.net/husr/Rewayat-Qalon-A-n-Nafi',
    islamicNetworkEditionId: 'ar.husary',
  },
  {
    id: 'Minshawy_Murattal_128kbps',
    name: 'Mohamed Siddiq El-Minshawi',
    label: 'Mesir',
    group: 'lainnya',
    surahAudioBaseUrl: 'https://server10.mp3quran.net/minsh/Almusshaf-Al-Mo-lim',
    quranComRecitationId: 8,
    islamicNetworkEditionId: 'ar.minshawi',
  },
];

export const DEFAULT_RECITER = RECITERS[0]; // Sudais

// ─── Audio ───────────────────────────────────────────────────────────────────

export function getAudioUrl(
  surahNumber: number,
  ayahInSurah: number,
  reciterId: string = RECITERS[0].id
): string {
  const s = String(surahNumber).padStart(3, '0');
  const a = String(ayahInSurah).padStart(3, '0');
  return `${AUDIO_CDN}/${reciterId}/${s}${a}.mp3`;
}

// Pre-computed cumulative ayah offsets — offsets[i] = total ayahs before surah (i+1)
const SURAH_AYAH_OFFSETS: number[] = (() => {
  const offsets: number[] = [];
  let cumulative = 0;
  for (const s of SURAH_LIST) {
    offsets.push(cumulative);
    cumulative += s.ayahCount;
  }
  return offsets;
})();

/** Returns the 1-based global ayah number (1–6236) for a given surah + ayah. */
export function getGlobalAyahNumber(surahNumber: number, ayahInSurah: number): number {
  return (SURAH_AYAH_OFFSETS[surahNumber - 1] ?? 0) + ayahInSurah;
}

function getSurahAyahFromGlobalAyahNumber(globalAyah: number): { surahNumber: number; ayahInSurah: number } {
  const safeAyah = Math.min(Math.max(1, Math.floor(globalAyah)), 6236);
  for (let i = 0; i < SURAH_LIST.length; i++) {
    const start = SURAH_AYAH_OFFSETS[i] ?? 0;
    const count = SURAH_LIST[i]?.ayahCount ?? 0;
    if (safeAyah <= start + count) {
      return { surahNumber: i + 1, ayahInSurah: safeAyah - start };
    }
  }
  return { surahNumber: 114, ayahInSurah: 6 };
}

/**
 * cdn.islamic.network (alquran.cloud) — per-ayah backup CDN.
 * Returns null if the reciter has no islamicNetworkEditionId mapping.
 */
export function getIslamicNetworkAudioUrl(
  surahNumber: number,
  ayahInSurah: number,
  reciterId: string = RECITERS[0].id
): string | null {
  const reciter = RECITERS.find(r => r.id === reciterId);
  if (!reciter?.islamicNetworkEditionId) return null;
  const globalAyah = getGlobalAyahNumber(surahNumber, ayahInSurah);
  return `${ISLAMIC_NETWORK_CDN}/${reciter.islamicNetworkEditionId}/${globalAyah}.mp3`;
}

export function getSurahAudioUrl(
  surahNumber: number,
  reciterId: string
): string | null {
  const reciter = RECITERS.find(r => r.id === reciterId);
  if (!reciter?.surahAudioBaseUrl) return null;
  const s = String(surahNumber).padStart(3, '0');
  return `${reciter.surahAudioBaseUrl}/${s}.mp3`;
}

type QuranComRecitationAyahResponse = {
  audio_files?: Array<{ url?: string }>;
  audio_file?: { url?: string };
};

type QuranComRecitationByChapterResponse = {
  audio_files?: Array<{
    verse_key?: string;
    segments?: unknown;
    timestamp_from?: number;
    timestamp_to?: number;
    duration?: number;
  }>;
  pagination?: { next_page?: number | null };
};

type QuranComChapterRecitationResponse = {
  audio_file?: {
    timestamps?: Array<{
      verse_key?: string;
      timestamp_from?: number;
      timestamp_to?: number;
      duration?: number;
      segments?: unknown;
    }>;
  };
};

const parseWordTimingSegments = (raw: unknown): WordTimingSegment[] => {
  if (!Array.isArray(raw)) return [];
  const out: WordTimingSegment[] = [];
  raw.forEach(item => {
    if (Array.isArray(item) && item.length >= 3) {
      const wordIndex = Number(item[0]);
      const startMs = Number(item[1]);
      const endMs = Number(item[2]);
      if (Number.isFinite(wordIndex) && Number.isFinite(startMs) && Number.isFinite(endMs)) {
        out.push({
          wordIndex: Math.max(1, Math.floor(wordIndex)),
          startMs: Math.max(0, Math.floor(startMs)),
          endMs: Math.max(0, Math.floor(endMs)),
        });
      }
      return;
    }
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      const wordIndex = Number(row.word_index ?? row.wordIndex ?? row[0]);
      const startMs = Number(row.start_ms ?? row.start ?? row.from ?? row.timestamp_from ?? row[1]);
      const endMs = Number(row.end_ms ?? row.end ?? row.to ?? row.timestamp_to ?? row[2]);
      if (Number.isFinite(wordIndex) && Number.isFinite(startMs) && Number.isFinite(endMs)) {
        out.push({
          wordIndex: Math.max(1, Math.floor(wordIndex)),
          startMs: Math.max(0, Math.floor(startMs)),
          endMs: Math.max(0, Math.floor(endMs)),
        });
      }
    }
  });
  out.sort((a, b) => a.startMs - b.startMs || a.wordIndex - b.wordIndex);
  return out;
};

const normalizeSegmentsToAyahLocal = (
  segments: WordTimingSegment[],
  ayahStartMs?: number
): WordTimingSegment[] => {
  if (!segments.length) return [];
  const startBase = Number.isFinite(Number(ayahStartMs))
    ? Math.max(0, Number(ayahStartMs))
    : Math.max(0, Math.min(...segments.map(s => s.startMs)));
  return segments
    .map(seg => ({
      wordIndex: seg.wordIndex,
      startMs: Math.max(0, seg.startMs - startBase),
      endMs: Math.max(0, seg.endMs - startBase),
    }))
    .filter(seg => seg.endMs >= seg.startMs);
};

const parseAyahNumberFromVerseKey = (verseKey: string, surahNumber: number): number | null => {
  const key = String(verseKey ?? '').trim();
  if (!key.includes(':')) return null;
  const [s, a] = key.split(':');
  if (Number(s) !== surahNumber) return null;
  const ayah = Number(a);
  if (!Number.isFinite(ayah) || ayah <= 0) return null;
  return Math.floor(ayah);
};

const normalizeQuranComAudioPrefix = (rawUrl: string): string | null => {
  const raw = String(rawUrl ?? '').trim();
  if (!raw) return null;
  const relative = raw
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\/+/, '')
    .split('?')[0];
  if (!relative) return null;
  const lastSlash = relative.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  return relative.slice(0, lastSlash + 1);
};

const getQuranComRecitationPrefix = async (recitationId: number): Promise<string | null> => {
  const known = QURAN_COM_RECITATION_PREFIX_BY_ID[recitationId];
  if (known) return known;

  const cached = QURAN_COM_RECITATION_PREFIX_CACHE.get(recitationId);
  if (cached) return cached;

  const req = (async () => {
    try {
      const res = await fetch(`${QURAN_COM_API}/recitations/${recitationId}/by_ayah/1:1`);
      if (!res.ok) return null;
      const json = (await res.json()) as QuranComRecitationAyahResponse;
      const rawUrl =
        String(json?.audio_files?.[0]?.url ?? '').trim() ||
        String(json?.audio_file?.url ?? '').trim();
      return normalizeQuranComAudioPrefix(rawUrl);
    } catch {
      return null;
    }
  })();

  QURAN_COM_RECITATION_PREFIX_CACHE.set(recitationId, req);
  return req;
};

export async function getAyahAudioFallbackUrl(
  surahNumber: number,
  ayahInSurah: number,
  reciterId: string = RECITERS[0].id
): Promise<{ url: string | null; usedFallbackReciter: boolean }> {
  const reciter = RECITERS.find(r => r.id === reciterId);
  const recitationId = reciter?.quranComRecitationId ?? 3; // Sudais sebagai fallback stabil
  const prefix = await getQuranComRecitationPrefix(recitationId);
  if (!prefix) return { url: null, usedFallbackReciter: false };

  const s = String(surahNumber).padStart(3, '0');
  const a = String(ayahInSurah).padStart(3, '0');
  const url = `${QURAN_COM_AUDIO_CDN}/${prefix}${s}${a}.mp3`;
  return {
    url,
    usedFallbackReciter: !reciter?.quranComRecitationId,
  };
}

const fetchWordTimingByVerseRecitation = async (
  recitationId: number,
  surahNumber: number
): Promise<Record<number, WordTimingSegment[]>> => {
  const out: Record<number, WordTimingSegment[]> = {};
  const perPage = 50;
  let page = 1;
  for (let guard = 0; guard < 20; guard++) {
    const res = await fetch(
      `${QURAN_COM_API}/recitations/${recitationId}/by_chapter/${surahNumber}` +
      `?per_page=${perPage}&page=${page}&segments=true`
    );
    if (!res.ok) break;
    const json = (await res.json()) as QuranComRecitationByChapterResponse;
    const rows = Array.isArray(json?.audio_files) ? json.audio_files : [];
    if (!rows.length) break;

    rows.forEach(row => {
      const ayah = parseAyahNumberFromVerseKey(String(row?.verse_key ?? ''), surahNumber);
      if (!ayah) return;
      const parsed = parseWordTimingSegments(row?.segments);
      if (!parsed.length) return;
      const normalized = normalizeSegmentsToAyahLocal(parsed, Number(row?.timestamp_from));
      if (!normalized.length) return;
      out[ayah] = normalized;
    });

    const nextPage = Number(json?.pagination?.next_page ?? 0);
    if (!Number.isFinite(nextPage) || nextPage <= page) break;
    page = nextPage;
  }
  return out;
};

const fetchWordTimingByChapterRecitation = async (
  recitationId: number,
  surahNumber: number
): Promise<Record<number, WordTimingSegment[]>> => {
  const out: Record<number, WordTimingSegment[]> = {};
  const res = await fetch(
    `${QURAN_COM_API}/chapter_recitations/${recitationId}/${surahNumber}?segments=true`
  );
  if (!res.ok) return out;
  const json = (await res.json()) as QuranComChapterRecitationResponse;
  const rows = Array.isArray(json?.audio_file?.timestamps) ? json.audio_file.timestamps : [];
  rows.forEach(row => {
    const ayah = parseAyahNumberFromVerseKey(String(row?.verse_key ?? ''), surahNumber);
    if (!ayah) return;
    const parsed = parseWordTimingSegments(row?.segments);
    if (!parsed.length) return;
    const normalized = normalizeSegmentsToAyahLocal(parsed, Number(row?.timestamp_from));
    if (!normalized.length) return;
    out[ayah] = normalized;
  });
  return out;
};

/**
 * Ambil timing kata per ayat untuk qari tertentu.
 * Fallback aman: jika tidak ada data timing, return object kosong.
 */
export async function fetchReciterWordTimingBySurah(
  reciterId: string,
  surahNumber: number
): Promise<Record<number, WordTimingSegment[]>> {
  const reciter = RECITERS.find(r => r.id === reciterId);
  if (!reciter || reciter.surahOnly || !reciter.quranComRecitationId) return {};

  const cacheKey = `${reciter.id}:${surahNumber}`;
  const cached = RECITER_WORD_TIMING_CACHE.get(cacheKey);
  if (cached) return cached;

  const req = (async () => {
    const recitationId = reciter.quranComRecitationId!;
    try {
      const byVerse = await fetchWordTimingByVerseRecitation(recitationId, surahNumber);
      if (Object.keys(byVerse).length > 0) return byVerse;
    } catch {
      // lanjut fallback endpoint berikutnya
    }
    try {
      const byChapter = await fetchWordTimingByChapterRecitation(recitationId, surahNumber);
      if (Object.keys(byChapter).length > 0) return byChapter;
    } catch {
      // abaikan, return kosong
    }
    return {};
  })();

  RECITER_WORD_TIMING_CACHE.set(cacheKey, req);
  try {
    return await req;
  } catch {
    RECITER_WORD_TIMING_CACHE.delete(cacheKey);
    return {};
  }
}

/** @deprecated Use getAudioUrl(surahNumber, ayahInSurah, reciterId) instead */
export function getAyahAudioUrl(
  globalAyahNumber: number,
  reciterId: string = RECITERS[0].id
): string {
  return getAudioUrl(1, globalAyahNumber, reciterId);
}

// ─── Fetch Functions ─────────────────────────────────────────────────────────

type QuranVerseByChapter = {
  id?: number;
  verse_number?: number;
  verse_key?: string;
  hizb_number?: number;
  rub_el_hizb_number?: number;
  ruku_number?: number;
  manzil_number?: number;
  sajdah_number?: number | null;
  page_number?: number;
  juz_number?: number;
  text_uthmani?: string;
  text_uthmani_simple?: string;
  text_uthmani_tajweed?: string;
  text_indopak?: string;
  text_indopak_nastaleeq?: string;
  text_imlaei?: string;
  text_imlaei_simple?: string;
  text_qpc_hafs?: string;
  text_qpc_nastaleeq?: string;
};

type QuranVerseByChapterResponse = {
  verses?: QuranVerseByChapter[];
  pagination?: { next_page?: number | null };
};

type QuranTranslationResponse = {
  translations?: Array<{ text?: string }>;
};

type QuranEncTranslationRow = {
  sura?: string | number;
  aya?: string | number;
  translation?: string;
  footnotes?: string;
};

type QuranEncSurahTranslationResponse = {
  result?: QuranEncTranslationRow[];
};

type QuranEncAyahTranslationResponse = {
  result?: QuranEncTranslationRow;
};

type QuranTafsirByAyahResponse = {
  tafsir?: { text?: string };
};

type QuranChapterInfoResponse = {
  chapter_info?: {
    chapter_id?: number;
    language_name?: string;
    short_text?: string;
    text?: string;
    source?: string;
  };
};

const SCRIPT_TO_TEXT_PRIORITY: Record<ArabicScript, Array<keyof QuranVerseByChapter>> = {
  // Utsmani: dahulukan qpc_hafs bila tersedia, fallback ke field Utsmani lain.
  uthmani: ['text_qpc_hafs', 'text_uthmani', 'text_uthmani_tajweed', 'text_uthmani_simple'],
  // Indopak: gunakan field Indopak, fallback ke varian nastaleeq.
  indopak: ['text_indopak', 'text_qpc_nastaleeq', 'text_indopak_nastaleeq'],
  // Imlaei: gunakan ejaan imlaei modern.
  imlaei: ['text_imlaei', 'text_imlaei_simple'],
};

const VERSES_PER_PAGE = 50;
const MAX_VERSE_PAGES = 20;
const QURAN_TRANSLATION_IDS: Record<Lang, number> = {
  id: 33, // Indonesian Islamic Affairs Ministry / Kemenag RI
  en: 20, // Saheeh International
};
const QURAN_DAILY_VERSE_EDITIONS: Record<Lang, string> = {
  id: 'id.indonesian',
  en: 'en.sahih',
};
const ULAMA_TAFSIR_SOURCES = [
  { id: 169, name: 'Ibnu Katsir (Ringkas)' },
  { id: 15, name: 'Ath-Thabari' },
  { id: 90, name: 'Al-Qurthubi' },
] as const;
export const ULAMA_TAFSIR_SOURCE_LIST = ULAMA_TAFSIR_SOURCES.map(item => ({ ...item }));

const normalizeInlineHtml = (text: string): string =>
  text
    // Footnote marker dari Quran.com translation API, contoh:
    // <sup foot_note=134955>1</sup>
    .replace(/<\s*sup\b[^>]*>[\s\S]*?<\/\s*sup\s*>/gi, ' ')
    .replace(/<\s*fn\b[^>]*>[\s\S]*?<\/\s*fn\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeQuranEncFootnotes = (text: string): string =>
  normalizeInlineHtml(text)
    .replace(/\s+\[/g, '\n[')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const normalizeQuranEncTranslation = (row: QuranEncTranslationRow): string => {
  const translation = normalizeInlineHtml(String(row?.translation ?? ''));
  const footnotes = normalizeQuranEncFootnotes(String(row?.footnotes ?? ''));
  if (!translation) return '';
  return footnotes ? `${translation}\n\nCatatan: ${footnotes}` : translation;
};

const normalizeContentLanguage = (language?: string | null): Lang =>
  language === 'en' ? 'en' : 'id';

const getQuranTranslationId = (language?: string | null): number =>
  QURAN_TRANSLATION_IDS[normalizeContentLanguage(language)];

const normalizeChapterInfoText = (html: string): string =>
  html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ')
    .replace(/<\/\s*(p|h[1-6]|li|ul|ol)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const toExcerpt = (text: string, maxLength = 520): string => {
  const clean = String(text ?? '').trim();
  if (!clean) return '';
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}...`;
};

const dedupeArabicCombiningMarks = (text: string): string => {
  const isCombiningArabicMark = (cp: number) =>
    (cp >= 0x064B && cp <= 0x065F) ||
    (cp >= 0x0610 && cp <= 0x061A) ||
    cp === 0x0670 ||
    (cp >= 0x06D6 && cp <= 0x06ED);

  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const cp = text.charCodeAt(i);
    if (isCombiningArabicMark(cp)) {
      // Harakat yatim tetap dipertahankan.
      out += ch;
      i++;
      continue;
    }

    out += ch;
    i++;
    if (i >= text.length) continue;

    const seen = new Set<string>();
    let marks = '';
    while (i < text.length) {
      const mark = text[i];
      const markCp = text.charCodeAt(i);
      if (!isCombiningArabicMark(markCp)) break;
      if (!seen.has(mark)) {
        seen.add(mark);
        marks += mark;
      }
      i++;
    }
    out += marks;
  }
  return out;
};

const normalizeScriptReadability = (text: string, _script: ArabicScript): string => {
  // Jaga bentuk huruf asli tiap mushaf; normalisasi hanya karakter kontrol/noise.
  let out = text
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/\u200B/g, '')
    .replace(/\uFEFF/g, '');
  return dedupeArabicCombiningMarks(out);
};

const stripTrailingAyahMarkers = (text: string): string =>
  text
    .replace(/[\u200E\u200F\u061C]*\s*[\u0660-\u0669]{1,3}\s*$/u, '')
    .replace(/\u06DD\s*$/u, '')
    .replace(/[\uE000-\uF8FF]+\s*$/u, '')
    .trim();

const getAyahNumberInSurah = (verse: QuranVerseByChapter, fallback: number): number => {
  const direct = Number(verse.verse_number ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const fromKey = Number(String(verse.verse_key ?? '').split(':')[1] ?? 0);
  if (Number.isFinite(fromKey) && fromKey > 0) return fromKey;
  return fallback;
};

const getScriptText = (verse: QuranVerseByChapter, script: ArabicScript): string => {
  const prioritizedFields = SCRIPT_TO_TEXT_PRIORITY[script];
  const raw = prioritizedFields
    .map(field => String(verse[field] ?? '').trim())
    .find(Boolean) ?? String(verse.text_uthmani ?? '');
  const readable = normalizeScriptReadability(raw, script);
  return stripTrailingAyahMarkers(normalizeInlineHtml(readable));
};

const toTafsirExcerpt = (raw: string, maxLength = 460): string => {
  const clean = normalizeInlineHtml(raw).replace(/\[[^\]]+\]/g, '').trim();
  if (!clean) return '';
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}…`;
};

const normalizeTafsirLongText = (raw: string): string =>
  String(raw ?? '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ')
    .replace(/<\/\s*(p|h[1-6]|li|ul|ol|div)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const splitToTranslationChunks = (input: string, maxLength = 1300): string[] => {
  const text = String(input ?? '').trim();
  if (!text) return [];
  if (text.length <= maxLength) return [text];
  const out: string[] = [];
  let buffer = '';
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  paragraphs.forEach(paragraph => {
    if (paragraph.length > maxLength) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      words.forEach(word => {
        const next = buffer ? `${buffer} ${word}` : word;
        if (next.length > maxLength) {
          if (buffer) out.push(buffer);
          buffer = word;
        } else {
          buffer = next;
        }
      });
      if (buffer) {
        out.push(buffer);
        buffer = '';
      }
      return;
    }
    const next = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (next.length > maxLength) {
      if (buffer) out.push(buffer);
      buffer = paragraph;
    } else {
      buffer = next;
    }
  });
  if (buffer) out.push(buffer);
  return out;
};

const parseGoogleTranslateText = (json: any): string => {
  const rows = Array.isArray(json?.[0]) ? json[0] : [];
  return rows
    .map((row: any) => (Array.isArray(row) ? String(row[0] ?? '') : ''))
    .join('')
    .trim();
};

const detectLikelyIndonesian = (text: string): boolean => {
  const sample = text.toLowerCase().slice(0, 1200);
  const hints = [' yang ', ' dan ', ' dengan ', ' untuk ', ' pada ', ' ayat ', ' surah ', ' adalah ', ' tidak '];
  const score = hints.reduce((acc, hint) => (sample.includes(hint) ? acc + 1 : acc), 0);
  return score >= 3;
};

async function fetchTafsirTextByLanguage(
  sourceId: number,
  verseKey: string,
  language: string
): Promise<string> {
  try {
    const response = await fetch(
      `${QURAN_COM_API}/tafsirs/${sourceId}/by_ayah/${verseKey}?language=${encodeURIComponent(language)}`
    );
    if (!response.ok) return '';
    const json = (await response.json()) as QuranTafsirByAyahResponse;
    return normalizeTafsirLongText(String(json?.tafsir?.text ?? ''));
  } catch {
    return '';
  }
}

async function translateToIndonesian(text: string): Promise<string> {
  const clean = String(text ?? '').trim();
  if (!clean) return '';
  if (detectLikelyIndonesian(clean)) return clean;

  const key = clean.length > 5000 ? `long:${clean.slice(0, 1200)}:${clean.length}` : clean;
  const cached = TRANSLATION_CACHE.get(key);
  if (cached) return cached;

  const req = (async () => {
    const chunks = splitToTranslationChunks(clean, 1300);
    const translated: string[] = [];
    for (const chunk of chunks) {
      const url =
        `https://translate.googleapis.com/translate_a/single` +
        `?client=gtx&sl=auto&tl=id&dt=t&q=${encodeURIComponent(chunk)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Gagal menerjemahkan tafsir.');
      const json = await response.json();
      const textChunk = parseGoogleTranslateText(json);
      translated.push(textChunk || chunk);
    }
    const merged = translated.join('\n\n').trim();
    return merged || clean;
  })();

  TRANSLATION_CACHE.set(key, req);
  try {
    return await req;
  } catch {
    TRANSLATION_CACHE.delete(key);
    return clean;
  }
}

export async function fetchUlamaTafsirByAyah(
  surahNumber: number,
  ayahNumber: number
): Promise<UlamaTafsirInsight[]> {
  const verseKey = `${surahNumber}:${ayahNumber}`;
  const cached = TAFSIR_CACHE.get(verseKey);
  if (cached) return cached;

  const req = (async () => {
    const tasks = ULAMA_TAFSIR_SOURCES.map(async source => {
      const raw = await fetchTafsirTextByLanguage(source.id, verseKey, 'en');
      const excerpt = toTafsirExcerpt(raw);
      if (!excerpt) return null;
      return {
        sourceId: source.id,
        sourceName: source.name,
        verseKey,
        text: excerpt,
        sourceUrl: `https://quran.com/${verseKey}?tafsir=${source.id}`,
      } as UlamaTafsirInsight;
    });

    const settled = await Promise.allSettled(tasks);
    return settled
      .filter((item): item is PromiseFulfilledResult<UlamaTafsirInsight | null> => item.status === 'fulfilled')
      .map(item => item.value)
      .filter((item): item is UlamaTafsirInsight => !!item);
  })();

  TAFSIR_CACHE.set(verseKey, req);
  try {
    return await req;
  } catch (e) {
    TAFSIR_CACHE.delete(verseKey);
    throw e;
  }
}

export async function fetchUlamaTafsirFullByAyah(
  surahNumber: number,
  ayahNumber: number,
  sourceId: number
): Promise<UlamaTafsirFullInsight | null> {
  const verseKey = `${surahNumber}:${ayahNumber}`;
  const source = ULAMA_TAFSIR_SOURCES.find(item => item.id === sourceId);
  if (!source) return null;
  const cacheKey = `${verseKey}:${sourceId}`;
  const cached = TAFSIR_FULL_CACHE.get(cacheKey);
  if (cached) return cached;

  const req = (async () => {
    const [textArabic, textEnglish, textIndoOfficial] = await Promise.all([
      fetchTafsirTextByLanguage(sourceId, verseKey, 'ar'),
      fetchTafsirTextByLanguage(sourceId, verseKey, 'en'),
      fetchTafsirTextByLanguage(sourceId, verseKey, 'id'),
    ]);
    const textOriginal = textArabic || textEnglish || textIndoOfficial;
    if (!textOriginal) return null;
    const candidateIndonesian = textIndoOfficial || textOriginal;
    const textIndonesian = detectLikelyIndonesian(candidateIndonesian)
      ? candidateIndonesian
      : await translateToIndonesian(candidateIndonesian);
    return {
      sourceId,
      sourceName: source.name,
      verseKey,
      textOriginal,
      textEnglish,
      textIndonesian,
      sourceUrl: `https://quran.com/${verseKey}?tafsir=${sourceId}`,
    } as UlamaTafsirFullInsight;
  })();

  TAFSIR_FULL_CACHE.set(cacheKey, req);
  try {
    return await req;
  } catch {
    TAFSIR_FULL_CACHE.delete(cacheKey);
    return null;
  }
}

export async function fetchSurahChapterInfo(
  surahNumber: number,
  language = 'id'
): Promise<SurahChapterInfo> {
  const lang = String(language ?? '').trim() || 'id';
  const key = `${surahNumber}:${lang}`;
  const cached = SURAH_INFO_CACHE.get(key);
  if (cached) return cached;

  const req = (async () => {
    const loadByLanguage = async (langCode: string): Promise<SurahChapterInfo | null> => {
      const response = await fetch(`${QURAN_COM_API}/chapters/${surahNumber}/info?language=${langCode}`);
      if (!response.ok) return null;
      const json = (await response.json()) as QuranChapterInfoResponse;
      const chapter = json?.chapter_info;
      const shortText = normalizeChapterInfoText(String(chapter?.short_text ?? ''));
      const longTextRaw = normalizeChapterInfoText(String(chapter?.text ?? ''));
      const longText = longTextRaw || shortText;
      if (!shortText && !longText) return null;
      return {
        surahNumber,
        language: langCode,
        shortText: shortText || toExcerpt(longText, 420),
        longText,
        source: String(chapter?.source ?? 'Quran.com Chapter Info'),
        sourceUrl: `https://quran.com/${surahNumber}?tab=info`,
      };
    };

    const primary = await loadByLanguage(lang);
    if (primary) return primary;
    throw new Error('Gagal mengambil info surah dari sumber rujukan.');
  })();

  SURAH_INFO_CACHE.set(key, req);
  try {
    return await req;
  } catch (e) {
    SURAH_INFO_CACHE.delete(key);
    throw e;
  }
}

async function fetchChapterVersesByScript(
  surahNumber: number,
  script: ArabicScript
): Promise<QuranVerseByChapter[]> {
  const fields = SCRIPT_TO_TEXT_PRIORITY[script].join(',');
  const out: QuranVerseByChapter[] = [];
  let page = 1;
  for (let n = 0; n < MAX_VERSE_PAGES; n++) {
    const response = await fetch(
      `${QURAN_COM_API}/verses/by_chapter/${surahNumber}` +
      `?fields=${encodeURIComponent(fields)}&per_page=${VERSES_PER_PAGE}&page=${page}`
    );
    if (!response.ok) throw new Error('Gagal mengambil data ayat. Periksa koneksi internet Anda.');
    const json = (await response.json()) as QuranVerseByChapterResponse;
    const verses = Array.isArray(json?.verses) ? json.verses : [];
    if (verses.length === 0) break;
    out.push(...verses);
    const nextPage = Number(json?.pagination?.next_page ?? 0);
    if (!Number.isFinite(nextPage) || nextPage <= page) break;
    page = nextPage;
  }
  return out;
}

export async function fetchChapterNameTranslations(
  language: Lang = 'id'
): Promise<Record<number, string>> {
  const lang = normalizeContentLanguage(language);
  const cached = CHAPTER_NAME_CACHE.get(lang);
  if (cached) return cached;

  const req = (async () => {
    if (lang === 'id') {
      return Object.fromEntries(SURAH_LIST.map(surah => [surah.number, surah.indonesianName]));
    }

    const response = await fetch(`${QURAN_COM_API}/chapters?language=${lang}`);
    if (!response.ok) throw new Error('Gagal mengambil nama surah.');
    const json = (await response.json()) as {
      chapters?: Array<{ id?: number; translated_name?: { name?: string } }>;
    };
    const rows = Array.isArray(json?.chapters) ? json.chapters : [];
    const out: Record<number, string> = {};
    rows.forEach(chapter => {
      const id = Number(chapter?.id ?? 0);
      const name = normalizeInlineHtml(String(chapter?.translated_name?.name ?? ''));
      if (id > 0 && name) out[id] = name;
    });
    return out;
  })();

  CHAPTER_NAME_CACHE.set(lang, req);
  try {
    return await req;
  } catch (e) {
    CHAPTER_NAME_CACHE.delete(lang);
    throw e;
  }
}

async function fetchQuranComChapterTranslations(surahNumber: number, language: Lang): Promise<string[]> {
  const translationId = getQuranTranslationId(language);
  const response = await fetch(
    `${QURAN_COM_API}/quran/translations/${translationId}?chapter_number=${surahNumber}`
  );
  if (!response.ok) throw new Error('Gagal mengambil terjemahan ayat.');
  const json = (await response.json()) as QuranTranslationResponse;
  const rows = Array.isArray(json?.translations) ? json.translations : [];
  return rows.map(row => normalizeInlineHtml(String(row?.text ?? '')));
}

async function fetchQuranEncChapterTranslations(surahNumber: number): Promise<string[]> {
  const response = await fetch(
    `${QURANENC_API}/translation/sura/${QURANENC_INDONESIAN_TRANSLATION_KEY}/${surahNumber}`
  );
  if (!response.ok) throw new Error('Gagal mengambil terjemahan QuranEnc.');
  const json = (await response.json()) as QuranEncSurahTranslationResponse;
  const rows = Array.isArray(json?.result) ? json.result : [];
  if (!rows.length) throw new Error('Terjemahan QuranEnc kosong.');

  return rows
    .slice()
    .sort((a, b) => Number(a?.aya ?? 0) - Number(b?.aya ?? 0))
    .map(row => normalizeQuranEncTranslation(row));
}

async function fetchQuranEncAyahTranslation(surahNumber: number, ayahInSurah: number): Promise<string> {
  const response = await fetch(
    `${QURANENC_API}/translation/aya/${QURANENC_INDONESIAN_TRANSLATION_KEY}/${surahNumber}/${ayahInSurah}`
  );
  if (!response.ok) throw new Error('Gagal mengambil terjemahan QuranEnc.');
  const json = (await response.json()) as QuranEncAyahTranslationResponse;
  const row = json?.result;
  if (!row) throw new Error('Terjemahan QuranEnc kosong.');
  return normalizeQuranEncTranslation(row);
}

async function fetchChapterTranslations(surahNumber: number, language: Lang): Promise<string[]> {
  const lang = normalizeContentLanguage(language);
  if (lang === 'id') {
    try {
      return await fetchQuranEncChapterTranslations(surahNumber);
    } catch {
      return fetchQuranComChapterTranslations(surahNumber, lang);
    }
  }

  return fetchQuranComChapterTranslations(surahNumber, lang);
}

/** Ambil surah dengan teks Arab + terjemahan sesuai bahasa aplikasi. */
export async function fetchSurah(
  surahNumber: number,
  script: ArabicScript = DEFAULT_ARABIC_SCRIPT,
  language: Lang = 'id'
): Promise<SurahWithTranslation> {
  const normalizedScript = normalizeArabicScript(script);
  const lang = normalizeContentLanguage(language);
  const key = `${surahNumber}:${normalizedScript}:${lang}`;
  const cached = SURAH_CACHE.get(key);
  if (cached) return cached;

  const req = (async () => {
    const [verses, translations] = await Promise.all([
      fetchChapterVersesByScript(surahNumber, normalizedScript),
      fetchChapterTranslations(surahNumber, lang),
    ]);

    const meta = SURAH_LIST.find(s => s.number === surahNumber);
    const arabicAyahs: Ayah[] = verses.map((verse, index) => {
      const numberInSurah = getAyahNumberInSurah(verse, index + 1);
      return {
        number: Number(verse.id ?? numberInSurah),
        text: getScriptText(verse, normalizedScript),
        numberInSurah,
        juz: Number(verse.juz_number ?? 0),
        manzil: Number(verse.manzil_number ?? 0),
        page: Number(verse.page_number ?? 0),
        ruku: Number(verse.ruku_number ?? 0),
        hizbQuarter: Number(verse.rub_el_hizb_number ?? verse.hizb_number ?? 0),
        sajda: Number(verse.sajdah_number ?? 0) > 0,
      };
    });

    const translationAyahs: Ayah[] = arabicAyahs.map((ayah, index) => ({
      ...ayah,
      text: translations[index] ?? '',
    }));

    const surahMeta: Omit<Surah, 'ayahs'> = {
      number: surahNumber,
      name: meta?.name ?? '',
      englishName: meta?.englishName ?? `Surah ${surahNumber}`,
      englishNameTranslation: lang === 'id' ? (meta?.indonesianName ?? '') : '',
      numberOfAyahs: arabicAyahs.length,
      revelationType: meta?.type ?? '',
    };

    return {
      arabic: { ...surahMeta, ayahs: arabicAyahs },
      translation: { ...surahMeta, ayahs: translationAyahs },
    } as SurahWithTranslation;
  })();

  SURAH_CACHE.set(key, req);
  try {
    return await req;
  } catch (e) {
    SURAH_CACHE.delete(key);
    throw e;
  }
}

/**
 * Ambil teks tajwid per ayat (raw HTML dengan tag <tajweed class="...">).
 * Gunakan parseTajweedText() untuk memecah menjadi span berwarna.
 */
export async function fetchSurahTajweed(surahNumber: number): Promise<string[]> {
  const response = await fetch(`${BASE_URL}/surah/${surahNumber}/quran-tajweed`);
  if (!response.ok) throw new Error('Gagal mengambil data tajwid.');
  const json = await response.json();
  return (json.data.ayahs as any[]).map((a: any) => a.text as string);
}

/**
 * Ambil transliterasi Latin per ayat (untuk Mode Pemula).
 * Edisi: en.transliteration dari alquran.cloud.
 */
export async function fetchSurahTranslit(surahNumber: number): Promise<string[]> {
  const cached = TRANSLIT_CACHE.get(surahNumber);
  if (cached) return cached;

  const req = (async () => {
    const response = await fetch(`${BASE_URL}/surah/${surahNumber}/en.transliteration`);
    if (!response.ok) throw new Error('Gagal mengambil transliterasi.');
    const json = await response.json();
    return (json.data.ayahs as any[]).map((a: any) => a.text as string);
  })();

  TRANSLIT_CACHE.set(surahNumber, req);
  try {
    return await req;
  } catch (e) {
    TRANSLIT_CACHE.delete(surahNumber);
    throw e;
  }
}

const normalizeWordMeaning = (text: string): string =>
  text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Ambil data kata-per-kata untuk mode Pemula:
 * Arab + transliterasi + arti Indonesia per kata.
 * Sumber: api.quran.com (translation id 33 = Bahasa Indonesia).
 */
export async function fetchSurahWordByWord(
  surahNumber: number,
  language: Lang = 'id'
): Promise<SurahWordByWord> {
  const lang = normalizeContentLanguage(language);
  const translationId = getQuranTranslationId(lang);
  const cacheKey = `${surahNumber}:${lang}`;
  const cached = WBW_CACHE.get(cacheKey);
  if (cached) return cached;

  const req = (async () => {
  const perPage = 50; // jumlah ayat per halaman API
  const maxPages = 20;
  const out: SurahWordByWord = {};

  let page = 1;
  for (let n = 0; n < maxPages; n++) {
    const response = await fetch(
      `${QURAN_COM_API}/verses/by_chapter/${surahNumber}` +
      `?language=${lang}&words=true&word_fields=text_uthmani,translation,transliteration` +
      `&translations=${translationId}&per_page=${perPage}&page=${page}`
    );
    if (!response.ok) throw new Error('Gagal mengambil arti per kata.');

    const json = await response.json();
    const verses = (json?.verses ?? []) as any[];
    if (!Array.isArray(verses) || verses.length === 0) break;

    for (const verse of verses) {
      const verseKey = String(verse?.verse_key ?? '');
      const keyParts = verseKey.split(':');
      const numberInSurah = Number(keyParts[1]);
      if (!Number.isFinite(numberInSurah) || numberInSurah <= 0) continue;

      const words = (verse?.words ?? []) as any[];
      const mapped = words
        .filter((w: any) => w?.char_type_name === 'word' && (w?.text_uthmani || w?.text))
        .map((w: any): PemulaWordMeaning => ({
          arabic: String(w?.text_uthmani ?? w?.text ?? '').trim(),
          translit: normalizeWordMeaning(String(w?.transliteration?.text ?? '')),
          indonesian: normalizeWordMeaning(String(w?.translation?.text ?? '')),
        }))
        .filter((w: PemulaWordMeaning) => !!w.arabic);

      out[numberInSurah] = mapped;
    }

    const nextPage = Number(json?.pagination?.next_page ?? 0);
    if (!Number.isFinite(nextPage) || nextPage <= 0 || nextPage === page) break;
    page = nextPage;
  }

    return out;
  })();

  WBW_CACHE.set(cacheKey, req);
  try {
    return await req;
  } catch (e) {
    WBW_CACHE.delete(cacheKey);
    throw e;
  }
}

// ─── Daily Verse ─────────────────────────────────────────────────────────────

export async function fetchDailyVerse(language: Lang = 'id'): Promise<{
  arabic: string;
  translation: string;
  reference: string;
}> {
  const lang = normalizeContentLanguage(language);
  const translationEdition = QURAN_DAILY_VERSE_EDITIONS[lang];
  const total = 6236;
  const seed = new Date().getDate() + new Date().getMonth() * 31;
  const ayahNum = (seed % total) + 1;
  try {
    if (lang === 'id') {
      const { surahNumber, ayahInSurah } = getSurahAyahFromGlobalAyahNumber(ayahNum);
      const [arabicRes, translation] = await Promise.all([
        fetch(`${BASE_URL}/ayah/${ayahNum}/quran-uthmani`),
        fetchQuranEncAyahTranslation(surahNumber, ayahInSurah),
      ]);
      if (!arabicRes.ok) throw new Error('Gagal mengambil ayat harian.');
      const arabicJson = await arabicRes.json();
      const arabic = arabicJson?.data;
      return {
        arabic: arabic?.text ?? '',
        translation,
        reference: `QS. ${arabic?.surah?.englishName ?? `Surah ${surahNumber}`} [${surahNumber}:${ayahInSurah}]`,
      };
    }

    const res = await fetch(
      `${BASE_URL}/ayah/${ayahNum}/editions/quran-uthmani,${translationEdition}`
    );
    const json = await res.json();
    const arabic = json.data[0];
    const translation = json.data[1];
    return {
      arabic: arabic.text,
      translation: translation.text,
      reference: `QS. ${arabic.surah.englishName} [${arabic.surah.number}:${arabic.numberInSurah}]`,
    };
  } catch {
    return {
      arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
      translation: lang === 'en'
        ? 'Indeed, with hardship will be ease.'
        : 'Sesungguhnya beserta kesulitan ada kemudahan.',
      reference: 'QS. Al-Insyirah [94:6]',
    };
  }
}

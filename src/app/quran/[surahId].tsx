import { quranAudioService } from '@/services/quranAudioService';
import { useQuranAudioStore } from '@/stores/quranAudioStore';
import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Clipboard,
  Dimensions,
  Easing,
  FlatList,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsbabunNuzulEntry, getAsbabunNuzul } from '@/constants/asbabunNuzul';
import { LogoSvgIcon, type LogoSvgIconName } from '@/components/LogoSvgIcon';
import { JUZ_LIST } from '@/constants/juz';
import { SURAH_LIST } from '@/constants/surah';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import {
  analyzeTajweed,
  ARABIC_SCRIPTS,
  ArabicScript,
  DEFAULT_ARABIC_SCRIPT,
  DEFAULT_RECITER,
  fetchUlamaTafsirByAyah,
  getAudioUrl,
  getAyahAudioFallbackUrl,
  getIslamicNetworkAudioUrl,
  getSurahAudioUrl,
  normalizeArabicScript,
  RECITER_GROUPS,
  RECITERS,
  SurahWithTranslation,
  TAJWEED_GUIDE,
  type PemulaWordMeaning,
  type ReciterGroup,
  type ReciterSyncCapability,
  type SurahWordByWord,
  type UlamaTafsirInsight,
  type WordTimingSegment,
} from '@/services/quranService';
import {
  addBookmark,
  getBookmarks,
  getItem,
  removeBookmark,
  setItem,
  setLastRead,
  type BookmarkItem,
} from '@/services/storageService';
import {
  isQFLoggedIn,
  addQFBookmark,
  logQFReadingSession,
} from '@/services/quranFoundationAuthService';
import {
  downloadReciterAudioOfflineForSurah,
  ensureAllSurahContentOfflineAuto,
  fetchReciterWordTimingBySurahWithOffline,
  fetchSurahTranslitWithOffline,
  fetchSurahWithOffline,
  fetchSurahWordByWordWithOffline,
  getOfflineAyahAudioUri,
  getOfflineQuranAutoStatus,
  getOfflineSurahAudioUri,
  getReciterOfflineAudioStatus,
  removeReciterOfflineAudioForSurah,
  type OfflineAudioDownloadProgress,
  type OfflineQuranAutoStatus,
  type OfflineReciterAudioStatus,
} from '../../services/quranOfflineService';

// â"€â"€â"€ Types & Constants â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

type DisplayMode = 'normal' | 'tajweed' | 'pemula';
type AyahPlayMode = 'single' | 'continuous';
type JuzScrollItem =
  | { _k: 'sep'; surahNum: number }
  | { _k: 'bas'; surahNum: number }
  | { _k: 'ld'; surahNum: number }
  | { _k: 'ay'; surahNum: number; idx: number; s: SurahWithTranslation };
type OfflineTaskState = {
  kind: 'bundle' | 'audio';
  label: string;
  current: number;
  total: number;
};
type QuranReaderPrefs = {
  script?: ArabicScript;
  displayMode?: DisplayMode;
  ayahPlayMode?: AyahPlayMode;
  fontSize?: number;
  showTranslation?: boolean;
  reciterId?: string;
  showReaderTips?: boolean;
  showOnlyAsbabAyahs?: boolean;
};

const STORAGE_KEY = 'muslimmate_quran_prefs';

const MODE_OPTIONS: { id: DisplayMode; icon: keyof typeof Ionicons.glyphMap; label: string; desc: string }[] = [
  { id: 'normal',  icon: 'book-outline',         label: 'Normal',  desc: 'Tampilan standar dengan bookmark & asbabun nuzul' },
  { id: 'tajweed', icon: 'color-palette-outline', label: 'Tajwid',  desc: 'Teks Arab diwarnai sesuai hukum tajwid' },
  { id: 'pemula',  icon: 'school-outline',        label: 'Belajar', desc: 'Kata per kata + transliterasi Latin, cocok untuk latihan' },
];

type ReciterGroupIconMeta =
  | { asset: LogoSvgIconName }
  | { ionicon: keyof typeof Ionicons.glyphMap };

const RECITER_GROUP_ICON_META: Record<ReciterGroup, ReciterGroupIconMeta> = {
  haram: { asset: 'kaaba' },
  nabawi: { asset: 'mosque' },
  lainnya: { ionicon: 'earth' },
};

const RECITER_CAPABILITY_META: Record<ReciterSyncCapability, { dot: string; title: string; short: string; desc: string }> = {
  full: {
    dot: '#10B981',
    title: 'Lengkap (Highlight + Ikuti Ayat)',
    short: 'Highlight + Ikuti',
    desc: 'Sinkron kata per kata + ayat otomatis ikut.',
  },
  follow: {
    dot: '#3B82F6',
    title: 'Ikuti Ayat',
    short: 'Ikuti Ayat',
    desc: 'Ayat aktif otomatis diikuti, tanpa highlight kata presisi.',
  },
  audio: {
    dot: '#FFFFFF',
    title: 'Audio Saja',
    short: 'Audio Saja',
    desc: 'Hanya putar suara tanpa follow ayat otomatis.',
  },
};

const resolveReciterById = (id?: string | null) =>
  RECITERS.find(r => r.id === id) ?? DEFAULT_RECITER;

const ARABIC_FONT_MIN = 18;
const ARABIC_FONT_MAX = 40;
const ARABIC_FONT_PREVIEW_TEXT = '\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650';
const ARABIC_FONT_FAMILY_WEB = "'Noto Naskh Arabic', 'Amiri', 'Scheherazade New', 'Traditional Arabic', 'Times New Roman', serif";
const ARABIC_FONT_FAMILY_DEFAULT = Platform.select({
  ios: 'Geeza Pro',
  android: 'Noto Naskh Arabic',
  web: ARABIC_FONT_FAMILY_WEB,
  default: 'serif',
}) as string;
const getArabicFontFamily = (activeScript: ArabicScript): string => {
  if (Platform.OS === 'web') return ARABIC_FONT_FAMILY_WEB;
  if (Platform.OS === 'ios') return 'Geeza Pro';
  if (Platform.OS === 'android') {
    if (activeScript === 'indopak') return 'Noto Nastaliq Urdu';
    return 'Noto Naskh Arabic';
  }
  return ARABIC_FONT_FAMILY_DEFAULT;
};
const WEB_READER_MAX_WIDTH = 980;

type GuideEntry = {
  label: string;
  color: string;
  category: string;
  how: string;
  steps: string[];
  example: string;
  tip: string;
  youtube: string;
};

const WAQF_GUIDE: Record<string, GuideEntry> = {
  waqf_lazim: {
    label: 'Waqaf Lazim (ۘ)',
    color: '#EF4444',
    category: 'Tanda Baca Waqaf',
    how: 'Tanda ini menunjukkan berhenti sangat dianjurkan agar makna tetap tepat.',
    steps: [
      'Berhenti di tanda ini sebelum lanjut.',
      'Ambil napas secukupnya lalu teruskan bacaan.',
    ],
    example: '... ۘ ...',
    tip: 'Jika dipaksa sambung, makna kalimat bisa berubah.',
    youtube: 'https://www.youtube.com/results?search_query=waqaf+lazim+tajwid',
  },
  waqf_qila: {
    label: 'Waqaf Aula ۗ ',
    color: '#F97316',
    category: 'Tanda Baca Waqaf',
    how: 'Lebih baik berhenti di sini dibanding terus tanpa jeda.',
    steps: [
      'Berhenti sejenak di tanda ini.',
      'Lanjutkan dengan tartil setelah jeda.',
    ],
    example: '... ۗ ...',
    tip: 'Gunakan jeda pendek agar alur ayat tetap nyaman.',
    youtube: 'https://www.youtube.com/results?search_query=tanda+waqaf+qila',
  },
  waqf_salla: {
    label: 'Waqaf Washal Aula ۖ',
    color: '#22C55E',
    category: 'Tanda Baca Waqaf',
    how: 'Lebih baik disambung, namun berhenti tetap diperbolehkan.',
    steps: [
      'Utamakan sambung bacaan jika napas cukup.',
      'Boleh berhenti jika perlu menjaga ritme napas.',
    ],
    example: '... ۖ ...',
    tip: 'Prioritaskan tartil dan kejelasan makhraj.',
    youtube: 'https://www.youtube.com/results?search_query=tanda+waqaf+salla',
  },
  waqf_jaiz: {
    label: 'Waqaf Jaiz (ۚ)',
    color: '#F59E0B',
    category: 'Tanda Baca Waqaf',
    how: 'Boleh berhenti atau lanjut, keduanya sama-sama dibolehkan.',
    steps: [
      'Sesuaikan dengan panjang nafas.',
      'Jaga kesinambungan makna saat memutus bacaan.',
    ],
    example: '... ۚ ...',
    tip: 'Untuk pemula, berhenti pendek biasanya lebih aman.',
    youtube: 'https://www.youtube.com/results?search_query=tanda+waqaf+jaiz',
  },
  waqf_la: {
    label: 'Laa Taqif (ۙ)',
    color: '#8B5CF6',
    category: 'Tanda Baca Waqaf',
    how: 'Jangan berhenti di tanda ini kecuali darurat (kehabisan napas).',
    steps: [
      'Usahakan tetap menyambung bacaan.',
      'Jika terpaksa berhenti, ulangi dari potongan makna yang tepat.',
    ],
    example: '... ۙ ...',
    tip: 'Tanda ini penting untuk menjaga makna ayat.',
    youtube: 'https://www.youtube.com/results?search_query=la+taqif+tanda+waqaf',
  },
  waqf_muraqabah: {
    label: "Waqaf Mu'anaqah (ۛ)",
    color: '#06B6D4',
    category: 'Tanda Baca Waqaf',
    how: 'Saat ada pasangan tanda ini, pilih berhenti di salah satu tempat saja.',
    steps: [
      'Jangan berhenti di kedua tanda sekaligus.',
      'Pilih titik yang paling menjaga alur makna.',
    ],
    example: '... ۛ ... ۛ ...',
    tip: 'Biasanya dipakai untuk pilihan titik jeda pada struktur kalimat.',
    youtube: "https://www.youtube.com/results?search_query=waqaf+mu'anaqah",
  },
  waqf_saktah: {
    label: 'Saktah (ۜ)',
    color: '#EC4899',
    category: 'Tanda Baca Waqaf',
    how: 'Berhenti sangat singkat tanpa mengambil napas.',
    steps: [
      'Tahan suara sangat pendek.',
      'Lanjutkan bacaan tanpa tarikan napas baru.',
    ],
    example: '... ۜ ...',
    tip: 'Latih dengan tempo pelan agar jedanya tidak terlalu panjang.',
    youtube: 'https://www.youtube.com/results?search_query=saktah+dalam+tajwid',
  },
  ayah_end_mark: {
    label: 'Akhir Ayat (۝)',
    color: '#60A5FA',
    category: 'Tanda Mushaf',
    how: 'Penanda akhir ayat, biasanya menjadi tempat jeda yang nyaman.',
    steps: [
      'Boleh berhenti normal di akhir ayat.',
      'Mulai ayat berikutnya dengan tempo yang stabil.',
    ],
    example: '... ۝',
    tip: 'Gunakan akhir ayat sebagai checkpoint nafas saat murajaah.',
    youtube: 'https://www.youtube.com/results?search_query=tanda+akhir+ayat+quran',
  },
  hizb_mark: {
    label: 'Tanda Hizb (۞)',
    color: '#A78BFA',
    category: 'Tanda Mushaf',
    how: 'Penanda pembagian hizb/rubu dalam mushaf, bukan hukum tajwid.',
    steps: [
      'Gunakan sebagai patokan target bacaan.',
      'Tidak mengubah cara baca huruf secara tajwid.',
    ],
    example: '... ۞ ...',
    tip: 'Cocok untuk pembagian target tilawah harian.',
    youtube: 'https://www.youtube.com/results?search_query=tanda+hizb+al+quran',
  },
  sajdah_mark: {
    label: 'Tanda Sajdah (۩)',
    color: '#14B8A6',
    category: 'Tanda Mushaf',
    how: 'Penanda ayat sajdah; dibaca normal dan diikuti sujud tilawah sesuai kaidah.',
    steps: [
      'Selesaikan bacaan ayat dengan tartil.',
      'Lakukan sujud tilawah bila ingin mengamalkan tanda ini.',
    ],
    example: '... ۩ ...',
    tip: 'Status sujud tilawah mengikuti fiqih yang kamu pegang.',
    youtube: 'https://www.youtube.com/results?search_query=tanda+sajdah+quran',
  },
};

const GUIDE_CONTENT_EN: Record<string, Partial<GuideEntry>> = {
  ham_wasl: {
    label: 'Hamzah Wasl',
    category: 'Hamzah',
    how: 'This hamzah is not pronounced when connected to the previous word.',
    steps: [
      'If it starts a phrase after a stop, pronounce the hamzah.',
      'If it is connected with the previous word, skip the hamzah and continue to the next letter.',
    ],
    example: 'ٱ - pronounced at the start, dropped in the middle of a phrase',
    tip: 'Look for the small mark above the alif (ٱ).',
  },
  laam_shamsiyah: {
    label: 'Solar Lam',
    category: 'Lam',
    how: 'The lam in "Al" (ال) is not pronounced; the next letter is read with shaddah.',
    steps: [
      'This happens when "ال" meets one of the 14 solar letters: ت ث د ذ ر ز س ش ص ض ط ظ ل ن.',
      'Do not pronounce the lam. Double the next letter instead.',
    ],
    example: 'الشَّمْسُ - read as "Ash-Shamsu", not "Al-Shamsu"',
    tip: 'The opposite is lunar lam, where the lam is still pronounced.',
  },
  madda_normal: {
    label: "Madd Tabi'i",
    category: 'Madd',
    how: 'Lengthen the sound for 2 counts.',
    steps: [
      'It occurs with alif after fathah, waw sukun after dammah, or ya sukun after kasrah.',
      'Hold the madd for 2 counts, like silently counting one-two.',
    ],
    example: 'قَالَ (qaa-la) · يَقُولُ (ya-quu-lu) · قِيلَ (qii-la)',
    tip: "Madd Tabi'i is the base form of madd when no other cause changes its length.",
  },
  madda_permissible: {
    label: "Madd Ja'iz Munfasil",
    category: 'Madd',
    how: 'Lengthen for 2, 4, or 5 counts, then keep the same choice consistently.',
    steps: [
      'It occurs when a madd letter meets hamzah in a separate word.',
      'In the common Hafs style, 4-5 counts is widely used.',
      'Keep one length consistently throughout the recitation.',
    ],
    example: 'إِنَّا أَعْطَيْنَاكَ - madd in "إِنَّا" before "أَعْطَيْنَاكَ"',
    tip: 'Munfasil means separated: the madd and hamzah are in different words.',
  },
  madda_necessary: {
    label: 'Madd Lazim',
    category: 'Madd',
    how: 'This must be lengthened for 6 counts.',
    steps: [
      'It occurs when madd meets sukun or shaddah.',
      'Hold it for 6 counts, like counting one to six steadily.',
    ],
    example: 'وَلَا الضَّالِّينَ - on "الضَّالِّينَ"',
    tip: 'Lazim means necessary. Six counts is the longest common madd length.',
  },
  madda_obligatory: {
    label: 'Madd Wajib Muttasil',
    category: 'Madd',
    how: 'Lengthen for 4-5 counts; it should not be shortened to only 2 counts.',
    steps: [
      'It occurs when a madd letter meets hamzah in the same word.',
      'In Hafs, read it for 4 or 5 counts.',
    ],
    example: 'جَاءَ · سَاءَ · سُوءَ · جِيءَ',
    tip: 'Muttasil means connected: the madd and hamzah are in the same word.',
  },
  madda_prolonged: {
    label: 'Madd Lazim',
    category: 'Madd',
    how: 'This must be lengthened for 6 counts.',
    steps: ['Read it like Madd Lazim: 6 counts without shortening.'],
    example: 'حمۤ · الۤمۤ · الۤرٰ',
    tip: 'This often appears in the opening letters of some surahs.',
  },
  qalaqah: {
    label: 'Qalqalah',
    category: 'Letter Quality',
    how: 'Qalqalah letters have a slight echo or bounce when they carry sukun or are stopped on.',
    steps: [
      'The qalqalah letters are ق ط ب ج د.',
      'Middle of a word gives a lighter bounce.',
      'Stopping at the end of an ayah gives a stronger bounce.',
      'Let the sound rebound briefly after pronouncing the letter.',
    ],
    example: 'يَقْطَعُونَ · وَالْفَجْرِ',
    tip: 'The bounce becomes stronger when stopping at the end.',
  },
  ikhafa: {
    label: "Ikhfa' Haqiqi",
    category: 'Nun Sakinah & Tanwin',
    how: 'When nun sakinah or tanwin meets one of the ikhfa letters, hide the nun sound with ghunnah for 2 counts.',
    steps: [
      'The 15 ikhfa letters are ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك.',
      'The nun is neither fully clear nor fully merged.',
      'Prepare the mouth for the next letter while keeping nasal ghunnah for 2 counts.',
    ],
    example: 'مَنْ كَانَ - nun meets kaf',
    tip: 'Think of the nun sound as softly hidden while moving toward the next letter.',
  },
  ikhafa_shafawi: {
    label: "Ikhfa' Shafawi",
    category: 'Mim Sakinah',
    how: 'When mim sakinah meets ba, hide the mim slightly with ghunnah for 2 counts.',
    steps: [
      'This is specific to mim sakinah meeting ba.',
      'The lips nearly close for ba while the mim is read softly.',
      'Keep nasal ghunnah for 2 counts.',
    ],
    example: 'تَرْمِيهِم بِحِجَارَةٍ - mim meets ba',
    tip: 'Shafawi relates to the lips, because this rule uses lip letters.',
  },
  idgham_shafawi: {
    label: 'Idgham Shafawi',
    category: 'Mim Sakinah',
    how: 'When mim sakinah meets another mim, merge into the next mim with ghunnah for 2 counts.',
    steps: [
      'Mim sakinah meets mim in the next word.',
      'The two mims merge into one strengthened mim.',
      'Read it with nasal ghunnah for 2 counts.',
    ],
    example: 'لَكُمْ مَا كَسَبْتُمْ - mim meets mim',
    tip: 'Unlike ikhfa shafawi, this is a full merge.',
  },
  idgham_with_ghunnah: {
    label: 'Idgham with Ghunnah',
    category: 'Nun Sakinah & Tanwin',
    how: 'When nun sakinah or tanwin meets ي ن م و, merge into the next letter with ghunnah for 2 counts.',
    steps: [
      'The four letters are ي ن م و.',
      'The nun or tanwin is merged and not pronounced separately.',
      'Keep nasal ghunnah while moving into the next letter.',
    ],
    example: 'مَن يَعْمَلْ · مِن وَرَاءِ',
    tip: 'This applies when the nun and idgham letter are in different words.',
  },
  idgham_wo_ghunnah: {
    label: 'Idgham without Ghunnah',
    category: 'Nun Sakinah & Tanwin',
    how: 'When nun sakinah or tanwin meets ل or ر, merge completely without nasal ghunnah.',
    steps: [
      'The two letters are lam and ra.',
      'The nun disappears fully into the next letter.',
      'It must be in a different word.',
    ],
    example: 'مِن رَّبِّهِمْ · مِن لَّدُنْهُ',
    tip: 'This is a full merge with no lingering nasal sound.',
  },
  iqlab: {
    label: 'Iqlab',
    category: 'Nun Sakinah & Tanwin',
    how: 'When nun sakinah or tanwin meets ba, change it into a soft mim with ghunnah for 2 counts.',
    steps: [
      'This rule has one letter: ba.',
      'The nun or tanwin changes into a hidden mim.',
      'Close the lips like mim, hold ghunnah, then pronounce ba.',
    ],
    example: 'مِنْ بَعْدِ - nun plus ba is read like a soft mim',
    tip: 'Iqlab means changing. The mushaf often marks it with a small mim.',
  },
  ghunnah: {
    label: 'Ghunnah',
    category: 'Letter Quality',
    how: 'Nun or mim with shaddah is read with nasal sound for 2 counts.',
    steps: [
      'It applies to nun with shaddah and mim with shaddah.',
      'Hold the nasal sound for 2 counts.',
      'Make sure the air flows through the nose.',
    ],
    example: 'إِنَّ · ثُمَّ · مِمَّا',
    tip: 'Close the mouth and feel the vibration in the nose to check the ghunnah.',
  },
  waqf_lazim: {
    label: 'Required Stop (ۘ)',
    category: 'Waqf Marks',
    how: 'Stopping here is strongly recommended so the meaning stays clear.',
    steps: ['Stop at this mark before continuing.', 'Take a comfortable breath, then continue.'],
    tip: 'Forcing the connection may affect the meaning.',
  },
  waqf_qila: {
    label: 'Better to Stop (ۗ)',
    category: 'Waqf Marks',
    how: 'It is better to stop here than to continue without a pause.',
    steps: ['Pause briefly at this mark.', 'Continue with a steady recitation after the pause.'],
    tip: 'A short pause helps preserve the flow of the ayah.',
  },
  waqf_salla: {
    label: 'Better to Continue (ۖ)',
    category: 'Waqf Marks',
    how: 'Continuing is preferred, though stopping is still allowed.',
    steps: ['Continue if your breath is enough.', 'Stop if you need to keep your recitation steady.'],
    tip: 'Prioritize tartil and clear pronunciation.',
  },
  waqf_jaiz: {
    label: 'Permissible Stop (ۚ)',
    category: 'Waqf Marks',
    how: 'You may stop or continue; both are allowed.',
    steps: ['Choose based on your breath.', 'Keep the meaning connected when you pause.'],
    tip: 'For beginners, a short stop is often easier.',
  },
  waqf_la: {
    label: 'Do Not Stop (ۙ)',
    category: 'Waqf Marks',
    how: 'Do not stop here unless necessary, such as running out of breath.',
    steps: ['Try to continue the recitation.', 'If forced to stop, repeat from a suitable meaning point.'],
    tip: 'This mark helps protect the meaning of the ayah.',
  },
  waqf_muraqabah: {
    label: "Mu'anaqah Stop (ۛ)",
    category: 'Waqf Marks',
    how: 'When this mark appears as a pair, stop at only one of the two places.',
    steps: ['Do not stop at both paired marks.', 'Choose the point that best preserves the meaning.'],
    tip: 'It marks alternative pause points in the sentence.',
  },
  waqf_saktah: {
    label: 'Saktah (ۜ)',
    category: 'Waqf Marks',
    how: 'Pause very briefly without taking a breath.',
    steps: ['Hold the voice for a very short moment.', 'Continue without a new breath.'],
    tip: 'Practice slowly so the pause does not become too long.',
  },
  ayah_end_mark: {
    label: 'End of Ayah (۝)',
    category: 'Mushaf Marks',
    how: 'This marks the end of an ayah and is usually a natural pause point.',
    steps: ['You may stop normally at the end of the ayah.', 'Begin the next ayah with a steady pace.'],
    tip: 'Use ayah endings as breathing checkpoints during review.',
  },
  hizb_mark: {
    label: 'Hizb Mark (۞)',
    category: 'Mushaf Marks',
    how: 'This divides the mushaf into hizb/rub sections; it is not a tajweed rule.',
    steps: ['Use it as a reading target marker.', 'It does not change how letters are recited.'],
    tip: 'Helpful for daily tilawah targets.',
  },
  sajdah_mark: {
    label: 'Sajdah Mark (۩)',
    category: 'Mushaf Marks',
    how: 'This marks an ayah of prostration; read it normally and perform sujud tilawah according to the rule you follow.',
    steps: ['Complete the ayah calmly.', 'Perform sujud tilawah if you intend to act on this mark.'],
    tip: 'The ruling of sujud tilawah follows the fiqh view you practice.',
  },
};

const WAQF_RULE_BY_CHAR: Record<string, string> = {
  '\u06D6': 'waqf_salla',      // ۖ
  '\u06D7': 'waqf_qila',       // ۗ
  '\u06D8': 'waqf_lazim',      // ۘ
  '\u06D9': 'waqf_la',         // ۙ
  '\u06DA': 'waqf_jaiz',       // ۚ
  '\u06DB': 'waqf_muraqabah',  // ۛ
  '\u06DC': 'waqf_saktah',     // ۜ
  '\u06DD': 'ayah_end_mark',   // ۝
  '\uFD3F': 'ayah_end_mark',   // ﴿
  '\uFD3E': 'ayah_end_mark',   // ﴾
  '\u06DE': 'hizb_mark',       // ۞
  '\u06E9': 'sajdah_mark',     // ۩
};

const WAQF_CHARS = new Set(Object.keys(WAQF_RULE_BY_CHAR));
const WAQF_RULE_PRIORITY: Record<string, number> = {
  waqf_lazim: 1,
  waqf_la: 2,
  waqf_qila: 3,
  waqf_salla: 4,
  waqf_jaiz: 5,
  waqf_muraqabah: 6,
  waqf_saktah: 7,
  ayah_end_mark: 8,
  hizb_mark: 9,
  sajdah_mark: 10,
};

const pickDominantWaqfMarker = (chars: string[]): { char: string; rule: string } | null => {
  if (!chars.length) return null;
  let bestChar = chars[chars.length - 1];
  let bestRule = WAQF_RULE_BY_CHAR[bestChar] ?? 'waqf_jaiz';
  let bestScore = WAQF_RULE_PRIORITY[bestRule] ?? 99;

  chars.forEach(ch => {
    const rule = WAQF_RULE_BY_CHAR[ch];
    if (!rule) return;
    const score = WAQF_RULE_PRIORITY[rule] ?? 99;
    if (score < bestScore) {
      bestScore = score;
      bestChar = ch;
      bestRule = rule;
    }
  });

  return { char: bestChar, rule: bestRule };
};
const AYAH_END_MARK_CHAR = '\u06DD';
const ORNATE_LEFT_PAREN = '\uFD3F';
const ORNATE_RIGHT_PAREN = '\uFD3E';
const ARABIC_INDIC_DIGITS = ['\u0660', '\u0661', '\u0662', '\u0663', '\u0664', '\u0665', '\u0666', '\u0667', '\u0668', '\u0669'];
const AYAH_MARKER_DIGIT_RE = /[0-9\u0660-\u0669]/;

const GUIDE_MAP: Record<string, GuideEntry> = {
  ...TAJWEED_GUIDE,
  ...WAQF_GUIDE,
};

const GUIDE_COLOR_MAP: Record<string, string> = Object.entries(GUIDE_MAP).reduce((acc, [key, guide]) => {
  acc[key] = guide.color;
  return acc;
}, {} as Record<string, string>);

// Kelompokkan aturan panduan per kategori untuk legenda
const LEGEND_BY_CATEGORY: Record<string, string[]> = {};
Object.entries(GUIDE_MAP).forEach(([key, val]) => {
  if (!LEGEND_BY_CATEGORY[val.category]) LEGEND_BY_CATEGORY[val.category] = [];
  LEGEND_BY_CATEGORY[val.category].push(key);
});

// Tips membaca Al-Qur'an untuk pemula
const READING_TIPS = [
  {
    icon: 'volume-high-outline',
    text: { id: 'Dengarkan audio dulu, lalu ikuti bacaan perlahan', en: 'Listen to the audio first, then follow the recitation slowly' },
  },
  {
    icon: 'repeat-outline',
    text: { id: 'Ulangi setiap ayat minimal 3 kali sebelum lanjut', en: 'Repeat each ayah at least 3 times before moving on' },
  },
  {
    icon: 'text-outline',
    text: { id: 'Baca transliterasi Latin jika belum hafal huruf Arab', en: 'Use Latin transliteration if you are still learning Arabic letters' },
  },
  {
    icon: 'mic-outline',
    text: { id: 'Perhatikan harakat (fathah, kasrah, dhammah) pada setiap huruf', en: 'Pay attention to the vowels on each letter' },
  },
  {
    icon: 'time-outline',
    text: { id: 'Lebih baik sedikit tapi konsisten daripada banyak tapi jarang', en: 'A little consistently is better than a lot rarely' },
  },
];

// â"€â"€â"€ Helper: strip bismillah dari ayat 1 â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const BASMALLAH_NORM = '\u0628\u0633\u0645\u0627\u0644\u0644\u0647\u0627\u0644\u0631\u062D\u0645\u0646\u0627\u0644\u0631\u062D\u064A\u0645'; // basmalah tanpa harakat/spasi

const BASMALLAH_TEXT = '\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u0651\u064e\u062D\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064e\u062D\u0650\u064A\u0645\u0650';

const isArabicDiacriticForStrip = (cp: number): boolean =>
  (cp >= 0x064B && cp <= 0x065F) ||
  (cp >= 0x0610 && cp <= 0x061A) ||
  cp === 0x0670 ||
  (cp >= 0x06D6 && cp <= 0x06ED);

const normalizeArabicCharForStrip = (ch: string): string => {
  switch (ch) {
    case '\u0671': // alif wasla
    case '\u0622': // alif madda
    case '\u0623': // alif hamza above
    case '\u0624': // waw hamza
    case '\u0625': // alif hamza below
    case '\u0626': // ya hamza
      return '\u0627';
    default:
      return ch;
  }
};

const stripBasmallah = (text: string): string => {
  let norm = '';
  const posAfterNormChar: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);
    const ch = text[i];

    if (cp === 0x20 || cp === 0x00A0 || cp === 0x200C || cp === 0x200D || cp === 0x0640) continue;
    if (isArabicDiacriticForStrip(cp)) continue;
    if (cp < 0x0621 || cp > 0x06FF) break;

    norm += normalizeArabicCharForStrip(ch);
    posAfterNormChar.push(i + 1);
    if (norm.length >= BASMALLAH_NORM.length) break;
  }

  if (!norm.startsWith(BASMALLAH_NORM)) return text;

  let cutPos = posAfterNormChar[BASMALLAH_NORM.length - 1] ?? 0;
  while (cutPos < text.length) {
    const cp = text.charCodeAt(cutPos);
    const isSkippable =
      cp === 0x20 || cp === 0x00A0 || cp === 0x200C || cp === 0x200D || cp === 0x0640 ||
      isArabicDiacriticForStrip(cp) ||
      cp === 0x06DD || cp === 0x06DE || cp === 0x06E9 || cp === 0x06DF || cp === 0x06E0 ||
      (cp >= 0x0660 && cp <= 0x0669) || (cp >= 0x06F0 && cp <= 0x06F9);
    if (!isSkippable) break;
    cutPos++;
  }

  return cutPos < text.length ? text.slice(cutPos) : text;
};

// Normalisasi ringan untuk mode pemula agar pairing kata Arab/Latin lebih stabil.
const splitArabicWordsPemula = (text: string): string[] =>
  text
    .replace(/[\u06D6-\u06ED\u06DD\u06DE\u06E9\u06DF\u06E0]/g, '') // tanda waqaf/ornamen mushaf
    .replace(/[ÛžÛ©]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const splitTranslitWordsPemula = (text: string): string[] =>
  text
    .replace(/[\u201C\u201D"(),.:;!?\u060C\u061B]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const normalizeTranslitPemula = (text: string): string =>
  text
    .replace(/\s+/g, ' ')
    .trim();

const normalizeMeaningPemula = (text: string): string =>
  text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const dropLeadingWords = (text: string, wordsToDrop: number): string => {
  if (wordsToDrop <= 0) return normalizeTranslitPemula(text);
  const words = splitTranslitWordsPemula(text);
  if (!words.length) return '';
  return words.slice(Math.min(wordsToDrop, words.length)).join(' ');
};

const normalizeArabicWordForPemulaMatch = (word: string): string =>
  word
    .replace(/[\u06D6-\u06ED\u06DD\u06DE\u06E9\u06DF\u06E0]/g, '')
    .replace(/[ÛžÛ©]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '')
    .replace(/[\u0671\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0621/g, '')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0649/g, '\u064A')
    .replace(/[^\u0621-\u063A\u0641-\u064A]/g, '')
    .trim();

const scoreArabicWordMatchPemula = (target: string, source: string): number => {
  if (!target || !source) return -2;
  if (target === source) return 4;

  const targetNoAl = target.startsWith('\u0627\u0644') ? target.slice(2) : target;
  const sourceNoAl = source.startsWith('\u0627\u0644') ? source.slice(2) : source;
  if (targetNoAl && sourceNoAl && targetNoAl === sourceNoAl) return 3;

  if (target.startsWith(source) || source.startsWith(target)) return 2;
  if (target.includes(source) || source.includes(target)) return 1;
  return -2;
};

const alignWordByWordToArabicWords = (
  displayedArabicWords: string[],
  wordByWordRaw: PemulaWordMeaning[]
): PemulaWordMeaning[] => {
  if (!displayedArabicWords.length || !wordByWordRaw.length) return [];

  const targetNorm = displayedArabicWords.map(normalizeArabicWordForPemulaMatch);
  const sourceNorm = wordByWordRaw.map(w => normalizeArabicWordForPemulaMatch(w.arabic));

  type AlignCandidate = {
    aligned: PemulaWordMeaning[];
    strongMatches: number;
    score: number;
  };

  const buildCandidate = (start: number): AlignCandidate => {
    const aligned: PemulaWordMeaning[] = [];
    let srcIdx = start;
    let strongMatches = 0;
    let score = 0;

    for (let i = 0; i < displayedArabicWords.length; i++) {
      const direct = srcIdx < wordByWordRaw.length ? wordByWordRaw[srcIdx] : null;
      const next = srcIdx + 1 < wordByWordRaw.length ? wordByWordRaw[srcIdx + 1] : null;
      const targetWordNorm = targetNorm[i];
      const directNorm = srcIdx < sourceNorm.length ? sourceNorm[srcIdx] : '';
      const directScore = direct
        ? scoreArabicWordMatchPemula(targetWordNorm, directNorm)
        : Number.NEGATIVE_INFINITY;

      let merged: PemulaWordMeaning | null = null;
      let mergedScore = Number.NEGATIVE_INFINITY;
      if (direct && next) {
        merged = {
          arabic: `${direct.arabic}${next.arabic}`,
          translit: normalizeTranslitPemula([direct.translit, next.translit].filter(Boolean).join(' ')),
          indonesian: normalizeMeaningPemula([direct.indonesian, next.indonesian].filter(Boolean).join(' ')),
        };
        mergedScore = scoreArabicWordMatchPemula(
          targetWordNorm,
          normalizeArabicWordForPemulaMatch(merged.arabic)
        );
      }

      if (merged && mergedScore > directScore && mergedScore >= 2) {
        aligned.push(merged);
        srcIdx += 2;
        score += mergedScore;
        if (mergedScore >= 3) strongMatches++;
        continue;
      }

      if (direct) {
        aligned.push(direct);
        srcIdx += 1;
        score += directScore;
        if (directScore >= 3) strongMatches++;
        continue;
      }

      aligned.push({ arabic: displayedArabicWords[i], translit: '', indonesian: '' });
      score -= 2;
    }

    return { aligned, strongMatches, score };
  };

  let best = buildCandidate(0);
  for (let start = 1; start < sourceNorm.length; start++) {
    const candidate = buildCandidate(start);
    if (
      candidate.strongMatches > best.strongMatches ||
      (candidate.strongMatches === best.strongMatches && candidate.score > best.score)
    ) {
      best = candidate;
    }
  }

  const matchRatio = best.strongMatches / Math.max(1, displayedArabicWords.length);

  // Jika kualitas mapping sangat rendah dan jumlah kata sumber beda,
  // abaikan WBW agar tidak menampilkan pasangan Arab/arti yang salah.
  if (matchRatio < 0.35 && wordByWordRaw.length !== displayedArabicWords.length) {
    return [];
  }

  return best.aligned;
};

const expandWordByWordPemula = (words: PemulaWordMeaning[]): PemulaWordMeaning[] => {
  if (!words.length) return [];

  const expanded: PemulaWordMeaning[] = [];
  for (const word of words) {
    const pieces = splitArabicWordsPemula(word.arabic);
    if (pieces.length <= 1) {
      expanded.push(word);
      continue;
    }

    pieces.forEach((piece, idx) => {
      expanded.push({
        arabic: piece,
        translit: idx === 0 ? word.translit : '',
        indonesian: idx === 0 ? word.indonesian : '',
      });
    });
  }

  return expanded;
};

const alignTranslitToArabicWords = (arabicWords: string[], translitWords: string[]): string[] => {
  const n = arabicWords.length;
  const m = translitWords.length;
  if (!n) return [];
  if (!m) return new Array(n).fill('');
  if (m === n) return translitWords;
  return new Array(n).fill('');
};

const isArabicDiacriticPemula = (ch: string): boolean => {
  const cp = ch.charCodeAt(0);
  return (
    (cp >= 0x064B && cp <= 0x065F) ||
    (cp >= 0x0610 && cp <= 0x061A) ||
    cp === 0x0670 ||
    (cp >= 0x06D6 && cp <= 0x06ED)
  );
};

const transliterateArabicWordPemula = (word: string): string => {
  const FATHAH = '\u064E';
  const KASRAH = '\u0650';
  const DHAMMAH = '\u064F';
  const SUKUN = '\u0652';
  const SHADDA = '\u0651';
  const FATHATAN = '\u064B';
  const KASRATAN = '\u064D';
  const DHAMMATAN = '\u064C';

  const ALIF = '\u0627';
  const WAW = '\u0648';
  const YA = '\u064A';
  const TA_MARBUTA = '\u0629';
  const ALIF_WASLA = '\u0671';
  const ALIF_MAQSURA = '\u0649';

  const MAP: Record<string, string> = {
    '\u0621': "'", '\u0622': 'a', '\u0623': 'a', '\u0624': 'u', '\u0625': 'i', '\u0626': 'i',
    '\u0627': 'a', '\u0628': 'b', '\u0629': 'h', '\u062A': 't', '\u062B': 'th', '\u062C': 'j',
    '\u062D': 'h', '\u062E': 'kh', '\u062F': 'd', '\u0630': 'dh', '\u0631': 'r', '\u0632': 'z',
    '\u0633': 's', '\u0634': 'sh', '\u0635': 's', '\u0636': 'd', '\u0637': 't', '\u0638': 'z',
    '\u0639': "'", '\u063A': 'gh', '\u0641': 'f', '\u0642': 'q', '\u0643': 'k', '\u0644': 'l',
    '\u0645': 'm', '\u0646': 'n', '\u0647': 'h', '\u0648': 'w', '\u0649': 'a', '\u064A': 'y',
    '\u0671': 'a',
  };

  const cleaned = word
    .replace(/[\u06D6-\u06ED\u06DD\u06DE\u06E9\u06DF\u06E0]/g, '')
    .replace(/[ÛžÛ©]/g, '')
    .replace(/[\u0640]/g, '');

  let out = '';
  let i = 0;
  let lastShortVowel: '' | 'a' | 'i' | 'u' = '';

  while (i < cleaned.length) {
    const ch = cleaned[i];
    i++;

    if (isArabicDiacriticPemula(ch)) continue;

    let diacs = '';
    while (i < cleaned.length && isArabicDiacriticPemula(cleaned[i])) {
      diacs += cleaned[i];
      i++;
    }

    const hasShadda = diacs.includes(SHADDA);
    const hasSukun = diacs.includes(SUKUN);
    const hasFathah = diacs.includes(FATHAH);
    const hasKasrah = diacs.includes(KASRAH);
    const hasDhammah = diacs.includes(DHAMMAH);
    const hasFathatan = diacs.includes(FATHATAN);
    const hasKasratan = diacs.includes(KASRATAN);
    const hasDhammatan = diacs.includes(DHAMMATAN);

    if (ch === ALIF_WASLA) {
      out += 'a';
      lastShortVowel = 'a';
      continue;
    }

    if (ch === ALIF || ch === ALIF_MAQSURA) {
      if (lastShortVowel === 'a') out += 'a';
      else if (!out) out += 'a';
      lastShortVowel = '';
      continue;
    }
    if (ch === WAW && !hasFathah && !hasKasrah && !hasDhammah && !hasFathatan && !hasKasratan && !hasDhammatan && !hasSukun) {
      if (lastShortVowel === 'u') out += 'u';
      else out += 'w';
      lastShortVowel = '';
      continue;
    }
    if (ch === YA && !hasFathah && !hasKasrah && !hasDhammah && !hasFathatan && !hasKasratan && !hasDhammatan && !hasSukun) {
      if (lastShortVowel === 'i') out += 'i';
      else out += 'y';
      lastShortVowel = '';
      continue;
    }

    let base = MAP[ch] ?? '';
    if (ch === TA_MARBUTA && !hasFathah && !hasKasrah && !hasDhammah && !hasFathatan && !hasKasratan && !hasDhammatan && !hasSukun) {
      base = 'h';
    }
    if (hasShadda && base) base = base + base;

    let vowel = '';
    if (hasFathatan) vowel = 'an';
    else if (hasKasratan) vowel = 'in';
    else if (hasDhammatan) vowel = 'un';
    else if (hasFathah) vowel = 'a';
    else if (hasKasrah) vowel = 'i';
    else if (hasDhammah) vowel = 'u';
    else if (hasSukun) vowel = '';

    out += base + vowel;
    lastShortVowel = vowel === 'a' || vowel === 'i' || vowel === 'u' ? (vowel as 'a' | 'i' | 'u') : '';
  }

  return out.replace(/\s+/g, ' ').trim();
};

const transliterateArabicWordsPemula = (words: string[]): string[] =>
  words.map(w => transliterateArabicWordPemula(w));

const NON_CONNECTING_TO_NEXT_ARABIC = new Set([
  '\u0627', // alif
  '\u0622', // alif madda
  '\u0623', // alif hamza above
  '\u0625', // alif hamza below
  '\u062F', // dal
  '\u0630', // dhal
  '\u0631', // ra
  '\u0632', // zay
  '\u0648', // waw
  '\u0624', // waw hamza
  '\u0621', // hamza standalone
  '\u0629', // ta marbuta
  '\u0649', // alif maqsura
  '\u0671', // alif wasla
]);

const isArabicLetterForJoin = (ch: string): boolean => {
  if (!ch) return false;
  const cp = ch.charCodeAt(0);
  return cp >= 0x0621 && cp <= 0x06FF;
};

const isArabicDiacriticForJoin = (ch: string): boolean => {
  if (!ch) return false;
  const cp = ch.charCodeAt(0);
  return (
    (cp >= 0x064B && cp <= 0x065F) ||
    (cp >= 0x0610 && cp <= 0x061A) ||
    cp === 0x0670 ||
    (cp >= 0x06D6 && cp <= 0x06ED)
  );
};

const getLastArabicLetterForJoin = (text: string): string | null => {
  for (let i = text.length - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === '\u200D' || ch === '\u200C') continue;
    if (isArabicDiacriticForJoin(ch)) continue;
    if (isArabicLetterForJoin(ch)) return ch;
    return null;
  }
  return null;
};

const getFirstArabicLetterForJoin = (text: string): string | null => {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\u200D' || ch === '\u200C') continue;
    if (isArabicDiacriticForJoin(ch)) continue;
    if (isArabicLetterForJoin(ch)) return ch;
    return null;
  }
  return null;
};

const bridgeArabicJoinAcrossSpans = (spans: { text: string; rule: string | null }[]) => {
  const out = spans.map(s => ({ ...s }));
  for (let i = 0; i < out.length - 1; i++) {
    const left = out[i];
    const right = out[i + 1];

    if (!left.text || !right.text) continue;
    if (/\s$/.test(left.text) || /^\s/.test(right.text)) continue;

    const leftLetter = getLastArabicLetterForJoin(left.text);
    const rightLetter = getFirstArabicLetterForJoin(right.text);
    if (!leftLetter || !rightLetter) continue;
    if (NON_CONNECTING_TO_NEXT_ARABIC.has(leftLetter)) continue;

    if (!left.text.endsWith('\u200D')) left.text += '\u200D';
    if (!right.text.startsWith('\u200D')) right.text = `\u200D${right.text}`;
  }
  return out;
};

const mergeAdjacentGuideSpans = (spans: { text: string; rule: string | null }[]) => {
  const merged: { text: string; rule: string | null }[] = [];
  spans.forEach(span => {
    if (!span.text) return;
    const prev = merged[merged.length - 1];
    if (prev && prev.rule === span.rule) {
      prev.text += span.text;
      return;
    }
    merged.push({ text: span.text, rule: span.rule });
  });
  return merged;
};

const splitGuideSpansByWhitespace = (spans: { text: string; rule: string | null }[]) => {
  const out: { text: string; rule: string | null }[] = [];
  spans.forEach(span => {
    if (!span.text) return;
    const pieces = span.text.split(/(\s+)/).filter(Boolean);
    pieces.forEach(piece => out.push({ text: piece, rule: span.rule }));
  });
  return out;
};

const getNonWhitespaceLength = (text: string): number => String(text ?? '').replace(/\s+/g, '').length;
const ARABIC_BASE_LETTER_RE = /[\u0621-\u063A\u0641-\u064A\u0671]/;
const hasArabicBaseLetter = (text: string): boolean => ARABIC_BASE_LETTER_RE.test(String(text ?? ''));

const splitGuideSpansWithWaqf = (spans: { text: string; rule: string | null }[]) => {
  const out: { text: string; rule: string | null }[] = [];

  spans.forEach(span => {
    if (!span.text) return;
    let buffer = '';

    const flushBuffer = () => {
      if (!buffer) return;
      out.push({ text: buffer, rule: span.rule });
      buffer = '';
    };

    let i = 0;
    while (i < span.text.length) {
      const ch = span.text[i];

      // Paket marker ayat: ﴿7﴾ / ﴿٧﴾
      if (ch === ORNATE_LEFT_PAREN) {
        let j = i + 1;
        let hasDigitsInside = false;
        while (j < span.text.length && span.text[j] !== ORNATE_RIGHT_PAREN) {
          if (AYAH_MARKER_DIGIT_RE.test(span.text[j])) hasDigitsInside = true;
          j++;
        }

        if (j < span.text.length && span.text[j] === ORNATE_RIGHT_PAREN && hasDigitsInside) {
          flushBuffer();
          out.push({ text: span.text.slice(i, j + 1), rule: 'ayah_end_mark' });
          i = j + 1;
          continue;
        }
      }

      const waqfRule = WAQF_RULE_BY_CHAR[ch];
      if (waqfRule && WAQF_CHARS.has(ch)) {
        flushBuffer();
        let j = i;
        const waqfCluster: string[] = [];
        while (j < span.text.length) {
          const nextCh = span.text[j];
          if (!WAQF_CHARS.has(nextCh) || !WAQF_RULE_BY_CHAR[nextCh]) break;
          waqfCluster.push(nextCh);
          j++;
        }

        const picked = pickDominantWaqfMarker(waqfCluster);
        if (picked) {
          out.push({ text: picked.char, rule: picked.rule });
        } else {
          out.push({ text: ch, rule: waqfRule });
        }

        i = j;
        continue;
      }

      buffer += ch;
      i++;
    }
    flushBuffer();
  });

  return mergeAdjacentGuideSpans(out);
};

const normalizeArabicForDisplay = (text: string): string => {
  return text
    .replace(/\u00A0/g, ' ');
};

const DENSE_DIACRITIC_SCRIPTS = new Set<ArabicScript>(['uthmani', 'indopak']);

const getArabicLayoutMetrics = (fontSize: number, activeScript: ArabicScript, withTajweed = false) => {
  const dense = DENSE_DIACRITIC_SCRIPTS.has(activeScript);
  const safeHorizontal = Math.max(18, Math.round(fontSize * (dense ? 0.56 : 0.42)));
  const safeVertical = Math.max(6, Math.round(fontSize * (dense ? 0.4 : 0.3)));
  const lineHeightMultiplier = dense ? (withTajweed ? 2.74 : 2.64) : withTajweed ? 2.5 : 2.36;
  // lineHeight selalu eksplisit agar tanda baca tidak saling tindih saat wrap (terutama Android).
  const lineHeight = Math.round(fontSize * lineHeightMultiplier);
  // safeLeft: guard kiri agar harakat akhir baris tidak terpotong.
  // safeRight: guard kanan (awal ayat RTL) termasuk buffer ekstra untuk tanda waqaf.
  const extraWaqfPadding = Math.round(Math.max(8, fontSize * 0.14));
  const safeLeft = Math.max(12, safeHorizontal) + extraWaqfPadding;
  const safeRight = Math.max(30, safeHorizontal + Math.round(fontSize * (dense ? 0.42 : 0.3))) + extraWaqfPadding;
  return { safeLeft, safeRight, safeVertical, lineHeight };
};

const getArabicOverflowCompensation = (safeLeft: number, safeRight: number) => {
  const bleedRight = Math.max(8, Math.round(safeRight * 0.72));
  const bleedLeft = Math.max(6, Math.round(safeLeft * 0.62));
  return { bleedLeft, bleedRight };
};

// Geser halus posisi blok ayat: nilai negatif => sedikit ke kiri.
const ARABIC_TEXT_X_BIAS = -4;
const AYAH_FOLLOW_VIEW_POSITION = 0.01;
const AYAH_FOLLOW_VIEW_OFFSET = 8;
const QARI_PROGRESS_MIN_DELTA = 0.035;

const getGuideSpanStyle = (rule: string | null, fontSize: number, activeScript: ArabicScript) => {
  if (!rule || !(rule in WAQF_GUIDE)) return null;
  const isAyahMarker = rule === 'ayah_end_mark';
  if (!isAyahMarker) {
    return {
      fontSize: Math.max(12, Math.round(fontSize * 0.9)),
      fontWeight: '700' as const,
    };
  }
  const dense = DENSE_DIACRITIC_SCRIPTS.has(activeScript);
  return {
    fontSize: Math.max(11, Math.round(fontSize * (dense ? 0.9 : 0.86))),
  };
};

const getWordChipArabicLineHeight = (fontSize: number, activeScript: ArabicScript) => {
  const dense = DENSE_DIACRITIC_SCRIPTS.has(activeScript);
  return Math.round(fontSize * (dense ? 2.2 : 1.9));
};

// Main Screen
export default function SurahReaderScreen() {
  const {
    surahId,
    script: scriptParam,
    mode,
    fontSize: fontSizeParam,
    showTranslation: showTranslationParam,
    autoPlay: autoPlayParam,
    startAyah: startAyahParam,
    chain: chainParam,
    navDir: navDirParam,
    reciter: reciterParam,
    juz: juzParam,
    juzStartSurah: juzStartSurahParam,
    juzStartAyah: juzStartAyahParam,
    juzEndSurah: juzEndSurahParam,
    juzEndAyah: juzEndAyahParam,
  } = useLocalSearchParams<{
    surahId: string;
    script?: string;
    mode?: string;
    fontSize?: string;
    showTranslation?: string;
    autoPlay?: string;
    startAyah?: string;
    chain?: string;
    navDir?: string;
    reciter?: string;
    juz?: string;
    juzStartSurah?: string;
    juzStartAyah?: string;
    juzEndSurah?: string;
    juzEndAyah?: string;
  }>();
  const routeNum = parseInt(surahId ?? '1', 10);
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, lang } = useTranslation();
  const [num, setNum] = useState(routeNum);

  // Pengaturan baca âstateful, bisa diubah langsung dari reader
  const [script, setScript] = useState<ArabicScript>(normalizeArabicScript(scriptParam));
  const arabicFontFamily = getArabicFontFamily(script);
  const [displayMode, setDisplayMode] = useState<DisplayMode>((mode ?? 'normal') as DisplayMode);
  const [arabicFontSize, setArabicFontSize] = useState(parseInt(fontSizeParam ?? '26', 10));
  const [showTranslation, setShowTranslation] = useState(showTranslationParam !== 'false');
  const [showOnlyAsbabAyahs, setShowOnlyAsbabAyahs] = useState(false);

  // Surah data
  const [surah, setSurah] = useState<SurahWithTranslation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reciter (bisa diganti langsung dari reader)
  const [reciter, setReciter] = useState(() => resolveReciterById(reciterParam));
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [reciterCapability, setReciterCapability] = useState<ReciterSyncCapability>(
    reciter.surahOnly ? 'audio' : 'follow'
  );
  const [reciterCapabilityMap, setReciterCapabilityMap] = useState<Record<string, ReciterSyncCapability>>({});
  const [surahWordTimingMap, setSurahWordTimingMap] = useState<Record<number, WordTimingSegment[]>>({});

  // Mode-specific data
  const [translitTexts, setTranslitTexts] = useState<string[] | null>(null);
  const [wordByWordMap, setWordByWordMap] = useState<SurahWordByWord | null>(null);
  const [modeLoading, setModeLoading] = useState(false);

  // UI state
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [surahBookmarked, setSurahBookmarked] = useState(false);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [playingAyahProgress, setPlayingAyahProgress] = useState(0);
  const [activeAyahWordIndex, setActiveAyahWordIndex] = useState<number | null>(null);
  const [playingBasmallah, setPlayingBasmallah] = useState(false);
  const [expandedAsbabun, setExpandedAsbabun] = useState<string | null>(null);
  const [ulamaTafsirState, setUlamaTafsirState] = useState<Record<string, {
    loading: boolean;
    items: UlamaTafsirInsight[];
    error?: string;
  }>>({});
  const [showTips, setShowTips] = useState(true);
  const [showReaderTips, setShowReaderTips] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [activeTajweedRule, setActiveTajweedRule] = useState<string | null>(null);

  // Juz mode: continuous scroll state
  const [juzSurahMap, setJuzSurahMap] = useState<Map<number, SurahWithTranslation>>(new Map());
  const [juzAllBookmarks, setJuzAllBookmarks] = useState<Map<number, Set<number>>>(new Map());
  const [juzPlayingKey, setJuzPlayingKey] = useState<string | null>(null);
  const juzPlayingKeyRef = useRef<string | null>(null);

  // Modals
  const [showReaderMenu, setShowReaderMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSheetView, setSettingsSheetView] = useState<'main' | 'reciter'>('main');
  const [showBookmarkHistory, setShowBookmarkHistory] = useState(false);
  const [bookmarkHistory, setBookmarkHistory] = useState<BookmarkItem[]>([]);
  const [showBookmarkNameModal, setShowBookmarkNameModal] = useState(false);
  const [bookmarkNameInput, setBookmarkNameInput] = useState('');
  const [pendingBookmark, setPendingBookmark] = useState<null | {
    kind: 'ayah' | 'surah';
    ayahNumberInSurah: number;
    arabicText: string;
    translation: string;
  }>(null);
  const [offlineAudioStatus, setOfflineAudioStatus] = useState<OfflineReciterAudioStatus | null>(null);
  const [autoOfflineStatus, setAutoOfflineStatus] = useState<OfflineQuranAutoStatus | null>(null);
  const [offlineTask, setOfflineTask] = useState<OfflineTaskState | null>(null);

  // â"€â"€ Surah-wide playback
  const [isPlayingSurah, setIsPlayingSurah] = useState(false);
  const [isSurahPaused, setIsSurahPaused] = useState(false);
  const [ayahPlayMode, setAyahPlayMode] = useState<AyahPlayMode>('continuous');
  const surahModeRef = useRef(false);
  const chainPlaybackRef = useRef(true);
  const currentSurahIdxRef = useRef(0);
  const reciterRef = useRef(reciter);
  const surahDataRef = useRef(surah);
  const playbackRequestRef = useRef(0);
  const autoPlayHandledRef = useRef<string | null>(null);
  const isNavigatingRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const ayahHighlightAnim = useRef(new Animated.Value(0)).current;
  const pendingAutoPlayRef = useRef<null | { surah: number; startAyah: number; chain: boolean }>(null);
  const initialStartAyahHandledKeyRef = useRef<string | null>(null);
  const initialStartAyahTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fallbackReciterNoticeRef = useRef(false);
  const capabilityResolveReqRef = useRef(0);
  const userScrollingRef = useRef(false);
  const autoScrollSuppressedUntilRef = useRef(0);
  const releaseUserScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const soundRef = useRef<AudioPlayer | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const juzFlatListRef = useRef<FlatList>(null);
  const surahMeta = SURAH_LIST.find(s => s.number === num);
  const prevSurahMeta = SURAH_LIST.find(s => s.number === num - 1) ?? null;
  const nextSurahMeta = SURAH_LIST.find(s => s.number === num + 1) ?? null;
  const showBasmalah = num !== 1 && num !== 9;
  const isSurahOnlyReciter = !!reciter.surahOnly;
  const shouldAutoPlay = autoPlayParam === '1';
  const shouldChainPlayback = chainParam !== '0';
  const startAyahFromParam = Math.max(1, parseInt(startAyahParam ?? '1', 10) || 1);
  const parsedJuzId = parseInt(juzParam ?? '', 10);
  const parsedJuzStartSurah = parseInt(juzStartSurahParam ?? '', 10);
  const parsedJuzStartAyah = parseInt(juzStartAyahParam ?? '', 10);
  const parsedJuzEndSurah = parseInt(juzEndSurahParam ?? '', 10);
  const parsedJuzEndAyah = parseInt(juzEndAyahParam ?? '', 10);
  const isValidJuzRange =
    Number.isFinite(parsedJuzStartSurah) &&
    Number.isFinite(parsedJuzEndSurah) &&
    Number.isFinite(parsedJuzStartAyah) &&
    Number.isFinite(parsedJuzEndAyah) &&
    parsedJuzStartSurah >= 1 &&
    parsedJuzEndSurah <= 114 &&
    parsedJuzStartSurah <= parsedJuzEndSurah &&
    parsedJuzStartAyah >= 1 &&
    parsedJuzEndAyah >= 1;
  const isJuzMode = isValidJuzRange && Number.isFinite(parsedJuzId) && parsedJuzId >= 1 && parsedJuzId <= 30;
  const juzId = isJuzMode ? parsedJuzId : null;
  const juzStartSurah = isJuzMode ? parsedJuzStartSurah : 1;
  const juzEndSurah = isJuzMode ? parsedJuzEndSurah : 114;
  const juzStartMeta = SURAH_LIST.find(s => s.number === parsedJuzStartSurah) ?? null;
  const juzEndMeta = SURAH_LIST.find(s => s.number === parsedJuzEndSurah) ?? null;
  const juzStartAyah = isJuzMode ? parsedJuzStartAyah : 1;
  const juzEndAyah = isJuzMode ? parsedJuzEndAyah : Number.MAX_SAFE_INTEGER;
  const minSurahLimit = isJuzMode ? juzStartSurah : 1;
  const maxSurahLimit = isJuzMode ? juzEndSurah : 114;
  const effectiveStartAyahForCurrentSurah = isJuzMode
    ? (num === juzStartSurah ? Math.max(1, juzStartAyah) : 1)
    : startAyahFromParam;
  const getStartAyahForSurahInJuz = useCallback((surahNumber: number) => {
    if (!isJuzMode) return 1;
    if (surahNumber === juzStartSurah) return Math.max(1, juzStartAyah);
    return 1;
  }, [isJuzMode, juzStartSurah, juzStartAyah]);
  const screenWidth = Dimensions.get('window').width;
  const isWideWeb = Platform.OS === 'web' && screenWidth >= 960;
  const canGoPrevSurah = !!prevSurahMeta && num > minSurahLimit;
  const canGoNextSurah = !!nextSurahMeta && num < maxSurahLimit;
  const getDisplayModeTitle = (id: DisplayMode) => {
    if (id === 'tajweed') return t('mode_tajweed');
    if (id === 'pemula') return t('mode_beginner');
    return t('mode_normal');
  };
  const getDisplayModeDesc = (id: DisplayMode) => {
    if (id === 'tajweed') return t('mode_tajweed_desc');
    if (id === 'pemula') return t('mode_beginner_desc');
    return t('mode_normal_desc');
  };
  const getSurahMeaningText = useCallback((meta?: (typeof SURAH_LIST)[number] | null) =>
    lang === 'id' ? (meta?.indonesianName ?? '') : '', [lang]);
  const getRevelationTypeText = useCallback((type?: string | null) => {
    if (type === 'Makkiyyah') return t('meccan');
    if (type === 'Madaniyyah') return t('medinan');
    return type ?? '';
  }, [t]);
  const getReciterCapabilityShort = useCallback((capability: ReciterSyncCapability) => {
    if (capability === 'full') return lang === 'en' ? 'Highlight + Follow' : 'Highlight + Ikuti';
    if (capability === 'follow') return lang === 'en' ? 'Follow Ayah' : 'Ikuti Ayat';
    return lang === 'en' ? 'Audio Only' : 'Audio Saja';
  }, [lang]);
  const getReciterGroupTitle = useCallback((group: ReciterGroup) =>
    group === 'lainnya' && lang === 'en' ? 'Others' : RECITER_GROUPS[group].title, [lang]);
  const getGuideEntry = useCallback((key?: string | null): GuideEntry | null => {
    if (!key) return null;
    const guide = GUIDE_MAP[key];
    if (!guide) return null;
    return lang === 'en' ? { ...guide, ...GUIDE_CONTENT_EN[key] } : guide;
  }, [lang]);
  const prevJuzMeta = isJuzMode && juzId && juzId > 1
    ? (JUZ_LIST.find(j => j.number === juzId - 1) ?? null)
    : null;
  const nextJuzMeta = isJuzMode && juzId && juzId < 30
    ? (JUZ_LIST.find(j => j.number === juzId + 1) ?? null)
    : null;
  const buildJuzRoute = useCallback((target: number, navDir: 'next' | 'prev') => {
    const range = JUZ_LIST.find(j => j.number === target);
    if (!range) return null;
    return {
      pathname: '/quran/[surahId]',
      params: {
        surahId: String(range.startSurah),
        script,
        mode: displayMode,
        fontSize: String(arabicFontSize),
        showTranslation: showTranslation ? 'true' : 'false',
        reciter: reciter.id,
        startAyah: String(Math.max(1, range.startAyah)),
        juz: String(range.number),
        juzStartSurah: String(range.startSurah),
        juzStartAyah: String(range.startAyah),
        juzEndSurah: String(range.endSurah),
        juzEndAyah: String(range.endAyah),
        navDir,
      },
    } as any;
  }, [script, displayMode, arabicFontSize, showTranslation, reciter.id]);
  const closeSettingsSheet = useCallback(() => {
    setSettingsSheetView('main');
    setShowSettings(false);
  }, []);

  const openReciterPickerFromSettings = useCallback(() => {
    setSettingsSheetView('reciter');
  }, []);

  const clearJuzPlayingState = useCallback(() => {
    juzPlayingKeyRef.current = null;
    setJuzPlayingKey(null);
  }, []);

  const [navDirState, setNavDirState] = useState<'next' | 'prev' | null>(
    navDirParam === 'next' ? 'next' : navDirParam === 'prev' ? 'prev' : null
  );
  useEffect(() => {
    if (showSettings) return;
    setSettingsSheetView('main');
  }, [showSettings]);

  const asbabStarterAyahNumbers = React.useMemo(() => {
    const set = new Set<number>();
    if (!surah) return set;
    surah.arabic.ayahs.forEach(ayah => {
      const asbab = getAsbabunNuzul(num, ayah.numberInSurah);
      if (asbab && asbab.ayah === ayah.numberInSurah) {
        set.add(ayah.numberInSurah);
      }
    });
    return set;
  }, [surah, num]);
  const getAyahBoundsForCurrentSurah = useCallback((ayahCount: number) => {
    let startAyah = 1;
    let endAyahInSurah = ayahCount;
    if (isJuzMode) {
      if (num === juzStartSurah) {
        startAyah = Math.max(1, juzStartAyah);
      }
      if (num === juzEndSurah) {
        endAyahInSurah = Math.min(ayahCount, Math.max(1, juzEndAyah));
      }
    }
    if (endAyahInSurah < startAyah) {
      return { startAyah: 1, endAyahInSurah: 0 };
    }
    return { startAyah, endAyahInSurah };
  }, [isJuzMode, num, juzStartSurah, juzStartAyah, juzEndSurah, juzEndAyah]);

  const visibleAyahIndices = React.useMemo(() => {
    if (!surah) return [] as number[];
    const ayahCount = surah.arabic.ayahs.length;
    const { startAyah, endAyahInSurah } = getAyahBoundsForCurrentSurah(ayahCount);
    if (endAyahInSurah < startAyah) return [] as number[];
    const scopedIndices: number[] = [];
    for (let ayah = startAyah; ayah <= endAyahInSurah; ayah += 1) {
      scopedIndices.push(ayah - 1);
    }
    if (!showOnlyAsbabAyahs) {
      return scopedIndices;
    }
    return scopedIndices.filter(idx => {
      const ayah = surah.arabic.ayahs[idx];
      return !!ayah && asbabStarterAyahNumbers.has(ayah.numberInSurah);
    });
  }, [surah, showOnlyAsbabAyahs, asbabStarterAyahNumbers, getAyahBoundsForCurrentSurah]);
  // Juz mode: flat data untuk continuous scroll
  const juzScrollData = React.useMemo<JuzScrollItem[]>(() => {
    if (!isJuzMode) return [];
    const items: JuzScrollItem[] = [];
    for (let sNum = juzStartSurah; sNum <= juzEndSurah; sNum++) {
      const sd = juzSurahMap.get(sNum);
      items.push({ _k: 'sep', surahNum: sNum });
      const isStartingFromAyah1 = sNum !== juzStartSurah || juzStartAyah <= 1;
      if (sNum !== 1 && sNum !== 9 && isStartingFromAyah1) items.push({ _k: 'bas', surahNum: sNum });
      if (!sd) {
        items.push({ _k: 'ld', surahNum: sNum });
      } else {
        const startA = sNum === juzStartSurah ? Math.max(1, juzStartAyah) : 1;
        const endA = sNum === juzEndSurah ? Math.min(sd.arabic.ayahs.length, juzEndAyah) : sd.arabic.ayahs.length;
        for (let idx = startA - 1; idx < endA; idx++) {
          items.push({ _k: 'ay', surahNum: sNum, idx, s: sd });
        }
      }
    }
    return items;
  }, [isJuzMode, juzStartSurah, juzEndSurah, juzStartAyah, juzEndAyah, juzSurahMap]);

  const asbabAyahCountInSurah = React.useMemo(() => {
    if (!surah) return 0;
    return visibleAyahIndices.reduce((acc, idx) => {
      const ayah = surah.arabic.ayahs[idx];
      if (!ayah) return acc;
      return asbabStarterAyahNumbers.has(ayah.numberInSurah) ? acc + 1 : acc;
    }, 0);
  }, [surah, visibleAyahIndices, asbabStarterAyahNumbers]);
  const ayahSourceIndexMap = React.useMemo(() => {
    const map = new Map<number, number>();
    surah?.arabic.ayahs.forEach((ayah, idx) => {
      map.set(ayah.numberInSurah, idx);
    });
    return map;
  }, [surah]);
  const visibleSourceIndexMap = React.useMemo(() => {
    const map = new Map<number, number>();
    visibleAyahIndices.forEach((sourceIdx, listIdx) => {
      map.set(sourceIdx, listIdx);
    });
    return map;
  }, [visibleAyahIndices]);
  const getVisibleListIndexForAyah = useCallback((ayahNumberInSurah: number) => {
    const sourceIdx = ayahSourceIndexMap.get(ayahNumberInSurah);
    if (typeof sourceIdx !== 'number') return -1;
    return visibleSourceIndexMap.get(sourceIdx) ?? -1;
  }, [ayahSourceIndexMap, visibleSourceIndexMap]);

  const getJuzListIndexForAyah = useCallback((surahNum: number, ayahN: number): number => {
    for (let i = 0; i < juzScrollData.length; i++) {
      const item = juzScrollData[i];
      if (item._k === 'ay' && item.surahNum === surahNum && item.idx === ayahN - 1) {
        return i;
      }
    }
    return -1;
  }, [juzScrollData]);

  const getBaseReciterCapability = useCallback((reciterId: string): ReciterSyncCapability => {
    const target = RECITERS.find(r => r.id === reciterId);
    if (!target) return 'follow';
    if (target.surahOnly) return 'audio';
    return 'follow';
  }, []);

  const getReciterCapabilityForUi = useCallback((reciterId: string): ReciterSyncCapability => {
    if (reciterId === reciter.id) return reciterCapability;
    return reciterCapabilityMap[reciterId] ?? getBaseReciterCapability(reciterId);
  }, [reciter.id, reciterCapability, reciterCapabilityMap, getBaseReciterCapability]);

  const refreshOfflineStatus = useCallback(async () => {
    const audioStatus = await getReciterOfflineAudioStatus(reciter.id, num);
    setOfflineAudioStatus(audioStatus);
  }, [num, reciter.id]);

  const startOfflineReciterDownload = useCallback(async () => {
    setOfflineTask({ kind: 'audio', label: `${t('download_audio')} ${reciter.name}...`, current: 0, total: 1 });
    try {
      const result = await downloadReciterAudioOfflineForSurah(
        reciter.id,
        num,
        (progress: OfflineAudioDownloadProgress) => {
          setOfflineTask({
            kind: 'audio',
            label: `${progress.label} (${Math.max(0, progress.current)}/${progress.total})`,
            current: progress.current,
            total: progress.total,
          });
        }
      );
      await refreshOfflineStatus();
      Alert.alert(
        t('audio_offline_saved_title'),
        lang === 'en'
          ? `${reciter.name}: ${result.available}/${result.total} files are ready offline.` +
            (result.failed > 0 ? `\n${result.failed} files failed to download.` : '')
          : `${reciter.name}: ${result.available}/${result.total} file siap diputar offline.` +
            (result.failed > 0 ? `\n${result.failed} file gagal diunduh.` : '')
      );
    } catch (e: any) {
      Alert.alert(t('audio_download_failed_title'), e?.message ?? t('audio_download_failed_title'));
    } finally {
      setOfflineTask(null);
    }
  }, [num, reciter.id, reciter.name, refreshOfflineStatus, lang, t]);

  const showOptionalAudioDownloadPrompt = useCallback((reason?: string) => {
    const message = [
      reason?.trim() ? reason.trim() : null,
      t('audio_optional_read_without_audio'),
      t('audio_optional_settings_hint'),
    ]
      .filter(Boolean)
      .join('\n\n');
    Alert.alert(
      t('audio_optional_title'),
      message,
      [
        { text: t('later'), style: 'cancel' },
        {
          text: t('open_reciter_settings'),
          onPress: () => {
            setSettingsSheetView('reciter');
            setShowSettings(true);
          },
        },
      ]
    );
  }, [t]);

  const removeOfflineReciterAudio = useCallback(async () => {
    setOfflineTask({ kind: 'audio', label: `${t('remove_audio')}...`, current: 0, total: 1 });
    try {
      await removeReciterOfflineAudioForSurah(reciter.id, num);
      await refreshOfflineStatus();
      Alert.alert(t('audio_offline_deleted_title'), `${reciter.name}: ${t('audio_offline_removed_message')}`);
    } catch (e: any) {
      Alert.alert(t('audio_remove_failed_title'), e?.message ?? t('audio_remove_failed_message'));
    } finally {
      setOfflineTask(null);
    }
  }, [num, reciter.id, reciter.name, refreshOfflineStatus, t]);

  useEffect(() => {
    refreshOfflineStatus().catch(() => {});
  }, [refreshOfflineStatus]);

  // Smooth fade-in animation saat ayah aktif berubah
  useEffect(() => {
    if (playingAyah !== null) {
      ayahHighlightAnim.setValue(0);
      Animated.timing(ayahHighlightAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      ayahHighlightAnim.setValue(0);
    }
  }, [playingAyah, ayahHighlightAnim]);

  useEffect(() => {
    let active = true;
    (async () => {
      const snapshot = await getOfflineQuranAutoStatus();
      if (active) setAutoOfflineStatus(snapshot);
      const finalStatus = await ensureAllSurahContentOfflineAuto(status => {
        if (active) setAutoOfflineStatus(status);
      });
      if (active) setAutoOfflineStatus(finalStatus);
    })().catch(() => {});
    return () => { active = false; };
  }, []);

  // Prefetch capability semua qari untuk surah aktif agar indikator titik di daftar qari akurat.
  useEffect(() => {
    let active = true;
    const baseMap: Record<string, ReciterSyncCapability> = {};
    RECITERS.forEach(r => {
      baseMap[r.id] = getBaseReciterCapability(r.id);
    });

    setReciterCapabilityMap(prev => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(baseMap);
      const sameSize = prevKeys.length === nextKeys.length;
      const sameValues = sameSize && nextKeys.every(key => prev[key] === baseMap[key]);
      return sameValues ? prev : baseMap;
    });

    const candidates = RECITERS.filter(r => !r.surahOnly && !!r.quranComRecitationId);
    (async () => {
      const resolved: Record<string, ReciterSyncCapability> = {};
      await Promise.allSettled(
        candidates.map(async target => {
          const timing = await fetchReciterWordTimingBySurahWithOffline(target.id, num);
          resolved[target.id] = Object.keys(timing).length > 0 ? 'full' : 'follow';
        })
      );
      if (!active) return;
      setReciterCapabilityMap(prev => {
        let changed = false;
        const next = { ...prev };
        Object.entries(resolved).forEach(([id, cap]) => {
          if (next[id] !== cap) {
            next[id] = cap;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    })().catch(() => {});

    return () => { active = false; };
  }, [num, getBaseReciterCapability]);

  // â"€â"€ Effects â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  useEffect(() => {
    clearJuzPlayingState();
    load();
    setTranslitTexts(null);
    setWordByWordMap(null);
    return () => {
      playbackRequestRef.current++;
      const current = soundRef.current;
      soundRef.current = null;

      if (current && surahModeRef.current) {
        // Komponen di-unmount saat surah masih play → biarkan audio lanjut di service
        // (quranAudioService.attach sudah dipanggil di playClipAt, player aman di service)
      } else if (current) {
        // Surah tidak aktif (num/script berubah, atau user stop manual) → hentikan audio
        quranAudioService.detach();
        try { current.clearLockScreenControls(); } catch {}
        try { current.remove(); } catch {}
      }

      if (releaseUserScrollTimerRef.current) {
        clearTimeout(releaseUserScrollTimerRef.current);
        releaseUserScrollTimerRef.current = null;
      }
      if (initialStartAyahTimersRef.current.length > 0) {
        initialStartAyahTimersRef.current.forEach(timer => clearTimeout(timer));
        initialStartAyahTimersRef.current = [];
      }
    };
  }, [num, script, lang, clearJuzPlayingState]);

  // Saat halaman surah dibuka: reconnect ke service jika surah sama, atau stop service audio
  useEffect(() => {
    const store = useQuranAudioStore.getState();
    const servicePlayer = quranAudioService.get();

    if (servicePlayer && store.isActive && store.surahNumber === num) {
      // Surah yang sama sedang diputar di background → reconnect
      soundRef.current = servicePlayer;
      surahModeRef.current = true;
      chainPlaybackRef.current = true;
      setIsPlayingSurah(true);
      setIsSurahPaused(store.isPaused);
      currentSurahIdxRef.current = store.currentAyahIndex;
    } else if (servicePlayer) {
      // Surah berbeda atau tidak relevan → hentikan service audio
      quranAudioService.stop();
      store.deactivate();
      void setAudioModeAsync({ shouldPlayInBackground: false }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Hanya saat mount pertama kali

  useEffect(() => {
    if (displayMode !== 'pemula') return;
    if (modeLoading) return;
    if (translitTexts && wordByWordMap) return;
    loadPemulaData();
  }, [displayMode, translitTexts, wordByWordMap, num, modeLoading, lang]);

  // Deteksi capability qari untuk sinkronisasi ayat/word highlight pada surah aktif.
  useEffect(() => {
    let active = true;
    const reqId = ++capabilityResolveReqRef.current;
    const baseCapability = getBaseReciterCapability(reciter.id);
    setReciterCapability(baseCapability);
    setSurahWordTimingMap({});
    setActiveAyahWordIndex(null);
    setReciterCapabilityMap(prev => (
      prev[reciter.id] === baseCapability
        ? prev
        : { ...prev, [reciter.id]: baseCapability }
    ));

    if (baseCapability !== 'follow' || !reciter.quranComRecitationId) {
      return () => { active = false; };
    }

    (async () => {
      const timing = await fetchReciterWordTimingBySurahWithOffline(reciter.id, num);
      if (!active || reqId !== capabilityResolveReqRef.current) return;
      const hasWordTiming = Object.keys(timing).length > 0;
      const nextCapability: ReciterSyncCapability = hasWordTiming ? 'full' : 'follow';
      setReciterCapability(nextCapability);
      setSurahWordTimingMap(hasWordTiming ? timing : {});
      setReciterCapabilityMap(prev => (
        prev[reciter.id] === nextCapability
          ? prev
          : { ...prev, [reciter.id]: nextCapability }
      ));
    })().catch(() => {
      if (!active || reqId !== capabilityResolveReqRef.current) return;
      setReciterCapability('follow');
      setSurahWordTimingMap({});
      setReciterCapabilityMap(prev => (
        prev[reciter.id] === 'follow'
          ? prev
          : { ...prev, [reciter.id]: 'follow' }
      ));
    });

    return () => { active = false; };
  }, [reciter.id, reciter.quranComRecitationId, num, getBaseReciterCapability]);

  // Hydrate preferensi reader (terutama qari terakhir yang dipakai)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await getItem<QuranReaderPrefs>(STORAGE_KEY);
        if (!active) return;
        if (reciterParam) {
          setReciter(resolveReciterById(reciterParam));
        } else if (saved?.reciterId) {
          setReciter(resolveReciterById(saved.reciterId));
        }
        if (saved?.ayahPlayMode === 'single' || saved?.ayahPlayMode === 'continuous') {
          setAyahPlayMode(saved.ayahPlayMode);
        }
        if (typeof saved?.showReaderTips === 'boolean') {
          setShowReaderTips(saved.showReaderTips);
        }
        if (typeof saved?.showOnlyAsbabAyahs === 'boolean') {
          setShowOnlyAsbabAyahs(saved.showOnlyAsbabAyahs);
        }
      } finally {
        if (active) setPrefsLoaded(true);
      }
    })();

    return () => { active = false; };
  }, [reciterParam]);

  // Simpan preferensi ke storage agar sinkron dengan layar daftar surah
  useEffect(() => {
    if (!prefsLoaded) return;
    let active = true;
    (async () => {
      const existing = (await getItem<QuranReaderPrefs>(STORAGE_KEY)) ?? {};
      if (!active) return;
      await setItem(STORAGE_KEY, {
        ...existing,
        script,
        displayMode,
        ayahPlayMode,
        fontSize: arabicFontSize,
        showTranslation,
        reciterId: reciter.id,
        showReaderTips,
        showOnlyAsbabAyahs,
      });
    })();
    return () => { active = false; };
  }, [prefsLoaded, script, displayMode, ayahPlayMode, arabicFontSize, showTranslation, reciter.id, showReaderTips, showOnlyAsbabAyahs]);

  const refreshBookmarkState = useCallback(async () => {
    const all = await getBookmarks();
    const ayahSet = new Set(
      all
        .filter(b => b.surahNumber === num && (b.kind ?? (b.ayahNumber === 0 ? 'surah' : 'ayah')) === 'ayah')
        .map(b => b.ayahNumber)
    );
    const hasSurahBookmark = all.some(
      b => b.surahNumber === num && (b.kind ?? (b.ayahNumber === 0 ? 'surah' : 'ayah')) === 'surah'
    );
    setBookmarks(ayahSet);
    setSurahBookmarked(hasSurahBookmark);
    setBookmarkHistory(all);
  }, [num]);

  // Sinkronkan bookmark per-surah dari storage agar tidak hilang saat reopen
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await getBookmarks();
        if (!active) return;
        const ayahSet = new Set(
          all
            .filter(b => b.surahNumber === num && (b.kind ?? (b.ayahNumber === 0 ? 'surah' : 'ayah')) === 'ayah')
            .map(b => b.ayahNumber)
        );
        const hasSurahBookmark = all.some(
          b => b.surahNumber === num && (b.kind ?? (b.ayahNumber === 0 ? 'surah' : 'ayah')) === 'surah'
        );
        setBookmarks(ayahSet);
        setSurahBookmarked(hasSurahBookmark);
        setBookmarkHistory(all);
      } catch {
        if (active) {
          setBookmarks(new Set());
          setSurahBookmarked(false);
          setBookmarkHistory([]);
        }
      }
    })();
    return () => { active = false; };
  }, [num]);

  useEffect(() => {
    if (!showBookmarkHistory) return;
    refreshBookmarkState().catch(() => {});
  }, [showBookmarkHistory, refreshBookmarkState]);

  // Juz mode: pre-populate juzSurahMap dengan surah pertama yang sudah ter-fetch
  useEffect(() => {
    if (!isJuzMode || !surah) return;
    setJuzSurahMap(prev => {
      if (prev.get(num) === surah) return prev;
      const next = new Map(prev);
      next.set(num, surah);
      return next;
    });
  }, [isJuzMode, surah, num]);

  // Juz mode: fetch semua surah dalam range juz secara sequential
  useEffect(() => {
    if (!isJuzMode) return;
    let cancelled = false;
    (async () => {
      for (let s = juzStartSurah; s <= juzEndSurah; s++) {
        if (cancelled) return;
        const sNum = s;
        try {
          const data = await fetchSurahWithOffline(sNum, script, lang);
          if (data && !cancelled) {
            setJuzSurahMap(prev => {
              if (prev.get(sNum) === data) return prev;
              const next = new Map(prev);
              next.set(sNum, data);
              return next;
            });
          }
        } catch { /* skip */ }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJuzMode, juzStartSurah, juzEndSurah, script, lang]);

  // Juz mode: load bookmark untuk semua surah dalam juz
  useEffect(() => {
    if (!isJuzMode) return;
    let cancelled = false;
    getBookmarks().then(all => {
      if (cancelled) return;
      const m = new Map<number, Set<number>>();
      for (const b of all) {
        if (b.surahNumber < juzStartSurah || b.surahNumber > juzEndSurah) continue;
        const kind = b.kind ?? (b.ayahNumber === 0 ? 'surah' : 'ayah');
        if (kind !== 'ayah') continue;
        if (!m.has(b.surahNumber)) m.set(b.surahNumber, new Set());
        m.get(b.surahNumber)!.add(b.ayahNumber);
      }
      setJuzAllBookmarks(m);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isJuzMode, juzStartSurah, juzEndSurah]);

  // Sync refs so callbacks always use latest values
  useEffect(() => { reciterRef.current = reciter; }, [reciter]);
  useEffect(() => { fallbackReciterNoticeRef.current = false; }, [reciter.id]);
  useEffect(() => { surahDataRef.current = surah; }, [surah]);
  useEffect(() => {
    if (!Number.isFinite(routeNum) || routeNum <= 0) return;
    setNum(routeNum);
  }, [routeNum]);

  useEffect(() => {
    const dir = navDirState ?? (navDirParam === 'next' ? 'next' : navDirParam === 'prev' ? 'prev' : null);
    if (!dir || isJuzMode) {
      slideAnim.setValue(0);
      isNavigatingRef.current = false;
      return;
    }

    const from = dir === 'next' ? screenWidth : -screenWidth;
    slideAnim.setValue(from);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      isNavigatingRef.current = false;
      setNavDirState(null);
    });
  }, [num, navDirParam, navDirState, screenWidth, slideAnim, isJuzMode]);

  const unloadCurrentSound = useCallback(async () => {
    const current = soundRef.current;
    soundRef.current = null;
    quranAudioService.detach();
    if (!current) return;
    try { current.clearLockScreenControls(); } catch {}
    try { current.remove(); } catch {}
  }, []);

  const buildAyahClipUrls = useCallback(async (
    surahNumber: number,
    ayahInSurah: number,
    reciterId: string,
    preferQuranCom = false
  ) => {
    const primary = getAudioUrl(surahNumber, ayahInSurah, reciterId);
    const urlsPrimary: string[] = [];
    const urlsFallback: string[] = [];
    let usedFallbackReciter = false;

    const offlineUri = await getOfflineAyahAudioUri(surahNumber, ayahInSurah, reciterId);
    if (offlineUri) {
      urlsPrimary.push(offlineUri);
    }

    // Selalu gunakan Quran.com CDN sebagai prioritas utama (infrastruktur Cloudflare sangat cepat)
    try {
      const fallback = await getAyahAudioFallbackUrl(surahNumber, ayahInSurah, reciterId);
      if (fallback.url && !fallback.usedFallbackReciter) {
        urlsPrimary.push(fallback.url);
      }
      usedFallbackReciter = fallback.usedFallbackReciter;
    } catch {
      // fallback opsional
    }

    // Prioritaskan cdn.islamic.network karena jauh lebih cepat (CDN Cloudflare) dibanding everyayah.com
    const islamicUrl = getIslamicNetworkAudioUrl(surahNumber, ayahInSurah, reciterId);
    if (islamicUrl) urlsPrimary.push(islamicUrl);

    // everyayah.com (qori asli, format {surah3d}{ayah3d}.mp3) sebagai fallback terakhir
    if (primary) urlsPrimary.push(primary);

    return {
      urls: Array.from(new Set([...urlsPrimary, ...urlsFallback].filter(Boolean))),
      usedFallbackReciter,
    };
  }, []);

  const playAudioQueue = useCallback(async (
    clips: Array<{
      urls: string[];
      usedFallbackReciter?: boolean;
      onStart?: () => void;
      onFinish?: () => void;
      onProgress?: (info: { ratio: number; positionMs: number; durationMs: number }) => void;
    }>,
    requestId: number,
    onDone: () => void,
    onError: () => void
  ) => {
    const playClipAt = async (clipIndex: number): Promise<void> => {
      if (requestId !== playbackRequestRef.current) return;
      if (clipIndex >= clips.length) {
        onDone();
        return;
      }

      const clip = clips[clipIndex];
      clip.onStart?.();
      const candidates = Array.from(
        new Set(
          (Array.isArray(clip.urls) ? clip.urls : [])
            .map(u => String(u ?? '').trim())
            .filter(Boolean)
        )
      );
      if (!candidates.length) {
        if (requestId !== playbackRequestRef.current) return;
        onError();
        return;
      }

      let loaded = false;
      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
        const url = candidates[candidateIndex];
        await unloadCurrentSound();
        if (requestId !== playbackRequestRef.current) return;
        try {
          const sound = createAudioPlayer({ uri: url }, { updateInterval: 350 });
          if (requestId !== playbackRequestRef.current) {
            try { sound.remove(); } catch {}
            return;
          }
          soundRef.current = sound;
          quranAudioService.attach(sound); // Simpan referensi agar bertahan saat komponen unmount
          sound.play();
          loaded = true;

          // Tampilkan lock screen player saat mode surah (background playback)
          if (surahModeRef.current) {
            try {
              const surahData = surahDataRef.current;
              const rec = reciterRef.current;
              sound.setActiveForLockScreen(true, {
                title: surahData?.arabic.englishName ?? 'Al-Quran',
                artist: rec.name,
                albumTitle: 'MuslimMate',
              });
            } catch {}
          }

          let handledFinish = false;
          sound.addListener('playbackStatusUpdate', status => {
            if (requestId !== playbackRequestRef.current) return;

            const durationMs = (status.duration ?? 0) * 1000;
            if (durationMs > 0) {
              const positionMs = (status.currentTime ?? 0) * 1000;
              const ratio = positionMs / durationMs;
              clip.onProgress?.({
                ratio: Math.max(0, Math.min(1, ratio)),
                positionMs: Math.max(0, positionMs),
                durationMs: Math.max(1, durationMs),
              });
            }

            if (!status.didJustFinish || handledFinish) return;
            handledFinish = true;
            clip.onProgress?.({ ratio: 1, positionMs: 1, durationMs: 1 });
            clip.onFinish?.();
            playClipAt(clipIndex + 1);
          });
          break;
        } catch {
          // Coba kandidat URL berikutnya
        }
      }

      if (!loaded) {
        if (requestId !== playbackRequestRef.current) return;
        onError();
      }
    };

    await playClipAt(0);
  }, [unloadCurrentSound]);

  // â"€â"€ Loaders â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSurahWithOffline(num, script, lang);
      setSurah(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPemulaData = async () => {
    try {
      setModeLoading(true);
      const [translitRes, wbwRes] = await Promise.allSettled([
        fetchSurahTranslitWithOffline(num),
        fetchSurahWordByWordWithOffline(num, lang),
      ]);

      if (translitRes.status === 'fulfilled') setTranslitTexts(translitRes.value);
      else setTranslitTexts([]);

      if (wbwRes.status === 'fulfilled') setWordByWordMap(wbwRes.value);
      else setWordByWordMap({});
    } finally {
      setModeLoading(false);
    }
  };

  const goToSurah = useCallback(async (
    targetSurah: number,
    opts?: { autoPlay?: boolean; startAyah?: number; chain?: boolean; navDir?: 'next' | 'prev' }
  ) => {
    if (isNavigatingRef.current) return;
    if (targetSurah < minSurahLimit || targetSurah > maxSurahLimit || targetSurah === num) return;

    const hasSlide = !!opts?.navDir && !isJuzMode;
    if (hasSlide) isNavigatingRef.current = true;

    const prefetchMain = fetchSurahWithOffline(targetSurah, script, lang).catch(() => null);
    if (displayMode === 'pemula') {
      fetchSurahTranslitWithOffline(targetSurah).catch(() => null);
      fetchSurahWordByWordWithOffline(targetSurah, lang).catch(() => null);
    }
    const prefetchedMain = await Promise.race<SurahWithTranslation | null>([
      prefetchMain as Promise<SurahWithTranslation | null>,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 360)),
    ]);

    if (hasSlide) {
      const to = opts?.navDir === 'next' ? -screenWidth : screenWidth;
      await new Promise<void>(resolve => {
        Animated.timing(slideAnim, {
          toValue: to,
          duration: 170,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }).start(() => resolve());
      });
    }

    playbackRequestRef.current++;
    await unloadCurrentSound();
    surahModeRef.current = false;
    setIsPlayingSurah(false);
    setIsSurahPaused(false);
    setPlayingAyah(null);
    setPlayingAyahProgress(0);
    setPlayingBasmallah(false);
    setTranslitTexts(null);
    setWordByWordMap(null);
    if (opts?.autoPlay) {
      pendingAutoPlayRef.current = {
        surah: targetSurah,
        startAyah: Math.max(1, opts.startAyah ?? 1),
        chain: opts.chain ?? true,
      };
    } else {
      pendingAutoPlayRef.current = null;
    }
    setNavDirState(opts?.navDir ?? (targetSurah > num ? 'next' : 'prev'));
    setNum(targetSurah);
    if (prefetchedMain) {
      setSurah(prefetchedMain);
      setLoading(false);
      setError(null);
    }
    if (!hasSlide) isNavigatingRef.current = false;
  }, [num, unloadCurrentSound, screenWidth, slideAnim, script, lang, displayMode, minSurahLimit, maxSurahLimit, isJuzMode]);

  const goToJuz = useCallback(async (targetJuz: number, navDir: 'next' | 'prev') => {
    if (isNavigatingRef.current) return;
    if (!juzId || targetJuz === juzId) return;

    const range = JUZ_LIST.find(j => j.number === targetJuz);
    const route = buildJuzRoute(targetJuz, navDir);
    if (!range || !route) return;

    isNavigatingRef.current = true;
    slideAnim.stopAnimation();
    slideAnim.setValue(0);

    try {
      const prefetchMain = fetchSurahWithOffline(range.startSurah, script, lang).catch(() => null);
      const prefetchedMain = await Promise.race<SurahWithTranslation | null>([
        prefetchMain as Promise<SurahWithTranslation | null>,
        new Promise<null>(resolve => setTimeout(() => resolve(null), 420)),
      ]);

      playbackRequestRef.current++;
      await unloadCurrentSound();
      surahModeRef.current = false;
      chainPlaybackRef.current = false;
      pendingAutoPlayRef.current = null;
      clearJuzPlayingState();
      setIsPlayingSurah(false);
      setIsSurahPaused(false);
      setPlayingAyah(null);
      setPlayingAyahProgress(0);
      setPlayingBasmallah(false);
      setTranslitTexts(null);
      setWordByWordMap(null);
      setError(null);

      if (prefetchedMain) {
        setSurah(prefetchedMain);
        setJuzSurahMap(prev => {
          if (prev.get(range.startSurah) === prefetchedMain) return prev;
          const next = new Map(prev);
          next.set(range.startSurah, prefetchedMain);
          return next;
        });
        setLoading(false);
      } else {
        setSurah(null);
        setLoading(true);
      }

      setNavDirState(null);
      setNum(range.startSurah);
      router.setParams({ ...route.params, navDir: '' } as any);
      requestAnimationFrame(() => {
        juzFlatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        isNavigatingRef.current = false;
      });
    } catch {
      isNavigatingRef.current = false;
      slideAnim.setValue(0);
    }
  }, [juzId, buildJuzRoute, script, lang, slideAnim, unloadCurrentSound, clearJuzPlayingState]);

  const swipeResponder = React.useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !isJuzMode && Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -70) {
          goToSurah(num + 1, { navDir: 'next' });
        } else if (gesture.dx >= 70) {
          goToSurah(num - 1, { navDir: 'prev' });
        }
      },
    }),
    [goToSurah, num, isJuzMode]
  );

  const markUserScrolling = useCallback((suppressMs: number) => {
    userScrollingRef.current = true;
    autoScrollSuppressedUntilRef.current = Date.now() + suppressMs;
    if (releaseUserScrollTimerRef.current) {
      clearTimeout(releaseUserScrollTimerRef.current);
      releaseUserScrollTimerRef.current = null;
    }
  }, []);

  const releaseUserScrollingSoon = useCallback((delayMs = 180) => {
    if (releaseUserScrollTimerRef.current) {
      clearTimeout(releaseUserScrollTimerRef.current);
    }
    releaseUserScrollTimerRef.current = setTimeout(() => {
      userScrollingRef.current = false;
      releaseUserScrollTimerRef.current = null;
    }, delayMs);
  }, []);

  const scrollAyahToTop = useCallback((ayahNumberInSurah: number, opts?: { animated?: boolean; force?: boolean }) => {
    if (!Number.isFinite(ayahNumberInSurah) || ayahNumberInSurah <= 0) return;

    if (opts?.force) {
      // Force: ayah baru mulai diputar — override semua suppression
      userScrollingRef.current = false;
      autoScrollSuppressedUntilRef.current = 0;
    } else {
      if (userScrollingRef.current) return;
      if (Date.now() < autoScrollSuppressedUntilRef.current) return;
    }

    if (isJuzMode) {
      const juzIndex = getJuzListIndexForAyah(num, ayahNumberInSurah);
      if (juzIndex < 0) return;
      try {
        juzFlatListRef.current?.scrollToIndex({
          index: juzIndex,
          animated: opts?.animated ?? true,
          viewPosition: AYAH_FOLLOW_VIEW_POSITION,
          viewOffset: AYAH_FOLLOW_VIEW_OFFSET,
        });
      } catch {
        setTimeout(() => {
          if (!opts?.force && userScrollingRef.current) return;
          juzFlatListRef.current?.scrollToIndex({
            index: juzIndex,
            animated: opts?.animated ?? true,
            viewPosition: AYAH_FOLLOW_VIEW_POSITION,
            viewOffset: AYAH_FOLLOW_VIEW_OFFSET,
          });
        }, 140);
      }
      return;
    }

    const listIndex = getVisibleListIndexForAyah(ayahNumberInSurah);
    if (listIndex < 0) return;

    try {
      flatListRef.current?.scrollToIndex({
        index: listIndex,
        animated: opts?.animated ?? true,
        viewPosition: AYAH_FOLLOW_VIEW_POSITION,
        viewOffset: AYAH_FOLLOW_VIEW_OFFSET,
      });
    } catch {
      setTimeout(() => {
        if (!opts?.force && userScrollingRef.current) return;
        flatListRef.current?.scrollToIndex({
          index: listIndex,
          animated: opts?.animated ?? true,
          viewPosition: AYAH_FOLLOW_VIEW_POSITION,
          viewOffset: AYAH_FOLLOW_VIEW_OFFSET,
        });
      }, 140);
    }
  }, [isJuzMode, num, getJuzListIndexForAyah, getVisibleListIndexForAyah]);

  const clearPlayingAyahState = useCallback(() => {
    setPlayingAyah(null);
    setPlayingAyahProgress(0);
    setActiveAyahWordIndex(null);
  }, []);

  const activatePlayingAyah = useCallback((ayahNumberInSurah: number, forceScroll = true) => {
    setPlayingAyah(ayahNumberInSurah);
    setPlayingAyahProgress(0.02);
    setActiveAyahWordIndex(null);
    scrollAyahToTop(ayahNumberInSurah, { animated: true, force: forceScroll });
  }, [scrollAyahToTop]);

  const updatePlayingAyahProgress = useCallback((ratio: number) => {
    const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
    setPlayingAyahProgress(prev => {
      if (Math.abs(prev - clamped) < QARI_PROGRESS_MIN_DELTA && clamped < 0.995) return prev;
      return clamped;
    });
  }, []);

  const findActiveWordIndex = useCallback((segments: WordTimingSegment[], positionMs: number): number | null => {
    if (!segments.length) return null;
    const cursor = Math.max(0, Math.floor(positionMs));
    for (const seg of segments) {
      if (cursor >= (seg.startMs - 100) && cursor <= (seg.endMs + 120)) {
        return seg.wordIndex;
      }
    }
    if (cursor < segments[0].startMs) return segments[0].wordIndex;
    return segments[segments.length - 1].wordIndex;
  }, []);

  // â"€â"€ Actions â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const handleAyahPress = async (ayahNumberInSurah: number) => {
    if (!surahMeta) return;
    await setLastRead({
      surahNumber: num,
      surahName: surahMeta.englishName,
      ayahNumber: ayahNumberInSurah,
      readAt: new Date().toISOString(),
    });
    // Log reading session to Quran.Foundation
    isQFLoggedIn().then(loggedIn => {
      if (loggedIn) {
        logQFReadingSession(`${num}:${ayahNumberInSurah}`, 30).catch(() => {});
      }
    });
  };

  const copyAyahToClipboard = useCallback((
    ayahNumberInSurah: number,
    arabicText: string,
    translation?: string
  ) => {
    const surahLabel = surahMeta?.englishName ?? `Surah ${num}`;
    const parts = [
      `${surahLabel} - ${t('verse_label')} ${ayahNumberInSurah}`,
      arabicText,
      translation?.trim() ? `${t('translation_prefix')}: ${translation}` : '',
    ].filter(Boolean);
    Clipboard.setString(parts.join('\n\n'));
    Alert.alert(t('copied_title'), `${t('verse_label')} ${ayahNumberInSurah} ${t('copied_ayah')}`);
  }, [num, surahMeta?.englishName, t]);

  // Juz mode: toggle bookmark untuk ayat dari surah manapun dalam juz
  const toggleJuzBookmark = async (
    surahNum: number,
    ayahNumberInSurah: number,
    arabicText: string,
    translationText: string
  ) => {
    const surahM = SURAH_LIST.find(s => s.number === surahNum);
    const isMarked = juzAllBookmarks.get(surahNum)?.has(ayahNumberInSurah) ?? false;
    if (isMarked) {
      await removeBookmark(surahNum, ayahNumberInSurah, 'ayah');
      setJuzAllBookmarks(prev => {
        const next = new Map(prev);
        const s = new Set(next.get(surahNum) ?? []);
        s.delete(ayahNumberInSurah);
        next.set(surahNum, s);
        return next;
      });
    } else {
      await addBookmark({
        surahNumber: surahNum,
        surahName: surahM?.englishName ?? `Surah ${surahNum}`,
        ayahNumber: ayahNumberInSurah,
        arabicText,
        translation: translationText,
        kind: 'ayah',
        savedAt: new Date().toISOString(),
      });
      setJuzAllBookmarks(prev => {
        const next = new Map(prev);
        const s = new Set(next.get(surahNum) ?? []);
        s.add(ayahNumberInSurah);
        next.set(surahNum, s);
        return next;
      });
    }
  };

  const openBookmarkNamingModal = (
    kind: 'ayah' | 'surah',
    ayahNumberInSurah: number,
    arabicText: string,
    translation: string
  ) => {
    setPendingBookmark({ kind, ayahNumberInSurah, arabicText, translation });
    setBookmarkNameInput(kind === 'surah' ? t('favorite_surah') : t('favorite_ayah'));
    setShowBookmarkNameModal(true);
  };

  const savePendingBookmark = async () => {
    if (!pendingBookmark || !surahMeta) return;
    const groupName = bookmarkNameInput.trim() || (pendingBookmark.kind === 'surah' ? t('favorite_surah') : t('favorite_ayah'));
    await addBookmark({
      surahNumber: num,
      ayahNumber: pendingBookmark.ayahNumberInSurah,
      surahName: surahMeta.englishName,
      arabicText: pendingBookmark.arabicText,
      translation: pendingBookmark.translation,
      kind: pendingBookmark.kind,
      groupName,
      savedAt: new Date().toISOString(),
    });

    if (pendingBookmark.kind === 'surah') {
      setSurahBookmarked(true);
    } else {
      setBookmarks(prev => new Set(prev).add(pendingBookmark.ayahNumberInSurah));
    }

    // Sync bookmark to Quran.Foundation if logged in
    if (pendingBookmark.kind === 'ayah') {
      isQFLoggedIn().then(loggedIn => {
        if (loggedIn) {
          const verseKey = `${num}:${pendingBookmark.ayahNumberInSurah}`;
          addQFBookmark(verseKey, num, pendingBookmark.ayahNumberInSurah).catch(() => {});
        }
      });
    }

    setPendingBookmark(null);
    setShowBookmarkNameModal(false);
    await refreshBookmarkState();
  };

  const toggleBookmark = async (
    ayahNumberInSurah: number,
    arabicText: string,
    translation: string
  ) => {
    if (!surahMeta) return;
    const isMarked = bookmarks.has(ayahNumberInSurah);
    if (isMarked) {
      await removeBookmark(num, ayahNumberInSurah, 'ayah');
      setBookmarks(prev => { const s = new Set(prev); s.delete(ayahNumberInSurah); return s; });
    } else {
      openBookmarkNamingModal('ayah', ayahNumberInSurah, arabicText, translation);
      return;
    }
    await refreshBookmarkState();
  };

  const toggleSurahBookmark = async () => {
    if (!surahMeta) return;
    if (surahBookmarked) {
      await removeBookmark(num, 0, 'surah');
      setSurahBookmarked(false);
      await refreshBookmarkState();
      return;
    }
    openBookmarkNamingModal(
      'surah',
      0,
      surahMeta.name,
      lang === 'id' ? `${surahMeta.indonesianName} (${surahMeta.englishName})` : surahMeta.englishName
    );
  };

  const groupedBookmarkHistory = React.useMemo(() => {
    const out = new Map<string, BookmarkItem[]>();
    bookmarkHistory.forEach(item => {
      const kind = item.kind ?? (item.ayahNumber === 0 ? 'surah' : 'ayah');
      const name = item.groupName?.trim() || (kind === 'surah' ? t('favorite_surah') : t('favorite_ayah'));
      if (!out.has(name)) out.set(name, []);
      out.get(name)!.push(item);
    });
    return Array.from(out.entries()).map(([groupName, items]) => ({ groupName, items }));
  }, [bookmarkHistory, t]);

  const openBookmarkTarget = (bookmark: BookmarkItem) => {
    setShowBookmarkHistory(false);
    goToSurah(bookmark.surahNumber).catch(() => {});
  };

  const deleteBookmarkItem = async (bookmark: BookmarkItem) => {
    await removeBookmark(bookmark.surahNumber, bookmark.ayahNumber, bookmark.kind);
    await refreshBookmarkState();
  };

  // Putar ayat ke-index dalam mode surah (auto-advance)
  const playAyahAt = useCallback(async (index: number) => {
    const requestId = ++playbackRequestRef.current;
    // Hentikan audio lama segera agar tidak double suara
    const _prev = soundRef.current;
    soundRef.current = null;
    quranAudioService.detach();
    if (_prev) { try { _prev.clearLockScreenControls(); } catch {} try { _prev.remove(); } catch {} }
    const data = surahDataRef.current;
    const rec = reciterRef.current;
    if (!data) return;
    const ayahs = data.arabic.ayahs;
    const ayahCount = ayahs.length;
    if (ayahCount <= 0) return;
    const { startAyah, endAyahInSurah } = getAyahBoundsForCurrentSurah(ayahCount);
    const minIndex = Math.max(0, startAyah - 1);
    const maxIndex = Math.max(minIndex, endAyahInSurah - 1);
    const nextSurahForChain = num + 1;
    const canChainToNextSurah = isJuzMode
      ? (surahModeRef.current && chainPlaybackRef.current && num < maxSurahLimit)
      : (surahModeRef.current && chainPlaybackRef.current && num < 114);
    const nextSurahStartAyah = getStartAyahForSurahInJuz(nextSurahForChain);

    const clampedIndex = Math.max(minIndex, index);
    if (clampedIndex > maxIndex) {
      if (canChainToNextSurah) {
        await goToSurah(nextSurahForChain, {
          autoPlay: true,
          startAyah: nextSurahStartAyah,
          chain: true,
          navDir: 'next',
        });
        return;
      }
      surahModeRef.current = false;
      chainPlaybackRef.current = false;
      setIsPlayingSurah(false);
      setIsSurahPaused(false);
      clearPlayingAyahState();
      setPlayingBasmallah(false);
      return;
    }
    currentSurahIdxRef.current = clampedIndex;
    useQuranAudioStore.getState().setCurrentAyah(clampedIndex);
    const ayah = ayahs[clampedIndex];
    try {
      if (requestId !== playbackRequestRef.current) return;
      setIsSurahPaused(false);
      scrollAyahToTop(ayah.numberInSurah, { animated: true });

      if (rec.surahOnly) {
        const offlineSurahUrl = await getOfflineSurahAudioUri(num, rec.id);
        const surahUrl = offlineSurahUrl ?? getSurahAudioUrl(num, rec.id);
        if (!surahUrl) throw new Error('URL audio surah tidak ditemukan');
        await playAudioQueue(
          [
            {
              urls: [surahUrl],
              onStart: () => {
                setPlayingBasmallah(false);
                clearPlayingAyahState();
              },
            },
          ],
          requestId,
          () => {
            if (requestId !== playbackRequestRef.current) return;
            if (canChainToNextSurah) {
              goToSurah(nextSurahForChain, {
                autoPlay: true,
                startAyah: nextSurahStartAyah,
                chain: true,
                navDir: 'next',
              }).catch(() => {});
              return;
            }
            surahModeRef.current = false;
            chainPlaybackRef.current = false;
            setIsPlayingSurah(false);
            setIsSurahPaused(false);
            setPlayingBasmallah(false);
            clearPlayingAyahState();
          },
          () => {
            if (requestId !== playbackRequestRef.current) return;
            surahModeRef.current = false;
            chainPlaybackRef.current = false;
            setIsPlayingSurah(false);
            setIsSurahPaused(false);
            setPlayingBasmallah(false);
            clearPlayingAyahState();
            showOptionalAudioDownloadPrompt(
              lang === 'en'
                ? 'This qari audio cannot be played right now.'
                : 'Audio qari ini belum bisa diputar saat ini.'
            );
          }
        );
        return;
      }

      const preferTimingAudio = reciterCapability === 'full';
      const ayahTimingSegments = preferTimingAudio ? (surahWordTimingMap[ayah.numberInSurah] ?? []) : [];
      const clips: Array<{
        urls: string[];
        usedFallbackReciter?: boolean;
        onStart?: () => void;
        onFinish?: () => void;
        onProgress?: (info: { ratio: number; positionMs: number; durationMs: number }) => void;
      }> = [];
      const shouldPlayBasmallahFirst = showBasmalah && ayah.numberInSurah === 1;

      if (shouldPlayBasmallahFirst) {
        const basmallahClip = await buildAyahClipUrls(1, 1, rec.id, preferTimingAudio);
        clips.push({
          urls: basmallahClip.urls,
          usedFallbackReciter: basmallahClip.usedFallbackReciter,
          onStart: () => {
            clearPlayingAyahState();
            setPlayingBasmallah(true);
          },
          onFinish: () => {
            setPlayingBasmallah(false);
          },
        });
      } else {
        setPlayingBasmallah(false);
      }

      const ayahClip = await buildAyahClipUrls(num, ayah.numberInSurah, rec.id, preferTimingAudio);
      clips.push({
        urls: ayahClip.urls,
        usedFallbackReciter: ayahClip.usedFallbackReciter,
        onStart: () => {
          activatePlayingAyah(ayah.numberInSurah);
        },
        onProgress: info => {
          updatePlayingAyahProgress(info.ratio);
          if (!preferTimingAudio || !ayahTimingSegments.length) return;
          const activeWord = findActiveWordIndex(ayahTimingSegments, info.positionMs);
          setActiveAyahWordIndex(prev => (prev === activeWord ? prev : activeWord));
        },
      });

      await playAudioQueue(
        clips,
        requestId,
        () => {
          if (requestId !== playbackRequestRef.current) return;
          setPlayingBasmallah(false);
          if (surahModeRef.current) {
            playAyahAt(clampedIndex + 1);
          } else {
            clearPlayingAyahState();
          }
        },
        () => {
          if (requestId !== playbackRequestRef.current) return;
          setPlayingBasmallah(false);
          clearPlayingAyahState();
          surahModeRef.current = false;
          chainPlaybackRef.current = false;
          setIsPlayingSurah(false);
          setIsSurahPaused(false);
          showOptionalAudioDownloadPrompt(
            lang === 'en'
              ? 'Ayah audio is not available right now.'
              : 'Audio ayat belum tersedia saat ini.'
          );
        }
      );
    } catch {
      if (requestId === playbackRequestRef.current) {
        setPlayingBasmallah(false);
        clearPlayingAyahState();
        surahModeRef.current = false;
        chainPlaybackRef.current = false;
        setIsPlayingSurah(false);
        setIsSurahPaused(false);
      }
    }
  }, [
    num,
    goToSurah,
    playAudioQueue,
    showBasmalah,
    buildAyahClipUrls,
    activatePlayingAyah,
    clearPlayingAyahState,
    scrollAyahToTop,
    updatePlayingAyahProgress,
    reciterCapability,
    surahWordTimingMap,
    findActiveWordIndex,
    showOptionalAudioDownloadPrompt,
    getAyahBoundsForCurrentSurah,
    isJuzMode,
    maxSurahLimit,
    getStartAyahForSurahInJuz,
    lang,
  ]);

  const startSurahPlayback = async (fromIndex = 0, chain = true) => {
    const rec = reciterRef.current;
    const ayahCount = surahDataRef.current?.arabic.ayahs.length ?? 0;
    const { startAyah, endAyahInSurah } = getAyahBoundsForCurrentSurah(Math.max(ayahCount, 1));
    const minIndex = Math.max(0, startAyah - 1);
    const maxIndex = Math.max(minIndex, endAyahInSurah - 1);
    const requestedIndex = rec.surahOnly ? minIndex : Math.max(minIndex, fromIndex);
    const effectiveFromIndex = Math.min(requestedIndex, maxIndex);
    surahModeRef.current = true;
    chainPlaybackRef.current = chain;
    currentSurahIdxRef.current = effectiveFromIndex;
    setIsPlayingSurah(true);
    setIsSurahPaused(false);
    // Aktivasi store untuk mini player
    useQuranAudioStore.getState().activate({
      surahNumber: num,
      surahName: surahMeta?.englishName ?? `Surah ${num}`,
      surahNameAr: surahMeta?.name ?? '',
      reciterName: rec.name,
      currentAyahIndex: effectiveFromIndex,
      totalAyahs: ayahCount,
    });
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
    await playAyahAt(effectiveFromIndex);
  };

  const pauseSurahPlayback = async () => {
    if (!isPlayingSurah || isSurahPaused) return;
    try {
      soundRef.current?.pause();
      setIsSurahPaused(true);
      useQuranAudioStore.getState().setPlayState(false, true);
    } catch {}
  };

  const resumeSurahPlayback = async () => {
    if (!isPlayingSurah) {
      await startSurahPlayback(currentSurahIdxRef.current, chainPlaybackRef.current);
      return;
    }
    if (!isSurahPaused) return;
    try {
      if (soundRef.current) {
        soundRef.current.play();
        setIsSurahPaused(false);
        useQuranAudioStore.getState().setPlayState(true, false);
      } else {
        await playAyahAt(currentSurahIdxRef.current);
      }
    } catch {}
  };

  const stopSurahPlayback = async () => {
    playbackRequestRef.current++;
    surahModeRef.current = false;
    chainPlaybackRef.current = false;
    setIsPlayingSurah(false);
    setIsSurahPaused(false);
    clearJuzPlayingState();
    await unloadCurrentSound();
    setPlayingBasmallah(false);
    clearPlayingAyahState();
    useQuranAudioStore.getState().deactivate();
    // Kembalikan mode audio ke default (non-background) setelah selesai
    try { await setAudioModeAsync({ shouldPlayInBackground: false }); } catch {}
  };

  const playAudio = async (_globalAyahNumber: number, numberInSurah: number) => {
    if (reciter.surahOnly) {
      Alert.alert(
        t('qari_mode_surah_title'),
        t('qari_mode_surah_message')
      );
      return;
    }
    // Hentikan mode surah dulu
    surahModeRef.current = false;
    chainPlaybackRef.current = false;
    setIsPlayingSurah(false);
    setIsSurahPaused(false);
    clearJuzPlayingState();
    try {
      // Cek soundRef.current (bukan state) agar tidak pakai nilai stale setelah stop
      if (soundRef.current && ((playingAyah === numberInSurah) || (numberInSurah === 1 && playingBasmallah))) { await stopAudio(); return; }
      const requestId = ++playbackRequestRef.current;
      // Hentikan audio lama segera agar tidak double suara
      await unloadCurrentSound();
      if (requestId !== playbackRequestRef.current) return;
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });

      const preferTimingAudio = reciterCapability === 'full';
      const ayahTimingSegments = preferTimingAudio ? (surahWordTimingMap[numberInSurah] ?? []) : [];
      const clips: Array<{
        urls: string[];
        usedFallbackReciter?: boolean;
        onStart?: () => void;
        onFinish?: () => void;
        onProgress?: (info: { ratio: number; positionMs: number; durationMs: number }) => void;
      }> = [];
      const shouldPlayBasmallahFirst = showBasmalah && numberInSurah === 1;

      if (shouldPlayBasmallahFirst) {
        const basmallahClip = await buildAyahClipUrls(1, 1, reciter.id, preferTimingAudio);
        clips.push({
          urls: basmallahClip.urls,
          usedFallbackReciter: basmallahClip.usedFallbackReciter,
          onStart: () => {
            clearPlayingAyahState();
            setPlayingBasmallah(true);
          },
          onFinish: () => {
            setPlayingBasmallah(false);
          },
        });
      } else {
        setPlayingBasmallah(false);
      }

      const ayahClip = await buildAyahClipUrls(num, numberInSurah, reciter.id, preferTimingAudio);
      clips.push({
        urls: ayahClip.urls,
        usedFallbackReciter: ayahClip.usedFallbackReciter,
        onStart: () => activatePlayingAyah(numberInSurah),
        onProgress: info => {
          updatePlayingAyahProgress(info.ratio);
          if (!preferTimingAudio || !ayahTimingSegments.length) return;
          const activeWord = findActiveWordIndex(ayahTimingSegments, info.positionMs);
          setActiveAyahWordIndex(prev => (prev === activeWord ? prev : activeWord));
        },
      });

      await playAudioQueue(
        clips,
        requestId,
        () => {
          if (requestId !== playbackRequestRef.current) return;
          setPlayingBasmallah(false);
          clearPlayingAyahState();
        },
        () => {
          if (requestId !== playbackRequestRef.current) return;
          setPlayingBasmallah(false);
          clearPlayingAyahState();
          showOptionalAudioDownloadPrompt(
            lang === 'en'
              ? 'Audio could not be played. Check your connection or download offline audio.'
              : 'Audio belum bisa diputar. Pastikan koneksi aktif atau unduh audio offline.'
          );
        }
      );
    } catch {
      setPlayingBasmallah(false);
      clearPlayingAyahState();
      showOptionalAudioDownloadPrompt(
        lang === 'en'
          ? 'Audio could not be played. Check your connection or download offline audio.'
          : 'Audio belum bisa diputar. Pastikan koneksi aktif atau unduh audio offline.'
      );
    }
  };

  const stopAudio = async () => {
    playbackRequestRef.current++;
    surahModeRef.current = false;
    chainPlaybackRef.current = false;
    setIsPlayingSurah(false);
    setIsSurahPaused(false);
    clearJuzPlayingState();
    await unloadCurrentSound();
    setPlayingBasmallah(false);
    clearPlayingAyahState();
    useQuranAudioStore.getState().deactivate();
  };

  const handleAyahPlayPress = async (globalAyahNumber: number, numberInSurah: number) => {
    if (reciter.surahOnly) {
      Alert.alert(
        t('qari_mode_surah_title'),
        t('qari_mode_surah_ayah_message')
      );
      return;
    }
    await handleAyahPress(numberInSurah);
    scrollAyahToTop(numberInSurah, { animated: true, force: true });
    if (ayahPlayMode === 'continuous') {
      const targetIdx = Math.max(0, numberInSurah - 1);
      // Cek soundRef.current agar toggle tidak pakai isPlayingSurah yang stale setelah stop
      if (soundRef.current && isPlayingSurah && currentSurahIdxRef.current === targetIdx && !isSurahPaused) {
        await stopSurahPlayback();
        return;
      }
      await startSurahFromAyah(numberInSurah, true);
      return;
    }
    await playAudio(globalAyahNumber, numberInSurah);
  };

  // Juz mode: putar ayat secara kontinyu dari ayat yang dipilih
  const playJuzAyah = async (surahNum: number, numberInSurah: number) => {
    const key = `${surahNum}:${numberInSurah}`;
    // Toggle off jika ayat yang sama sedang aktif
    if ((juzPlayingKeyRef.current === key && !isPlayingSurah) || (isPlayingSurah && surahNum === num && (currentSurahIdxRef.current === numberInSurah - 1) && !isSurahPaused)) {
      await stopSurahPlayback();
      clearJuzPlayingState();
      return;
    }
    const rec = reciterRef.current;
    if (rec.surahOnly) {
      clearJuzPlayingState();
      Alert.alert(
        t('qari_mode_surah_title'),
        `${rec.name}: ${t('qari_mode_surah_juz_message')}`
      );
      return;
    }
    // Stop current playback
    await stopSurahPlayback();
    clearJuzPlayingState();

    if (surahNum === num && juzSurahMap.has(surahNum)) {
      // Surah sudah dimuat – putar langsung dari ayat ini secara kontinyu
      await startSurahPlayback(Math.max(0, numberInSurah - 1), true);
    } else {
      // Surah berbeda – navigasi ke surah tersebut lalu auto-play dari ayat ini
      playbackRequestRef.current++;
      await unloadCurrentSound();
      pendingAutoPlayRef.current = { surah: surahNum, startAyah: numberInSurah, chain: true };
      setNum(surahNum);
    }
  };

  useEffect(() => {
    if (loading || !surah || !shouldAutoPlay) return;
    const key = `${num}|${effectiveStartAyahForCurrentSurah}|${shouldChainPlayback ? 1 : 0}`;
    if (autoPlayHandledRef.current === key) return;
    autoPlayHandledRef.current = key;
    const maxAyah = surah.arabic.ayahs.length;
    const startIdx = Math.min(Math.max(effectiveStartAyahForCurrentSurah - 1, 0), Math.max(maxAyah - 1, 0));
    startSurahPlayback(startIdx, shouldChainPlayback);
  }, [loading, surah, shouldAutoPlay, num, effectiveStartAyahForCurrentSurah, shouldChainPlayback, startSurahPlayback]);

  useEffect(() => {
    if (loading || !surah || shouldAutoPlay) return;
    const maxAyah = surah.arabic.ayahs.length;
    const targetAyah = Math.min(Math.max(effectiveStartAyahForCurrentSurah, 1), Math.max(maxAyah, 1));
    if (targetAyah <= 1) return;
    // Deep-link dari Juz/Bookmark harus langsung mendarat ke ayat target, tanpa perlu autoplay.
    const key = `${num}|${targetAyah}|${displayMode}|${showOnlyAsbabAyahs ? 1 : 0}`;
    if (initialStartAyahHandledKeyRef.current === key) return;
    initialStartAyahHandledKeyRef.current = key;

    if (showOnlyAsbabAyahs) {
      setShowOnlyAsbabAyahs(false);
    }
    // Pastikan deep-link Juz/Bookmark tidak diblokir oleh proteksi auto-scroll lama.
    userScrollingRef.current = false;
    autoScrollSuppressedUntilRef.current = 0;

    if (initialStartAyahTimersRef.current.length > 0) {
      initialStartAyahTimersRef.current.forEach(timer => clearTimeout(timer));
      initialStartAyahTimersRef.current = [];
    }

    const scheduleJump = (delayMs: number, animated: boolean) =>
      setTimeout(() => {
        scrollAyahToTop(targetAyah, { animated, force: true });
      }, delayMs);

    initialStartAyahTimersRef.current = [
      scheduleJump(40, false),
      scheduleJump(180, false),
      scheduleJump(420, false),
      scheduleJump(760, false),
      scheduleJump(1200, true),
    ];

    return () => {
      if (initialStartAyahTimersRef.current.length > 0) {
        initialStartAyahTimersRef.current.forEach(timer => clearTimeout(timer));
        initialStartAyahTimersRef.current = [];
      }
    };
  }, [loading, surah, shouldAutoPlay, num, effectiveStartAyahForCurrentSurah, displayMode, showOnlyAsbabAyahs, scrollAyahToTop]);

  useEffect(() => {
    const pending = pendingAutoPlayRef.current;
    if (!pending || loading || !surah) return;
    if (pending.surah !== num) return;
    pendingAutoPlayRef.current = null;
    startSurahPlayback(Math.max(0, pending.startAyah - 1), pending.chain);
  }, [loading, surah, num, startSurahPlayback]);

  const startSurahFromAyah = async (ayahNumberInSurah: number, chain = true) => {
    await handleAyahPress(ayahNumberInSurah);
    await startSurahPlayback(Math.max(0, ayahNumberInSurah - 1), chain);
  };

  //Render helpers
  /** Teks arab yang sesuai mode (tajwid raw / normal) */
  const getArabicText = (index: number, rawText: string): string => {
    if (showBasmalah && index === 0) {
      const stripped = stripBasmallah(rawText);
      // Fallback agar ayat tidak kosong jika source API berbeda format basmalah-nya.
      return normalizeArabicForDisplay(stripped.trim().length > 0 ? stripped : rawText);
    }
    return normalizeArabicForDisplay(rawText);
  };

  const toArabicIndicNumber = (value: number): string =>
    String(Math.max(0, value))
      .split('')
      .map(ch => (/\d/.test(ch) ? ARABIC_INDIC_DIGITS[Number(ch)] : ch))
      .join('');

  const ensureAyahEndMark = (text: string, ayahNumberInSurah: number): string => {
    const trimmed = text.trim();
    if (!trimmed) return text;
    // Jika sudah ada marker akhir ayat bawaan sumber, jangan ubah apa pun.
    if (
      /\u06DD/.test(trimmed) ||
      /\uFD3F[0-9\u0660-\u0669]+\uFD3E/.test(trimmed) ||
      /[\u200E\u200F\u061C]*\s*[\u0660-\u0669]{1,3}\s*$/.test(trimmed)
    ) {
      return trimmed;
    }
    const ayahNumberArabic = toArabicIndicNumber(ayahNumberInSurah);
    return `${trimmed}\u00A0${ORNATE_LEFT_PAREN}${ayahNumberArabic}${ORNATE_RIGHT_PAREN}`;
  };

  const loadUlamaTafsir = useCallback(async (asbabKey: string, asbabun: AsbabunNuzulEntry) => {
    let shouldFetch = false;
    setUlamaTafsirState(prev => {
      const current = prev[asbabKey];
      if (current?.loading || (current?.items?.length ?? 0) > 0) return prev;
      shouldFetch = true;
      return { ...prev, [asbabKey]: { loading: true, items: [] } };
    });
    if (!shouldFetch) return;

    try {
      const items = await fetchUlamaTafsirByAyah(asbabun.surah, asbabun.ayah);
      setUlamaTafsirState(prev => ({
        ...prev,
        [asbabKey]: { loading: false, items },
      }));
    } catch {
      setUlamaTafsirState(prev => ({
        ...prev,
        [asbabKey]: {
          loading: false,
          items: [],
          error: 'Gagal memuat ringkasan tafsir ulama.',
        },
      }));
    }
  }, []);

  const openExternalReference = useCallback(async (url: string) => {
    const target = String(url ?? '').trim();
    if (!target) return;
    try {
      const supported = await Linking.canOpenURL(target);
      if (!supported) {
        Alert.alert('Link Tidak Valid', 'Referensi tidak dapat dibuka di perangkat ini.');
        return;
      }
      await Linking.openURL(target);
    } catch {
      Alert.alert('Gagal Membuka Link', 'Silakan coba lagi beberapa saat.');
    }
  }, []);

  const getAsbabState = useCallback((ayahNumberInSurah: number) => {
    const asbabKey = `${num}:${ayahNumberInSurah}`;
    const asbabun: AsbabunNuzulEntry | null = getAsbabunNuzul(num, ayahNumberInSurah);
    const showAsbabun = !!asbabun && asbabun.ayah === ayahNumberInSurah;
    const isAsbabunExpanded = expandedAsbabun === asbabKey;
    return { asbabKey, asbabun, showAsbabun, isAsbabunExpanded };
  }, [num, expandedAsbabun]);

  const renderAsbabBadge = useCallback((ayahNumberInSurah: number) => {
    const { showAsbabun } = getAsbabState(ayahNumberInSurah);
    if (!showAsbabun) return null;
    return (
      <View style={[styles.asbabBadge, { backgroundColor: '#10B98118', borderColor: '#10B98140' }]}>
        <Ionicons name="journal-outline" size={10} color="#10B981" />
        <Text style={{ color: '#10B981', fontSize: 9, fontWeight: '700', marginLeft: 3 }}>
          Asbabun Nuzul
        </Text>
      </View>
    );
  }, [getAsbabState]);

  const renderAsbabSection = useCallback((ayahNumberInSurah: number) => {
    const { asbabKey, asbabun, showAsbabun, isAsbabunExpanded } = getAsbabState(ayahNumberInSurah);
    if (!showAsbabun || !asbabun) return null;

    const tafsirState = ulamaTafsirState[asbabKey];

    return (
      <>
        <TouchableOpacity
          onPress={() => {
            if (isAsbabunExpanded) {
              setExpandedAsbabun(null);
              return;
            }
            setExpandedAsbabun(asbabKey);
            loadUlamaTafsir(asbabKey, asbabun).catch(() => {});
          }}
          style={[styles.asbabToggle, { backgroundColor: '#10B98110', borderColor: '#10B98130' }]}
        >
          <Ionicons name="journal-outline" size={12} color="#10B981" />
          <Text style={{ color: '#10B981', fontSize: FontSize.xs, fontWeight: '600', flex: 1, marginLeft: 6 }}>
            {asbabun.title}
          </Text>
          <Ionicons name={isAsbabunExpanded ? 'chevron-up' : 'chevron-down'} size={12} color="#10B981" />
        </TouchableOpacity>

        {isAsbabunExpanded && (
          <View style={[styles.asbabPanel, { backgroundColor: C.surface, borderColor: '#10B98128' }]}>
            {asbabun.ayahEnd && (
              <View style={[styles.asbabRangeLabel, { backgroundColor: '#10B98118' }]}>
                <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>
                  Mencakup ayat {asbabun.ayah}-{asbabun.ayahEnd}
                </Text>
              </View>
            )}
            <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, lineHeight: 22, marginBottom: Spacing.sm }}>
              {asbabun.context}
            </Text>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#10B98130', marginBottom: Spacing.sm }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Ionicons name="book-outline" size={12} color={C.gold} />
              <Text style={{ color: C.gold, fontSize: FontSize.xs, fontWeight: '700' }}>Riwayat Hadits</Text>
            </View>
            <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, lineHeight: 19, fontStyle: 'italic', marginBottom: Spacing.sm }}>
              {asbabun.hadith}
            </Text>
            <View style={[styles.asbabSource, { borderColor: C.border }]}>
              <Ionicons name="library-outline" size={11} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 10, marginLeft: 5, flex: 1 }}>{asbabun.source}</Text>
            </View>
            {!!asbabun.referenceLinks?.length && (
              <View style={{ marginTop: Spacing.sm, gap: 6 }}>
                {asbabun.referenceLinks.map((link, idx) => (
                  <TouchableOpacity
                    key={`${asbabKey}-ref-${idx}`}
                    onPress={() => openExternalReference(link)}
                    style={[styles.asbabRefBtn, { borderColor: C.border, backgroundColor: C.card }]}
                  >
                    <Ionicons name="open-outline" size={11} color={C.primary} />
                    <Text style={{ color: C.primary, fontSize: 10, fontWeight: '700', marginLeft: 5, flex: 1 }}>
                      {t('reference_hadith')} #{idx + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.asbabUlamaWrap, { borderColor: C.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="school-outline" size={12} color={C.primary} />
                <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '700' }}>
                  {t('ulama_view_title')}
                </Text>
              </View>

              {tafsirState?.loading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={{ color: C.textMuted, fontSize: 10 }}>{t('loading_tafsir_views')}</Text>
                </View>
              )}

              {!tafsirState?.loading && !!tafsirState?.error && (
                <Text style={{ color: '#EF4444', fontSize: 10 }}>{tafsirState.error}</Text>
              )}

              {!tafsirState?.loading && !tafsirState?.error && (tafsirState?.items?.length ?? 0) === 0 && (
                <Text style={{ color: C.textMuted, fontSize: 10 }}>
                  {t('tafsir_reference_unavailable')}
                </Text>
              )}

              {!tafsirState?.loading && (tafsirState?.items?.length ?? 0) > 0 && (
                <View style={{ gap: 8 }}>
                  {tafsirState!.items.map(item => (
                    <View key={`${asbabKey}-ulama-${item.sourceId}`} style={[styles.asbabUlamaCard, { borderColor: C.border, backgroundColor: C.card }]}>
                      <Text style={{ color: C.text, fontSize: 10, fontWeight: '700' }}>{item.sourceName}</Text>
                      <Text style={{ color: C.textSecondary, fontSize: 10, marginTop: 4, lineHeight: 16 }}>
                        {item.text}
                      </Text>
                      <TouchableOpacity onPress={() => openExternalReference(item.sourceUrl)} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                        <Text style={{ color: C.primary, fontSize: 10, fontWeight: '700' }}>{t('open_tafsir_source')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </>
    );
  }, [getAsbabState, ulamaTafsirState, C, loadUlamaTafsir, openExternalReference, t]);

  /** Render teks Arab dengan warna tajwid â€" setiap aturan bisa ditap */
  const renderTajweedText = (
    arabicText: string,
    fontSize: number,
    textColor: string,
    onLongPress?: () => void,
    precomputedSafeVertical?: number,
    precomputedLineHeight?: number,
    precomputedSafeRight?: number,
    playProgress?: number,
    activeWordIndex?: number | null
  ) => {
    const metrics = getArabicLayoutMetrics(fontSize, script, true);
    const safeVertical = precomputedSafeVertical ?? metrics.safeVertical;
    const lineHeight = precomputedLineHeight ?? metrics.lineHeight;
    const safeRight = precomputedSafeRight ?? metrics.safeRight;
    const safeLeft = metrics.safeLeft;
    const { bleedLeft, bleedRight } = getArabicOverflowCompensation(safeLeft, safeRight);
    const analyzedSpans = analyzeTajweed(arabicText);
    const guideSpans = splitGuideSpansWithWaqf(analyzedSpans);
    const spans = Platform.OS === 'web'
      ? guideSpans
      : bridgeArabicJoinAcrossSpans(guideSpans);
    const progressRatio = Math.max(0, Math.min(1, Number(playProgress) || 0));
    const syncedWordIndex = Number.isFinite(Number(activeWordIndex)) ? Math.max(0, Number(activeWordIndex)) : 0;
    const hasWordTiming = syncedWordIndex > 0;
    const playbackSpans = progressRatio > 0 || hasWordTiming
      ? splitGuideSpansByWhitespace(spans)
      : spans;
    const totalProgressChars = progressRatio > 0
      ? playbackSpans.reduce((acc, span) => acc + getNonWhitespaceLength(span.text), 0)
      : 0;
    const progressedChars = Math.round(totalProgressChars * progressRatio);
    let traversedChars = 0;
    let wordTokenIndex = 0;
    return (
      <View
        style={{
          paddingRight: safeRight,
          paddingLeft: safeLeft,
          marginRight: -bleedRight,
          marginLeft: -bleedLeft,
          overflow: 'visible',
          transform: [{ translateX: ARABIC_TEXT_X_BIAS }],
        }}
      >
        <Text
          key={`taj-${fontSize}-${arabicText.length}`}
          style={{
            fontSize,
            ...(lineHeight ? { lineHeight } : null),
            textAlign: 'right',
            fontFamily: arabicFontFamily,
            writingDirection: 'rtl',
            width: '100%',
            overflow: 'visible',
            letterSpacing: 0,
            paddingVertical: safeVertical,
            ...(Platform.OS === 'android' ? { includeFontPadding: true } : null),
          }}
          onLongPress={onLongPress}
        >
          {playbackSpans.map((span, i) => {
            const hasKnownColor = !!span.rule && !!GUIDE_COLOR_MAP[span.rule];
            const color = hasKnownColor ? GUIDE_COLOR_MAP[span.rule!] : textColor;
            const hasGuide = !!span.rule && span.rule in GUIDE_MAP;
            const markerStyle = getGuideSpanStyle(span.rule, fontSize, script);
            const tokenLen = getNonWhitespaceLength(span.text);
            const start = traversedChars;
            const end = start + tokenLen;
            traversedChars = end;
            const isWordToken = tokenLen > 0 && hasArabicBaseLetter(span.text);
            const tokenWordIndex = isWordToken ? (++wordTokenIndex) : 0;

            const isReadToken = hasWordTiming
              ? (tokenWordIndex > 0 && tokenWordIndex < syncedWordIndex)
              : tokenLen > 0 && progressedChars >= end && progressRatio > 0;
            const isCurrentToken = hasWordTiming
              ? (tokenWordIndex > 0 && tokenWordIndex === syncedWordIndex)
              : tokenLen > 0 && progressedChars > start && progressedChars < end && progressRatio > 0;
            const followStyle = isCurrentToken
              ? ({ backgroundColor: `${C.primary}44`, borderRadius: 5 } as const)
              : isReadToken
                ? ({ textShadowColor: `${C.primary}88`, textShadowRadius: 3 } as const)
                : null;
            return (
              <Text
                key={`${i}-${span.rule ?? 'plain'}`}
                style={{
                  color,
                  fontFamily: arabicFontFamily,
                  writingDirection: 'rtl',
                  ...(markerStyle ?? null),
                  ...(followStyle ?? null),
                }}
                onPress={hasGuide ? () => setActiveTajweedRule(span.rule!) : undefined}
                onLongPress={onLongPress}
                suppressHighlighting
              >
                {span.text}
              </Text>
            );
          })}
        </Text>
      </View>
    );
  };

  /** Render teks Arab biasa + highlight tanda waqaf agar tetap bisa diakses di mode non-tajwid */
  const renderArabicWithWaqfGuide = (
    arabicText: string,
    fontSize: number,
    textColor: string,
    onLongPress?: () => void,
    precomputedSafeVertical?: number,
    precomputedLineHeight?: number,
    precomputedSafeRight?: number,
    playProgress?: number,
    activeWordIndex?: number | null
  ) => {
    const metrics = getArabicLayoutMetrics(fontSize, script, false);
    const safeVertical = precomputedSafeVertical ?? metrics.safeVertical;
    const lineHeight = precomputedLineHeight ?? metrics.lineHeight;
    const safeRight = precomputedSafeRight ?? metrics.safeRight;
    const safeLeft = metrics.safeLeft;
    const { bleedLeft, bleedRight } = getArabicOverflowCompensation(safeLeft, safeRight);
    const waqfSpans = splitGuideSpansWithWaqf([{ text: arabicText, rule: null }]);
    const spans = Platform.OS === 'web'
      ? waqfSpans
      : bridgeArabicJoinAcrossSpans(waqfSpans);
    const progressRatio = Math.max(0, Math.min(1, Number(playProgress) || 0));
    const syncedWordIndex = Number.isFinite(Number(activeWordIndex)) ? Math.max(0, Number(activeWordIndex)) : 0;
    const hasWordTiming = syncedWordIndex > 0;
    const playbackSpans = progressRatio > 0 || hasWordTiming
      ? splitGuideSpansByWhitespace(spans)
      : spans;
    const totalProgressChars = progressRatio > 0
      ? playbackSpans.reduce((acc, span) => acc + getNonWhitespaceLength(span.text), 0)
      : 0;
    const progressedChars = Math.round(totalProgressChars * progressRatio);
    let traversedChars = 0;
    let wordTokenIndex = 0;

    return (
      <View
        style={{
          paddingRight: safeRight,
          paddingLeft: safeLeft,
          marginRight: -bleedRight,
          marginLeft: -bleedLeft,
          overflow: 'visible',
          transform: [{ translateX: ARABIC_TEXT_X_BIAS }],
        }}
      >
        <Text
          key={`waqf-${fontSize}-${arabicText.length}`}
          style={[
            styles.arabicText,
            {
              color: textColor,
              fontSize,
              fontFamily: arabicFontFamily,
              ...(lineHeight ? { lineHeight } : null),
              overflow: 'visible',
              letterSpacing: 0,
              paddingVertical: safeVertical,
              ...(Platform.OS === 'android' ? { includeFontPadding: true } : null),
            },
          ]}
          onLongPress={onLongPress}
        >
          {playbackSpans.map((span, i) => {
            const isWaqfGuide = !!span.rule && span.rule in WAQF_GUIDE;
            const color = isWaqfGuide ? (GUIDE_COLOR_MAP[span.rule!] ?? textColor) : textColor;
            const markerStyle = getGuideSpanStyle(span.rule, fontSize, script);
            const tokenLen = getNonWhitespaceLength(span.text);
            const start = traversedChars;
            const end = start + tokenLen;
            traversedChars = end;
            const isWordToken = tokenLen > 0 && hasArabicBaseLetter(span.text);
            const tokenWordIndex = isWordToken ? (++wordTokenIndex) : 0;

            const isReadToken = hasWordTiming
              ? (tokenWordIndex > 0 && tokenWordIndex < syncedWordIndex)
              : tokenLen > 0 && progressedChars >= end && progressRatio > 0;
            const isCurrentToken = hasWordTiming
              ? (tokenWordIndex > 0 && tokenWordIndex === syncedWordIndex)
              : tokenLen > 0 && progressedChars > start && progressedChars < end && progressRatio > 0;
            const followColor = isWordToken && isCurrentToken
              ? '#FFFFFF'
              : isWordToken && isReadToken
                ? `${C.primary}CC`
                : null;
            const followStyle = isCurrentToken
              ? ({ backgroundColor: C.primary, borderRadius: 5 } as const)
              : null;
            const effectiveColor = followColor ?? color;
            return (
              <Text
                key={`waqf-${i}-${span.rule ?? 'plain'}`}
                style={{
                  color: effectiveColor,
                  fontFamily: arabicFontFamily,
                  writingDirection: 'rtl',
                  ...(markerStyle ?? null),
                  ...(followStyle ?? null),
                }}
                onPress={isWaqfGuide ? () => setActiveTajweedRule(span.rule!) : undefined}
                onLongPress={onLongPress}
                suppressHighlighting
              >
                {span.text}
              </Text>
            );
          })}
        </Text>
      </View>
    );
  };

  // Render Ayah: Normal Mode

  const renderNormalAyah = useCallback(
    ({ item, index }: { item: number; index: number }) => {
      const sourceIndex = Number.isFinite(item) ? item : index;
      const arabicAyah = surah!.arabic.ayahs[sourceIndex];
      const translationAyah = surah!.translation.ayahs[sourceIndex];
      if (!arabicAyah) return null;
      const isMarked = bookmarks.has(arabicAyah.numberInSurah);
      const isPlaying = playingAyah === arabicAyah.numberInSurah;

      const arabicText = getArabicText(sourceIndex, arabicAyah.text);
      const arabicTextForDisplay = ensureAyahEndMark(arabicText, arabicAyah.numberInSurah);
      const { safeRight, safeVertical, lineHeight } = getArabicLayoutMetrics(arabicFontSize, script);

      return (
        <Pressable
          onPress={() => handleAyahPress(arabicAyah.numberInSurah)}
          style={({ pressed }) => [
            styles.ayahCard,
            {
              borderColor: isPlaying ? `${C.primary}99` : C.border,
              backgroundColor: isPlaying ? `${C.primary}18` : pressed ? C.surface : C.card,
            },
          ]}
        >
          {isPlaying && (
            <>
              <Animated.View
                pointerEvents="none"
                style={{
                  ...StyleSheet.absoluteFillObject,
                  borderRadius: BorderRadius.xl,
                  backgroundColor: C.primary,
                  opacity: ayahHighlightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.07] }),
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 10,
                  bottom: 10,
                  width: 3,
                  backgroundColor: C.primary,
                  borderRadius: 2,
                }}
              />
            </>
          )}
          {/* Header: nomor + badge + aksi */}
          <View style={styles.ayahHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => startSurahFromAyah(arabicAyah.numberInSurah, true)}
                style={styles.ayahNumBox}
              >
                <View style={styles.ayahNumOrnament}>
                  <View style={[styles.ayahNumDiamondOuter, { borderColor: isPlaying ? C.primary : C.textMuted, backgroundColor: isPlaying ? `${C.primary}12` : 'transparent' }]} />
                  <View style={[styles.ayahNumDiamondInner, { borderColor: isPlaying ? `${C.primary}AA` : `${C.textMuted}CC` }]} />
                  <Text style={[styles.ayahNumMarkerText, { color: isPlaying ? C.primary : C.textSecondary }]}>
                    {String(arabicAyah.numberInSurah)}
                  </Text>
                </View>
              </TouchableOpacity>
              {renderAsbabBadge(arabicAyah.numberInSurah)}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => handleAyahPlayPress(arabicAyah.number, arabicAyah.numberInSurah)}
                style={[styles.iconBtn, { backgroundColor: isPlaying ? C.primary : C.surface }]}
              >
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color={isPlaying ? '#fff' : C.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => toggleBookmark(arabicAyah.numberInSurah, arabicAyah.text, translationAyah?.text ?? '')}
                style={[styles.iconBtn, { backgroundColor: isMarked ? C.goldMuted : C.surface }]}
              >
                <Ionicons name={isMarked ? 'bookmark' : 'bookmark-outline'} size={17} color={isMarked ? C.gold : C.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Teks Arab + highlight tanda waqaf */}
          <View style={styles.ayahArabicSection}>
            <View style={[styles.ayahArabicCanvas, { borderColor: C.border, backgroundColor: `${C.primary}08` }]}>
              {renderArabicWithWaqfGuide(
                arabicTextForDisplay,
                arabicFontSize,
                C.text,
                () => copyAyahToClipboard(arabicAyah.numberInSurah, arabicText, translationAyah?.text),
                safeVertical,
                lineHeight,
                safeRight,
                isPlaying && reciterCapability === 'full' ? playingAyahProgress : 0,
                isPlaying && reciterCapability === 'full' ? activeAyahWordIndex : null
              )}
            </View>
          </View>

          {/* Terjemahan */}
          {showTranslation && translationAyah && (
            <View style={[styles.ayahTranslationSection, { borderTopColor: C.border }]}>
              <Text style={[styles.translationText, { color: C.textSecondary }]}>
                {translationAyah.text}
              </Text>
            </View>
          )}

          {renderAsbabSection(arabicAyah.numberInSurah)}
        </Pressable>
      );
    },
    [surah, bookmarks, playingAyah, playingAyahProgress, activeAyahWordIndex, reciterCapability, showTranslation, arabicFontSize, script, C, startSurahFromAyah, handleAyahPlayPress, copyAyahToClipboard, renderAsbabBadge, renderAsbabSection]
  );

  //Render Ayah: Tajweed Mode 
  const renderTajweedAyah = useCallback(
    ({ item, index }: { item: number; index: number }) => {
      const sourceIndex = Number.isFinite(item) ? item : index;
      const arabicAyah = surah!.arabic.ayahs[sourceIndex];
      const translationAyah = surah!.translation.ayahs[sourceIndex];
      if (!arabicAyah) return null;
      const isPlaying = playingAyah === arabicAyah.numberInSurah;
      const isMarked = bookmarks.has(arabicAyah.numberInSurah);

      const arabicText = getArabicText(sourceIndex, arabicAyah.text);
      const arabicTextForDisplay = ensureAyahEndMark(arabicText, arabicAyah.numberInSurah);
      const { safeRight, safeVertical, lineHeight } = getArabicLayoutMetrics(arabicFontSize, script, true);

      return (
        <View style={[
          styles.ayahCard,
          {
            borderColor: isPlaying ? `${C.primary}99` : C.border,
            backgroundColor: isPlaying ? `${C.primary}18` : C.card,
          },
        ]}>
          {isPlaying && (
            <>
              <Animated.View
                pointerEvents="none"
                style={{
                  ...StyleSheet.absoluteFillObject,
                  borderRadius: BorderRadius.xl,
                  backgroundColor: C.primary,
                  opacity: ayahHighlightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.07] }),
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 10,
                  bottom: 10,
                  width: 3,
                  backgroundColor: C.primary,
                  borderRadius: 2,
                }}
              />
            </>
          )}
          <View style={styles.ayahHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => startSurahFromAyah(arabicAyah.numberInSurah, true)}
                style={styles.ayahNumBox}
              >
                <View style={styles.ayahNumOrnament}>
                  <View style={[styles.ayahNumDiamondOuter, { borderColor: isPlaying ? C.primary : C.textMuted, backgroundColor: isPlaying ? `${C.primary}12` : 'transparent' }]} />
                  <View style={[styles.ayahNumDiamondInner, { borderColor: isPlaying ? `${C.primary}AA` : `${C.textMuted}CC` }]} />
                  <Text style={[styles.ayahNumMarkerText, { color: isPlaying ? C.primary : C.textSecondary }]}>
                    {String(arabicAyah.numberInSurah)}
                  </Text>
                </View>
              </TouchableOpacity>
              {renderAsbabBadge(arabicAyah.numberInSurah)}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => handleAyahPlayPress(arabicAyah.number, arabicAyah.numberInSurah)}
                style={[styles.iconBtn, { backgroundColor: isPlaying ? C.primary : C.surface }]}
              >
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color={isPlaying ? '#fff' : C.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => toggleBookmark(arabicAyah.numberInSurah, arabicAyah.text, translationAyah?.text ?? '')}
                style={[styles.iconBtn, { backgroundColor: isMarked ? C.goldMuted : C.surface }]}
              >
                <Ionicons name={isMarked ? 'bookmark' : 'bookmark-outline'} size={17} color={isMarked ? C.gold : C.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Teks tajwid berwarna */}
          <View style={styles.ayahArabicSection}>
            <View style={[styles.ayahArabicCanvas, { borderColor: C.border, backgroundColor: `${C.primary}08` }]}>
              {renderTajweedText(
                arabicTextForDisplay,
                arabicFontSize,
                C.text,
                () => copyAyahToClipboard(arabicAyah.numberInSurah, arabicText, translationAyah?.text),
                safeVertical,
                lineHeight,
                safeRight,
                isPlaying && reciterCapability === 'full' ? playingAyahProgress : 0,
                isPlaying && reciterCapability === 'full' ? activeAyahWordIndex : null
              )}
            </View>
          </View>

          {showTranslation && translationAyah && (
            <View style={[styles.ayahTranslationSection, { borderTopColor: C.border }]}>
              <Text style={[styles.translationText, { color: C.textSecondary }]}>
                {translationAyah.text}
              </Text>
            </View>
          )}

          {renderAsbabSection(arabicAyah.numberInSurah)}
        </View>
      );
    },
    [surah, bookmarks, playingAyah, playingAyahProgress, activeAyahWordIndex, reciterCapability, showTranslation, arabicFontSize, script, C, startSurahFromAyah, handleAyahPlayPress, copyAyahToClipboard, renderAsbabBadge, renderAsbabSection]
  );

  // â"€â"€ Render Ayah: Pemula Mode â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const renderPemulaAyah = useCallback(
    ({ item, index }: { item: number; index: number }) => {
      const sourceIndex = Number.isFinite(item) ? item : index;
      const arabicAyah = surah!.arabic.ayahs[sourceIndex];
      const translationAyah = surah!.translation.ayahs[sourceIndex];
      if (!arabicAyah) return null;
      const isPlaying = playingAyah === arabicAyah.numberInSurah;

      const rawArabicText = arabicAyah.text;
      const arabicText = getArabicText(sourceIndex, rawArabicText);
      const arabicTextForDisplay = ensureAyahEndMark(arabicText, arabicAyah.numberInSurah);
      const { safeRight, safeVertical, lineHeight } = getArabicLayoutMetrics(arabicFontSize, script);
      const rawTranslit = translitTexts?.[sourceIndex] ?? '';
      const wordByWordRawEntry = wordByWordMap?.[arabicAyah.numberInSurah];
      const wordByWordRaw = Array.isArray(wordByWordRawEntry) ? wordByWordRawEntry : [];
      const wordByWordExpanded = expandWordByWordPemula(wordByWordRaw);

      // Jika basmalah ayat 1 disembunyikan, transliterasi awal juga harus ikut dipotong
      // agar pairing kata Arab/Latin tidak meleset.
      const removedBasmallahWords = showBasmalah && sourceIndex === 0
        ? Math.max(
            0,
            splitArabicWordsPemula(rawArabicText).length - splitArabicWordsPemula(arabicText).length
          )
        : 0;
      const translit = removedBasmallahWords > 0
        ? dropLeadingWords(rawTranslit, removedBasmallahWords)
        : normalizeTranslitPemula(rawTranslit);

      const displayedArabicWords = splitArabicWordsPemula(arabicText);
      const wordByWord = alignWordByWordToArabicWords(displayedArabicWords, wordByWordExpanded);
      const hasWordByWord = wordByWord.length > 0;

      // Split word-by-word untuk tampilan pemula (kanan -> kiri untuk Arab)
      const arabicWordsBase = displayedArabicWords.length > 0
        ? displayedArabicWords
        : wordByWord.map(w => w.arabic).filter(Boolean);
      const arabicWords = arabicWordsBase.length > 0
        ? arabicWordsBase
        : splitArabicWordsPemula(rawArabicText);
      const translitWords = hasWordByWord
        ? arabicWords.map((_, i) => normalizeTranslitPemula(wordByWord[i]?.translit ?? ''))
        : splitTranslitWordsPemula(translit);
      const indonesianWords = hasWordByWord
        ? arabicWords.map((_, i) => normalizeMeaningPemula(wordByWord[i]?.indonesian ?? ''))
        : new Array(arabicWords.length).fill('');
      const apiAlignedTranslitWords = alignTranslitToArabicWords(arabicWords, translitWords);
      const localTranslitWords = transliterateArabicWordsPemula(arabicWords);
      const useLocalWordTranslit = !hasWordByWord && translitWords.length !== arabicWords.length;
      const alignedTranslitWords = hasWordByWord
        ? translitWords.map((t, i) => t || localTranslitWords[i] || '')
        : (useLocalWordTranslit ? localTranslitWords : apiAlignedTranslitWords);
      const translitMismatch = !hasWordByWord && translitWords.length > 0 && translitWords.length !== arabicWords.length;
      const fullTranslit = normalizeTranslitPemula(translit || alignedTranslitWords.join(' '));
      const isMarked = bookmarks.has(arabicAyah.numberInSurah);

      return (
        <View style={[
          styles.pemulaCard,
          {
            backgroundColor: isPlaying ? `${C.primary}18` : C.card,
            borderColor: isPlaying ? `${C.primary}99` : C.border,
            borderWidth: isPlaying ? 1.5 : 1,
          },
        ]}>
          {isPlaying && (
            <>
              <Animated.View
                pointerEvents="none"
                style={{
                  ...StyleSheet.absoluteFillObject,
                  borderRadius: BorderRadius.xl,
                  backgroundColor: C.primary,
                  opacity: ayahHighlightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.07] }),
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 10,
                  bottom: 10,
                  width: 3,
                  backgroundColor: C.primary,
                  borderRadius: 2,
                }}
              />
            </>
          )}
          {/* Nomor ayat + tombol audio */}
          <View style={[styles.pemulaHeader, { borderBottomColor: C.border }]}>
            <TouchableOpacity
              onPress={() => startSurahFromAyah(arabicAyah.numberInSurah, true)}
              style={styles.pemulaNumBadge}
            >
              <View style={styles.ayahNumOrnament}>
                <View style={[styles.ayahNumDiamondOuter, { borderColor: isPlaying ? C.primary : C.textMuted, backgroundColor: isPlaying ? `${C.primary}12` : 'transparent' }]} />
                <View style={[styles.ayahNumDiamondInner, { borderColor: isPlaying ? `${C.primary}AA` : `${C.textMuted}CC` }]} />
                <Text style={[styles.pemulaNumMarkerText, { color: isPlaying ? C.primary : C.textSecondary }]}>
                  {String(arabicAyah.numberInSurah)}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: Spacing.sm }}>
              <Text style={{ color: C.textMuted, fontSize: 10 }}>
                {t('verse_label')} {arabicAyah.numberInSurah} - {surahMeta?.englishName}
              </Text>
              <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                {renderAsbabBadge(arabicAyah.numberInSurah)}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleAyahPlayPress(arabicAyah.number, arabicAyah.numberInSurah)}
              style={[styles.pemulaPlayBtn, { backgroundColor: isPlaying ? C.primary : C.primaryMuted }]}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={isPlaying ? '#fff' : C.primary} />
              <Text style={{ color: isPlaying ? '#fff' : C.primary, fontSize: FontSize.xs, fontWeight: '700', marginLeft: 4 }}>
                {isPlaying ? t('pause') : ayahPlayMode === 'continuous' ? t('continue_playback') : (lang === 'en' ? 'Listen' : 'Dengarkan')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleBookmark(arabicAyah.numberInSurah, arabicAyah.text, translationAyah?.text ?? '')}
              style={[styles.iconBtn, { backgroundColor: isMarked ? C.goldMuted : C.surface, marginLeft: 8 }]}
            >
              <Ionicons name={isMarked ? 'bookmark' : 'bookmark-outline'} size={17} color={isMarked ? C.gold : C.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: C.textMuted, fontSize: 10, marginHorizontal: Spacing.sm, marginTop: Spacing.sm }}>
            {lang === 'en'
              ? 'Beginner mode reading order: right to left for Arabic, with meaning under each word. Colored waqf marks are tappable.'
              : 'Urutan baca mode belajar: kanan ke kiri (Arab), arti ada di bawah tiap kata. Tanda waqaf berwarna bisa diketuk.'}
          </Text>

          {/* Word-by-word chips: Arab di atas, Latin di bawah */}
          <View style={styles.wordChipContainer}>
            {arabicWords.map((word, wi) => (
              <View key={wi} style={[styles.wordChip, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={[styles.wordOrderBadge, { backgroundColor: C.primaryMuted }]}>
                  <Text style={{ color: C.primary, fontSize: 9, fontWeight: '800' }}>{wi + 1}</Text>
                </View>
                <Text
                  style={{
                    color: C.text,
                    fontSize: arabicFontSize - 2,
                    lineHeight: getWordChipArabicLineHeight(arabicFontSize - 2, script),
                    fontFamily: arabicFontFamily,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }}
                >
                  {word}
                </Text>
                {alignedTranslitWords[wi] && (
                  <Text style={{ color: C.primary, fontSize: 9, textAlign: 'left', marginTop: 2, writingDirection: 'ltr' }}>
                    {alignedTranslitWords[wi]}
                  </Text>
                )}
                {indonesianWords[wi] && (
                  <Text style={{ color: C.textMuted, fontSize: 9, textAlign: 'left', marginTop: 1, writingDirection: 'ltr' }}>
                    {indonesianWords[wi]}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {translitMismatch && (
            <Text style={{ color: C.textMuted, fontSize: 10, marginHorizontal: Spacing.sm, marginBottom: 4 }}>
              {lang === 'en'
                ? 'Word transliteration is aligned automatically to match the Arabic words.'
                : 'Transliterasi per kata diselaraskan otomatis agar cocok dengan kata Arab.'}
            </Text>
          )}

          {/* Full Arab text line + highlight tanda waqaf */}
          <View style={styles.pemulaArabicFull}>
            <View style={[styles.ayahArabicCanvas, { borderColor: C.border, backgroundColor: `${C.primary}08` }]}>
              {renderArabicWithWaqfGuide(
                arabicTextForDisplay,
                arabicFontSize,
                C.text,
                () => copyAyahToClipboard(arabicAyah.numberInSurah, arabicText, translationAyah?.text),
                safeVertical,
                lineHeight,
                safeRight,
                isPlaying && reciterCapability === 'full' ? playingAyahProgress : 0,
                isPlaying && reciterCapability === 'full' ? activeAyahWordIndex : null
              )}
            </View>
          </View>

          {/* Full transliterasi */}
          {fullTranslit ? (
            <View style={[styles.translitBox, { backgroundColor: `${C.primary}10`, borderColor: `${C.primary}25` }]}>
              <Text style={{ color: C.primary, fontSize: 11, fontWeight: '700', marginBottom: 3 }}>
                {lang === 'en' ? 'Pronunciation:' : 'Cara Baca:'}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, fontStyle: 'italic', lineHeight: 20, textAlign: 'left', writingDirection: 'ltr' }}>
                {fullTranslit}
              </Text>
            </View>
          ) : null}

          {/* Terjemahan */}
          {showTranslation && translationAyah && (
            <View style={[styles.translationBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 3 }}>{t('translation_prefix')}:</Text>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, lineHeight: 21 }}>
                {translationAyah.text}
              </Text>
            </View>
          )}

          {renderAsbabSection(arabicAyah.numberInSurah)}
        </View>
      );
    },
    [surah, bookmarks, translitTexts, wordByWordMap, playingAyah, playingAyahProgress, activeAyahWordIndex, reciterCapability, showTranslation, arabicFontSize, script, C, surahMeta, showBasmalah, startSurahFromAyah, ayahPlayMode, handleAyahPlayPress, copyAyahToClipboard, renderAsbabBadge, renderAsbabSection, lang, t]
  );

  // â"€â"€ Header komponen untuk FlatList â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const ListHeader = () => (
    <>
      <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: Spacing.xs }}>
        {showReaderTips ? (
          <View style={[styles.readerTipCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.readerTipHeader}>
              <Text style={{ color: C.textSecondary, fontSize: 11, fontWeight: '700' }}>{t('reader_tip_title')}</Text>
              <TouchableOpacity onPress={() => setShowReaderTips(false)} hitSlop={8}>
                <Ionicons name="close" size={14} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 6 }}>
              {t('reader_tip_nav')}
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 4 }}>
              {t('reader_tip_copy')}
            </Text>
            {displayMode !== 'tajweed' && (
              <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 4 }}>
                {t('reader_tip_waqf')}
              </Text>
            )}
          </View>
        ) : null}
      </View>

      {showOnlyAsbabAyahs && (
        <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs }}>
          <View style={styles.asbabFilterInfo}>
            <Ionicons name="funnel-outline" size={12} color="#10B981" />
          <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700', marginLeft: 6, flex: 1 }}>
              {t('showing_asbab_prefix')} {visibleAyahIndices.length} {t('showing_asbab_suffix')}
            </Text>
          </View>
        </View>
      )}

      {/* Basmalah */}
      {showBasmalah && (
        <View
          style={[
            styles.basmallahContainer,
            {
              backgroundColor: playingBasmallah ? `${C.primary}14` : C.surface,
              borderBottomColor: playingBasmallah ? C.primary : C.border,
            },
          ]}
        >
          {displayMode === 'tajweed'
            ? renderTajweedText(BASMALLAH_TEXT, 26, playingBasmallah ? C.primary : C.text)
            : (
              <Text style={[styles.basmallahText, { color: playingBasmallah ? C.primary : C.text, fontFamily: arabicFontFamily }]}>
                {BASMALLAH_TEXT}
              </Text>
            )}
          <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 4, textAlign: 'center' }}>
            {t('basmalah_translation')}
          </Text>
          {playingBasmallah && (
            <Text style={{ color: C.primary, fontSize: 10, marginTop: 4, fontWeight: '700' }}>
              {t('currently_recited')}
            </Text>
          )}
        </View>
      )}

      {/* Panduan tajwid + tanda baca (posisi tetap, UI lebih ringkas) */}
      {displayMode === 'tajweed' && (
        <View style={[styles.legendContainer, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={styles.legendHeaderRow}>
            <View style={[styles.legendHeaderIconWrap, { backgroundColor: `${C.primary}1A` }]}>
              <Ionicons name="bookmarks-outline" size={14} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.primary, fontSize: FontSize.sm, fontWeight: '800' }}>
                {t('tajweed_guide')}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 1 }}>
                {t('tajweed_colored_marks')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowLegend(v => !v)}
              style={[styles.legendToggleBtn, { borderColor: C.border, backgroundColor: C.card }]}
            >
              <Text style={{ color: C.textSecondary, fontSize: 10, fontWeight: '700', marginRight: 3 }}>
                {showLegend ? t('close') : t('open')}
              </Text>
              <Ionicons name={showLegend ? 'chevron-up' : 'chevron-down'} size={12} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.legendHintRow, { backgroundColor: `${C.primary}0D`, borderColor: `${C.primary}25` }]}>
            <Ionicons name="finger-print-outline" size={12} color={C.primary} />
            <Text style={{ color: C.textSecondary, fontSize: 10, flex: 1, lineHeight: 16 }}>
              {t('tap_tajweed_hint')}
            </Text>
          </View>

          {showLegend && (
            <>
              {Object.entries(LEGEND_BY_CATEGORY).map(([category, keys]) => (
                <View key={category} style={{ marginBottom: 12 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 7, textTransform: 'uppercase' }}>
                    {getGuideEntry(keys[0])?.category ?? category} · {keys.length}
                  </Text>
                  <View style={styles.legendChipRow}>
                    {keys.map(key => {
                      const guide = getGuideEntry(key);
                      if (!guide) return null;
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => setActiveTajweedRule(key)}
                          style={[styles.legendChip, { backgroundColor: `${guide.color}18`, borderColor: `${guide.color}40` }]}
                        >
                          <View style={[styles.legendDot, { backgroundColor: guide.color }]} />
                          <Text style={{ color: guide.color, fontSize: 10, fontWeight: '600' }}>{guide.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Tips mode belajar */}
      {displayMode === 'pemula' && showTips && (
        <View style={[styles.tipsContainer, { backgroundColor: `${C.primary}0F`, borderBottomColor: C.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Ionicons name="school-outline" size={16} color={C.primary} />
            <Text style={{ color: C.primary, fontSize: FontSize.sm, fontWeight: '700', flex: 1, marginLeft: 8 }}>
              {t('tips_prefix')} {t('mode_beginner')}
            </Text>
            <TouchableOpacity onPress={() => setShowTips(false)} hitSlop={8}>
              <Ionicons name="close" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          {READING_TIPS.map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <Ionicons name={tip.icon as any} size={13} color={C.primary} style={{ marginTop: 2 }} />
              <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, flex: 1, lineHeight: 18 }}>
                {tip.text[lang]}
              </Text>
            </View>
          ))}
          {/* Mode belajar loading spinner */}
          {modeLoading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{t('loading_beginner')}</Text>
            </View>
          )}
        </View>
      )}

    </>
  );


  // â"€â"€ Reciter sheet overlay â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const ReciterSheetOverlay = () => {
    const groupOrder: ReciterGroup[] = ['haram', 'nabawi', 'lainnya'];
    return (
      <>
        {/* Drag handle */}
        <View style={[styles.sheetHandle, { backgroundColor: C.border, marginTop: Spacing.sm, marginBottom: 0 }]} />

        {/* Header */}
        <View style={[styles.reciterSheetHeader, { borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={() => setSettingsSheetView('main')}
            hitSlop={12}
            style={[styles.reciterHeaderBtn, { backgroundColor: C.card, borderColor: C.border }]}
          >
            <Ionicons name="arrow-back" size={18} color={C.textSecondary} />
          </TouchableOpacity>
          <View style={styles.reciterHeaderTitleWrap}>
            <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '800' }}>
              {t('reciter_sheet_title')}
            </Text>
            <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 1 }}>
              {RECITERS.length} {t('reciter_available')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={closeSettingsSheet}
            hitSlop={12}
            style={[styles.reciterHeaderBtn, { backgroundColor: C.card, borderColor: C.border }]}
          >
            <Ionicons name="close" size={18} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: Spacing.md }}>
          {/* Active reciter card */}
          <Text style={[styles.reciterSectionLabel, { color: C.textMuted }]}>{t('active_reciter_label')}</Text>
          <View style={[styles.reciterActiveCard, { backgroundColor: `${C.primary}10`, borderColor: `${C.primary}35` }]}>
            <View style={[styles.reciterAvatarLg, { backgroundColor: `${C.primary}20` }]}>
              <Ionicons name="mic" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '800' }} numberOfLines={1}>
                {reciter.name}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }} numberOfLines={1}>
                {reciter.label}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {(() => {
                  const capMeta = RECITER_CAPABILITY_META[getReciterCapabilityForUi(reciter.id)];
                  return (
                    <View style={[styles.reciterCapBadge, { backgroundColor: `${capMeta.dot}20`, borderColor: `${capMeta.dot}50` }]}>
                      <View style={[styles.reciterCapDot, { backgroundColor: capMeta.dot }]} />
                      <Text style={{ color: capMeta.dot, fontSize: 9, fontWeight: '700' }}>{getReciterCapabilityShort(getReciterCapabilityForUi(reciter.id))}</Text>
                    </View>
                  );
                })()}
                {reciter.surahOnly && (
                  <View style={[styles.reciterCapBadge, { backgroundColor: `${C.gold}15`, borderColor: `${C.gold}40` }]}>
                    <Text style={{ color: C.gold, fontSize: 9, fontWeight: '700' }}>{t('full_surah_badge')}</Text>
                  </View>
                )}
                <View style={[styles.reciterCapBadge, { backgroundColor: `${C.primary}12`, borderColor: `${C.primary}30` }]}>
                  <Text style={{ color: C.primary, fontSize: 9, fontWeight: '700' }}>{getReciterGroupTitle(reciter.group)}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={C.primary} />
          </View>

          {/* Groups */}
          {groupOrder.map(groupKey => {
            const group = RECITER_GROUPS[groupKey];
            const groupReciters = RECITERS.filter(r => r.group === groupKey);
            const groupColor = group.color;
            const iconMeta = RECITER_GROUP_ICON_META[groupKey];
            return (
              <View key={groupKey} style={{ marginBottom: Spacing.sm }}>
                {/* Group header */}
                <View style={[styles.reciterGroupDivider, { borderColor: `${groupColor}25` }]}>
                  <View style={[styles.reciterGroupIconBadge, { backgroundColor: `${groupColor}15`, borderColor: `${groupColor}30` }]}>
                    {'asset' in iconMeta ? (
                      <LogoSvgIcon name={iconMeta.asset} size={13} color={groupColor} />
                    ) : (
                      <Ionicons name={iconMeta.ionicon} size={13} color={groupColor} />
                    )}
                  </View>
                  <Text style={{ color: groupColor, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 }}>
                    {getReciterGroupTitle(groupKey)}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 10, marginLeft: 4 }}>
                    ({groupReciters.length})
                  </Text>
                </View>

                {/* Reciter items */}
                <View style={{ gap: 6 }}>
                  {groupReciters.map(r => {
                    const active = reciter.id === r.id;
                    const capability = getReciterCapabilityForUi(r.id);
                    const capMeta = RECITER_CAPABILITY_META[capability];
                    return (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => {
                          reciterRef.current = r;
                          fallbackReciterNoticeRef.current = false;
                          setReciter(r);
                          closeSettingsSheet();
                          void stopAudio();
                        }}
                        activeOpacity={0.75}
                        style={[styles.reciterItemCard, {
                          backgroundColor: active ? `${groupColor}10` : C.surface,
                          borderColor: active ? `${groupColor}45` : C.border,
                        }]}
                      >
                        <View style={[styles.reciterAvatarSm, {
                          backgroundColor: active ? `${groupColor}20` : `${C.textMuted}12`,
                        }]}>
                          <Ionicons name="mic" size={15} color={active ? groupColor : C.textMuted} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }} numberOfLines={1}>
                            {r.name}
                          </Text>
                          <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                            {r.label}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                            <View style={[styles.reciterCapBadge, { backgroundColor: `${capMeta.dot}18`, borderColor: `${capMeta.dot}45` }]}>
                              <View style={[styles.reciterCapDot, { backgroundColor: capMeta.dot }]} />
                              <Text style={{ color: capMeta.dot, fontSize: 9, fontWeight: '700' }}>{getReciterCapabilityShort(capability)}</Text>
                            </View>
                            {r.surahOnly && (
                              <View style={[styles.reciterCapBadge, { backgroundColor: `${C.gold}12`, borderColor: `${C.gold}35` }]}>
                                <Text style={{ color: C.gold, fontSize: 9, fontWeight: '700' }}>{t('full_surah_badge')}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        {active
                          ? <Ionicons name="checkmark-circle" size={22} color={groupColor} />
                          : <Ionicons name="radio-button-off" size={18} color={`${C.textMuted}80`} />
                        }
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </>
    );
  };

  // â"€â"€ Juz mode: render item untuk continuous scroll â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const renderJuzScrollItem = useCallback(({ item }: { item: JuzScrollItem }) => {
    if (item._k === 'sep') {
      const surahM = SURAH_LIST.find(s => s.number === item.surahNum);
      return (
        <View style={[styles.juzSurahHeader, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <Text style={{ color: C.primary, fontSize: 22, fontFamily: arabicFontFamily, textAlign: 'center' }}>
            {surahM?.name ?? ''}
          </Text>
          <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '800', marginTop: 2 }}>
            {surahM?.englishName ?? `Surah ${item.surahNum}`}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
            {getSurahMeaningText(surahM) ? `${getSurahMeaningText(surahM)} · ` : ''}{surahM?.ayahCount} {t('verses_unit')} · {getRevelationTypeText(surahM?.type)}
          </Text>
        </View>
      );
    }
    if (item._k === 'bas') {
      return (
        <View style={[styles.basmallahContainer, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <Text style={[styles.basmallahText, { color: C.text, fontFamily: arabicFontFamily }]}>
            {BASMALLAH_TEXT}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 4, textAlign: 'center' }}>
            {t('basmalah_translation')}
          </Text>
        </View>
      );
    }
    if (item._k === 'ld') {
      return (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 8 }}>{t('loading_surah')}</Text>
        </View>
      );
    }
    if (item._k === 'ay') {
      const { surahNum, idx, s } = item;
      const arabicAyah = s.arabic.ayahs[idx];
      const transAyah = s.translation?.ayahs?.[idx];
      if (!arabicAyah) return null;

      const showSurahBas = surahNum !== 1 && surahNum !== 9;
      let arabicText: string;
      if (showSurahBas && idx === 0) {
        const stripped = stripBasmallah(arabicAyah.text);
        arabicText = normalizeArabicForDisplay(stripped.trim() ? stripped : arabicAyah.text);
      } else {
        arabicText = normalizeArabicForDisplay(arabicAyah.text);
      }
      const arabicDisplay = ensureAyahEndMark(arabicText, arabicAyah.numberInSurah);
      const { safeRight, safeVertical, lineHeight } = getArabicLayoutMetrics(arabicFontSize, script);
      const isMarked = juzAllBookmarks.get(surahNum)?.has(arabicAyah.numberInSurah) ?? false;
      const isPlaying = juzPlayingKey === `${surahNum}:${arabicAyah.numberInSurah}`
        || (isPlayingSurah && surahNum === num && playingAyah === arabicAyah.numberInSurah);

      const copyJuzAyah = () => {
        const surahM = SURAH_LIST.find(sm => sm.number === surahNum);
        const label = surahM?.englishName ?? `Surah ${surahNum}`;
        Clipboard.setString([
          `${label} - ${t('verse_label')} ${arabicAyah.numberInSurah}`,
          arabicDisplay,
          transAyah?.text ? `${t('translation_prefix')}: ${transAyah.text}` : '',
        ].filter(Boolean).join('\n\n'));
        Alert.alert(t('copied_title'), `${t('verse_label')} ${arabicAyah.numberInSurah} ${t('copied_ayah')}`);
      };

      return (
        <View style={[styles.ayahCard, {
          borderColor: isPlaying ? `${C.primary}66` : C.border,
          backgroundColor: isPlaying ? `${C.primary}12` : C.card,
        }]}>
          <View style={styles.ayahHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.ayahNumBox}>
                <View style={styles.ayahNumOrnament}>
                  <View style={[styles.ayahNumDiamondOuter, { borderColor: isPlaying ? C.primary : C.textMuted, backgroundColor: isPlaying ? `${C.primary}12` : 'transparent' }]} />
                  <View style={[styles.ayahNumDiamondInner, { borderColor: isPlaying ? `${C.primary}AA` : `${C.textMuted}CC` }]} />
                  <Text style={[styles.ayahNumMarkerText, { color: isPlaying ? C.primary : C.textSecondary }]}>
                    {String(arabicAyah.numberInSurah)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => playJuzAyah(surahNum, arabicAyah.numberInSurah)}
                style={[styles.iconBtn, { backgroundColor: isPlaying ? C.primary : C.surface }]}
              >
                <Ionicons
                  name={isPlaying && !isSurahPaused ? 'pause' : 'play'}
                  size={17}
                  color={isPlaying ? '#fff' : C.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => toggleJuzBookmark(surahNum, arabicAyah.numberInSurah, arabicText, transAyah?.text ?? '')}
                style={[styles.iconBtn, { backgroundColor: isMarked ? C.goldMuted : C.surface }]}
              >
                <Ionicons name={isMarked ? 'bookmark' : 'bookmark-outline'} size={17} color={isMarked ? C.gold : C.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.ayahArabicSection}>
            <View style={[styles.ayahArabicCanvas, { borderColor: C.border, backgroundColor: `${C.primary}08` }]}>
              {renderArabicWithWaqfGuide(
                arabicDisplay, arabicFontSize, C.text,
                copyJuzAyah, safeVertical, lineHeight, safeRight, 0, null
              )}
            </View>
          </View>

          {showTranslation && transAyah && (
            <View style={[styles.ayahTranslationSection, { borderTopColor: C.border }]}>
              <Text style={[styles.translationText, { color: C.textSecondary }]}>
                {transAyah.text}
              </Text>
            </View>
          )}
        </View>
      );
    }
    return null;
  }, [C, arabicFontSize, script, arabicFontFamily, showTranslation, juzAllBookmarks, juzPlayingKey,
      isPlayingSurah, playingAyah, num, playJuzAyah, toggleJuzBookmark, renderArabicWithWaqfGuide,
      getSurahMeaningText, getRevelationTypeText, t]);

  // â"€â"€ Main render â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const renderItem = displayMode === 'tajweed'
    ? renderTajweedAyah
    : displayMode === 'pemula'
      ? renderPemulaAyah
      : renderNormalAyah;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} {...swipeResponder.panHandlers}>
      <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
      {/* Header */}
      <View style={[styles.header, isWideWeb && styles.webSurfaceContainer, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => {
            stopAudio();
            Animated.timing(slideAnim, {
              toValue: screenWidth,
              duration: 220,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }).start(() => router.back());
          }}
          hitSlop={8}
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={C.primary} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700' }} numberOfLines={1}>
            {isJuzMode && juzId ? `Juz ${juzId}` : (surahMeta?.englishName ?? `Surah ${num}`)}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: FontSize.xs }} numberOfLines={1}>
            {isJuzMode && juzId
              ? (juzStartMeta?.englishName ?? 'Surah ' + juzStartSurah) + ' - ' + (juzEndMeta?.englishName ?? 'Surah ' + juzEndSurah) + ' :' + juzEndAyah
              : surahMeta
                ? surahMeta.indonesianName + ' \u00B7 ' + surahMeta.ayahCount + ' ayat \u00B7 ' + surahMeta.type
                : 'Surah ' + num}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowReaderMenu(true)}
          style={[styles.headerBtn, { backgroundColor: C.card, borderColor: C.border }]}
        >
          <Ionicons name="ellipsis-vertical" size={16} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Kontrol: play surah/juz + pindah */}
      <View style={[styles.readerControlPanel, isWideWeb && styles.webSurfaceContainer, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={styles.readerPlaybackRow}>
          <TouchableOpacity
            onPress={() => {
              if (!isPlayingSurah) {
                const startIdx = isJuzMode
                  ? Math.max(0, juzStartAyah - 1)
                  : (currentSurahIdxRef.current || 0);
                startSurahPlayback(startIdx, true);
              } else if (isSurahPaused) {
                resumeSurahPlayback();
              } else {
                pauseSurahPlayback();
              }
            }}
            disabled={loading || !!error}
            style={[styles.readerMainPlayBtn, {
              backgroundColor: isPlayingSurah && !isSurahPaused ? C.primary : C.primaryMuted,
              opacity: loading || !!error ? 0.5 : 1,
            }]}
            activeOpacity={0.78}
          >
            <Ionicons
              name={!isPlayingSurah ? 'play' : isSurahPaused ? 'play' : 'pause'}
              size={16}
              color={isPlayingSurah && !isSurahPaused ? '#fff' : C.primary}
            />
            <Text style={{ color: isPlayingSurah && !isSurahPaused ? '#fff' : C.primary, fontSize: 12, fontWeight: '700', marginLeft: 7 }}>
              {!isPlayingSurah
                ? (isJuzMode ? t('play_juz') : t('play_surah'))
                : isSurahPaused ? t('continue_playback') : t('pause')}
            </Text>
          </TouchableOpacity>
          {isPlayingSurah && (
            <TouchableOpacity
              onPress={stopSurahPlayback}
              style={[styles.readerStopBtn, { backgroundColor: '#FF3B3015', borderColor: '#FF3B3035' }]}
            >
              <Ionicons name="stop" size={14} color="#FF3B30" />
              <Text style={{ color: '#FF3B30', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>{t('stop')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {isPlayingSurah && (
          <View style={styles.readerQariRow}>
            <Ionicons name="mic-outline" size={12} color={C.primary} />
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginLeft: 6,
                backgroundColor: RECITER_CAPABILITY_META[reciterCapability].dot,
                borderWidth: 1,
                borderColor: reciterCapability === 'audio'
                  ? `${C.textMuted}AA`
                  : `${RECITER_CAPABILITY_META[reciterCapability].dot}CC`,
              }}
            />
            <Text style={{ color: C.textSecondary, fontSize: 10, fontWeight: '700', marginLeft: 6 }}>
              {reciter.name}{isSurahOnlyReciter ? ` · ${t('full_surah')}` : ''} · {getReciterCapabilityShort(reciterCapability)}
            </Text>
          </View>
        )}
        {!isJuzMode && (
          <View style={styles.readerOfflineRow}>
            <Ionicons name="cloud-offline-outline" size={12} color={C.textMuted} />
            <Text style={{ color: C.textMuted, fontSize: 10, marginLeft: 6, flex: 1 }}>
              {t('offline_quran_short')}: {autoOfflineStatus
                ? (autoOfflineStatus.allReady
                  ? t('offline_all_ready')
                  : autoOfflineStatus.running
                    ? `${t('offline_syncing')} ${autoOfflineStatus.completed}/${autoOfflineStatus.total}`
                    : t('offline_preparing'))
                : t('checking_label')} · {t('audio_short')} {reciter.name}: {offlineAudioStatus ? `${offlineAudioStatus.available}/${offlineAudioStatus.total}` : t('checking_label')}
            </Text>
          </View>
        )}
        {!isJuzMode && !!offlineTask && (
          <View style={styles.readerOfflineTaskRow}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={{ color: C.textSecondary, fontSize: 10, marginLeft: 7, flex: 1 }}>
              {offlineTask.label}
            </Text>
          </View>
        )}

        <View style={styles.readerNavRow}>
          {isJuzMode ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  if (prevJuzMeta) {
                    goToJuz(prevJuzMeta.number, 'prev');
                  }
                }}
                disabled={!prevJuzMeta}
                style={[styles.readerNavBtn, { backgroundColor: C.card, borderColor: C.border, opacity: prevJuzMeta ? 1 : 0.5 }]}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={16} color={C.primary} />
                <View style={{ flex: 1, marginLeft: 4 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9, fontWeight: '700' }}>JUZ SEBELUMNYA</Text>
                  <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                    {prevJuzMeta ? t('juz_label') + ' ' + prevJuzMeta.number : t('quran_start')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (nextJuzMeta) {
                    goToJuz(nextJuzMeta.number, 'next');
                  }
                }}
                disabled={!nextJuzMeta}
                style={[styles.readerNavBtn, { backgroundColor: C.card, borderColor: C.border, opacity: nextJuzMeta ? 1 : 0.5 }]}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 4 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9, fontWeight: '700' }}>JUZ BERIKUTNYA</Text>
                  <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                    {nextJuzMeta ? t('juz_label') + ' ' + nextJuzMeta.number : t('quran_end')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.primary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => canGoPrevSurah && prevSurahMeta && goToSurah(prevSurahMeta.number, { navDir: 'prev' })}
                disabled={!canGoPrevSurah}
                style={[styles.readerNavBtn, { backgroundColor: C.card, borderColor: C.border, opacity: canGoPrevSurah ? 1 : 0.5 }]}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={16} color={C.primary} />
                <View style={{ flex: 1, marginLeft: 4 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9, fontWeight: '700' }}>SEBELUMNYA</Text>
                  <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                    {canGoPrevSurah ? (prevSurahMeta?.englishName ?? t('previous_surah')) : t('first_surah')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => canGoNextSurah && nextSurahMeta && goToSurah(nextSurahMeta.number, { navDir: 'next' })}
                disabled={!canGoNextSurah}
                style={[styles.readerNavBtn, { backgroundColor: C.card, borderColor: C.border, opacity: canGoNextSurah ? 1 : 0.5 }]}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 4 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9, fontWeight: '700' }}>BERIKUTNYA</Text>
                  <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                    {canGoNextSurah ? (nextSurahMeta?.englishName ?? t('next_surah')) : t('last_surah')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {isJuzMode ? (
        /* Juz mode: tampilkan semua surah dalam juz secara continuous scroll */
        <FlatList
          ref={juzFlatListRef}
          style={[{ backgroundColor: C.background }, isWideWeb && styles.webListContainer]}
          data={juzScrollData}
          keyExtractor={(item, idx) => `juz-${item._k}-${item.surahNum}-${idx}`}
          renderItem={renderJuzScrollItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: isPlayingSurah ? 120 : 48, backgroundColor: C.background, flexGrow: 1 }}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={false}
          onScrollBeginDrag={() => markUserScrolling(2200)}
          onScrollEndDrag={() => {
            autoScrollSuppressedUntilRef.current = Math.max(autoScrollSuppressedUntilRef.current, Date.now() + 900);
            releaseUserScrollingSoon(240);
          }}
          onMomentumScrollBegin={() => markUserScrolling(2200)}
          onMomentumScrollEnd={() => {
            autoScrollSuppressedUntilRef.current = Math.max(autoScrollSuppressedUntilRef.current, Date.now() + 500);
            releaseUserScrollingSoon(120);
          }}
          scrollEventThrottle={16}
          onScrollToIndexFailed={info => {
            setTimeout(() => {
              if (userScrollingRef.current) return;
              const maxIndex = Math.max(0, juzScrollData.length - 1);
              const clampedIndex = Math.min(Math.max(info.index, 0), maxIndex);
              juzFlatListRef.current?.scrollToIndex({
                index: clampedIndex,
                animated: true,
                viewPosition: AYAH_FOLLOW_VIEW_POSITION,
                viewOffset: AYAH_FOLLOW_VIEW_OFFSET,
              });
            }, 200);
          }}
          extraData={[juzAllBookmarks, juzPlayingKey, showTranslation, arabicFontSize, isPlayingSurah, playingAyah, num]}
        />
      ) : loading && !surah ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={{ color: C.textMuted, marginTop: 12, fontSize: FontSize.sm }}>{t('loading_surah')}</Text>
        </View>
      ) : error && !surah ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.textMuted} />
          <Text style={{ color: C.error, textAlign: 'center', marginTop: 12, fontSize: FontSize.sm }}>{error}</Text>
          <TouchableOpacity onPress={load} style={[styles.retryBtn, { backgroundColor: C.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : surah ? (
        <FlatList
          key={`reader-${num}-${displayMode}-${effectiveStartAyahForCurrentSurah}`}
          ref={flatListRef}
          style={[{ backgroundColor: C.background }, isWideWeb && styles.webListContainer]}
          data={visibleAyahIndices}
          keyExtractor={item => String(surah.arabic.ayahs[item]?.numberInSurah ?? item)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={showOnlyAsbabAyahs ? (
            <View style={styles.asbabEmptyWrap}>
              <Ionicons name="journal-outline" size={18} color={C.textMuted} />
              <Text style={{ color: C.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 8 }}>
                {t('asbab_empty_title')}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 4, textAlign: 'center' }}>
                {t('asbab_empty_desc')}
              </Text>
            </View>
          ) : null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: isPlayingSurah ? 120 : 48, backgroundColor: C.background, flexGrow: 1 }}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={8}
          removeClippedSubviews={false}
          onScrollBeginDrag={() => markUserScrolling(2200)}
          onScrollEndDrag={() => {
            autoScrollSuppressedUntilRef.current = Math.max(autoScrollSuppressedUntilRef.current, Date.now() + 900);
            releaseUserScrollingSoon(240);
          }}
          onMomentumScrollBegin={() => markUserScrolling(2200)}
          onMomentumScrollEnd={() => {
            autoScrollSuppressedUntilRef.current = Math.max(autoScrollSuppressedUntilRef.current, Date.now() + 500);
            releaseUserScrollingSoon(120);
          }}
          scrollEventThrottle={16}
          extraData={[bookmarks, playingAyah, playingAyahProgress, activeAyahWordIndex, reciterCapability, playingBasmallah, ayahPlayMode, showTranslation, showOnlyAsbabAyahs, expandedAsbabun, displayMode, translitTexts, wordByWordMap, arabicFontSize, showLegend, showTips, showReaderTips, isPlayingSurah, reciter.id]}
          onScrollToIndexFailed={info => {
            setTimeout(() => {
              const suppressAutoScroll =
                userScrollingRef.current || Date.now() < autoScrollSuppressedUntilRef.current;
              if (suppressAutoScroll) return;
              const maxIndex = Math.max(0, visibleAyahIndices.length - 1);
              const clampedIndex = Math.min(Math.max(info.index, 0), maxIndex);
              flatListRef.current?.scrollToIndex({
                index: clampedIndex,
                animated: true,
                viewPosition: AYAH_FOLLOW_VIEW_POSITION,
                viewOffset: AYAH_FOLLOW_VIEW_OFFSET,
              });
            }, 300);
          }}
        />
      ) : null}

      {/* â"€â"€ Panel Panduan (Tajwid + Tanda Baca) â"€â"€ */}
      <Modal visible={!!activeTajweedRule} transparent animationType="slide">
        <View style={{ flex: 1 }}>
          {/* Backdrop â€" tap untuk tutup */}
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: C.overlay }]}
            onPress={() => setActiveTajweedRule(null)}
          />
          {/* Panel â€" tidak di dalam Pressable agar ScrollView bisa scroll */}
          <View style={[styles.tajweedPanel, { backgroundColor: C.surface, position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
            {activeTajweedRule && (() => {
              const allKeys = Object.keys(GUIDE_MAP);
              const currentIdx = allKeys.indexOf(activeTajweedRule);
              const prevKey = currentIdx > 0 ? allKeys[currentIdx - 1] : null;
              const nextKey = currentIdx < allKeys.length - 1 ? allKeys[currentIdx + 1] : null;
              const guide = getGuideEntry(activeTajweedRule);
              if (!guide) return null;

              return (
                <>
                  {/* Handle */}
                  <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

                  {/* â"€â"€ Header: warna + nama + tutup â"€â"€ */}
                  <View style={styles.tpHeader}>
                    <View style={[styles.tpColorBadge, { backgroundColor: guide.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 }}>
                        {guide.category.toUpperCase()}
                      </Text>
                      <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginTop: 1 }} numberOfLines={1}>
                        {guide.label}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setActiveTajweedRule(null)} hitSlop={12} style={styles.tpCloseBtn}>
                      <Ionicons name="close" size={18} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* â"€â"€ Navigasi Prev / Next â"€â"€ */}
                  <View style={[styles.tpNavRow, { borderColor: C.border }]}>
                    <TouchableOpacity
                      onPress={() => prevKey && setActiveTajweedRule(prevKey)}
                      disabled={!prevKey}
                      style={[styles.tpNavBtn, { opacity: prevKey ? 1 : 0.3 }]}
                    >
                      <Ionicons name="chevron-back" size={14} color={C.primary} />
                      <Text style={{ color: C.primary, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                        {prevKey ? getGuideEntry(prevKey)?.label : t('first')}
                      </Text>
                    </TouchableOpacity>

                    <View style={[styles.tpNavCounter, { backgroundColor: C.card, borderColor: C.border }]}>
                      <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '800' }}>
                        {currentIdx + 1} / {allKeys.length}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => nextKey && setActiveTajweedRule(nextKey)}
                      disabled={!nextKey}
                      style={[styles.tpNavBtn, { opacity: nextKey ? 1 : 0.3, flexDirection: 'row-reverse' }]}
                    >
                      <Ionicons name="chevron-forward" size={14} color={C.primary} />
                      <Text style={{ color: C.primary, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                        {nextKey ? getGuideEntry(nextKey)?.label : t('last')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* â"€â"€ Konten yang bisa di-scroll â"€â"€ */}
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tpScroll}>

                    {/* Ringkasan cara baca */}
                    <View style={[styles.tpHowBox, { backgroundColor: `${guide.color}12`, borderColor: `${guide.color}35` }]}>
                      <Ionicons name="information-circle" size={17} color={guide.color} style={{ marginTop: 1 }} />
                      <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '600', flex: 1, marginLeft: 8, lineHeight: 21 }}>
                        {guide.how}
                      </Text>
                    </View>

                    {/* Langkah-langkah */}
                    <View style={[styles.tpSection, { backgroundColor: C.card, borderColor: C.border }]}>
                      <Text style={[styles.tpSectionTitle, { color: C.textMuted }]}>{t('how_to_read')}</Text>
                      {guide.steps.map((step, idx) => (
                        <View key={idx} style={[styles.tpStep, idx < guide.steps.length - 1 && { marginBottom: 10 }]}>
                          <View style={[styles.tpStepNum, { backgroundColor: guide.color }]}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{idx + 1}</Text>
                          </View>
                          <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, flex: 1, lineHeight: 20 }}>
                            {step}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Contoh */}
                    <View style={[styles.tpSection, { backgroundColor: C.card, borderColor: C.border }]}>
                      <Text style={[styles.tpSectionTitle, { color: C.textMuted }]}>{t('example_label')}</Text>
                      <Text style={{ color: C.text, fontSize: 20, fontFamily: arabicFontFamily, textAlign: 'right', lineHeight: 36, writingDirection: 'rtl' }}>
                        {guide.example}
                      </Text>
                    </View>

                    {/* Tips */}
                    <View style={[styles.tpTipBox, { backgroundColor: `${C.gold}10`, borderColor: `${C.gold}30` }]}>
                      <Ionicons name="bulb" size={15} color={C.gold} style={{ marginTop: 1 }} />
                      <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, flex: 1, marginLeft: 8, lineHeight: 20 }}>
                        <Text style={{ color: C.gold, fontWeight: '700' }}>{t('tips_prefix')}: </Text>
                        {guide.tip}
                      </Text>
                    </View>

                    {/* Tombol YouTube */}
                    <TouchableOpacity
                      onPress={() => Linking.openURL(guide.youtube)}
                      activeOpacity={0.75}
                      style={[styles.tpYoutubeBtn, { borderColor: '#FF000030' }]}
                    >
                      <View style={styles.tpYoutubeBg}>
                        <Ionicons name="logo-youtube" size={18} color="#FF0000" />
                      </View>
                      <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '600', flex: 1, marginLeft: 10 }}>
                        {t('view_guide_video')}
                      </Text>
                      <Ionicons name="open-outline" size={14} color={C.textMuted} />
                    </TouchableOpacity>

                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* â"€â"€ Floating Surah Player Bar â"€â"€ */}
      {isPlayingSurah && (
        <View style={[styles.surahPlayerBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
          {/* Prev */}
          <TouchableOpacity
            onPress={() => playAyahAt(currentSurahIdxRef.current - 1)}
            disabled={isSurahOnlyReciter || currentSurahIdxRef.current === 0}
            style={[styles.spBtn, { opacity: isSurahOnlyReciter || currentSurahIdxRef.current === 0 ? 0.3 : 1 }]}
          >
            <Ionicons name="play-skip-back" size={20} color={C.primary} />
          </TouchableOpacity>

          {/* Info tengah */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.spDot, { backgroundColor: isSurahPaused ? C.gold : C.primary }]} />
              <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700' }}>
                {isSurahPaused ? t('paused') : t('playing')}
              </Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }}>
              {isSurahOnlyReciter
                ? t('full_surah_mode')
                : isJuzMode
                  ? `${surahMeta?.englishName ?? `Surah ${num}`} : ${playingAyah ?? '...'}`
                  : `${t('verse_label')} ${playingAyah ?? '...'} / ${surahMeta?.ayahCount ?? '?'}`}
            </Text>
          </View>

          {/* Next */}
          <TouchableOpacity
            onPress={() => playAyahAt(currentSurahIdxRef.current + 1)}
            disabled={isSurahOnlyReciter || !surah || currentSurahIdxRef.current >= (surah.arabic.ayahs.length - 1)}
            style={[styles.spBtn, { opacity: isSurahOnlyReciter || !surah || currentSurahIdxRef.current >= (surah.arabic.ayahs.length - 1) ? 0.3 : 1 }]}
          >
            <Ionicons name="play-skip-forward" size={20} color={C.primary} />
          </TouchableOpacity>

          {/* Pause / Resume */}
          <TouchableOpacity
            onPress={() => isSurahPaused ? resumeSurahPlayback() : pauseSurahPlayback()}
            style={[styles.spBtn, { backgroundColor: isSurahPaused ? C.primaryMuted : C.surface }]}
          >
            <Ionicons
              name={isSurahPaused ? 'play' : 'pause'}
              size={18}
              color={isSurahPaused ? C.primary : C.textSecondary}
            />
          </TouchableOpacity>

          {/* Stop */}
          <TouchableOpacity onPress={stopSurahPlayback} style={[styles.spBtn, styles.spStopBtn, { backgroundColor: '#FF3B3015' }]}>
            <Ionicons name="stop" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      )}

      {/* â"€â"€ Menu Titik 3 â"€â"€ */}
      <Modal visible={showReaderMenu} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: C.overlay }]} onPress={() => setShowReaderMenu(false)}>
          <Pressable style={[styles.readerMenuSheet, { backgroundColor: C.surface, borderColor: C.border }]} onPress={e => e.stopPropagation()}>
            <TouchableOpacity
              onPress={() => {
                setShowReaderMenu(false);
                setShowSettings(true);
              }}
              style={styles.readerMenuItem}
            >
              <Ionicons name="settings-outline" size={16} color={C.primary} />
              <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700', marginLeft: 10 }}>
                {t('reader_settings')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                setShowReaderMenu(false);
                await stopAudio();
                router.push({
                  pathname: '/quran/about/[surahId]',
                  params: { surahId: String(num) },
                });
              }}
              style={styles.readerMenuItem}
            >
              <Ionicons name="information-circle-outline" size={16} color={C.primary} />
              <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700', marginLeft: 10 }}>
                {t('about_surah')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                setShowReaderMenu(false);
                await toggleSurahBookmark();
              }}
              style={styles.readerMenuItem}
            >
              <Ionicons name={surahBookmarked ? 'star' : 'star-outline'} size={16} color={surahBookmarked ? C.gold : C.primary} />
              <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700', marginLeft: 10 }}>
                {surahBookmarked ? t('remove_surah_bookmark') : t('bookmark_surah')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowReaderMenu(false);
                setShowBookmarkHistory(true);
              }}
              style={styles.readerMenuItem}
            >
              <Ionicons name="bookmarks-outline" size={16} color={C.primary} />
              <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700', marginLeft: 10 }}>
                {t('bookmark_history')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowReaderMenu(false);
                setShowReaderTips(v => !v);
              }}
              style={styles.readerMenuItem}
            >
              <Ionicons name={showReaderTips ? 'eye-off-outline' : 'eye-outline'} size={16} color={C.primary} />
              <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700', marginLeft: 10 }}>
                {showReaderTips ? t('hide_tip') : t('show_tip')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* â"€â"€ Modal History Bookmark â"€â"€ */}
      <Modal visible={showBookmarkHistory} transparent animationType="slide">
        <Pressable style={[styles.modalOverlay, { backgroundColor: C.overlay }]} onPress={() => setShowBookmarkHistory(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: C.surface, padding: Spacing.xl, paddingBottom: 28 }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800' }}>{t('bookmark_history')}</Text>
                <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                  {t('bookmark_history_desc')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBookmarkHistory(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 18 }}>
              {bookmarkHistory.length === 0 ? (
                <View style={[styles.bookmarkEmptyBox, { backgroundColor: C.card, borderColor: C.border }]}>
                  <Ionicons name="bookmark-outline" size={20} color={C.textMuted} />
                  <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, marginTop: 8, textAlign: 'center' }}>
                    {t('bookmark_empty_desc')}
                  </Text>
                </View>
              ) : (
                groupedBookmarkHistory.map(group => (
                  <View key={group.groupName} style={{ marginBottom: Spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="folder-open-outline" size={13} color={C.primary} />
                      <Text style={{ color: C.primary, fontSize: 12, fontWeight: '800', marginLeft: 6 }}>
                        {group.groupName}
                      </Text>
                      <Text style={{ color: C.textMuted, fontSize: 10, marginLeft: 6 }}>
                        {group.items.length} {t('item_unit')}
                      </Text>
                    </View>

                    {group.items.map((item, idx) => {
                      const isSurah = (item.kind ?? (item.ayahNumber === 0 ? 'surah' : 'ayah')) === 'surah';
                      return (
                        <View key={`${item.surahNumber}-${item.ayahNumber}-${idx}`} style={[styles.bookmarkHistoryRow, { backgroundColor: C.card, borderColor: C.border }]}>
                          <TouchableOpacity onPress={() => openBookmarkTarget(item)} style={{ flex: 1 }}>
                            <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700' }} numberOfLines={1}>
                              {isSurah ? item.surahName : `${item.surahName} · ${t('verse_label')} ${item.ayahNumber}`}
                            </Text>
                            <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 3 }} numberOfLines={2}>
                              {isSurah ? t('favorite_surah_desc') : (item.translation || t('favorite_ayah_desc'))}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => openBookmarkTarget(item)} style={[styles.bookmarkHistoryActionBtn, { borderColor: C.border }]}>
                            <Ionicons name="open-outline" size={14} color={C.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteBookmarkItem(item)} style={[styles.bookmarkHistoryActionBtn, { borderColor: '#EF444455', backgroundColor: '#EF444414' }]}>
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* â"€â"€ Modal Input Nama Bookmark â"€â"€ */}
      <Modal visible={showBookmarkNameModal} transparent animationType="slide">
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: C.overlay }]}
          onPress={() => {
            setShowBookmarkNameModal(false);
            setPendingBookmark(null);
          }}
        >
          <Pressable style={[styles.modalSheet, { backgroundColor: C.surface, padding: Spacing.xl }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

            <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '800' }}>
              {pendingBookmark?.kind === 'surah' ? t('bookmark_surah') : t('favorite_ayah')}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 4, marginBottom: 12 }}>
              {t('bookmark_name_example')}
            </Text>

            <TextInput
              value={bookmarkNameInput}
              onChangeText={setBookmarkNameInput}
              placeholder={t('bookmark_name_placeholder')}
              placeholderTextColor={C.textMuted}
              style={[styles.bookmarkNameInput, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
              autoCapitalize="sentences"
              returnKeyType="done"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowBookmarkNameModal(false);
                  setPendingBookmark(null);
                }}
                style={[styles.bookmarkModalBtn, { backgroundColor: C.card, borderColor: C.border }]}
              >
                <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, fontWeight: '700' }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={savePendingBookmark}
                style={[styles.bookmarkModalBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
              >
                <Text style={{ color: '#fff', fontSize: FontSize.sm, fontWeight: '800' }}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* â"€â"€ Modal Pengaturan â"€â"€ */}
      <Modal visible={showSettings} transparent animationType="slide">
        <Pressable style={[styles.modalOverlay, { backgroundColor: C.overlay }]} onPress={closeSettingsSheet}>
          <Pressable style={[styles.modalSheet, { backgroundColor: C.surface, padding: Spacing.xl, paddingBottom: 40 }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Judul */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800' }}>{t('reader_settings_title')}</Text>
                  <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                    {t('settings_apply_immediately')}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeSettingsSheet} hitSlop={8}>
                  <Ionicons name="close" size={22} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              {/* â"€â"€ Qari â"€â"€ */}
              <Text style={[styles.settingsSectionLabel, { color: C.textMuted }]}>{t('qari_label').toUpperCase()}</Text>
              <TouchableOpacity
                onPress={openReciterPickerFromSettings}
                style={[styles.settingsOptionRow, { backgroundColor: C.card, borderColor: C.border, marginBottom: Spacing.xl }]}
              >
                <View style={[styles.settingsRadio, { borderColor: C.primary }]}>
                  <View style={[styles.settingsRadioDot, { backgroundColor: C.primary }]} />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="mic-outline" size={16} color={C.primary} />
                    <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>{reciter.name}</Text>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: RECITER_CAPABILITY_META[reciterCapability].dot,
                        borderWidth: 1,
                        borderColor: reciterCapability === 'audio'
                          ? `${C.textMuted}AA`
                          : `${RECITER_CAPABILITY_META[reciterCapability].dot}CC`,
                      }}
                    />
                  </View>
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 3 }}>
                    {t('tap_to_change_qari')} · {getReciterCapabilityShort(reciterCapability)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </TouchableOpacity>
              <View style={[styles.settingsSubCard, { backgroundColor: C.card, borderColor: C.border, marginBottom: Spacing.xl }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="cloud-download-outline" size={15} color={C.primary} />
                  <Text style={{ color: C.text, fontSize: 12, fontWeight: '700', marginLeft: 8 }}>
                    {t('offline_audio_label')}
                  </Text>
                </View>
                <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 6, lineHeight: 16 }}>
                  {t('offline_audio_desc')}
                </Text>
                <Text style={{ color: C.textSecondary, fontSize: 10, marginTop: 6 }}>
                  {t('status_label')} {reciter.name}: {offlineAudioStatus ? `${offlineAudioStatus.available}/${offlineAudioStatus.total} file` : t('checking_label')}
                </Text>
                <View style={styles.settingsActionRow}>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        t('download_audio_title'),
                        `${reciter.name}: ${t('download_audio_prompt')}`,
                        [
                          { text: t('later'), style: 'cancel' },
                          {
                            text: t('download_audio'),
                            onPress: () => {
                              void (async () => {
                                await stopAudio();
                                await startOfflineReciterDownload();
                              })();
                            },
                          },
                        ]
                      );
                    }}
                    disabled={!!offlineTask}
                    style={[
                      styles.settingsActionBtn,
                      { borderColor: C.primary, backgroundColor: C.primaryMuted, opacity: offlineTask ? 0.6 : 1 },
                    ]}
                  >
                    <Ionicons name="download-outline" size={14} color={C.primary} />
                    <Text style={{ color: C.primary, fontSize: 11, fontWeight: '700', marginLeft: 6 }}>
                      {t('download_audio')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        t('remove_audio_title'),
                        `${reciter.name}: ${t('remove_audio_prompt')}`,
                        [
                          { text: t('cancel'), style: 'cancel' },
                          {
                            text: t('remove_audio'),
                            style: 'destructive',
                            onPress: () => {
                              void (async () => {
                                await stopAudio();
                                await removeOfflineReciterAudio();
                              })();
                            },
                          },
                        ]
                      );
                    }}
                    disabled={!!offlineTask || !(offlineAudioStatus?.available ?? 0)}
                    style={[
                      styles.settingsActionBtn,
                      {
                        borderColor: '#EF444455',
                        backgroundColor: '#EF444414',
                        opacity: (!!offlineTask || !(offlineAudioStatus?.available ?? 0)) ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginLeft: 6 }}>
                      {t('remove_audio')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {offlineTask?.kind === 'audio' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <ActivityIndicator size="small" color={C.primary} />
                    <Text style={{ color: C.textSecondary, fontSize: 10, marginLeft: 7, flex: 1 }}>
                      {offlineTask.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* â"€â"€ Tulisan Arab â"€â"€ */}
              <Text style={[styles.settingsSectionLabel, { color: C.textMuted }]}>{t('arabic_script_label')}</Text>
              <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
                {ARABIC_SCRIPTS.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setScript(s.id)}
                    style={[styles.settingsOptionRow, {
                      backgroundColor: script === s.id ? C.primaryMuted : C.card,
                      borderColor: script === s.id ? C.primary : C.border,
                    }]}
                  >
                    <View style={[styles.settingsRadio, { borderColor: script === s.id ? C.primary : C.border }]}>
                      {script === s.id && <View style={[styles.settingsRadioDot, { backgroundColor: C.primary }]} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>{s.name}</Text>
                        <Text style={{ color: C.text, fontSize: 20, fontFamily: getArabicFontFamily(s.id) }}>{s.sample}</Text>
                      </View>
                      <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>{s.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* â"€â"€ Mode Tampilan â"€â"€ */}
              <Text style={[styles.settingsSectionLabel, { color: C.textMuted }]}>{t('display_mode_label')}</Text>
              <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
                {MODE_OPTIONS.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setDisplayMode(m.id)}
                    style={[styles.settingsOptionRow, {
                      backgroundColor: displayMode === m.id ? C.primaryMuted : C.card,
                      borderColor: displayMode === m.id ? C.primary : C.border,
                    }]}
                  >
                    <View style={[styles.settingsRadio, { borderColor: displayMode === m.id ? C.primary : C.border }]}>
                      {displayMode === m.id && <View style={[styles.settingsRadioDot, { backgroundColor: C.primary }]} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name={m.icon} size={16} color={displayMode === m.id ? C.primary : C.textSecondary} />
                        <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>{getDisplayModeTitle(m.id)}</Text>
                      </View>
                      <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 3, lineHeight: 17 }}>{getDisplayModeDesc(m.id)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* â"€â"€ Filter Ayat â"€â"€ */}
              <Text style={[styles.settingsSectionLabel, { color: C.textMuted }]}>{t('filter_ayah_label')}</Text>
              <TouchableOpacity
                onPress={() => setShowOnlyAsbabAyahs(v => !v)}
                style={[styles.settingsToggleRow, {
                  backgroundColor: showOnlyAsbabAyahs ? C.primaryMuted : C.card,
                  borderColor: showOnlyAsbabAyahs ? C.primary : C.border,
                  marginBottom: Spacing.xl,
                }]}
              >
                <Ionicons name="funnel-outline" size={18} color={showOnlyAsbabAyahs ? C.primary : C.textSecondary} />
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '600' }}>
                    {t('asbab_only_label')}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                    {asbabAyahCountInSurah > 0
                      ? `${asbabAyahCountInSurah} ${t('asbab_available_suffix')}`
                      : t('asbab_no_data')}
                  </Text>
                </View>
                <View style={[styles.settingsToggle, { backgroundColor: showOnlyAsbabAyahs ? C.primary : C.border }]}>
                  <View style={[styles.settingsToggleThumb, { transform: [{ translateX: showOnlyAsbabAyahs ? 18 : 2 }] }]} />
                </View>
              </TouchableOpacity>

              {/* â"€â"€ Mode Play Ayat â"€â"€ */}
              <Text style={[styles.settingsSectionLabel, { color: C.textMuted }]}>{t('play_ayah_mode_label')}</Text>
              <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
                {([
                  {
                    id: 'single' as AyahPlayMode,
                    label: t('play_single_ayah'),
                    desc: t('play_single_ayah_desc'),
                    icon: 'play-circle-outline' as keyof typeof Ionicons.glyphMap,
                  },
                  {
                    id: 'continuous' as AyahPlayMode,
                    label: t('play_continuous'),
                    desc: t('play_continuous_desc'),
                    icon: 'play-forward-circle-outline' as keyof typeof Ionicons.glyphMap,
                  },
                ]).map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setAyahPlayMode(opt.id)}
                    style={[styles.settingsOptionRow, {
                      backgroundColor: ayahPlayMode === opt.id ? C.primaryMuted : C.card,
                      borderColor: ayahPlayMode === opt.id ? C.primary : C.border,
                    }]}
                  >
                    <View style={[styles.settingsRadio, { borderColor: ayahPlayMode === opt.id ? C.primary : C.border }]}>
                      {ayahPlayMode === opt.id && <View style={[styles.settingsRadioDot, { backgroundColor: C.primary }]} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name={opt.icon} size={16} color={ayahPlayMode === opt.id ? C.primary : C.textSecondary} />
                        <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>{opt.label}</Text>
                      </View>
                      <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 3, lineHeight: 17 }}>{opt.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* â"€â"€ Ukuran Huruf â"€â"€ */}
              <Text style={[styles.settingsSectionLabel, { color: C.textMuted }]}>{t('arabic_font_size_label')}</Text>
              <View style={[styles.settingsFontRow, { backgroundColor: C.card, borderColor: C.border, marginBottom: Spacing.xl }]}>
                <TouchableOpacity
                  onPress={() => setArabicFontSize(v => Math.max(ARABIC_FONT_MIN, v - 2))}
                  style={[styles.settingsFontBtn, { borderColor: C.border }]}
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={18} color={C.textSecondary} />
                  <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }}>{t('font_small')}</Text>
                </TouchableOpacity>
                <View style={[styles.settingsFontPreview, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Text
                    style={{
                      color: C.text,
                      fontSize: arabicFontSize,
                      fontFamily: arabicFontFamily,
                      lineHeight: Math.round(arabicFontSize * 1.8),
                      textAlign: 'center',
                    }}
                  >
                    {ARABIC_FONT_PREVIEW_TEXT}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 10 }}>{arabicFontSize}px</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setArabicFontSize(v => Math.min(ARABIC_FONT_MAX, v + 2))}
                  style={[styles.settingsFontBtn, { borderColor: C.border }]}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={18} color={C.textSecondary} />
                  <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }}>{t('font_large')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: C.textMuted, fontSize: 10, marginTop: -18, marginBottom: Spacing.xl }}>
                {t('font_size_hint')} ({ARABIC_FONT_MIN}-{ARABIC_FONT_MAX}px).
              </Text>

              {/* â"€â"€ Terjemahan â"€â"€ */}
              <Text style={[styles.settingsSectionLabel, { color: C.textMuted }]}>{t('translation_label')}</Text>
              <TouchableOpacity
                onPress={() => setShowTranslation(v => !v)}
                style={[styles.settingsToggleRow, {
                  backgroundColor: showTranslation ? C.primaryMuted : C.card,
                  borderColor: showTranslation ? C.primary : C.border,
                  marginBottom: Spacing.xl,
                }]}
              >
                <Ionicons name="language-outline" size={18} color={showTranslation ? C.primary : C.textSecondary} />
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '600' }}>{t('show_translation')}</Text>
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>{t('translation_language_desc')}</Text>
                </View>
                <View style={[styles.settingsToggle, { backgroundColor: showTranslation ? C.primary : C.border }]}>
                  <View style={[styles.settingsToggleThumb, { transform: [{ translateX: showTranslation ? 18 : 2 }] }]} />
                </View>
              </TouchableOpacity>

              {/* Reset */}
              <TouchableOpacity
                onPress={() => {
                  setScript(DEFAULT_ARABIC_SCRIPT);
                  setDisplayMode('normal');
                  setAyahPlayMode('single');
                  setArabicFontSize(26);
                  setShowTranslation(true);
                  setShowOnlyAsbabAyahs(false);
                }}
                style={[styles.settingsResetBtn, { borderColor: C.border }]}
              >
                <Ionicons name="refresh-outline" size={15} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontSize: FontSize.sm, marginLeft: 6 }}>{t('reset_defaults')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal Pilih Qari (terpisah, full-sheet) ── */}
      <Modal
        visible={showSettings && settingsSheetView === 'reciter'}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsSheetView('main')}
      >
        <TouchableWithoutFeedback onPress={() => setSettingsSheetView('main')}>
          <View style={[styles.modalOverlay, { backgroundColor: C.overlay }]}>
            {/* TouchableWithoutFeedback di sini menghentikan touch agar tidak
                menutup modal ketika user tap di dalam sheet, tanpa memblokir
                gesture scroll pada ScrollView di dalamnya */}
            <TouchableWithoutFeedback>
              <View style={[styles.reciterModalSheet, { backgroundColor: C.background }]}>
                {ReciterSheetOverlay()}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      </Animated.View>
    </SafeAreaView>
  );
}

// â"€â"€â"€ Styles â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const styles = StyleSheet.create({
  webSurfaceContainer: {
    width: '100%',
    maxWidth: WEB_READER_MAX_WIDTH,
    alignSelf: 'center',
  },
  webListContainer: {
    width: '100%',
    maxWidth: WEB_READER_MAX_WIDTH,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readerControlPanel: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  readerPlaybackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  readerQariRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 6,
  },
  readerOfflineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  readerOfflineTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  readerMainPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  readerStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  readerNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.sm,
  },
  readerNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  readerTipCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  readerTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readerTipToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  asbabFilterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B98144',
    backgroundColor: '#10B98116',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  asbabEmptyWrap: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#64748B66',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readerMenuSheet: {
    position: 'absolute',
    top: 56,
    right: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minWidth: 220,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  readerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  juzSurahHeader: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  basmallahContainer: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  basmallahText: {
    fontSize: 26,
    fontFamily: ARABIC_FONT_FAMILY_DEFAULT,
    textAlign: 'center',
    lineHeight: 48,
  },
  // Tajwid legend
  legendContainer: {
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  legendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendHeaderIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  legendToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  legendHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginTop: 10,
    marginBottom: 10,
  },
  legendChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // â"€â"€ Tajwid Rule Panel â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  tajweedPanel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.sm,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  tpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  tpColorBadge: {
    width: 6,
    height: 44,
    borderRadius: 3,
    flexShrink: 0,
  },
  tpCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tpNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  tpNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    paddingVertical: 4,
  },
  tpNavCounter: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  tpScroll: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: 40,
  },
  tpHowBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  tpSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  tpSectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  tpStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tpStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  tpTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  tpYoutubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    backgroundColor: '#FF00000A',
  },
  tpYoutubeBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FF000015',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bookmarkEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  bookmarkHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: 8,
    gap: 8,
  },
  bookmarkHistoryActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bookmarkNameInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FontSize.sm,
  },
  bookmarkModalBtn: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  // Pemula tips
  tipsContainer: {
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Surah player bar
  surahPlayerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  spBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spStopBtn: {
    borderRadius: 10,
  },
  spDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Normal ayah
  ayahCard: {
    marginHorizontal: Spacing.xs,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'visible',
  },
  ayahHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginBottom: Spacing.sm,
  },
  ayahNumBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahNumOrnament: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ayahNumDiamondOuter: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 1.2,
    borderRadius: 6,
    transform: [{ rotate: '45deg' }],
  },
  ayahNumDiamondInner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderWidth: 1,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  ayahNumMarkerText: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahArabicSection: {
    marginHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 6,
    overflow: 'visible',
  },
  ayahArabicCanvas: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingVertical: 2,
    paddingHorizontal: 2,
    overflow: 'visible',
  },
  ayahTranslationSection: {
    marginTop: 10,
    paddingTop: 10,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  arabicText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: ARABIC_FONT_FAMILY_DEFAULT,
    width: '100%',
    overflow: 'visible',
    letterSpacing: 0,
    paddingVertical: 4,
  },
  translationText: {
    fontSize: FontSize.sm,
    marginTop: 0,
    lineHeight: 23,
    textAlign: 'left',
  },
  // Asbabun nuzul
  asbabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  asbabToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  asbabPanel: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  asbabRangeLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  asbabSource: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  asbabRefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  asbabUlamaWrap: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  asbabUlamaCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  // Pemula mode
  pemulaCard: {
    marginHorizontal: Spacing.xs,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  pemulaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pemulaNumBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pemulaNumMarkerText: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textAlign: 'center',
  },
  pemulaPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  wordChipContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    padding: Spacing.sm,
    gap: 6,
  },
  wordChip: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'flex-end',
    minWidth: 40,
    position: 'relative',
  },
  wordOrderBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  pemulaArabicFull: {
    paddingTop: 2,
    paddingBottom: Spacing.sm,
  },
  translitBox: {
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  translationBox: {
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  // Settings modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.sm,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  // Settings modal controls
  settingsSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  settingsOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  settingsRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  settingsFontRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  settingsFontBtn: {
    width: 62,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  settingsFontPreview: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 86,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  settingsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  settingsSubCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  settingsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  settingsActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  settingsToggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  settingsToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  settingsResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  // Reciter modal
  reciterModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  reciterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  reciterHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reciterHeaderTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  reciterSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  reciterActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: Spacing.md,
  },
  reciterAvatarLg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reciterAvatarSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reciterCapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    gap: 3,
  },
  reciterCapDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  reciterGroupDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: Spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reciterGroupIconBadge: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reciterItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  reciterInlineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reciterGroupSection: {
    marginBottom: Spacing.md,
  },
  reciterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  retryBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
});

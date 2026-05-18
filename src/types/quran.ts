/**
 * Quran-related TypeScript types.
 * Re-exported here for clean developer imports: `import { SurahWithTranslation } from '@/types/quran'`
 */
export type {
  ArabicScript,
  TajweedSpan,
  Ayah,
  Surah,
  SurahWithTranslation,
  PemulaWordMeaning,
  SurahWordByWord,
  UlamaTafsirInsight,
  UlamaTafsirFullInsight,
  SurahChapterInfo,
  ReciterGroup,
  Reciter,
  ReciterSyncCapability,
  WordTimingSegment,
} from '@/services/quranService';

export type {
  OfflineSurahBundleStatus,
  OfflineReciterAudioStatus,
  OfflineAudioDownloadProgress,
  OfflineAudioDownloadResult,
  OfflineBundleDownloadProgress,
  OfflineQuranAutoStatus,
} from '@/services/quranOfflineService';

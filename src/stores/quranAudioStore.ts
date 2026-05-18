/**
 * Quran Audio Store
 * =================
 * Zustand store untuk reactive UI state player Quran.
 * Dibaca oleh QuranMiniPlayer di layout dan halaman surah.
 */

import { create } from 'zustand';

interface QuranAudioMeta {
  surahNumber: number;
  surahName: string;
  surahNameAr: string;
  reciterName: string;
  currentAyahIndex: number;
  totalAyahs: number;
}

interface QuranAudioState extends QuranAudioMeta {
  isActive: boolean;
  isPlaying: boolean;
  isPaused: boolean;
}

interface QuranAudioActions {
  /** Aktifkan mini player dengan metadata surah. */
  activate: (meta: QuranAudioMeta) => void;
  /** Update status playing/paused. */
  setPlayState: (isPlaying: boolean, isPaused: boolean) => void;
  /** Update posisi ayat saat ini. */
  setCurrentAyah: (index: number) => void;
  /** Nonaktifkan mini player. */
  deactivate: () => void;
}

export const useQuranAudioStore = create<QuranAudioState & QuranAudioActions>((set) => ({
  isActive: false,
  isPlaying: false,
  isPaused: false,
  surahNumber: 0,
  surahName: '',
  surahNameAr: '',
  reciterName: '',
  currentAyahIndex: 0,
  totalAyahs: 0,

  activate: (meta) => set({ isActive: true, isPlaying: true, isPaused: false, ...meta }),
  setPlayState: (isPlaying, isPaused) => set({ isPlaying, isPaused }),
  setCurrentAyah: (currentAyahIndex) => set({ currentAyahIndex }),
  deactivate: () => set({ isActive: false, isPlaying: false, isPaused: false }),
}));

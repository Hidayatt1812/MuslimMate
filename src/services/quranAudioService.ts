/**
 * Quran Audio Service
 * ===================
 * Module-level singleton yang menyimpan referensi AudioPlayer aktif.
 * Bertahan di luar siklus hidup komponen, memungkinkan audio terus
 * berjalan saat user navigasi keluar dari halaman surah.
 */

import type { AudioPlayer } from 'expo-audio';

let _player: AudioPlayer | null = null;

export const quranAudioService = {
  /** Simpan player ke service (biasanya saat clip baru dimulai). */
  attach(player: AudioPlayer): void {
    _player = player;
  },

  /** Lepas referensi dari service (tanpa menghentikan audio). */
  detach(): AudioPlayer | null {
    const p = _player;
    _player = null;
    return p;
  },

  /** Ambil player aktif tanpa mengubah state. */
  get(): AudioPlayer | null {
    return _player;
  },

  /** Hentikan dan hapus player sepenuhnya. */
  stop(): void {
    const p = _player;
    _player = null;
    if (p) {
      try { p.clearLockScreenControls(); } catch {}
      try { p.remove(); } catch {}
    }
  },
};

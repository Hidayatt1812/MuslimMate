/**
 * Quran Audio Service
 * ===================
 * Module-level singleton yang menyimpan referensi AudioPlayer aktif.
 * Bertahan di luar siklus hidup komponen, memungkinkan audio terus
 * berjalan saat user navigasi keluar dari halaman surah.
 */

import type { AudioPlayer } from 'expo-audio';

let _player: AudioPlayer | null = null;
const _players = new Set<AudioPlayer>();

const stopPlayer = (player: AudioPlayer | null | undefined): void => {
  if (!player) return;
  try { player.pause(); } catch {}
  try { player.clearLockScreenControls(); } catch {}
  try { player.remove(); } catch {}
};

export const quranAudioService = {
  /** Simpan player ke service (biasanya saat clip baru dimulai). */
  attach(player: AudioPlayer): void {
    _players.forEach(p => {
      if (p !== player) {
        stopPlayer(p);
        _players.delete(p);
      }
    });
    _player = player;
    _players.add(player);
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
    _players.forEach(player => stopPlayer(player));
    _players.clear();
    stopPlayer(p);
  },
};

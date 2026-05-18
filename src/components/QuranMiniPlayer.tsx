/**
 * Quran Mini Player
 * =================
 * Panel mini player yang muncul di bagian bawah layar saat surah sedang
 * diputar dan user keluar dari halaman surah. Hanya tampil dalam mode
 * surah penuh (bukan per-ayat).
 */

import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { setAudioModeAsync } from 'expo-audio';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { quranAudioService } from '@/services/quranAudioService';
import { useQuranAudioStore } from '@/stores/quranAudioStore';

export default function QuranMiniPlayer() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const { isActive, isPlaying, surahNumber, surahName, surahNameAr, reciterName,
    currentAyahIndex, totalAyahs, setPlayState, deactivate } = useQuranAudioStore();

  // Sembunyikan saat di halaman surah (sudah ada kontrol penuh di sana)
  const onSurahScreen = pathname?.startsWith('/quran/') &&
    !pathname?.startsWith('/quran/about');

  if (!isActive || onSurahScreen) return null;

  const handlePlayPause = () => {
    const player = quranAudioService.get();
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setPlayState(false, true);
    } else {
      player.play();
      setPlayState(true, false);
    }
  };

  const handleStop = async () => {
    quranAudioService.stop();
    deactivate();
    try { await setAudioModeAsync({ shouldPlayInBackground: false }); } catch {}
  };

  const handlePress = () => {
    router.push({ pathname: '/quran/[surahId]', params: { surahId: String(surahNumber) } });
  };

  const progressRatio = totalAyahs > 0 ? (currentAyahIndex + 1) / totalAyahs : 0;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: C.surface,
        borderTopColor: C.primary + '55',
        bottom: insets.bottom,
      },
    ]}>
      {/* Progress bar tipis di atas player */}
      <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
        <View style={[styles.progressFill, {
          backgroundColor: C.primary,
          width: `${Math.max(2, progressRatio * 100)}%` as any,
        }]} />
      </View>

      <Pressable style={styles.body} onPress={handlePress} android_ripple={{ color: C.primary + '22' }}>
        {/* Icon Quran */}
        <View style={[styles.iconWrap, { backgroundColor: C.primaryMuted }]}>
          <Ionicons name="book" size={20} color={C.primary} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.surahName, { color: C.text }]} numberOfLines={1}>
            {surahName}
            {surahNameAr ? <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}> · {surahNameAr}</Text> : null}
          </Text>
          <Text style={[styles.meta, { color: C.textSecondary }]} numberOfLines={1}>
            {reciterName} · {t('verse_label')} {currentAyahIndex + 1}/{totalAyahs}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={handlePlayPause}
            style={[styles.controlBtn, { backgroundColor: C.primary }]}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleStop}
            style={[styles.controlBtn, { backgroundColor: C.card, marginLeft: Spacing.xs }]}
            activeOpacity={0.75}
          >
            <Ionicons name="stop" size={18} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  surahName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  meta: {
    fontSize: FontSize.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

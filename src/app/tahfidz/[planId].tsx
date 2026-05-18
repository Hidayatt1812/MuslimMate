import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert, Animated,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SURAH_LIST } from '@/constants/surah';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import type { Lang } from '@/constants/i18n';
import { fetchSurah, getAudioUrl, getAyahAudioFallbackUrl, getIslamicNetworkAudioUrl, SurahWithTranslation } from '@/services/quranService';
import { getTahfidzPlans, saveTahfidzPlan, TahfidzPlan } from '@/services/storageService';

type Mode = 'read' | 'listen' | 'hide' | 'test';

const MODES: { id: Mode; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { id: 'read',   label: 'Baca',         icon: 'book-outline',          desc: 'Baca & hafal' },
  { id: 'listen', label: 'Loop Audio',   icon: 'musical-notes-outline', desc: 'Dengarkan berulang' },
  { id: 'hide',   label: 'Sembunyikan',  icon: 'eye-off-outline',       desc: 'Coba ingat' },
  { id: 'test',   label: 'Tes Hafalan',  icon: 'pencil-outline',        desc: 'Uji dirimu' },
];

const MODE_COPY: Record<Mode, Record<Lang, { label: string; desc: string }>> = {
  read: {
    id: { label: 'Baca', desc: 'Baca & hafal' },
    en: { label: 'Read', desc: 'Read & memorize' },
  },
  listen: {
    id: { label: 'Loop Audio', desc: 'Dengarkan berulang' },
    en: { label: 'Loop Audio', desc: 'Listen repeatedly' },
  },
  hide: {
    id: { label: 'Sembunyikan', desc: 'Coba ingat' },
    en: { label: 'Hide', desc: 'Try to recall' },
  },
  test: {
    id: { label: 'Tes Hafalan', desc: 'Uji dirimu' },
    en: { label: 'Memory Test', desc: 'Test yourself' },
  },
};

const TAHFIDZ_TEXT: Record<Lang, Record<string, string>> = {
  id: {
    loading: 'Memuat...',
    loadError: 'Gagal memuat data',
    completeTitle: 'Selamat!',
    completeBack: 'Kembali',
    completeDone: 'Kamu telah menyelesaikan semua',
    completeMarked: 'ayat sudah dihafal.',
    from: 'dari',
    memorized: 'Sudah Hafal',
    revealSuccess: 'Teks ayat berhasil ditampilkan',
    revealAyah: 'Tampilkan Ayat',
    rememberFirst: 'Coba ingat dulu sebelum melihat',
    tapToSee: 'Tap untuk lihat',
    memorizeWithoutText: 'Coba hafalkan dulu tanpa melihat teks',
    audioTitle: 'AUDIO MUROTTAL',
    repeat: 'Ulangan',
    playing: 'Memutar...',
    nowPlaying: 'Sedang memutar...',
    loopAuto: 'otomatis',
    playThisAyah: 'Putar murottal ayat ini',
    rateTitle: 'Seberapa hafal ayat ini?',
    keepPracticingTitle: 'Lanjutkan Berlatih',
    keepPracticingBody: 'Ayat ini belum ditandai hafal. Terus berlatih!',
    notYet: 'Belum Hafal',
    memorizedBang: 'Sudah Hafal!',
    previous: 'Sebelumnya',
    next: 'Selanjutnya',
    memorizedNext: 'Hafal & Lanjut',
    skip: 'Lewati',
  },
  en: {
    loading: 'Loading...',
    loadError: 'Failed to load data',
    completeTitle: 'Well done!',
    completeBack: 'Back',
    completeDone: 'You have completed all',
    completeMarked: 'ayahs have been memorized.',
    from: 'of',
    memorized: 'Memorized',
    revealSuccess: 'Ayah text is now visible',
    revealAyah: 'Show Ayah',
    rememberFirst: 'Try to recall it before looking',
    tapToSee: 'Tap to view',
    memorizeWithoutText: 'Try memorizing first without seeing the text',
    audioTitle: 'MUROTTAL AUDIO',
    repeat: 'Repeat',
    playing: 'Playing...',
    nowPlaying: 'Now playing...',
    loopAuto: 'automatic',
    playThisAyah: 'Play this ayah recitation',
    rateTitle: 'How well did you memorize this ayah?',
    keepPracticingTitle: 'Keep Practicing',
    keepPracticingBody: 'This ayah was not marked as memorized. Keep practicing!',
    notYet: 'Not Yet',
    memorizedBang: 'Memorized!',
    previous: 'Previous',
    next: 'Next',
    memorizedNext: 'Memorized & Next',
    skip: 'Skip',
  },
};

export default function TahfidzSessionScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, lang } = useTranslation();
  const copy = TAHFIDZ_TEXT[lang];

  const [plan, setPlan] = useState<TahfidzPlan | null>(null);
  const [surah, setSurah] = useState<SurahWithTranslation | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAyah, setCurrentAyah] = useState(0);
  const [mode, setMode] = useState<Mode>('read');
  const [showArabic, setShowArabic] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [maxLoops, setMaxLoops] = useState(3);
  const [audioProgress, setAudioProgress] = useState(0);
  // Test mode state
  const [testRevealed, setTestRevealed] = useState(false);

  const soundRef = useRef<AudioPlayer | null>(null);
  const loopCountRef = useRef(0);
  const maxLoopsRef = useRef(3);
  const modeRef = useRef<Mode>('read');
  const blinkAnim = useRef(new Animated.Value(1)).current;

  // Sync refs so listener closures always see current values
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { maxLoopsRef.current = maxLoops; }, [maxLoops]);

  useEffect(() => {
    loadData();
    return () => { soundRef.current?.remove(); };
  }, [planId, lang]);

  // Blinking animation for hide mode hint
  useEffect(() => {
    if (mode === 'hide' && !showArabic) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
    blinkAnim.setValue(1);
  }, [mode, showArabic]);

  const loadData = async () => {
    try {
      setLoading(true);
      const plans = await getTahfidzPlans();
      const p = plans.find(x => x.id === planId);
      if (!p) { router.back(); return; }
      setPlan(p);
      const data = await fetchSurah(p.surahNumber, undefined, lang);
      setSurah(data);
    } catch {
      Alert.alert('Error', copy.loadError);
    } finally {
      setLoading(false);
    }
  };

  const currentAyahData = surah?.arabic.ayahs[currentAyah];
  const currentTranslation = surah?.translation.ayahs[currentAyah];
  const totalAyahs = plan?.targetAyahs.length ?? 0;
  const memorizedCount = plan?.memorizedAyahs.length ?? 0;
  const isMemorized = plan?.memorizedAyahs.includes(currentAyahData?.numberInSurah ?? 0);

  const playAyahAudio = async () => {
    if (!plan || !currentAyahData) return;
    try {
      soundRef.current?.remove();
      loopCountRef.current = 0;
      setLoopCount(0);
      setAudioProgress(0);
      setIsPlaying(true);
      
      // Gunakan CDN Quran.com yang paling cepat & stabil (Cloudflare), fallback ke Islamic Network / everyayah
      const fallback = await getAyahAudioFallbackUrl(plan.surahNumber, currentAyahData.numberInSurah);
      const quranComUrl = fallback.url && !fallback.usedFallbackReciter ? fallback.url : null;
      const islamicUrl = getIslamicNetworkAudioUrl(plan.surahNumber, currentAyahData.numberInSurah);
      
      const url = quranComUrl || islamicUrl || getAudioUrl(plan.surahNumber, currentAyahData.numberInSurah);
      const sound = createAudioPlayer({ uri: url }, { updateInterval: 200 });
      soundRef.current = sound;
      sound.play();
      sound.addListener('playbackStatusUpdate', async status => {
        if (status.duration > 0) {
          setAudioProgress(Math.min(1, status.currentTime / status.duration));
        }
        if (status.didJustFinish) {
          const newCount = loopCountRef.current + 1;
          loopCountRef.current = newCount;
          setLoopCount(newCount);
          if (newCount < maxLoopsRef.current && modeRef.current === 'listen') {
            await sound.seekTo(0);
            sound.play();
          } else {
            setIsPlaying(false);
            loopCountRef.current = 0;
            setLoopCount(0);
            setAudioProgress(1);
            setTimeout(() => setAudioProgress(0), 600);
          }
        }
      });
    } catch {
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    soundRef.current?.remove();
    soundRef.current = null;
    setIsPlaying(false);
    loopCountRef.current = 0;
    setLoopCount(0);
    setAudioProgress(0);
  };

  const markMemorized = async () => {
    if (!plan || !currentAyahData) return;
    const ayahNum = currentAyahData.numberInSurah;
    if (!plan.memorizedAyahs.includes(ayahNum)) {
      const updated: TahfidzPlan = {
        ...plan,
        memorizedAyahs: [...plan.memorizedAyahs, ayahNum],
        lastStudied: new Date().toISOString(),
      };
      setPlan(updated);
      await saveTahfidzPlan(updated);
    }
    nextAyah();
  };

  const nextAyah = () => {
    stopAudio();
    setTestRevealed(false);
    if (currentAyah < totalAyahs - 1) {
      setCurrentAyah(i => i + 1);
      setShowArabic(mode !== 'hide' && mode !== 'test');
    } else {
      Alert.alert(
        copy.completeTitle,
        `${copy.completeDone} ${totalAyahs} ${t('verses_unit')} ${lang === 'en' ? 'in this session' : 'dalam sesi ini'}!\n\n${memorizedCount + 1} ${copy.completeMarked}`,
        [{ text: copy.completeBack, onPress: () => router.back() }]
      );
    }
  };

  const prevAyah = () => {
    stopAudio();
    setTestRevealed(false);
    if (currentAyah > 0) {
      setCurrentAyah(i => i - 1);
      setShowArabic(mode !== 'hide' && mode !== 'test');
    }
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    stopAudio();
    setTestRevealed(false);
    setShowArabic(m !== 'hide' && m !== 'test');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={{ color: C.textMuted, marginTop: 12 }}>{copy.loading}</Text>
      </SafeAreaView>
    );
  }

  const surahMeta = SURAH_LIST.find(s => s.number === plan?.surahNumber);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => { stopAudio(); router.back(); }} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>
            {surahMeta?.englishName ?? ''}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: FontSize.xs }}>
            {t('verse_label')} {currentAyah + 1} {copy.from} {totalAyahs}
          </Text>
        </View>
        <View style={[styles.progressBadge, { backgroundColor: C.primaryMuted }]}>
          <Ionicons name="checkmark-circle" size={14} color={C.primary} />
          <Text style={{ color: C.primary, fontWeight: '700', fontSize: FontSize.sm, marginLeft: 3 }}>
            {memorizedCount}/{totalAyahs}
          </Text>
        </View>
      </View>

      {/* Overall Progress Bar */}
      <ProgressBar progress={memorizedCount / Math.max(totalAyahs, 1)} height={3} />

      {/* Mode Selector */}
      <View style={[styles.modeSelector, { backgroundColor: C.card, borderColor: C.border }]}>
        {MODES.map(m => {
          const active = mode === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => handleModeChange(m.id)}
              style={[styles.modeTab, active && { backgroundColor: C.primary }]}
              activeOpacity={0.7}
            >
              <Ionicons name={m.icon} size={15} color={active ? '#fff' : C.textSecondary} />
              <Text
                style={{ color: active ? '#fff' : C.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2 }}
                numberOfLines={1}
              >
                {MODE_COPY[m.id][lang].label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Scroll */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>

        {/* Ayah Card */}
        <Card variant="elevated">
          {/* Ayah number row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <View style={[styles.ayahNumCircle, { backgroundColor: C.primaryMuted }]}>
              <Text style={{ color: C.primary, fontWeight: '800', fontSize: FontSize.sm }}>
                {currentAyahData?.numberInSurah}
              </Text>
            </View>
            {isMemorized && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark-circle" size={16} color={C.success} />
                <Text style={{ color: C.success, fontSize: FontSize.sm, fontWeight: '700' }}>{copy.memorized}</Text>
              </View>
            )}
          </View>

          {/* Arabic text — conditional per mode */}
          {mode === 'test' ? (
            // TEST MODE: show only translation, user reveals Arabic
            testRevealed ? (
              <>
                <Text style={arabicTextStyle(C.text)}>
                  {currentAyahData?.text}
                </Text>
                <View style={[styles.revealedBanner, { backgroundColor: `${C.success}18`, borderColor: `${C.success}40` }]}>
                  <Ionicons name="checkmark-circle" size={16} color={C.success} />
                  <Text style={{ color: C.success, fontSize: FontSize.sm, fontWeight: '600', marginLeft: 6 }}>
                    {copy.revealSuccess}
                  </Text>
                </View>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => setTestRevealed(true)}
                style={[styles.revealBtn, { backgroundColor: C.primaryMuted, borderColor: C.primary }]}
                activeOpacity={0.7}
              >
                <Ionicons name="eye-outline" size={24} color={C.primary} />
                <Text style={{ color: C.primary, fontSize: FontSize.md, fontWeight: '700', marginTop: 6 }}>
                  {copy.revealAyah}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                  {copy.rememberFirst}
                </Text>
              </TouchableOpacity>
            )
          ) : mode === 'hide' && !showArabic ? (
            // HIDE MODE: blinking tap hint
            <TouchableOpacity
              onPress={() => setShowArabic(true)}
              style={[styles.hiddenBox, { backgroundColor: C.surface, borderColor: C.border }]}
              activeOpacity={0.7}
            >
              <Animated.View style={{ alignItems: 'center', opacity: blinkAnim }}>
                <Ionicons name="eye-outline" size={28} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontSize: FontSize.md, fontWeight: '600', marginTop: 6 }}>
                  {copy.tapToSee}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                  {copy.memorizeWithoutText}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          ) : (
            // READ / LISTEN mode: always show
            <Text style={arabicTextStyle(C.text)}>
              {currentAyahData?.text}
            </Text>
          )}

          {/* Translation */}
          <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.md, lineHeight: 22 }}>
            {currentTranslation?.text}
          </Text>
        </Card>

        {/* Audio Card */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.8 }}>
              {copy.audioTitle}
            </Text>
            {isPlaying && mode === 'listen' && (
              <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '600' }}>
                {copy.repeat} {loopCount + 1} / {maxLoops}
              </Text>
            )}
          </View>

          {/* Progress bar for audio */}
          <ProgressBar
            progress={audioProgress}
            height={3}
            color={C.primary}
            style={{ marginBottom: Spacing.sm }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <TouchableOpacity
              onPress={isPlaying ? stopAudio : playAyahAudio}
              style={[styles.playBtn, { backgroundColor: isPlaying ? C.error : C.primary }]}
              activeOpacity={0.8}
            >
              <Ionicons name={isPlaying ? 'stop' : 'play'} size={22} color="#fff" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={{ color: isPlaying ? C.primary : C.text, fontSize: FontSize.sm, fontWeight: '600' }}>
                {isPlaying
                  ? mode === 'listen'
                    ? `${copy.playing} (${loopCount + 1}/${maxLoops})`
                    : copy.nowPlaying
                  : mode === 'listen'
                  ? `Loop ${maxLoops}x ${copy.loopAuto}`
                  : copy.playThisAyah
                }
              </Text>
            </View>

            {mode === 'listen' && (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[1, 3, 5, 10].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setMaxLoops(n)}
                    style={[
                      styles.loopBtn,
                      { backgroundColor: maxLoops === n ? C.primary : C.card, borderColor: maxLoops === n ? C.primary : C.border },
                    ]}
                  >
                    <Text style={{ color: maxLoops === n ? '#fff' : C.textSecondary, fontSize: FontSize.xs, fontWeight: '600' }}>
                      x{n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Card>

        {/* Test mode: rate yourself after reveal */}
        {mode === 'test' && testRevealed && (
          <Card>
            <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.sm, textAlign: 'center' }}>
              {copy.rateTitle}
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity
                onPress={() => {
                  setTestRevealed(false);
                  setShowArabic(false);
                  // Don't mark as memorized, just go back to try again
                  Alert.alert(
                    copy.keepPracticingTitle,
                    copy.keepPracticingBody,
                    [{ text: 'OK' }]
                  );
                }}
                style={[styles.rateBtn, { backgroundColor: `${C.error}15`, borderColor: `${C.error}50` }]}
              >
                <Ionicons name="refresh" size={18} color={C.error} />
                <Text style={{ color: C.error, fontSize: FontSize.sm, fontWeight: '700', marginTop: 4 }}>
                  {copy.notYet}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={markMemorized}
                style={[styles.rateBtn, { backgroundColor: `${C.success}15`, borderColor: `${C.success}50` }]}
              >
                <Ionicons name="checkmark-circle" size={18} color={C.success} />
                <Text style={{ color: C.success, fontSize: FontSize.sm, fontWeight: '700', marginTop: 4 }}>
                  {copy.memorizedBang}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Navigation */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TouchableOpacity
            onPress={prevAyah}
            disabled={currentAyah === 0}
            style={[
              styles.navBtn,
              {
                backgroundColor: C.card,
                borderColor: C.border,
                flex: 1,
                opacity: currentAyah === 0 ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={C.text} />
            <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>{copy.previous}</Text>
          </TouchableOpacity>

          {mode !== 'test' && (
            <TouchableOpacity
              onPress={markMemorized}
              style={[styles.navBtn, { backgroundColor: C.primary, flex: 2 }]}
            >
              <Ionicons name={isMemorized ? 'arrow-forward' : 'checkmark'} size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>
                {isMemorized ? copy.next : copy.memorizedNext}
              </Text>
            </TouchableOpacity>
          )}

          {mode === 'test' && !testRevealed && (
            <TouchableOpacity
              onPress={() => nextAyah()}
              style={[styles.navBtn, { backgroundColor: C.card, borderColor: C.border, flex: 2 }]}
            >
              <Ionicons name="arrow-forward" size={18} color={C.text} />
              <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>{copy.skip}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: Spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const arabicTextStyle = (color: string) => ({
  color,
  fontSize: 28,
  textAlign: 'right' as const,
  lineHeight: 58,
  fontFamily: 'serif' as const,
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 4,
    gap: 2,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  ayahNumCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenBox: {
    minHeight: 100,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  revealBtn: {
    minHeight: 110,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  revealedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  playBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loopBtn: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 32,
    alignItems: 'center',
  },
  rateBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: 2,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
});

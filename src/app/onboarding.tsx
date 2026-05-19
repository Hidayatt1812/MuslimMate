import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Lang } from '@/constants/i18n';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setOnboardingDone } from '@/services/storageService';
import { useLanguageStore } from '@/stores/languageStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type OnboardingSlide = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  body: string;
  chips: string[];
};

type OnboardingCopy = {
  languageTitle: string;
  languageBody: string;
  chooseLanguage: string;
  continue: string;
  skip: string;
  next: string;
  start: string;
  stepLabel: string;
  slides: OnboardingSlide[];
};

const COPY: Record<Lang, OnboardingCopy> = {
  id: {
    languageTitle: 'Selamat datang di MuslimMate',
    languageBody: 'Pilih bahasa yang ingin kamu pakai sebelum mengenal fitur utama aplikasi.',
    chooseLanguage: 'Pilih Bahasa',
    continue: 'Lanjut',
    skip: 'Lewati',
    next: 'Berikutnya',
    start: 'Mulai Pakai MuslimMate',
    stepLabel: 'Pengenalan fitur',
    slides: [
      {
        icon: 'book-outline',
        color: '#10B981',
        title: "Baca Al-Qur'an dengan nyaman",
        body: 'Gunakan mode normal, tajwid, dan belajar kata per kata. Terjemahan mengikuti bahasa aplikasi.',
        chips: ["Al-Qur'an", 'Tajwid', 'Bookmark'],
      },
      {
        icon: 'time-outline',
        color: '#3B82F6',
        title: 'Sholat, kiblat, dan jadwal harian',
        body: 'Pantau waktu sholat, arah kiblat, dan informasi ibadah harian dari satu tempat.',
        chips: ['Sholat', 'Kiblat', 'Jadwal'],
      },
      {
        icon: 'calendar-outline',
        color: '#F59E0B',
        title: 'Puasa dan kalender Hijriah',
        body: 'Catat puasa sunnah, lihat jadwal, dan gunakan pengingat agar rutinitas lebih terjaga.',
        chips: ['Puasa', 'Hijriah', 'Pengingat'],
      },
      {
        icon: 'stats-chart-outline',
        color: '#8B5CF6',
        title: 'Bangun kebiasaan ibadah',
        body: 'Gunakan tracker, statistik, tahfidz, dzikir, dan form support untuk menemani progresmu.',
        chips: ['Tracker', 'Tahfidz', 'Dzikir'],
      },
    ],
  },
  en: {
    languageTitle: 'Welcome to MuslimMate',
    languageBody: 'Choose your preferred language before exploring the main features.',
    chooseLanguage: 'Choose Language',
    continue: 'Continue',
    skip: 'Skip',
    next: 'Next',
    start: 'Start Using MuslimMate',
    stepLabel: 'Feature intro',
    slides: [
      {
        icon: 'book-outline',
        color: '#10B981',
        title: "Read the Qur'an comfortably",
        body: 'Use normal, tajweed, and beginner word-by-word modes. Translation follows your app language.',
        chips: ["Qur'an", 'Tajweed', 'Bookmarks'],
      },
      {
        icon: 'time-outline',
        color: '#3B82F6',
        title: 'Prayer, qibla, and daily schedule',
        body: 'Track prayer times, qibla direction, and daily worship information from one place.',
        chips: ['Prayer', 'Qibla', 'Schedule'],
      },
      {
        icon: 'calendar-outline',
        color: '#F59E0B',
        title: 'Fasting and Hijri calendar',
        body: 'Log sunnah fasting, view schedules, and use reminders to keep your routine steady.',
        chips: ['Fasting', 'Hijri', 'Reminders'],
      },
      {
        icon: 'stats-chart-outline',
        color: '#8B5CF6',
        title: 'Build worship habits',
        body: 'Use tracker, statistics, tahfidz, dhikr, and support form to accompany your progress.',
        chips: ['Tracker', 'Tahfidz', 'Dhikr'],
      },
    ],
  },
};

export default function OnboardingScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const lang = useLanguageStore(state => state.lang);
  const setLang = useLanguageStore(state => state.setLang);
  const copy = COPY[lang];
  const [languageConfirmed, setLanguageConfirmed] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const slideWidth = Math.max(280, SCREEN_WIDTH - Spacing.md * 2);
  const slideMinHeight = Math.max(320, Math.min(420, SCREEN_HEIGHT - 260));

  const finish = async () => {
    await setOnboardingDone(true);
    router.replace('/(tabs)');
  };

  const goNext = () => {
    if (slideIndex >= copy.slides.length - 1) {
      void finish();
      return;
    }
    const next = slideIndex + 1;
    setSlideIndex(next);
    scrollRef.current?.scrollTo({ x: next * slideWidth, animated: true });
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setSlideIndex(Math.min(Math.max(nextIndex, 0), copy.slides.length - 1));
  };

  if (!languageConfirmed) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
        <ScrollView contentContainerStyle={styles.languageShell} showsVerticalScrollIndicator={false}>
          <Image
            source={require('../../assets/logo/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: C.text }]}>{copy.languageTitle}</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>{copy.languageBody}</Text>

          <View style={styles.languageBlock}>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{copy.chooseLanguage}</Text>
            <View style={{ gap: Spacing.sm }}>
              {([
                { code: 'id' as Lang, title: 'Indonesia', body: 'Gunakan Bahasa Indonesia di seluruh aplikasi.' },
                { code: 'en' as Lang, title: 'English', body: 'Use English across the app experience.' },
              ]).map(option => {
                const active = lang === option.code;
                return (
                  <TouchableOpacity
                    key={option.code}
                    onPress={() => setLang(option.code)}
                    style={[
                      styles.languageCard,
                      {
                        backgroundColor: active ? `${C.primary}18` : C.card,
                        borderColor: active ? C.primary : C.border,
                      },
                    ]}
                    activeOpacity={0.82}
                  >
                    <View style={[styles.languageBadge, { backgroundColor: active ? C.primary : C.surface, borderColor: active ? C.primary : C.border }]}>
                      <Text style={{ color: active ? '#fff' : C.text, fontWeight: '900', fontSize: FontSize.sm }}>
                        {option.code.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '800' }}>{option.title}</Text>
                      <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2, lineHeight: 17 }}>
                        {option.body}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setLanguageConfirmed(true)}
            style={[styles.primaryButton, { backgroundColor: C.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{copy.continue}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{copy.stepLabel}</Text>
          <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '900' }}>
            {slideIndex + 1}/{copy.slides.length}
          </Text>
        </View>
        <TouchableOpacity onPress={finish} hitSlop={8}>
          <Text style={{ color: C.textMuted, fontSize: FontSize.sm, fontWeight: '700' }}>{copy.skip}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingHorizontal: Spacing.md }}
      >
        {copy.slides.map(slide => (
          <View key={slide.title} style={[styles.slide, { width: slideWidth }]}>
            <View style={[styles.featureCard, { backgroundColor: C.card, borderColor: C.border, minHeight: slideMinHeight }]}>
              <View style={[styles.featureGlow, { backgroundColor: `${slide.color}1F` }]}>
                <Ionicons name={slide.icon} size={54} color={slide.color} />
              </View>
              <Text style={[styles.slideTitle, { color: C.text }]}>{slide.title}</Text>
              <Text style={[styles.slideBody, { color: C.textSecondary }]}>{slide.body}</Text>
              <View style={styles.chipRow}>
                {slide.chips.map(chip => (
                  <View key={chip} style={[styles.chip, { backgroundColor: `${slide.color}18`, borderColor: `${slide.color}35` }]}>
                    <Text style={{ color: slide.color, fontSize: FontSize.xs, fontWeight: '800' }}>{chip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.dots}>
          {copy.slides.map((slide, index) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                {
                  backgroundColor: index === slideIndex ? C.primary : C.border,
                  width: index === slideIndex ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          onPress={goNext}
          style={[styles.primaryButton, styles.bottomButton, { backgroundColor: C.primary }]}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {slideIndex === copy.slides.length - 1 ? copy.start : copy.next}
          </Text>
          <Ionicons name={slideIndex === copy.slides.length - 1 ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  languageShell: {
    flexGrow: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 39,
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  languageBlock: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  languageCard: {
    minHeight: 76,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  topBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slide: {
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
  },
  featureCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  featureGlow: {
    width: 112,
    height: 112,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  slideTitle: {
    fontSize: FontSize.xxl,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
  },
  slideBody: {
    fontSize: FontSize.md,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  bottomBar: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomButton: {
    width: '100%',
  },
});

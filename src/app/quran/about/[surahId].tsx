import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { SURAH_LIST } from '@/constants/surah';
import {
  fetchSurah,
  fetchSurahChapterInfo,
  fetchUlamaTafsirFullByAyah,
  ULAMA_TAFSIR_SOURCE_LIST,
  type SurahWithTranslation,
  type SurahChapterInfo,
  type UlamaTafsirFullInsight,
} from '@/services/quranService';
import { getAsbabunNuzulBySurah, type AsbabunNuzulEntry } from '@/constants/asbabunNuzul';
import { getItem, setItem } from '@/services/storageService';

const PREVIEW_MAX = 700;
const ABOUT_FONT_SCALE_KEY = 'muslimmate_about_surah_font_scale';
const ARABIC_FONT_FAMILY = Platform.select({
  ios: 'Geeza Pro',
  android: 'Noto Naskh Arabic',
  web: "'Noto Naskh Arabic', 'Amiri', 'Scheherazade New', 'Traditional Arabic', serif",
  default: 'serif',
}) as string;

const excerpt = (text: string, maxLength = PREVIEW_MAX): string => {
  const clean = String(text ?? '').trim();
  if (!clean) return '';
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}...`;
};

const normalizeReferenceText = (text: string): string => {
  let out = String(text ?? '');
  out = out
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Gabungkan marker angka yang terpisah baris: "1.\nKeimanan:" -> "1. Keimanan:"
    .replace(/(\d+)\.\s*\n+\s*/g, '$1. ')
    // Paksa pindah baris sebelum poin baru: "... kalimat. 2. Judul: ..."
    .replace(/([.!?\u061F])\s*(\d+\.)\s*/g, '$1\n\n$2 ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s*:\s*/g, ': ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/(^|\n)-\s+/g, '$1• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Pastikan heading daftar bernomor tampil sebagai blok terpisah
  out = out.replace(/(?:^|\s)(\d+\.\s*[^\n:]{2,90}:)\s*/g, (_, heading: string) => `\n\n${heading}\n`);
  return out.replace(/\n{3,}/g, '\n\n').trim();
};

type NumberedReferenceSection = {
  number: string;
  title: string;
  body: string;
};

const parseNumberedReferenceSections = (text: string): NumberedReferenceSection[] => {
  const clean = normalizeReferenceText(text);
  if (!clean) return [];

  const normalizedList = clean.replace(/(\d+)\.\s*\n+\s*([^\n:]{2,90}:)/g, '$1. $2');
  const regex = /(?:^|\n)(\d+)\.\s*([^\n:]{2,90}?):\s*([\s\S]*?)(?=(?:\n\d+\.\s*[^\n:]{2,90}:\s*)|$)/g;
  const sections: NumberedReferenceSection[] = [];
  let match: RegExpExecArray | null = regex.exec(normalizedList);

  while (match) {
    const number = String(match[1] ?? '').trim();
    const title = String(match[2] ?? '').trim();
    const body = normalizeReferenceText(String(match[3] ?? '')).replace(/^\d+\.\s+/, '').trim();
    if (number && title) {
      sections.push({ number, title, body });
    }
    match = regex.exec(normalizedList);
  }

  // Minimal 2 poin agar benar-benar dianggap daftar terstruktur
  return sections.length >= 2 ? sections : [];
};

const splitReadableParagraphs = (text: string): string[] => {
  const clean = normalizeReferenceText(text);
  if (!clean) return [];

  const paragraphBlocks = clean
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean);
  const paragraphs = paragraphBlocks.flatMap(block =>
    block
      .split(/\n(?=•\s)/)
      .map(part => part.trim())
      .filter(Boolean)
  );
  const result: string[] = [];

  paragraphs.forEach(paragraph => {
    if (paragraph.length <= 430) {
      result.push(paragraph);
      return;
    }

    const sentences = paragraph
      .replace(/([.!?\u061F])\s+/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(Boolean);
    if (sentences.length <= 1) {
      result.push(paragraph);
      return;
    }

    let buffer = '';
    sentences.forEach(sentence => {
      const next = buffer ? `${buffer} ${sentence}` : sentence;
      if (next.length > 320) {
        if (buffer) result.push(buffer);
        buffer = sentence;
      } else {
        buffer = next;
      }
    });
    if (buffer) result.push(buffer);
  });

  return result;
};

export default function SurahAboutScreen() {
  const { surahId } = useLocalSearchParams<{ surahId: string }>();
  const routeNum = parseInt(surahId ?? '1', 10);
  const num = Number.isFinite(routeNum) && routeNum > 0 ? routeNum : 1;
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, lang } = useTranslation();

  const surahMeta = SURAH_LIST.find(s => s.number === num) ?? null;
  const asbabEntries = useMemo<AsbabunNuzulEntry[]>(() => getAsbabunNuzulBySurah(num), [num]);

  const ayahOptions = useMemo(() => {
    const values = new Set<number>();
    asbabEntries.forEach(entry => values.add(entry.ayah));
    if (values.size === 0) values.add(1);
    if (surahMeta?.ayahCount) {
      values.add(Math.max(1, Math.ceil(surahMeta.ayahCount / 2)));
      values.add(surahMeta.ayahCount);
    }
    return Array.from(values)
      .filter(n => n > 0 && (!surahMeta?.ayahCount || n <= surahMeta.ayahCount))
      .sort((a, b) => a - b)
      .slice(0, 8);
  }, [asbabEntries, surahMeta?.ayahCount]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aboutInfo, setAboutInfo] = useState<SurahChapterInfo | null>(null);
  const [surahData, setSurahData] = useState<SurahWithTranslation | null>(null);
  const [showLongSummary, setShowLongSummary] = useState(false);
  const [expandedAsbabKey, setExpandedAsbabKey] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState(1);

  const [selectedAyah, setSelectedAyah] = useState<number>(1);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirError, setTafsirError] = useState<string | null>(null);
  const [tafsirItems, setTafsirItems] = useState<Record<number, UlamaTafsirFullInsight | null>>({});
  const [tafsirExpandedSourceId, setTafsirExpandedSourceId] = useState<number | null>(
    ULAMA_TAFSIR_SOURCE_LIST[0]?.id ?? null
  );
  const [showOriginalTafsir, setShowOriginalTafsir] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await getItem<number>(ABOUT_FONT_SCALE_KEY);
      if (!active || typeof saved !== 'number' || !Number.isFinite(saved)) return;
      const normalized = Math.max(0.85, Math.min(1.8, Number(saved.toFixed(2))));
      setFontScale(normalized);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void setItem(ABOUT_FONT_SCALE_KEY, fontScale);
  }, [fontScale]);

  useEffect(() => {
    setSelectedAyah(prev => (ayahOptions.includes(prev) ? prev : (ayahOptions[0] ?? 1)));
  }, [ayahOptions]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [infoRes, surahRes] = await Promise.allSettled([
        fetchSurahChapterInfo(num, lang),
        fetchSurah(num, 'uthmani', lang),
      ]);

    const fallbackInfo: SurahChapterInfo = {
      surahNumber: num,
      language: lang,
      shortText: surahMeta
          ? (lang === 'en'
            ? `Surah ${surahMeta.englishName} is a ${surahMeta.type} surah with ${surahMeta.ayahCount} verses.`
            : `Surah ${surahMeta.indonesianName} adalah surah ${surahMeta.type} dengan ${surahMeta.ayahCount} ayat.`)
          : (lang === 'en' ? `Surah ${num} in the Qur'an.` : `Surah ${num} dalam Al-Qur'an.`),
        longText: surahMeta
          ? (lang === 'en'
            ? `This surah is ${surahMeta.type}, contains ${surahMeta.ayahCount} verses, and is in juz ${surahMeta.juz}. For more detail, open the official source from the reference button.`
            : `Surah ini termasuk ${surahMeta.type}, terdiri dari ${surahMeta.ayahCount} ayat, dan berada di juz ${surahMeta.juz}. Untuk pembahasan lebih lengkap, buka sumber resmi pada tombol referensi.`)
          : (lang === 'en' ? 'For more detail, open the official source from the reference button.' : 'Untuk pembahasan lebih lengkap, buka sumber resmi pada tombol referensi.'),
        source: lang === 'en' ? 'Surah metadata summary' : 'Ringkasan metadata surah',
        sourceUrl: `https://quran.com/${num}?tab=info`,
      };

      if (infoRes.status === 'fulfilled') {
        setAboutInfo(infoRes.value);
      } else {
        setAboutInfo(fallbackInfo);
      }

      if (surahRes.status === 'fulfilled') {
        setSurahData(surahRes.value);
      } else {
        setSurahData(null);
      }

      if (infoRes.status === 'rejected' && surahRes.status === 'rejected') {
        throw new Error(t('failed_load_about'));
      }
    } catch (e: any) {
      setError(e?.message ?? t('failed_load_about'));
    } finally {
      setLoading(false);
    }
  }, [num, surahMeta, lang, t]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    let active = true;
    (async () => {
      setTafsirLoading(true);
      setTafsirError(null);
      try {
        const settled = await Promise.allSettled(
          ULAMA_TAFSIR_SOURCE_LIST.map(source =>
            fetchUlamaTafsirFullByAyah(num, selectedAyah, source.id)
          )
        );
        if (!active) return;
        const next: Record<number, UlamaTafsirFullInsight | null> = {};
        settled.forEach((result, idx) => {
          const sourceId = ULAMA_TAFSIR_SOURCE_LIST[idx]?.id;
          if (!sourceId) return;
          if (result.status === 'fulfilled') {
            next[sourceId] = result.value;
          } else {
            next[sourceId] = null;
          }
        });
        setTafsirItems(next);
        const hasAny = Object.values(next).some(Boolean);
        if (!hasAny) {
          setTafsirError(t('tafsir_not_available_error'));
        }
      } catch {
        if (!active) return;
        setTafsirItems({});
        setTafsirError(t('failed_load_tafsir'));
      } finally {
        if (active) setTafsirLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [num, selectedAyah, t]);

  const selectedArabicAyah = useMemo(
    () => surahData?.arabic.ayahs.find(a => a.numberInSurah === selectedAyah) ?? null,
    [surahData, selectedAyah]
  );
  const selectedTranslationAyah = useMemo(
    () => surahData?.translation.ayahs.find(a => a.numberInSurah === selectedAyah) ?? null,
    [surahData, selectedAyah]
  );
  const surahTitle = surahMeta
    ? (lang === 'en' ? surahMeta.englishName : `Surah ${surahMeta.indonesianName}`)
    : `Surah ${num}`;
  const versesUnit = lang === 'en' ? 'verses' : 'ayat';

  const openReference = useCallback(async (url: string) => {
    const target = String(url ?? '').trim();
    if (!target) return;
    try {
      const canOpen = await Linking.canOpenURL(target);
      if (!canOpen) {
        Alert.alert(t('open_link_failed_title'), t('open_link_failed_message'));
        return;
      }
      await Linking.openURL(target);
    } catch {
      Alert.alert(t('open_link_failed_title'), t('open_link_failed_message'));
    }
  }, [t]);

  const referenceBaseText = useMemo(
    () => normalizeReferenceText(String(aboutInfo?.longText ?? aboutInfo?.shortText ?? '')),
    [aboutInfo?.longText, aboutInfo?.shortText]
  );
  // Parse sections selalu dari full text agar deteksi konsisten
  const allSections = useMemo(() => parseNumberedReferenceSections(referenceBaseText), [referenceBaseText]);
  const hasStructuredSections = allSections.length >= 2;

  // Intro = teks sebelum section pertama (atau full text jika tidak ada sections)
  const introText = useMemo(() => {
    if (!hasStructuredSections) return referenceBaseText;
    const firstMatch = referenceBaseText.search(/\n\d+\.\s*[^\n:]{2,90}:/);
    return firstMatch > 0 ? referenceBaseText.slice(0, firstMatch).trim() : referenceBaseText;
  }, [referenceBaseText, hasStructuredSections]);

  // Short: tampilkan intro saja (excerpt). Long: tampilkan intro + semua sections.
  const introParagraphs = useMemo(
    () => splitReadableParagraphs(showLongSummary ? introText : excerpt(introText || referenceBaseText, PREVIEW_MAX)),
    [introText, referenceBaseText, showLongSummary]
  );
  const visibleSections = showLongSummary ? allSections : [];
  // Backward compat aliases (tidak dipakai lagi tapi hindari refactor besar)
  const summarySections = visibleSections;
  const summaryParagraphs = introParagraphs;
  const tafsirList = useMemo(
    () => ULAMA_TAFSIR_SOURCE_LIST.map(source => ({ source, item: tafsirItems[source.id] ?? null })),
    [tafsirItems]
  );
  const scale = useCallback(
    (value: number, min = 10, max = 42) => {
      const scaled = Math.round(value * fontScale);
      return Math.max(min, Math.min(max, scaled));
    },
    [fontScale]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
        >
          <Ionicons name="arrow-back" size={18} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={{ color: C.text, fontSize: scale(FontSize.lg, 14, 34), fontWeight: '800' }} numberOfLines={1}>
            {t('about_screen_title')}
          </Text>
          <Text
            style={{ color: C.textSecondary, fontSize: scale(FontSize.xs, 11, 20), lineHeight: scale(16, 14, 26) }}
            numberOfLines={1}
          >
            {surahTitle}
          </Text>
        </View>
        <View style={styles.zoomRow}>
          <TouchableOpacity
            onPress={() => setFontScale(v => Math.max(0.85, Number((v - 0.1).toFixed(2))))}
            style={[styles.zoomBtn, { borderColor: C.border, backgroundColor: C.card }]}
          >
            <Ionicons name="remove" size={14} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={{ color: C.textMuted, fontSize: scale(10, 10, 18), minWidth: 42, textAlign: 'center' }}>
            {Math.round(fontScale * 100)}%
          </Text>
          <TouchableOpacity
            onPress={() => setFontScale(v => Math.min(1.8, Number((v + 0.1).toFixed(2))))}
            style={[styles.zoomBtn, { borderColor: C.border, backgroundColor: C.card }]}
          >
            <Ionicons name="add" size={14} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !aboutInfo && !surahData ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.textMuted, marginTop: 10, fontSize: scale(12, 11, 22), lineHeight: scale(20, 16, 34) }}>
            {t('about_loading')}
          </Text>
        </View>
      ) : error && !aboutInfo ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={42} color={C.error} />
          <Text style={{ color: C.error, marginTop: 10, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={loadPage} style={[styles.retryBtn, { backgroundColor: C.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 36, gap: Spacing.md }}
        >
          <View style={[styles.metaCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={{ color: C.text, fontSize: scale(FontSize.lg, 14, 34), fontWeight: '800' }}>
              {surahTitle}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: scale(FontSize.sm, 12, 24), marginTop: 2 }}>
              {surahMeta?.type ?? '-'} - {surahMeta?.ayahCount ?? '-'} {versesUnit}
            </Text>
            <Text style={{ color: C.textMuted, fontSize: scale(11, 10, 20), marginTop: 8, lineHeight: scale(18, 14, 30) }}>
              {t('about_reference_note')}
            </Text>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book-outline" size={15} color={C.primary} />
              <Text style={{ color: C.text, fontSize: scale(FontSize.md, 13, 28), fontWeight: '800', marginLeft: 8 }}>
                {t('about_reference_title')}
              </Text>
            </View>

            {/* Intro paragraf — selalu tampil (pendek di short mode, full di long mode) */}
            {!!introParagraphs.length && (
              <View style={{ marginTop: Spacing.sm, gap: 8 }}>
                {introParagraphs.map((paragraph, idx) => (
                  <Text
                    key={`intro-${idx}`}
                    style={{
                      color: C.textSecondary,
                      fontSize: scale(FontSize.sm, 12, 24),
                      lineHeight: scale(24, 18, 38),
                      textAlign: 'left',
                    }}
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            )}

            {/* Section cards — hanya tampil di long mode */}
            {!!visibleSections.length && (
              <View style={{ marginTop: Spacing.md, gap: 10 }}>
                {visibleSections.map(section => {
                  const bodyParagraphs = splitReadableParagraphs(section.body);
                  return (
                    <View
                      key={`summary-sec-${section.number}-${section.title}`}
                      style={{
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: C.border,
                        borderRadius: BorderRadius.md,
                        backgroundColor: C.card,
                        paddingHorizontal: Spacing.sm,
                        paddingVertical: 8,
                        gap: 6,
                      }}
                    >
                      <Text style={{ color: C.text, fontSize: scale(12, 11, 24), fontWeight: '800' }}>
                        {section.number}. {section.title}
                      </Text>
                      {bodyParagraphs.map((paragraph, idx) => (
                        <Text
                          key={`summary-sec-${section.number}-p-${idx}`}
                          style={{
                            color: C.textSecondary,
                            fontSize: scale(FontSize.sm, 12, 24),
                            lineHeight: scale(24, 18, 38),
                            textAlign: 'left',
                          }}
                        >
                          {paragraph}
                        </Text>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}

            {!introParagraphs.length && !visibleSections.length && (
              <Text
                style={{
                  color: C.textMuted,
                  fontSize: scale(11, 10, 20),
                  lineHeight: scale(19, 14, 32),
                  textAlign: 'left',
                }}
              >
                {t('about_unavailable')}
              </Text>
            )}

            {referenceBaseText.length > PREVIEW_MAX && (
              <TouchableOpacity
                onPress={() => setShowLongSummary(v => !v)}
                style={[styles.textToggleBtn, { borderColor: C.border, backgroundColor: C.card }]}
              >
                <Ionicons name={showLongSummary ? 'chevron-up' : 'chevron-down'} size={13} color={C.primary} />
                <Text style={{ color: C.primary, fontSize: scale(11, 10, 20), fontWeight: '700', marginLeft: 6 }}>
                  {showLongSummary ? t('collapse_text') : t('read_full_discussion')}
                </Text>
              </TouchableOpacity>
            )}

            <View style={[styles.sourceRow, { borderColor: C.border }]}>
              <Ionicons name="library-outline" size={12} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: scale(10, 10, 18), marginLeft: 6, flex: 1 }}>
                {t('source_label')}: {aboutInfo?.source ?? 'Quran.com Chapter Info'}
              </Text>
              <TouchableOpacity onPress={() => openReference(aboutInfo?.sourceUrl ?? `https://quran.com/${num}?tab=info`)}>
                <Text style={{ color: C.primary, fontSize: scale(10, 10, 18), fontWeight: '700' }}>{t('open')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school-outline" size={15} color={C.primary} />
              <Text style={{ color: C.text, fontSize: scale(FontSize.md, 13, 28), fontWeight: '800', marginLeft: 8 }}>
                {t('tafsir_section_title')}
              </Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: scale(11, 10, 20), lineHeight: scale(18, 14, 30) }}>
              {t('tafsir_section_desc')}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {ayahOptions.map(ayah => (
                <TouchableOpacity
                  key={`ayah-option-${ayah}`}
                  onPress={() => setSelectedAyah(ayah)}
                  style={[
                    styles.ayahChip,
                    {
                      backgroundColor: selectedAyah === ayah ? C.primaryMuted : C.card,
                      borderColor: selectedAyah === ayah ? C.primary : C.border,
                    },
                  ]}
                >
                  <Text style={{ color: selectedAyah === ayah ? C.primary : C.textSecondary, fontSize: scale(11, 10, 20), fontWeight: '700' }}>
                    {t('verse_label')} {ayah}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedArabicAyah && (
              <View style={[styles.ayahPreview, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={styles.ayahPreviewLabel}>QS. {num}:{selectedAyah}</Text>
                <Text
                  style={[
                    styles.ayahArabic,
                    {
                      color: C.text,
                      fontSize: scale(28, 18, 48),
                      lineHeight: scale(54, 32, 84),
                    },
                  ]}
                >
                  {selectedArabicAyah.text}
                </Text>
                {!!selectedTranslationAyah?.text && (
                  <View>
                    <Text style={{ color: C.textMuted, fontSize: scale(10, 10, 18), fontWeight: '700', marginBottom: 4 }}>
                      {t('translation_current')}:
                    </Text>
                    <Text style={{ color: C.textSecondary, fontSize: scale(FontSize.sm, 12, 24), lineHeight: scale(21, 17, 36) }}>
                      {selectedTranslationAyah.text}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {tafsirLoading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={{ color: C.textMuted, fontSize: 11 }}>{t('loading_tafsir_views')}</Text>
              </View>
            )}

            {!tafsirLoading && !!tafsirError && (
              <Text style={{ color: C.error, fontSize: scale(11, 10, 20), marginTop: 8, lineHeight: scale(18, 14, 30) }}>{tafsirError}</Text>
            )}

            {!tafsirLoading && !tafsirError && tafsirList.every(row => !row.item) && (
              <Text style={{ color: C.textMuted, fontSize: scale(11, 10, 20), marginTop: 8, lineHeight: scale(18, 14, 30) }}>
                {t('tafsir_unavailable')}
              </Text>
            )}

            <View style={{ marginTop: 10, gap: 8 }}>
              {tafsirList.map(({ source, item }) => {
                const expanded = tafsirExpandedSourceId === source.id;
                const useOriginal = !!showOriginalTafsir[source.id];
                const displayText = useOriginal
                  ? splitReadableParagraphs(item?.textOriginal ?? '')
                  : splitReadableParagraphs(lang === 'en' ? (item?.textEnglish || item?.textOriginal || '') : (item?.textIndonesian ?? ''));
                return (
                  <View
                    key={`tafsir-${source.id}`}
                    style={[styles.tafsirCard, { backgroundColor: C.card, borderColor: C.border }]}
                  >
                    <TouchableOpacity
                      onPress={() => setTafsirExpandedSourceId(prev => (prev === source.id ? null : source.id))}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Text style={{ color: C.text, fontSize: scale(12, 11, 24), fontWeight: '800', flex: 1 }}>
                        {source.name}
                      </Text>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.textMuted} />
                    </TouchableOpacity>

                    {expanded && (
                      <View style={{ marginTop: 6 }}>
                        {!item ? (
                          <Text style={{ color: C.textMuted, fontSize: scale(11, 10, 20), lineHeight: scale(18, 14, 30) }}>
                            {tafsirLoading
                              ? t('tafsir_loading_full')
                              : t('tafsir_source_unavailable')}
                          </Text>
                        ) : (
                          <>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                              <TouchableOpacity
                                onPress={() => setShowOriginalTafsir(prev => ({ ...prev, [source.id]: false }))}
                                style={[
                                  styles.modePill,
                                  {
                                    borderColor: !useOriginal ? C.primary : C.border,
                                    backgroundColor: !useOriginal ? C.primaryMuted : C.surface,
                                  },
                                ]}
                              >
                                <Text style={{ color: !useOriginal ? C.primary : C.textSecondary, fontSize: scale(10, 10, 18), fontWeight: '700' }}>
                                  {t('translation_current')}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => setShowOriginalTafsir(prev => ({ ...prev, [source.id]: true }))}
                                style={[
                                  styles.modePill,
                                  {
                                    borderColor: useOriginal ? C.primary : C.border,
                                    backgroundColor: useOriginal ? C.primaryMuted : C.surface,
                                  },
                                ]}
                              >
                                <Text style={{ color: useOriginal ? C.primary : C.textSecondary, fontSize: scale(10, 10, 18), fontWeight: '700' }}>
                                  {t('text_original')}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {displayText.map((paragraph, idx) => (
                              <Text
                                key={`${source.id}-p-${idx}`}
                                style={{ color: C.textSecondary, fontSize: scale(12, 11, 24), lineHeight: scale(20, 16, 34), marginBottom: 6 }}
                              >
                                {paragraph}
                              </Text>
                            ))}
                          </>
                        )}

                        <TouchableOpacity
                          onPress={() => openReference(item?.sourceUrl ?? `https://quran.com/${num}:${selectedAyah}?tafsir=${source.id}`)}
                          style={{ marginTop: 6 }}
                        >
                          <Text style={{ color: C.primary, fontSize: scale(10, 10, 18), fontWeight: '700' }}>
                            {t('open_tafsir_source')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="journal-outline" size={15} color={C.primary} />
              <Text style={{ color: C.text, fontSize: scale(FontSize.md, 13, 28), fontWeight: '800', marginLeft: 8 }}>
                {t('asbab_section_title')}
              </Text>
            </View>

            {asbabEntries.length === 0 ? (
              <Text style={{ color: C.textMuted, fontSize: scale(11, 10, 20), lineHeight: scale(18, 14, 30) }}>
                {t('asbab_about_empty_desc')}
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {asbabEntries.map(entry => {
                  const key = `${entry.surah}:${entry.ayah}`;
                  const expanded = expandedAsbabKey === key;
                  return (
                    <View key={key} style={[styles.asbabCard, { backgroundColor: C.card, borderColor: C.border }]}>
                      <TouchableOpacity
                        onPress={() => setExpandedAsbabKey(prev => (prev === key ? null : key))}
                        style={styles.asbabHeader}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text, fontSize: scale(12, 11, 24), fontWeight: '800' }}>{entry.title}</Text>
                          <Text style={{ color: C.textMuted, fontSize: scale(10, 10, 18), marginTop: 2 }}>
                            {t('verse_label')} {entry.ayah}{entry.ayahEnd ? `-${entry.ayahEnd}` : ''}
                          </Text>
                        </View>
                        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.textMuted} />
                      </TouchableOpacity>

                      {expanded && (
                        <View style={{ marginTop: 8, gap: 8 }}>
                          <Text style={{ color: C.textSecondary, fontSize: scale(11, 10, 20), lineHeight: scale(19, 15, 32) }}>{entry.context}</Text>
                          <Text style={{ color: C.textSecondary, fontSize: scale(11, 10, 20), lineHeight: scale(19, 15, 32), fontStyle: 'italic' }}>
                            {entry.hadith}
                          </Text>
                          <View style={[styles.sourceRow, { borderColor: C.border }]}>
                            <Ionicons name="library-outline" size={12} color={C.textMuted} />
                            <Text style={{ color: C.textMuted, fontSize: scale(10, 10, 18), marginLeft: 6, flex: 1 }}>{entry.source}</Text>
                          </View>
                          {!!entry.referenceLinks?.length && (
                            <View style={{ gap: 6 }}>
                              {entry.referenceLinks.map((link, idx) => (
                                <TouchableOpacity
                                  key={`${key}-ref-${idx}`}
                                  onPress={() => openReference(link)}
                                  style={[styles.refBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                                >
                                  <Ionicons name="open-outline" size={11} color={C.primary} />
                                  <Text style={{ color: C.primary, fontSize: scale(10, 10, 18), fontWeight: '700', marginLeft: 5 }}>
                                    {t('reference_hadith')} #{idx + 1}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => setSelectedAyah(entry.ayah)}
                            style={[styles.jumpBtn, { borderColor: C.primary, backgroundColor: `${C.primary}12` }]}
                          >
                            <Ionicons name="school-outline" size={12} color={C.primary} />
                            <Text style={{ color: C.primary, fontSize: scale(10, 10, 18), fontWeight: '700', marginLeft: 5 }}>
                              {t('view_ayah_tafsir')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  textToggleBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sourceRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  ayahChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ayahPreview: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: 8,
  },
  ayahPreviewLabel: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 5,
  },
  ayahArabic: {
    fontSize: 28,
    lineHeight: 54,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: ARABIC_FONT_FAMILY,
    marginBottom: 8,
  },
  tafsirCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  modePill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  asbabCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  asbabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  jumpBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
});



import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { fetchQFVersesByKeys } from '@/services/quranFoundationService';
import { useTranslation } from '@/hooks/useTranslation';
import type { Lang } from '@/constants/i18n';

// ── Mood categories dengan curated verse keys ──────────────────────────────

const MOODS = [
  {
    id: 'grateful',
    emoji: '🤲',
    label: 'Bersyukur',
    color: '#10B981',
    desc: 'Ingin mengungkapkan rasa syukur',
    verses: ['14:7', '2:152', '16:18', '55:13', '31:12'],
  },
  {
    id: 'anxious',
    emoji: '😰',
    label: 'Cemas & Gelisah',
    color: '#6366F1',
    desc: 'Hati resah, mencari ketenangan',
    verses: ['13:28', '2:286', '94:5', '94:6', '3:173'],
  },
  {
    id: 'sad',
    emoji: '😢',
    label: 'Sedih & Berduka',
    color: '#3B82F6',
    desc: 'Merasa sedih dan butuh penghibur',
    verses: ['2:286', '65:3', '94:5', '39:53', '12:87'],
  },
  {
    id: 'hopeful',
    emoji: '🌟',
    label: 'Penuh Harapan',
    color: '#F59E0B',
    desc: 'Membangun semangat dan harapan',
    verses: ['39:53', '65:3', '2:216', '94:5', '3:139'],
  },
  {
    id: 'guidance',
    emoji: '🧭',
    label: 'Mencari Petunjuk',
    color: '#8B5CF6',
    desc: 'Butuh arah dan bimbingan hidup',
    verses: ['1:6', '1:7', '2:2', '17:9', '10:57'],
  },
  {
    id: 'strength',
    emoji: '💪',
    label: 'Butuh Kekuatan',
    color: '#EF4444',
    desc: 'Menghadapi ujian dan kesulitan',
    verses: ['2:153', '3:200', '94:5', '94:6', '2:286'],
  },
  {
    id: 'forgiveness',
    emoji: '🌿',
    label: 'Mohon Ampunan',
    color: '#059669',
    desc: 'Bertaubat dan memohon ampun',
    verses: ['39:53', '3:135', '4:106', '2:222', '66:8'],
  },
  {
    id: 'love',
    emoji: '❤️',
    label: 'Cinta & Kasih Sayang',
    color: '#EC4899',
    desc: 'Merenungi cinta Allah dan sesama',
    verses: ['3:31', '2:165', '49:10', '30:21', '3:134'],
  },
] as const;

type Mood = typeof MOODS[number];
type MoodId = Mood['id'];
type QFVerse = { verseKey: string; arabic: string; translation: string };

const MOOD_TEXT: Record<MoodId, Record<Lang, { label: string; desc: string }>> = {
  grateful: {
    id: { label: 'Bersyukur', desc: 'Ingin mengungkapkan rasa syukur' },
    en: { label: 'Grateful', desc: 'Want to express gratitude' },
  },
  anxious: {
    id: { label: 'Cemas & Gelisah', desc: 'Hati resah, mencari ketenangan' },
    en: { label: 'Anxious & Restless', desc: 'A restless heart seeking calm' },
  },
  sad: {
    id: { label: 'Sedih & Berduka', desc: 'Merasa sedih dan butuh penghibur' },
    en: { label: 'Sad & Grieving', desc: 'Feeling sad and needing comfort' },
  },
  hopeful: {
    id: { label: 'Penuh Harapan', desc: 'Membangun semangat dan harapan' },
    en: { label: 'Hopeful', desc: 'Rebuilding hope and motivation' },
  },
  guidance: {
    id: { label: 'Mencari Petunjuk', desc: 'Butuh arah dan bimbingan hidup' },
    en: { label: 'Seeking Guidance', desc: 'Need direction and guidance in life' },
  },
  strength: {
    id: { label: 'Butuh Kekuatan', desc: 'Menghadapi ujian dan kesulitan' },
    en: { label: 'Need Strength', desc: 'Facing trials and hardship' },
  },
  forgiveness: {
    id: { label: 'Mohon Ampunan', desc: 'Bertaubat dan memohon ampun' },
    en: { label: 'Seeking Forgiveness', desc: 'Repenting and asking forgiveness' },
  },
  love: {
    id: { label: 'Cinta & Kasih Sayang', desc: 'Merenungi cinta Allah dan sesama' },
    en: { label: 'Love & Mercy', desc: "Reflecting on Allah's love and compassion" },
  },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function QuranFinderScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, lang } = useTranslation();
  const [selected, setSelected] = useState<Mood | null>(null);
  const [verses, setVerses] = useState<QFVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectMood = async (mood: Mood) => {
    setSelected(mood);
    setVerses([]);
    setError('');
    setLoading(true);
    try {
      const result = await fetchQFVersesByKeys([...mood.verses], lang);
      setVerses(result);
    } catch {
      setError(t('finder_load_error'));
    } finally {
      setLoading(false);
    }
  };

  const openSurah = (verseKey: string) => {
    const [surahId] = verseKey.split(':');
    router.push(`/quran/${surahId}` as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700' }}>Quran Finder</Text>
          <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{t('quran_finder_subtitle')}</Text>
        </View>
        <View style={[styles.qfBadge, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
          <Text style={{ color: '#10B981', fontSize: 9, fontWeight: '700' }}>QF API</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Mood Grid */}
        <View style={styles.moodGrid}>
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('quran_finder_prompt')}</Text>
          <View style={styles.grid}>
            {MOODS.map(mood => {
              const isActive = selected?.id === mood.id;
              const copy = MOOD_TEXT[mood.id][lang];
              return (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodCard,
                    {
                      backgroundColor: isActive ? `${mood.color}20` : C.card,
                      borderColor: isActive ? mood.color : C.border,
                      borderWidth: isActive ? 2 : 1,
                    },
                  ]}
                  onPress={() => selectMood(mood)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: isActive ? mood.color : C.text }]}>
                    {copy.label}
                  </Text>
                  <Text style={[styles.moodDesc, { color: C.textMuted }]} numberOfLines={2}>
                    {copy.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Results */}
        {selected && (
          <View style={{ paddingHorizontal: Spacing.md }}>
            <View style={[styles.resultHeader, { borderBottomColor: C.border }]}>
              <Text style={{ color: selected.color, fontSize: 20 }}>{selected.emoji}</Text>
              <Text style={[styles.resultTitle, { color: C.text }]}>
                {t('verses_for')}: {MOOD_TEXT[selected.id][lang].label}
              </Text>
            </View>

            {loading ? (
              <Card style={{ alignItems: 'center', paddingVertical: Spacing.xxl }}>
                <ActivityIndicator color={C.primary} size="large" />
                <Text style={{ color: C.textMuted, marginTop: 12, fontSize: FontSize.sm }}>
                  {t('loading_qf_verses')}
                </Text>
              </Card>
            ) : error ? (
              <Card style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
                <Ionicons name="cloud-offline-outline" size={36} color={C.textMuted} />
                <Text style={{ color: C.error, marginTop: 8, textAlign: 'center', fontSize: FontSize.sm }}>
                  {error}
                </Text>
              </Card>
            ) : (
              <View style={{ gap: Spacing.md }}>
                {verses.map((v) => (
                  <Card key={v.verseKey} style={{ gap: Spacing.sm }}>
                    {/* Verse key badge */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={[styles.verseKeyBadge, { backgroundColor: `${selected.color}20` }]}>
                        <Text style={{ color: selected.color, fontSize: FontSize.xs, fontWeight: '700' }}>
                          QS {v.verseKey}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => openSurah(v.verseKey)}
                        style={[styles.openBtn, { borderColor: C.border }]}
                        hitSlop={8}
                      >
                        <Ionicons name="book-outline" size={14} color={C.textSecondary} />
                        <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginLeft: 4 }}>
                          {t('open')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Arabic */}
                    <Text style={[styles.arabicText, { color: C.text }]}>
                      {v.arabic}
                    </Text>

                    {/* Translation */}
                    {v.translation ? (
                      <Text style={[styles.translationText, { color: C.textSecondary }]}>
                        {v.translation}
                      </Text>
                    ) : null}
                  </Card>
                ))}

                {/* Attribution */}
                <View style={[styles.attribution, { borderColor: C.border }]}>
                  <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginLeft: 4 }}>
                    {t('qf_attribution')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  qfBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  moodGrid: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  moodCard: {
    width: '47.5%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  moodDesc: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    flex: 1,
  },
  verseKeyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  arabicText: {
    fontSize: 22,
    lineHeight: 40,
    textAlign: 'right',
    fontFamily: 'System',
  },
  translationText: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.sm,
  },
});

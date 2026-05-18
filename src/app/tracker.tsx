import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTranslation } from '@/hooks/useTranslation';
import type { Lang } from '@/constants/i18n';
import {
  getTodayTracker,
  updateTodayTracker,
  getWeekTracker,
  getStreak,
  updateStreak,
  DailyTracker,
  StreakData,
} from '@/services/storageService';
import { syncTodayActivity } from '@/services/activitySyncService';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

const sectionLabelStyle = (color: string) => ({
  color,
  fontSize: FontSize.xs,
  fontWeight: '700' as const,
  letterSpacing: 0.8,
  marginBottom: Spacing.sm,
});
const PRAYER_COLORS: Record<string, string> = {
  Fajr: '#6366F1', Dhuhr: '#EF4444', Asr: '#F97316', Maghrib: '#8B5CF6', Isha: '#1E40AF',
};

const TRACKER_TEXT: Record<Lang, Record<string, string>> = {
  id: {
    activeTotal: 'Total Aktif',
    best: 'Terbaik',
    daySuffix: 'hari',
    today: 'Hari Ini',
    prayers: 'SHOLAT',
    otherIbadah: 'IBADAH LAINNYA',
    quranHabit: "Ngaji Al-Qur'an",
    weeklyChart: 'Grafik 7 Hari Terakhir',
    weeklySummary: 'Ringkasan Mingguan',
    activeDays: 'Hari aktif',
    averageScore: 'Rata-rata skor',
    perfectDays: 'Hari sempurna',
  },
  en: {
    activeTotal: 'Active Total',
    best: 'Best',
    daySuffix: 'days',
    today: 'Today',
    prayers: 'PRAYERS',
    otherIbadah: 'OTHER WORSHIP',
    quranHabit: "Read Qur'an",
    weeklyChart: 'Last 7 Days Chart',
    weeklySummary: 'Weekly Summary',
    activeDays: 'Active days',
    averageScore: 'Average score',
    perfectDays: 'Perfect days',
  },
};

const DAY_LABELS: Record<Lang, string[]> = {
  id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export default function TrackerScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, pn, lang } = useTranslation();
  const copy = TRACKER_TEXT[lang];
  const [tracker, setTracker] = useState<DailyTracker | null>(null);
  const [weekData, setWeekData] = useState<DailyTracker[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [t, w, s] = await Promise.all([getTodayTracker(), getWeekTracker(), getStreak()]);
    setTracker(t);
    setWeekData(w);
    setStreak(s);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggle = async (field: 'quran' | 'dhikr') => {
    if (!tracker) return;
    const updated = { ...tracker, [field]: !tracker[field] };
    setTracker(updated);
    await updateTodayTracker({ [field]: updated[field] });
    const s = await updateStreak();
    setStreak(s);
    void syncTodayActivity(updated); // Background sync, silent fail
  };

  const togglePrayer = async (prayer: string) => {
    if (!tracker) return;
    const updated = { ...tracker, prayers: { ...tracker.prayers, [prayer]: !tracker.prayers[prayer] } };
    setTracker(updated);
    await updateTodayTracker({ prayers: updated.prayers });
    const s = await updateStreak();
    setStreak(s);
    void syncTodayActivity(updated); // Background sync, silent fail
  };

  const completedPrayers = PRAYERS.filter(p => tracker?.prayers[p]).length;
  const totalScore = completedPrayers + (tracker?.quran ? 1 : 0) + (tracker?.dhikr ? 1 : 0);
  const maxScore = 7;
  const getDayLabel = (d: string) => DAY_LABELS[lang][new Date(d).getDay()];
  const getDayScore = (day: DailyTracker) =>
    Object.values(day.prayers ?? {}).filter(Boolean).length + (day.quran ? 1 : 0) + (day.dhikr ? 1 : 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800', marginLeft: Spacing.md }}>
          {t('menu_tracker')}
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 }}
      >
        {/* Streak Stats */}
        <Card>
          <View style={{ flexDirection: 'row' }}>
            {[
              { label: 'Streak', value: `${streak?.currentStreak ?? 0}`, icon: 'flame' as const, color: C.gold ?? '#F59E0B', suffix: copy.daySuffix },
              { label: copy.activeTotal, value: `${streak?.totalDays ?? 0}`, icon: 'calendar-outline' as const, color: C.primary, suffix: copy.daySuffix },
              { label: copy.best, value: `${streak?.longestStreak ?? 0}`, icon: 'trophy-outline' as const, color: '#8B5CF6', suffix: copy.daySuffix },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                <View style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing.sm }}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                  <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800', marginTop: 4 }}>
                    {item.value}
                  </Text>
                  <Text style={{ color: item.color, fontSize: 10, fontWeight: '600' }}>{item.suffix}</Text>
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{item.label}</Text>
                </View>
                {i < 2 && <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: C.border }} />}
              </React.Fragment>
            ))}
          </View>
        </Card>

        {/* Today */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700' }}>{copy.today}</Text>
            <View style={[styles.scoreBadge, { backgroundColor: totalScore === maxScore ? `${C.success}20` : C.primaryMuted }]}>
              <Text style={{ color: totalScore === maxScore ? C.success : C.primary, fontWeight: '700', fontSize: FontSize.md }}>
                {totalScore}/{maxScore}
              </Text>
            </View>
          </View>
          <ProgressBar
            progress={totalScore / maxScore}
            height={7}
            color={totalScore === maxScore ? C.success : C.primary}
            style={{ marginBottom: Spacing.md, borderRadius: 4 }}
          />

          {/* Prayers */}
          <Text style={sectionLabelStyle(C.textMuted)}>{copy.prayers} ({completedPrayers}/5)</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' }}>
            {PRAYERS.map(p => {
              const done = tracker?.prayers[p] ?? false;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => togglePrayer(p)}
                  style={[
                    styles.prayerChip,
                    { backgroundColor: done ? PRAYER_COLORS[p] : C.surface, borderColor: done ? PRAYER_COLORS[p] : C.border },
                  ]}
                >
                  {done && <Ionicons name="checkmark" size={11} color="#fff" />}
                  <Text style={{ color: done ? '#fff' : C.textSecondary, fontSize: FontSize.xs, fontWeight: '600' }}>
                    {pn(p)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Other habits */}
          <Text style={sectionLabelStyle(C.textMuted)}>{copy.otherIbadah}</Text>
          {[
            { key: 'quran' as const, icon: 'book-outline' as const, label: copy.quranHabit },
            { key: 'dhikr' as const, icon: 'radio-button-on-outline' as const, label: t('tab_dhikr_inner') },
          ].map((item, idx, arr) => {
            const done = tracker?.[item.key] ?? false;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => toggle(item.key)}
                style={[styles.habitRow, { borderBottomColor: C.border, borderBottomWidth: idx < arr.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Ionicons name={item.icon} size={20} color={done ? C.primary : C.textMuted} />
                  <Text style={{ color: C.text, fontSize: FontSize.md }}>{item.label}</Text>
                </View>
                <View style={[styles.checkbox, { backgroundColor: done ? C.primary : 'transparent', borderColor: done ? C.primary : C.border }]}>
                  {done && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* Weekly Chart */}
        <Card>
          <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md }}>
            {copy.weeklyChart}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 96 }}>
            {weekData.map((day) => {
              const score = getDayScore(day);
              const height = maxScore > 0 ? (score / maxScore) * 78 : 0;
              const isToday = day.date === new Date().toISOString().split('T')[0];
              const barColor = isToday ? C.primary : score >= maxScore ? C.success : score > 0 ? C.primaryMuted : C.border;
              return (
                <View key={day.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                  {score > 0 && (
                    <Text style={{ color: isToday ? C.primary : C.textMuted, fontSize: 9, marginBottom: 2, fontWeight: '600' }}>
                      {score}
                    </Text>
                  )}
                  <View style={{
                    width: '75%',
                    height: Math.max(height, 4),
                    backgroundColor: barColor,
                    borderRadius: 4,
                    borderWidth: isToday ? 1.5 : 0,
                    borderColor: C.primary,
                  }} />
                  <Text style={{
                    color: isToday ? C.primary : C.textMuted,
                    fontSize: 10,
                    marginTop: 5,
                    fontWeight: isToday ? '700' : '400',
                  }}>
                    {getDayLabel(day.date)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Summary Card */}
        <Card>
          <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md }}>
            {copy.weeklySummary}
          </Text>
          {(() => {
            const totalWeekScore = weekData.reduce((sum, d) => sum + getDayScore(d), 0);
            const activeDays = weekData.filter(d => getDayScore(d) > 0).length;
            const avg = weekData.length > 0 ? (totalWeekScore / weekData.length).toFixed(1) : '0';
            const perfectDays = weekData.filter(d => getDayScore(d) >= maxScore).length;
            return (
              <View style={{ gap: Spacing.sm }}>
                {[
                  { label: copy.activeDays, value: `${activeDays} / 7 ${copy.daySuffix}`, icon: 'checkmark-circle-outline' as const, color: C.primary },
                  { label: copy.averageScore, value: `${avg} / ${maxScore}`, icon: 'stats-chart-outline' as const, color: '#8B5CF6' },
                  { label: copy.perfectDays, value: `${perfectDays} ${copy.daySuffix}`, icon: 'star-outline' as const, color: C.gold ?? '#F59E0B' },
                ].map(item => (
                  <View key={item.label} style={[styles.summaryRow, { borderColor: C.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                      <Text style={{ color: C.textSecondary, fontSize: FontSize.sm }}>{item.label}</Text>
                    </View>
                    <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700' }}>{item.value}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
        </Card>
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
  scoreBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  prayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
  },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

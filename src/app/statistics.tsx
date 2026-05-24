import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { getWeekTracker, getStreak, DailyTracker, StreakData } from '@/services/storageService';
import { useTranslation } from '@/hooks/useTranslation';
import type { Lang } from '@/constants/i18n';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const STAT_TEXT: Record<Lang, Record<string, string>> = {
  id: {
    totalDays: 'Total Hari',
    longest: 'Terlama',
    day: 'hari',
    active: 'aktif',
    prayersChart: 'Sholat 7 Hari Terakhir',
    prayerDetail: 'Detail per Sholat (7 hari)',
    weeklyInsight: 'Insight Minggu Ini',
    avgPrayer: 'Rata-rata sholat/hari',
    quranDays: 'Hari ngaji',
    dhikrDays: 'Hari dzikir',
    totalPrayerWeek: 'Total sholat minggu ini',
    of: 'dari',
  },
  en: {
    totalDays: 'Total Days',
    longest: 'Longest',
    day: 'days',
    active: 'active',
    prayersChart: 'Prayers in the Last 7 Days',
    prayerDetail: 'Per-Prayer Detail (7 days)',
    weeklyInsight: 'This Week Insight',
    avgPrayer: 'Average prayers/day',
    quranDays: 'Qur’an days',
    dhikrDays: 'Dhikr days',
    totalPrayerWeek: 'Total prayers this week',
    of: 'of',
  },
};


const DAY_LABELS: Record<Lang, string[]> = {
  id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export default function StatisticsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, pn, lang } = useTranslation();
  const copy = STAT_TEXT[lang];
  const [weekData, setWeekData] = useState<DailyTracker[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    Promise.all([getWeekTracker(), getStreak()]).then(([w, s]) => {
      setWeekData(w);
      setStreak(s);
    });
  }, []);

  const getDayLabel = (dateStr: string) => {
    return DAY_LABELS[lang][new Date(dateStr).getDay()];
  };

  const totalPrayersThisWeek = weekData.reduce((sum, day) => {
    return sum + Object.values(day.prayers ?? {}).filter(Boolean).length;
  }, 0);
  const quranDays = weekData.filter(d => d.quran).length;
  const dhikrDays = weekData.filter(d => d.dhikr).length;
  const avgPrayers = weekData.length > 0 ? (totalPrayersThisWeek / weekData.length).toFixed(1) : '0';

  // Per-prayer stats
  const prayerStats = PRAYERS.map(p => ({
    name: p,
    completed: weekData.filter(d => d.prayers[p]).length,
  }));

  const summaryItems = [
    { label: 'Streak', value: `${streak?.currentStreak ?? 0}`, icon: 'flame' as const, color: C.gold, sub: copy.day },
    { label: copy.totalDays, value: `${streak?.totalDays ?? 0}`, icon: 'calendar-outline' as const, color: C.primary, sub: copy.active },
    { label: copy.longest, value: `${streak?.longestStreak ?? 0}`, icon: 'trophy-outline' as const, color: '#8B5CF6', sub: copy.day },
  ];

  const insightItems = [
    { icon: 'business-outline' as const, label: copy.avgPrayer, value: `${avgPrayers} ${copy.of} 5` },
    { icon: 'book-outline' as const, label: copy.quranDays, value: `${quranDays} ${copy.of} 7` },
    { icon: 'radio-button-on-outline' as const, label: copy.dhikrDays, value: `${dhikrDays} ${copy.of} 7` },
    { icon: 'star-outline' as const, label: copy.totalPrayerWeek, value: `${totalPrayersThisWeek} ${copy.of} 35` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800', marginLeft: Spacing.md }}>
          {t('menu_statistics')}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 }}>
        {/* Summary Cards */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {summaryItems.map(item => (
            <Card key={item.label} style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing.md }}>
              <Ionicons name={item.icon} size={22} color={item.color} />
              <Text style={{ color: item.color, fontSize: FontSize.xl, fontWeight: '800', marginTop: 4 }}>{item.value}</Text>
              <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>{item.label}</Text>
              <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{item.sub}</Text>
            </Card>
          ))}
        </View>

        {/* Weekly Sholat Chart */}
        <Card>
          <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md }}>
            {copy.prayersChart}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100, justifyContent: 'space-between' }}>
            {weekData.map(day => {
              const count = Object.values(day.prayers ?? {}).filter(Boolean).length;
              const height = (count / 5) * 85;
              const isToday = day.date === new Date().toISOString().split('T')[0];
              return (
                <View key={day.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Text style={{ color: C.primary, fontSize: 10, marginBottom: 2, fontWeight: '700' }}>
                    {count > 0 ? count : ''}
                  </Text>
                  <View style={{
                    width: '75%',
                    height: Math.max(height, 4),
                    backgroundColor: isToday ? C.primary : count >= 5 ? C.success : count > 0 ? C.primaryMuted : C.border,
                    borderRadius: 4,
                  }} />
                  <Text style={{ color: isToday ? C.primary : C.textMuted, fontSize: 10, marginTop: 6 }}>
                    {getDayLabel(day.date)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Per-Prayer Stats */}
        <Card>
          <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md }}>
            {copy.prayerDetail}
          </Text>
          {prayerStats.map(ps => (
            <View key={ps.name} style={[styles.statRow, { borderBottomColor: C.border }]}>
              <Text style={{ color: C.text, fontSize: FontSize.md, width: 80 }}>{pn(ps.name)}</Text>
              <View style={{ flex: 1, marginHorizontal: Spacing.md }}>
                <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{
                    height: '100%',
                    width: `${(ps.completed / 7) * 100}%`,
                    backgroundColor: ps.completed === 7 ? C.success : ps.completed >= 5 ? C.primary : ps.completed > 0 ? C.gold : C.border,
                    borderRadius: 4,
                  }} />
                </View>
              </View>
              <Text style={{ color: ps.completed === 7 ? C.success : C.textSecondary, fontSize: FontSize.sm, fontWeight: '600', width: 40, textAlign: 'right' }}>
                {ps.completed}/7
              </Text>
            </View>
          ))}
        </Card>

        {/* Weekly Insight */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
            <Ionicons name="bulb-outline" size={20} color={C.gold} />
            <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700' }}>
              {copy.weeklyInsight}
            </Text>
          </View>
          <View style={{ gap: Spacing.sm }}>
            {insightItems.map(item => (
              <View key={item.label} style={[styles.insightRow, { borderBottomColor: C.border }]}>
                <Ionicons name={item.icon} size={20} color={C.primary} />
                <Text style={{ color: C.textSecondary, flex: 1, marginLeft: Spacing.sm, fontSize: FontSize.sm }}>
                  {item.label}
                </Text>
                <Text style={{ color: C.primary, fontSize: FontSize.sm, fontWeight: '700' }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  insightRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  getTodayTracker,
  updateTodayTracker,
  getStreak,
  updateStreak,
  getLastRead,
  DailyTracker,
  StreakData,
} from '@/services/storageService';
import { fetchDailyVerse } from '@/services/quranService';
import { fetchQFDailyVerse, isQFConfigured } from '@/services/quranFoundationService';

const PRAYERS_ORDERED = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
const PRAYER_COLORS: Record<string, string> = {
  Fajr: '#6366F1', Dhuhr: '#EF4444', Asr: '#F97316', Maghrib: '#8B5CF6', Isha: '#1E40AF',
};

function PrayerDot({ name }: { name: string }) {
  return (
    <View style={{
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: PRAYER_COLORS[name] ?? '#6B7280',
      marginRight: 6,
    }} />
  );
}

export default function DashboardScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, pn, lang } = useTranslation();
  const { prayerData, nextPrayer, loading: prayerLoading, city } = usePrayerTimes();

  const [tracker, setTracker] = useState<DailyTracker | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [dailyVerse, setDailyVerse] = useState<{ arabic: string; translation: string; reference: string } | null>(null);
  const [countdown, setCountdown] = useState({ h: 0, m: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [lastRead, setLastReadState] = useState<any>(null);

  const loadData = useCallback(async () => {
    const [t, s, lr, verse] = await Promise.all([
      getTodayTracker(),
      getStreak(),
      getLastRead(),
      isQFConfigured() ? fetchQFDailyVerse(lang).catch(() => fetchDailyVerse(lang)) : fetchDailyVerse(lang),
    ]);
    setTracker(t);
    setStreak(s);
    setLastReadState(lr);
    setDailyVerse(verse);
  }, [lang]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (!nextPrayer) return;
    const prayerTime = nextPrayer.time;
    const update = () => {
      const now = new Date();
      const [h, m] = prayerTime.split(':').map(Number);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const prayerMin = h * 60 + m;
      const diff = prayerMin > nowMin ? prayerMin - nowMin : 24 * 60 - nowMin + prayerMin;
      setCountdown({ h: Math.floor(diff / 60), m: diff % 60 });
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [nextPrayer?.name, nextPrayer?.time]);

  const togglePrayer = async (name: string) => {
    if (!tracker) return;
    const updated = { ...tracker, prayers: { ...tracker.prayers, [name]: !tracker.prayers[name] } };
    setTracker(updated);
    await updateTodayTracker({ prayers: updated.prayers });
    const s = await updateStreak();
    setStreak(s);
  };

  const completedPrayers = PRAYERS_ORDERED.filter(p => tracker?.prayers[p]).length;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 5) return t('greeting_night_early');
    if (h < 10) return t('greeting_morning');
    if (h < 15) return t('greeting_afternoon');
    if (h < 18) return t('greeting_evening');
    return t('greeting_night');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../../assets/logo/logo-transparent.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.sm }}>{getGreeting()}</Text>
              <Text style={{ color: C.text, fontSize: FontSize.xxl, fontWeight: '800', marginTop: 2 }}>
                MuslimMate
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="location-outline" size={12} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{city}</Text>
            </View>
            {(streak?.currentStreak ?? 0) > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: C.goldMuted }]}>
                <Ionicons name="flame" size={12} color={C.gold} />
                <Text style={{ color: C.gold, fontSize: FontSize.xs, fontWeight: '700', marginLeft: 3 }}>
                  {streak!.currentStreak} {t('streak_label')}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: Spacing.md, gap: Spacing.md, marginTop: Spacing.md }}>

          {/* Next Prayer Card */}
          {prayerLoading ? (
            <Card style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
              <ActivityIndicator color={C.primary} />
              <Text style={{ color: C.textMuted, marginTop: 8, fontSize: FontSize.sm }}>
                {t('loading_prayer')}
              </Text>
            </Card>
          ) : nextPrayer ? (
            <Card
              variant="elevated"
              style={{ backgroundColor: C.primaryMuted, borderWidth: 1, borderColor: `${C.primary}30` }}
            >
              <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.2 }}>
                {t('next_prayer_label')}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing.sm }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <PrayerDot name={nextPrayer.name} />
                    <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '700' }}>
                      {pn(nextPrayer.name)}
                    </Text>
                  </View>
                  <Text style={{ color: C.primary, fontSize: 40, fontWeight: '900', marginTop: 4, letterSpacing: -1 }}>
                    {nextPrayer.time.slice(0, 5)}
                  </Text>
                </View>
                <View style={[styles.countdown, { backgroundColor: C.primary }]}>
                  <Text style={{ color: '#fff', fontSize: FontSize.xxl, fontWeight: '900' }}>
                    {countdown.h > 0 ? `${countdown.h}${t('hours_short')}` : `${countdown.m}${t('minutes_short')}`}
                  </Text>
                  {countdown.h > 0 && (
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm }}>
                      {countdown.m}{t('minutes_short')} {t('countdown_left')}
                    </Text>
                  )}
                  {countdown.h === 0 && (
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs }}>{t('countdown_left')}</Text>
                  )}
                </View>
              </View>
            </Card>
          ) : null}

          {/* Prayer Checklist */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700' }}>{t('prayer_today')}</Text>
              <Text style={{ color: completedPrayers === 5 ? C.success : C.primary, fontWeight: '700', fontSize: FontSize.md }}>
                {completedPrayers}/5
              </Text>
            </View>
            <ProgressBar
              progress={completedPrayers / 5}
              height={5}
              color={completedPrayers === 5 ? C.success : C.primary}
              style={{ marginBottom: Spacing.md }}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {PRAYERS_ORDERED.map(name => {
                const done = tracker?.prayers[name] ?? false;
                return (
                  <TouchableOpacity
                    key={name}
                    onPress={() => togglePrayer(name)}
                    style={[
                      styles.prayerChip,
                      {
                        backgroundColor: done ? PRAYER_COLORS[name] : C.surface,
                        borderColor: done ? PRAYER_COLORS[name] : C.border,
                        flex: 1,
                      },
                    ]}
                  >
                    {done && (
                      <Ionicons name="checkmark" size={11} color="#fff" style={{ marginBottom: 1 }} />
                    )}
                    <Text style={{
                      color: done ? '#fff' : C.textSecondary,
                      fontSize: 10,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                      {pn(name)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Daily Verse */}
          {dailyVerse && (
            <Card style={{ borderLeftWidth: 3, borderLeftColor: C.gold }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="book-outline" size={13} color={C.gold} />
                  <Text style={{ color: C.gold, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.8 }}>
                    {t('daily_verse_label')}
                  </Text>
                </View>
                {isQFConfigured() && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#10B98115', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Ionicons name="cloud-done-outline" size={10} color="#10B981" />
                    <Text style={{ color: '#10B981', fontSize: 9, fontWeight: '700' }}>Quran.Foundation</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.arabicVerse, { color: C.text }]}>
                {dailyVerse.arabic}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.sm, lineHeight: 20 }}>
                {dailyVerse.translation}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: Spacing.xs }}>
                {dailyVerse.reference}
              </Text>
            </Card>
          )}

          {/* Quick Actions */}
          <View>
            <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm }}>
              {t('quick_access')}
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {[
                { icon: 'compass-outline' as const, label: t('qaction_qibla'), route: '/qibla', color: C.primary },
                { icon: 'stats-chart-outline' as const, label: t('qaction_stats'), route: '/statistics', color: '#3B82F6' },
                { icon: 'calendar-outline' as const, label: t('qaction_ramadan'), route: '/fasting', color: C.gold },
                { icon: 'chatbubbles-outline' as const, label: t('qaction_ai'), route: '/ai-chat', color: '#06B6D4' },
              ].map(item => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => router.push(item.route as any)}
                  style={[styles.quickAction, { backgroundColor: C.card, borderColor: C.border }]}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={{ color: C.textSecondary, fontSize: 10, marginTop: 5, textAlign: 'center' }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Last Read */}
          {lastRead && (
            <TouchableOpacity onPress={() => router.push(`/quran/${lastRead.surahNumber}` as any)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={[styles.iconBox, { backgroundColor: C.primaryMuted }]}>
                  <Ionicons name="book" size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{t('last_read')}</Text>
                  <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '600', marginTop: 2 }}>
                    {lastRead.surahName} — {t('verse_label')} {lastRead.ayahNumber}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              </Card>
            </TouchableOpacity>
          )}

          {/* Prayer Schedule Overview */}
          {prayerData && (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>{t('prayer_schedule')}</Text>
                <TouchableOpacity onPress={() => router.push('/prayer')}>
                  <Text style={{ color: C.primary, fontSize: FontSize.sm }}>{t('see_more')}</Text>
                </TouchableOpacity>
              </View>
              {PRAYERS_ORDERED.map(name => {
                const time = (prayerData.timings as any)[name];
                const isNext = nextPrayer?.name === name;
                return (
                  <View
                    key={name}
                    style={[
                      styles.prayerRow,
                      {
                        borderBottomColor: C.border,
                        backgroundColor: isNext ? C.primaryMuted : 'transparent',
                        borderRadius: isNext ? BorderRadius.sm : 0,
                        marginBottom: isNext ? 2 : 0,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <PrayerDot name={name} />
                      <Text style={{
                        color: isNext ? C.primary : C.text,
                        fontSize: FontSize.md,
                        fontWeight: isNext ? '700' : '400',
                      }}>
                        {pn(name)}
                      </Text>
                      {isNext && (
                        <View style={[styles.nextPill, { backgroundColor: C.primary }]}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{t('next_badge')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{
                      color: isNext ? C.primary : C.textSecondary,
                      fontSize: FontSize.md,
                      fontWeight: isNext ? '700' : '400',
                    }}>
                      {time?.slice(0, 5)}
                    </Text>
                  </View>
                );
              })}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countdown: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    minWidth: 80,
  },
  prayerChip: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  arabicVerse: {
    fontSize: FontSize.arabic,
    textAlign: 'right',
    lineHeight: 46,
    fontFamily: 'serif',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nextPill: {
    marginLeft: 6,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { Card } from '@/components/ui/Card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import {
  getQuranReadingSessions,
  getQuranReadingSummary,
  getTahfidzPlans,
  saveQuranReadingGoal,
  type QuranCompletionGoalType,
  type QuranReadingGoal,
  type QuranReadingSession,
  type QuranReadingSummary,
  type TahfidzPlan,
} from '@/services/storageService';

const formatDuration = (seconds: number, lang: 'id' | 'en') => {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes <= 0) return lang === 'id' ? '0 menit' : '0 min';
  if (minutes < 60) return `${minutes} ${lang === 'id' ? 'menit' : 'min'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}j ${rest}m` : `${hours} ${lang === 'id' ? 'jam' : 'h'}`;
};

const dayLabel = (dateKey: string, lang: 'id' | 'en') => {
  const labels = lang === 'id'
    ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return labels[new Date(`${dateKey}T00:00:00`).getDay()];
};

export default function QuranProgressScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, lang } = useTranslation();
  const [summary, setSummary] = useState<QuranReadingSummary | null>(null);
  const [sessions, setSessions] = useState<QuranReadingSession[]>([]);
  const [tahfidzPlans, setTahfidzPlans] = useState<TahfidzPlan[]>([]);

  const load = useCallback(async () => {
    const [nextSummary, nextSessions, nextTahfidzPlans] = await Promise.all([
      getQuranReadingSummary(),
      getQuranReadingSessions(),
      getTahfidzPlans(),
    ]);
    setSummary(nextSummary);
    setSessions(nextSessions);
    setTahfidzPlans(nextTahfidzPlans);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load])
  );

  const weeklyDayStats = useMemo(() => {
    if (!summary) return [];
    return summary.weekly.days.map(date => {
      const rows = sessions.filter(session => session.date === date);
      return {
        date,
        durationSeconds: rows.reduce((sum, session) => sum + session.durationSeconds, 0),
        versesRead: rows.reduce((sum, session) => sum + session.versesRead, 0),
      };
    });
  }, [sessions, summary]);

  const updateGoal = async (patch: Partial<QuranReadingGoal>) => {
    if (!summary) return;
    const next = await saveQuranReadingGoal({ ...summary.goal, ...patch });
    setSummary(next);
  };

  const setCompletionGoal = async (type: QuranCompletionGoalType, patch: Partial<QuranReadingGoal> = {}) => {
    if (!summary) return;
    const next = await saveQuranReadingGoal({
      ...summary.goal,
      completionType: type,
      startedAt: new Date().toISOString().slice(0, 10),
      ...patch,
    });
    setSummary(next);
  };

  const getCompletionTitle = () => {
    if (!summary) return '';
    const { goal } = summary;
    if (goal.completionType === 'pages') {
      return `${goal.dailyPagesTarget} ${t('quran_goal_pages_per_day')}`;
    }
    if (goal.completionType === 'juz') {
      return `${t('juz_label')} ${goal.targetJuz} / ${goal.targetDays} ${t('streak_label')}`;
    }
    return `${t('quran_goal_khatam')} ${goal.khatamDays} ${t('streak_label')}`;
  };

  const getCompletionSubtitle = () => {
    if (!summary) return '';
    const { completion } = summary;
    if (completion.type === 'pages') {
      return `${completion.todayCompleted}/${completion.todayTarget} ${t('quran_goal_pages_today')} · ${completion.completed}/${completion.target} ${t('quran_goal_pages_total')}`;
    }
    if (completion.type === 'juz') {
      return `${completion.completed}/${completion.target} ${t('verses_unit')} · ${completion.remainingDays} ${t('quran_goal_days_left')}`;
    }
    return `${completion.completed}/${completion.target} ${t('verses_unit')} · ${completion.remainingDays} ${t('quran_goal_days_left')}`;
  };

  const tahfidzTotalAyahs = tahfidzPlans.reduce((sum, plan) => sum + plan.targetAyahs.length, 0);
  const tahfidzMemorizedAyahs = tahfidzPlans.reduce((sum, plan) => sum + plan.memorizedAyahs.length, 0);
  const tahfidzProgress = tahfidzTotalAyahs > 0 ? tahfidzMemorizedAyahs / tahfidzTotalAyahs : 0;

  const StatCard = ({
    icon,
    color,
    value,
    label,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    value: string;
    label: string;
  }) => (
    <Card style={styles.statCard}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ color, fontSize: FontSize.xl, fontWeight: '900', marginTop: 6 }}>{value}</Text>
      <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '900' }}>{t('quran_progress_title')}</Text>
          <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
            {t('quran_progress_subtitle')}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 }}>
        {summary ? (
          <>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <StatCard icon="flame-outline" color={C.gold} value={`${summary.streak.current}`} label={t('quran_progress_streak')} />
              <StatCard icon="time-outline" color={C.primary} value={formatDuration(summary.today.durationSeconds, lang)} label={t('quran_progress_today')} />
              <StatCard icon="trophy-outline" color="#8B5CF6" value={`${summary.streak.longest}`} label={t('quran_progress_longest')} />
            </View>

            <Card>
              <View style={styles.goalHeader}>
                <View style={[styles.goalIcon, { backgroundColor: `${C.primary}16` }]}>
                  <Ionicons name="flag-outline" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '900' }}>
                    {t('quran_goal_title')}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                    {t('quran_goal_subtitle')}
                  </Text>
                </View>
              </View>

              <View style={[styles.completionBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '900' }} numberOfLines={1}>
                    {getCompletionTitle()}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }} numberOfLines={2}>
                    {getCompletionSubtitle()}
                  </Text>
                </View>
                <Text style={{ color: C.primary, fontSize: FontSize.xl, fontWeight: '900', marginLeft: 10 }}>
                  {Math.round(summary.completion.progress * 100)}%
                </Text>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
                <View style={[styles.progressFill, { backgroundColor: C.primary, width: `${Math.round(summary.completion.progress * 100)}%` }]} />
              </View>

              <View style={styles.goalPresetGrid}>
                <TouchableOpacity
                  onPress={() => setCompletionGoal('khatam', { khatamDays: 30 })}
                  style={[
                    styles.goalPresetBtn,
                    {
                      backgroundColor: summary.goal.completionType === 'khatam' ? C.primaryMuted : C.surface,
                      borderColor: summary.goal.completionType === 'khatam' ? C.primary : C.border,
                    },
                  ]}
                >
                  <Ionicons name="book-outline" size={15} color={summary.goal.completionType === 'khatam' ? C.primary : C.textMuted} />
                  <Text style={{ color: summary.goal.completionType === 'khatam' ? C.primary : C.textSecondary, fontSize: 11, fontWeight: '800', marginLeft: 6 }}>
                    {t('quran_goal_khatam_30')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCompletionGoal('pages', { dailyPagesTarget: 1 })}
                  style={[
                    styles.goalPresetBtn,
                    {
                      backgroundColor: summary.goal.completionType === 'pages' ? C.primaryMuted : C.surface,
                      borderColor: summary.goal.completionType === 'pages' ? C.primary : C.border,
                    },
                  ]}
                >
                  <Ionicons name="reader-outline" size={15} color={summary.goal.completionType === 'pages' ? C.primary : C.textMuted} />
                  <Text style={{ color: summary.goal.completionType === 'pages' ? C.primary : C.textSecondary, fontSize: 11, fontWeight: '800', marginLeft: 6 }}>
                    {t('quran_goal_page_daily')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCompletionGoal('juz', { targetJuz: 30, targetDays: 14 })}
                  style={[
                    styles.goalPresetBtn,
                    {
                      backgroundColor: summary.goal.completionType === 'juz' ? C.primaryMuted : C.surface,
                      borderColor: summary.goal.completionType === 'juz' ? C.primary : C.border,
                    },
                  ]}
                >
                  <Ionicons name="library-outline" size={15} color={summary.goal.completionType === 'juz' ? C.primary : C.textMuted} />
                  <Text style={{ color: summary.goal.completionType === 'juz' ? C.primary : C.textSecondary, fontSize: 11, fontWeight: '800', marginLeft: 6 }}>
                    {t('quran_goal_juz_30')}
                  </Text>
                </TouchableOpacity>
              </View>

              {summary.goal.completionType === 'khatam' && (
                <View style={styles.goalRow}>
                  <Text style={[styles.goalLabel, { color: C.textSecondary }]}>{t('quran_goal_adjust_days')}</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => updateGoal({ khatamDays: summary.goal.khatamDays - 1 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                      <Ionicons name="remove" size={14} color={C.textSecondary} />
                    </TouchableOpacity>
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', minWidth: 34, textAlign: 'center' }}>{summary.goal.khatamDays}</Text>
                    <TouchableOpacity onPress={() => updateGoal({ khatamDays: summary.goal.khatamDays + 1 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                      <Ionicons name="add" size={14} color={C.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {summary.goal.completionType === 'pages' && (
                <View style={styles.goalRow}>
                  <Text style={[styles.goalLabel, { color: C.textSecondary }]}>{t('quran_goal_adjust_pages')}</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => updateGoal({ dailyPagesTarget: summary.goal.dailyPagesTarget - 1 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                      <Ionicons name="remove" size={14} color={C.textSecondary} />
                    </TouchableOpacity>
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', minWidth: 34, textAlign: 'center' }}>{summary.goal.dailyPagesTarget}</Text>
                    <TouchableOpacity onPress={() => updateGoal({ dailyPagesTarget: summary.goal.dailyPagesTarget + 1 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                      <Ionicons name="add" size={14} color={C.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {summary.goal.completionType === 'juz' && (
                <>
                  <View style={styles.goalRow}>
                    <Text style={[styles.goalLabel, { color: C.textSecondary }]}>{t('quran_goal_adjust_juz')}</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity onPress={() => updateGoal({ targetJuz: summary.goal.targetJuz - 1 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                        <Ionicons name="remove" size={14} color={C.textSecondary} />
                      </TouchableOpacity>
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', minWidth: 34, textAlign: 'center' }}>{summary.goal.targetJuz}</Text>
                      <TouchableOpacity onPress={() => updateGoal({ targetJuz: summary.goal.targetJuz + 1 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                        <Ionicons name="add" size={14} color={C.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.goalRow}>
                    <Text style={[styles.goalLabel, { color: C.textSecondary }]}>{t('quran_goal_adjust_days')}</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity onPress={() => updateGoal({ targetDays: summary.goal.targetDays - 1 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                        <Ionicons name="remove" size={14} color={C.textSecondary} />
                      </TouchableOpacity>
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', minWidth: 34, textAlign: 'center' }}>{summary.goal.targetDays}</Text>
                      <TouchableOpacity onPress={() => updateGoal({ targetDays: summary.goal.targetDays + 1 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                        <Ionicons name="add" size={14} color={C.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </Card>

            <Card>
              <View style={styles.goalHeader}>
                <View style={[styles.goalIcon, { backgroundColor: '#8B5CF61A' }]}>
                  <Ionicons name="school-outline" size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '900' }}>
                    {t('quran_goal_memorization_title')}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                    {tahfidzPlans.length > 0
                      ? `${tahfidzPlans.length} ${t('quran_goal_active_plans')} · ${tahfidzMemorizedAyahs}/${tahfidzTotalAyahs} ${t('verses_unit')}`
                      : t('quran_goal_memorization_desc')}
                  </Text>
                </View>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
                <View style={[styles.progressFill, { backgroundColor: '#8B5CF6', width: `${Math.round(tahfidzProgress * 100)}%` }]} />
              </View>

              <TouchableOpacity
                onPress={() => router.push('/tahfidz' as any)}
                style={[styles.tahfidzBtn, { backgroundColor: '#8B5CF6' }]}
              >
                <Ionicons name="open-outline" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: FontSize.sm, fontWeight: '800', marginLeft: 8 }}>
                  {t('quran_goal_open_tahfidz')}
                </Text>
              </TouchableOpacity>
            </Card>

            <Card>
              <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '900' }}>{t('quran_progress_week_target')}</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>
                {summary.weekly.activeDays}/{summary.goal.weeklyDaysTarget} {t('streak_label')} · {formatDuration(summary.weekly.durationSeconds, lang)} / {summary.goal.weeklyMinutesTarget} {lang === 'id' ? 'menit' : 'min'}
              </Text>

              <View style={styles.goalRow}>
                <Text style={[styles.goalLabel, { color: C.textSecondary }]}>{t('quran_progress_goal_days')}</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity onPress={() => updateGoal({ weeklyDaysTarget: summary.goal.weeklyDaysTarget - 1 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                    <Ionicons name="remove" size={14} color={C.textSecondary} />
                  </TouchableOpacity>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', minWidth: 26, textAlign: 'center' }}>{summary.goal.weeklyDaysTarget}</Text>
                  <TouchableOpacity onPress={() => updateGoal({ weeklyDaysTarget: summary.goal.weeklyDaysTarget + 1 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                    <Ionicons name="add" size={14} color={C.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
                <View style={[styles.progressFill, { backgroundColor: C.primary, width: `${Math.round(summary.weekly.dayProgress * 100)}%` }]} />
              </View>

              <View style={styles.goalRow}>
                <Text style={[styles.goalLabel, { color: C.textSecondary }]}>{t('quran_progress_goal_minutes')}</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity onPress={() => updateGoal({ weeklyMinutesTarget: summary.goal.weeklyMinutesTarget - 5 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                    <Ionicons name="remove" size={14} color={C.textSecondary} />
                  </TouchableOpacity>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', minWidth: 34, textAlign: 'center' }}>{summary.goal.weeklyMinutesTarget}</Text>
                  <TouchableOpacity onPress={() => updateGoal({ weeklyMinutesTarget: summary.goal.weeklyMinutesTarget + 5 })} style={[styles.stepperBtn, { borderColor: C.border }]}>
                    <Ionicons name="add" size={14} color={C.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
                <View style={[styles.progressFill, { backgroundColor: C.gold, width: `${Math.round(summary.weekly.minuteProgress * 100)}%` }]} />
              </View>
            </Card>

            <Card>
              <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '900', marginBottom: 12 }}>{t('quran_progress_week')}</Text>
              <View style={styles.weekBars}>
                {weeklyDayStats.map(day => {
                  const maxSeconds = Math.max(...weeklyDayStats.map(row => row.durationSeconds), 60);
                  const active = day.durationSeconds > 0;
                  return (
                    <View key={day.date} style={styles.weekBarItem}>
                      <Text style={{ color: active ? C.primary : C.textMuted, fontSize: 10, fontWeight: '700' }}>{day.versesRead || ''}</Text>
                      <View style={[styles.weekBarTrack, { backgroundColor: C.border }]}>
                        <View
                          style={[
                            styles.weekBarFill,
                            {
                              backgroundColor: active ? C.primary : C.border,
                              height: `${Math.max(active ? 18 : 6, (day.durationSeconds / maxSeconds) * 84)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={{ color: active ? C.primary : C.textMuted, fontSize: 10 }}>{dayLabel(day.date, lang)}</Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            <Card>
              <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '900', marginBottom: 10 }}>{t('quran_progress_popular_surah')}</Text>
              {summary.popularSurahs.length ? summary.popularSurahs.map(item => (
                <View key={item.id} style={[styles.listRow, { borderBottomColor: C.border }]}>
                  <Ionicons name="book-outline" size={16} color={C.primary} />
                  <Text style={{ color: C.textSecondary, flex: 1, marginLeft: 10, fontSize: FontSize.sm }}>{item.label}</Text>
                  <Text style={{ color: C.primary, fontSize: 11, fontWeight: '800' }}>{item.versesRead} {t('verses_unit')}</Text>
                </View>
              )) : (
                <Text style={{ color: C.textMuted, fontSize: FontSize.sm }}>{t('quran_progress_no_activity')}</Text>
              )}
            </Card>

            <Card>
              <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '900', marginBottom: 10 }}>{t('quran_progress_popular_juz')}</Text>
              {summary.popularJuz.length ? summary.popularJuz.map(item => (
                <View key={item.id} style={[styles.listRow, { borderBottomColor: C.border }]}>
                  <Ionicons name="library-outline" size={16} color={C.gold} />
                  <Text style={{ color: C.textSecondary, flex: 1, marginLeft: 10, fontSize: FontSize.sm }}>{item.label}</Text>
                  <Text style={{ color: C.gold, fontSize: 11, fontWeight: '800' }}>{formatDuration(item.durationSeconds, lang)}</Text>
                </View>
              )) : (
                <Text style={{ color: C.textMuted, fontSize: FontSize.sm }}>{t('quran_progress_no_activity')}</Text>
              )}
            </Card>

            <Card>
              <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '900', marginBottom: 10 }}>{t('quran_progress_recent_sessions')}</Text>
              {summary.recentSessions.length ? summary.recentSessions.map(session => (
                <View key={session.id} style={[styles.listRow, { borderBottomColor: C.border }]}>
                  <Ionicons name="time-outline" size={16} color={C.textMuted} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: C.textSecondary, fontSize: FontSize.sm }}>{session.surahName} · {t('verse_label')} {session.lastAyah}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }}>{session.date} · {session.versesRead} {t('verses_unit')}</Text>
                  </View>
                  <Text style={{ color: C.primary, fontSize: 11, fontWeight: '800' }}>{formatDuration(session.durationSeconds, lang)}</Text>
                </View>
              )) : (
                <Text style={{ color: C.textMuted, fontSize: FontSize.sm }}>{t('quran_progress_no_activity')}</Text>
              )}
            </Card>
          </>
        ) : null}
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    minHeight: 96,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  completionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  goalPresetGrid: {
    gap: 8,
    marginTop: Spacing.md,
  },
  goalPresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tahfidzBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    paddingVertical: 11,
    marginTop: Spacing.md,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  goalLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  weekBars: {
    height: 128,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  weekBarItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  weekBarTrack: {
    width: '78%',
    height: 86,
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  weekBarFill: {
    width: '100%',
    borderRadius: 7,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

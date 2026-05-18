import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { LogoSvgIcon } from '@/components/LogoSvgIcon';

const PRAYER_COLORS: Record<string, string> = {
  Fajr: '#6366F1',
  Sunrise: '#F59E0B',
  Dhuhr: '#EF4444',
  Asr: '#F97316',
  Maghrib: '#8B5CF6',
  Isha: '#1E40AF',
};

const MAIN_PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function PrayerIndicator({ name }: { name: string }) {
  return (
    <View style={[styles.indicator, { backgroundColor: PRAYER_COLORS[name] ?? '#6B7280' }]} />
  );
}

export default function PrayerScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, pn } = useTranslation();
  const { prayerData, nextPrayer, loading, error, city } = usePrayerTimes();

  const today = new Date().toLocaleDateString(t('date_locale'), {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const formatCountdown = () => {
    if (!nextPrayer) return '';
    const h = Math.floor(nextPrayer.minutesLeft / 60);
    const m = nextPrayer.minutesLeft % 60;
    return h > 0 ? `${h}${t('hours_short')} ${m}${t('minutes_short')}` : `${m} ${t('minutes_label')}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={styles.titleRow}>
            <View style={[styles.headerIconBadge, { backgroundColor: `${C.primary}15`, borderColor: `${C.primary}30` }]}>
              <LogoSvgIcon name="mosque" size={25} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: FontSize.xxl, fontWeight: '800' }}>{t('prayer_times')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="location-outline" size={12} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{city}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/qibla' as any)}
            style={[styles.qiblaBtn, { backgroundColor: C.primaryMuted, borderColor: `${C.primary}40` }]}
          >
            <Ionicons name="compass-outline" size={18} color={C.primary} />
            <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 }}>
              {t('qibla')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: Spacing.md, gap: Spacing.md, marginTop: Spacing.md }}>

          {/* Date Card */}
          <Card style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
            <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '600' }}>{today}</Text>
            {prayerData?.date?.hijri && (
              <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, marginTop: 4 }}>
                {prayerData.date.hijri.day} {prayerData.date.hijri.month.en} {prayerData.date.hijri.year} H
              </Text>
            )}
          </Card>

          {/* Next Prayer */}
          {!loading && nextPrayer && (
            <Card style={{ backgroundColor: C.primaryMuted, borderWidth: 1, borderColor: `${C.primary}25` }}>
              <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.2 }}>
                {t('next_prayer_label')}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <PrayerIndicator name={nextPrayer.name} />
                    <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '700' }}>
                      {pn(nextPrayer.name)}
                    </Text>
                  </View>
                  <Text style={{ color: C.primary, fontSize: 40, fontWeight: '900', marginTop: 4, letterSpacing: -1 }}>
                    {nextPrayer.time.slice(0, 5)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: C.primary, fontSize: FontSize.xxl, fontWeight: '900' }}>
                    {formatCountdown()}
                  </Text>
                  <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, marginTop: 2 }}>{t('countdown_left')}</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Prayer Table */}
          {loading ? (
            <Card style={{ alignItems: 'center', paddingVertical: Spacing.xxl }}>
              <ActivityIndicator color={C.primary} size="large" />
              <Text style={{ color: C.textMuted, marginTop: 12, fontSize: FontSize.sm }}>
                {t('loading_prayer')}
              </Text>
            </Card>
          ) : error ? (
            <Card style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
              <Ionicons name="cloud-offline-outline" size={40} color={C.textMuted} />
              <Text style={{ color: C.error, textAlign: 'center', marginTop: 8, fontSize: FontSize.sm }}>
                {error}
              </Text>
            </Card>
          ) : prayerData ? (
            <Card>
              <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md }}>
                {t('today_schedule')}
              </Text>
              {MAIN_PRAYERS.map((name, i) => {
                const time = (prayerData.timings as any)[name];
                const isNext = nextPrayer?.name === name;
                return (
                  <View
                    key={name}
                    style={[
                      styles.prayerRow,
                      {
                        backgroundColor: isNext ? C.primaryMuted : 'transparent',
                        borderRadius: isNext ? BorderRadius.md : 0,
                        borderBottomColor: C.border,
                        borderBottomWidth: i < MAIN_PRAYERS.length - 1 && !isNext
                          ? StyleSheet.hairlineWidth : 0,
                        marginBottom: 2,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[
                        styles.prayerIconBox,
                        { backgroundColor: `${PRAYER_COLORS[name] ?? C.primary}20` },
                      ]}>
                        <View style={[styles.prayerDot, { backgroundColor: PRAYER_COLORS[name] ?? C.primary }]} />
                      </View>
                      <View>
                        <Text style={{
                          color: isNext ? C.primary : C.text,
                          fontSize: FontSize.md,
                          fontWeight: isNext ? '700' : '500',
                        }}>
                          {pn(name)}
                        </Text>
                        {isNext && (
                          <Text style={{ color: C.primary, fontSize: FontSize.xs }}>
                            {formatCountdown()} {t('countdown_left')}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{
                        color: isNext ? C.primary : C.text,
                        fontSize: FontSize.lg,
                        fontWeight: isNext ? '800' : '600',
                        letterSpacing: -0.5,
                      }}>
                        {time?.slice(0, 5)}
                      </Text>
                      {isNext && (
                        <View style={[styles.nextBadge, { backgroundColor: C.primary }]}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{t('next_badge')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          ) : null}

          {/* Additional Times */}
          {prayerData && (
            <Card>
              <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md }}>
                {t('additional_times')}
              </Text>
              {[
                { key: 'Imsak', label: t('imsak') },
                { key: 'Midnight', label: t('midnight') },
              ].map(({ key, label }) => {
                const time = (prayerData.timings as any)[key];
                if (!time) return null;
                return (
                  <View key={key} style={[styles.extraRow, { borderBottomColor: C.border }]}>
                    <Text style={{ color: C.textSecondary, fontSize: FontSize.md }}>{label}</Text>
                    <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '500' }}>
                      {time.slice(0, 5)}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  headerIconBadge: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  qiblaBtn: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 2,
    minWidth: 60,
  },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  prayerIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nextBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

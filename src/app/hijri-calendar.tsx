import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

// ── Hijri calculation (Tabular Islamic Calendar / Waqf) ───────────────────────

function jdFromGregorian(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mn = m + 12 * a - 3;
  return d + Math.floor((153 * mn + 2) / 5) + 365 * yr +
    Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
}

function jdFromHijri(hy: number, hm: number, hd: number): number {
  return hd + Math.ceil(29.5 * (hm - 1)) + (hy - 1) * 354 +
    Math.floor((3 + 11 * hy) / 30) + 1948440 - 385;
}

function gregorianFromJd(jd: number) {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    year: 100 * b + d - 4800 + Math.floor(m / 10),
    month: m + 3 - 12 * Math.floor(m / 10),
    day: e - Math.floor((153 * m + 2) / 5) + 1,
  };
}

function hijriFromJd(jd: number) {
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l3) / 709);
  return {
    year: 30 * n + j - 30,
    month,
    day: l3 - Math.floor((709 * month) / 24),
  };
}

function gregorianToHijri(y: number, m: number, d: number) {
  return hijriFromJd(jdFromGregorian(y, m, d));
}

function hijriToGregorian(hy: number, hm: number, hd: number) {
  return gregorianFromJd(jdFromHijri(hy, hm, hd));
}

function hijriDaysInMonth(hy: number, hm: number): number {
  const nm = hm === 12 ? { y: hy + 1, m: 1 } : { y: hy, m: hm + 1 };
  return jdFromHijri(nm.y, nm.m, 1) - jdFromHijri(hy, hm, 1);
}

// ── Data ───────────────────────────────────────────────────────────────────────

const MONTH_NAMES_ID = [
  '', 'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir',
  'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Sya'ban",
  'Ramadhan', 'Syawal', "Dzulqa'dah", 'Dzulhijjah',
];
const MONTH_NAMES_EN = [
  '', 'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Akhir",
  'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah',
];
const MONTH_NAMES_AR = [
  '', 'مُحَرَّم', 'صَفَر', 'رَبِيع ٱلْأَوَّل', 'رَبِيع ٱلثَّانِي',
  'جُمَادَى ٱلْأُولَىٰ', 'جُمَادَى ٱلثَّانِيَة', 'رَجَب', 'شَعْبَان',
  'رَمَضَان', 'شَوَّال', 'ذُو ٱلْقَعْدَة', 'ذُو ٱلْحِجَّة',
];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', "Jum'at", 'Sab'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENTS: Record<string, { id: string; en: string; color: string }> = {
  '1-1':   { id: 'Tahun Baru Islam',      en: 'Islamic New Year',       color: '#10B981' },
  '1-10':  { id: 'Hari Asyura',           en: 'Day of Ashura',          color: '#6366F1' },
  '3-12':  { id: 'Maulid Nabi ﷺ',        en: "Prophet's Birthday ﷺ",   color: '#F59E0B' },
  '7-27':  { id: "Isra' Mi'raj",          en: "Isra' Mi'raj",           color: '#8B5CF6' },
  '8-15':  { id: "Nisfu Sya'ban",         en: "Laylat al-Bara'ah",      color: '#3B82F6' },
  '9-1':   { id: 'Awal Ramadhan',         en: 'Start of Ramadan',       color: '#EF4444' },
  '9-17':  { id: 'Nuzulul Quran',         en: 'Revelation of Quran',    color: '#3B82F6' },
  '9-21':  { id: 'Lailatul Qadar',        en: 'Laylatul Qadr',          color: '#EC4899' },
  '9-23':  { id: 'Lailatul Qadar',        en: 'Laylatul Qadr',          color: '#EC4899' },
  '9-25':  { id: 'Lailatul Qadar',        en: 'Laylatul Qadr',          color: '#EC4899' },
  '9-27':  { id: 'Lailatul Qadar',        en: 'Laylatul Qadr',          color: '#EC4899' },
  '9-29':  { id: 'Lailatul Qadar',        en: 'Laylatul Qadr',          color: '#EC4899' },
  '10-1':  { id: 'Idul Fitri 🎉',         en: 'Eid al-Fitr 🎉',         color: '#10B981' },
  '10-2':  { id: 'Lebaran (H+1)',         en: 'Eid al-Fitr (H+1)',      color: '#10B981' },
  '10-3':  { id: 'Lebaran (H+2)',         en: 'Eid al-Fitr (H+2)',      color: '#10B981' },
  '12-9':  { id: 'Hari Arafah',           en: 'Day of Arafah',          color: '#F59E0B' },
  '12-10': { id: 'Idul Adha 🐑',          en: 'Eid al-Adha 🐑',         color: '#10B981' },
  '12-11': { id: 'Hari Tasyrik I',        en: 'Tashreeq Day I',         color: '#F59E0B' },
  '12-12': { id: 'Hari Tasyrik II',       en: 'Tashreeq Day II',        color: '#F59E0B' },
  '12-13': { id: 'Hari Tasyrik III',      en: 'Tashreeq Day III',       color: '#F59E0B' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getEventKey(hm: number, hd: number) {
  return `${hm}-${hd}`;
}

function dayOfWeekForHijri1(hy: number, hm: number): number {
  const g = hijriToGregorian(hy, hm, 1);
  const jd = jdFromGregorian(g.year, g.month, g.day);
  return (jd + 1) % 7; // 0=Sun
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function HijriCalendarScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { lang } = useTranslation();

  const today = new Date();
  const todayH = gregorianToHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const [hYear, setHYear] = useState(todayH.year);
  const [hMonth, setHMonth] = useState(todayH.month);

  const monthName = lang === 'en' ? MONTH_NAMES_EN[hMonth] : MONTH_NAMES_ID[hMonth];
  const arabicName = MONTH_NAMES_AR[hMonth];
  const days = DAYS_ID; // always use short ID labels for compactness; Jum'at auto-truncates

  const daysInMonth = useMemo(() => hijriDaysInMonth(hYear, hMonth), [hYear, hMonth]);
  const firstDow = useMemo(() => dayOfWeekForHijri1(hYear, hMonth), [hYear, hMonth]);

  const cells = useMemo(() => {
    const arr: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    const rem = arr.length % 7;
    if (rem !== 0) for (let i = 0; i < 7 - rem; i++) arr.push(null);
    return arr;
  }, [firstDow, daysInMonth]);

  const monthEvents = useMemo(
    () =>
      Object.entries(EVENTS)
        .filter(([key]) => key.startsWith(`${hMonth}-`))
        .map(([key, ev]) => ({ day: parseInt(key.split('-')[1], 10), ...ev }))
        .sort((a, b) => a.day - b.day),
    [hMonth]
  );

  const prevMonth = () => {
    if (hMonth === 1) { setHYear(y => y - 1); setHMonth(12); }
    else setHMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (hMonth === 12) { setHYear(y => y + 1); setHMonth(1); }
    else setHMonth(m => m + 1);
  };

  const goToday = () => { setHYear(todayH.year); setHMonth(todayH.month); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700' }}>
            {lang === 'en' ? 'Hijri Calendar' : 'Kalender Hijriah'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>
            {lang === 'en' ? 'Islamic lunar calendar' : 'Kalender Islam'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={goToday}
          style={[styles.todayBtn, { backgroundColor: C.primaryMuted, borderColor: C.primary }]}
        >
          <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '700' }}>
            {lang === 'en' ? 'Today' : 'Hari ini'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Today card */}
        <View style={[styles.todayCard, { backgroundColor: C.primary }]}>
          <Text style={{ color: '#fff', fontSize: 48, fontWeight: '800', lineHeight: 52 }}>
            {todayH.day}
          </Text>
          <View style={{ marginLeft: Spacing.md }}>
            <Text style={{ color: '#ffffffcc', fontSize: FontSize.xs, fontWeight: '600' }}>
              {lang === 'en' ? 'TODAY — HIJRI DATE' : 'HARI INI — TANGGAL HIJRIAH'}
            </Text>
            <Text style={{ color: '#fff', fontSize: FontSize.xl, fontWeight: '700', marginTop: 2 }}>
              {lang === 'en' ? MONTH_NAMES_EN[todayH.month] : MONTH_NAMES_ID[todayH.month]} {todayH.year} H
            </Text>
            <Text style={{ color: '#ffffffbb', fontSize: FontSize.sm, marginTop: 2 }}>
              {MONTH_NAMES_AR[todayH.month]}
            </Text>
            <Text style={{ color: '#ffffffaa', fontSize: FontSize.xs, marginTop: 4 }}>
              {today.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Month Navigation */}
        <View style={[styles.monthNav, { backgroundColor: C.surface, borderColor: C.border }]}>
          <TouchableOpacity onPress={prevMonth} hitSlop={12} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '800' }}>
              {monthName} {hYear} H
            </Text>
            <Text style={{ color: C.textMuted, fontSize: FontSize.sm, marginTop: 2 }}>
              {arabicName}
            </Text>
          </View>
          <TouchableOpacity onPress={nextMonth} hitSlop={12} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <View style={[styles.calendarBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          {/* Weekday headers */}
          <View style={styles.row}>
            {(lang === 'en' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] : DAYS_ID).map((d, i) => (
              <View key={d} style={styles.cell}>
                <Text style={[
                  styles.dayLabel,
                  { color: i === 5 ? C.primary : i === 0 ? '#EF4444' : C.textMuted },
                ]}>
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Rows */}
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={styles.row}>
              {cells.slice(row * 7, row * 7 + 7).map((hd, col) => {
                if (hd === null) return <View key={col} style={styles.cell} />;
                const isToday = hd === todayH.day && hMonth === todayH.month && hYear === todayH.year;
                const event = EVENTS[getEventKey(hMonth, hd)];
                const g = hijriToGregorian(hYear, hMonth, hd);
                const isFriday = col === 5;
                const isSunday = col === 0;
                return (
                  <View key={col} style={styles.cell}>
                    <View style={[
                      styles.dayCell,
                      isToday && { backgroundColor: C.primary },
                    ]}>
                      <Text style={[
                        styles.hijriDay,
                        { color: isToday ? '#fff' : isFriday ? C.primary : isSunday ? '#EF4444' : C.text },
                      ]}>
                        {hd}
                      </Text>
                      <Text style={[
                        styles.gDay,
                        { color: isToday ? '#ffffffaa' : C.textMuted },
                      ]}>
                        {g.day}/{g.month}
                      </Text>
                      {event && (
                        <View style={[styles.eventDot, { backgroundColor: event.color }]} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.primary }]} />
            <Text style={{ color: C.textSecondary, fontSize: FontSize.xs }}>
              {lang === 'en' ? 'Today' : 'Hari ini'}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EC4899' }]} />
            <Text style={{ color: C.textSecondary, fontSize: FontSize.xs }}>
              {lang === 'en' ? 'Islamic event' : 'Hari Islam'}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '700' }}>Jum</Text>
            <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginLeft: 4 }}>
              {lang === 'en' ? 'Friday' : "Jum'at"}
            </Text>
          </View>
        </View>

        {/* Events this month */}
        {monthEvents.length > 0 && (
          <View style={{ paddingHorizontal: Spacing.md }}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>
              {lang === 'en' ? `EVENTS IN ${monthName.toUpperCase()}` : `PERISTIWA BULAN ${monthName.toUpperCase()}`}
            </Text>
            <View style={{ gap: Spacing.sm }}>
              {monthEvents.map(ev => {
                const g = hijriToGregorian(hYear, hMonth, ev.day);
                const label = lang === 'en' ? ev.en : ev.id;
                return (
                  <View key={ev.day}
                    style={[styles.eventRow, { backgroundColor: C.card, borderColor: C.border }]}
                  >
                    <View style={[styles.eventDateBadge, { backgroundColor: `${ev.color}20` }]}>
                      <Text style={{ color: ev.color, fontSize: FontSize.lg, fontWeight: '800' }}>
                        {ev.day}
                      </Text>
                      <Text style={{ color: ev.color, fontSize: 9, fontWeight: '600' }}>
                        {lang === 'en' ? MONTH_NAMES_EN[hMonth].slice(0, 3).toUpperCase() : MONTH_NAMES_ID[hMonth].slice(0, 3).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700' }}>
                        {label}
                      </Text>
                      <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                        {new Date(g.year, g.month - 1, g.day).toLocaleDateString(
                          lang === 'en' ? 'en-US' : 'id-ID',
                          { weekday: 'short', day: 'numeric', month: 'long' }
                        )}
                      </Text>
                    </View>
                    <View style={[styles.eventColorBar, { backgroundColor: ev.color }]} />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Info footer */}
        <View style={[styles.infoBox, { borderColor: C.border }]}>
          <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 11, marginLeft: 5, flex: 1, lineHeight: 16 }}>
            {lang === 'en'
              ? 'Dates use the Tabular Islamic Calendar (civil calculation). Actual crescent sighting may differ by ±1 day.'
              : 'Tanggal menggunakan kalkulasi Kalender Hijriah tabulasi. Penentuan resmi berdasarkan rukyat hilal dapat berbeda ±1 hari.'}
          </Text>
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
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  todayBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  navArrow: {
    padding: Spacing.sm,
  },
  calendarBox: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dayCell: {
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 36,
  },
  hijriDay: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  gDay: {
    fontSize: 9,
    marginTop: 1,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  eventDateBadge: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventColorBar: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

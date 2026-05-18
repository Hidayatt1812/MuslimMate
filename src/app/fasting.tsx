import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { useTranslation } from '@/hooks/useTranslation';
import type { Lang } from '@/constants/i18n';
import {
  DEFAULT_FASTING_REMINDERS,
  FastingReminderPrefs,
  RamadanDay,
  getFastingReminderPrefs,
  getRamadanLog,
  saveFastingReminderPrefs,
  saveRamadanDay,
} from '@/services/storageService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type FastTypeId =
  | 'ramadan'
  | 'senin-kamis'
  | 'ayyamul-bidh'
  | 'syawal'
  | 'arafah'
  | 'tarwiyah'
  | 'asyura'
  | 'qadha'
  | 'nazhir';

type FastingType = {
  id: FastTypeId;
  title: string;
  short: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

type HijriInfo = {
  day: number;
  month: number;
  year?: number;
  label: string;
};

type CalendarDay = {
  date: Date;
  key: string;
  hijri: HijriInfo | null;
  suggestions: FastingType[];
  isToday: boolean;
  logged: boolean;
  blockedLabel?: string;
};

const FASTING_TYPES: FastingType[] = [
  {
    id: 'senin-kamis',
    title: 'Puasa Senin & Kamis',
    short: 'Senin/Kamis',
    desc: 'Puasa sunnah mingguan mengikuti amalan Nabi Muhammad SAW.',
    icon: 'calendar-outline',
    color: '#10B981',
  },
  {
    id: 'ayyamul-bidh',
    title: 'Puasa Ayyamul Bidh',
    short: 'Ayyamul Bidh',
    desc: 'Tanggal 13, 14, dan 15 tiap bulan Hijriah.',
    icon: 'ellipse-outline',
    color: '#06B6D4',
  },
  {
    id: 'syawal',
    title: 'Puasa Syawal',
    short: 'Syawal',
    desc: 'Enam hari di bulan Syawal setelah Idulfitri.',
    icon: 'sparkles-outline',
    color: '#F59E0B',
  },
  {
    id: 'arafah',
    title: 'Puasa Arafah',
    short: 'Arafah',
    desc: 'Tanggal 9 Dzulhijjah bagi yang tidak berhaji.',
    icon: 'flag-outline',
    color: '#8B5CF6',
  },
  {
    id: 'tarwiyah',
    title: 'Puasa Tarwiyah',
    short: 'Tarwiyah',
    desc: 'Tanggal 8 Dzulhijjah, menjelang hari Arafah.',
    icon: 'trail-sign-outline',
    color: '#3B82F6',
  },
  {
    id: 'asyura',
    title: 'Puasa Asyura',
    short: 'Asyura',
    desc: 'Tanggal 10 Muharram dengan keutamaan besar.',
    icon: 'water-outline',
    color: '#14B8A6',
  },
  {
    id: 'ramadan',
    title: 'Puasa Ramadan',
    short: 'Ramadan',
    desc: 'Puasa wajib di bulan Ramadan.',
    icon: 'moon-outline',
    color: '#EF4444',
  },
  {
    id: 'qadha',
    title: 'Qadha Puasa',
    short: 'Qadha',
    desc: 'Mengganti puasa wajib yang pernah tertinggal.',
    icon: 'refresh-outline',
    color: '#64748B',
  },
  {
    id: 'nazhir',
    title: 'Puasa Nazar',
    short: 'Nazar',
    desc: 'Puasa karena nazar pribadi yang wajib dipenuhi.',
    icon: 'ribbon-outline',
    color: '#EC4899',
  },
];

const TYPE_BY_ID = FASTING_TYPES.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {} as Record<FastTypeId, FastingType>);

const FASTING_TYPE_COPY: Record<FastTypeId, Record<Lang, { title: string; short: string; desc: string }>> = {
  'senin-kamis': {
    id: { title: 'Puasa Senin & Kamis', short: 'Senin/Kamis', desc: 'Puasa sunnah mingguan mengikuti amalan Nabi Muhammad SAW.' },
    en: { title: 'Monday & Thursday Fast', short: 'Mon/Thu', desc: 'Weekly sunnah fasting following the practice of Prophet Muhammad SAW.' },
  },
  'ayyamul-bidh': {
    id: { title: 'Puasa Ayyamul Bidh', short: 'Ayyamul Bidh', desc: 'Tanggal 13, 14, dan 15 tiap bulan Hijriah.' },
    en: { title: 'Ayyamul Bidh Fast', short: 'Ayyamul Bidh', desc: 'The 13th, 14th, and 15th of each Hijri month.' },
  },
  syawal: {
    id: { title: 'Puasa Syawal', short: 'Syawal', desc: 'Enam hari di bulan Syawal setelah Idulfitri.' },
    en: { title: 'Shawwal Fast', short: 'Shawwal', desc: 'Six days in Shawwal after Eid al-Fitr.' },
  },
  arafah: {
    id: { title: 'Puasa Arafah', short: 'Arafah', desc: 'Tanggal 9 Dzulhijjah bagi yang tidak berhaji.' },
    en: { title: 'Arafah Fast', short: 'Arafah', desc: 'The 9th of Dhu al-Hijjah for those not performing Hajj.' },
  },
  tarwiyah: {
    id: { title: 'Puasa Tarwiyah', short: 'Tarwiyah', desc: 'Tanggal 8 Dzulhijjah, menjelang hari Arafah.' },
    en: { title: 'Tarwiyah Fast', short: 'Tarwiyah', desc: 'The 8th of Dhu al-Hijjah, before the day of Arafah.' },
  },
  asyura: {
    id: { title: 'Puasa Asyura', short: 'Asyura', desc: 'Tanggal 10 Muharram dengan keutamaan besar.' },
    en: { title: 'Ashura Fast', short: 'Ashura', desc: 'The 10th of Muharram, a day with great virtue.' },
  },
  ramadan: {
    id: { title: 'Puasa Ramadan', short: 'Ramadan', desc: 'Puasa wajib di bulan Ramadan.' },
    en: { title: 'Ramadan Fast', short: 'Ramadan', desc: 'Obligatory fasting in the month of Ramadan.' },
  },
  qadha: {
    id: { title: 'Qadha Puasa', short: 'Qadha', desc: 'Mengganti puasa wajib yang pernah tertinggal.' },
    en: { title: 'Make-up Fast', short: 'Qadha', desc: 'Making up missed obligatory fasts.' },
  },
  nazhir: {
    id: { title: 'Puasa Nazar', short: 'Nazar', desc: 'Puasa karena nazar pribadi yang wajib dipenuhi.' },
    en: { title: 'Vowed Fast', short: 'Vow', desc: 'A personal vowed fast that must be fulfilled.' },
  },
};

const FASTING_TEXT: Record<Lang, Record<string, string>> = {
  id: {
    subtitle: 'Sunnah, wajib, kalender, dan pengingat',
    todayFast: 'PUASA HARI INI',
    hijriUnavailable: 'Tanggal Hijriah belum tersedia',
    monthRecords: 'catatan puasa bulan ini',
    scheduleToday: 'Jadwal Hari Ini',
    reminders: 'Pengingat',
    suhoor: 'Sahur',
    iftar: 'Buka',
    fastingType: 'Jenis Puasa',
    selectedType: 'Jenis yang dipilih',
    tarawihDone: 'Tarawih dicatat',
    recordTarawih: 'Catat Tarawih',
    fastingCalendar: 'Kalender Puasa',
    days21: '21 hari',
    holiday: 'Libur',
    hijriNote: 'Tanggal Hijriah mengikuti kalender perangkat dan bisa berbeda dengan keputusan setempat.',
    thisMonth: 'Bulan ini',
    sunnahFast: 'Puasa sunnah',
    total: 'Total',
    iftarDua: 'DOA BUKA PUASA',
    iftarDuaMeaning: 'Ya Allah, untuk-Mu aku berpuasa, kepada-Mu aku beriman, kepada-Mu aku bertawakkal, dan dengan rezeki-Mu aku berbuka.',
    reminderUnsupportedTitle: 'Pengingat Belum Didukung',
    reminderUnsupportedBody: 'Pengingat lokal hanya tersedia di aplikasi mobile.',
    reminderChannel: 'Pengingat Puasa',
    notificationPermissionTitle: 'Izin Notifikasi Dibutuhkan',
    notificationPermissionBody: 'Aktifkan izin notifikasi agar pengingat puasa bisa berbunyi.',
    suhoorReminderTitle: 'Pengingat Sahur',
    suhoorReminderBody: 'Siapkan sahur. Imsak sekitar',
    iftarReminderTitle: 'Menjelang Buka Puasa',
    iftarReminderBody: 'Buka puasa sekitar',
    iftarReminderTail: 'Siapkan doa dan hidangan.',
    reminderActiveTitle: 'Pengingat Puasa Aktif',
    reminderFailedTitle: 'Gagal Mengatur Pengingat',
    tryAgain: 'Silakan coba lagi.',
  },
  en: {
    subtitle: 'Sunnah, obligatory, calendar, and reminders',
    todayFast: 'TODAY FAST',
    hijriUnavailable: 'Hijri date is not available yet',
    monthRecords: 'fasting records this month',
    scheduleToday: "Today's Schedule",
    reminders: 'Reminders',
    suhoor: 'Suhoor',
    iftar: 'Iftar',
    fastingType: 'Fasting Type',
    selectedType: 'Selected type',
    tarawihDone: 'Tarawih recorded',
    recordTarawih: 'Record Tarawih',
    fastingCalendar: 'Fasting Calendar',
    days21: '21 days',
    holiday: 'Holiday',
    hijriNote: 'Hijri dates follow the device calendar and may differ from local official decisions.',
    thisMonth: 'This month',
    sunnahFast: 'Sunnah fasts',
    total: 'Total',
    iftarDua: 'DUA FOR BREAKING FAST',
    iftarDuaMeaning: 'O Allah, for You I have fasted, in You I believe, upon You I rely, and with Your provision I break my fast.',
    reminderUnsupportedTitle: 'Reminders Not Supported',
    reminderUnsupportedBody: 'Local reminders are only available in the mobile app.',
    reminderChannel: 'Fasting Reminders',
    notificationPermissionTitle: 'Notification Permission Needed',
    notificationPermissionBody: 'Enable notifications so fasting reminders can play.',
    suhoorReminderTitle: 'Suhoor Reminder',
    suhoorReminderBody: 'Prepare suhoor. Imsak is around',
    iftarReminderTitle: 'Approaching Iftar',
    iftarReminderBody: 'Iftar is around',
    iftarReminderTail: 'Prepare your dua and meal.',
    reminderActiveTitle: 'Fasting Reminders Active',
    reminderFailedTitle: 'Failed to Set Reminder',
    tryAgain: 'Please try again.',
  },
};

const IFTAR_DUA_ARABIC = '\u0627\u0644\u0644\u0651\u064e\u0647\u064f\u0645\u0651\u064e \u0644\u064e\u0643\u064e \u0635\u064f\u0645\u0652\u062a\u064f \u0648\u064e\u0628\u0650\u0643\u064e \u0622\u0645\u064e\u0646\u0652\u062a\u064f \u0648\u064e\u0639\u064e\u0644\u064e\u064a\u0652\u0643\u064e \u062a\u064e\u0648\u064e\u0643\u0651\u064e\u0644\u0652\u062a\u064f \u0648\u064e\u0639\u064e\u0644\u064e\u0649 \u0631\u0650\u0632\u0652\u0642\u0650\u0643\u064e \u0623\u064e\u0641\u0652\u0637\u064e\u0631\u0652\u062a\u064f';

const HIJRI_MONTHS_ID = [
  '',
  'Muharram',
  'Safar',
  'Rabiul Awal',
  'Rabiul Akhir',
  'Jumadil Awal',
  'Jumadil Akhir',
  'Rajab',
  'Syaban',
  'Ramadan',
  'Syawal',
  'Dzulqaidah',
  'Dzulhijjah',
];

const NOTIFICATION_CHANNEL_ID = 'fasting-reminders';

const pad2 = (value: number) => String(value).padStart(2, '0');

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseClockToMinutes = (time?: string | null): number | null => {
  const match = String(time ?? '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
};

const addMinutes = (minutes: number, delta: number) => {
  const day = 24 * 60;
  return ((minutes + delta) % day + day) % day;
};

const formatClock = (minutes: number | null) => {
  if (minutes === null) return '--:--';
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
};

const getHijriInfoFromIntl = (date: Date): HijriInfo | null => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    const day = Number(parts.find(part => part.type === 'day')?.value);
    const month = Number(parts.find(part => part.type === 'month')?.value);
    const year = Number(parts.find(part => part.type === 'year')?.value);
    if (!Number.isFinite(day) || !Number.isFinite(month)) return null;
    return {
      day,
      month,
      year: Number.isFinite(year) ? year : undefined,
      label: `${day} ${HIJRI_MONTHS_ID[month] ?? 'Hijriah'}`,
    };
  } catch {
    return null;
  }
};

const getTodayHijriFromPrayerData = (prayerData: ReturnType<typeof usePrayerTimes>['prayerData']): HijriInfo | null => {
  const hijri = prayerData?.date?.hijri;
  const day = Number(hijri?.day);
  const month = Number(hijri?.month?.number);
  const year = Number(hijri?.year);
  if (!Number.isFinite(day) || !Number.isFinite(month) || month <= 0) {
    return getHijriInfoFromIntl(new Date());
  }
  return {
    day,
    month,
    year: Number.isFinite(year) ? year : undefined,
    label: `${day} ${HIJRI_MONTHS_ID[month] ?? hijri?.month?.en ?? 'Hijriah'}`,
  };
};

const getBlockedFastLabel = (hijri: HijriInfo | null): string | undefined => {
  if (!hijri) return undefined;
  if (hijri.month === 10 && hijri.day === 1) return 'Idulfitri';
  if (hijri.month === 12 && hijri.day >= 10 && hijri.day <= 13) return 'Iduladha/Tasyrik';
  return undefined;
};

const getFastSuggestions = (date: Date, hijri: HijriInfo | null): FastingType[] => {
  if (getBlockedFastLabel(hijri)) return [];
  const ids: FastTypeId[] = [];
  const weekday = date.getDay();

  if (hijri?.month === 9) ids.push('ramadan');
  if (weekday === 1 || weekday === 4) ids.push('senin-kamis');
  if (hijri?.day === 13 || hijri?.day === 14 || hijri?.day === 15) ids.push('ayyamul-bidh');
  if (hijri?.month === 10 && hijri.day > 1) ids.push('syawal');
  if (hijri?.month === 12 && hijri.day === 8) ids.push('tarwiyah');
  if (hijri?.month === 12 && hijri.day === 9) ids.push('arafah');
  if (hijri?.month === 1 && hijri.day === 10) ids.push('asyura');

  return Array.from(new Set(ids)).map(id => TYPE_BY_ID[id]);
};

const getDefaultFastType = (suggestions: FastingType[]): FastTypeId =>
  suggestions[0]?.id ?? 'senin-kamis';

const cancelNotificationIds = async (ids: string[]) => {
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
};

export default function FastingScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, lang } = useTranslation();
  const copy = FASTING_TEXT[lang];
  const { prayerData } = usePrayerTimes();
  const [todayLog, setTodayLog] = useState<RamadanDay | null>(null);
  const [log, setLog] = useState<RamadanDay[]>([]);
  const [selectedFastType, setSelectedFastType] = useState<FastTypeId>('senin-kamis');
  const [showFastTypeDropdown, setShowFastTypeDropdown] = useState(false);
  const [reminderPrefs, setReminderPrefs] = useState<FastingReminderPrefs>(DEFAULT_FASTING_REMINDERS);
  const [refreshing, setRefreshing] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);

  const today = useMemo(() => getDateKey(new Date()), []);
  const timings = prayerData?.timings as any;
  const fajrMinutes = parseClockToMinutes(timings?.Fajr);
  const maghribMinutes = parseClockToMinutes(timings?.Maghrib);
  const imsakMinutes = fajrMinutes === null ? null : addMinutes(fajrMinutes, -10);
  const suhoorReminderMinutes = imsakMinutes === null
    ? null
    : addMinutes(imsakMinutes, -reminderPrefs.suhoorMinutesBeforeImsak);
  const iftarReminderMinutes = maghribMinutes === null
    ? null
    : addMinutes(maghribMinutes, -reminderPrefs.iftarMinutesBeforeMaghrib);

  const todayHijri = useMemo(() => getTodayHijriFromPrayerData(prayerData), [prayerData]);
  const todaySuggestions = useMemo(() => getFastSuggestions(new Date(), todayHijri), [todayHijri]);
  const isRamadanToday = todaySuggestions.some(item => item.id === 'ramadan');

  const loadData = useCallback(async () => {
    const [fullLog, prefs] = await Promise.all([
      getRamadanLog(),
      getFastingReminderPrefs(),
    ]);
    const todayEntry = fullLog.find(day => day.date === today);
    const fallbackType = getDefaultFastType(getFastSuggestions(new Date(), getTodayHijriFromPrayerData(prayerData)));
    setLog(fullLog);
    setTodayLog(todayEntry ?? { date: today, fasted: false, tarawihDone: false, fastType: fallbackType });
    setSelectedFastType((todayEntry?.fastType as FastTypeId | undefined) ?? fallbackType);
    setReminderPrefs(prefs);
  }, [today, prayerData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData().catch(() => {});
  }, [loadData]);

  const fastingStats = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    const fasted = log.filter(item => item.fasted);
    return {
      total: fasted.length,
      thisMonth: fasted.filter(item => item.date.startsWith(monthPrefix)).length,
      sunnah: fasted.filter(item => item.fastType && item.fastType !== 'ramadan').length,
    };
  }, [log]);

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const entries = new Map(log.map(item => [item.date, item]));
    const days: CalendarDay[] = [];
    for (let offset = 0; offset < 21; offset += 1) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() + offset);
      const key = getDateKey(date);
      const hijri = offset === 0 ? todayHijri : getHijriInfoFromIntl(date);
      days.push({
        date,
        key,
        hijri,
        suggestions: getFastSuggestions(date, hijri),
        isToday: key === today,
        logged: !!entries.get(key)?.fasted,
        blockedLabel: getBlockedFastLabel(hijri),
      });
    }
    return days;
  }, [log, today, todayHijri]);

  const timeSlots = [
    { label: 'Imsak', time: formatClock(imsakMinutes), icon: 'moon-outline' as const, color: C.gold },
    { label: lang === 'en' ? 'Fajr' : 'Subuh', time: timings?.Fajr?.slice(0, 5) ?? '--:--', icon: 'sunny-outline' as const, color: C.primary },
    { label: copy.iftar, time: timings?.Maghrib?.slice(0, 5) ?? '--:--', icon: 'restaurant-outline' as const, color: C.error },
  ];

  const getFastTypeCopy = (id: FastTypeId) => FASTING_TYPE_COPY[id][lang];

  const persistToday = async (updates: Partial<RamadanDay>) => {
    const current = todayLog ?? { date: today, fasted: false, tarawihDone: false };
    const updated: RamadanDay = {
      ...current,
      ...updates,
      fastType: (updates.fastType ?? current.fastType ?? selectedFastType) as string,
    };
    setTodayLog(updated);
    await saveRamadanDay(updated);
    const fullLog = await getRamadanLog();
    setLog(fullLog);
  };

  const toggleFast = async () => {
    const nextFasted = !todayLog?.fasted;
    await persistToday({
      fasted: nextFasted,
      fastType: selectedFastType,
      suhoorTime: formatClock(imsakMinutes),
      iftarTime: timings?.Maghrib?.slice(0, 5),
    });
  };

  const toggleTarawih = async () => {
    await persistToday({ tarawihDone: !todayLog?.tarawihDone });
  };

  const chooseFastType = async (id: FastTypeId) => {
    setSelectedFastType(id);
    setShowFastTypeDropdown(false);
    if (todayLog?.fasted) {
      await persistToday({ fastType: id });
    }
  };

  const ensureNotificationAccess = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(copy.reminderUnsupportedTitle, copy.reminderUnsupportedBody);
      return false;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: copy.reminderChannel,
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const finalStatus = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!finalStatus.granted) {
      Alert.alert(copy.notificationPermissionTitle, copy.notificationPermissionBody);
      return false;
    }
    return true;
  };

  const setReminderEnabled = async (enabled: boolean) => {
    if (reminderBusy) return;
    setReminderBusy(true);
    try {
      await cancelNotificationIds(reminderPrefs.notificationIds);
      if (!enabled) {
        const nextPrefs = { ...reminderPrefs, enabled: false, notificationIds: [] };
        setReminderPrefs(nextPrefs);
        await saveFastingReminderPrefs(nextPrefs);
        return;
      }

      const allowed = await ensureNotificationAccess();
      if (!allowed) return;

      const notificationIds: string[] = [];
      if (suhoorReminderMinutes !== null) {
        notificationIds.push(await Notifications.scheduleNotificationAsync({
          content: {
            title: copy.suhoorReminderTitle,
            body: `${copy.suhoorReminderBody} ${formatClock(imsakMinutes)}.`,
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: Math.floor(suhoorReminderMinutes / 60),
            minute: suhoorReminderMinutes % 60,
            channelId: NOTIFICATION_CHANNEL_ID,
          },
        }));
      }
      if (iftarReminderMinutes !== null) {
        notificationIds.push(await Notifications.scheduleNotificationAsync({
          content: {
            title: copy.iftarReminderTitle,
            body: `${copy.iftarReminderBody} ${formatClock(maghribMinutes)}. ${copy.iftarReminderTail}`,
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: Math.floor(iftarReminderMinutes / 60),
            minute: iftarReminderMinutes % 60,
            channelId: NOTIFICATION_CHANNEL_ID,
          },
        }));
      }

      const nextPrefs = { ...reminderPrefs, enabled: true, notificationIds };
      setReminderPrefs(nextPrefs);
      await saveFastingReminderPrefs(nextPrefs);
      Alert.alert(
        copy.reminderActiveTitle,
        `${copy.suhoor}: ${formatClock(suhoorReminderMinutes)}\n${copy.iftar}: ${formatClock(iftarReminderMinutes)}`
      );
    } catch (e: any) {
      Alert.alert(copy.reminderFailedTitle, e?.message ?? copy.tryAgain);
    } finally {
      setReminderBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800' }}>{t('qaction_ramadan')}</Text>
          <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 1 }} numberOfLines={1}>
            {copy.subtitle}
          </Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: `${C.primary}18`, borderColor: `${C.primary}35` }]}>
          <Ionicons name="notifications-outline" size={14} color={C.primary} />
          <Text style={{ color: C.primary, fontSize: 10, fontWeight: '800', marginLeft: 4 }}>
            {reminderPrefs.enabled ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 }}
      >
        <Card style={{ backgroundColor: C.primaryMuted, borderWidth: 1, borderColor: `${C.primary}30` }}>
          <View style={styles.todayTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1 }}>
                {copy.todayFast}
              </Text>
              <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800', marginTop: 6 }}>
                {getFastTypeCopy(selectedFastType).title}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, marginTop: 4, lineHeight: 20 }}>
                {todayHijri?.label ?? copy.hijriUnavailable} · {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={toggleFast}
              activeOpacity={0.78}
              style={[styles.bigCheck, {
                backgroundColor: todayLog?.fasted ? C.primary : C.card,
                borderColor: todayLog?.fasted ? C.primary : `${C.primary}55`,
              }]}
            >
              <Ionicons name={todayLog?.fasted ? 'checkmark' : 'add'} size={24} color={todayLog?.fasted ? '#fff' : C.primary} />
            </TouchableOpacity>
          </View>
          <ProgressBar
            progress={fastingStats.thisMonth / 12}
            height={8}
            style={{ marginTop: Spacing.md }}
            label={`${fastingStats.thisMonth} ${copy.monthRecords}`}
          />
        </Card>

        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="time-outline" size={18} color={C.primary} />
              <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '800' }}>{copy.scheduleToday}</Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 10 }}>{prayerData?.date?.readable ?? ''}</Text>
          </View>
          <View style={styles.timeGrid}>
            {timeSlots.map(item => (
              <View key={item.label} style={[styles.timeCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Ionicons name={item.icon} size={21} color={item.color} />
                <Text style={{ color: item.color, fontSize: FontSize.xl, fontWeight: '900', marginTop: 4 }}>{item.time}</Text>
                <Text style={{ color: C.textSecondary, fontSize: FontSize.xs }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="notifications-outline" size={18} color={C.gold} />
              <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '800' }}>{copy.reminders}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setReminderEnabled(!reminderPrefs.enabled)}
              disabled={reminderBusy}
              activeOpacity={0.8}
              style={[styles.toggle, { backgroundColor: reminderPrefs.enabled ? C.primary : C.border, opacity: reminderBusy ? 0.6 : 1 }]}
            >
              <View style={[styles.toggleThumb, { transform: [{ translateX: reminderPrefs.enabled ? 20 : 2 }] }]} />
            </TouchableOpacity>
          </View>
          <View style={styles.reminderRow}>
            <View style={[styles.reminderItem, { borderColor: C.border, backgroundColor: C.surface }]}>
              <Ionicons name="alarm-outline" size={17} color={C.gold} />
              <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700', marginTop: 5 }}>{copy.suhoor}</Text>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                {formatClock(suhoorReminderMinutes)}
              </Text>
            </View>
            <View style={[styles.reminderItem, { borderColor: C.border, backgroundColor: C.surface }]}>
              <Ionicons name="restaurant-outline" size={17} color={C.error} />
              <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700', marginTop: 5 }}>{copy.iftar}</Text>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                {formatClock(iftarReminderMinutes)}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHeader}>
            <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '800' }}>{copy.fastingType}</Text>
            {isRamadanToday && (
              <TouchableOpacity onPress={toggleTarawih} style={[styles.tarawihChip, { backgroundColor: todayLog?.tarawihDone ? C.primary : C.surface, borderColor: C.border }]}>
                <Text style={{ color: todayLog?.tarawihDone ? '#fff' : C.primary, fontSize: 10, fontWeight: '800' }}>
                  {todayLog?.tarawihDone ? copy.tarawihDone : copy.recordTarawih}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowFastTypeDropdown(value => !value)}
            activeOpacity={0.78}
            style={[styles.fastTypeSelect, { backgroundColor: C.surface, borderColor: C.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '800' }}>{copy.selectedType}</Text>
              <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '800', marginTop: 3 }}>
                {getFastTypeCopy(selectedFastType).title}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 3, lineHeight: 16 }}>
                {getFastTypeCopy(selectedFastType).desc}
              </Text>
            </View>
            <Text style={{ color: C.primary, fontSize: 12, fontWeight: '800', marginLeft: 12 }}>
              {showFastTypeDropdown ? t('close') : t('choose')}
            </Text>
          </TouchableOpacity>
          {showFastTypeDropdown && (
            <View style={[styles.fastTypeDropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
              {FASTING_TYPES.map((type, index) => {
                const active = selectedFastType === type.id;
                const suggested = todaySuggestions.some(item => item.id === type.id);
                return (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => chooseFastType(type.id)}
                    activeOpacity={0.78}
                    style={[
                      styles.fastTypeOption,
                      {
                        backgroundColor: active ? `${C.primary}12` : C.surface,
                        borderBottomColor: C.border,
                      },
                      index === FASTING_TYPES.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: active ? C.primary : C.text, fontSize: FontSize.sm, fontWeight: '800' }}>
                        {getFastTypeCopy(type.id).title}
                      </Text>
                      <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 16 }}>
                        {getFastTypeCopy(type.id).desc}
                      </Text>
                    </View>
                    {(active || suggested) && (
                      <Text style={{ color: active ? C.primary : type.color, fontSize: 10, fontWeight: '800', marginLeft: 10 }}>
                        {active ? t('selected') : t('today')}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={C.primary} />
              <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '800' }}>{copy.fastingCalendar}</Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 10 }}>{copy.days21}</Text>
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map(day => {
              const primary = day.suggestions[0];
              return (
                <View
                  key={day.key}
                  style={[styles.dayCell, {
                    backgroundColor: day.isToday ? `${C.primary}18` : C.surface,
                    borderColor: day.logged ? C.primary : day.isToday ? `${C.primary}55` : C.border,
                  }]}
                >
                  <Text style={{ color: day.isToday ? C.primary : C.textMuted, fontSize: 9, fontWeight: '800' }}>
                    {day.date.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { weekday: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '900', marginTop: 2 }}>
                    {day.date.getDate()}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 8, marginTop: 1 }} numberOfLines={1}>
                    {day.hijri ? `${day.hijri.day} H` : '-'}
                  </Text>
                  {day.logged ? (
                    <Ionicons name="checkmark-circle" size={14} color={C.primary} style={{ marginTop: 5 }} />
                  ) : day.blockedLabel ? (
                    <Text style={{ color: C.error, fontSize: 8, marginTop: 5 }} numberOfLines={1}>{copy.holiday}</Text>
                  ) : primary ? (
                    <View style={[styles.dayDot, { backgroundColor: primary.color }]} />
                  ) : (
                    <View style={[styles.dayDot, { backgroundColor: 'transparent' }]} />
                  )}
                </View>
              );
            })}
          </View>
          <Text style={{ color: C.textMuted, fontSize: 10, lineHeight: 16, marginTop: Spacing.sm }}>
            {copy.hijriNote}
          </Text>
        </Card>

        <Card>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={{ color: C.primary, fontSize: FontSize.xxl, fontWeight: '900' }}>{fastingStats.thisMonth}</Text>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.xs }}>{copy.thisMonth}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.statBox}>
              <Text style={{ color: C.gold, fontSize: FontSize.xxl, fontWeight: '900' }}>{fastingStats.sunnah}</Text>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.xs }}>{copy.sunnahFast}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.statBox}>
              <Text style={{ color: C.text, fontSize: FontSize.xxl, fontWeight: '900' }}>{fastingStats.total}</Text>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.xs }}>{copy.total}</Text>
            </View>
          </View>
        </Card>

        <Card style={{ borderLeftWidth: 3, borderLeftColor: C.gold }}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="book-outline" size={16} color={C.gold} />
            <Text style={{ color: C.gold, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1 }}>
              {copy.iftarDua}
            </Text>
          </View>
          <Text style={[styles.duaArabic, { color: C.text }]}>
            {IFTAR_DUA_ARABIC}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, lineHeight: 20 }}>
            {copy.iftarDuaMeaning}
          </Text>
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
  backBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  todayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bigCheck: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  reminderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  reminderItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  tarawihChip: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  fastTypeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  fastTypeDropdown: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  fastTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayCell: {
    width: '13.25%',
    minHeight: 92,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 46,
  },
  duaArabic: {
    fontSize: 25,
    textAlign: 'right',
    lineHeight: 48,
    fontFamily: 'serif',
    marginVertical: Spacing.sm,
  },
});

import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_QURAN_OFFLINE_PREFIXES = [
  'muslimmate_quran_offline_v1:surah:',
  'muslimmate_quran_offline_v1:translit:',
  'muslimmate_quran_offline_v1:wbw:',
  'muslimmate_quran_offline_v1:timing:',
  'muslimmate_quran_offline_v1:auto_status',
];
let legacyQuranOfflineCleanupTried = false;

const isSqliteFullError = (error: unknown): boolean =>
  /SQLITE_FULL|database or disk is full/i.test(String(error ?? ''));

export async function purgeLegacyQuranOfflineAsyncStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const targets = keys.filter(key =>
      LEGACY_QURAN_OFFLINE_PREFIXES.some(prefix => key.startsWith(prefix))
    );
    if (!targets.length) return;
    const chunkSize = 200;
    for (let i = 0; i < targets.length; i += chunkSize) {
      await AsyncStorage.multiRemove(targets.slice(i, i + chunkSize));
    }
  } catch {
    // best effort cleanup only
  }
}

// Keys
export const STORAGE_KEYS = {
  BOOKMARKS: 'muslimmate_bookmarks',
  LAST_READ: 'muslimmate_last_read',
  TRACKER: 'muslimmate_tracker',
  STREAK: 'muslimmate_streak',
  TAHFIDZ: 'muslimmate_tahfidz',
  SETTINGS: 'muslimmate_settings',
  LOCATION: 'muslimmate_location',
  DAILY_VERSE: 'muslimmate_daily_verse',
  AI_CHAT: 'muslimmate_ai_chat',
  ONBOARDING_DONE: 'muslimmate_onboarding_done_v1',
  RAMADAN_LOG: 'muslimmate_ramadan_log',
  FASTING_REMINDERS: 'muslimmate_fasting_reminders',
  DHIKR_HISTORY: 'muslimmate_dhikr_history',
  SUPPORT_SUBMISSIONS: 'muslimmate_support_submissions',
};

// Generic get/set
export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (!legacyQuranOfflineCleanupTried && isSqliteFullError(e)) {
      legacyQuranOfflineCleanupTried = true;
      await purgeLegacyQuranOfflineAsyncStorage();
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
        return;
      } catch {
        // fallthrough to console error below
      }
    }
    console.error('Storage setItem error:', e);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error('Storage removeItem error:', e);
  }
}

// Bookmarks
export interface BookmarkItem {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  arabicText: string;
  translation: string;
  kind?: 'ayah' | 'surah';
  groupName?: string;
  savedAt: string;
}

const normalizeBookmarkKind = (bookmark: BookmarkItem): 'ayah' | 'surah' =>
  bookmark.kind ?? (bookmark.ayahNumber === 0 ? 'surah' : 'ayah');

export async function getBookmarks(): Promise<BookmarkItem[]> {
  const raw = (await getItem<BookmarkItem[]>(STORAGE_KEYS.BOOKMARKS)) ?? [];
  return raw.map(b => ({ ...b, kind: normalizeBookmarkKind(b) }));
}

export async function addBookmark(bookmark: BookmarkItem): Promise<void> {
  const nextKind = normalizeBookmarkKind(bookmark);
  const normalizedBookmark: BookmarkItem = {
    ...bookmark,
    kind: nextKind,
    groupName: bookmark.groupName?.trim() || undefined,
  };
  const existing = await getBookmarks();
  const filtered = existing.filter(
    b => !(
      b.surahNumber === normalizedBookmark.surahNumber &&
      b.ayahNumber === normalizedBookmark.ayahNumber &&
      normalizeBookmarkKind(b) === nextKind
    )
  );
  await setItem(STORAGE_KEYS.BOOKMARKS, [normalizedBookmark, ...filtered]);
}

export async function removeBookmark(
  surahNumber: number,
  ayahNumber: number,
  kind?: 'ayah' | 'surah'
): Promise<void> {
  const existing = await getBookmarks();
  const filtered = existing.filter(
    b => !(
      b.surahNumber === surahNumber &&
      b.ayahNumber === ayahNumber &&
      (!kind || normalizeBookmarkKind(b) === kind)
    )
  );
  await setItem(STORAGE_KEYS.BOOKMARKS, filtered);
}

export async function isBookmarked(
  surahNumber: number,
  ayahNumber: number,
  kind?: 'ayah' | 'surah'
): Promise<boolean> {
  const bookmarks = await getBookmarks();
  return bookmarks.some(
    b =>
      b.surahNumber === surahNumber &&
      b.ayahNumber === ayahNumber &&
      (!kind || normalizeBookmarkKind(b) === kind)
  );
}

// Last Read
export interface LastReadData {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  readAt: string;
}

export async function getLastRead(): Promise<LastReadData | null> {
  return getItem<LastReadData>(STORAGE_KEYS.LAST_READ);
}

export async function setLastRead(data: LastReadData): Promise<void> {
  return setItem(STORAGE_KEYS.LAST_READ, data);
}

// Daily Tracker
export interface DailyTracker {
  date: string;
  prayers: Record<string, boolean>;
  quran: boolean;
  dhikr: boolean;
  fasting?: boolean;
}

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getTodayTracker(): Promise<DailyTracker> {
  const all = (await getItem<Record<string, DailyTracker>>(STORAGE_KEYS.TRACKER)) ?? {};
  const today = getTodayKey();
  return all[today] ?? {
    date: today,
    prayers: { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false },
    quran: false,
    dhikr: false,
    fasting: false,
  };
}

export async function updateTodayTracker(updates: Partial<DailyTracker>): Promise<void> {
  const all = (await getItem<Record<string, DailyTracker>>(STORAGE_KEYS.TRACKER)) ?? {};
  const today = getTodayKey();
  const current = all[today] ?? {
    date: today,
    prayers: { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false },
    quran: false,
    dhikr: false,
    fasting: false,
  };
  all[today] = { ...current, ...updates };
  await setItem(STORAGE_KEYS.TRACKER, all);
}

export async function getWeekTracker(): Promise<DailyTracker[]> {
  const all = (await getItem<Record<string, DailyTracker>>(STORAGE_KEYS.TRACKER)) ?? {};
  const result: DailyTracker[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push(all[key] ?? {
      date: key,
      prayers: { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false },
      quran: false,
      dhikr: false,
    });
  }
  return result;
}

// Streak
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalDays: number;
  badges: string[];
}

export async function getStreak(): Promise<StreakData> {
  return (await getItem<StreakData>(STORAGE_KEYS.STREAK)) ?? {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    totalDays: 0,
    badges: [],
  };
}

export async function updateStreak(): Promise<StreakData> {
  const streak = await getStreak();
  const today = getTodayKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  if (streak.lastActiveDate === today) return streak;

  let newStreak = 1;
  if (streak.lastActiveDate === yesterdayKey) {
    newStreak = streak.currentStreak + 1;
  }

  const badges = [...streak.badges];
  if (newStreak === 7 && !badges.includes('week_warrior')) badges.push('week_warrior');
  if (newStreak === 30 && !badges.includes('month_master')) badges.push('month_master');
  if (newStreak === 100 && !badges.includes('century_champion')) badges.push('century_champion');

  const updated: StreakData = {
    currentStreak: newStreak,
    longestStreak: Math.max(streak.longestStreak, newStreak),
    lastActiveDate: today,
    totalDays: streak.totalDays + 1,
    badges,
  };
  await setItem(STORAGE_KEYS.STREAK, updated);
  return updated;
}

// Settings
export interface AppSettings {
  location: { latitude: number; longitude: number; city: string } | null;
  prayerMethod: number;
  notificationsEnabled: boolean;
  theme: 'dark' | 'light' | 'system';
  language: 'id' | 'en';
  aiApiKey: string;
  aiBaseUrl: string;
  defaultReciter: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  location: null,
  prayerMethod: 11,
  notificationsEnabled: true,
  theme: 'dark',
  language: 'id',
  aiApiKey: '',
  aiBaseUrl: 'https://api.openai.com/v1',
  defaultReciter: 'Alafasy_128kbps',
};

export async function getSettings(): Promise<AppSettings> {
  const saved = await getItem<Partial<AppSettings>>(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await setItem(STORAGE_KEYS.SETTINGS, { ...current, ...updates });
}

export async function isOnboardingDone(): Promise<boolean> {
  return (await getItem<boolean>(STORAGE_KEYS.ONBOARDING_DONE)) === true;
}

export async function setOnboardingDone(done = true): Promise<void> {
  await setItem(STORAGE_KEYS.ONBOARDING_DONE, done);
}

// Tahfidz
export interface TahfidzPlan {
  id: string;
  surahNumber: number;
  surahName: string;
  targetAyahs: number[];
  memorizedAyahs: number[];
  dailyTarget: number;
  createdAt: string;
  lastStudied: string;
}

export async function getTahfidzPlans(): Promise<TahfidzPlan[]> {
  return (await getItem<TahfidzPlan[]>(STORAGE_KEYS.TAHFIDZ)) ?? [];
}

export async function saveTahfidzPlan(plan: TahfidzPlan): Promise<void> {
  const plans = await getTahfidzPlans();
  const idx = plans.findIndex(p => p.id === plan.id);
  if (idx >= 0) plans[idx] = plan;
  else plans.unshift(plan);
  await setItem(STORAGE_KEYS.TAHFIDZ, plans);
}

export async function deleteTahfidzPlan(id: string): Promise<void> {
  const plans = await getTahfidzPlans();
  await setItem(STORAGE_KEYS.TAHFIDZ, plans.filter(p => p.id !== id));
}

// Ramadan Log
export interface RamadanDay {
  date: string;
  fasted: boolean;
  fastType?: string;
  suhoorTime?: string;
  iftarTime?: string;
  tarawihDone: boolean;
  notes?: string;
}

export type FastingDay = RamadanDay;

export interface FastingReminderPrefs {
  enabled: boolean;
  suhoorMinutesBeforeImsak: number;
  iftarMinutesBeforeMaghrib: number;
  notificationIds: string[];
  updatedAt?: string;
}

export const DEFAULT_FASTING_REMINDERS: FastingReminderPrefs = {
  enabled: false,
  suhoorMinutesBeforeImsak: 40,
  iftarMinutesBeforeMaghrib: 10,
  notificationIds: [],
};

export async function getRamadanLog(): Promise<RamadanDay[]> {
  return (await getItem<RamadanDay[]>(STORAGE_KEYS.RAMADAN_LOG)) ?? [];
}

export async function saveRamadanDay(day: RamadanDay): Promise<void> {
  const log = await getRamadanLog();
  const idx = log.findIndex(d => d.date === day.date);
  if (idx >= 0) log[idx] = day;
  else log.push(day);
  await setItem(STORAGE_KEYS.RAMADAN_LOG, log);
}

export async function getFastingReminderPrefs(): Promise<FastingReminderPrefs> {
  const saved = await getItem<Partial<FastingReminderPrefs>>(STORAGE_KEYS.FASTING_REMINDERS);
  return {
    ...DEFAULT_FASTING_REMINDERS,
    ...saved,
    notificationIds: Array.isArray(saved?.notificationIds) ? saved.notificationIds : [],
  };
}

export async function saveFastingReminderPrefs(prefs: FastingReminderPrefs): Promise<void> {
  await setItem(STORAGE_KEYS.FASTING_REMINDERS, {
    ...prefs,
    updatedAt: new Date().toISOString(),
  });
}

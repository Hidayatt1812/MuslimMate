import AsyncStorage from '@react-native-async-storage/async-storage';

import { JUZ_LIST } from '@/constants/juz';
import { SURAH_LIST } from '@/constants/surah';

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
  QURAN_READING: 'muslimmate_quran_reading_v1',
  QURAN_NOTES: 'muslimmate_quran_notes_v1',
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

// Quran Reading Progress
export interface QuranReadingSession {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  surahNumber: number;
  surahName: string;
  startAyah: number;
  lastAyah: number;
  versesRead: number;
  verseKeys: string[];
  juzNumbers: number[];
  pageNumbers: number[];
}

export type QuranCompletionGoalType = 'khatam' | 'pages' | 'juz';

export interface QuranReadingGoal {
  weeklyDaysTarget: number;
  weeklyMinutesTarget: number;
  completionType: QuranCompletionGoalType;
  startedAt: string;
  khatamDays: number;
  dailyPagesTarget: number;
  targetJuz: number;
  targetDays: number;
}

export interface QuranReadingPopularItem {
  id: string;
  label: string;
  count: number;
  durationSeconds: number;
  versesRead: number;
  lastReadAt: string;
}

export interface QuranReadingSummary {
  goal: QuranReadingGoal;
  today: {
    date: string;
    durationSeconds: number;
    versesRead: number;
    sessions: number;
    lastSurahNumber: number | null;
    lastSurahName: string;
    lastAyah: number | null;
  };
  weekly: {
    days: string[];
    activeDays: number;
    durationSeconds: number;
    versesRead: number;
    sessions: number;
    dayProgress: number;
    minuteProgress: number;
  };
  completion: {
    type: QuranCompletionGoalType;
    startedAt: string;
    dueDate: string;
    elapsedDays: number;
    remainingDays: number;
    progress: number;
    completed: number;
    target: number;
    dailyTarget: number;
    todayCompleted: number;
    todayTarget: number;
    targetJuz: number;
  };
  streak: {
    current: number;
    longest: number;
    totalActiveDays: number;
  };
  popularSurahs: QuranReadingPopularItem[];
  popularJuz: QuranReadingPopularItem[];
  recentSessions: QuranReadingSession[];
}

interface QuranReadingStore {
  sessions: QuranReadingSession[];
  goal: QuranReadingGoal;
}

const DEFAULT_QURAN_READING_GOAL: QuranReadingGoal = {
  weeklyDaysTarget: 5,
  weeklyMinutesTarget: 60,
  completionType: 'khatam',
  startedAt: '',
  khatamDays: 30,
  dailyPagesTarget: 1,
  targetJuz: 30,
  targetDays: 14,
};

const QURAN_SESSION_IDLE_GAP_MS = 20 * 60 * 1000;
const QURAN_INITIAL_SESSION_SECONDS = 30;
const QURAN_MIN_ACTIVITY_SECONDS = 8;
const QURAN_MAX_ACTIVITY_SECONDS = 180;
const QURAN_MAX_STORED_SESSIONS = 500;
const TOTAL_QURAN_AYAHS = SURAH_LIST.reduce((sum, surah) => sum + surah.ayahCount, 0);
const TOTAL_QURAN_PAGES = 604;

const getLocalDateKey = (date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDaysToDateKey = (dateKey: string, delta: number): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + delta);
  return getLocalDateKey(date);
};

const getRecentDateKeys = (count: number, endDate = new Date()): string[] => {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    out.push(getLocalDateKey(d));
  }
  return out;
};

const diffDateKeys = (fromKey: string, toKey: string): number => {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const from = new Date(fy, (fm || 1) - 1, fd || 1).getTime();
  const to = new Date(ty, (tm || 1) - 1, td || 1).getTime();
  return Math.floor((to - from) / 86400000);
};

const getGlobalAyahNumber = (surahNumber: number, ayahNumber: number): number => {
  let offset = 0;
  for (const surah of SURAH_LIST) {
    if (surah.number === surahNumber) {
      return offset + Math.min(Math.max(1, ayahNumber), surah.ayahCount);
    }
    offset += surah.ayahCount;
  }
  return Math.min(Math.max(1, ayahNumber), TOTAL_QURAN_AYAHS);
};

const estimatePageNumber = (surahNumber: number, ayahNumber: number, pageNumber?: number | null): number => {
  const explicit = Math.round(Number(pageNumber) || 0);
  if (explicit >= 1 && explicit <= TOTAL_QURAN_PAGES) return explicit;
  const globalAyah = getGlobalAyahNumber(surahNumber, ayahNumber);
  return Math.min(TOTAL_QURAN_PAGES, Math.max(1, Math.ceil((globalAyah / TOTAL_QURAN_AYAHS) * TOTAL_QURAN_PAGES)));
};

const getJuzBoundsGlobal = (juzNumber: number) => {
  const safeJuz = Math.min(30, Math.max(1, Math.round(juzNumber) || 30));
  const juz = JUZ_LIST.find(item => item.number === safeJuz) ?? JUZ_LIST[JUZ_LIST.length - 1];
  const start = getGlobalAyahNumber(juz.startSurah, juz.startAyah);
  const end = getGlobalAyahNumber(juz.endSurah, juz.endAyah);
  return {
    juzNumber: safeJuz,
    start,
    end,
    total: Math.max(1, end - start + 1),
  };
};

const normalizeCompletionType = (value?: string | null): QuranCompletionGoalType => {
  if (value === 'pages' || value === 'juz' || value === 'khatam') return value;
  return DEFAULT_QURAN_READING_GOAL.completionType;
};

const normalizeQuranReadingGoal = (goal?: Partial<QuranReadingGoal> | null): QuranReadingGoal => ({
  weeklyDaysTarget: Math.min(7, Math.max(1, Math.round(Number(goal?.weeklyDaysTarget) || DEFAULT_QURAN_READING_GOAL.weeklyDaysTarget))),
  weeklyMinutesTarget: Math.min(600, Math.max(5, Math.round(Number(goal?.weeklyMinutesTarget) || DEFAULT_QURAN_READING_GOAL.weeklyMinutesTarget))),
  completionType: normalizeCompletionType(goal?.completionType),
  startedAt: typeof goal?.startedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(goal.startedAt)
    ? goal.startedAt
    : getLocalDateKey(),
  khatamDays: Math.min(365, Math.max(1, Math.round(Number(goal?.khatamDays) || DEFAULT_QURAN_READING_GOAL.khatamDays))),
  dailyPagesTarget: Math.min(20, Math.max(1, Math.round(Number(goal?.dailyPagesTarget) || DEFAULT_QURAN_READING_GOAL.dailyPagesTarget))),
  targetJuz: Math.min(30, Math.max(1, Math.round(Number(goal?.targetJuz) || DEFAULT_QURAN_READING_GOAL.targetJuz))),
  targetDays: Math.min(365, Math.max(1, Math.round(Number(goal?.targetDays) || DEFAULT_QURAN_READING_GOAL.targetDays))),
});

const findJuzNumber = (surahNumber: number, ayahNumber: number): number => {
  const match = JUZ_LIST.find(juz => {
    const afterStart =
      surahNumber > juz.startSurah ||
      (surahNumber === juz.startSurah && ayahNumber >= juz.startAyah);
    const beforeEnd =
      surahNumber < juz.endSurah ||
      (surahNumber === juz.endSurah && ayahNumber <= juz.endAyah);
    return afterStart && beforeEnd;
  });
  return match?.number ?? 1;
};

const normalizeQuranReadingStore = (store?: Partial<QuranReadingStore> | null): QuranReadingStore => ({
  sessions: Array.isArray(store?.sessions)
    ? store!.sessions
        .filter(session => session && typeof session.id === 'string')
        .map(session => ({
          ...session,
          durationSeconds: Math.max(0, Math.round(Number(session.durationSeconds) || 0)),
          versesRead: Math.max(0, Math.round(Number(session.versesRead) || 0)),
          verseKeys: Array.isArray(session.verseKeys) ? session.verseKeys : [],
          juzNumbers: Array.isArray(session.juzNumbers) ? session.juzNumbers : [],
          pageNumbers: Array.isArray(session.pageNumbers) && session.pageNumbers.length
            ? session.pageNumbers
                .map(page => Math.round(Number(page) || 0))
                .filter(page => page >= 1 && page <= TOTAL_QURAN_PAGES)
            : [estimatePageNumber(session.surahNumber, session.lastAyah)],
        }))
        .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
    : [],
  goal: normalizeQuranReadingGoal(store?.goal),
});

const getQuranReadingStore = async (): Promise<QuranReadingStore> =>
  normalizeQuranReadingStore(await getItem<QuranReadingStore>(STORAGE_KEYS.QURAN_READING));

const saveQuranReadingStore = async (store: QuranReadingStore): Promise<void> => {
  await setItem(STORAGE_KEYS.QURAN_READING, {
    ...store,
    sessions: store.sessions
      .slice()
      .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
      .slice(0, QURAN_MAX_STORED_SESSIONS),
  });
};

export async function getQuranReadingSessions(): Promise<QuranReadingSession[]> {
  return (await getQuranReadingStore()).sessions;
}

export async function getQuranReadingGoal(): Promise<QuranReadingGoal> {
  return (await getQuranReadingStore()).goal;
}

export async function saveQuranReadingGoal(goal: QuranReadingGoal): Promise<QuranReadingSummary> {
  const store = await getQuranReadingStore();
  const nextGoal = normalizeQuranReadingGoal(goal);
  await saveQuranReadingStore({ ...store, goal: nextGoal });
  return getQuranReadingSummary();
}

const buildPopularItems = (
  sessions: QuranReadingSession[],
  kind: 'surah' | 'juz'
): QuranReadingPopularItem[] => {
  const map = new Map<string, QuranReadingPopularItem>();
  sessions.forEach(session => {
    const keys = kind === 'surah'
      ? [`${session.surahNumber}`]
      : (session.juzNumbers.length ? session.juzNumbers : [findJuzNumber(session.surahNumber, session.lastAyah)]).map(String);
    keys.forEach(key => {
      const existing = map.get(key);
      const label = kind === 'surah' ? session.surahName : `Juz ${key}`;
      if (!existing) {
        map.set(key, {
          id: key,
          label,
          count: 1,
          durationSeconds: session.durationSeconds,
          versesRead: session.versesRead,
          lastReadAt: session.endedAt,
        });
        return;
      }
      existing.count += 1;
      existing.durationSeconds += session.durationSeconds;
      existing.versesRead += session.versesRead;
      if (new Date(session.endedAt).getTime() > new Date(existing.lastReadAt).getTime()) {
        existing.lastReadAt = session.endedAt;
      }
    });
  });
  return Array.from(map.values())
    .sort((a, b) => b.durationSeconds - a.durationSeconds || b.versesRead - a.versesRead || b.count - a.count)
    .slice(0, 5);
};

const countCurrentStreak = (activityDays: Set<string>, todayKey: string): number => {
  const anchor = activityDays.has(todayKey)
    ? todayKey
    : activityDays.has(addDaysToDateKey(todayKey, -1))
      ? addDaysToDateKey(todayKey, -1)
      : null;
  if (!anchor) return 0;
  let count = 0;
  let cursor = anchor;
  while (activityDays.has(cursor)) {
    count += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }
  return count;
};

const countLongestStreak = (days: string[]): number => {
  if (!days.length) return 0;
  const sorted = [...days].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === addDaysToDateKey(sorted[i - 1], 1)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
};

const buildCompletionGoalSummary = (
  goal: QuranReadingGoal,
  sessions: QuranReadingSession[],
  todayKey: string
): QuranReadingSummary['completion'] => {
  const goalSessions = sessions.filter(session => session.date >= goal.startedAt);
  const elapsedDays = Math.max(1, diffDateKeys(goal.startedAt, todayKey) + 1);
  const todaySessions = goalSessions.filter(session => session.date === todayKey);
  const todayPages = new Set(todaySessions.flatMap(session => session.pageNumbers));

  if (goal.completionType === 'pages') {
    const allPages = new Set(goalSessions.flatMap(session => session.pageNumbers));
    const dueDate = addDaysToDateKey(todayKey, Math.max(0, Math.ceil(Math.max(0, TOTAL_QURAN_PAGES - allPages.size) / Math.max(1, goal.dailyPagesTarget)) - 1));
    return {
      type: 'pages',
      startedAt: goal.startedAt,
      dueDate,
      elapsedDays,
      remainingDays: Math.max(0, diffDateKeys(todayKey, dueDate)),
      progress: Math.min(1, todayPages.size / Math.max(1, goal.dailyPagesTarget)),
      completed: allPages.size,
      target: TOTAL_QURAN_PAGES,
      dailyTarget: goal.dailyPagesTarget,
      todayCompleted: todayPages.size,
      todayTarget: goal.dailyPagesTarget,
      targetJuz: goal.targetJuz,
    };
  }

  if (goal.completionType === 'juz') {
    const bounds = getJuzBoundsGlobal(goal.targetJuz);
    const maxInJuz = goalSessions.reduce((max, session) => {
      const global = getGlobalAyahNumber(session.surahNumber, session.lastAyah);
      if (global < bounds.start || global > bounds.end) return max;
      return Math.max(max, global);
    }, 0);
    const completed = maxInJuz > 0 ? Math.min(bounds.total, maxInJuz - bounds.start + 1) : 0;
    return {
      type: 'juz',
      startedAt: goal.startedAt,
      dueDate: addDaysToDateKey(goal.startedAt, goal.targetDays - 1),
      elapsedDays: Math.min(goal.targetDays, elapsedDays),
      remainingDays: Math.max(0, goal.targetDays - elapsedDays),
      progress: Math.min(1, completed / bounds.total),
      completed,
      target: bounds.total,
      dailyTarget: Math.ceil(bounds.total / Math.max(1, goal.targetDays)),
      todayCompleted: todaySessions.filter(session => session.juzNumbers.includes(bounds.juzNumber)).reduce((sum, session) => sum + session.versesRead, 0),
      todayTarget: Math.ceil(bounds.total / Math.max(1, goal.targetDays)),
      targetJuz: bounds.juzNumber,
    };
  }

  const maxGlobalAyah = goalSessions.reduce((max, session) => (
    Math.max(max, getGlobalAyahNumber(session.surahNumber, session.lastAyah))
  ), 0);

  return {
    type: 'khatam',
    startedAt: goal.startedAt,
    dueDate: addDaysToDateKey(goal.startedAt, goal.khatamDays - 1),
    elapsedDays: Math.min(goal.khatamDays, elapsedDays),
    remainingDays: Math.max(0, goal.khatamDays - elapsedDays),
    progress: Math.min(1, maxGlobalAyah / TOTAL_QURAN_AYAHS),
    completed: maxGlobalAyah,
    target: TOTAL_QURAN_AYAHS,
    dailyTarget: Math.ceil(TOTAL_QURAN_AYAHS / Math.max(1, goal.khatamDays)),
    todayCompleted: todaySessions.reduce((sum, session) => sum + session.versesRead, 0),
    todayTarget: Math.ceil(TOTAL_QURAN_AYAHS / Math.max(1, goal.khatamDays)),
    targetJuz: goal.targetJuz,
  };
};

export async function getQuranReadingSummary(): Promise<QuranReadingSummary> {
  const store = await getQuranReadingStore();
  const sessions = store.sessions;
  const todayKey = getLocalDateKey();
  const weekKeys = getRecentDateKeys(7);
  const activityDays = new Set(sessions.map(session => session.date));
  const todaySessions = sessions.filter(session => session.date === todayKey);
  const weekSessions = sessions.filter(session => weekKeys.includes(session.date));
  const lastToday = todaySessions
    .slice()
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())[0];
  const weeklyActiveDays = weekKeys.filter(key => activityDays.has(key)).length;
  const weeklyDurationSeconds = weekSessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const weeklyMinutes = Math.round(weeklyDurationSeconds / 60);

  return {
    goal: store.goal,
    today: {
      date: todayKey,
      durationSeconds: todaySessions.reduce((sum, session) => sum + session.durationSeconds, 0),
      versesRead: todaySessions.reduce((sum, session) => sum + session.versesRead, 0),
      sessions: todaySessions.length,
      lastSurahNumber: lastToday?.surahNumber ?? null,
      lastSurahName: lastToday?.surahName ?? '',
      lastAyah: lastToday?.lastAyah ?? null,
    },
    weekly: {
      days: weekKeys,
      activeDays: weeklyActiveDays,
      durationSeconds: weeklyDurationSeconds,
      versesRead: weekSessions.reduce((sum, session) => sum + session.versesRead, 0),
      sessions: weekSessions.length,
      dayProgress: Math.min(1, weeklyActiveDays / Math.max(1, store.goal.weeklyDaysTarget)),
      minuteProgress: Math.min(1, weeklyMinutes / Math.max(1, store.goal.weeklyMinutesTarget)),
    },
    completion: buildCompletionGoalSummary(store.goal, sessions, todayKey),
    streak: {
      current: countCurrentStreak(activityDays, todayKey),
      longest: countLongestStreak(Array.from(activityDays)),
      totalActiveDays: activityDays.size,
    },
    popularSurahs: buildPopularItems(sessions, 'surah'),
    popularJuz: buildPopularItems(sessions, 'juz'),
    recentSessions: sessions.slice(0, 10),
  };
}

export async function recordQuranReadingActivity(input: {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  pageNumber?: number;
  readAt?: string;
}): Promise<QuranReadingSummary> {
  const store = await getQuranReadingStore();
  const readAtDate = input.readAt ? new Date(input.readAt) : new Date();
  const readAt = Number.isNaN(readAtDate.getTime()) ? new Date() : readAtDate;
  const readAtIso = readAt.toISOString();
  const date = getLocalDateKey(readAt);
  const nowMs = readAt.getTime();
  const verseKey = `${input.surahNumber}:${input.ayahNumber}`;
  const juzNumber = findJuzNumber(input.surahNumber, input.ayahNumber);
  const pageNumber = estimatePageNumber(input.surahNumber, input.ayahNumber, input.pageNumber);
  const sessions = store.sessions.slice();
  const latest = sessions[0] ?? null;
  const latestEndMs = latest ? new Date(latest.endedAt).getTime() : 0;
  const canContinue =
    !!latest &&
    latest.date === date &&
    latest.surahNumber === input.surahNumber &&
    Number.isFinite(latestEndMs) &&
    nowMs >= latestEndMs &&
    nowMs - latestEndMs <= QURAN_SESSION_IDLE_GAP_MS;

  if (canContinue && latest) {
    const deltaSeconds = Math.min(
      QURAN_MAX_ACTIVITY_SECONDS,
      Math.max(QURAN_MIN_ACTIVITY_SECONDS, Math.round((nowMs - latestEndMs) / 1000))
    );
    const verseKeys = latest.verseKeys.includes(verseKey)
      ? latest.verseKeys
      : [...latest.verseKeys, verseKey];
    const juzNumbers = latest.juzNumbers.includes(juzNumber)
      ? latest.juzNumbers
      : [...latest.juzNumbers, juzNumber].sort((a, b) => a - b);
    const pageNumbers = latest.pageNumbers.includes(pageNumber)
      ? latest.pageNumbers
      : [...latest.pageNumbers, pageNumber].sort((a, b) => a - b);
    sessions[0] = {
      ...latest,
      endedAt: readAtIso,
      durationSeconds: latest.durationSeconds + deltaSeconds,
      lastAyah: input.ayahNumber,
      versesRead: verseKeys.length,
      verseKeys,
      juzNumbers,
      pageNumbers,
    };
  } else {
    sessions.unshift({
      id: `${date}-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      startedAt: readAtIso,
      endedAt: readAtIso,
      durationSeconds: QURAN_INITIAL_SESSION_SECONDS,
      surahNumber: input.surahNumber,
      surahName: input.surahName,
      startAyah: input.ayahNumber,
      lastAyah: input.ayahNumber,
      versesRead: 1,
      verseKeys: [verseKey],
      juzNumbers: [juzNumber],
      pageNumbers: [pageNumber],
    });
  }

  await saveQuranReadingStore({ ...store, sessions });
  await updateTodayTracker({ quran: true });
  await updateStreak();
  return getQuranReadingSummary();
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

// Quran Ayah Notes
export type QuranAyahNoteCategory = 'tadabbur' | 'kajian' | 'reminder' | 'quote';

export interface QuranAyahNote {
  id: string;
  verseKey: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  translation: string;
  body: string;
  category: QuranAyahNoteCategory;
  source?: string;
  qfNoteId?: string;
  syncStatus?: 'local' | 'synced' | 'pending' | 'failed';
  createdAt: string;
  updatedAt: string;
}

const normalizeQuranAyahNoteCategory = (value?: string | null): QuranAyahNoteCategory => {
  if (value === 'kajian' || value === 'reminder' || value === 'quote' || value === 'tadabbur') return value;
  return 'tadabbur';
};

const normalizeQuranAyahNotes = (notes?: QuranAyahNote[] | null): QuranAyahNote[] =>
  Array.isArray(notes)
    ? notes
        .filter(note => note && typeof note.id === 'string' && typeof note.verseKey === 'string')
        .map(note => ({
          ...note,
          surahNumber: Math.max(1, Math.round(Number(note.surahNumber) || 1)),
          ayahNumber: Math.max(1, Math.round(Number(note.ayahNumber) || 1)),
          body: String(note.body ?? ''),
          category: normalizeQuranAyahNoteCategory(note.category),
          source: note.source?.trim() || undefined,
          syncStatus: note.syncStatus ?? (note.qfNoteId ? 'synced' : 'local'),
          createdAt: note.createdAt || new Date().toISOString(),
          updatedAt: note.updatedAt || note.createdAt || new Date().toISOString(),
        }))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : [];

export async function getQuranAyahNotes(): Promise<QuranAyahNote[]> {
  return normalizeQuranAyahNotes(await getItem<QuranAyahNote[]>(STORAGE_KEYS.QURAN_NOTES));
}

export async function getQuranAyahNotesByVerse(verseKey: string): Promise<QuranAyahNote[]> {
  const notes = await getQuranAyahNotes();
  return notes.filter(note => note.verseKey === verseKey);
}

export async function saveQuranAyahNote(note: QuranAyahNote): Promise<QuranAyahNote[]> {
  const notes = await getQuranAyahNotes();
  const idx = notes.findIndex(item => item.id === note.id);
  const nextNote = {
    ...note,
    category: normalizeQuranAyahNoteCategory(note.category),
    source: note.source?.trim() || undefined,
    updatedAt: note.updatedAt || new Date().toISOString(),
  };
  const next = idx >= 0
    ? notes.map(item => (item.id === note.id ? nextNote : item))
    : [nextNote, ...notes];
  await setItem(STORAGE_KEYS.QURAN_NOTES, normalizeQuranAyahNotes(next));
  return getQuranAyahNotesByVerse(note.verseKey);
}

export async function upsertQuranAyahNotes(incoming: QuranAyahNote[]): Promise<QuranAyahNote[]> {
  const notes = await getQuranAyahNotes();
  const byId = new Map(notes.map(note => [note.id, note]));
  incoming.forEach(note => {
    byId.set(note.id, {
      ...(byId.get(note.id) ?? {}),
      ...note,
      category: normalizeQuranAyahNoteCategory(note.category),
      source: note.source?.trim() || undefined,
      updatedAt: note.updatedAt || new Date().toISOString(),
    });
  });
  const next = normalizeQuranAyahNotes(Array.from(byId.values()));
  await setItem(STORAGE_KEYS.QURAN_NOTES, next);
  return next;
}

export async function deleteQuranAyahNote(id: string): Promise<void> {
  const notes = await getQuranAyahNotes();
  await setItem(STORAGE_KEYS.QURAN_NOTES, notes.filter(note => note.id !== id));
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

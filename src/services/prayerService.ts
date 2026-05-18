import { Coordinates, CalculationMethod, PrayerTimes as AdhanPrayerTimes, Madhab } from 'adhan';

// ── Types ────────────────────────────────────────────────────────────────────
export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface HijriDate {
  date: string;
  day: string;
  month: { number: number; en: string; ar: string };
  year: string;
}

export interface PrayerTimesResponse {
  timings: PrayerTimes;
  date: {
    readable: string;
    hijri: HijriDate;
  };
}

// ── Local calculation using adhan library ────────────────────────────────────
// Parameters matching KEMENAG RI (Indonesian Ministry of Religious Affairs):
//   Fajr: 20°, Isha: 18°, Madhab: Shafi (Asr starts at 1x shadow length)
//   Base method: Muslim World League with Indonesian adjustments

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatAdhanTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function calculatePrayerTimes(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): PrayerTimes {
  const coords = new Coordinates(latitude, longitude);
  const params = CalculationMethod.MuslimWorldLeague();
  params.madhab = Madhab.Shafi;   // Standard for Indonesia (Asr at 1× shadow)
  params.fajrAngle = 20;          // KEMENAG RI standard
  params.ishaAngle = 18;          // KEMENAG RI standard

  const times = new AdhanPrayerTimes(coords, date, params);
  return {
    Fajr:    formatAdhanTime(times.fajr),
    Sunrise: formatAdhanTime(times.sunrise),
    Dhuhr:   formatAdhanTime(times.dhuhr),
    Asr:     formatAdhanTime(times.asr),
    Maghrib: formatAdhanTime(times.maghrib),
    Isha:    formatAdhanTime(times.isha),
  };
}

// ── Hijri date via Aladhan API (network-only, for display purposes) ───────────
const ALADHAN_BASE = 'https://api.aladhan.com/v1';

export async function fetchHijriDate(date: Date = new Date()): Promise<HijriDate | null> {
  try {
    const d = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const res = await fetch(`${ALADHAN_BASE}/gToH/${d}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.hijri ?? null;
  } catch {
    return null;
  }
}

// ── Main fetch function (local calc + optional Hijri date) ───────────────────
export async function fetchPrayerTimes(
  latitude: number,
  longitude: number,
  _method: number = 11 // kept for API compatibility, ignored — adhan is used instead
): Promise<PrayerTimesResponse> {
  const now = new Date();

  // Calculate prayer times locally (fast, offline-capable, accurate)
  const timings = calculatePrayerTimes(latitude, longitude, now);

  // Fetch Hijri date from API (best-effort, falls back to Gregorian)
  const hijri = await fetchHijriDate(now);

  const readable = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    timings,
    date: {
      readable,
      hijri: hijri ?? {
        date: `${pad2(now.getDate())}-${pad2(now.getMonth() + 1)}-${now.getFullYear()}`,
        day: String(now.getDate()),
        month: { number: now.getMonth() + 1, en: '', ar: '' },
        year: String(now.getFullYear()),
      },
    },
  };
}

// ── Monthly calculation (all local, no API needed for times) ────────────────
export async function fetchMonthPrayerTimes(
  latitude: number,
  longitude: number,
  month: number,
  year: number,
  _method: number = 11
): Promise<PrayerTimesResponse[]> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const results: PrayerTimesResponse[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const timings = calculatePrayerTimes(latitude, longitude, date);
    const readable = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    results.push({
      timings,
      date: {
        readable,
        hijri: {
          date: `${pad2(day)}-${pad2(month)}-${year}`,
          day: String(day),
          month: { number: month, en: '', ar: '' },
          year: String(year),
        },
      },
    });
  }
  return results;
}

// ── Calculation methods list (for settings dropdown) ────────────────────────
export const PRAYER_METHODS = [
  { id: 11, name: 'Kementerian Agama RI (Indonesia)' },  // default, maps to adhan params
  { id: 3,  name: 'Muslim World League' },
  { id: 2,  name: 'Islamic Society of North America' },
  { id: 4,  name: 'Umm Al-Qura University, Makkah' },
  { id: 5,  name: 'Egyptian General Authority of Survey' },
  { id: 1,  name: 'University of Islamic Sciences, Karachi' },
];

// ── Next prayer helper ────────────────────────────────────────────────────────
export function getNextPrayer(times: PrayerTimes): { name: string; time: string; minutesLeft: number } {
  const now = new Date();
  const currentTotal = now.getHours() * 60 + now.getMinutes();

  const prayers = [
    { name: 'Fajr',    time: times.Fajr },
    { name: 'Dhuhr',   time: times.Dhuhr },
    { name: 'Asr',     time: times.Asr },
    { name: 'Maghrib', time: times.Maghrib },
    { name: 'Isha',    time: times.Isha },
  ];

  for (const prayer of prayers) {
    const [h, m] = prayer.time.split(':').map(Number);
    const prayerTotal = h * 60 + m;
    if (prayerTotal > currentTotal) {
      return { name: prayer.name, time: prayer.time, minutesLeft: prayerTotal - currentTotal };
    }
  }

  // All prayers passed — next is Fajr tomorrow
  const [h, m] = times.Fajr.split(':').map(Number);
  const fajrTotal = h * 60 + m;
  return { name: 'Fajr', time: times.Fajr, minutesLeft: 24 * 60 - currentTotal + fajrTotal };
}

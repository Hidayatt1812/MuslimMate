/**
 * Date and time utility functions used across the app.
 */

const DAY_LABELS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function getDayLabelId(dateString: string): string {
  return DAY_LABELS_ID[new Date(dateString).getDay()] ?? '';
}

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function isToday(dateString: string): boolean {
  return dateString === getTodayKey();
}

export function formatDateId(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Returns an array of the last N days as YYYY-MM-DD strings,
 * with today as the last element.
 */
export function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

/**
 * Parse HH:MM time string into total minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Format a count of minutes into a human-readable string like "2 jam 15 menit".
 */
export function formatMinutesLeft(minutes: number): string {
  if (minutes <= 0) return '0 menit';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} jam ${m} menit`;
  if (h > 0) return `${h} jam`;
  return `${m} menit`;
}

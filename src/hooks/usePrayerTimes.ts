import { useState, useEffect, useMemo } from 'react';
import {
  calculatePrayerTimes,
  fetchPrayerTimes,
  PrayerTimesResponse,
  getNextPrayer,
} from '@/services/prayerService';
import { useLocation } from '@/hooks/useLocation';

export function usePrayerTimes() {
  const { location, loading: locationLoading } = useLocation();
  const [prayerData, setPrayerData] = useState<PrayerTimesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;

    // Calculate prayer times immediately and synchronously (no network needed)
    const timings = calculatePrayerTimes(location.latitude, location.longitude);
    const now = new Date();
    const readable = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Show prayer times right away with a placeholder Hijri date
    setPrayerData(prev => ({
      timings,
      date: {
        readable,
        hijri: prev?.date.hijri ?? {
          date: '',
          day: '',
          month: { number: 0, en: '', ar: '' },
          year: '',
        },
      },
    }));
    setLoading(false);

    // Fetch Hijri date from API in the background (non-blocking)
    let cancelled = false;
    fetchPrayerTimes(location.latitude, location.longitude)
      .then(data => {
        if (!cancelled) {
          setPrayerData(data); // Replace with full data including Hijri date
        }
      })
      .catch(e => {
        if (!cancelled) setError(e?.message ?? 'Gagal memuat jadwal sholat');
      });

    return () => { cancelled = true; };
  }, [location]);

  const nextPrayer = useMemo(
    () => (prayerData ? getNextPrayer(prayerData.timings) : null),
    [prayerData]
  );

  return {
    prayerData,
    nextPrayer,
    loading: loading || locationLoading,
    error,
    city: location?.city ?? 'Memuat...',
  };
}

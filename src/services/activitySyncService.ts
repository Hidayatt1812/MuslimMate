/**
 * Activity sync service — syncs local ibadah tracker data to Supabase.
 * All syncs are silent (no errors thrown to the user).
 */

import { DailyTracker } from '@/services/storageService';
import {
  getSupabaseClient,
  getDeviceId,
  isCloudSyncEnabled,
  ActivityRow,
} from '@/services/supabaseService';

function trackerToRow(tracker: DailyTracker, deviceId: string): ActivityRow {
  const prayers = tracker.prayers ?? {};
  const completedPrayers = Object.values(prayers).filter(Boolean).length;
  const totalScore = completedPrayers + (tracker.quran ? 1 : 0) + (tracker.dhikr ? 1 : 0);

  return {
    device_id: deviceId,
    date: tracker.date,
    prayers_fajr:    prayers['Fajr']    ?? false,
    prayers_dhuhr:   prayers['Dhuhr']   ?? false,
    prayers_asr:     prayers['Asr']     ?? false,
    prayers_maghrib: prayers['Maghrib'] ?? false,
    prayers_isha:    prayers['Isha']    ?? false,
    quran_read:      tracker.quran  ?? false,
    dhikr_done:      tracker.dhikr  ?? false,
    total_score:     totalScore,
    synced_at:       new Date().toISOString(),
  };
}

/**
 * Upsert today's tracker data to Supabase.
 * Silently does nothing if sync is disabled or Supabase is not configured.
 */
export async function syncTodayActivity(tracker: DailyTracker): Promise<void> {
  try {
    const enabled = await isCloudSyncEnabled();
    if (!enabled) return;

    const client = await getSupabaseClient();
    if (!client) return;

    const deviceId = await getDeviceId();
    const row = trackerToRow(tracker, deviceId);

    await client
      .from('user_activity')
      .upsert(row, { onConflict: 'device_id,date' });
  } catch {
    // Silent fail — sync is best-effort
  }
}

/**
 * Fetch activity history from Supabase for this device.
 * Returns rows sorted by date descending.
 */
export async function fetchActivityHistory(limit = 90): Promise<ActivityRow[]> {
  try {
    const client = await getSupabaseClient();
    if (!client) return [];

    const deviceId = await getDeviceId();
    const { data, error } = await client
      .from('user_activity')
      .select('*')
      .eq('device_id', deviceId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as ActivityRow[];
  } catch {
    return [];
  }
}

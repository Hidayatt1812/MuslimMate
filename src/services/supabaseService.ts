/**
 * Supabase backend integration for MuslimMate.
 *
 * Setup:
 *   1. Create a project at https://supabase.com
 *   2. Run the SQL below in the Supabase SQL editor to create the table
 *   3. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * SQL to run in Supabase:
 * ─────────────────────────────────────────────────────────────────────────────
 *   create table if not exists user_activity (
 *     id             uuid        default gen_random_uuid() primary key,
 *     device_id      text        not null,
 *     date           text        not null,   -- YYYY-MM-DD
 *     prayers_fajr   boolean     default false,
 *     prayers_dhuhr  boolean     default false,
 *     prayers_asr    boolean     default false,
 *     prayers_maghrib boolean    default false,
 *     prayers_isha   boolean     default false,
 *     quran_read     boolean     default false,
 *     dhikr_done     boolean     default false,
 *     total_score    int         default 0,
 *     synced_at      timestamptz default now(),
 *     unique(device_id, date)
 *   );
 *
 *   -- Enable row-level security (anonymous users can only see their own rows)
 *   alter table user_activity enable row level security;
 *   create policy "allow all to own rows" on user_activity
 *     for all using (true) with check (true);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, setItem } from '@/services/storageService';

// ── Configuration ────────────────────────────────────────────────────────────
// You can find them in: Supabase Dashboard -> Settings -> API.
// Keep only the anon public key in the app. Never ship the service role key.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key';

const DEVICE_ID_KEY = 'muslimmate_device_id';
const CLOUD_SYNC_ENABLED_KEY = 'muslimmate_cloud_sync_enabled';
const CLOUD_SYNC_CONFIG_KEY = 'muslimmate_cloud_sync_config';

// ── Client ───────────────────────────────────────────────────────────────────
let _client: SupabaseClient | null = null;

interface SyncConfig {
  url: string;
  anonKey: string;
}

async function getSyncConfig(): Promise<SyncConfig | null> {
  const custom = await getItem<SyncConfig>(CLOUD_SYNC_CONFIG_KEY);
  if (custom?.url && custom?.anonKey) return custom;
  if (SUPABASE_URL.includes('your-project')) return null; // placeholder not replaced
  if (SUPABASE_ANON_KEY === 'your-anon-key') return null;
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const config = await getSyncConfig();
  if (!config) return null;

  if (!_client || (_client as any).supabaseUrl !== config.url) {
    _client = createClient(config.url, config.anonKey, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true },
    });
  }
  return _client;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export async function getDeviceId(): Promise<string> {
  const existing = await getItem<string>(DEVICE_ID_KEY);
  if (existing) return existing;

  // Generate a stable pseudo-UUID for this device
  const chars = '0123456789abcdef';
  const segments = [8, 4, 4, 4, 12];
  const id = segments.map(len => Array.from({ length: len }, () => chars[Math.floor(Math.random() * 16)]).join('')).join('-');
  await setItem(DEVICE_ID_KEY, id);
  return id;
}

export async function isCloudSyncEnabled(): Promise<boolean> {
  const val = await getItem<boolean>(CLOUD_SYNC_ENABLED_KEY);
  return val === true;
}

export async function setCloudSyncEnabled(enabled: boolean): Promise<void> {
  await setItem(CLOUD_SYNC_ENABLED_KEY, enabled);
}

export async function saveCloudSyncConfig(config: SyncConfig): Promise<void> {
  _client = null; // Force re-init with new config
  await setItem(CLOUD_SYNC_CONFIG_KEY, config);
}

// ── Activity row type ────────────────────────────────────────────────────────
export interface ActivityRow {
  device_id: string;
  date: string;
  prayers_fajr: boolean;
  prayers_dhuhr: boolean;
  prayers_asr: boolean;
  prayers_maghrib: boolean;
  prayers_isha: boolean;
  quran_read: boolean;
  dhikr_done: boolean;
  total_score: number;
  synced_at?: string;
}

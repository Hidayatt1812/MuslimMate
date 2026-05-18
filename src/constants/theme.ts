import { Platform } from 'react-native';

// MuslimMate Islamic Design System
export const Colors = {
  dark: {
    background: '#0A0F1E',
    surface: '#111827',
    card: '#1F2937',
    cardBorder: '#374151',
    primary: '#10B981',
    primaryDark: '#059669',
    primaryMuted: '#064E3B',
    gold: '#F59E0B',
    goldMuted: '#451A03',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#374151',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    tabBar: '#111827',
    tabBarBorder: '#1F2937',
    overlay: 'rgba(0,0,0,0.7)',
    tint: '#10B981',
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#10B981',
  },
  light: {
    background: '#F0FDF4',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardBorder: '#D1FAE5',
    primary: '#059669',
    primaryDark: '#047857',
    primaryMuted: '#D1FAE5',
    gold: '#D97706',
    goldMuted: '#FEF3C7',
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    error: '#DC2626',
    success: '#059669',
    warning: '#D97706',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    overlay: 'rgba(0,0,0,0.5)',
    tint: '#059669',
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#059669',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  arabic: 26,
  arabicLg: 34,
};

export const prayerNames: Record<string, string> = {
  Fajr: 'Subuh',
  Sunrise: 'Terbit',
  Dhuhr: 'Dzuhur',
  Asr: 'Ashar',
  Maghrib: 'Maghrib',
  Isha: 'Isya',
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

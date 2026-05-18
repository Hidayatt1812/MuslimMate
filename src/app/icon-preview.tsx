/**
 * Icon Preview Page — untuk development saja, hapus sebelum release.
 * Akses via navigasi manual: router.push('/icon-preview')
 */
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import {
  MosqueIcon,
  CrescentStarIcon,
  QuranIcon,
  KaabaIcon,
  CompassIcon,
  TasbihIcon,
  PrayerTrackerIcon,
  RamadanIcon,
  TahfidzIcon,
  AISparkleIcon,
  MuslimMateLogo,
} from '@/components/IslamicIcons';

const ICONS = [
  { label: 'Mosque',          Component: MosqueIcon,        color: '#10B981' },
  { label: 'Crescent + Star', Component: CrescentStarIcon,  color: '#10B981' },
  { label: 'Quran',           Component: QuranIcon,         color: '#10B981' },
  { label: 'Kaaba',           Component: KaabaIcon,         color: '#10B981' },
  { label: 'Compass/Qibla',   Component: CompassIcon,       color: '#EF4444' },
  { label: 'Tasbih/Dhikr',    Component: TasbihIcon,        color: '#10B981' },
  { label: 'Prayer Tracker',  Component: PrayerTrackerIcon, color: '#10B981' },
  { label: 'Puasa',           Component: RamadanIcon,       color: '#F59E0B' },
  { label: 'Tahfidz',         Component: TahfidzIcon,       color: '#8B5CF6' },
  { label: 'AI Sparkle',      Component: AISparkleIcon,     color: '#06B6D4' },
];

export default function IconPreviewScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700', marginLeft: Spacing.md }}>
          Islamic Icons Preview
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* App Logo */}
        <View style={[styles.logoCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>App Logo</Text>
          <View style={styles.logoRow}>
            <View style={styles.logoItem}>
              <MuslimMateLogo size={80} color={C.primary} secondaryColor={C.gold} />
              <Text style={[styles.label, { color: C.textMuted }]}>80px</Text>
            </View>
            <View style={styles.logoItem}>
              <MuslimMateLogo size={56} color={C.primary} secondaryColor={C.gold} />
              <Text style={[styles.label, { color: C.textMuted }]}>56px</Text>
            </View>
            <View style={styles.logoItem}>
              <MuslimMateLogo size={40} color={C.primary} secondaryColor={C.gold} />
              <Text style={[styles.label, { color: C.textMuted }]}>40px</Text>
            </View>
          </View>
        </View>

        {/* Feature Icons Grid */}
        <Text style={[styles.sectionTitle, { color: C.textMuted, marginHorizontal: Spacing.md }]}>
          Feature Icons
        </Text>
        <View style={styles.grid}>
          {ICONS.map(({ label, Component, color }) => (
            <View key={label} style={[styles.iconCard, { backgroundColor: C.card, borderColor: C.border }]}>
              {/* Large */}
              <Component size={40} color={color} />
              <Text style={[styles.label, { color: C.text }]}>{label}</Text>
              {/* Small row */}
              <View style={styles.sizeRow}>
                <Component size={24} color={color} />
                <Component size={20} color={color} />
                <Component size={16} color={color} />
              </View>
              <Text style={[styles.hint, { color: C.textMuted }]}>40 / 24 / 20 / 16px</Text>
            </View>
          ))}
        </View>

        {/* Usage example */}
        <View style={[styles.usageCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Contoh Penggunaan</Text>
          <View style={styles.exampleRow}>
            <MosqueIcon size={20} color={C.primary} />
            <Text style={{ color: C.text, marginLeft: 8, fontSize: FontSize.md }}>Waktu Sholat</Text>
          </View>
          <View style={styles.exampleRow}>
            <QuranIcon size={20} color={C.primary} />
            <Text style={{ color: C.text, marginLeft: 8, fontSize: FontSize.md }}>Al-Qur{"'"}an</Text>
          </View>
          <View style={styles.exampleRow}>
            <CompassIcon size={20} color="#EF4444" />
            <Text style={{ color: C.text, marginLeft: 8, fontSize: FontSize.md }}>Arah Kiblat</Text>
          </View>
          <View style={styles.exampleRow}>
            <TasbihIcon size={20} color={C.primary} />
            <Text style={{ color: C.text, marginLeft: 8, fontSize: FontSize.md }}>Dzikir & Tasbih</Text>
          </View>
          <View style={styles.exampleRow}>
            <RamadanIcon size={20} color={C.gold} />
            <Text style={{ color: C.text, marginLeft: 8, fontSize: FontSize.md }}>Puasa</Text>
          </View>
          <View style={styles.exampleRow}>
            <TahfidzIcon size={20} color="#8B5CF6" />
            <Text style={{ color: C.text, marginLeft: 8, fontSize: FontSize.md }}>Tahfidz Mode</Text>
          </View>
          <View style={styles.exampleRow}>
            <AISparkleIcon size={20} color="#06B6D4" />
            <Text style={{ color: C.text, marginLeft: 8, fontSize: FontSize.md }}>AI Assistant</Text>
          </View>
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
  scroll: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  logoCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
  },
  logoItem: {
    alignItems: 'center',
    gap: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconCard: {
    width: '47%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: 9,
    textAlign: 'center',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  usageCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
});

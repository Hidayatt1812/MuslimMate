import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useQibla } from '@/hooks/useQibla';
import { useTranslation } from '@/hooks/useTranslation';
import type { Lang } from '@/constants/i18n';

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 8;

const QIBLA_TEXT: Record<Lang, Record<string, string>> = {
  id: {
    title: 'Arah Kiblat',
    unavailable: 'Kompas tidak tersedia di perangkat ini',
    facing: 'Menghadap Kiblat',
    rotate: 'Putar hingga tanda hijau',
    heading: 'Heading',
    instruction: 'Putar badan hingga tanda panah hijau\nmengarah ke atas kompas',
  },
  en: {
    title: 'Qibla Direction',
    unavailable: 'Compass is not available on this device',
    facing: 'Facing Qibla',
    rotate: 'Rotate until the indicator turns green',
    heading: 'Heading',
    instruction: 'Turn your body until the green arrow\npoints to the top of the compass',
  },
};

const CARDINAL_LABELS: Record<Lang, { label: string; angle: number; north: boolean }[]> = {
  id: [
    { label: 'U', angle: 0, north: true },
    { label: 'T', angle: 90, north: false },
    { label: 'S', angle: 180, north: false },
    { label: 'B', angle: 270, north: false },
  ],
  en: [
    { label: 'N', angle: 0, north: true },
    { label: 'E', angle: 90, north: false },
    { label: 'S', angle: 180, north: false },
    { label: 'W', angle: 270, north: false },
  ],
};

export default function QiblaScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { lang } = useTranslation();
  const copy = QIBLA_TEXT[lang];
  const { heading, qiblaAngle, arrowRotation, available, location } = useQibla();

  const r = arrowRotation;
  const needleTipX = CENTER + RADIUS * 0.55 * Math.sin((r * Math.PI) / 180);
  const needleTipY = CENTER - RADIUS * 0.55 * Math.cos((r * Math.PI) / 180);
  const needleBaseX = CENTER - RADIUS * 0.35 * Math.sin((r * Math.PI) / 180);
  const needleBaseY = CENTER + RADIUS * 0.35 * Math.cos((r * Math.PI) / 180);

  const perpX = Math.cos((r * Math.PI) / 180) * 12;
  const perpY = Math.sin((r * Math.PI) / 180) * 12;

  const accuracy = Math.abs((arrowRotation % 360) - 0) < 10 ||
    Math.abs((arrowRotation % 360) - 360) < 10;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800', marginLeft: Spacing.md }}>
          {copy.title}
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
        {!available ? (
          <View style={{ alignItems: 'center', gap: Spacing.md }}>
            <Ionicons name="compass-outline" size={64} color={C.textMuted} />
            <Text style={{ color: C.textSecondary, fontSize: FontSize.lg, textAlign: 'center' }}>
              {copy.unavailable}
            </Text>
          </View>
        ) : (
          <>
            {/* Status indicator */}
            <View style={[styles.statusBar, {
              backgroundColor: accuracy ? `${C.primary}20` : `${C.gold}20`,
              borderColor: accuracy ? C.primary : C.gold,
            }]}>
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: accuracy ? C.primary : C.gold,
                marginRight: 6,
              }} />
              <Text style={{ color: accuracy ? C.primary : C.gold, fontSize: FontSize.xs, fontWeight: '600' }}>
                {accuracy ? copy.facing : copy.rotate}
              </Text>
            </View>

            {/* SVG Compass */}
            <View style={styles.compassWrapper}>
              <Svg width={SIZE} height={SIZE}>
                {/* Outer ring */}
                <Circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  stroke={C.border}
                  strokeWidth={2}
                  fill={C.surface}
                />
                {/* Inner ring */}
                <Circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS - 20}
                  stroke={`${C.primary}30`}
                  strokeWidth={1}
                  fill="none"
                />

                {/* Cardinal direction ticks */}
                {[0, 90, 180, 270].map(deg => {
                  const rad = (deg * Math.PI) / 180;
                  const x1 = CENTER + (RADIUS - 6) * Math.sin(rad);
                  const y1 = CENTER - (RADIUS - 6) * Math.cos(rad);
                  const x2 = CENTER + (RADIUS - 16) * Math.sin(rad);
                  const y2 = CENTER - (RADIUS - 16) * Math.cos(rad);
                  return (
                    <Line
                      key={deg}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={deg === 0 ? C.error : C.border}
                      strokeWidth={deg === 0 ? 3 : 1.5}
                    />
                  );
                })}

                {/* Qibla needle (green arrow pointing to Kaabah) */}
                <Polygon
                  points={`
                    ${needleTipX},${needleTipY}
                    ${needleBaseX + perpX},${needleBaseY + perpY}
                    ${needleBaseX - perpX},${needleBaseY - perpY}
                  `}
                  fill={C.primary}
                  opacity={0.9}
                />
                {/* Needle tail (opposite direction) */}
                <Polygon
                  points={`
                    ${needleBaseX},${needleBaseY}
                    ${needleTipX - (needleTipX - CENTER) * 1.6 + perpX / 2},${needleTipY - (needleTipY - CENTER) * 1.6 + perpY / 2}
                    ${needleTipX - (needleTipX - CENTER) * 1.6 - perpX / 2},${needleTipY - (needleTipY - CENTER) * 1.6 - perpY / 2}
                  `}
                  fill={C.textMuted}
                  opacity={0.5}
                />

                {/* Center dot */}
                <Circle cx={CENTER} cy={CENTER} r={6} fill={C.primary} />
                <Circle cx={CENTER} cy={CENTER} r={3} fill="#fff" />
              </Svg>

              {/* Cardinal labels positioned outside SVG */}
              {CARDINAL_LABELS[lang].map(({ label, angle, north }) => {
                const rad = (angle * Math.PI) / 180;
                const offset = RADIUS + 2;
                const x = CENTER + offset * Math.sin(rad);
                const y = CENTER - offset * Math.cos(rad);
                return (
                  <View key={label} style={{
                    position: 'absolute',
                    left: x - 10,
                    top: y - 10,
                    width: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      color: north ? C.error : C.textSecondary,
                      fontSize: 12,
                      fontWeight: north ? '800' : '600',
                    }}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Info cards */}
            <View style={{ width: '100%', flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl }}>
              <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Ionicons name="navigate-outline" size={16} color={C.primary} />
                <Text style={{ color: C.primary, fontSize: FontSize.xl, fontWeight: '800', marginTop: 4 }}>
                  {Math.round(qiblaAngle)}°
                </Text>
                <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{copy.title}</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Ionicons name="compass-outline" size={16} color={C.textSecondary} />
                <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800', marginTop: 4 }}>
                  {Math.round(heading)}°
                </Text>
                <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{copy.heading}</Text>
              </View>
            </View>

            {location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.md }}>
                <Ionicons name="location-outline" size={12} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>
                  {location.city} · {location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°
                </Text>
              </View>
            )}

            <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.md, textAlign: 'center', lineHeight: 20 }}>
              {copy.instruction}
            </Text>
          </>
        )}
      </View>
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  compassWrapper: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  infoCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 2,
  },
});

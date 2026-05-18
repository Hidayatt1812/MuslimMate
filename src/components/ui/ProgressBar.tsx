import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, BorderRadius, FontSize } from '@/constants/theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  label?: string;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  height = 8,
  color,
  backgroundColor,
  showLabel = false,
  label,
  style,
}: ProgressBarProps) {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const pct = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={style}>
      {(showLabel || label) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          {label && <Text style={{ color: C.textSecondary, fontSize: FontSize.xs }}>{label}</Text>}
          {showLabel && (
            <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '600' }}>
              {Math.round(pct * 100)}%
            </Text>
          )}
        </View>
      )}
      <View
        style={{
          height,
          backgroundColor: backgroundColor ?? C.border,
          borderRadius: BorderRadius.full,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct * 100}%`,
            backgroundColor: color ?? C.primary,
            borderRadius: BorderRadius.full,
          }}
        />
      </View>
    </View>
  );
}

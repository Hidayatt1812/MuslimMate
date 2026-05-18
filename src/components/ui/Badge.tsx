import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, BorderRadius, FontSize } from '@/constants/theme';

interface BadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  style?: ViewStyle;
  icon?: string;
}

export function Badge({ label, color, textColor, style }: BadgeProps) {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];

  return (
    <View
      style={[
        {
          backgroundColor: color ?? C.primaryMuted,
          borderRadius: BorderRadius.full,
          paddingHorizontal: 10,
          paddingVertical: 4,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ color: textColor ?? C.primary, fontSize: FontSize.xs, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: number;
}

export function Card({ children, style, variant = 'default', padding = Spacing.md }: CardProps) {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];

  const cardStyle: ViewStyle = {
    backgroundColor: C.card,
    borderRadius: BorderRadius.lg,
    padding,
    ...(variant === 'outlined' && {
      borderWidth: 1,
      borderColor: C.cardBorder,
    }),
    ...(variant === 'elevated' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    }),
  };

  return <View style={[cardStyle, style]}>{children}</View>;
}

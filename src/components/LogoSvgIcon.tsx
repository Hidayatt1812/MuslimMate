import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type LogoSvgIconName = 'kaaba' | 'mosque' | 'quran';

type LogoSvgIconProps = {
  name: LogoSvgIconName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
};

const WEB_ICON_MAP: Record<LogoSvgIconName, keyof typeof Ionicons.glyphMap> = {
  kaaba: 'globe-outline',
  mosque: 'business-outline',
  quran: 'book-outline',
};

export function LogoSvgIcon({ name, size = 24, color, style }: LogoSvgIconProps) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={WEB_ICON_MAP[name]} size={size} color={color} />
    </View>
  );
}

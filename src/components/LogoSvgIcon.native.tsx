import React from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';
import { SvgCssUri } from 'react-native-svg/css';

export type LogoSvgIconName = 'kaaba' | 'mosque' | 'quran';

type LogoSvgIconProps = {
  name: LogoSvgIconName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
};

const ICON_SOURCES: Record<LogoSvgIconName, number> = {
  kaaba: require('../../assets/logo/kaaba.svg'),
  mosque: require('../../assets/logo/mosque.svg'),
  quran: require('../../assets/logo/quran.svg'),
};

export function LogoSvgIcon({ name, size = 24, color, style }: LogoSvgIconProps) {
  const fallback = <View style={[{ width: size, height: size }, style]} />;
  const source = Image.resolveAssetSource(ICON_SOURCES[name]);
  if (!source?.uri) return fallback;

  return (
    <SvgCssUri
      uri={source.uri}
      width={size}
      height={size}
      color={color}
      style={style}
      fallback={fallback}
    />
  );
}

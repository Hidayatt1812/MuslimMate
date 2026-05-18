// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING: IconMapping = {
  // Navigation
  'house.fill': 'home',
  'book.fill': 'menu-book',
  'clock.fill': 'schedule',
  'heart.fill': 'favorite',
  'ellipsis': 'more-horiz',
  // General
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'star.fill': 'star',
  'trash.fill': 'delete',
  'person.fill': 'person',
  'gear': 'settings',
  'bell.fill': 'notifications',
  'bookmark.fill': 'bookmark',
  'magnifyingglass': 'search',
  'xmark': 'close',
  'checkmark': 'check',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'speaker.wave.2.fill': 'volume-up',
  'location.fill': 'location-on',
  'compass.drawing': 'explore',
  'chart.bar.fill': 'bar-chart',
  'moon.fill': 'bedtime',
  'brain.head.profile': 'psychology',
  'robot.fill': 'smart-toy',
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = (MAPPING[name] ?? 'circle') as ComponentProps<typeof MaterialIcons>['name'];
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}

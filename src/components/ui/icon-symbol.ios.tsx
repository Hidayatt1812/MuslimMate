import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

// SF Symbol names for iOS — must be valid SF Symbol names
const SF_FALLBACK: Record<string, SymbolViewProps['name']> = {
  'book.fill': 'book.fill',
  'clock.fill': 'clock.fill',
  'heart.fill': 'heart.fill',
  'ellipsis': 'ellipsis',
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const sfName = (SF_FALLBACK[name] ?? name) as SymbolViewProps['name'];
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={sfName}
      style={[{ width: size, height: size }, style]}
    />
  );
}

import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

// The few icons the app uses: SF Symbols on iPhone, Material Symbols on Android and web.
const ICONS = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  back: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  contacts: { ios: 'person.crop.rectangle.stack', android: 'contacts', web: 'contacts' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  star: { ios: 'star.fill', android: 'star', web: 'star' },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: ColorValue }) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} weight="semibold" />;
}

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#13201B',
    /** The page behind everything: a soft off-white. */
    background: '#F6F7F4',
    /** Cards, inputs and list rows sit on this white. */
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECEFEA',
    textSecondary: '#5B6660',
    border: '#E3E7E1',
    inputBorder: '#D5DBD5',
    tint: '#0F7B5F',
    tintSoft: '#E4F3EC',
    /** Green text on a tintSoft background. */
    tintText: '#0B5E48',
    /** Text on a solid tint button. */
    onTint: '#FFFFFF',
    danger: '#C4352B',
    dangerSoft: '#FBEAE8',
    star: '#E8A317',
    /** The big green card on the Dashboard. */
    hero: '#0F7B5F',
    heroText: '#FFFFFF',
    heroTextSoft: '#D4F0E4',
  },
  dark: {
    text: '#EEF3F0',
    background: '#0E1412',
    backgroundElement: '#17201C',
    backgroundSelected: '#22302A',
    textSecondary: '#9DABA4',
    border: '#26322D',
    inputBorder: '#33423B',
    tint: '#3DD6A3',
    tintSoft: '#12302A',
    tintText: '#7FE6C1',
    onTint: '#04261B',
    danger: '#FF7A6E',
    dangerSoft: '#3A1A17',
    star: '#FFC94D',
    hero: '#0F7B5F',
    heroText: '#FFFFFF',
    heroTextSoft: '#D4F0E4',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Corner roundness for buttons, inputs and cards. */
export const Radius = {
  input: 14,
  button: 16,
  card: 18,
  hero: 22,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * The app's look: colors, font, spacing and corner roundness, matching the reviewwhistle.com website.
 */

import '@/global.css';

import { Platform } from 'react-native';

// The app always uses these light colors, matching the reviewwhistle.com website
// (Jeff, 2026-10-23: no dark mode).
export const Colors = {
  light: {
    /** Navy, like the website's text. */
    text: '#0F1E2E',
    /** The page behind everything: the website's soft mint. */
    background: '#F2F7F5',
    /** Cards, inputs and list rows sit on this white. */
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E6EFEB',
    textSecondary: '#3D4B5C',
    /** Even quieter text, like dates and hints. */
    textMuted: '#6B7785',
    border: '#E6ECEA',
    inputBorder: '#CFDCD7',
    tint: '#0F7B5F',
    tintSoft: '#E2F1EB',
    /** Green text on a tintSoft background. */
    tintText: '#0B5E48',
    /** Text on a solid tint button. */
    onTint: '#FFFFFF',
    danger: '#C4352B',
    dangerSoft: '#FBEAE8',
    /** The website's gold, for stars and accents. */
    star: '#F5B301',
    /** Pale gold behind badges, like the website's "14 days free" tag. */
    highlight: '#FDE7A6',
    /** The big green card on the Dashboard. */
    hero: '#0F7B5F',
    heroText: '#FFFFFF',
    heroTextSoft: '#D4F0E4',
    /** Navy blocks, like the website's dark bands. */
    navy: '#0F1E2E',
    /** Soft shadow under cards and buttons. */
    shadow: '#0F1E2E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: { mono: 'ui-monospace' },
  default: { mono: 'monospace' },
  web: { mono: 'var(--font-mono)' },
});

/**
 * The website's font, Plus Jakarta Sans, loaded in the root layout from assets/fonts.
 * Each weight is its own font file, so text picks the file by its fontWeight (see themed-text.tsx).
 */
export const FontFiles = {
  PlusJakartaSans_400Regular: require('@/assets/fonts/PlusJakartaSans_400Regular.ttf'),
  PlusJakartaSans_500Medium: require('@/assets/fonts/PlusJakartaSans_500Medium.ttf'),
  PlusJakartaSans_600SemiBold: require('@/assets/fonts/PlusJakartaSans_600SemiBold.ttf'),
  PlusJakartaSans_700Bold: require('@/assets/fonts/PlusJakartaSans_700Bold.ttf'),
  PlusJakartaSans_800ExtraBold: require('@/assets/fonts/PlusJakartaSans_800ExtraBold.ttf'),
  PlusJakartaSans_800ExtraBold_Italic: require('@/assets/fonts/PlusJakartaSans_800ExtraBold_Italic.ttf'),
};

/** The font file for a text weight (400 to 800). Italic exists only in 800, for green accent words. */
export function fontFamilyFor(weight: number, italic = false) {
  if (italic) return 'PlusJakartaSans_800ExtraBold_Italic';
  if (weight >= 800) return 'PlusJakartaSans_800ExtraBold';
  if (weight >= 700) return 'PlusJakartaSans_700Bold';
  if (weight >= 600) return 'PlusJakartaSans_600SemiBold';
  if (weight >= 500) return 'PlusJakartaSans_500Medium';
  return 'PlusJakartaSans_400Regular';
}

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
  input: 12,
  button: 14,
  card: 20,
  hero: 24,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

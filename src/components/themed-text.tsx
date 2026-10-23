import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, fontFamilyFor, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'largeTitle'
    | 'eyebrow'
    | 'sectionLabel'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  const flat = StyleSheet.flatten([{ color: theme[themeColor ?? 'text'] }, styles[type], style]);
  return <Text style={[flat, websiteFont(flat)]} {...rest} />;
}

/**
 * Picks the Plus Jakarta Sans file that matches the text's weight. The weight itself is then reset,
 * because each file already is that weight (otherwise phones would thicken it a second time).
 */
export function websiteFont(style: TextStyle) {
  if (style.fontFamily) return null;
  const weight = style.fontWeight === 'bold' ? 700 : Number(style.fontWeight) || 500;
  return {
    fontFamily: fontFamilyFor(weight, style.fontStyle === 'italic'),
    fontWeight: 'normal' as const,
    fontStyle: 'normal' as const,
  };
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 800,
    lineHeight: 52,
    letterSpacing: -1.6,
  },
  subtitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
    letterSpacing: -0.8,
  },
  /** The big heading at the top of each screen. */
  largeTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: 800,
    letterSpacing: -1.1,
  },
  /** The small line above a screen heading, like the business name. */
  eyebrow: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 600,
    letterSpacing: 0.3,
  },
  /** Small green capitals above a group of cards, like "PRIVATE FEEDBACK" (the website's section labels). */
  sectionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});

import type { ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, fontFamilyFor, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Small building blocks shared by every screen, so they all look the same.

/** How far content sits from the top of the screen (the web version has its tab bar up there). */
export function useTopPadding(hasTabs = false) {
  const insets = useSafeAreaInsets();
  return insets.top + (hasTabs && Platform.OS === 'web' ? Spacing.six + Spacing.four : Spacing.four);
}

/** How far content sits from the bottom, leaving room for the tab bar when there is one. */
export function useBottomPadding(hasTabs = false) {
  const insets = useSafeAreaInsets();
  return insets.bottom + (hasTabs ? BottomTabInset : 0) + Spacing.five;
}

type ScreenProps = ScrollViewProps & {
  /** True for the three tab screens, so content clears the tab bar. */
  hasTabs?: boolean;
  /** Narrower column, for the customer web page. */
  maxWidth?: number;
  children: ReactNode;
};

/** A scrolling screen with the page background, safe-area padding and a centered column. */
export function Screen({
  hasTabs,
  maxWidth = MaxContentWidth,
  contentContainerStyle,
  children,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const paddingTop = useTopPadding(hasTabs);
  const paddingBottom = useBottomPadding(hasTabs);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.screenContent, { paddingTop, paddingBottom }, contentContainerStyle]}
      {...rest}>
      <View style={[styles.column, { maxWidth }]}>{children}</View>
    </ScrollView>
  );
}

/** The big heading at the top of a screen, with an optional small line above and a button beside it. */
export function ScreenHeader({
  title,
  eyebrow,
  right,
}: {
  title: string;
  eyebrow?: string | null;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {!!eyebrow && (
          <ThemedText type="eyebrow" themeColor="tint" numberOfLines={1}>
            {eyebrow}
          </ThemedText>
        )}
        <ThemedText type="largeTitle">{title}</ThemedText>
      </View>
      {right}
    </View>
  );
}

/** A white rounded box with a thin border and a soft shadow, like the cards on the website. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, boxShadow: CardShadow },
        style,
      ]}
      {...rest}
    />
  );
}

/** The website's soft card shadow. */
export const CardShadow = '0px 10px 24px -16px rgba(15, 30, 46, 0.35)';

/** The ReviewWhistle whistle-and-star logo, with the name beside it unless `markOnly`. */
export function Logo({ size = 38, markOnly }: { size?: number; markOnly?: boolean }) {
  return (
    <View style={styles.logo} accessibilityLabel="ReviewWhistle" accessibilityRole="image">
      <Image
        source={require('@/assets/images/logo.png')}
        style={{ width: size, height: size, borderRadius: size * 0.29 }}
      />
      {!markOnly && (
        <ThemedText style={[styles.logoName, { fontSize: size * 0.58, lineHeight: size * 0.75 }]}>
          ReviewWhistle
        </ThemedText>
      )}
    </View>
  );
}

/** Small capitals above a group of cards. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="sectionLabel" themeColor="tint" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

/** A thin line between rows inside a card. */
export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

type FieldProps = TextInputProps & {
  label?: string;
  /** Shown after the label in grey, like "(optional)". */
  labelNote?: string;
  /** A short explanation under the label. */
  hint?: string;
  left?: ReactNode;
};

/** A labelled text box. */
export function TextField({ label, labelNote, hint, left, style, multiline, ...rest }: FieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      {!!label && (
        <ThemedText type="smallBold">
          {label}
          {!!labelNote && (
            <ThemedText type="small" themeColor="textSecondary">
              {' '}
              {labelNote}
            </ThemedText>
          )}
        </ThemedText>
      )}
      {!!hint && (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      )}
      <View
        style={[
          styles.inputBox,
          multiline && styles.inputBoxMultiline,
          { backgroundColor: theme.backgroundElement, borderColor: theme.inputBorder },
        ]}>
        {left}
        <TextInput
          placeholderTextColor={theme.textSecondary}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline && styles.inputMultiline, { color: theme.text }, style]}
          {...rest}
        />
      </View>
    </View>
  );
}

/** Red text for something that went wrong. */
export function ErrorText({ children }: { children: ReactNode }) {
  const theme = useTheme();
  if (!children) return null;
  return (
    <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
      <ThemedText type="small" style={{ color: theme.danger }}>
        {children}
      </ThemedText>
    </View>
  );
}

/** A round badge with someone's initials. */
export function Avatar({ name, size = 44, solid }: { name: string; size?: number; solid?: boolean }) {
  const theme = useTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: solid ? size * 0.3 : size / 2,
          backgroundColor: solid ? theme.hero : theme.tintSoft,
        },
      ]}>
      <ThemedText
        style={{
          color: solid ? theme.heroText : theme.tintText,
          fontSize: size * 0.36,
          lineHeight: size * 0.44,
          fontWeight: 800,
        }}>
        {initials || '•'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
  },
  column: {
    width: '100%',
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
  },
  sectionLabel: {
    marginTop: Spacing.two,
    marginBottom: -Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  field: {
    gap: Spacing.two - Spacing.half,
  },
  inputBox: {
    minHeight: 52,
    borderRadius: Radius.input,
    borderWidth: 1,
    paddingHorizontal: Spacing.three - Spacing.half,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  inputBoxMultiline: {
    alignItems: 'stretch',
  },
  input: {
    flex: 1,
    minHeight: 50,
    fontSize: 16,
    fontFamily: fontFamilyFor(500),
    paddingVertical: Spacing.two,
  },
  inputMultiline: {
    minHeight: 132,
    paddingTop: Spacing.three - Spacing.half,
    lineHeight: 22,
  },
  error: {
    borderRadius: Radius.input,
    paddingVertical: Spacing.two + Spacing.half,
    paddingHorizontal: Spacing.three,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
  logoName: {
    fontWeight: 800,
    letterSpacing: -0.4,
  },
});

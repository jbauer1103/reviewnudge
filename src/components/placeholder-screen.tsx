import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PlaceholderScreenProps = {
  title: string;
  description: string;
  /** What this screen will do once it is built. */
  comingSoon: string[];
  /** Label above the list. Defaults to "Coming soon". */
  badge?: string;
  /** Anything extra to show under the list, like a button. */
  children?: ReactNode;
};

// A simple "coming soon" screen used by each tab until its real feature is built.
export function PlaceholderScreen({
  title,
  description,
  comingSoon,
  badge = 'Coming soon',
  children,
}: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === 'web' ? Spacing.six + Spacing.four : Spacing.four),
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        },
      ]}>
      <ThemedView style={styles.inner}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText themeColor="textSecondary">{description}</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedView type="tintSoft" style={styles.badge}>
            <ThemedText type="smallBold" themeColor="tint">
              {badge}
            </ThemedText>
          </ThemedView>
          {comingSoon.map((item) => (
            <ThemedText key={item} type="small" style={styles.item}>
              {'•'}  {item}
            </ThemedText>
          ))}
        </ThemedView>

        {children}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  card: {
    marginTop: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.one,
  },
  item: {
    lineHeight: 22,
  },
});

import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

// The "‹ Customers" link at the top of a screen that goes back one step.
export function BackLink({ title = 'Back' }: { title?: string }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title === 'Back' ? 'Back' : `Back to ${title}`}
      onPress={() => router.back()}
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Icon name="back" size={18} color={theme.tint} />
      <ThemedText style={[styles.text, { color: theme.tint }]}>{title}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    marginBottom: -8,
  },
  text: {
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.6,
  },
});

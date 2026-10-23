import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Logo } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Where Stripe sends the owner back after its payment or billing page (/billing, or
// /billing?done=1 after subscribing). No log in needed, so it works from the phone too.
export default function BillingReturnPage() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { done } = useLocalSearchParams<{ done?: string }>();
  // The page is built ahead of time without the link, so only read it once it's open.
  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setSubscribed(done === '1'));
  }, [done]);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.four },
      ]}>
      <ThemedView style={styles.inner}>
        <Logo />
        <ThemedText type="subtitle">{subscribed ? 'Thank you, you’re subscribed!' : 'All done'}</ThemedText>
        <ThemedText themeColor="textSecondary">
          On your phone? Tap Done (or ✕) at the top to go back to the app.
        </ThemedText>
        <Button title="Go to Settings" onPress={() => router.replace('/settings')} />
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
    maxWidth: 560,
    gap: Spacing.three,
  },
});

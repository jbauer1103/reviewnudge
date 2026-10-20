import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useSession } from '@/components/session-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The login link in the email opens this screen. SessionProvider reads the link and logs
// the owner in, then the app moves on to the tabs by itself.
export default function AuthCallbackScreen() {
  const { linkError } = useSession();
  const theme = useTheme();

  if (linkError) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator color={theme.tint} size="large" />
      <ThemedText themeColor="textSecondary">Logging you in…</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
});

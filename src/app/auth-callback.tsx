import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useSession } from '@/components/session-provider';
import { ThemedText } from '@/components/themed-text';
import { Card, ErrorText, Logo, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// The login link in the email opens this screen.
//
// New links carry ?token_hash=... and the owner taps "Log me in" to use it. Work email
// scanners (Microsoft 365, universities) open every link in an email to check it, which used
// up one-time links before the owner saw them. A scanner opens the page but never taps the
// button, so the link stays good for the owner.
//
// Older links already carry the login itself (#access_token=...), which SessionProvider reads.
// Either way the app moves on to the tabs by itself once the owner is logged in.
export default function AuthCallbackScreen() {
  const { linkError } = useSession();
  const theme = useTheme();
  const { token_hash: tokenHash, type } = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logIn() {
    if (!tokenHash) return;
    setLoggingIn(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === 'signup' ? 'signup' : 'email',
    });
    setLoggingIn(false);
    if (verifyError) {
      setError('That login link has expired or was already used. Send yourself a new one.');
    }
  }

  if (linkError) {
    return <Redirect href="/sign-in" />;
  }

  if (!tokenHash) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.tint} size="large" />
        <ThemedText themeColor="textSecondary">Logging you in…</ThemedText>
      </View>
    );
  }

  return (
    <Screen maxWidth={540} contentContainerStyle={styles.centered}>
      <Logo />
      <Card style={styles.card}>
        <ThemedText type="subtitle">Welcome back</ThemedText>
        <ThemedText themeColor="textSecondary">Tap the button to finish logging in.</ThemedText>
        <ErrorText>{error}</ErrorText>
        {error ? (
          <Button title="Send a new login email" onPress={() => router.replace('/sign-in')} />
        ) : (
          <Button title="Log me in" onPress={logIn} loading={loggingIn} />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  centered: {
    justifyContent: 'center',
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.four - Spacing.one,
  },
});

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Card, ErrorText, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// The public page linked at the bottom of follow-up emails (/unsubscribe?t=<token>). No log in.
// It waits for a tap, because work email scanners open every link in an email.
export default function UnsubscribeScreen() {
  const { t: token } = useLocalSearchParams<{ t: string }>();
  const [busy, setBusy] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('unsubscribe_email', { token });
    setBusy(false);
    if (rpcError || !data) {
      setError('That link didn’t work. Email jeff@reviewwhistle.com and we’ll take you off the list.');
      return;
    }
    setBusinessName(data as string);
  }

  return (
    <Screen maxWidth={520} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        {businessName ? (
          <>
            <ThemedText type="subtitle" style={styles.centered}>
              You’re unsubscribed
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              You won’t get any more emails from {businessName} through ReviewWhistle.
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText type="subtitle" style={styles.centered}>
              Stop these emails?
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              Tap below and you won’t get review reminder emails from this business again.
            </ThemedText>
            <ErrorText>{error}</ErrorText>
            <Button title="Unsubscribe" onPress={unsubscribe} loading={busy} disabled={!token} />
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  card: {
    alignItems: 'stretch',
    gap: Spacing.three,
    paddingVertical: Spacing.five - Spacing.one,
    paddingHorizontal: Spacing.four - Spacing.one,
    borderRadius: Radius.hero + Spacing.half,
  },
  centered: {
    textAlign: 'center',
  },
});

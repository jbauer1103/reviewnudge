import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, ErrorText, Screen, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Page = { name: string; google_review_url: string | null };

// The public page customers open from the review text (/r?b=<business id>). No log in.
// The business id is in the query string so the page works on a plain static host.
// Happy customers go to Google; unhappy ones can tell the business privately.
export default function CustomerReviewPage() {
  const theme = useTheme();
  const { b: id } = useLocalSearchParams<{ b: string }>();
  const [page, setPage] = useState<Page | null | undefined>(undefined);
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The page is built ahead of time without a link, so wait until it's open in the
    // customer's browser before deciding the link has no business id.
    if (!id) {
      Promise.resolve().then(() => setPage(null));
      return;
    }
    supabase.rpc('get_review_page', { page_business_id: id }).then(({ data }) => {
      setPage((data as Page[] | null)?.[0] ?? null);
    });
  }, [id]);

  async function send() {
    if (!message.trim()) {
      setError('Please tell us what happened.');
      return;
    }
    setSending(true);
    setError(null);
    const { error: sendError } = await supabase.rpc('submit_feedback', {
      page_business_id: id,
      feedback_message: message,
      feedback_contact: contact,
    });
    setSending(false);
    if (sendError) {
      setError('That didn’t send. Please try again in a minute.');
      return;
    }
    setSent(true);
  }

  const shown = page;

  return (
    <Screen maxWidth={520} contentContainerStyle={styles.content}>
      {shown === undefined ? null : shown === null ? (
        <Card style={styles.card}>
          <ThemedText style={styles.centered}>Sorry, we couldn’t find this page.</ThemedText>
        </Card>
      ) : sent ? (
        <Card style={styles.card}>
          <Avatar name={shown.name} size={64} solid />
          <ThemedText type="subtitle" style={styles.centered}>
            Thank you
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {shown.name} got your message and will use it to do better.
          </ThemedText>
        </Card>
      ) : (
        <>
          <Card style={styles.card}>
            <Avatar name={shown.name} size={64} solid />
            <View style={styles.titleBlock}>
              <ThemedText type="subtitle" style={styles.centered}>
                Thanks for choosing {shown.name}!
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={[styles.centered, styles.question]}>
                How did we do?
              </ThemedText>
            </View>
            {shown.google_review_url && (
              <ThemedText style={[styles.stars, { color: theme.star }]} accessibilityElementsHidden>
                ★★★★★
              </ThemedText>
            )}

            <View style={styles.actions}>
              {shown.google_review_url && (
                <Button
                  title="Great! Leave a Google review"
                  onPress={() => Linking.openURL(shown.google_review_url!)}
                />
              )}

              {writing ? (
                <View style={styles.form}>
                  <TextField
                    label="What went wrong?"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={2000}
                    placeholder="Only the business will see this."
                  />
                  <TextField
                    label="Your phone or email"
                    labelNote="(optional)"
                    value={contact}
                    onChangeText={setContact}
                    maxLength={200}
                    autoCapitalize="none"
                    placeholder="So they can make it right"
                  />
                  <ErrorText>{error}</ErrorText>
                  <Button title="Send privately" onPress={send} loading={sending} />
                </View>
              ) : (
                <Button
                  title="Something wasn’t right? Tell us privately"
                  variant="outline"
                  onPress={() => setWriting(true)}
                />
              )}
            </View>
          </Card>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            Private messages go only to the business, never to Google.
          </ThemedText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    gap: Spacing.three + Spacing.half,
    paddingVertical: Spacing.five - Spacing.one,
    paddingHorizontal: Spacing.four - Spacing.one,
    borderRadius: Radius.hero + Spacing.half,
  },
  titleBlock: {
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  centered: {
    textAlign: 'center',
  },
  question: {
    fontSize: 17,
  },
  stars: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 4,
  },
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.two + Spacing.half,
  },
  form: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});

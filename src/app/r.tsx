import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Page = { name: string; google_review_url: string | null };

// The public page customers open from the review text (/r?b=<business id>). No log in.
// The business id is in the query string so the page works on a plain static host.
// Happy customers go to Google; unhappy ones can tell the business privately.
export default function CustomerReviewPage() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.four },
      ]}>
      <ThemedView style={styles.inner}>
        {shown === undefined ? null : shown === null ? (
          <ThemedText>Sorry, we couldn’t find this page.</ThemedText>
        ) : sent ? (
          <>
            <ThemedText type="subtitle">Thank you</ThemedText>
            <ThemedText themeColor="textSecondary">
              {shown.name} got your message and will use it to do better.
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText type="subtitle">Thanks for choosing {shown.name}!</ThemedText>
            <ThemedText themeColor="textSecondary">How did we do?</ThemedText>

            {shown.google_review_url && (
              <Button
                title="★  Great! Leave a Google review"
                onPress={() => Linking.openURL(shown.google_review_url!)}
              />
            )}

            {writing ? (
              <>
                <ThemedText type="smallBold">What went wrong?</ThemedText>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                  placeholder="Only the business will see this."
                  placeholderTextColor={theme.textSecondary}
                  style={[inputStyle, styles.messageInput]}
                />
                <ThemedText type="smallBold">Your phone or email (optional)</ThemedText>
                <TextInput
                  value={contact}
                  onChangeText={setContact}
                  maxLength={200}
                  autoCapitalize="none"
                  placeholder="So they can make it right"
                  placeholderTextColor={theme.textSecondary}
                  style={inputStyle}
                />
                {error && (
                  <ThemedText type="small" style={styles.error}>
                    {error}
                  </ThemedText>
                )}
                <Button title="Send privately" onPress={send} loading={sending} />
              </>
            ) : (
              <Button
                title="Something wasn’t right? Tell us privately"
                variant="secondary"
                onPress={() => setWriting(true)}
              />
            )}
          </>
        )}
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
  input: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  messageInput: {
    minHeight: 120,
    paddingTop: Spacing.three,
  },
  error: {
    color: '#D93025',
  },
});

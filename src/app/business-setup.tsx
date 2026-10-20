import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useBusiness } from '@/components/business-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fillMessage } from '@/lib/message';
import { supabase } from '@/lib/supabase';

// Same wording as the database default, used until the owner saves their own.
const DEFAULT_MESSAGE =
  'Hi {customer}, thanks for choosing {business}! If you have a minute, would you leave us a quick Google review? It really helps us out: {link}';

// Business setup: shown right after the first log in, and from Settings to make changes.
export default function BusinessSetupScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { business, loadError, reload } = useBusiness();
  const isEditing = !!business;

  const [name, setName] = useState(business?.name ?? '');
  const [reviewUrl, setReviewUrl] = useState(business?.google_review_url ?? '');
  const [message, setMessage] = useState(business?.message_template ?? DEFAULT_MESSAGE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmedName = name.trim();
    const trimmedUrl = reviewUrl.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setError('Please enter your business name.');
      return;
    }
    if (trimmedUrl && !/^https?:\/\/\S+$/i.test(trimmedUrl)) {
      setError('The Google review link should start with https://');
      return;
    }
    if (!trimmedMessage.includes('{link}')) {
      setError('Your message needs {link} in it, so customers get your review link.');
      return;
    }

    setSaving(true);
    setError(null);
    const values = {
      name: trimmedName,
      google_review_url: trimmedUrl || null,
      message_template: trimmedMessage,
    };
    // Supabase fills in the owner from the login, and row-level security only lets
    // the owner change their own business.
    const { error: saveError } = business
      ? await supabase.from('businesses').update(values).eq('id', business.id)
      : await supabase.from('businesses').insert(values);

    if (saveError) {
      setSaving(false);
      setError('Couldn’t save. Check your internet connection and try again.');
      return;
    }

    await reload();
    setSaving(false);
    if (isEditing) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];
  const preview = fillMessage(message, {
    customer: 'Sam',
    business: name.trim() || 'your business',
    link: reviewUrl.trim() || 'https://g.page/r/your-link/review',
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
        ]}>
        <ThemedView style={styles.inner}>
          <ThemedText type="subtitle">{isEditing ? 'Your business' : 'Set up your business'}</ThemedText>
          {!isEditing && (
            <ThemedText themeColor="textSecondary">
              Tell us a little about your business. You can change this later in Settings.
            </ThemedText>
          )}
          {loadError && (
            <ThemedText type="small" style={styles.error}>
              Couldn’t load your business: {loadError}
            </ThemedText>
          )}

          <ThemedText type="smallBold">Business name</ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Sparkle Cleaning Co."
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            returnKeyType="next"
            style={inputStyle}
          />

          <ThemedText type="smallBold">Google review link</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Search for your business on Google, tap “Ask for reviews” (or “Share review form”) on
            your listing, and paste the link here.
          </ThemedText>
          <TextInput
            value={reviewUrl}
            onChangeText={setReviewUrl}
            placeholder="https://g.page/r/..."
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
            style={inputStyle}
          />

          <ThemedText type="smallBold">Your review text message</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {'{customer}'} becomes the customer’s first name, {'{business}'} your business name,
            and {'{link}'} your review link.
          </ThemedText>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            style={[inputStyle, styles.messageInput]}
          />
          <Button
            title="Reset to the suggested message"
            variant="secondary"
            onPress={() => setMessage(DEFAULT_MESSAGE)}
          />

          <ThemedView type="backgroundElement" style={styles.preview}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Preview
            </ThemedText>
            <ThemedText type="small">{preview}</ThemedText>
          </ThemedView>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Button title={isEditing ? 'Save changes' : 'Save and continue'} onPress={save} loading={saving} />
          {isEditing && <Button title="Cancel" variant="secondary" onPress={() => router.back()} />}
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  messageInput: {
    minHeight: 120,
    paddingTop: Spacing.three,
  },
  preview: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
    marginVertical: Spacing.two,
  },
  error: {
    color: '#D93025',
  },
});

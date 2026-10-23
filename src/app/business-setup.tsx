import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/back-link';
import { Button } from '@/components/button';
import { useBusiness } from '@/components/business-provider';
import { GoogleListingSearch, type GoogleListing } from '@/components/google-listing-search';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, ErrorText, Screen, ScreenHeader, SectionLabel, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fillMessage } from '@/lib/message';
import { supabase } from '@/lib/supabase';

// Same wording as the database default, used until the owner saves their own.
const DEFAULT_MESSAGE =
  'Hi {customer}, thanks for choosing {business}! If you have a minute, would you leave us a quick Google review? It really helps us out: {link}';

// Business setup: shown right after the first log in, and from Settings to make changes.
export default function BusinessSetupScreen() {
  const theme = useTheme();
  const { business, loadError, reload } = useBusiness();
  const isEditing = !!business;

  const [name, setName] = useState(business?.name ?? '');
  const [reviewUrl, setReviewUrl] = useState(business?.google_review_url ?? '');
  const [placeId, setPlaceId] = useState(business?.google_place_id ?? null);
  // The listing picked from Google search on this visit to the screen.
  const [picked, setPicked] = useState<GoogleListing | null>(null);
  const [searchingAgain, setSearchingAgain] = useState(false);
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
      google_place_id: placeId,
      message_template: trimmedMessage,
      // Remember the review count when a new listing is picked, for "reviews gained".
      ...(picked && picked.placeId !== business?.google_place_id
        ? {
            google_review_count_at_start: picked.reviewCount,
            google_review_count_latest: picked.reviewCount,
            google_review_count_checked_at: new Date().toISOString(),
          }
        : {}),
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

  const preview = fillMessage(message, {
    customer: 'Sam',
    business: name.trim() || 'your business',
    link: reviewUrl.trim() || 'https://g.page/r/your-link/review',
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <Screen>
        {isEditing && <BackLink />}
        <ScreenHeader title={isEditing ? 'Your business' : 'Set up your business'} />
        {!isEditing && (
          <ThemedText themeColor="textSecondary" style={styles.intro}>
            Tell us a little about your business. You can change this later in Settings.
          </ThemedText>
        )}
        {loadError && <ErrorText>Couldn’t load your business: {loadError}</ErrorText>}

        <TextField
          label="Business name"
          value={name}
          onChangeText={setName}
          placeholder="Sparkle Cleaning Co."
          autoCapitalize="words"
          returnKeyType="next"
        />

        <SectionLabel>Your Google listing</SectionLabel>
        {placeId && !searchingAgain ? (
          <Card style={styles.listing}>
            <View style={styles.listingTop}>
              <Avatar name={picked?.name ?? name} size={44} solid />
              <View style={styles.listingText}>
                <ThemedText style={styles.listingName}>{picked?.name ?? name}</ThemedText>
                {picked && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {picked.address}
                  </ThemedText>
                )}
                <View style={styles.linked}>
                  <Icon name="check" size={12} color={theme.tintText} />
                  <ThemedText type="small" style={[styles.linkedText, { color: theme.tintText }]}>
                    Linked to your Google listing
                  </ThemedText>
                </View>
              </View>
            </View>
            <Button
              title="Pick a different listing"
              variant="outline"
              size="small"
              onPress={() => setSearchingAgain(true)}
            />
          </Card>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Search for your business and tap it, so customers go straight to your review box.
            </ThemedText>
            <GoogleListingSearch
              initialQuery={name}
              onPick={(listing) => {
                setPicked(listing);
                setPlaceId(listing.placeId);
                setReviewUrl(listing.reviewUrl);
                setSearchingAgain(false);
                if (!name.trim()) setName(listing.name);
              }}
            />
          </>
        )}

        <TextField
          label="Google review link"
          hint="Filled in when you pick your listing. Can’t find it? On Google, tap “Ask for reviews” on your listing and paste that link here."
          value={reviewUrl}
          onChangeText={(text) => {
            setReviewUrl(text);
            // A pasted link may be for a different listing than the one picked.
            setPlaceId(null);
            setPicked(null);
          }}
          placeholder="https://g.page/r/..."
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          textContentType="URL"
        />

        <SectionLabel>Your review text message</SectionLabel>
        <TextField
          hint={`{customer} becomes the customer’s first name, {business} your business name, and {link} your review link.`}
          value={message}
          onChangeText={setMessage}
          multiline
          accessibilityLabel="Your review text message"
        />
        <Button
          title="Reset to the suggested message"
          variant="ghost"
          size="small"
          onPress={() => setMessage(DEFAULT_MESSAGE)}
          style={styles.reset}
        />

        <View style={styles.previewWrap}>
          <ThemedText type="sectionLabel" themeColor="tint">
            Preview
          </ThemedText>
          <View style={[styles.bubble, { backgroundColor: theme.tint }]}>
            <ThemedText type="small" style={{ color: theme.onTint }}>
              {preview}
            </ThemedText>
          </View>
        </View>

        <ErrorText>{error}</ErrorText>

        <View style={styles.buttons}>
          <Button title={isEditing ? 'Save changes' : 'Save and continue'} onPress={save} loading={saving} />
          {isEditing && <Button title="Cancel" variant="ghost" onPress={() => router.back()} />}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  intro: {
    marginTop: -Spacing.two,
  },
  listing: {
    gap: Spacing.three,
  },
  listingTop: {
    flexDirection: 'row',
    gap: Spacing.three - Spacing.one,
  },
  listingText: {
    flex: 1,
    gap: Spacing.half,
  },
  listingName: {
    fontWeight: 700,
  },
  linked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  linkedText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
  },
  reset: {
    alignSelf: 'flex-start',
    marginTop: -Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  previewWrap: {
    gap: Spacing.two,
  },
  // Looks like a sent text message.
  bubble: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    borderRadius: Radius.hero,
    borderBottomRightRadius: Spacing.one + Spacing.half,
    paddingVertical: Spacing.two + Spacing.half,
    paddingHorizontal: Spacing.three - Spacing.half,
  },
  buttons: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
});

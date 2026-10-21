import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export type GoogleListing = {
  placeId: string;
  name: string;
  address: string;
  reviewCount: number;
  reviewUrl: string;
};

type Props = {
  /** What to search for at first, usually the business name. */
  initialQuery: string;
  onPick: (listing: GoogleListing) => void;
};

// Search Google for the business and tap the right listing. The search itself runs in
// our Supabase server function `find-business`, which holds the Google key.
export function GoogleListingSearch({ initialQuery, onPick }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GoogleListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError('Type your business name, and your city if it’s a common name.');
      return;
    }
    setSearching(true);
    setError(null);
    const { data, error: searchError } = await supabase.functions.invoke<{ places: GoogleListing[] }>(
      'find-business',
      { body: { query: trimmed } },
    );
    setSearching(false);
    if (searchError || !data) {
      setError('Google search didn’t work. Try again, or paste your review link below.');
      return;
    }
    setResults(data.places);
  }

  return (
    <ThemedView style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={search}
        placeholder="Business name and city"
        placeholderTextColor={theme.textSecondary}
        returnKeyType="search"
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <Button title="Search Google" variant="secondary" onPress={search} loading={searching} />

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
      {results?.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No listings found. Try adding your city, or paste your review link below.
        </ThemedText>
      )}
      {results?.map((listing) => (
        <Pressable
          key={listing.placeId}
          accessibilityRole="button"
          onPress={() => {
            onPick(listing);
            setResults(null);
          }}
          style={({ pressed }) => [
            styles.result,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">{listing.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {listing.address}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {listing.reviewCount} Google {listing.reviewCount === 1 ? 'review' : 'reviews'}
          </ThemedText>
        </Pressable>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  result: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
  error: {
    color: '#D93025',
  },
});

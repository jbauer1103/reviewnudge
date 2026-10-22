import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ErrorText, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
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
    <View style={styles.container}>
      <TextField
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={search}
        placeholder="Business name and city"
        returnKeyType="search"
        accessibilityLabel="Search Google for your business"
        left={<Icon name="search" size={18} color={theme.textSecondary} />}
      />
      <Button title="Search Google" variant="secondary" onPress={search} loading={searching} />

      <ErrorText>{error}</ErrorText>
      {results?.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No listings found. Try adding your city, or paste your review link below.
        </ThemedText>
      )}
      {!!results?.length && (
        <ThemedText type="small" themeColor="textSecondary">
          Tap your business:
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
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <View style={styles.resultText}>
            <ThemedText style={styles.resultName}>{listing.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {listing.address}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              <ThemedText type="small" style={{ color: theme.star }}>
                ★
              </ThemedText>{' '}
              {listing.reviewCount} Google {listing.reviewCount === 1 ? 'review' : 'reviews'}
            </ThemedText>
          </View>
          <Icon name="chevron" size={16} color={theme.textSecondary} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two + Spacing.half,
  },
  result: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  resultText: {
    flex: 1,
    gap: Spacing.half,
  },
  resultName: {
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.6,
  },
});

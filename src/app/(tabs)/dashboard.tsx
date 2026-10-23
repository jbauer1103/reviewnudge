import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { useBusiness } from '@/components/business-provider';
import { ThemedText } from '@/components/themed-text';
import { Card, ErrorText, Screen, ScreenHeader, SectionLabel } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Stats = {
  requestsTotal: number;
  requestsThisMonth: number;
  /** Google review count when the owner picked their listing. */
  reviewsAtStart: number | null;
  /** Google review count now (checked by our review-count server function). */
  reviewsNow: number | null;
  /** Newest private feedback from the customer page. */
  feedback: { id: string; message: string; contact: string | null; created_at: string }[];
};

export default function DashboardScreen() {
  const theme = useTheme();
  const { business } = useBusiness();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!business) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, thisMonth, start, now, feedback] = await Promise.all([
      supabase
        .from('review_requests')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id),
      supabase
        .from('review_requests')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('sent_at', startOfMonth.toISOString()),
      supabase
        .from('businesses')
        .select('google_review_count_at_start')
        .eq('id', business.id)
        .single(),
      supabase.functions.invoke<{ reviewCount: number | null }>('review-count'),
      supabase
        .from('feedback')
        .select('id, message, contact, created_at')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (total.error || thisMonth.error) {
      setError('Couldn’t load your numbers. Check your internet connection.');
      return;
    }
    setError(now.error ? 'Couldn’t check Google right now. Pull down to try again.' : null);
    setStats({
      requestsTotal: total.count ?? 0,
      requestsThisMonth: thisMonth.count ?? 0,
      reviewsAtStart: start.data?.google_review_count_at_start ?? null,
      reviewsNow: now.data?.reviewCount ?? null,
      feedback: feedback.data ?? [],
    });
  }, [business]);

  // Reload whenever the tab is shown, so new requests show up right away.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const hasListing = !!business?.google_place_id;
  const gained =
    stats?.reviewsNow != null && stats.reviewsAtStart != null
      ? Math.max(0, stats.reviewsNow - stats.reviewsAtStart)
      : null;

  return (
    <Screen hasTabs refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <ScreenHeader eyebrow={business?.name} title="Dashboard" />

      <View style={[styles.hero, { backgroundColor: theme.hero, boxShadow: HeroShadow }]}>
        <ThemedText type="smallBold" style={{ color: theme.heroTextSoft }}>
          Google reviews gained since you joined
        </ThemedText>
        {hasListing ? (
          <>
            <View style={styles.heroNumberRow}>
              <ThemedText type="title" style={{ color: theme.heroText }}>
                {gained != null ? `+${gained}` : '–'}
              </ThemedText>
              <ThemedText style={[styles.stars, { color: theme.star }]}>★★★★★</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.heroTextSoft }}>
              {stats?.reviewsNow != null && stats.reviewsAtStart != null
                ? `${stats.reviewsAtStart} when you joined, ${stats.reviewsNow} now`
                : ' '}
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText style={[styles.heroMessage, { color: theme.heroText }]}>
              Pick your Google listing so we can count your new reviews.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/business-setup')}
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.hero }}>
                Find my Google listing
              </ThemedText>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.tiles}>
        <Card style={styles.tile}>
          <ThemedText type="smallBold" themeColor="textMuted">
            Requests sent
          </ThemedText>
          <ThemedText type="subtitle" style={styles.tileNumber}>
            {stats ? stats.requestsTotal : '–'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            all time
          </ThemedText>
        </Card>
        <Card style={styles.tile}>
          <ThemedText type="smallBold" themeColor="textMuted">
            This month
          </ThemedText>
          <ThemedText type="subtitle" style={styles.tileNumber}>
            {stats ? stats.requestsThisMonth : '–'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {stats?.requestsThisMonth === 1 ? 'request' : 'requests'}
          </ThemedText>
        </Card>
      </View>

      <SectionLabel>Private feedback</SectionLabel>
      {stats?.feedback.length ? (
        stats.feedback.map((item) => (
          <Card key={item.id} style={styles.feedback}>
            <ThemedText style={styles.feedbackMessage}>{item.message}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[new Date(item.created_at).toLocaleDateString(), item.contact].filter(Boolean).join('  ·  ')}
            </ThemedText>
          </Card>
        ))
      ) : (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            None yet. Unhappy customers can tell you privately here instead of on Google.
          </ThemedText>
        </Card>
      )}

      <ErrorText>{error}</ErrorText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        We check Google every few hours, so a new review can take a while to show up here.
      </ThemedText>
    </Screen>
  );
}

/** The green glow under the big card, like the website's green buttons. */
const HeroShadow = '0px 18px 36px -20px rgba(15, 123, 95, 0.8)';

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.hero,
    padding: Spacing.four - Spacing.half,
    gap: Spacing.one,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stars: {
    fontSize: 18,
    letterSpacing: 2,
  },
  heroMessage: {
    marginVertical: Spacing.two,
  },
  heroButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.button,
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.three - Spacing.one,
  },
  tile: {
    flex: 1,
    gap: Spacing.one,
  },
  tileNumber: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.2,
  },
  feedback: {
    gap: Spacing.two,
  },
  feedbackMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
  footnote: {
    paddingHorizontal: Spacing.one,
  },
});

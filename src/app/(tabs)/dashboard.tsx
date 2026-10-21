import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useBusiness } from '@/components/business-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
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
  const insets = useSafeAreaInsets();
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
    <ScrollView
      style={{ backgroundColor: theme.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === 'web' ? Spacing.six + Spacing.four : Spacing.four),
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        },
      ]}>
      <ThemedView style={styles.inner}>
        <ThemedText type="subtitle">Dashboard</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            Review requests sent
          </ThemedText>
          <ThemedText type="title">{stats ? stats.requestsTotal : '–'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {stats ? `${stats.requestsThisMonth} this month` : ' '}
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            Google reviews gained since you joined
          </ThemedText>
          {hasListing ? (
            <>
              <ThemedText type="title" themeColor="tint">
                {gained != null ? `+${gained}` : '–'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {stats?.reviewsNow != null && stats.reviewsAtStart != null
                  ? `${stats.reviewsAtStart} when you joined, ${stats.reviewsNow} now`
                  : ' '}
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText type="small">
                Pick your Google listing so we can count your new reviews.
              </ThemedText>
              <Button title="Find my Google listing" onPress={() => router.push('/business-setup')} />
            </>
          )}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            Private feedback from customers
          </ThemedText>
          {stats?.feedback.length ? (
            stats.feedback.map((item) => (
              <ThemedView key={item.id} type="backgroundElement" style={styles.feedback}>
                <ThemedText type="small">{item.message}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[new Date(item.created_at).toLocaleDateString(), item.contact]
                    .filter(Boolean)
                    .join('  ·  ')}
                </ThemedText>
              </ThemedView>
            ))
          ) : (
            <ThemedText type="small">
              None yet. Unhappy customers can tell you privately here instead of on Google.
            </ThemedText>
          )}
        </ThemedView>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          We check Google every few hours, so a new review can take a while to show up here.
        </ThemedText>
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
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  feedback: {
    marginTop: Spacing.two,
    gap: Spacing.half,
  },
  error: {
    color: '#D93025',
  },
});

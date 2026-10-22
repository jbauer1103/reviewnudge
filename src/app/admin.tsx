import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/back-link';
import { ThemedText } from '@/components/themed-text';
import { Card, Divider, ErrorText, Screen, ScreenHeader, SectionLabel } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PRICE_LABEL } from '@/lib/billing';
import { supabase } from '@/lib/supabase';

// The plan names the admin_stats database function uses.
type PlanName = 'paying' | 'subscribed_trial' | 'payment_failed' | 'cancelling' | 'cancelled' | 'trial' | 'trial_ended';

type AdminStats = {
  businesses: number;
  signups_7_days: number;
  signups_30_days: number;
  plans: Partial<Record<PlanName, number>>;
  requests_total: number;
  requests_30_days: number;
  follow_ups_sent: number;
  feedback_total: number;
  recent: {
    name: string;
    email: string | null;
    created_at: string;
    plan: PlanName;
    requests: number;
    last_sent_at: string | null;
  }[];
};

const PLAN_LABELS: Record<PlanName, string> = {
  paying: 'Paying',
  subscribed_trial: 'Subscribed, still in free days',
  payment_failed: 'Payment failed',
  cancelling: 'Cancelling',
  cancelled: 'Cancelled',
  trial: 'Free trial',
  trial_ended: 'Trial ended, not paying',
};

// Jeff's owner dashboard: every business that has signed up, across the whole app.
// Only logins listed in the `admins` table get numbers; everyone else gets an error.
export default function AdminScreen() {
  const theme = useTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_stats');
    if (error) {
      setError(
        error.code === '42501'
          ? 'This page is only for the ReviewWhistle owner.'
          : 'Couldn’t load the numbers. Check your internet connection.',
      );
      return;
    }
    setError(null);
    setStats(data as AdminStats);
  }, []);

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

  const plans = stats?.plans ?? {};
  const paying = (plans.paying ?? 0) + (plans.payment_failed ?? 0);
  const monthlyPrice = Number(PRICE_LABEL.replace(/[^0-9.]/g, ''));

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <BackLink title="Settings" />
      <ScreenHeader eyebrow="ReviewWhistle" title="Owner dashboard" />

      <View style={[styles.hero, { backgroundColor: theme.hero }]}>
        <ThemedText type="smallBold" style={{ color: theme.heroTextSoft }}>
          Paying subscribers
        </ThemedText>
        <ThemedText type="title" style={{ color: theme.heroText }}>
          {stats ? paying : '–'}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.heroTextSoft }}>
          {stats ? `About $${paying * monthlyPrice} a month (CAD and USD mixed)` : ' '}
        </ThemedText>
      </View>

      <View style={styles.tiles}>
        <Tile label="Signups" value={stats?.businesses} note="all time" />
        <Tile label="Last 7 days" value={stats?.signups_7_days} note="new signups" />
      </View>
      <View style={styles.tiles}>
        <Tile label="In free trial" value={stats ? (plans.trial ?? 0) + (plans.subscribed_trial ?? 0) : undefined} note="businesses" />
        <Tile label="Cancelled" value={stats ? (plans.cancelled ?? 0) + (plans.cancelling ?? 0) : undefined} note="incl. cancelling" />
      </View>

      <SectionLabel>Plans</SectionLabel>
      <Card style={styles.group}>
        {(Object.keys(PLAN_LABELS) as PlanName[]).map((plan, index) => (
          <View key={plan}>
            {index > 0 && <Divider />}
            <View style={styles.row}>
              <ThemedText>{PLAN_LABELS[plan]}</ThemedText>
              <ThemedText type="smallBold">{stats ? (plans[plan] ?? 0) : '–'}</ThemedText>
            </View>
          </View>
        ))}
      </Card>

      <SectionLabel>Activity</SectionLabel>
      <Card style={styles.group}>
        <Line label="Review requests sent" value={stats?.requests_total} />
        <Divider />
        <Line label="Review requests, last 30 days" value={stats?.requests_30_days} />
        <Divider />
        <Line label="Follow-up emails sent" value={stats?.follow_ups_sent} />
        <Divider />
        <Line label="Private feedback received" value={stats?.feedback_total} />
      </Card>

      <SectionLabel>Newest signups</SectionLabel>
      {stats?.recent.length ? (
        <Card style={styles.group}>
          {stats.recent.map((business, index) => (
            <View key={`${business.created_at}-${index}`}>
              {index > 0 && <Divider />}
              <View style={styles.signup}>
                <View style={styles.signupTop}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.signupName}>
                    {business.name}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={[
                      styles.badge,
                      {
                        backgroundColor: business.plan === 'paying' ? theme.hero : theme.backgroundSelected,
                        color: business.plan === 'paying' ? theme.heroText : theme.text,
                      },
                    ]}>
                    {PLAN_LABELS[business.plan]}
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {business.email ?? 'No email'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Joined {formatDate(business.created_at)} · {business.requests}{' '}
                  {business.requests === 1 ? 'request' : 'requests'}
                  {business.last_sent_at ? `, last ${formatDate(business.last_sent_at)}` : ''}
                </ThemedText>
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {stats ? 'No signups yet.' : 'Loading…'}
          </ThemedText>
        </Card>
      )}

      <ErrorText>{error}</ErrorText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        Pull down to refresh. Payments and invoices are in your Stripe dashboard.
      </ThemedText>
    </Screen>
  );
}

function Tile({ label, value, note }: { label: string; value: number | undefined; note: string }) {
  return (
    <Card style={styles.tile}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.tileNumber}>
        {value ?? '–'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {note}
      </ThemedText>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: number | undefined }) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.lineLabel}>{label}</ThemedText>
      <ThemedText type="smallBold">{value ?? '–'}</ThemedText>
    </View>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.hero,
    padding: Spacing.four - Spacing.half,
    gap: Spacing.one,
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
    fontSize: 32,
    lineHeight: 38,
  },
  group: {
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  lineLabel: {
    flexShrink: 1,
  },
  signup: {
    padding: Spacing.three,
    gap: 2,
  },
  signupTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  signupName: {
    flexShrink: 1,
  },
  badge: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  footnote: {
    paddingHorizontal: Spacing.one,
  },
});

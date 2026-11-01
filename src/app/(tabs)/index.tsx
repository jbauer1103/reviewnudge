import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useBusiness } from '@/components/business-provider';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Card,
  ErrorText,
  ScreenHeader,
  TextField,
  useBottomPadding,
  useTopPadding,
} from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { askForReview } from '@/lib/ask-for-review';
import { hasAccess } from '@/lib/billing';
import { CUSTOMER_COLUMNS, type Customer } from '@/lib/customers';
import { formatPhone } from '@/lib/phone';
import { supabase } from '@/lib/supabase';

// The Customers tab. It is the app's first screen, so it lives at index.tsx.
export default function CustomersScreen() {
  const theme = useTheme();
  const paddingTop = useTopPadding(true);
  const paddingBottom = useBottomPadding(true);
  const { business } = useBusiness();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // When each customer was last asked for a review, by customer id.
  const [lastAsked, setLastAsked] = useState<Record<string, string>>({});
  const [askingId, setAskingId] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  // Reload every time the tab is shown, so new and edited customers appear.
  useFocusEffect(
    useCallback(() => {
      if (!business) return;
      let current = true;
      supabase
        .from('customers')
        .select(CUSTOMER_COLUMNS)
        .eq('business_id', business.id)
        .order('name')
        .then(({ data, error }) => {
          if (!current) return;
          setCustomers(data ?? []);
          setLoadError(error ? 'Couldn’t load your customers. Check your internet connection.' : null);
        });
      supabase
        .from('review_requests')
        .select('customer_id, sent_at')
        .eq('business_id', business.id)
        .order('sent_at', { ascending: false })
        .then(({ data }) => {
          if (current) setLastAsked(latestByCustomer(data ?? []));
        });
      return () => {
        current = false;
      };
    }, [business]),
  );

  async function ask(customer: Customer) {
    if (!business) return;
    if (!hasAccess(business)) {
      setAskError('Your free trial has ended. Go to Settings to see your plan.');
      return;
    }
    setAskError(null);
    setAskingId(customer.id);
    try {
      if (await askForReview(business, customer)) {
        setLastAsked((previous) => ({ ...previous, [customer.id]: new Date().toISOString() }));
      }
    } catch (error) {
      setAskError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
    setAskingId(null);
  }

  const query = search.trim().toLowerCase();
  const queryDigits = query.replace(/\D/g, '');
  const shown = (customers ?? []).filter(
    (customer) =>
      !query ||
      customer.name.toLowerCase().includes(query) ||
      (customer.email ?? '').toLowerCase().includes(query) ||
      (queryDigits.length > 0 && (customer.phone ?? '').includes(queryDigits)),
  );

  // Customers never asked, from what's already loaded. lastAsked has every customer asked.
  const notAskedCount = (customers ?? []).filter((customer) => customer.phone && !lastAsked[customer.id]).length;

  const openCustomer = (id: string) => router.push({ pathname: '/customer/[id]', params: { id } });

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
      keyboardShouldPersistTaps="handled"
      data={shown}
      keyExtractor={(customer) => customer.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <ScreenHeader
            eyebrow={business?.name}
            title="Customers"
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add customer"
                onPress={() => openCustomer('new')}
                style={({ pressed }) => [styles.addButton, { backgroundColor: theme.tint }, pressed && styles.pressed]}>
                <Icon name="add" size={22} color={theme.onTint} />
              </Pressable>
            }
          />
          {(customers?.length ?? 0) > 0 && (
            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, phone or email"
              autoCorrect={false}
              clearButtonMode="while-editing"
              accessibilityLabel="Search customers"
              left={<Icon name="search" size={18} color={theme.textSecondary} />}
            />
          )}
          {notAskedCount >= 2 && (
            <Button
              variant="secondary"
              icon="star"
              title={`Ask ${notAskedCount} customers you haven’t asked`}
              onPress={() => router.push('/ask-past')}
            />
          )}
          <ErrorText>{askError}</ErrorText>
          <ErrorText>{loadError}</ErrorText>
        </View>
      }
      ListEmptyComponent={
        customers === null ? null : customers.length === 0 ? (
          <Card style={styles.empty}>
            <ThemedText type="smallBold" style={styles.centered}>
              No customers yet
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              Add the people you do jobs for, then ask them for a Google review in one tap.
            </ThemedText>
            <Button title="Add your first customer" icon="add" onPress={() => openCustomer('new')} />
          </Card>
        ) : (
          <ThemedText themeColor="textSecondary" style={[styles.centered, styles.noMatch]}>
            No customers match your search.
          </ThemedText>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => openCustomer(item.id)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <Avatar name={item.name} />
          <View style={styles.rowText}>
            <ThemedText type="default" style={styles.name} numberOfLines={1}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {[formatPhone(item.phone), item.email].filter(Boolean).join('  ·  ')}
            </ThemedText>
            {lastAsked[item.id] && (
              <View style={styles.asked}>
                <Icon name="check" size={12} color={theme.tintText} />
                <ThemedText type="small" style={[styles.askedText, { color: theme.tintText }]}>
                  Asked {formatDate(lastAsked[item.id])}
                </ThemedText>
              </View>
            )}
          </View>
          <Button
            size="small"
            variant={lastAsked[item.id] ? 'outline' : 'primary'}
            icon={lastAsked[item.id] ? undefined : 'star'}
            title={lastAsked[item.id] ? 'Ask again' : 'Ask'}
            accessibilityLabel={`Ask ${item.name} for a review`}
            onPress={() => ask(item)}
            loading={askingId === item.id}
            disabled={askingId !== null}
          />
        </Pressable>
      )}
    />
  );
}

// Keeps only the newest request for each customer (rows arrive newest first).
function latestByCustomer(rows: { customer_id: string | null; sent_at: string }[]) {
  const latest: Record<string, string> = {};
  for (const row of rows) {
    if (row.customer_id && !latest[row.customer_id]) latest[row.customer_id] = row.sent_at;
  }
  return latest;
}

// Shows a date like "Oct 21" (or "Oct 21, 2025" for an older year) in the phone's language.
function formatDate(iso: string) {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    gap: Spacing.two + Spacing.half,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    padding: Spacing.three - Spacing.half,
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    fontWeight: 600,
  },
  asked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  askedText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.6,
  },
  empty: {
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    marginTop: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
  noMatch: {
    marginTop: Spacing.four,
  },
});

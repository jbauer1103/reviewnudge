import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useBusiness } from '@/components/business-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CUSTOMER_COLUMNS, type Customer } from '@/lib/customers';
import { formatPhone } from '@/lib/phone';
import { supabase } from '@/lib/supabase';

// The Customers tab. It is the app's first screen, so it lives at index.tsx.
export default function CustomersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { business } = useBusiness();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
      return () => {
        current = false;
      };
    }, [business]),
  );

  const query = search.trim().toLowerCase();
  const queryDigits = query.replace(/\D/g, '');
  const shown = (customers ?? []).filter(
    (customer) =>
      !query ||
      customer.name.toLowerCase().includes(query) ||
      (customer.email ?? '').toLowerCase().includes(query) ||
      (queryDigits.length > 0 && (customer.phone ?? '').includes(queryDigits)),
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === 'web' ? Spacing.six + Spacing.four : Spacing.four),
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      data={shown}
      keyExtractor={(customer) => customer.id}
      ListHeaderComponent={
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Customers</ThemedText>
          <Button title="Add customer" onPress={() => router.push({ pathname: '/customer/[id]', params: { id: 'new' } })} />
          {(customers?.length ?? 0) > 0 && (
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, phone or email"
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          )}
          {loadError && (
            <ThemedText type="small" style={styles.error}>
              {loadError}
            </ThemedText>
          )}
        </ThemedView>
      }
      ListEmptyComponent={
        customers === null ? null : (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {customers.length === 0
              ? 'No customers yet. Tap “Add customer” to add your first one.'
              : 'No customers match your search.'}
          </ThemedText>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/customer/[id]', params: { id: item.id } })}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">{item.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {[formatPhone(item.phone), item.email].filter(Boolean).join('  ·  ')}
          </ThemedText>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  search: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  error: {
    color: '#D93025',
  },
});

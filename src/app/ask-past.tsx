import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/back-link';
import { Button } from '@/components/button';
import { useBusiness } from '@/components/business-provider';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, ErrorText, Screen, ScreenHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { askForReview } from '@/lib/ask-for-review';
import { hasAccess } from '@/lib/billing';
import { CUSTOMER_COLUMNS, notYetAsked, type Customer } from '@/lib/customers';
import { formatPhone } from '@/lib/phone';
import { supabase } from '@/lib/supabase';

// "Ask past customers": goes through every customer who has never been asked, one at a
// time. Each tap opens Messages for that one customer (never a group text), then moves on.
export default function AskPastCustomersScreen() {
  const { business } = useBusiness();
  // The customers to go through, fixed when the screen opens so the count doesn't jump.
  const [queue, setQueue] = useState<Customer[] | null>(null);
  const [position, setPosition] = useState(0);
  const [askedCount, setAskedCount] = useState(0);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!business) return;
    Promise.all([
      supabase.from('customers').select(CUSTOMER_COLUMNS).eq('business_id', business.id).order('name'),
      supabase.from('review_requests').select('customer_id').eq('business_id', business.id),
    ]).then(([customers, requests]) => {
      if (customers.error || requests.error) {
        setError('Couldn’t load your customers. Check your internet connection.');
        setQueue([]);
        return;
      }
      setQueue(notYetAsked(customers.data ?? [], requests.data ?? []));
    });
  }, [business]);

  const customer = queue?.[position];

  async function ask() {
    if (!business || !customer) return;
    if (!hasAccess(business)) {
      setError('Your free trial has ended. Go to Settings to see your plan.');
      return;
    }
    setError(null);
    setAsking(true);
    try {
      // False means the owner cancelled in Messages (iPhone only): stay on this customer.
      if (await askForReview(business, customer)) {
        setAskedCount((count) => count + 1);
        setPosition((current) => current + 1);
      }
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : 'Something went wrong. Try again.');
    }
    setAsking(false);
  }

  function skip() {
    setError(null);
    setPosition((current) => current + 1);
  }

  return (
    <Screen>
      <BackLink title="Customers" />
      <ScreenHeader title="Ask past customers" />

      {queue !== null && !customer && (
        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.centered}>
            {queue.length === 0 ? 'Everyone has been asked' : 'All done!'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {queue.length === 0
              ? 'Every customer with a phone number has already been asked for a review.'
              : `You asked ${askedCount} ${askedCount === 1 ? 'customer' : 'customers'}. New reviews will show on your Dashboard.`}
          </ThemedText>
          <Button title="Back to customers" onPress={() => router.back()} />
        </Card>
      )}

      {customer && queue && (
        <>
          <ThemedText themeColor="textSecondary">
            These customers haven’t been asked for a review yet. Text them one at a time: tap the
            green button, press send in Messages, then come back for the next one.
          </ThemedText>

          <Card style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.centered}>
              {position + 1} of {queue.length}
            </ThemedText>
            <View style={styles.person}>
              <Avatar name={customer.name} size={64} />
              <ThemedText type="subtitle" style={styles.centered}>
                {customer.name}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{formatPhone(customer.phone)}</ThemedText>
            </View>
            <Button
              title={`Text ${customer.name.trim().split(/\s+/)[0]}`}
              icon="star"
              onPress={ask}
              loading={asking}
            />
            <Button title="Skip" variant="outline" onPress={skip} disabled={asking} />
          </Card>

          {askedCount > 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              Asked so far: {askedCount}
            </ThemedText>
          )}
        </>
      )}

      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  person: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  centered: {
    textAlign: 'center',
  },
});

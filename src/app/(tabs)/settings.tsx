import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { useBusiness } from '@/components/business-provider';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useSession } from '@/components/session-provider';
import { ThemedText } from '@/components/themed-text';
import { canManageBillingHere, openBillingPortal, openCheckout, planOf, PRICE_LABEL, type Plan } from '@/lib/billing';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { session } = useSession();
  const { business, reload } = useBusiness();
  const [openingBilling, setOpeningBilling] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Refresh the plan each time Settings is shown (for example after paying).
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const plan = business ? planOf(business) : null;

  async function billing() {
    if (!plan) return;
    setOpeningBilling(true);
    setBillingError(null);
    try {
      await (plan.kind === 'paid' ? openBillingPortal() : openCheckout());
      // Back from Stripe's page: show the new plan. Stripe tells our server within seconds.
      await reload();
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
    setOpeningBilling(false);
  }

  async function logOut() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    // The app returns to the log in screen by itself once the session is gone.
  }

  async function deleteAccount() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    // Runs on our server, which removes the account along with the business,
    // customers and review history.
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      setDeleting(false);
      setDeleteError('Couldn’t delete your account. Check your internet connection and try again.');
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <PlaceholderScreen
      title="Settings"
      description="Your business details and account."
      comingSoon={[]}>
      <ThemedText type="smallBold">{business?.name}</ThemedText>
      <Button title="Edit business details" onPress={() => router.push('/business-setup')} />

      {plan && (
        <ThemedText type="small" style={plan.kind === 'ended' || isPastDue(plan) ? styles.warning : undefined}>
          {describePlan(plan)}
        </ThemedText>
      )}
      {billingError && (
        <ThemedText type="small" style={styles.warning}>
          {billingError}
        </ThemedText>
      )}
      {plan && canManageBillingHere && (
        <Button
          title={plan.kind === 'paid' ? 'Manage billing' : `Subscribe: ${PRICE_LABEL}`}
          variant={plan.kind === 'paid' ? 'secondary' : 'primary'}
          onPress={billing}
          loading={openingBilling}
        />
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Logged in as {session?.user.email}
      </ThemedText>
      <Button title="Log out" variant="secondary" onPress={logOut} loading={loggingOut} />

      {confirmingDelete && (
        <ThemedText type="small" style={styles.warning}>
          This permanently deletes your account, your business, all your customers and your review
          history. It can’t be undone.
        </ThemedText>
      )}
      {deleteError && (
        <ThemedText type="small" style={styles.warning}>
          {deleteError}
        </ThemedText>
      )}
      <Button
        title={confirmingDelete ? 'Yes, delete everything' : 'Delete account'}
        variant="secondary"
        onPress={deleteAccount}
        loading={deleting}
      />
      {confirmingDelete && !deleting && (
        <Button title="Keep my account" variant="secondary" onPress={() => setConfirmingDelete(false)} />
      )}
    </PlaceholderScreen>
  );
}

function isPastDue(plan: Plan) {
  return plan.kind === 'paid' && plan.status === 'past_due';
}

function describePlan(plan: Plan) {
  switch (plan.kind) {
    case 'trial':
      return `Free trial: ${plan.daysLeft} ${plan.daysLeft === 1 ? 'day' : 'days'} left (ends ${formatDate(plan.endsAt)}).`;
    case 'ended':
      return 'Your free trial has ended. Subscribe to keep asking for reviews.';
    case 'paid':
      if (plan.status === 'past_due') {
        return 'Your last payment didn’t go through. Please update your card.';
      }
      if (!plan.renewsAt) return `Subscribed: ${PRICE_LABEL}.`;
      return plan.cancelling
        ? `Subscription cancelled. You can keep using the app until ${formatDate(plan.renewsAt)}.`
        : `Subscribed: ${PRICE_LABEL}. Renews ${formatDate(plan.renewsAt)}.`;
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  warning: {
    color: '#D93025',
  },
});

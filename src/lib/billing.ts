import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { Business } from '@/components/business-provider';
import { supabase } from '@/lib/supabase';

// Every new business gets this many free days, counted from Business setup.
// Keep in sync with TRIAL_DAYS in supabase/functions/create-checkout/index.ts.
export const TRIAL_DAYS = 14;
// Stripe charges US$29 in the US and CA$39 in Canada (see create-checkout).
export const PRICE_LABEL = 'US$29 or CA$39/month';

// Apple and Google don't allow apps to send people to pay on a website (outside the US).
// So the Subscribe and Manage billing buttons only show on the web version, plus while
// testing in Expo Go. In the store apps the owner just sees their plan.
export const canManageBillingHere = Platform.OS === 'web' || __DEV__;

// Stripe statuses that still mean "paying customer". past_due = a payment failed and
// Stripe is retrying; they keep access meanwhile.
const PAID_STATUSES = ['active', 'trialing', 'past_due'];

export type Plan =
  | { kind: 'trial'; endsAt: Date; daysLeft: number }
  | { kind: 'paid'; status: string; renewsAt: Date | null; cancelling: boolean }
  | { kind: 'ended' };

export function planOf(business: Business): Plan {
  const subscription = business.subscription;
  if (subscription?.status && PAID_STATUSES.includes(subscription.status)) {
    return {
      kind: 'paid',
      status: subscription.status,
      renewsAt: subscription.current_period_end ? new Date(subscription.current_period_end) : null,
      cancelling: subscription.cancel_at_period_end,
    };
  }
  const endsAt = new Date(new Date(business.created_at).getTime() + TRIAL_DAYS * 24 * 3600 * 1000);
  const msLeft = endsAt.getTime() - Date.now();
  if (msLeft > 0) {
    return { kind: 'trial', endsAt, daysLeft: Math.ceil(msLeft / (24 * 3600 * 1000)) };
  }
  return { kind: 'ended' };
}

/** True while the owner can ask for reviews: in the free trial, or subscribed. */
export function hasAccess(business: Business) {
  return planOf(business).kind !== 'ended';
}

/** Opens Stripe's payment page to subscribe. Throws with a friendly message. */
export function openCheckout() {
  return openStripePage('create-checkout');
}

/** Opens Stripe's billing page (change card, invoices, cancel). Throws with a friendly message. */
export function openBillingPortal() {
  return openStripePage('billing-portal');
}

async function openStripePage(functionName: 'create-checkout' | 'billing-portal') {
  const { data, error } = await supabase.functions.invoke<{ url?: string }>(functionName);
  if (error || !data?.url) {
    const message = await error?.context?.json?.().then((body: { error?: string }) => body.error).catch(() => null);
    throw new Error(message ?? 'Couldn’t open the payment page. Check your internet connection and try again.');
  }
  if (Platform.OS === 'web') {
    // Stripe sends the owner back to our /billing page when they're done.
    window.location.assign(data.url);
  } else {
    // Opens inside the app; the owner taps Done to come back.
    await WebBrowser.openBrowserAsync(data.url);
  }
}

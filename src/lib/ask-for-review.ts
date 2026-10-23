import * as SMS from 'expo-sms';

import type { Business } from '@/components/business-provider';
import type { Customer } from '@/lib/customers';
import { fillMessage } from '@/lib/message';
import { supabase } from '@/lib/supabase';

type TextResult = { sent?: boolean; warning?: string; notSetUp?: boolean; needsConsent?: boolean; error?: string };

/**
 * Asks a customer for a review. First tries texting them from ReviewWhistle's own number
 * (Twilio, through our server), which works on a computer too. On a phone, if that isn't
 * switched on yet or the customer hasn't agreed to texts, it opens the Messages app
 * instead and the owner presses send. Returns true if it was logged, false if the owner
 * cancelled, or throws with a friendly message.
 */
export async function askForReview(business: Business, customer: Customer): Promise<boolean> {
  if (!business.google_review_url) {
    throw new Error('Add your Google listing first: Settings → Edit business details.');
  }
  if (!customer.phone) {
    throw new Error(`${customer.name} has no phone number. Tap them to add one.`);
  }

  const result = await textThroughServer(customer);
  if (result.sent) {
    if (result.warning) throw new Error(result.warning);
    return true;
  }
  const canFallBack = (result.notSetUp || result.needsConsent) && (await SMS.isAvailableAsync());
  if (!canFallBack) {
    throw new Error(result.error ?? 'The text didn’t send. Check your internet and try again.');
  }
  return askWithMessagesApp(business, customer);
}

async function textThroughServer(customer: Customer): Promise<TextResult> {
  const { data, error } = await supabase.functions.invoke<TextResult>('send-review-text', {
    body: { customerId: customer.id },
  });
  if (!error) return data ?? {};
  // Our server answered with a reason (like "needs consent"); otherwise it's the internet.
  const body = await error.context?.json?.().catch(() => null);
  return body ?? { error: 'Couldn’t reach ReviewWhistle. Check your internet and try again.' };
}

// Opens the phone's Messages app with the review text ready, then logs the request.
async function askWithMessagesApp(business: Business, customer: Customer): Promise<boolean> {
  const message = fillMessage(business.message_template, {
    customer: customer.name.trim().split(/\s+/)[0],
    business: business.name,
    link: reviewLink(business),
  });
  // iPhone tells us 'sent' or 'cancelled'; Android always says 'unknown', so we log it.
  const { result } = await SMS.sendSMSAsync([customer.phone!], message);
  if (result === 'cancelled') return false;

  const { error } = await supabase
    .from('review_requests')
    .insert({ business_id: business.id, customer_id: customer.id });
  if (error) {
    throw new Error('The text opened, but we couldn’t save it to your history. Check your internet.');
  }
  return true;
}

// Our customer page (Google review, or private feedback) once it's online, else
// straight to Google. EXPO_PUBLIC_REVIEW_PAGE_URL is set in .env, e.g. https://reviewnudge.expo.app
function reviewLink(business: Business) {
  const pageUrl = process.env.EXPO_PUBLIC_REVIEW_PAGE_URL;
  return pageUrl ? `${pageUrl.replace(/\/$/, '')}/r?b=${business.id}` : business.google_review_url!;
}

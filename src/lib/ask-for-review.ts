import * as SMS from 'expo-sms';

import type { Business } from '@/components/business-provider';
import type { Customer } from '@/lib/customers';
import { fillMessage } from '@/lib/message';
import { supabase } from '@/lib/supabase';

/**
 * Opens the phone's Messages app with the review text ready for this customer, then
 * logs the request. The owner presses send themselves. Returns true if it was logged,
 * false if the owner cancelled, or throws with a friendly message.
 */
export async function askForReview(business: Business, customer: Customer): Promise<boolean> {
  if (!business.google_review_url) {
    throw new Error('Add your Google listing first: Settings → Edit business details.');
  }
  if (!customer.phone) {
    throw new Error(`${customer.name} has no phone number. Tap them to add one.`);
  }
  if (!(await SMS.isAvailableAsync())) {
    throw new Error('This device can’t send text messages. Try it on your phone.');
  }

  const message = fillMessage(business.message_template, {
    customer: customer.name.trim().split(/\s+/)[0],
    business: business.name,
    link: business.google_review_url,
  });
  // iPhone tells us 'sent' or 'cancelled'; Android always says 'unknown', so we log it.
  const { result } = await SMS.sendSMSAsync([customer.phone], message);
  if (result === 'cancelled') return false;

  const { error } = await supabase
    .from('review_requests')
    .insert({ business_id: business.id, customer_id: customer.id });
  if (error) {
    throw new Error('The text opened, but we couldn’t save it to your history. Check your internet.');
  }
  return true;
}

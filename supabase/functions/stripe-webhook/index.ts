// Stripe calls this whenever a subscription starts, renews, changes or ends, and we
// save the latest state in the subscriptions table. Needs the secrets STRIPE_SECRET_KEY
// and STRIPE_WEBHOOK_SECRET (whsec_..., from Stripe → Developers → Webhooks).
// Anyone can reach this address, so every message is checked against Stripe's signature.

import { withSupabase } from 'npm:@supabase/server@1';

import { stripe } from '../_shared/stripe.ts';

const encoder = new TextEncoder();

// Stripe signs each message with our webhook secret. Only accept it if the signature
// matches and it's less than 5 minutes old (so old messages can't be replayed).
async function isFromStripe(body: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = header.split(',').map((part) => part.split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`));
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return signatures.some((signature) => signature.length === expected.length && timingSafeEqual(signature, expected));
}

function timingSafeEqual(a: string, b: string) {
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function toDate(seconds: number | null | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

const handler = withSupabase({ auth: 'none' }, async (req, ctx) => {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) {
    return Response.json({ error: 'STRIPE_WEBHOOK_SECRET is missing.' }, { status: 500 });
  }
  const body = await req.text();
  if (!(await isFromStripe(body, req.headers.get('stripe-signature'), secret))) {
    return Response.json({ error: 'Bad signature.' }, { status: 400 });
  }

  const event = JSON.parse(body);
  if (!String(event.type).startsWith('customer.subscription.')) {
    return Response.json({ ignored: event.type });
  }

  // Messages can arrive out of order, so ask Stripe for the subscription as it is now.
  const subscription = await stripe('GET', `subscriptions/${event.data.object.id}`);
  const customerId = subscription.customer as string;

  // Which business: the id we put on the subscription at checkout, or the saved customer.
  const { data: saved } = await ctx.supabaseAdmin
    .from('subscriptions')
    .select('business_id, stripe_subscription_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  const businessId: string | undefined = subscription.metadata?.business_id ?? saved?.business_id;
  if (!businessId) {
    console.error('No business for Stripe customer', customerId);
    return Response.json({ ignored: 'unknown customer' });
  }
  // An old, ended subscription must never overwrite a newer one.
  const ended = ['canceled', 'incomplete_expired'].includes(subscription.status);
  if (ended && saved?.stripe_subscription_id && saved.stripe_subscription_id !== subscription.id) {
    return Response.json({ ignored: 'older subscription' });
  }

  // Newer Stripe accounts keep the renewal date on the subscription's item.
  const periodEnd = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
  const { error } = await ctx.supabaseAdmin.from('subscriptions').upsert({
    business_id: businessId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_end: toDate(periodEnd),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end || subscription.cancel_at),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    // The business may have been deleted; anything else, Stripe will retry.
    console.error('Saving subscription failed', error.message);
    return Response.json({ error: 'Saving failed.' }, { status: error.code === '23503' ? 200 : 500 });
  }
  return Response.json({ saved: subscription.status });
});

export default { fetch: handler };

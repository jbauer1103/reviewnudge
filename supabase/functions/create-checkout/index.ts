// Starts a Stripe Checkout page where the logged-in owner subscribes ($39 a month).
// Returns { url } for the app to open. Days left in the free trial carry over, so
// subscribing early never costs extra. Needs the secret STRIPE_SECRET_KEY.
// Optional secrets: PRODUCT_NAME (what Stripe calls the plan) and SITE_URL.

import { withSupabase } from 'npm:@supabase/server@1';

import { corsHeaders, json, siteUrl, stripe } from '../_shared/stripe.ts';

// Keep in sync with TRIAL_DAYS in src/lib/billing.ts.
const TRIAL_DAYS = 14;
// Stripe finds our price by this name, so it's only created once.
const PRICE_LOOKUP_KEY = 'monthly_39';
// Stripe only accepts a trial end at least 2 days away.
const MIN_TRIAL_MS = 49 * 3600 * 1000;

// Our $39/month price: Canadian dollars, or US dollars for US customers.
async function monthlyPrice(): Promise<string> {
  const found = await stripe('GET', 'prices', { 'lookup_keys[]': PRICE_LOOKUP_KEY, active: true, limit: 1 });
  if (found.data.length > 0) return found.data[0].id;
  const price = await stripe('POST', 'prices', {
    lookup_key: PRICE_LOOKUP_KEY,
    currency: 'cad',
    unit_amount: 3900,
    currency_options: { usd: { unit_amount: 3900 } },
    recurring: { interval: 'month' },
    product_data: { name: Deno.env.get('PRODUCT_NAME') ?? 'ReviewWhistle' },
  });
  return price.id;
}

const handler = withSupabase({ auth: 'user' }, async (_req, ctx) => {
  // ctx.supabase follows row-level security, so this is only ever the caller's business.
  const { data: business } = await ctx.supabase
    .from('businesses')
    .select('id, name, created_at, subscription:subscriptions(stripe_customer_id, status)')
    .maybeSingle();
  if (!business) {
    return json({ error: 'Couldn’t find your business.' }, 404);
  }
  const subscription = business.subscription as { stripe_customer_id: string | null; status: string | null } | null;
  if (subscription?.status && ['active', 'trialing', 'past_due'].includes(subscription.status)) {
    return json({ error: 'You’re already subscribed. Use “Manage billing” instead.' }, 409);
  }

  try {
    let customerId = subscription?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe('POST', 'customers', {
        email: ctx.userClaims?.email,
        name: business.name,
        metadata: { business_id: business.id },
      });
      customerId = customer.id as string;
      // Saved with the secret-key client: owners can't write to subscriptions themselves.
      await ctx.supabaseAdmin
        .from('subscriptions')
        .upsert({ business_id: business.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() });
    }

    const trialEnd = new Date(business.created_at).getTime() + TRIAL_DAYS * 24 * 3600 * 1000;
    const session = await stripe('POST', 'checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      client_reference_id: business.id,
      line_items: { 0: { price: await monthlyPrice(), quantity: 1 } },
      subscription_data: {
        metadata: { business_id: business.id },
        trial_end: trialEnd - Date.now() > MIN_TRIAL_MS ? Math.floor(trialEnd / 1000) : undefined,
      },
      allow_promotion_codes: true,
      success_url: `${siteUrl()}/billing?done=1`,
      cancel_url: `${siteUrl()}/billing`,
    });
    return json({ url: session.url });
  } catch (error) {
    console.error('Checkout failed', error instanceof Error ? error.message : error);
    return json({ error: 'Couldn’t open the payment page. Try again in a minute.' }, 500);
  }
});

export default {
  fetch(req: Request, ...rest: unknown[]) {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    // @ts-ignore: pass along whatever extra arguments Supabase gives us.
    return handler(req, ...rest);
  },
};

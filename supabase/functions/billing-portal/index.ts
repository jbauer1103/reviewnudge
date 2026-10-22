// Opens Stripe's billing page for the logged-in owner: change card, see invoices,
// or cancel. Returns { url } for the app to open. Needs the secret STRIPE_SECRET_KEY.

import { withSupabase } from 'npm:@supabase/server@1';

import { corsHeaders, json, siteUrl, stripe } from '../_shared/stripe.ts';

// Our billing page settings, created once in Stripe (so nothing needs setting up by hand).
async function portalConfiguration(): Promise<string> {
  const list = await stripe('GET', 'billing_portal/configurations', { active: true, limit: 100 });
  const ours = list.data.find((config: any) => config.metadata?.app === 'reviewnudge');
  if (ours) return ours.id;
  const created = await stripe('POST', 'billing_portal/configurations', {
    metadata: { app: 'reviewnudge' },
    features: {
      customer_update: { enabled: true, allowed_updates: { 0: 'email', 1: 'address' } },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
    },
  });
  return created.id;
}

const handler = withSupabase({ auth: 'user' }, async (_req, ctx) => {
  // Row-level security: only the caller's own business and subscription come back.
  const { data: business } = await ctx.supabase
    .from('businesses')
    .select('id, subscription:subscriptions(stripe_customer_id)')
    .maybeSingle();
  const customerId = (business?.subscription as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!customerId) {
    return json({ error: 'You don’t have a subscription yet.' }, 404);
  }

  try {
    const session = await stripe('POST', 'billing_portal/sessions', {
      customer: customerId,
      configuration: await portalConfiguration(),
      return_url: `${siteUrl()}/billing`,
    });
    return json({ url: session.url });
  } catch (error) {
    console.error('Billing portal failed', error instanceof Error ? error.message : error);
    return json({ error: 'Couldn’t open the billing page. Try again in a minute.' }, 500);
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

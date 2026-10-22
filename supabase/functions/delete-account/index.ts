// Deletes the logged-in owner's account. Their business, customers and review
// requests are removed with it (the database cascades the delete). If they pay
// through Stripe, their subscription is cancelled first so they're never charged again.

import { withSupabase } from 'npm:@supabase/server@1';

import { stripe } from '../_shared/stripe.ts';

// Lets the web version of the app call this function too.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

const handler = withSupabase({ auth: 'user' }, async (_req, ctx) => {
  const userId = ctx.userClaims?.id;
  if (!userId) {
    return json({ error: 'Please log in again.' }, 401);
  }
  // Row-level security: only the caller's own subscription comes back.
  const { data: subscription } = await ctx.supabase
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .maybeSingle();
  if (subscription?.stripe_subscription_id && !['canceled', 'incomplete_expired'].includes(subscription.status)) {
    try {
      await stripe('DELETE', `subscriptions/${subscription.stripe_subscription_id}`);
    } catch (error) {
      console.error('Cancelling subscription failed', error instanceof Error ? error.message : error);
      return json({ error: 'Couldn’t cancel your subscription, so your account wasn’t deleted. Try again.' }, 500);
    }
  }

  // Only the caller's own account: the id comes from their verified login.
  const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('Delete account failed', error.message);
    return json({ error: 'Couldn’t delete your account. Try again.' }, 500);
  }
  return json({ deleted: true });
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

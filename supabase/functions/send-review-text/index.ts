// Texts one customer the review request through Twilio, then logs it in review_requests.
// This is what lets "Ask" work from a computer (the web app), not only from a phone.
// Needs the secrets TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM (our Twilio
// number like +18885551234, or a Messaging Service id starting with MG).
// Optional: REVIEW_PAGE_URL (our customer page), as for the follow-up email.
//
// Until the Twilio secrets are saved it answers { notSetUp: true }, and the phone app
// falls back to opening the Messages app like before.

import { withSupabase } from 'npm:@supabase/server@1';

// Lets the web version of the app call this function too.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keep in sync with src/lib/billing.ts.
const TRIAL_DAYS = 14;
const PAID_STATUSES = ['active', 'trialing', 'past_due'];
// Each text costs us money, so a business can send at most this many a day.
const DAILY_LIMIT = 100;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

const handler = withSupabase({ auth: 'user' }, async (req, ctx) => {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM');
  if (!accountSid || !authToken || !from) {
    return json({ notSetUp: true, error: 'Texting from ReviewWhistle isn’t switched on yet.' });
  }

  const { customerId } = await req.json().catch(() => ({}));
  if (typeof customerId !== 'string') {
    return json({ error: 'Pick a customer first.' }, 400);
  }

  // ctx.supabase follows row-level security, so these are only ever the caller's own.
  const { data: business } = await ctx.supabase
    .from('businesses')
    .select('id, name, google_review_url, message_template, created_at, subscription:subscriptions(status)')
    .maybeSingle();
  if (!business) {
    return json({ error: 'Couldn’t find your business.' }, 404);
  }
  const { data: customer } = await ctx.supabase
    .from('customers')
    .select('id, name, phone, sms_consent_at, sms_opted_out_at')
    .eq('id', customerId)
    .eq('business_id', business.id)
    .maybeSingle();
  if (!customer) {
    return json({ error: 'Couldn’t find this customer.' }, 404);
  }

  const subscription = business.subscription as unknown as { status: string | null } | null;
  const trialEnds = new Date(business.created_at).getTime() + TRIAL_DAYS * 24 * 3600 * 1000;
  if (!PAID_STATUSES.includes(subscription?.status ?? '') && Date.now() > trialEnds) {
    return json({ error: 'Your free trial has ended. Go to Settings to see your plan.' }, 402);
  }
  if (!business.google_review_url) {
    return json({ error: 'Add your Google listing first: Settings → Edit business details.' }, 400);
  }
  if (!customer.phone) {
    return json({ error: `${customer.name} has no phone number. Tap them to add one.` }, 400);
  }
  if (customer.sms_opted_out_at) {
    return json({ error: `${customer.name} replied STOP, so we can’t text them anymore.` }, 400);
  }
  if (!customer.sms_consent_at) {
    return json({
      needsConsent: true,
      error: `Tap ${customer.name} and tick “Agreed to get texts” first. The law needs their OK.`,
    }, 400);
  }

  // Stops double taps, and keeps a business under the daily limit.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: recent } = await ctx.supabase
    .from('review_requests')
    .select('customer_id, sent_at')
    .eq('business_id', business.id)
    .eq('sent_via', 'twilio')
    .gte('sent_at', since);
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  if ((recent ?? []).some((r) => r.customer_id === customer.id && new Date(r.sent_at).getTime() > tenMinutesAgo)) {
    return json({ error: `You just texted ${customer.name}. Give it a few minutes.` }, 429);
  }
  if ((recent?.length ?? 0) >= DAILY_LIMIT) {
    return json({ error: `You’ve sent ${DAILY_LIMIT} texts today, the daily limit. Try again tomorrow.` }, 429);
  }

  const pageUrl = Deno.env.get('REVIEW_PAGE_URL')?.replace(/\/$/, '');
  const link = pageUrl ? `${pageUrl}/r?b=${business.id}` : business.google_review_url;
  let body = business.message_template
    .replaceAll('{customer}', customer.name.trim().split(/\s+/)[0])
    .replaceAll('{business}', business.name)
    .replaceAll('{link}', link);
  // The law (and the phone carriers) need the business named and a way to stop texts.
  if (!body.includes(business.name)) body = `${business.name}: ${body}`;
  if (!/\bSTOP\b/.test(body)) body += '\n\nReply STOP to opt out.';

  const form = new URLSearchParams({ To: customer.phone, Body: body });
  form.set(from.startsWith('MG') ? 'MessagingServiceSid' : 'From', from);
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  const result: { sid?: string; code?: number; message?: string } = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Twilio failed', response.status, result.code, result.message);
    // 21610: the customer replied STOP at some point.
    if (result.code === 21610) {
      await ctx.supabase
        .from('customers')
        .update({ sms_opted_out_at: new Date().toISOString() })
        .eq('id', customer.id);
      return json({ error: `${customer.name} replied STOP, so we can’t text them anymore.` }, 400);
    }
    if (result.code === 21211 || result.code === 21614) {
      return json({ error: `${customer.name}’s number can’t get texts. Check it’s a mobile number.` }, 400);
    }
    return json({ error: 'The text didn’t send. Try again in a minute.' }, 502);
  }

  const { error } = await ctx.supabase.from('review_requests').insert({
    business_id: business.id,
    customer_id: customer.id,
    sent_via: 'twilio',
    twilio_message_sid: result.sid ?? null,
  });
  if (error) {
    console.error('Logging the request failed', error.message);
    return json({ sent: true, warning: 'The text was sent, but we couldn’t save it to your history.' });
  }
  return json({ sent: true });
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

// Sends one friendly reminder email to customers who were asked for a review 48 hours
// ago and have an email address. Runs every hour (scheduled in the database).
// Needs the secret RESEND_API_KEY. Optional secrets: RESEND_FROM (the sender, like
// "Reviews <reviews@yourdomain.com>") and REVIEW_PAGE_URL (our customer page).
//
// It accepts the app's public (publishable) key, because running it early does no
// harm: it only ever emails customers whose reminder is due, and only once.

import { withSupabase } from 'npm:@supabase/server@1';

type DueRequest = {
  id: string;
  business: { id: string; name: string; google_review_url: string | null; google_address: string | null } | null;
  customer: {
    name: string;
    email: string | null;
    unsubscribe_token: string;
    email_unsubscribed_at: string | null;
  } | null;
};

const handler = withSupabase({ auth: 'publishable' }, async (_req, ctx) => {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    return Response.json({ error: 'RESEND_API_KEY is missing.' }, { status: 500 });
  }
  const from = Deno.env.get('RESEND_FROM') ?? 'ReviewWhistle <onboarding@resend.dev>';
  const pageUrl = Deno.env.get('REVIEW_PAGE_URL')?.replace(/\/$/, '');

  const now = Date.now();
  // Due: asked 48 hours ago or more, but not over a week ago (so nothing old gets sent).
  const { data, error } = await ctx.supabaseAdmin
    .from('review_requests')
    .select(
      'id, business:businesses(id, name, google_review_url, google_address), ' +
        'customer:customers(name, email, unsubscribe_token, email_unsubscribed_at)',
    )
    .is('follow_up_sent_at', null)
    .lte('sent_at', new Date(now - 48 * 3600 * 1000).toISOString())
    .gte('sent_at', new Date(now - 7 * 24 * 3600 * 1000).toISOString())
    .limit(50);
  if (error) {
    console.error('Loading due requests failed', error.message);
    return Response.json({ error: 'Loading due requests failed.' }, { status: 500 });
  }

  let sent = 0;
  for (const request of (data ?? []) as unknown as DueRequest[]) {
    const { business, customer } = request;
    const link = business && (pageUrl ? `${pageUrl}/r?b=${business.id}` : business.google_review_url);
    // Mark it done first, so a customer never gets two reminders even if sending fails.
    await ctx.supabaseAdmin
      .from('review_requests')
      .update({ follow_up_sent_at: new Date().toISOString() })
      .eq('id', request.id);
    if (!business || !customer?.email || customer.email_unsubscribed_at || !link) continue;

    const firstName = customer.name.trim().split(/\s+/)[0];
    // Anti-spam laws (CASL, CAN-SPAM) ask for an easy way to stop these emails, and for
    // the email to say who sent it. The unsubscribe page asks for a tap, so email
    // scanners that open links can't unsubscribe people by accident.
    const unsubscribeUrl = pageUrl ? `${pageUrl}/unsubscribe?t=${customer.unsubscribe_token}` : null;
    const footer =
      `\n\n--\nSent by ${business.name}${business.google_address ? `, ${business.google_address}` : ''}, ` +
      'using ReviewWhistle.' +
      (unsubscribeUrl ? `\nDon't want emails like this? Unsubscribe: ${unsubscribeUrl}` : '');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: customer.email,
        subject: `A quick favour for ${business.name}?`,
        ...(unsubscribeUrl ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` } } : {}),
        text:
          `Hi ${firstName},\n\n` +
          `Thanks again for choosing ${business.name}. If you have a minute, a quick Google ` +
          `review would mean a lot to us:\n\n${link}\n\n` +
          (pageUrl ? `If anything wasn't right, you can tell us privately at the same link.\n\n` : '') +
          `Thank you!\n${business.name}` +
          footer,
      }),
    });
    if (response.ok) {
      sent++;
    } else {
      console.error('Resend failed', response.status, await response.text());
    }
  }

  return Response.json({ due: data?.length ?? 0, sent });
});

export default { fetch: handler };

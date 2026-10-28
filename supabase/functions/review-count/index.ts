// Looks up the logged-in owner's current Google review count, for the Dashboard.
// Google charges per lookup, so the count is saved and only re-checked every few hours.
// Needs the secret GOOGLE_PLACES_API_KEY (Supabase → Edge Functions → Secrets).

import { withSupabase } from 'npm:@supabase/server@1';

// Lets the web version of the app call this function too.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECHECK_AFTER_MS = 6 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

const handler = withSupabase({ auth: 'user' }, async (_req, ctx) => {
  // ctx.supabase follows row-level security, so this is only ever the caller's business.
  const { data: business, error } = await ctx.supabase
    .from('businesses')
    .select('id, google_place_id, google_review_count_latest, google_review_count_checked_at')
    .maybeSingle();
  if (error || !business) {
    return json({ error: 'Couldn’t find your business.' }, 404);
  }
  if (!business.google_place_id) {
    return json({ reviewCount: null });
  }

  const checkedAt = business.google_review_count_checked_at
    ? new Date(business.google_review_count_checked_at).getTime()
    : 0;
  if (business.google_review_count_latest !== null && Date.now() - checkedAt < RECHECK_AFTER_MS) {
    return json({ reviewCount: business.google_review_count_latest });
  }

  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) {
    return json({ error: 'The Google key is missing on the server.' }, 500);
  }
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(business.google_place_id)}`,
    { headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'userRatingCount,formattedAddress' } },
  );
  if (!response.ok) {
    console.error('Google lookup failed', response.status, await response.text());
    // Fall back to the last saved count rather than showing nothing.
    return json({ reviewCount: business.google_review_count_latest });
  }

  const place: { userRatingCount?: number; formattedAddress?: string } = await response.json();
  const reviewCount = place.userRatingCount ?? 0;
  await ctx.supabase
    .from('businesses')
    .update({
      google_review_count_latest: reviewCount,
      google_review_count_checked_at: new Date().toISOString(),
      // Kept up to date for the bottom of follow-up emails.
      ...(place.formattedAddress ? { google_address: place.formattedAddress } : {}),
    })
    .eq('id', business.id);

  return json({ reviewCount });
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

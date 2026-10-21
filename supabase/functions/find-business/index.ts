// Searches Google for a business by name and returns the matching listings.
// Runs on Supabase (not in the app), so the Google key stays secret.
// Needs the secret GOOGLE_PLACES_API_KEY (Supabase → Edge Functions → Secrets).
// Only logged-in owners can call it.

import { withSupabase } from 'npm:@supabase/server@1';

// Lets the web version of the app call this function too.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type GooglePlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  userRatingCount?: number;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

const handler = withSupabase({ auth: 'user' }, async (req) => {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) {
    return json({ error: 'The Google key is missing on the server.' }, 500);
  }

  const { query } = await req.json().catch(() => ({ query: '' }));
  if (typeof query !== 'string' || query.trim().length < 2) {
    return json({ error: 'Type your business name to search.' }, 400);
  }

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      // Only ask Google for what we use (cheaper and faster).
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery: query.trim(), pageSize: 5 }),
  });

  if (!response.ok) {
    console.error('Google search failed', response.status, await response.text());
    return json({ error: 'Google search didn’t work. Try again in a minute.' }, 502);
  }

  const data: { places?: GooglePlace[] } = await response.json();
  const places = (data.places ?? []).map((place) => ({
    placeId: place.id,
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    reviewCount: place.userRatingCount ?? 0,
    // Google's own link that opens the "write a review" box for this listing.
    reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(place.id)}`,
  }));

  return json({ places });
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

// Small helpers for talking to Stripe's API directly (no extra library needed).
// Needs the secret STRIPE_SECRET_KEY (sk_test_... while testing, sk_live_... when live).

// Turns { a: { b: 1 } } into Stripe's form style: a[b]=1
function toForm(data: Record<string, unknown>, prefix = '', form = new URLSearchParams()) {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object') {
      toForm(value as Record<string, unknown>, name, form);
    } else {
      form.append(name, String(value));
    }
  }
  return form;
}

export async function stripe<T = Record<string, any>>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is missing.');
  const form = toForm(data);
  const url = `https://api.stripe.com/v1/${path}` + (method === 'GET' && form.size ? `?${form}` : '');
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : form,
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe ${method} ${path} failed: ${body?.error?.message ?? response.status}`);
  }
  return body as T;
}

// Where the web version of the app lives. Checkout and the billing portal send people back here.
export function siteUrl() {
  const url = Deno.env.get('SITE_URL') ?? Deno.env.get('REVIEW_PAGE_URL') ?? 'https://reviewnudge.expo.app';
  return url.replace(/\/$/, '');
}

// Lets the web version of the app call these functions too.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

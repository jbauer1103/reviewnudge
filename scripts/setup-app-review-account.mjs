// Sets up the demo account Apple's and Google's app reviewers log in with
// (appreview@reviewwhistle.com, with a password instead of an emailed code), filled
// with a sample business and customers. The same account is used for store screenshots.
//
// Needs .env (Supabase URL) and .env.admin (SUPABASE_SECRET_KEY), like test-login-code.mjs.
// Run:  node --env-file=.env --env-file=.env.admin scripts/setup-app-review-account.mjs
// The first run makes a password and saves it in .env.appreview (never goes to GitHub).
// Running it again resets the sample data and keeps the same password.

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

const EMAIL = 'appreview@reviewwhistle.com';
const PASSWORD_FILE = '.env.appreview';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL (in .env) or SUPABASE_SECRET_KEY (in .env.admin).');
  process.exit(1);
}
const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

function check(error, what) {
  if (error) {
    console.error(`Couldn’t ${what}:`, error.message);
    process.exit(1);
  }
}

// The password: reuse the saved one, or make a new one the first time.
let password = existsSync(PASSWORD_FILE)
  ? readFileSync(PASSWORD_FILE, 'utf8').match(/APP_REVIEW_PASSWORD=(\S+)/)?.[1]
  : undefined;
if (!password) {
  password = `Whistle-${randomBytes(6).toString('hex')}`;
  writeFileSync(
    PASSWORD_FILE,
    `# Login for Apple / Google app reviewers. Paste both into the store "App Review" notes.\n` +
      `APP_REVIEW_EMAIL=${EMAIL}\nAPP_REVIEW_PASSWORD=${password}\n`,
  );
}

// The login: create it, or reset its password if it already exists.
const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
check(listError, 'list users');
let user = list.users.find((u) => u.email === EMAIL);
if (user) {
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
  check(error, 'reset the password');
} else {
  const { data, error } = await supabase.auth.admin.createUser({ email: EMAIL, password, email_confirm: true });
  check(error, 'create the login');
  user = data.user;
}

// Start the sample data fresh (customers, requests and feedback go with the business).
check((await supabase.from('businesses').delete().eq('owner_id', user.id)).error, 'clear old data');

const day = 24 * 3600 * 1000;
const { data: business, error: businessError } = await supabase
  .from('businesses')
  .insert({
    owner_id: user.id,
    name: 'Maple Leaf Cleaning',
    google_review_url: 'https://search.google.com/local/writereview?placeid=demo',
    google_place_id: 'demo',
    google_address: '123 Queen St W, Toronto, ON M5H 2M9, Canada',
    google_review_count_at_start: 23,
    google_review_count_latest: 37,
    // Far in the future, so the Dashboard never asks Google about the made-up listing.
    google_review_count_checked_at: '2099-01-01T00:00:00Z',
    created_at: new Date(Date.now() - 40 * day).toISOString(),
  })
  .select('id')
  .single();
check(businessError, 'create the sample business');

// Shown as subscribed, so reviewers can ask for reviews (no Stripe involved).
check(
  (
    await supabase.from('subscriptions').insert({
      business_id: business.id,
      status: 'active',
      current_period_end: '2099-01-01T00:00:00Z',
    })
  ).error,
  'mark the sample business as subscribed',
);

const people = [
  ['Sarah Lee', '+14165550142', 'sarah@example.com'],
  ['Marco Rossi', '+14165550178', null],
  ['Priya Patel', '+16475550113', 'priya@example.com'],
  ['Dan Murphy', '+19055550164', null],
  ['Emily Chen', '+14375550129', 'emily@example.com'],
  ['James Wilson', '+16045550187', null],
  ['Aisha Khan', '+12065550134', 'aisha@example.com'],
];
const { data: customers, error: customersError } = await supabase
  .from('customers')
  .insert(
    people.map(([name, phone, email], i) => ({
      business_id: business.id,
      name,
      phone,
      email,
      created_at: new Date(Date.now() - (30 - i) * day).toISOString(),
    })),
  )
  .select('id');
check(customersError, 'add sample customers');

// Review requests over the last few weeks, with follow-ups already sent (so none go out).
check(
  (
    await supabase.from('review_requests').insert(
      [0, 1, 2, 3, 4].map((i) => ({
        business_id: business.id,
        customer_id: customers[i].id,
        sent_at: new Date(Date.now() - (2 + i * 4) * day).toISOString(),
        follow_up_sent_at: new Date(Date.now() - i * 4 * day).toISOString(),
      })),
    )
  ).error,
  'add sample review requests',
);

check(
  (
    await supabase.from('feedback').insert({
      business_id: business.id,
      message: 'The team was great, but they arrived an hour later than booked.',
      contact: 'dan@example.com',
    })
  ).error,
  'add sample feedback',
);

console.log(`Ready. Log in with ${EMAIL} and the password in ${PASSWORD_FILE}.`);

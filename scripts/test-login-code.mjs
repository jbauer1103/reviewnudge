// TESTING ONLY: makes a login code for a test account without sending an email.
// Our email sender can only deliver to Jeff's own inbox for now, so this is how a
// second test account logs in.
//
// One time: create a file called .env.admin in the reviewnudge folder containing
//   SUPABASE_SECRET_KEY=sb_secret_...
// (Supabase → Project Settings → API Keys → Secret keys). .env.admin never goes to
// GitHub, and the secret key never goes into the app.
//
// Run:  node --env-file=.env --env-file=.env.admin scripts/test-login-code.mjs test2@example.com
// Then in the app: type that email, tap "I already have a code", and type the code.

import { createClient } from '@supabase/supabase-js';

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!email) {
  console.error('Add the test email, like: ... scripts/test-login-code.mjs test2@example.com');
  process.exit(1);
}
if (!url || !secretKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL (in .env) or SUPABASE_SECRET_KEY (in .env.admin).');
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Create the test account if it doesn't exist yet (an error here just means it already does).
await supabase.auth.admin.createUser({ email, email_confirm: true });

const { data, error } = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
if (error) {
  console.error('Couldn’t make a code:', error.message);
  process.exit(1);
}

console.log(`Login code for ${email}: ${data.properties.email_otp}`);

# ReviewNudge

## Who I'm working with
Jeff is a first-time app builder (has only made a few Lovable websites). Explain things in plain English and keep explanations short.

## What ReviewNudge is
A simple app for small service businesses in Canada and the US (cleaners, plumbers, HVAC, auto detailers, dog groomers). After a job, the owner picks the customer and taps one button. The app opens their phone's own Messages app with a friendly, pre-written text containing their Google review link, and the owner hits send. The app logs the request, sends one follow-up email 48 hours later if the customer has an email, and shows a dashboard of requests sent and Google reviews gained. Price: $39/month, paid on our website (not inside the app).

## Tech stack (use exactly this)
- Expo (React Native) with Expo Router and TypeScript. Expo SDK 57. SDK 58 is out, but the App Store / Google Play Expo Go only runs SDK 57 until Expo ships the new Expo Go. Upgrade to 58 only after that, and ask Jeff first.
- expo-sms to open the Messages app pre-filled (the owner sends it, so we do NOT send automated texts in the MVP)
- expo-contacts to pick customers from the phone
- Supabase for the database, login (email magic link) and scheduled server functions
- Resend for email
- Google Places API (called only from a Supabase server function) to look up the business and its public review count
- Stripe for billing, handled on the web via webhooks

## Rules for how we work
1. Build in small steps. One screen or feature at a time. After each step, stop, tell Jeff how to test it on his phone, and wait for him to confirm before moving on.
2. Explain every change in plain English, as if Jeff is not a developer. Keep explanations short.
3. Never put secret keys in the app code. Secrets go in Supabase server functions or a .env file that is listed in .gitignore. Tell Jeff exactly where to paste each key.
4. Every database table must have row-level security so a business can only ever see its own data. Tell Jeff how to test this with two accounts.
5. Commit to git after every step that works, with a clear message.
6. Don't add features beyond the MVP list below unless Jeff asks. If something seems missing, suggest it and wait.
7. Ask Jeff before installing new libraries or upgrading versions.
8. Phone numbers use the +1 format (Canada and US). Dates and currency must work for both countries.

## MVP scope (the whole first version)
- Sign up / log in
- Business setup: business name, find our Google listing, editable message template
- Customer list with search (add manually or from phone contacts)
- "Ask for review" flow: pick customer → Messages opens pre-filled → log the request
- Dashboard: requests sent, reviews gained since joining
- A simple web page for the customer: "Leave a Google review" or "Tell us privately what went wrong"
- Follow-up email after 48 hours (scheduled Supabase function + Resend)
- Settings, log out, delete account

## Where the code lives
GitHub repo `jbauer1103/reviewnudge` (private). Jeff runs the app from a clone on his computer and opens it on his phone with Expo Go.

## Project layout
- `src/app/` — screens (every file is a screen). `_layout.tsx` shows the tabs when logged in, the log in screens when not.
  - `sign-in.tsx` = log in with an email magic link, `auth-callback.tsx` = where the email link lands
  - `(tabs)/_layout.tsx` sets up the tab bar: `(tabs)/index.tsx` = Customers (list and search), `(tabs)/dashboard.tsx` = Dashboard, `(tabs)/settings.tsx` = Settings (with Log out)
- `src/app/customer/[id].tsx` — add a customer (`/customer/new`) or edit/delete one. Phone is required (needed to text them); email is optional.
- `src/app/business-setup.tsx` — Business setup (name, Google review link, review text). Shown after the first log in until a business is saved, and from Settings → Edit business details.
- `src/components/` — reusable pieces. `business-provider.tsx` loads the owner's business. `app-tabs.tsx` is the phone tab bar, `app-tabs.web.tsx` the browser one. `session-provider.tsx` tracks who is logged in and reads the login link.
- `src/lib/supabase.ts` — the Supabase connection. Keys come from `.env` (see `.env.example`), never committed.
- `supabase/functions/find-business/` — server function that searches Google Places by business name (needs the Supabase secret `GOOGLE_PLACES_API_KEY`). Deployed from the Supabase dashboard editor; "Verify JWT with legacy secret" is off because the function checks the login itself.
- `supabase/functions/review-count/` — returns the owner's current Google review count for the Dashboard. Saves it on the business and only asks Google again after 6 hours (Google charges per lookup). Legacy JWT check is off; it checks the login itself.
- `supabase/functions/delete-account/` — deletes the caller's login; the database cascades to their business, customers and review requests. Used by Settings → Delete account (two taps).
- `src/app/r.tsx` — the public customer page at `/r?b=<business id>` (query string so it works on a static host) (no log in): "Leave a Google review" or "Tell us privately". Reads data only through the `get_review_page` and `submit_feedback` database functions; private feedback lands in the `feedback` table and shows on the Dashboard. Review texts link here once `EXPO_PUBLIC_REVIEW_PAGE_URL` is set in .env; until then they link straight to Google.
- `supabase/functions/send-follow-ups/` — emails customers (with an email) one reminder 48 hours after they were asked, through Resend. Needs Supabase secret `RESEND_API_KEY`; optional `RESEND_FROM` and `REVIEW_PAGE_URL`. Runs at :17 every hour from pg_cron (`supabase/migrations/20261021150000_schedule_follow_ups.sql`), called with the publishable key (safe: it only sends what is due, once).
- `src/components/google-listing-search.tsx` — the search box and results on Business setup.
- `supabase/migrations/` — database tables and row-level security, run by hand in the Supabase SQL Editor.
- `scripts/test-login-code.mjs` — testing only: makes a login code for a second test account (needs the secret key in `.env.admin`).
- `src/lib/ask-for-review.ts` — opens Messages (expo-sms) with the filled-in review text, then logs a row in `review_requests`. The link is the Google review link for now; later it becomes our customer web page.
- `src/lib/phone.ts` — turns typed phone numbers into +1XXXXXXXXXX and shows them as (416) 555-1234.
- `src/constants/theme.ts` — colors and spacing (brand green is `tint`).

## Progress
- Session 1: Expo SDK 57 app shell with three placeholder tabs (Customers, Dashboard, Settings).
- Session 2: Supabase connected. Email log in (tap the link, or type the 8-digit code from the email) and log out. The Supabase Magic Link and Confirm signup email templates include `{{ .Token }}`. Links into Expo Go were unreliable in testing, so the code is the dependable path there. In Supabase Auth → URL Configuration, the redirect URLs `exp://**` (Expo Go) and `reviewnudge://**` (real app) are allowed. Supabase sends auth emails through Resend (custom SMTP, sender `onboarding@resend.dev`), so for now emails only go to the Resend account email. Jeff's uwo.ca inbox holds these emails back; the code can be read in Resend → Emails → Preview. Verify a real domain in Resend before launch.
- Session 3: `businesses` (one per owner) and `customers` tables with row-level security, applied in Supabase. Business setup screen. Owners find their Google listing by searching by name (Places API through the find-business function; Jeff chose this over pasting). Picking a listing fills in the review link (https://search.google.com/local/writereview?placeid=...) and saves the review count at that moment in google_review_count_at_start for the Dashboard. Pasting a link still works as a fallback.
- Session 4: Customer list with search (name, phone or email) and add / edit / delete a customer by hand. Add customer also has "Pick from phone contacts" (expo-contacts, phone only; hidden on web).
- Session 5: "Ask for review" button on each customer. `review_requests` table (RLS: owners see and insert their own; no update/delete, the follow-up email function will use the server key). iPhone reports cancel, Android does not, so on Android every tap is logged. Customers show "✓ Asked <date>".
- Session 6: Dashboard with review requests sent (total and this month) and Google reviews gained since joining (latest count minus google_review_count_at_start). Pull down to refresh.
- Session 7: Settings → Delete account (confirm step), tested on a throwaway account.
- Session 8: customer page and private feedback. Published with EAS Hosting at https://reviewnudge.expo.app (Expo project @jbauer1103/reviewnudge); the page is /r?b=<business id> because static hosting does not serve dynamic routes. EXPO_PUBLIC_REVIEW_PAGE_URL in .env and the REVIEW_PAGE_URL function secret point texts and emails at it. Redeploy the web version with: npx expo export -p web && npx eas-cli@latest deploy --prod
- Session 9: 48-hour follow-up email deployed, scheduled hourly, RESEND_API_KEY saved, test email to Jeff worked. Jeff has no domain yet (2026-10-21): until one is verified in Resend, follow-ups only reach jbauer7@uwo.ca.

## After the MVP backend works (Jeff, 2026-10-21)
- Polished front-end redesign of the app using Claude Design.
- A marketing landing page website (Lovable).
These start as their own project threads once the backend is complete; tell the project coordinator when that point is reached.

## Expo technical notes
@AGENTS.md

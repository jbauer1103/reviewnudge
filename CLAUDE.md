# ReviewNudge

## Who I'm working with
Jeff is a first-time app builder (has only made a few Lovable websites). Explain things in plain English and keep explanations short.

## What ReviewNudge is
A simple app for small service businesses in Canada and the US (cleaners, plumbers, HVAC, auto detailers, dog groomers). After a job, the owner picks the customer and taps one button. The app opens their phone's own Messages app with a friendly, pre-written text containing their Google review link, and the owner hits send. The app logs the request, sends one follow-up email 48 hours later if the customer has an email, and shows a dashboard of requests sent and Google reviews gained. Price: $39/month, paid on our website (not inside the app).

## Tech stack (use exactly this)
- Expo (React Native) with Expo Router and TypeScript. Expo SDK 58 (matches the current Expo Go app).
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
- `src/app/` — screens (every file is a screen). `_layout.tsx` sets up the tab bar.
  - `index.tsx` = Customers tab, `dashboard.tsx` = Dashboard tab, `settings.tsx` = Settings tab
- `src/components/` — reusable pieces. `app-tabs.tsx` is the phone tab bar, `app-tabs.web.tsx` the browser one.
- `src/constants/theme.ts` — colors and spacing (brand green is `tint`).

## Progress
- Session 1: Expo SDK 58 app shell with three placeholder tabs (Customers, Dashboard, Settings).

## Expo technical notes
@AGENTS.md

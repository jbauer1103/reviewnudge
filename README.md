# ReviewWhistle

A simple app that helps small service businesses ask customers for Google reviews.

## Run it on your phone

1. Install [Node.js LTS](https://nodejs.org) and [git](https://git-scm.com/downloads) on your computer.
2. Install the **Expo Go** app on your phone (App Store or Google Play) and log in with a free [Expo account](https://expo.dev/signup).
3. In a terminal:

   ```bash
   git clone https://github.com/jbauer1103/reviewnudge.git
   cd reviewnudge
   npm install
   npx expo login
   npx expo start
   ```

4. Scan the QR code: on iPhone use the Camera app, on Android use the Expo Go app. Your phone and computer must be on the same Wi-Fi.

## Connect Supabase (one time)

1. In your Supabase project, go to **Authentication → URL Configuration**. Under **Redirect URLs**, add `exp://**` and `reviewnudge://**`.
2. Copy `.env.example` to a new file called `.env` in the project folder and paste in your **Project URL** and **Publishable key**. `.env` never goes to GitHub.
3. Supabase only lets you edit its emails once you use your own email sender. In **Authentication → Emails → SMTP Settings**, turn on custom SMTP with Resend: host `smtp.resend.com`, port `465`, username `resend`, password = your Resend API key, sender `onboarding@resend.dev` (until we verify our own domain, Resend only sends to the email on your Resend account).
4. In **Authentication → Emails → Templates**, edit **Magic Link** and **Confirm signup** so the email includes the login code `{{ .Token }}` (8 digits) (the app has a box to type it in).
5. In **SQL Editor**, run each file in `supabase/migrations/` once, oldest first. This creates the tables and their security rules.
6. Restart the app with `npx expo start --clear` so it picks up the keys.

## Google listing search (one time)

The Business setup screen searches Google through our Supabase server function `find-business` (code in `supabase/functions/find-business/`).

1. In [Google Cloud Console](https://console.cloud.google.com), create a project, turn on billing, and enable **Places API (New)**.
2. Under **APIs & Services → Credentials**, create an API key and restrict it to **Places API (New)**.
3. In Supabase, go to **Edge Functions → Secrets** and add `GOOGLE_PLACES_API_KEY` with that key. The key never goes into the app.

## Publish the customer web page

The page customers open from the review text lives at https://reviewnudge.expo.app/r?b=<business id>. After changing it, publish again:

```bash
npx expo export -p web
npx eas-cli@latest deploy --prod
```

## Log in as a second test account

Our email sender only delivers to the Resend account email for now, so a second test account gets its code from a small script instead:

1. Create a file called `.env.admin` in the project folder with one line: `SUPABASE_SECRET_KEY=` followed by your Supabase **secret** key (Project Settings → API Keys → Secret keys). It never goes to GitHub or into the app.
2. Run `node --env-file=.env --env-file=.env.admin scripts/test-login-code.mjs test2@example.com`
3. In the app, type that email, tap **I already have a code**, and type the code the script printed.

See `CLAUDE.md` for the project plan and working rules.

# ReviewNudge

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
3. In **Authentication → Emails → Templates**, edit **Magic Link** and **Confirm signup** so the email includes the 6-digit code `{{ .Token }}` (the app has a box to type it in).
4. Restart the app with `npx expo start --clear` so it picks up the keys.

See `CLAUDE.md` for the project plan and working rules.

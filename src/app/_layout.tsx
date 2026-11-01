import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { BusinessProvider, useBusiness } from '@/components/business-provider';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { SessionProvider, useSession } from '@/components/session-provider';
import { Colors, FontFiles } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';

// Keep the splash screen up until we know whether the owner is logged in.
SplashScreen.preventAutoHideAsync();

// Navigation colors that match ours, so screens never flash white between pages.
const NavTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: Colors.light.background, primary: Colors.light.tint },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={NavTheme}>
      <SessionProvider>
        <BusinessProvider>
          <RootNavigator />
        </BusinessProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

// Logged out: show only the log in screens. Logged in without a business yet: show
// Business setup. Logged in with a business: show the tabs.
function RootNavigator() {
  const { session, isLoading } = useSession();
  const { business, isLoading: businessLoading } = useBusiness();
  // The website's font. If it fails to load, the phone's own font is used instead.
  const [fontsLoaded, fontError] = useFonts(FontFiles);
  const loading = isLoading || (!!session && businessLoading) || (!fontsLoaded && !fontError);

  useEffect(() => {
    if (!loading) SplashScreen.hide();
  }, [loading]);

  if (!isSupabaseConfigured) {
    return (
      <PlaceholderScreen
        title="Almost there"
        description="The app can't find your Supabase keys yet."
        comingSoon={[
          'Create a file called .env in the reviewnudge folder (copy .env.example)',
          'Paste your Supabase Project URL and Publishable key into it',
          'Stop the app with Ctrl+C and run: npx expo start --clear',
        ]}
        badge="Setup needed"
      />
    );
  }

  // Wait for the saved login (and the business) so the app doesn't flash the wrong
  // screen (or lose the screen a link pointed to). The splash screen stays up meanwhile.
  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session && !!business}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="customer/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="business-setup" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="auth-callback" />
      </Stack.Protected>
      {/* Where Stripe sends owners back after paying. No log in needed. */}
      <Stack.Screen name="billing" />
      {/* Where follow-up emails' unsubscribe link goes. No log in needed. */}
      <Stack.Screen name="unsubscribe" />
      {/* The public page customers open from the review text. No log in needed.
          It must stay last: the first screen listed is where the app opens. */}
      <Stack.Screen name="r" />
    </Stack>
  );
}

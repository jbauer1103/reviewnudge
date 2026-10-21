import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { BusinessProvider, useBusiness } from '@/components/business-provider';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { SessionProvider, useSession } from '@/components/session-provider';
import { isSupabaseConfigured } from '@/lib/supabase';

// Keep the splash screen up until we know whether the owner is logged in.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
  const loading = isLoading || (!!session && businessLoading);

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
      {/* The public page customers open from the review text. No log in needed. */}
      <Stack.Screen name="r" />
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
    </Stack>
  );
}

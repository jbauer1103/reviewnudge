import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

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
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}

// Logged in: show the tabs. Logged out: show only the log in screens.
function RootNavigator() {
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hide();
  }, [isLoading]);

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

  // Wait for the saved login so the app doesn't flash the log in screen (or lose the
  // screen a link pointed to). The splash screen stays up meanwhile.
  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="auth-callback" />
      </Stack.Protected>
    </Stack>
  );
}

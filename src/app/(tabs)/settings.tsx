import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { useBusiness } from '@/components/business-provider';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useSession } from '@/components/session-provider';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { session } = useSession();
  const { business } = useBusiness();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logOut() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    // The app returns to the log in screen by itself once the session is gone.
  }

  return (
    <PlaceholderScreen
      title="Settings"
      description="Your business details and account."
      comingSoon={['Delete account']}>
      <ThemedText type="smallBold">{business?.name}</ThemedText>
      <Button title="Edit business details" onPress={() => router.push('/business-setup')} />
      <ThemedText type="small" themeColor="textSecondary">
        Logged in as {session?.user.email}
      </ThemedText>
      <Button title="Log out" variant="secondary" onPress={logOut} loading={loggingOut} />
    </PlaceholderScreen>
  );
}

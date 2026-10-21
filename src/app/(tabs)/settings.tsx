import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function logOut() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    // The app returns to the log in screen by itself once the session is gone.
  }

  async function deleteAccount() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    // Runs on our server, which removes the account along with the business,
    // customers and review history.
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      setDeleting(false);
      setDeleteError('Couldn’t delete your account. Check your internet connection and try again.');
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <PlaceholderScreen
      title="Settings"
      description="Your business details and account."
      comingSoon={[]}>
      <ThemedText type="smallBold">{business?.name}</ThemedText>
      <Button title="Edit business details" onPress={() => router.push('/business-setup')} />
      <ThemedText type="small" themeColor="textSecondary">
        Logged in as {session?.user.email}
      </ThemedText>
      <Button title="Log out" variant="secondary" onPress={logOut} loading={loggingOut} />

      {confirmingDelete && (
        <ThemedText type="small" style={styles.warning}>
          This permanently deletes your account, your business, all your customers and your review
          history. It can’t be undone.
        </ThemedText>
      )}
      {deleteError && (
        <ThemedText type="small" style={styles.warning}>
          {deleteError}
        </ThemedText>
      )}
      <Button
        title={confirmingDelete ? 'Yes, delete everything' : 'Delete account'}
        variant="secondary"
        onPress={deleteAccount}
        loading={deleting}
      />
      {confirmingDelete && !deleting && (
        <Button title="Keep my account" variant="secondary" onPress={() => setConfirmingDelete(false)} />
      )}
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  warning: {
    color: '#D93025',
  },
});

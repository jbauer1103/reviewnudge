import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useBusiness } from '@/components/business-provider';
import { Icon } from '@/components/icon';
import { useSession } from '@/components/session-provider';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, Divider, ErrorText, Screen, ScreenHeader, SectionLabel } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const theme = useTheme();
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
    <Screen hasTabs>
      <ScreenHeader title="Settings" />

      <SectionLabel>Business</SectionLabel>
      <Card style={styles.group}>
        <View style={styles.business}>
          <Avatar name={business?.name ?? ''} size={48} solid />
          <View style={styles.businessText}>
            <ThemedText type="default" style={styles.businessName} numberOfLines={2}>
              {business?.name}
            </ThemedText>
            {business?.google_place_id ? (
              <View style={styles.linked}>
                <Icon name="check" size={12} color={theme.tintText} />
                <ThemedText type="small" style={[styles.linkedText, { color: theme.tintText }]}>
                  Linked to Google
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Not linked to a Google listing yet
              </ThemedText>
            )}
          </View>
        </View>
        <Divider />
        <Row title="Edit business details" chevron onPress={() => router.push('/business-setup')} />
      </Card>

      <SectionLabel>Account</SectionLabel>
      <Card style={styles.group}>
        <View style={styles.row}>
          <ThemedText>Logged in as</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.email}>
            {session?.user.email}
          </ThemedText>
        </View>
        <Divider />
        <Row title="Log out" color={theme.tint} onPress={logOut} loading={loggingOut} />
      </Card>

      <Card style={[styles.group, styles.dangerGroup]}>
        <Row
          title={confirmingDelete ? 'Yes, delete everything' : 'Delete account'}
          color={theme.danger}
          onPress={deleteAccount}
          loading={deleting}
        />
        {confirmingDelete && !deleting && (
          <>
            <Divider />
            <Row title="Keep my account" onPress={() => setConfirmingDelete(false)} />
          </>
        )}
      </Card>
      {confirmingDelete ? (
        <ErrorText>
          This permanently deletes your account, your business, all your customers and your review
          history. It can’t be undone.
        </ErrorText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          Deleting removes your business, customers and review history for good. We’ll ask you to
          confirm first.
        </ThemedText>
      )}
      <ErrorText>{deleteError}</ErrorText>
    </Screen>
  );
}

// One tappable line inside a settings card.
function Row({
  title,
  color,
  chevron,
  loading,
  onPress,
}: {
  title: string;
  color?: string;
  chevron?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={[color ? styles.rowAction : null, color ? { color } : null]}>{title}</ThemedText>
      {loading ? (
        <ActivityIndicator color={color ?? theme.textSecondary} />
      ) : (
        chevron && <Icon name="chevron" size={16} color={theme.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    padding: 0,
    overflow: 'hidden',
  },
  business: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    padding: Spacing.three,
  },
  businessText: {
    flex: 1,
    gap: Spacing.one,
  },
  businessName: {
    fontSize: 17,
    fontWeight: 700,
  },
  linked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  linkedText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowAction: {
    fontWeight: 600,
  },
  email: {
    flexShrink: 1,
  },
  dangerGroup: {
    marginTop: Spacing.three,
  },
  note: {
    paddingHorizontal: Spacing.one,
  },
});

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useSession } from '@/components/session-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAuthRedirectUrl } from '@/lib/auth-link';
import { supabase } from '@/lib/supabase';

// Log in / sign up by email: we email the owner a link to tap and a 6-digit code to type in.
// The code is the backup for when the link can't open the app (for example, email read on a computer).
// New emails get an account automatically, so there's no separate sign-up screen.
export default function SignInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { linkError, clearLinkError } = useSession();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    const trimmed = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSending(true);
    setError(null);
    clearLinkError();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    setSending(false);

    if (sendError) {
      setError(sendError.message);
    } else {
      setSentTo(trimmed);
      setCode('');
    }
  }

  async function verifyCode() {
    if (!sentTo) return;
    const digits = code.replace(/\D/g, '');
    if (digits.length < 6) {
      setError('Please enter the 6-digit code from the email.');
      return;
    }

    setVerifying(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: sentTo,
      token: digits,
      type: 'email',
    });
    setVerifying(false);

    // On success the app moves on to the tabs by itself.
    if (verifyError) {
      setError('That code didn’t work. Check it, or send yourself a new one.');
    }
  }

  const message = error ?? linkError;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <ThemedView
        style={[styles.inner, { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom }]}>
        <ThemedText type="subtitle">ReviewNudge</ThemedText>

        {sentTo ? (
          <>
            <ThemedText>
              We sent a login email to <ThemedText type="smallBold">{sentTo}</ThemedText>.
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Tap the link in the email on this phone, or type the code from the email here.
            </ThemedText>
            <TextInput
              value={code}
              onChangeText={setCode}
              onSubmitEditing={verifyCode}
              placeholder="6-digit code"
              placeholderTextColor={theme.textSecondary}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={10}
              style={[
                styles.input,
                styles.codeInput,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
            />
            <Button title="Log in with code" onPress={verifyCode} loading={verifying} />
            <Button
              title="Use a different email"
              variant="secondary"
              onPress={() => {
                setSentTo(null);
                setError(null);
              }}
            />
          </>
        ) : (
          <>
            <ThemedText themeColor="textSecondary">
              Enter your email and we&apos;ll send you a link to log in. No password needed.
            </ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={sendLink}
              placeholder="you@yourbusiness.com"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
            />
            <Button title="Email me a login link" onPress={sendLink} loading={sending} />
          </>
        )}

        {message && (
          <ThemedText type="small" style={styles.error}>
            {message}
          </ThemedText>
        )}
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  codeInput: {
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
  },
  error: {
    color: '#D93025',
  },
});

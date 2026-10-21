import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useSession } from '@/components/session-provider';
import { ThemedText } from '@/components/themed-text';
import { ErrorText, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAuthRedirectUrl } from '@/lib/auth-link';
import { supabase } from '@/lib/supabase';

// Log in / sign up by email: we email the owner a link to tap and a code to type in.
// The code is the backup for when the link can't open the app (for example, email read on a computer).
// New emails get an account automatically, so there's no separate sign-up screen.
export default function SignInScreen() {
  const theme = useTheme();
  const { linkError, clearLinkError } = useSession();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The email typed in, or null (with a message) if it doesn't look like an email.
  function checkedEmail() {
    const trimmed = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return null;
    }
    return trimmed;
  }

  async function sendLink() {
    const trimmed = checkedEmail();
    if (!trimmed) return;

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
      setError('Please enter the code from the email.');
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
      <Screen contentInsetAdjustmentBehavior="never">
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: theme.hero }]}>
            <ThemedText style={styles.logoStar}>★</ThemedText>
          </View>
          <ThemedText type="default" style={styles.brandName}>
            ReviewNudge
          </ThemedText>
        </View>

        {sentTo ? (
          <>
            <View style={styles.intro}>
              <ThemedText type="largeTitle">Check your email</ThemedText>
              <ThemedText themeColor="textSecondary">
                We sent a login email to <ThemedText style={styles.bold}>{sentTo}</ThemedText>. Tap the
                link in the email on this phone, or type the code from the email here.
              </ThemedText>
            </View>
            <TextField
              label="Code from the email"
              value={code}
              onChangeText={setCode}
              onSubmitEditing={verifyCode}
              placeholder="12345678"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={10}
              style={styles.codeInput}
            />
            <ErrorText>{message}</ErrorText>
            <View style={styles.buttons}>
              <Button title="Log in with code" onPress={verifyCode} loading={verifying} />
              <Button
                title="Use a different email"
                variant="ghost"
                onPress={() => {
                  setSentTo(null);
                  setError(null);
                }}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.intro}>
              <ThemedText type="largeTitle">More Google reviews, one tap at a time.</ThemedText>
              <ThemedText themeColor="textSecondary">
                Enter your email and we&apos;ll send you a link to log in. No password needed.
              </ThemedText>
            </View>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={sendLink}
              placeholder="you@yourbusiness.com"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
            />
            <ErrorText>{message}</ErrorText>
            <View style={styles.buttons}>
              <Button title="Email me a login link" onPress={sendLink} loading={sending} />
              <Button
                title="I already have a code"
                variant="ghost"
                onPress={() => {
                  const trimmed = checkedEmail();
                  if (!trimmed) return;
                  setError(null);
                  clearLinkError();
                  setSentTo(trimmed);
                  setCode('');
                }}
              />
            </View>
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
    marginTop: Spacing.five,
    marginBottom: Spacing.three,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStar: {
    color: '#FFD166',
    fontSize: 24,
    lineHeight: 28,
  },
  brandName: {
    fontSize: 20,
    fontWeight: 800,
  },
  intro: {
    gap: Spacing.two + Spacing.half,
    marginBottom: Spacing.two,
  },
  bold: {
    fontWeight: 700,
  },
  codeInput: {
    fontSize: 22,
    letterSpacing: 4,
    textAlign: 'center',
  },
  buttons: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
});

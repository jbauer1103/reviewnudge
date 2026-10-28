import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useSession } from '@/components/session-provider';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/icon';
import { Card, ErrorText, Logo, Screen, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAuthRedirectUrl } from '@/lib/auth-link';
import { supabase } from '@/lib/supabase';

// Log in / sign up by email: we email the owner a link to tap and a code to type in.
// The code is the backup for when the link can't open the app (for example, email read on a computer).
// New emails get an account automatically, so there's no separate sign-up screen.

// Apple's and Google's app reviewers can't read our login emails, so this one demo
// account logs in with a password instead. Its password is in Jeff's .env.appreview.
const REVIEWER_EMAIL = 'appreview@reviewwhistle.com';

export default function SignInScreen() {
  const theme = useTheme();
  const { linkError, clearLinkError } = useSession();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const isReviewer = email.trim().toLowerCase() === REVIEWER_EMAIL;

  async function logInReviewer() {
    setSending(true);
    setError(null);
    clearLinkError();
    const { error: logInError } = await supabase.auth.signInWithPassword({ email: REVIEWER_EMAIL, password });
    setSending(false);
    // On success the app moves on to the tabs by itself.
    if (logInError) setError('That password didn’t work.');
  }

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
      <Screen contentInsetAdjustmentBehavior="never" maxWidth={540}>
        <View style={styles.brand}>
          <Logo />
        </View>

        {sentTo ? (
          <>
            <View style={styles.intro}>
              <ThemedText type="largeTitle">
                Check your{' '}
                <ThemedText type="largeTitle" style={[styles.accent, { color: theme.tint }]}>
                  email.
                </ThemedText>
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.lead}>
                We sent a login email to <ThemedText style={styles.bold}>{sentTo}</ThemedText>. Tap
                the link in the email on this phone, or type the code from the email here.
              </ThemedText>
            </View>
            <Card style={styles.form}>
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
            </Card>
          </>
        ) : (
          <>
            <View style={styles.intro}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText style={[styles.badgeStars, { color: theme.star }]}>★★★★★</ThemedText>
                <ThemedText type="smallBold">Built for local service pros</ThemedText>
              </View>
              <ThemedText type="title" style={styles.headline}>
                Stop chasing reviews.{'\n'}
                <ThemedText
                  type="title"
                  style={[styles.headline, styles.accent, { color: theme.tint }]}>
                  Start collecting them.
                </ThemedText>
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.lead}>
                Enter your email and we&apos;ll send you a link to log in. No password needed.
              </ThemedText>
            </View>
            <Card style={styles.form}>
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
              {isReviewer && (
                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={logInReviewer}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  returnKeyType="go"
                />
              )}
              <ErrorText>{message}</ErrorText>
              <View style={styles.buttons}>
                {isReviewer ? (
                  <Button title="Log in" onPress={logInReviewer} loading={sending} />
                ) : (
                  <Button title="Email me a login link" onPress={sendLink} loading={sending} />
                )}
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
            </Card>
            <View style={styles.perks}>
              {['14 days free, no card', 'iPhone and Android', 'Made in Canada'].map((perk) => (
                <View key={perk} style={styles.perk}>
                  <Icon name="check" size={16} color={theme.tint} />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {perk}
                  </ThemedText>
                </View>
              ))}
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
    marginTop: Spacing.five,
    marginBottom: Spacing.three,
  },
  intro: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three - Spacing.one,
  },
  badgeStars: {
    fontSize: 14,
    letterSpacing: 1,
  },
  headline: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.4,
  },
  /** The green italic words, like the website's headings. */
  accent: {
    fontStyle: 'italic',
  },
  lead: {
    fontSize: 17,
    lineHeight: 26,
  },
  form: {
    gap: Spacing.three,
    padding: Spacing.four - Spacing.one,
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
  },
  perks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + Spacing.one,
    columnGap: Spacing.four - Spacing.one,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two - Spacing.half,
  },
});

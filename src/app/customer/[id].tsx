import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Switch, View } from 'react-native';

import { BackLink } from '@/components/back-link';
import { Button } from '@/components/button';
import { useBusiness } from '@/components/business-provider';
import { ThemedText } from '@/components/themed-text';
import { ErrorText, Screen, ScreenHeader, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CUSTOMER_COLUMNS, SMS_COLUMNS, type Customer, type CustomerSms } from '@/lib/customers';
import { formatPhone, normalizePhone } from '@/lib/phone';
import { pickContact } from '@/lib/pick-contact';
import { supabase } from '@/lib/supabase';

// Add a customer (/customer/new) or edit one (/customer/<id>).
export default function CustomerScreen() {
  const theme = useTheme();
  const { business } = useBusiness();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // When they agreed to get texts (null = not yet), and if they replied STOP.
  const [consentAt, setConsentAt] = useState<string | null>(null);
  const [optedOut, setOptedOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from('customers')
      .select(`${CUSTOMER_COLUMNS}, ${SMS_COLUMNS}`)
      .eq('id', id)
      .maybeSingle<Customer & CustomerSms>()
      .then(({ data }) => {
        if (data) {
          setName(data.name);
          setPhone(formatPhone(data.phone));
          setEmail(data.email ?? '');
          setConsentAt(data.sms_consent_at);
          setOptedOut(data.sms_opted_out_at !== null);
        } else {
          setError('Couldn’t find this customer.');
        }
        setLoading(false);
      });
  }, [id, isNew]);

  async function save() {
    if (!business) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    if (!trimmedName) {
      setError('Please enter the customer’s name.');
      return;
    }
    if (!normalizedPhone) {
      setError('Please enter a 10-digit phone number, like (416) 555-1234.');
      return;
    }
    if (trimmedEmail && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('That email doesn’t look right. Fix it or leave it empty.');
      return;
    }

    setSaving(true);
    setError(null);
    const values = {
      name: trimmedName,
      phone: normalizedPhone,
      email: trimmedEmail || null,
      sms_consent_at: consentAt,
    };
    // Row-level security only allows customers of the owner's own business.
    const { error: saveError } = isNew
      ? await supabase.from('customers').insert({ ...values, business_id: business.id })
      : await supabase.from('customers').update(values).eq('id', id);
    setSaving(false);

    if (saveError) {
      setError('Couldn’t save. Check your internet connection and try again.');
      return;
    }
    router.back();
  }

  async function fillFromContacts() {
    setError(null);
    try {
      const picked = await pickContact();
      if (!picked) return;
      setName(picked.name);
      const normalized = normalizePhone(picked.phone);
      setPhone(normalized ? formatPhone(normalized) : picked.phone);
      setEmail(picked.email);
      if (!normalized) {
        setError('This contact has no Canadian or US mobile number. Please type one in.');
      }
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Couldn’t open your contacts.');
    }
  }

  async function remove() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    const { error: deleteError } = await supabase.from('customers').delete().eq('id', id);
    setSaving(false);
    if (deleteError) {
      setError('Couldn’t delete. Check your internet connection and try again.');
      return;
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <Screen>
        <BackLink title="Customers" />
        <ScreenHeader title={isNew ? 'Add customer' : 'Edit customer'} />

        {!loading && (
          <>
            {/* The contact picker only exists on phones, not in the web version. */}
            {isNew && Platform.OS !== 'web' && (
              <Button
                title="Pick from phone contacts"
                variant="secondary"
                icon="contacts"
                onPress={fillFromContacts}
              />
            )}

            <TextField
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Sam Taylor"
              autoCapitalize="words"
              textContentType="name"
            />
            <TextField
              label="Mobile phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="(416) 555-1234"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
            <TextField
              label="Email"
              labelNote="(optional)"
              hint="We’ll send one friendly reminder email 48 hours after you ask for a review."
              value={email}
              onChangeText={setEmail}
              placeholder="sam@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            <View style={styles.consent}>
              <View style={styles.consentText}>
                <ThemedText type="smallBold">Agreed to get texts</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {optedOut
                    ? 'They replied STOP, so ReviewWhistle can’t text them.'
                    : 'Only switch this on if they said it’s OK to text them (for example, when you booked the job). The law needs it.'}
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel="Agreed to get texts"
                value={consentAt !== null}
                onValueChange={(on) => setConsentAt(on ? new Date().toISOString() : null)}
                trackColor={{ true: theme.tint }}
              />
            </View>

            <ErrorText>{error}</ErrorText>

            <View style={styles.buttons}>
              <Button title={isNew ? 'Add customer' : 'Save changes'} onPress={save} loading={saving} />
              <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
            </View>
            {!isNew && (
              <Button
                title={confirmingDelete ? 'Tap again to delete this customer' : 'Delete customer'}
                variant="danger"
                onPress={remove}
                disabled={saving}
                style={styles.delete}
              />
            )}
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
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  consentText: {
    flex: 1,
    gap: Spacing.half,
  },
  buttons: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  delete: {
    marginTop: Spacing.four,
  },
});

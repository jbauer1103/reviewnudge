import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useBusiness } from '@/components/business-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CUSTOMER_COLUMNS, type Customer } from '@/lib/customers';
import { formatPhone, normalizePhone } from '@/lib/phone';
import { pickContact } from '@/lib/pick-contact';
import { supabase } from '@/lib/supabase';

// Add a customer (/customer/new) or edit one (/customer/<id>).
export default function CustomerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { business } = useBusiness();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from('customers')
      .select(CUSTOMER_COLUMNS)
      .eq('id', id)
      .maybeSingle<Customer>()
      .then(({ data }) => {
        if (data) {
          setName(data.name);
          setPhone(formatPhone(data.phone));
          setEmail(data.email ?? '');
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
    const values = { name: trimmedName, phone: normalizedPhone, email: trimmedEmail || null };
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

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
        ]}>
        <ThemedView style={styles.inner}>
          <ThemedText type="subtitle">{isNew ? 'Add customer' : 'Edit customer'}</ThemedText>

          {!loading && (
            <>
              {/* The contact picker only exists on phones, not in the web version. */}
              {isNew && Platform.OS !== 'web' && (
                <Button title="Pick from phone contacts" variant="secondary" onPress={fillFromContacts} />
              )}

              <ThemedText type="smallBold">Name</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Sam Taylor"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                textContentType="name"
                style={inputStyle}
              />

              <ThemedText type="smallBold">Mobile phone</ThemedText>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="(416) 555-1234"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                style={inputStyle}
              />

              <ThemedText type="smallBold">Email (optional)</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                We’ll send one friendly reminder email 48 hours after you ask for a review.
              </ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="sam@example.com"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                style={inputStyle}
              />

              {error && (
                <ThemedText type="small" style={styles.error}>
                  {error}
                </ThemedText>
              )}

              <Button title={isNew ? 'Add customer' : 'Save changes'} onPress={save} loading={saving} />
              <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
              {!isNew && (
                <Button
                  title={confirmingDelete ? 'Tap again to delete this customer' : 'Delete customer'}
                  variant="secondary"
                  onPress={remove}
                  disabled={saving}
                />
              )}
            </>
          )}
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  error: {
    color: '#D93025',
  },
});

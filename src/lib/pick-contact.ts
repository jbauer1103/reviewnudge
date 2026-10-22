import { Contact, requestPermissionsAsync } from 'expo-contacts';

export type PickedContact = { name: string; phone: string; email: string };

/**
 * Opens the phone's contact picker. Returns the picked person's name, best phone
 * number and email, null if the owner cancelled, or throws with a friendly message.
 */
export async function pickContact(): Promise<PickedContact | null> {
  const permission = await requestPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error(
      'ReviewWhistle needs permission to see your contacts. You can allow it in your phone’s Settings, or type the customer in.',
    );
  }

  const contact = await Contact.presentPicker();
  if (!contact) return null;

  const [name, phones, emails] = await Promise.all([
    contact.getFullName(),
    contact.getPhones(),
    contact.getEmails(),
  ]);
  // Prefer a mobile number, since we text it.
  const phone =
    phones.find((p) => /mobile|cell|iphone/i.test(p.label ?? '')) ?? phones[0];

  return { name: name.trim(), phone: phone?.number ?? '', email: emails[0]?.address ?? '' };
}

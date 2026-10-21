// Phone numbers for Canada and the US are saved as +1 and 10 digits, like +14165551234.

/** Turns what the owner typed into +1XXXXXXXXXX, or null if it isn't a valid number. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  // Area codes and exchanges never start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1${digits}`;
}

/** Shows +14165551234 as (416) 555-1234. */
export function formatPhone(phone: string | null): string {
  const match = phone?.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : (phone ?? '');
}

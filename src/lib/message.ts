// The review text an owner sends. {customer}, {business} and {link} get swapped
// for the real values when the text is sent.
export const MESSAGE_PLACEHOLDERS = ['{customer}', '{business}', '{link}'] as const;

export function fillMessage(
  template: string,
  values: { customer: string; business: string; link: string },
) {
  return template
    .replaceAll('{customer}', values.customer)
    .replaceAll('{business}', values.business)
    .replaceAll('{link}', values.link);
}

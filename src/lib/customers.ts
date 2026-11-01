export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  /** Set when the customer used the unsubscribe link in a follow-up email. */
  email_unsubscribed_at: string | null;
};

export const CUSTOMER_COLUMNS = 'id, name, phone, email, email_unsubscribed_at';

/** Customers with a phone number who have never been asked for a review. */
export function notYetAsked(customers: Customer[], requests: { customer_id: string | null }[]) {
  const asked = new Set(requests.map((request) => request.customer_id));
  return customers.filter((customer) => customer.phone && !asked.has(customer.id));
}

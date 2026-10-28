export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  /** Set when the customer used the unsubscribe link in a follow-up email. */
  email_unsubscribed_at: string | null;
};

export const CUSTOMER_COLUMNS = 'id, name, phone, email, email_unsubscribed_at';

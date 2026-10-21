export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export const CUSTOMER_COLUMNS = 'id, name, phone, email';

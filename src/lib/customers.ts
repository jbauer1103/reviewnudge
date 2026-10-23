export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export const CUSTOMER_COLUMNS = 'id, name, phone, email';

/** Texting consent. Only the customer screen loads these. */
export type CustomerSms = {
  /** When the owner ticked "Agreed to get texts". Null means we can't text them from ReviewWhistle. */
  sms_consent_at: string | null;
  /** When they replied STOP. */
  sms_opted_out_at: string | null;
};

export const SMS_COLUMNS = 'sms_consent_at, sms_opted_out_at';

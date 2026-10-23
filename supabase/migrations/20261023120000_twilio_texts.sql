-- Texting customers through Twilio (so "Ask" also works from a computer).
-- Run this once in Supabase → SQL Editor.

-- When the owner ticked "This customer agreed to get texts from us". Our server only
-- texts customers who have this set (Canada's CASL and the US TCPA need consent).
alter table public.customers add column sms_consent_at timestamptz;
-- Set when the customer replied STOP. Twilio then blocks texts to them anyway.
alter table public.customers add column sms_opted_out_at timestamptz;

-- How each review request went out: 'phone' (the owner's Messages app) or 'twilio'.
alter table public.review_requests add column sent_via text not null default 'phone'
  check (sent_via in ('phone', 'twilio'));
-- Twilio's id for the text, to look it up in the Twilio console if something goes wrong.
alter table public.review_requests add column twilio_message_sid text;

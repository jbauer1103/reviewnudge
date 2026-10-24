-- Lets customers stop the follow-up email, as anti-spam laws (CASL, CAN-SPAM) require.
-- Each customer gets a secret token for their unsubscribe link, so nobody can guess
-- someone else's link. The follow-up email function skips anyone who unsubscribed.
alter table public.customers
  add column unsubscribe_token uuid not null default gen_random_uuid() unique,
  add column email_unsubscribed_at timestamptz;

-- The business's address from its Google listing, shown at the bottom of follow-up
-- emails (the law asks emails to say who sent them and where they're based).
alter table public.businesses add column google_address text;

-- Called from the public /unsubscribe page (no log in). Returns the business name for
-- the "You won't get more emails from ..." message, or nothing if the link is wrong.
create function public.unsubscribe_email(token uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  update public.customers c
  set email_unsubscribed_at = coalesce(c.email_unsubscribed_at, now())
  from public.businesses b
  where c.unsubscribe_token = token and b.id = c.business_id
  returning b.name;
$$;

revoke all on function public.unsubscribe_email(uuid) from public;
grant execute on function public.unsubscribe_email(uuid) to anon, authenticated;

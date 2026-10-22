-- Private settings our Stripe functions save for themselves (like the webhook's signing
-- secret, created automatically the first time someone subscribes). Nobody using the
-- app can read or change this table: row-level security with no policies, and no access
-- for app users at all. Only our server functions (secret key) use it.

create table public.stripe_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

alter table public.stripe_settings enable row level security;
revoke all on public.stripe_settings from anon, authenticated;

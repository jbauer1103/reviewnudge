-- Billing: one row per business that has started paying through Stripe.
-- Owners can only READ their own row. Only our server functions (with the secret
-- key) write to it, from Stripe's webhook, so nobody can mark themselves as paid.
-- The 14-day free trial needs no row: it counts from businesses.created_at.

create table public.subscriptions (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  -- Stripe's word for it: trialing, active, past_due, canceled, unpaid, incomplete...
  status text,
  -- When the current paid month ends (and renews, unless cancel_at_period_end).
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Owners can see their subscription" on public.subscriptions
  for select to authenticated using (public.owns_business(business_id));
-- No insert, update or delete policies on purpose: only the server can change billing.

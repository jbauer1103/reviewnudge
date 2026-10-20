-- Businesses and customers, each locked down with row-level security (RLS)
-- so an owner can only ever see and change their own business's data.
-- Run this once in Supabase → SQL Editor.

-- One business per owner (the logged-in user).
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- The link customers tap to leave a Google review. Typed in for now;
  -- a later step looks the business up on Google automatically.
  google_review_url text,
  google_place_id text,
  -- {customer}, {business} and {link} are filled in when the text is sent.
  message_template text not null default
    'Hi {customer}, thanks for choosing {business}! If you have a minute, would you leave us a quick Google review? It really helps us out: {link}',
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

create policy "Owners can see their business" on public.businesses
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners can create their business" on public.businesses
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners can update their business" on public.businesses
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners can delete their business" on public.businesses
  for delete to authenticated using (owner_id = (select auth.uid()));

-- A business's customers.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- +1 and 10 digits (Canada and US), for example +14165551234.
  phone text check (phone ~ '^\+1[0-9]{10}$'),
  email text,
  created_at timestamptz not null default now()
);

create index customers_business_id_idx on public.customers (business_id);

alter table public.customers enable row level security;

-- True when the logged-in owner owns this business.
create function public.owns_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.businesses
    where id = target_business_id and owner_id = (select auth.uid())
  );
$$;

create policy "Owners can see their customers" on public.customers
  for select to authenticated using (public.owns_business(business_id));
create policy "Owners can add customers" on public.customers
  for insert to authenticated with check (public.owns_business(business_id));
create policy "Owners can update their customers" on public.customers
  for update to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));
create policy "Owners can delete their customers" on public.customers
  for delete to authenticated using (public.owns_business(business_id));

-- One row each time an owner asks a customer for a review. Used for the Dashboard
-- ("requests sent") and the follow-up email 48 hours later.
create table public.review_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  sent_at timestamptz not null default now(),
  -- Set by the follow-up email server function once it has emailed the customer.
  follow_up_sent_at timestamptz
);

create index review_requests_business_id_idx on public.review_requests (business_id, sent_at desc);
create index review_requests_customer_id_idx on public.review_requests (customer_id);

alter table public.review_requests enable row level security;

-- Owners can see and log their own business's requests. There is no update or
-- delete policy: the follow-up email function updates rows with the server key.
create policy "Owners can see their review requests" on public.review_requests
  for select to authenticated using (public.owns_business(business_id));
create policy "Owners can log review requests" on public.review_requests
  for insert to authenticated with check (
    public.owns_business(business_id)
    and (customer_id is null or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.business_id = review_requests.business_id
    ))
  );

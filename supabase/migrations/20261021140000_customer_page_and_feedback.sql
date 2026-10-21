-- The public customer page (/r/<business id>): customers can leave a Google review
-- or tell the business privately what went wrong. Customers are not logged in, so
-- they only get two narrow functions, never direct access to any table.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  message text not null check (length(trim(message)) between 1 and 2000),
  -- How to reach the customer back, if they chose to leave it.
  contact text check (contact is null or length(contact) <= 200),
  created_at timestamptz not null default now()
);

create index feedback_business_id_idx on public.feedback (business_id, created_at desc);

alter table public.feedback enable row level security;

-- Owners can read and delete their own feedback. New feedback only comes in
-- through submit_feedback below.
create policy "Owners can see their feedback" on public.feedback
  for select to authenticated using (public.owns_business(business_id));
create policy "Owners can delete their feedback" on public.feedback
  for delete to authenticated using (public.owns_business(business_id));

-- What the customer page shows: just the business name and its Google review link.
create function public.get_review_page(page_business_id uuid)
returns table (name text, google_review_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.name, b.google_review_url from public.businesses b where b.id = page_business_id;
$$;

-- Saves private feedback from the customer page.
create function public.submit_feedback(page_business_id uuid, feedback_message text, feedback_contact text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.businesses where id = page_business_id) then
    raise exception 'Business not found';
  end if;
  -- A simple guard against someone flooding a business with messages.
  if (select count(*) from public.feedback
      where business_id = page_business_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many messages, please try again later';
  end if;
  insert into public.feedback (business_id, message, contact)
  values (page_business_id, trim(feedback_message), nullif(trim(feedback_contact), ''));
end;
$$;

revoke all on function public.get_review_page(uuid) from public;
revoke all on function public.submit_feedback(uuid, text, text) from public;
grant execute on function public.get_review_page(uuid) to anon, authenticated;
grant execute on function public.submit_feedback(uuid, text, text) to anon, authenticated;

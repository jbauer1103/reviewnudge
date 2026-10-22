-- Jeff's private owner dashboard: signups, trials, paying subscribers, cancellations
-- and review requests across ALL businesses. Only logins listed in `admins` can see it.

-- Who can see the owner dashboard. No policies on purpose: app users can't read or
-- change this table. Add someone in the SQL Editor:
--   insert into public.admins (email) values ('someone@example.com');
create table public.admins (
  email text primary key check (email = lower(email))
);

alter table public.admins enable row level security;

insert into public.admins (email) values ('jbauer7@uwo.ca');

-- True when the logged-in person is an admin (decides whether Settings shows the link).
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where email = lower((select auth.jwt()) ->> 'email')
  );
$$;

-- Every number on the owner dashboard, in one call. Refuses anyone who isn't an admin.
-- Keep the 14-day trial in sync with TRIAL_DAYS in src/lib/billing.ts.
create function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  with plans as (
    select
      b.id,
      b.name,
      b.created_at,
      u.email,
      s.current_period_end,
      case
        when s.status in ('active', 'trialing', 'past_due') and s.cancel_at_period_end then 'cancelling'
        when s.status = 'past_due' then 'payment_failed'
        when s.status = 'active' then 'paying'
        -- Subscribed early: card saved, first charge when their free days run out.
        when s.status = 'trialing' then 'subscribed_trial'
        when s.status = 'canceled' then 'cancelled'
        when b.created_at > now() - interval '14 days' then 'trial'
        else 'trial_ended'
      end as plan
    from public.businesses b
    left join auth.users u on u.id = b.owner_id
    left join public.subscriptions s on s.business_id = b.id
  ),
  requests as (
    select business_id, count(*) as total, max(sent_at) as last_sent_at
    from public.review_requests
    group by business_id
  )
  select jsonb_build_object(
    'businesses', (select count(*) from plans),
    'signups_7_days', (select count(*) from plans where created_at > now() - interval '7 days'),
    'signups_30_days', (select count(*) from plans where created_at > now() - interval '30 days'),
    'plans', coalesce((select jsonb_object_agg(plan, n) from (select plan, count(*) as n from plans group by plan) p), '{}'::jsonb),
    'requests_total', (select count(*) from public.review_requests),
    'requests_30_days', (select count(*) from public.review_requests where sent_at > now() - interval '30 days'),
    'follow_ups_sent', (select count(*) from public.review_requests where follow_up_sent_at is not null),
    'feedback_total', (select count(*) from public.feedback),
    'recent', coalesce((
      select jsonb_agg(row_to_json(r) order by r.created_at desc)
      from (
        select p.name, p.email, p.created_at, p.plan, p.current_period_end,
               coalesce(q.total, 0) as requests, q.last_sent_at
        from plans p
        left join requests q on q.business_id = p.id
        order by p.created_at desc
        limit 100
      ) r
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Only logged-in people can call these (and admin_stats still checks they're an admin).
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_stats() to authenticated;

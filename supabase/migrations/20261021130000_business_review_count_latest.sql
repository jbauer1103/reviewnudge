-- The latest Google review count and when it was checked, so the Dashboard doesn't
-- ask Google (which charges per lookup) every time it opens.
alter table public.businesses
  add column google_review_count_latest integer,
  add column google_review_count_checked_at timestamptz;

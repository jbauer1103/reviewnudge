-- The Google review count when the owner picked their listing, so the Dashboard
-- can show reviews gained since joining.
alter table public.businesses add column google_review_count_at_start integer;
